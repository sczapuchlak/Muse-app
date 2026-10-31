-- Local Phase 1 only: no Planner/Money/Whimsy tables and no personal sample records.
create schema if not exists muse_private;
revoke all on schema muse_private from public, anon, authenticated;

create function muse_private.valid_time_zone(value text) returns boolean
language sql stable set search_path = '' as $$
  select exists(select 1 from pg_catalog.pg_timezone_names where name = value)
$$;
create function muse_private.valid_day_emojis(value text[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(array_ndims(value),1) = 1 and cardinality(value) between 0 and 3
    and not exists(select 1 from unnest(value) item where item is null or char_length(btrim(item)) not between 1 and 64)
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 80),
  time_zone text not null default 'UTC' check (muse_private.valid_time_zone(time_zone)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0)
);
create table public.daily_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  local_date date not null,
  time_zone text not null check (muse_private.valid_time_zone(time_zone)),
  intention_text text check (intention_text is null or char_length(intention_text) <= 1000),
  intention_emoji text check (intention_emoji is null or char_length(btrim(intention_emoji)) between 1 and 64),
  day_in_three text[] not null default '{}' check (muse_private.valid_day_emojis(day_in_three)),
  energy smallint check (energy between 1 and 10),
  stress smallint check (stress between 1 and 10),
  overall_day smallint check (overall_day between 1 and 10),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique(user_id, local_date), unique(user_id, id)
);
create table public.daily_priorities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  daily_record_id uuid not null,
  text text not null check (char_length(btrim(text)) between 1 and 160),
  position smallint not null check (position between 0 and 2),
  standalone_complete boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  foreign key(user_id,daily_record_id) references public.daily_records(user_id,id) on delete cascade,
  unique(user_id,daily_record_id,position), unique(user_id,id),
  check (standalone_complete = (completed_at is not null))
);
-- Task references and end-of-day linked completion history belong to the later Planner slice.
create table public.mood_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  daily_record_id uuid not null,
  period text not null check (period in ('morning','evening')),
  reflection text check (reflection is null or char_length(reflection) <= 20000),
  captured_time_zone text not null check (muse_private.valid_time_zone(captured_time_zone)),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  foreign key(user_id,daily_record_id) references public.daily_records(user_id,id) on delete cascade,
  unique(user_id,daily_record_id,period), unique(user_id,id)
);
create table public.emotion_catalog (
  id text primary key,
  name text not null,
  emoji text not null,
  quadrant text not null check (quadrant in ('red','blue','green','yellow')),
  energy text generated always as (case when quadrant in ('red','yellow') then 'high' else 'low' end) stored,
  pleasantness text generated always as (case when quadrant in ('green','yellow') then 'pleasant' else 'unpleasant' end) stored,
  definition text
);
create table public.influence_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 60),
  archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique(user_id,id)
);
create unique index influence_tags_active_name on public.influence_tags(user_id,lower(btrim(label))) where archived_at is null;
create table public.checkin_emotions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  checkin_id uuid not null,
  emotion_id text not null references public.emotion_catalog(id) on delete restrict,
  primary key(user_id,checkin_id,emotion_id),
  foreign key(user_id,checkin_id) references public.mood_checkins(user_id,id) on delete cascade
);
create table public.checkin_influences (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  checkin_id uuid not null,
  influence_id uuid not null,
  position smallint not null check (position between 0 and 2),
  primary key(user_id,checkin_id,influence_id),
  unique(user_id,checkin_id,position),
  foreign key(user_id,checkin_id) references public.mood_checkins(user_id,id) on delete cascade,
  foreign key(user_id,influence_id) references public.influence_tags(user_id,id) on delete restrict
);
create index checkin_influences_tag on public.checkin_influences(user_id,influence_id);
create table public.emotion_favorites (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  emotion_id text not null references public.emotion_catalog(id) on delete restrict,
  primary key(user_id,emotion_id)
);

-- Server timestamps/revisions cannot be fabricated by client inserts or updates.
create function muse_private.stamp_record() returns trigger
language plpgsql set search_path = '' as $$
declare field text;
begin
  if TG_OP = 'UPDATE' then
    foreach field in array array['id','user_id','created_at'] loop
      if to_jsonb(new)->field is distinct from to_jsonb(old)->field then
        raise exception 'Record identity and creation time are immutable' using errcode='22023';
      end if;
    end loop;
    if TG_TABLE_NAME in ('daily_records','mood_checkins','daily_priorities') then
      foreach field in array array['local_date','time_zone','captured_time_zone','daily_record_id','period'] loop
        if to_jsonb(new)->field is distinct from to_jsonb(old)->field then
          raise exception 'Historical date, session and capture zone are immutable' using errcode='22023';
        end if;
      end loop;
    end if;
    new.revision := old.revision + 1;
    new.created_at := old.created_at;
  else
    new.created_at := clock_timestamp(); new.revision := 1;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end $$;
create function muse_private.stamp_priority_completion() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not new.standalone_complete then new.completed_at := null;
  elsif TG_OP = 'INSERT' then new.completed_at := clock_timestamp();
  elsif not old.standalone_complete then new.completed_at := clock_timestamp();
  else new.completed_at := old.completed_at;
  end if;
  return new;
end $$;
create trigger priority_completion before insert or update on public.daily_priorities for each row execute function muse_private.stamp_priority_completion();

do $$ declare tab text; begin
  foreach tab in array array['profiles','daily_records','daily_priorities','mood_checkins','influence_tags'] loop
    execute format('create trigger stamp_record before insert or update on public.%I for each row execute function muse_private.stamp_record()',tab);
  end loop;
end $$;

-- Auth creation is admin-controlled by local Auth configuration. No sample personal records.
create function muse_private.bootstrap_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,first_name,time_zone)
  values(new.id,left(coalesce(new.raw_user_meta_data->>'first_name',''),80),
    case when muse_private.valid_time_zone(new.raw_user_meta_data->>'time_zone') then new.raw_user_meta_data->>'time_zone' else 'UTC' end);
  return new;
end $$;
create trigger muse_profile_after_auth_user after insert on auth.users for each row execute function muse_private.bootstrap_profile();

-- Constraints/triggers are callable only as needed; no privileged helper is an API RPC.
revoke all on all functions in schema muse_private from public,anon,authenticated;
grant usage on schema muse_private to authenticated;
grant execute on function muse_private.valid_time_zone(text),muse_private.valid_day_emojis(text[]) to authenticated;

-- Canonical vocabulary only, not invented check-ins. Existing IDs preserved.
insert into public.emotion_catalog(id,name,emoji,quadrant,definition) values
('emotion-afraid','Afraid','😨','red',null),
('emotion-alarmed','Alarmed','😳','red',null),
('emotion-alienated','Alienated','🫥','blue',null),
('emotion-angry','Angry','😠','red',null),
('emotion-annoyed','Annoyed','😒','red',null),
('emotion-anxious','Anxious','😟','red','Feeling worried or on edge.'),
('emotion-apathetic','Apathetic','😐','blue',null),
('emotion-apprehensive','Apprehensive','😬','red',null),
('emotion-at-ease','At ease','😌','green',null),
('emotion-balanced','Balanced','⚖️','green',null),
('emotion-bored','Bored','🥱','blue',null),
('emotion-calm','Calm','😌','green','Feeling settled and at ease.'),
('emotion-carefree','Carefree','🍃','green',null),
('emotion-cheerful','Cheerful','😄','yellow',null),
('emotion-comfortable','Comfortable','😌','green',null),
('emotion-confident','Confident','😎','yellow',null),
('emotion-content','Content','🙂','green','Feeling quietly satisfied with the present.'),
('emotion-cozy','Cozy','🫖','green',null),
('emotion-defeated','Defeated','😞','blue',null),
('emotion-dejected','Dejected','😞','blue',null),
('emotion-delighted','Delighted','😊','yellow',null),
('emotion-disappointed','Disappointed','😞','blue',null),
('emotion-discouraged','Discouraged','😔','blue',null),
('emotion-disheartened','Disheartened','😔','blue',null),
('emotion-down','Down','😔','blue',null),
('emotion-drained','Drained','😮‍💨','blue','Feeling depleted and in need of rest.'),
('emotion-eager','Eager','😃','yellow',null),
('emotion-easygoing','Easygoing','🙂','green',null),
('emotion-elated','Elated','😁','yellow',null),
('emotion-energized','Energized','⚡','yellow',null),
('emotion-enthusiastic','Enthusiastic','😃','yellow',null),
('emotion-excited','Excited','😃','yellow','Feeling eager and energized about something.'),
('emotion-exhausted','Exhausted','😩','blue',null),
('emotion-exhilarated','Exhilarated','😁','yellow',null),
('emotion-fatigued','Fatigued','😴','blue',null),
('emotion-frustrated','Frustrated','😤','red','Feeling blocked or irritated.'),
('emotion-fulfilled','Fulfilled','😌','green',null),
('emotion-furious','Furious','😡','red',null),
('emotion-gloomy','Gloomy','😞','blue',null),
('emotion-grateful','Grateful','🙏','green',null),
('emotion-grieving','Grieving','😢','blue',null),
('emotion-happy','Happy','😊','yellow',null),
('emotion-hopeful','Hopeful','🌱','yellow','Looking ahead with a sense of possibility.'),
('emotion-hopeless','Hopeless','😞','blue',null),
('emotion-included','Included','🤝','green',null),
('emotion-inspired','Inspired','💡','yellow',null),
('emotion-irritated','Irritated','😣','red',null),
('emotion-jittery','Jittery','😵‍💫','red',null),
('emotion-joyful','Joyful','😊','yellow','Feeling bright, happy, and full of life.'),
('emotion-lively','Lively','😄','yellow',null),
('emotion-lonely','Lonely','😔','blue','Feeling a lack of the connection or company you want.'),
('emotion-loving','Loving','💗','green',null),
('emotion-mellow','Mellow','😌','green',null),
('emotion-miserable','Miserable','😣','blue',null),
('emotion-motivated','Motivated','💪','yellow',null),
('emotion-nervous','Nervous','😬','red',null),
('emotion-optimistic','Optimistic','🙂','yellow',null),
('emotion-overwhelmed','Overwhelmed','😵','red','Feeling that there is more to handle than you have room for.'),
('emotion-panicked','Panicked','😰','red',null),
('emotion-peaceful','Peaceful','🕊️','green','Feeling quiet and free from inner conflict.'),
('emotion-playful','Playful','😋','yellow',null),
('emotion-proud','Proud','😊','yellow',null),
('emotion-relaxed','Relaxed','😌','green',null),
('emotion-repulsed','Repulsed','😖','red',null),
('emotion-rested','Rested','🙂','green',null),
('emotion-restless','Restless','😖','red','Feeling unsettled and unable to comfortably stay still.'),
('emotion-sad','Sad','😔','blue','Feeling down or sorrowful.'),
('emotion-satisfied','Satisfied','🙂','green',null),
('emotion-secure','Secure','🫶','green',null),
('emotion-serene','Serene','🌿','green',null),
('emotion-spent','Spent','😮‍💨','blue',null),
('emotion-stressed','Stressed','😓','red',null),
('emotion-tense','Tense','😬','red',null),
('emotion-thrilled','Thrilled','😁','yellow',null),
('emotion-tired','Tired','🥱','blue',null),
('emotion-tranquil','Tranquil','🕊️','green',null),
('emotion-troubled','Troubled','😟','red',null),
('emotion-uneasy','Uneasy','😕','red',null),
('emotion-upbeat','Upbeat','😄','yellow',null),
('emotion-worried','Worried','😟','red',null);
