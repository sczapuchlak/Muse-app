-- Mood: one cohesive feelings library with personal interpretations and custom feelings (#130). Additive and owner-only.
--
-- * custom_feelings: a person's own feelings (name + the quadrant they chose). Searchable next to the shared vocabulary.
-- * mood_checkins.feelings: a snapshot of every feeling recorded in a check-in (its name and the quadrant the person
--   chose at that time). History reads this snapshot, so renaming or deleting a custom feeling, changing its quadrant,
--   or interpreting a word differently later never rewrites a recorded entry. checkin_emotions keeps the shared-catalog
--   ids exactly as before; custom feelings live only in the snapshot.
-- * A small expansion of the shared vocabulary (ids are fixed, quadrants are the default interpretation).

insert into public.emotion_catalog(id,name,emoji,quadrant,definition) values
('emotion-lazy','Lazy','🛋️','blue','Feeling unmotivated or slow. For some people this is restful, for others it is heavy.'),
('emotion-numb','Numb','😶','blue','Feeling little, or feeling cut off from feeling.'),
('emotion-nostalgic','Nostalgic','🕰️','green','A soft longing for the way things were.'),
('emotion-bittersweet','Bittersweet','🥲','blue','Happy and sad together.'),
('emotion-competitive','Competitive','😤','yellow','Fired up to win or to measure yourself.'),
('emotion-intense','Intense','🔥','red','Feeling everything at full strength.')
on conflict (id) do nothing;

create table public.custom_feelings (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 name text not null check (char_length(btrim(name)) between 1 and 40),
 quadrant text not null check (quadrant in ('red', 'blue', 'green', 'yellow')),
 emoji text check (emoji is null or char_length(emoji) between 1 and 16),
 favorite boolean not null default false,
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
-- Case-insensitive, whitespace-insensitive: "Restless" and " restless " are the same feeling. (The app also ignores accents.)
create unique index custom_feelings_one_name on public.custom_feelings(user_id, lower(btrim(name)));
create trigger touch_custom_feelings before update on public.custom_feelings for each row execute function muse_private.touch_collection_record();
alter table public.custom_feelings enable row level security;
revoke all on public.custom_feelings from public, anon, authenticated;
grant select, insert, update, delete on public.custom_feelings to authenticated, service_role;
create policy owner_read on public.custom_feelings for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.custom_feelings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.custom_feelings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.custom_feelings for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.mood_checkins add column feelings jsonb not null default '[]'
 check (jsonb_typeof(feelings) = 'array' and jsonb_array_length(feelings) <= 40 and octet_length(feelings::text) <= 20000);

-- The save command now also takes the snapshot. Same contract as before; an entry holding only custom feelings is a real entry.
drop function public.save_mood_checkin(date,text,text,text[],uuid[],bigint);
create function public.save_mood_checkin(p_date date,p_period text,p_reflection text,p_emotion_ids text[],p_influence_ids uuid[],p_expected_revision bigint default null,p_feelings jsonb default '[]')
returns public.mood_checkins language plpgsql security invoker set search_path = '' as $$
declare day public.daily_records; result public.mood_checkins; existing public.mood_checkins; zone text;
begin
  if p_period is null or p_period not in ('morning','evening') then raise exception 'Invalid check-in period' using errcode='22023'; end if;
  if p_emotion_ids is null or p_influence_ids is null or cardinality(p_influence_ids)>3 then raise exception 'Invalid feeling or influence selection' using errcode='22023'; end if;
  if p_feelings is null or jsonb_typeof(p_feelings)<>'array' or jsonb_array_length(p_feelings)>40
     or exists(select 1 from jsonb_array_elements(p_feelings) f where jsonb_typeof(f)<>'object'
       or coalesce(char_length(f->>'id') not between 1 and 64,true)
       or coalesce(char_length(btrim(f->>'name')) not between 1 and 40,true)
       or coalesce((f->>'quadrant') not in ('red','blue','green','yellow'),true)) then
    raise exception 'Invalid feelings snapshot' using errcode='22023';
  end if;
  day := public.ensure_daily_record(p_date);
  -- Lock the authoritative day to serialize first-session creation and replacement of joins.
  perform 1 from public.daily_records where user_id=auth.uid() and id=day.id for update;
  select * into existing from public.mood_checkins where user_id=auth.uid() and daily_record_id=day.id and period=p_period for update;
  if (existing.id is null and p_expected_revision is not null) or
     (existing.id is not null and (p_expected_revision is null or existing.revision<>p_expected_revision)) then
    raise exception 'Check-in changed; reload before saving' using errcode='40001';
  end if;
  if existing.id is null then
    select time_zone into strict zone from public.profiles where id=auth.uid();
    insert into public.mood_checkins(user_id,daily_record_id,period,reflection,captured_time_zone,feelings)
    values(auth.uid(),day.id,p_period,nullif(btrim(p_reflection),''),zone,p_feelings) returning * into result;
  else
    update public.mood_checkins set reflection=nullif(btrim(p_reflection),''),feelings=p_feelings where id=existing.id and user_id=auth.uid() returning * into result;
  end if;
  delete from public.checkin_emotions where user_id=auth.uid() and checkin_id=result.id;
  insert into public.checkin_emotions(user_id,checkin_id,emotion_id) select auth.uid(),result.id,item from unnest(p_emotion_ids) item;
  delete from public.checkin_influences where user_id=auth.uid() and checkin_id=result.id;
  insert into public.checkin_influences(user_id,checkin_id,influence_id,position)
    select auth.uid(),result.id,item,(ordinal-1)::smallint from unnest(p_influence_ids) with ordinality as choices(item,ordinal);
  -- A fully cleared emotional session becomes missing; independent daily values survive.
  if nullif(btrim(p_reflection),'') is null and cardinality(p_emotion_ids)=0 and jsonb_array_length(p_feelings)=0 and cardinality(p_influence_ids)=0 then
    delete from public.mood_checkins where user_id=auth.uid() and id=result.id;
    return null;
  end if;
  return result;
end $$;
revoke all on function public.save_mood_checkin(date,text,text,text[],uuid[],bigint,jsonb) from public, anon;
grant execute on function public.save_mood_checkin(date,text,text,text[],uuid[],bigint,jsonb) to authenticated;
