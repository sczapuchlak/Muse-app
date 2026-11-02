-- Local-only Bookshelf timer state. Existing books/sessions remain canonical records.
create table public.whimsy_reading_timers(
 user_id uuid primary key references auth.users on delete cascade,
 book_id uuid not null,
 payload jsonb not null,
 revision bigint not null default 1 check(revision>0),
 updated_at timestamptz not null default clock_timestamp(),
 foreign key(user_id,book_id) references public.whimsy_books(user_id,id) on delete no action deferrable initially deferred
);
alter table public.whimsy_reading_timers enable row level security;
revoke all on public.whimsy_reading_timers from public,anon,authenticated;
grant select on public.whimsy_reading_timers to authenticated;
create policy owner_read on public.whimsy_reading_timers for select to authenticated using ((select auth.uid())=user_id);
grant select on public.whimsy_reading_timers to service_role;

create function public.read_reading_timer() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare uid uuid:=auth.uid();result jsonb;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 select payload||jsonb_build_object('revision',revision,'updatedAt',updated_at) into result from public.whimsy_reading_timers where user_id=uid;
 return result;
end $$;
revoke all on function public.read_reading_timer() from public,anon;
grant execute on function public.read_reading_timer() to authenticated;

create function public.save_reading_timer(p_expected_revision bigint,p_command_id uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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

-- One atomic, owner-checked deletion preserves referential integrity and cannot leave half a book behind.
create function public.delete_whimsy_book(p_book_id uuid,p_expected_revision bigint,p_command_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();v bigint;receipt public.whimsy_commands;hash bytea;result jsonb;deleted_sessions integer;session_ids uuid[];
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_book_id is null or p_expected_revision is null or p_expected_revision<1 or p_command_id is null then raise exception 'Invalid book deletion' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('muse.whimsy.'||uid::text,0));
 hash:=sha256(convert_to(jsonb_build_array('deleteBook',p_book_id,p_expected_revision)::text,'UTF8'));
 select * into receipt from public.whimsy_commands where user_id=uid and id=p_command_id;
 if found then if receipt.request_hash<>hash then raise exception 'Command reused' using errcode='22023';end if;return receipt.result;end if;
 select revision into v from public.whimsy_books where id=p_book_id and user_id=uid for update;
 if v is null then raise exception 'Book unavailable' using errcode='42501';end if;
 if v<>p_expected_revision then raise exception 'Book changed elsewhere' using errcode='40001';end if;
 if exists(select 1 from public.whimsy_reading_timers where user_id=uid and book_id=p_book_id) then raise exception 'Finish or cancel the active timer first' using errcode='23503';end if;
 select coalesce(array_agg(id),'{}'::uuid[]) into session_ids from public.whimsy_reading_sessions where user_id=uid and book_id=p_book_id;
 delete from public.whimsy_reading_sessions where user_id=uid and book_id=p_book_id;get diagnostics deleted_sessions=row_count;
 delete from public.whimsy_content_links where user_id=uid and (kind='books' and record_id=p_book_id or kind='sessions' and record_id=any(session_ids));
 delete from public.whimsy_books where user_id=uid and id=p_book_id;
 result:=jsonb_build_object('deleted',true,'bookId',p_book_id,'sessions',deleted_sessions);
 insert into public.whimsy_commands values(uid,p_command_id,hash,result);return result;
end $$;
revoke all on function public.delete_whimsy_book(uuid,bigint,uuid) from public,anon;
grant execute on function public.delete_whimsy_book(uuid,bigint,uuid) to authenticated;

-- Existing closed Whimsy writer supports daily goals as an explicit period.
create or replace function public.save_whimsy_record(p_kind text,p_expected_revision bigint,p_command_id uuid,p_record jsonb,p_delete boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();t text:=muse_private.whimsy_table(p_kind);rid uuid:=(p_record->>'id')::uuid;v bigint;old_owner uuid;old_payload jsonb;hash bytea;receipt public.whimsy_commands;body jsonb:=p_record-'id'-'userId'-'revision'-'createdAt'-'updatedAt';day date;zone text;ref jsonb;refs jsonb:='[]';exp text;segment jsonb;previous_end timestamptz;started timestamptz;ended timestamptz;result jsonb;parent uuid;required text[];field text;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if t is null or rid is null or p_command_id is null or p_expected_revision is null or p_expected_revision<0 or p_delete is null or jsonb_typeof(p_record) is distinct from 'object' or octet_length(p_record::text)>524288 then raise exception 'Invalid Whimsy command' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('muse.whimsy.'||uid::text,0));hash:=sha256(convert_to(jsonb_build_array(p_kind,p_expected_revision,p_record,p_delete)::text,'UTF8'));
 select * into receipt from public.whimsy_commands where user_id=uid and id=p_command_id;if found then if receipt.request_hash<>hash then raise exception 'Command reused' using errcode='22023';end if;return receipt.result;end if;
 execute format('select user_id,revision,payload from public.%I where id=$1 for update',t) into old_owner,v,old_payload using rid;
 if old_owner is not null and old_owner<>uid then raise exception 'Record unavailable' using errcode='42501';end if;
 if coalesce(v,0)<>p_expected_revision then raise exception 'Whimsy record changed' using errcode='40001';end if;
 if p_delete then
 -- Keep parent history explicit: no accidental deletion of dependent personal records.
 if p_kind='questWeeks' and exists(select 1 from public.whimsy_quest_completions where user_id=uid and week_id=rid) or p_kind='fortunes' and exists(select 1 from public.whimsy_saved_discoveries where user_id=uid and assignment_id=rid) then raise exception 'Delete dependent records explicitly first' using errcode='23503';end if;
 execute format('delete from public.%I where id=$1 and user_id=$2',t) using rid,uid;delete from public.whimsy_content_links where user_id=uid and kind=p_kind and record_id=rid;result:=jsonb_build_object('sourceId',rid,'revision',coalesce(v,0)+1,'deleted',true);
 else
 required:=case p_kind when 'questWeeks' then array['weekStart','timeZone','draws','selectedIds','swaps'] when 'questCompletions' then array['date','timeZone','weekId','quest','category','completedAt'] when 'tarot' then array['date','timeZone','readAt','deckId','spreadId','cards','reflection'] when 'meanings' then array['deckId','cardId','meaning'] when 'dreams' then array['date','timeZone','loggedAt','text','symbolIds','emotions','interpretation'] when 'fortunes' then array['date','timeZone','kind','content'] when 'saved' then array['date','timeZone','assignmentId','savedAt'] when 'books' then array['title','status','reviewEmojis'] when 'sessions' then array['date','timeZone','bookId','pages','activeSegments'] when 'goals' then array['period','start','end','target','unit'] when 'widgets' then array['experience','enabled'] end;
 if not body ?& required or exists(select 1 from jsonb_each(body) e where e.value='null'::jsonb) then raise exception 'Required Whimsy fields missing' using errcode='22023';end if;
 foreach field in array array['weekStart','timeZone','date','weekId','category','completedAt','readAt','deckId','spreadId','reflection','cardId','meaning','loggedAt','text','interpretation','kind','assignmentId','savedAt','title','status','author','bookId','period','start','end','unit','experience','startedOn','finishedOn','shownAt'] loop if body?field and jsonb_typeof(body->field)<>'string' then raise exception 'Invalid Whimsy field type' using errcode='22023';end if;end loop;
 if p_kind in ('questWeeks','questCompletions','tarot','dreams','fortunes','saved','sessions') then
 zone:=body->>'timeZone';if zone is null or not exists(select 1 from pg_timezone_names where name=zone) then raise exception 'Saved timezone required' using errcode='22023';end if;
 if coalesce(case when p_kind='questWeeks' then body->>'weekStart' else body->>'date' end,'') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Local date required' using errcode='22023';end if;
 day:=(case when p_kind='questWeeks' then body->>'weekStart' else body->>'date' end)::date;end if;
 if v is not null and p_kind='fortunes' and (old_payload->'content',old_payload->'kind',old_payload->'date',old_payload->'timeZone') is distinct from (body->'content',body->'kind',body->'date',body->'timeZone') then raise exception 'Daily assignment identity is immutable' using errcode='22023';end if;
 if v is not null and p_kind='questWeeks' and ((old_payload->>'weekStart',old_payload->>'timeZone') is distinct from (body->>'weekStart',body->>'timeZone') or not ((body->'draws') @> (old_payload->'draws')) or not ((body->'swaps') @> (old_payload->'swaps'))) then raise exception 'Preserve assigned week and draw history' using errcode='22023';end if;
 if p_kind='questWeeks' then
 if extract(isodow from day)<>1 or jsonb_typeof(body->'draws') is distinct from 'array' or jsonb_typeof(body->'selectedIds') is distinct from 'array' or jsonb_typeof(body->'swaps') is distinct from 'array' then raise exception 'Invalid quest week' using errcode='22023';end if;
 refs:=body->'draws';for segment in select value from jsonb_array_elements(body->'swaps') loop refs:=refs||jsonb_build_array(segment->'to');perform (segment->>'at')::timestamptz;end loop;exp:='side-quests';
 if exists(select 1 from jsonb_array_elements_text(body->'selectedIds') s where not exists(select 1 from jsonb_array_elements(body->'draws') d where d->>'contentId'=s)) then raise exception 'Selected quest not drawn' using errcode='22023';end if;
 elsif p_kind='questCompletions' then parent:=(body->>'weekId')::uuid;refs:=jsonb_build_array(body->'quest');exp:='side-quests';perform (body->>'completedAt')::timestamptz;
 if body->>'category' not in ('Cozy','Adventurous','Creative','Social','Chaos Goblin') or not exists(select 1 from public.whimsy_quest_weeks w where w.user_id=uid and w.id=parent and w.payload->'selectedIds' ? (body#>>'{quest,contentId}')) then raise exception 'Selected quest unavailable' using errcode='22023';end if;
 elsif p_kind='tarot' then
 if length(coalesce(body->>'deckId',''))=0 or length(coalesce(body->>'spreadId',''))=0 or jsonb_typeof(body->'cards') is distinct from 'array' or jsonb_array_length(body->'cards') not between 1 and 78 or jsonb_typeof(body->'reflection') is distinct from 'string' then raise exception 'Invalid reading' using errcode='22023';end if;perform (body->>'readAt')::timestamptz;
 for segment in select value from jsonb_array_elements(body->'cards') loop if segment->>'orientation' not in ('upright','reversed') or (segment->>'position')::integer<0 then raise exception 'Invalid drawn card' using errcode='22023';end if;refs:=refs||jsonb_build_array(segment->'card');end loop;exp:='tarot';
 elsif p_kind='meanings' then if jsonb_typeof(body->'meaning') is distinct from 'string' or length(coalesce(body->>'deckId',''))=0 then raise exception 'Invalid meaning' using errcode='22023';end if;refs:=jsonb_build_array(jsonb_build_object('contentId',body->>'cardId','version',coalesce((body->>'cardVersion')::integer,1)));exp:='tarot';
 elsif p_kind='dreams' then if jsonb_typeof(body->'text') is distinct from 'string' or jsonb_typeof(body->'interpretation') is distinct from 'string' or jsonb_typeof(body->'symbolIds') is distinct from 'array' or jsonb_typeof(body->'emotions') is distinct from 'array' or (body?'lucid' and jsonb_typeof(body->'lucid')<>'boolean') then raise exception 'Invalid dream' using errcode='22023';end if;perform (body->>'loggedAt')::timestamptz;
 elsif p_kind='fortunes' then if body->>'kind' not in ('cookie','oracle','prophecy','curiosity') then raise exception 'Invalid fortune kind' using errcode='22023';end if;refs:=jsonb_build_array(body->'content');exp:='fortunes';if body?'shownAt' then perform (body->>'shownAt')::timestamptz;end if;
 elsif p_kind='saved' then parent:=(body->>'assignmentId')::uuid;perform (body->>'savedAt')::timestamptz;
 elsif p_kind='books' then if jsonb_typeof(body->'title') is distinct from 'string' or length(coalesce(body->>'title','')) not between 1 and 500 or body->>'status' not in ('planned','reading','finished','paused') or jsonb_typeof(body->'reviewEmojis') is distinct from 'array' or jsonb_array_length(body->'reviewEmojis')>3 then raise exception 'Invalid book' using errcode='22023';end if;
 if body?'startedOn' then perform (body->>'startedOn')::date;end if;if body?'finishedOn' then perform (body->>'finishedOn')::date;end if;if body?'rating' and ((body->>'rating')::numeric<0 or (body->>'rating')::numeric in ('NaN'::numeric,'Infinity'::numeric)) then raise exception 'Invalid rating' using errcode='22023';end if;if body->>'finishedOn'<body->>'startedOn' then raise exception 'Book finish precedes start' using errcode='22023';end if;
 elsif p_kind='sessions' then parent:=(body->>'bookId')::uuid;if jsonb_typeof(body->'activeSegments') is distinct from 'array' or jsonb_array_length(body->'activeSegments')>200 or jsonb_typeof(body->'pages') is distinct from 'number' or (body->>'pages')::numeric<0 then raise exception 'Invalid reading session' using errcode='22023';end if;
 for segment in select value from jsonb_array_elements(body->'activeSegments') order by value->>'start' loop
 if coalesce(segment->>'start','') !~ 'Z$' or coalesce(segment->>'end','') !~ 'Z$' then raise exception 'UTC active intervals required' using errcode='22023';end if;started:=(segment->>'start')::timestamptz;ended:=(segment->>'end')::timestamptz;
 if ended<=started or ended-started>interval '24 hours' or started<previous_end then raise exception 'Invalid active interval' using errcode='22023';end if;
 if exists(select 1 from public.whimsy_reading_sessions r cross join lateral jsonb_array_elements(r.payload->'activeSegments') a where r.user_id=uid and r.id<>rid and (a->>'start')::timestamptz<ended and (a->>'end')::timestamptz>started) then raise exception 'Reading sessions overlap' using errcode='22023';end if;previous_end:=ended;end loop;
 elsif p_kind='goals' then if body->>'period' not in ('day','week','month','year') or body->>'unit' not in ('minutes','pages','books') or jsonb_typeof(body->'target') is distinct from 'number' or (body->>'target')::numeric<=0 or (body->>'end')::date<(body->>'start')::date then raise exception 'Invalid reading goal' using errcode='22023';end if;
 elsif p_kind='widgets' then if body->>'experience' not in ('side-quests','tarot','dreamscapes','fortunes','bookshelf') or jsonb_typeof(body->'enabled') is distinct from 'boolean' then raise exception 'Invalid widget preference' using errcode='22023';end if;end if;
 for ref in select value from jsonb_array_elements(refs) loop perform muse_private.whimsy_reference(ref,exp);end loop;
 if v is null then
 if p_kind='sessions' then insert into public.whimsy_reading_sessions(id,user_id,payload,activity_date,time_zone,book_id) values(rid,uid,body,day,zone,parent);
 elsif p_kind='questCompletions' then insert into public.whimsy_quest_completions(id,user_id,payload,activity_date,time_zone,week_id) values(rid,uid,body,day,zone,parent);
 elsif p_kind='saved' then insert into public.whimsy_saved_discoveries(id,user_id,payload,activity_date,time_zone,assignment_id) values(rid,uid,body,day,zone,parent);
 else execute format('insert into public.%I(id,user_id,payload,activity_date,time_zone) values($1,$2,$3,$4,$5)',t) using rid,uid,body,day,zone;end if;v:=1;
 else
 if p_kind='sessions' then update public.whimsy_reading_sessions set book_id=parent where id=rid and user_id=uid;elsif p_kind='questCompletions' then update public.whimsy_quest_completions set week_id=parent where id=rid and user_id=uid;elsif p_kind='saved' then update public.whimsy_saved_discoveries set assignment_id=parent where id=rid and user_id=uid;end if;
 execute format('update public.%I set payload=$1,activity_date=$2,time_zone=$3,revision=revision+1,updated_at=clock_timestamp() where id=$4 and user_id=$5 returning revision',t) into v using body,day,zone,rid,uid;end if;
 delete from public.whimsy_content_links where user_id=uid and kind=p_kind and record_id=rid;
 for ref in select value from jsonb_array_elements(refs) loop insert into public.whimsy_content_links values(uid,p_kind,rid,ref->>'contentId',(ref->>'version')::integer) on conflict do nothing;end loop;
 result:=jsonb_build_object('sourceId',rid,'revision',v,'deleted',false);
 end if;
 insert into public.whimsy_commands values(uid,p_command_id,hash,result);return result;
end $$;
