-- First-run onboarding for invited users (#29). Additive; no record is deleted.
-- Every account that already exists is marked onboarded, so no current user is ever sent through the new flow.
-- New accounts (created by the existing profile bootstrap trigger) start with onboarded_at null.
alter table public.profiles add column onboarded_at timestamptz;
update public.profiles set onboarded_at=coalesce(time_zone_confirmed_at,created_at) where onboarded_at is null;

-- The existing preference command gains two keys: a display name (1–80 characters, trimmed) and a one-way
-- "onboarded" flag. Revision checks, receipts and every other key behave exactly as before.
create or replace function public.save_account_preferences(p_expected_revision bigint,p_command_id uuid,p_patch jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();p public.profiles;receipt public.preference_commands;hash bytea;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_command_id is null or p_expected_revision is null or jsonb_typeof(p_patch) is distinct from 'object' or p_patch='{}' or exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('time_zone','cosmic_enabled','zodiac_sign','default_forecast_category','default_forecast_period','daily_forecast_category','first_name','onboarded')) then raise exception 'Invalid preferences' using errcode='22023';end if;
 if p_patch?'time_zone' and (jsonb_typeof(p_patch->'time_zone')<>'string' or not muse_private.valid_time_zone(p_patch->>'time_zone')) then raise exception 'Choose a valid IANA timezone' using errcode='22023';end if;
 if p_patch?'cosmic_enabled' and jsonb_typeof(p_patch->'cosmic_enabled') is distinct from 'boolean' then raise exception 'Invalid forecast preference' using errcode='22023';end if;
 if p_patch?'zodiac_sign' and p_patch->'zodiac_sign'<>'null' and (jsonb_typeof(p_patch->'zodiac_sign')<>'string' or p_patch->>'zodiac_sign' not in ('aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces')) then raise exception 'Invalid zodiac sign' using errcode='22023';end if;
 if p_patch?'default_forecast_category' and p_patch->>'default_forecast_category' not in ('overview','love','career','money','creativity','social','wellbeing','personal','emotions','travel','luck') then raise exception 'Invalid forecast category' using errcode='22023';end if;
 if p_patch?'daily_forecast_category' and p_patch->>'daily_forecast_category' not in ('overview','love','career','money','creativity','social','wellbeing','personal','emotions','travel','luck') then raise exception 'Invalid daily forecast category' using errcode='22023';end if;
 if p_patch?'default_forecast_period' and p_patch->>'default_forecast_period' not in ('daily','weekly','monthly') then raise exception 'Invalid forecast period' using errcode='22023';end if;
 if p_patch?'first_name' and (jsonb_typeof(p_patch->'first_name')<>'string' or char_length(btrim(p_patch->>'first_name')) not between 1 and 80) then raise exception 'Choose a name between 1 and 80 characters' using errcode='22023';end if;
 -- Finishing onboarding is one-way: it can be recorded, never undone by a client.
 if p_patch?'onboarded' and p_patch->'onboarded' is distinct from 'true'::jsonb then raise exception 'Onboarding can only be completed' using errcode='22023';end if;
 select * into strict p from public.profiles where id=uid for update;
 hash:=sha256(convert_to(jsonb_build_array(p_expected_revision,p_patch)::text,'UTF8'));
 select * into receipt from public.preference_commands where user_id=uid and id=p_command_id;
 if found then if receipt.request_hash<>hash then raise exception 'Preference command reused' using errcode='22023';end if;return receipt.revision;end if;
 if p.revision<>p_expected_revision then raise exception 'Preferences changed; load latest' using errcode='40001';end if;
 update public.profiles set time_zone=case when p_patch?'time_zone' then p_patch->>'time_zone' else time_zone end,time_zone_confirmed_at=case when p_patch?'time_zone' then clock_timestamp() else time_zone_confirmed_at end,cosmic_enabled=case when p_patch?'cosmic_enabled' then (p_patch->>'cosmic_enabled')::boolean else cosmic_enabled end,zodiac_sign=case when p_patch?'zodiac_sign' then p_patch->>'zodiac_sign' else zodiac_sign end,default_forecast_category=case when p_patch?'default_forecast_category' then p_patch->>'default_forecast_category' else default_forecast_category end,default_forecast_period=case when p_patch?'default_forecast_period' then p_patch->>'default_forecast_period' else default_forecast_period end,daily_forecast_category=case when p_patch?'daily_forecast_category' then p_patch->>'daily_forecast_category' else daily_forecast_category end,first_name=case when p_patch?'first_name' then btrim(p_patch->>'first_name') else first_name end,onboarded_at=case when p_patch?'onboarded' then coalesce(onboarded_at,clock_timestamp()) else onboarded_at end where id=uid returning * into p;
 insert into public.preference_commands values(uid,p_command_id,hash,p.revision);return p.revision;
end $$;
