-- Small validated account preferences; appearance remains browser-local.
alter table public.profiles add column time_zone_confirmed_at timestamptz;
alter table public.profiles add column cosmic_enabled boolean not null default true;
alter table public.profiles add column zodiac_sign text check(zodiac_sign in ('aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'));
-- Existing UTC defaults are intentionally not inferred to be confirmed.
revoke update(time_zone) on public.profiles from authenticated;
create table public.preference_commands(user_id uuid not null references auth.users on delete cascade,id uuid not null,request_hash bytea not null,revision bigint not null,primary key(user_id,id));
alter table public.preference_commands enable row level security;
revoke all on public.preference_commands from public,anon,authenticated;
grant select on public.preference_commands to authenticated;
create policy owner_read on public.preference_commands for select to authenticated using((select auth.uid())=user_id);
create function public.save_account_preferences(p_expected_revision bigint,p_command_id uuid,p_patch jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();p public.profiles;receipt public.preference_commands;hash bytea;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_command_id is null or p_expected_revision is null or jsonb_typeof(p_patch) is distinct from 'object' or p_patch='{}' or exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('time_zone','cosmic_enabled','zodiac_sign')) then raise exception 'Invalid preferences' using errcode='22023';end if;
 if p_patch?'time_zone' and (jsonb_typeof(p_patch->'time_zone')<>'string' or not muse_private.valid_time_zone(p_patch->>'time_zone')) then raise exception 'Choose a valid IANA timezone' using errcode='22023';end if;
 if p_patch?'cosmic_enabled' and jsonb_typeof(p_patch->'cosmic_enabled') is distinct from 'boolean' then raise exception 'Invalid forecast preference' using errcode='22023';end if;
 if p_patch?'zodiac_sign' and p_patch->'zodiac_sign'<>'null' and (jsonb_typeof(p_patch->'zodiac_sign')<>'string' or p_patch->>'zodiac_sign' not in ('aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces')) then raise exception 'Invalid zodiac sign' using errcode='22023';end if;
 select * into strict p from public.profiles where id=uid for update;
 hash:=sha256(convert_to(jsonb_build_array(p_expected_revision,p_patch)::text,'UTF8'));
 select * into receipt from public.preference_commands where user_id=uid and id=p_command_id;
 if found then if receipt.request_hash<>hash then raise exception 'Preference command reused' using errcode='22023';end if;return receipt.revision;end if;
 if p.revision<>p_expected_revision then raise exception 'Preferences changed; load latest' using errcode='40001';end if;
 update public.profiles set time_zone=case when p_patch?'time_zone' then p_patch->>'time_zone' else time_zone end,time_zone_confirmed_at=case when p_patch?'time_zone' then clock_timestamp() else time_zone_confirmed_at end,cosmic_enabled=case when p_patch?'cosmic_enabled' then (p_patch->>'cosmic_enabled')::boolean else cosmic_enabled end,zodiac_sign=case when p_patch?'zodiac_sign' then p_patch->>'zodiac_sign' else zodiac_sign end where id=uid returning * into p;
 insert into public.preference_commands values(uid,p_command_id,hash,p.revision);return p.revision;
end $$;
revoke all on function public.save_account_preferences(bigint,uuid,jsonb) from public,anon;
grant execute on function public.save_account_preferences(bigint,uuid,jsonb) to authenticated;

-- A consistent owner-scoped export of currently persistent domains. No secrets,
-- command receipts, prototype stores, browser preferences or invented history.
create or replace function public.export_personal_data() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 return jsonb_build_object('schema_version',1,'exported_at',current_timestamp,'profile',(select to_jsonb(p) from public.profiles p where id=uid),
 'daily_records',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.daily_records r where user_id=uid),
 'daily_priorities',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.daily_priorities r where user_id=uid),
 'mood_checkins',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.mood_checkins r where user_id=uid),
 'checkin_emotions',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.checkin_emotions r where user_id=uid),
 'checkin_influences',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.checkin_influences r where user_id=uid),
 'influence_tags',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.influence_tags r where user_id=uid),
 'emotion_favorites',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.emotion_favorites r where user_id=uid),
 'workspaces',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.workspaces r where user_id=uid),
 'task_groups',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.task_groups r where user_id=uid),
 'task_tags',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.task_tags r where user_id=uid),
 'tasks',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.tasks r where user_id=uid),
 'task_subtasks',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.task_subtasks r where user_id=uid),
 'task_tag_links',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.task_tag_links r where user_id=uid),
 'planner_events',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.planner_events r where user_id=uid),
 'task_time_sessions',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.task_time_sessions r where user_id=uid),
 'task_completion_events',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.task_completion_events r where user_id=uid),
 'notes',(select coalesce(jsonb_agg(to_jsonb(r)-'search_vector'),'[]'::jsonb) from public.notes r where user_id=uid),
 'note_tags',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.note_tags r where user_id=uid),
 'note_tag_links',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.note_tag_links r where user_id=uid),
 'emotion_catalog',(select jsonb_agg(to_jsonb(e)) from public.emotion_catalog e));
end $$;
revoke all on function public.export_personal_data() from public,anon;
grant execute on function public.export_personal_data() to authenticated;
