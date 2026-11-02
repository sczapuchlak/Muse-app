-- Correct timer interval containment precedence on databases where the prior migration ran.
create or replace function public.save_reading_timer(p_expected_revision bigint,p_command_id uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();old public.whimsy_reading_timers;receipt public.whimsy_commands;hash bytea;result jsonb;book uuid;segment jsonb;last_end timestamptz;start_at timestamptz;end_at timestamptz;phase text;next_revision bigint;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_expected_revision is null or p_expected_revision<0 or p_command_id is null or (p_payload is not null and (jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>131072)) then raise exception 'Invalid timer command' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('muse.whimsy.'||uid::text,0));
 hash:=sha256(convert_to(jsonb_build_array('readingTimer',p_expected_revision,p_payload)::text,'UTF8'));
 select * into receipt from public.whimsy_commands where user_id=uid and id=p_command_id;
 if found then if receipt.request_hash<>hash then raise exception 'Command reused' using errcode='22023';end if;return receipt.result;end if;
 select * into old from public.whimsy_reading_timers where user_id=uid for update;
 if coalesce(old.revision,0)<>p_expected_revision then raise exception 'Reading timer changed elsewhere' using errcode='40001';end if;
 if p_payload is null then
  delete from public.whimsy_reading_timers where user_id=uid;
  result:=jsonb_build_object('revision',coalesce(old.revision,0)+1,'deleted',true);
 else
  if not p_payload ?& array['bookId','phase','date','timeZone','startedAt','sessionId','sessionCommandId','segments'] then raise exception 'Timer fields missing' using errcode='22023';end if;
  phase:=p_payload->>'phase';book:=(p_payload->>'bookId')::uuid;
  if phase not in ('running','paused','finishing','saving') or coalesce(p_payload->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' or not exists(select 1 from pg_timezone_names where name=p_payload->>'timeZone') or jsonb_typeof(p_payload->'segments')<>'array' or jsonb_array_length(p_payload->'segments')>200 or coalesce(p_payload->>'startedAt','') !~ 'Z$' or not exists(select 1 from public.whimsy_books b where b.id=book and b.user_id=uid) then raise exception 'Invalid reading timer' using errcode='22023';end if;
  perform (p_payload->>'sessionId')::uuid;perform (p_payload->>'sessionCommandId')::uuid;perform (p_payload->>'startedAt')::timestamptz;
  if phase='running' and coalesce(p_payload->>'runningSince','') !~ 'Z$' or phase='saving' and jsonb_typeof(p_payload->'finishDraft')<>'object' then raise exception 'Invalid timer phase' using errcode='22023';end if;
  if old.user_id is not null and (old.book_id<>book or (old.payload->>'sessionId',old.payload->>'startedAt',old.payload->>'date',old.payload->>'timeZone') is distinct from (p_payload->>'sessionId',p_payload->>'startedAt',p_payload->>'date',p_payload->>'timeZone') or not ((p_payload->'segments') @> (old.payload->'segments'))) then raise exception 'Timer identity and elapsed intervals are immutable' using errcode='22023';end if;
  for segment in select value from jsonb_array_elements(p_payload->'segments') order by value->>'start' loop
   if coalesce(segment->>'start','') !~ 'Z$' or coalesce(segment->>'end','') !~ 'Z$' then raise exception 'UTC intervals required' using errcode='22023';end if;
   start_at:=(segment->>'start')::timestamptz;end_at:=(segment->>'end')::timestamptz;
   if end_at<=start_at or end_at-start_at>interval '24 hours' or start_at<last_end then raise exception 'Invalid timer interval' using errcode='22023';end if;
   last_end:=end_at;
  end loop;
  if phase='running' then start_at:=(p_payload->>'runningSince')::timestamptz;if start_at<coalesce(last_end,'-infinity'::timestamptz) then raise exception 'Timer overlaps saved interval' using errcode='22023';end if;end if;
  if old.user_id is null then insert into public.whimsy_reading_timers(user_id,book_id,payload) values(uid,book,p_payload);next_revision:=1;
  else update public.whimsy_reading_timers set payload=p_payload,revision=revision+1,updated_at=clock_timestamp() where user_id=uid returning revision into next_revision;end if;
  result:=jsonb_build_object('revision',next_revision,'deleted',false);
 end if;
 insert into public.whimsy_commands values(uid,p_command_id,hash,result);return result;
end $$;
revoke all on function public.save_reading_timer(bigint,uuid,jsonb) from public,anon;
grant execute on function public.save_reading_timer(bigint,uuid,jsonb) to authenticated;

