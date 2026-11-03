-- Local implementation only. Hosted application requires separate explicit approval.
alter table public.profiles add column default_forecast_category text not null default 'overview' check(default_forecast_category in ('overview','love','career','money','creativity','social','wellbeing','personal','emotions','travel','luck'));
alter table public.profiles add column default_forecast_period text not null default 'daily' check(default_forecast_period in ('daily','weekly','monthly'));
alter table public.profiles add column daily_forecast_category text not null default 'overview' check(daily_forecast_category in ('overview','love','career','money','creativity','social','wellbeing','personal','emotions','travel','luck'));
create or replace function public.save_account_preferences(p_expected_revision bigint,p_command_id uuid,p_patch jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();p public.profiles;receipt public.preference_commands;hash bytea;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_command_id is null or p_expected_revision is null or jsonb_typeof(p_patch) is distinct from 'object' or p_patch='{}' or exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('time_zone','cosmic_enabled','zodiac_sign','default_forecast_category','default_forecast_period','daily_forecast_category')) then raise exception 'Invalid preferences' using errcode='22023';end if;
 if p_patch?'time_zone' and (jsonb_typeof(p_patch->'time_zone')<>'string' or not muse_private.valid_time_zone(p_patch->>'time_zone')) then raise exception 'Choose a valid IANA timezone' using errcode='22023';end if;
 if p_patch?'cosmic_enabled' and jsonb_typeof(p_patch->'cosmic_enabled') is distinct from 'boolean' then raise exception 'Invalid forecast preference' using errcode='22023';end if;
 if p_patch?'zodiac_sign' and p_patch->'zodiac_sign'<>'null' and (jsonb_typeof(p_patch->'zodiac_sign')<>'string' or p_patch->>'zodiac_sign' not in ('aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces')) then raise exception 'Invalid zodiac sign' using errcode='22023';end if;
 if p_patch?'default_forecast_category' and p_patch->>'default_forecast_category' not in ('overview','love','career','money','creativity','social','wellbeing','personal','emotions','travel','luck') then raise exception 'Invalid forecast category' using errcode='22023';end if;
 if p_patch?'daily_forecast_category' and p_patch->>'daily_forecast_category' not in ('overview','love','career','money','creativity','social','wellbeing','personal','emotions','travel','luck') then raise exception 'Invalid daily forecast category' using errcode='22023';end if;
 if p_patch?'default_forecast_period' and p_patch->>'default_forecast_period' not in ('daily','weekly','monthly') then raise exception 'Invalid forecast period' using errcode='22023';end if;
 select * into strict p from public.profiles where id=uid for update;
 hash:=sha256(convert_to(jsonb_build_array(p_expected_revision,p_patch)::text,'UTF8'));
 select * into receipt from public.preference_commands where user_id=uid and id=p_command_id;
 if found then if receipt.request_hash<>hash then raise exception 'Preference command reused' using errcode='22023';end if;return receipt.revision;end if;
 if p.revision<>p_expected_revision then raise exception 'Preferences changed; load latest' using errcode='40001';end if;
 update public.profiles set time_zone=case when p_patch?'time_zone' then p_patch->>'time_zone' else time_zone end,time_zone_confirmed_at=case when p_patch?'time_zone' then clock_timestamp() else time_zone_confirmed_at end,cosmic_enabled=case when p_patch?'cosmic_enabled' then (p_patch->>'cosmic_enabled')::boolean else cosmic_enabled end,zodiac_sign=case when p_patch?'zodiac_sign' then p_patch->>'zodiac_sign' else zodiac_sign end,default_forecast_category=case when p_patch?'default_forecast_category' then p_patch->>'default_forecast_category' else default_forecast_category end,default_forecast_period=case when p_patch?'default_forecast_period' then p_patch->>'default_forecast_period' else default_forecast_period end,daily_forecast_category=case when p_patch?'daily_forecast_category' then p_patch->>'daily_forecast_category' else daily_forecast_category end where id=uid returning * into p;
 insert into public.preference_commands values(uid,p_command_id,hash,p.revision);return p.revision;
end $$;
create table public.astrology_birth_profiles(
 user_id uuid primary key references auth.users on delete cascade,
 id uuid not null unique,
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 revision bigint not null default 1 check(revision>0),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id)
);
create table public.astrology_natal_charts(
 user_id uuid primary key references auth.users on delete cascade,
 id uuid not null unique,
 profile_id uuid not null,
 profile_revision bigint not null,
 payload jsonb not null check(jsonb_typeof(payload)='object' and payload->>'engine'='astronomy-engine' and payload->>'zodiac'='tropical' and payload->>'houseSystem'='whole-sign'),
 foreign key(user_id,profile_id) references public.astrology_birth_profiles(user_id,id) on delete cascade
);
create table public.astrology_journal_entries(
 id uuid primary key,
 user_id uuid not null references auth.users on delete cascade,
 date date not null,
 time_zone text not null check(muse_private.valid_time_zone(time_zone)),
 title text not null default '' check(length(title)<=160),
 text text not null default '' check(length(text)<=10000),
 reference jsonb check(reference is null or (jsonb_typeof(reference)='object' and reference->>'type' in ('reflection','placement','event','library','forecast'))),
 revision bigint not null default 1 check(revision>0),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 check(length(trim(text))>0 or reference is not null)
);
create index astrology_journal_owner_date on public.astrology_journal_entries(user_id,date desc);
create table public.astrology_activity(
 user_id uuid not null references auth.users on delete cascade,
 kind text not null check(kind in ('forecast-viewed','forecast-saved','journal-created','chart-created','chart-explored','library-viewed','event-saved')),
 reference_id text not null check(length(reference_id) between 1 and 220),
 date date not null,
 time_zone text not null check(muse_private.valid_time_zone(time_zone)),
 created_at timestamptz not null default clock_timestamp(),
 primary key(user_id,kind,reference_id,date)
);
create table muse_private.astrology_commands(
 user_id uuid not null references auth.users on delete cascade,
 command_id uuid not null,
 request_hash bytea not null,
 receipt jsonb not null,
 primary key(user_id,command_id)
);
revoke all on muse_private.astrology_commands from public,anon,authenticated;
do $$declare t text;begin foreach t in array array['astrology_birth_profiles','astrology_natal_charts','astrology_journal_entries','astrology_activity'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('create policy owner_select on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
 end loop;end $$;
create function public.read_astrology() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare uid uuid:=auth.uid();begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 return jsonb_build_object(
 'profile',(select jsonb_build_object('id',id,'payload',payload,'revision',revision) from public.astrology_birth_profiles where user_id=uid),
 'chart',(select jsonb_build_object('id',id,'payload',payload,'profile_revision',profile_revision) from public.astrology_natal_charts where user_id=uid),
 'journal',(select coalesce(jsonb_agg(to_jsonb(t) order by date desc,created_at desc),'[]'::jsonb) from public.astrology_journal_entries t where user_id=uid),
 'activity',(select coalesce(jsonb_agg(to_jsonb(t) order by created_at desc),'[]'::jsonb) from public.astrology_activity t where user_id=uid));
end $$;
revoke all on function public.read_astrology() from public,anon;
grant execute on function public.read_astrology() to authenticated;

-- The normal UI uses an authenticated server endpoint to calculate charts.
-- RPC ownership is checked independently; no privileged key is needed for user CRUD.
create function public.write_astrology(p_user_id uuid,p_operation text,p_record jsonb,p_expected_revision bigint,p_command_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare h bytea;old_command muse_private.astrology_commands;receipt jsonb;v_revision bigint;v_id uuid;v_zone text;v_date date;v_created boolean:=false;
begin
 if auth.uid() is null or auth.uid()<>p_user_id then raise exception 'Astrology owner mismatch' using errcode='42501';end if;
 if p_user_id is null or p_command_id is null or p_expected_revision is null or jsonb_typeof(p_record) is distinct from 'object' then raise exception 'Invalid astrology command' using errcode='22023';end if;
 -- Serialize owner commands (including first inserts and concurrent activity deduplication).
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,911));
 h:=sha256(convert_to(jsonb_build_array(p_operation,p_expected_revision,case when p_operation='profile-save' then p_record-'chart' else p_record end)::text,'UTF8'));
 select * into old_command from muse_private.astrology_commands where user_id=p_user_id and command_id=p_command_id;
 if found then if old_command.request_hash<>h then raise exception 'Command ID reused' using errcode='22023';end if;return old_command.receipt;end if;
 select time_zone into strict v_zone from public.profiles where id=p_user_id;
 v_date:=(clock_timestamp() at time zone v_zone)::date;
 if p_operation='profile-save' then
  select revision,id into v_revision,v_id from public.astrology_birth_profiles where user_id=p_user_id;
  if coalesce(v_revision,0)<>p_expected_revision then raise exception 'Birth profile changed' using errcode='40001';end if;
  v_id:=coalesce(v_id,(p_record->>'id')::uuid);v_revision:=coalesce(v_revision,0)+1;
  insert into public.astrology_birth_profiles(user_id,id,payload,revision) values(p_user_id,v_id,p_record->'profile',v_revision)
   on conflict(user_id) do update set payload=excluded.payload,revision=excluded.revision,updated_at=clock_timestamp();
  insert into public.astrology_natal_charts(user_id,id,profile_id,profile_revision,payload) values(p_user_id,(p_record->>'chartId')::uuid,v_id,v_revision,p_record->'chart')
   on conflict(user_id) do update set id=excluded.id,profile_revision=excluded.profile_revision,payload=excluded.payload;
  insert into public.astrology_activity(user_id,kind,reference_id,date,time_zone) values(p_user_id,'chart-created',p_record->>'chartId',v_date,v_zone) on conflict do nothing;
  receipt:=jsonb_build_object('id',v_id,'revision',v_revision);
 elsif p_operation in ('profile-delete','chart-delete') then
  select revision into v_revision from public.astrology_birth_profiles where user_id=p_user_id;
  if coalesce(v_revision,0)<>p_expected_revision then raise exception 'Birth profile changed' using errcode='40001';end if;
  if p_operation='profile-delete' then delete from public.astrology_birth_profiles where user_id=p_user_id;
  else delete from public.astrology_natal_charts where user_id=p_user_id;end if;
  delete from public.astrology_activity where user_id=p_user_id and kind in ('chart-created','chart-explored');
  receipt:=jsonb_build_object('deleted',true);
 elsif p_operation in ('journal-save','journal-delete') then
  v_id:=(p_record->>'id')::uuid;
  if exists(select 1 from public.astrology_journal_entries where id=v_id and user_id<>p_user_id) then raise exception 'Journal owner mismatch' using errcode='42501';end if;
  select revision into v_revision from public.astrology_journal_entries where id=v_id and user_id=p_user_id;
  if coalesce(v_revision,0)<>p_expected_revision then raise exception 'Journal entry changed' using errcode='40001';end if;
  if p_operation='journal-delete' then delete from public.astrology_journal_entries where id=v_id and user_id=p_user_id;receipt:=jsonb_build_object('id',v_id,'deleted',true);
  else
   v_created:=v_revision is null;v_revision:=coalesce(v_revision,0)+1;
   insert into public.astrology_journal_entries(id,user_id,date,time_zone,title,text,reference,revision) values(v_id,p_user_id,(p_record->>'date')::date,p_record->>'time_zone',p_record->>'title',p_record->>'text',nullif(p_record->'reference','null'::jsonb),v_revision)
    on conflict(id) do update set date=excluded.date,time_zone=excluded.time_zone,title=excluded.title,text=excluded.text,reference=excluded.reference,revision=excluded.revision,updated_at=clock_timestamp();
   if v_created then insert into public.astrology_activity(user_id,kind,reference_id,date,time_zone) values(p_user_id,'journal-created',v_id::text,v_date,v_zone) on conflict do nothing;end if;
   if v_created and p_record->'reference'->>'type'='event' then insert into public.astrology_activity(user_id,kind,reference_id,date,time_zone) values(p_user_id,'event-saved',p_record->'reference'->>'id',v_date,v_zone) on conflict do nothing;end if;
   receipt:=jsonb_build_object('id',v_id,'revision',v_revision);
  end if;
 elsif p_operation='activity' then
  if p_record->>'kind' not in ('chart-explored','library-viewed') then raise exception 'Unsupported astrology activity' using errcode='22023';end if;
  insert into public.astrology_activity(user_id,kind,reference_id,date,time_zone) values(p_user_id,p_record->>'kind',p_record->>'reference_id',v_date,v_zone) on conflict do nothing;
  receipt:=jsonb_build_object('recorded',true);
 elsif p_operation='history-clear' then
  delete from public.astrology_activity where user_id=p_user_id;receipt:=jsonb_build_object('deleted',true);
 else raise exception 'Unsupported astrology command' using errcode='22023';end if;
 insert into muse_private.astrology_commands values(p_user_id,p_command_id,h,receipt);return receipt;
end $$;
revoke all on function public.write_astrology(uuid,text,jsonb,bigint,uuid) from public,anon,authenticated;
grant execute on function public.write_astrology(uuid,text,jsonb,bigint,uuid) to service_role;
grant execute on function public.write_astrology(uuid,text,jsonb,bigint,uuid) to authenticated;
