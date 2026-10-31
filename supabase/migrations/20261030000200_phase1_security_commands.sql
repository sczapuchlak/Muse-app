-- All private API access is authenticated, owner-scoped and backed by owner-safe FKs.
do $$ declare tab text; begin
  foreach tab in array array['profiles','daily_records','daily_priorities','mood_checkins','influence_tags','checkin_emotions','checkin_influences','emotion_favorites'] loop
    execute format('alter table public.%I enable row level security',tab);
    execute format('revoke all on public.%I from anon,authenticated',tab);
    if tab='profiles' then
      execute format('create policy owner_select on public.%I for select to authenticated using ((select auth.uid())=id)',tab);
      execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id)',tab);
      execute format('grant select on public.%I to authenticated',tab);
      execute format('grant update(first_name,time_zone) on public.%I to authenticated',tab);
    else
      execute format('create policy owner_access on public.%I for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',tab);
      execute format('grant select,insert,update,delete on public.%I to authenticated',tab);
    end if;
    execute format('grant all on public.%I to service_role',tab);
  end loop;
end $$;
alter table public.emotion_catalog enable row level security;
revoke all on public.emotion_catalog from anon,authenticated;
grant select on public.emotion_catalog to authenticated;
grant all on public.emotion_catalog to service_role;
create policy vocabulary_read on public.emotion_catalog for select to authenticated using (true);

-- Invoker functions retain RLS. No caller-supplied owner identity is accepted.
create function public.ensure_daily_record(p_date date) returns public.daily_records
language plpgsql security invoker set search_path = '' as $$
declare result public.daily_records; zone text;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  if p_date is null then raise exception 'A calendar date is required' using errcode='22023'; end if;
  select time_zone into strict zone from public.profiles where id=auth.uid();
  insert into public.daily_records(user_id,local_date,time_zone) values(auth.uid(),p_date,zone)
    on conflict(user_id,local_date) do nothing;
  select * into strict result from public.daily_records where user_id=auth.uid() and local_date=p_date;
  return result;
end $$;

create function public.save_daily_record(p_date date,p_patch jsonb,p_expected_revision bigint)
returns public.daily_records language plpgsql security invoker set search_path = '' as $$
declare result public.daily_records; current_record public.daily_records; field text;
begin
  if jsonb_typeof(p_patch) is distinct from 'object' then raise exception 'Expected a field patch' using errcode='22023'; end if;
  for field in select jsonb_object_keys(p_patch) loop
    if field not in ('intention_text','intention_emoji','day_in_three','energy','stress','overall_day') then
      raise exception 'Unsupported daily field: %',field using errcode='22023';
    end if;
  end loop;
  current_record := public.ensure_daily_record(p_date);
  if p_expected_revision is null or current_record.revision<>p_expected_revision then
    raise exception 'Daily record changed; reload before saving' using errcode='40001';
  end if;
  -- Independent field patch, never replace other daily dimensions from a stale whole record.
  update public.daily_records set
    intention_text=case when p_patch?'intention_text' then nullif(btrim(p_patch->>'intention_text'),'') else intention_text end,
    intention_emoji=case when p_patch?'intention_emoji' then p_patch->>'intention_emoji' else intention_emoji end,
    day_in_three=case when p_patch?'day_in_three' then array(select jsonb_array_elements_text(p_patch->'day_in_three')) else day_in_three end,
    energy=case when p_patch?'energy' then (p_patch->>'energy')::smallint else energy end,
    stress=case when p_patch?'stress' then (p_patch->>'stress')::smallint else stress end,
    overall_day=case when p_patch?'overall_day' then (p_patch->>'overall_day')::smallint else overall_day end
  where user_id=auth.uid() and id=current_record.id and revision=p_expected_revision returning * into result;
  if not found then raise exception 'Daily record changed; reload before saving' using errcode='40001'; end if;
  return result;
end $$;

create function public.save_mood_checkin(p_date date,p_period text,p_reflection text,p_emotion_ids text[],p_influence_ids uuid[],p_expected_revision bigint default null)
returns public.mood_checkins language plpgsql security invoker set search_path = '' as $$
declare day public.daily_records; result public.mood_checkins; existing public.mood_checkins; zone text;
begin
  if p_period is null or p_period not in ('morning','evening') then raise exception 'Invalid check-in period' using errcode='22023'; end if;
  if p_emotion_ids is null or p_influence_ids is null or cardinality(p_influence_ids)>3 then raise exception 'Invalid feeling or influence selection' using errcode='22023'; end if;
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
    insert into public.mood_checkins(user_id,daily_record_id,period,reflection,captured_time_zone)
    values(auth.uid(),day.id,p_period,nullif(btrim(p_reflection),''),zone) returning * into result;
  else
    update public.mood_checkins set reflection=nullif(btrim(p_reflection),'') where id=existing.id and user_id=auth.uid() returning * into result;
  end if;
  delete from public.checkin_emotions where user_id=auth.uid() and checkin_id=result.id;
  insert into public.checkin_emotions(user_id,checkin_id,emotion_id) select auth.uid(),result.id,item from unnest(p_emotion_ids) item;
  delete from public.checkin_influences where user_id=auth.uid() and checkin_id=result.id;
  insert into public.checkin_influences(user_id,checkin_id,influence_id,position)
    select auth.uid(),result.id,item,(ordinal-1)::smallint from unnest(p_influence_ids) with ordinality as choices(item,ordinal);
  -- A fully cleared emotional session becomes missing; independent daily values survive.
  if nullif(btrim(p_reflection),'') is null and cardinality(p_emotion_ids)=0 and cardinality(p_influence_ids)=0 then
    delete from public.mood_checkins where user_id=auth.uid() and id=result.id;
    return null;
  end if;
  return result;
end $$;

create function public.delete_mood_checkin(p_id uuid,p_expected_revision bigint) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.mood_checkins where user_id=auth.uid() and id=p_id and revision=p_expected_revision;
  if not found then raise exception 'Check-in missing or changed' using errcode='40001'; end if;
end $$;

revoke all on function public.ensure_daily_record(date),public.save_daily_record(date,jsonb,bigint),public.save_mood_checkin(date,text,text,text[],uuid[],bigint),public.delete_mood_checkin(uuid,bigint) from public,anon;
grant execute on function public.ensure_daily_record(date),public.save_daily_record(date,jsonb,bigint),public.save_mood_checkin(date,text,text,text[],uuid[],bigint),public.delete_mood_checkin(uuid,bigint) to authenticated;
