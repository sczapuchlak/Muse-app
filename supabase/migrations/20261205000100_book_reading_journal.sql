-- Book-owned quotes and thoughts. Existing notes, reviews, reads and sessions stay unchanged.
create table public.book_journal_entries (
 id uuid primary key,
 user_id uuid not null references auth.users on delete cascade,
 book_id uuid not null,
 book_title_snapshot text not null check (length(btrim(book_title_snapshot)) between 1 and 500),
 kind text not null check (kind in ('quote','thought')),
 body text not null check (length(btrim(body)) between 1 and 10000),
 personal_note text not null default '' check (length(personal_note)<=5000),
 page_label text not null default '' check (length(page_label)<=100),
 chapter text not null default '' check (length(chapter)<=200),
 saved_on date not null,
 cycle_id text,
 session_id uuid,
 revision bigint not null default 1 check (revision>0),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(user_id,id),
 foreign key(user_id,book_id) references public.whimsy_books(user_id,id) on delete cascade,
 foreign key(user_id,session_id) references public.whimsy_reading_sessions(user_id,id) on delete set null (session_id)
);
create index book_journal_owner_book_date on public.book_journal_entries(user_id,book_id,saved_on desc,created_at desc);
create index book_journal_owner_cycle on public.book_journal_entries(user_id,book_id,cycle_id) where cycle_id is not null;
create function muse_private.validate_book_journal_session() returns trigger language plpgsql set search_path='' as $$begin
 if new.session_id is not null and not exists(select 1 from public.whimsy_reading_sessions s where s.user_id=new.user_id and s.book_id=new.book_id and s.id=new.session_id) then
  raise exception 'Session must belong to the same book' using errcode='23503';
 end if;
 return new;
end$$;
create trigger validate_book_journal_session before insert or update of user_id,book_id,session_id on public.book_journal_entries for each row execute function muse_private.validate_book_journal_session();
alter table public.book_journal_entries enable row level security;
revoke all on public.book_journal_entries from public,anon,authenticated;
grant select,insert,update,delete on public.book_journal_entries to authenticated;
grant select,insert,update,delete on public.book_journal_entries to service_role;
create policy book_journal_select on public.book_journal_entries for select to authenticated using ((select auth.uid())=user_id);
create policy book_journal_insert on public.book_journal_entries for insert to authenticated with check ((select auth.uid())=user_id);
create policy book_journal_update on public.book_journal_entries for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy book_journal_delete on public.book_journal_entries for delete to authenticated using ((select auth.uid())=user_id);
create function muse_private.touch_book_journal() returns trigger language plpgsql set search_path='' as $$begin
 new.revision:=old.revision+1;new.updated_at:=clock_timestamp();return new;
end$$;
create trigger touch_book_journal before update on public.book_journal_entries for each row execute function muse_private.touch_book_journal();

-- Discard the unsaved timer and conditionally restore an automatic reading-status change in one transaction.
-- A later book edit or saved session wins; neither is rewritten by a stale discard.
create function public.discard_reading_timer(p_expected_revision bigint,p_command_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();t public.whimsy_reading_timers;b public.whimsy_books;meta jsonb;receipt public.whimsy_commands;hash bytea;result jsonb;restored boolean:=false;prior jsonb;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_expected_revision is null or p_expected_revision<1 or p_command_id is null then raise exception 'Invalid timer discard' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('muse.whimsy.'||uid::text,0));
 hash:=sha256(convert_to(jsonb_build_array('discardReadingTimer',p_expected_revision)::text,'UTF8'));
 select * into receipt from public.whimsy_commands where user_id=uid and id=p_command_id;
 if found then if receipt.request_hash<>hash then raise exception 'Command reused' using errcode='22023';end if;return receipt.result;end if;
 select * into t from public.whimsy_reading_timers where user_id=uid for update;
 if t.user_id is null or t.revision<>p_expected_revision then raise exception 'Reading timer changed elsewhere' using errcode='40001';end if;
 meta:=t.payload->'autoStatus';
 if jsonb_typeof(meta)='object' and meta->>'previous' in ('planned','finished') and meta ? 'bookRevision' then
  select * into b from public.whimsy_books where user_id=uid and id=t.book_id for update;
  if b.user_id is not null and b.revision=(meta->>'bookRevision')::bigint and b.payload->>'status'='reading'
    and b.payload->>'cycleId'=t.payload->>'cycleId'
    and not exists(select 1 from public.whimsy_reading_sessions s where s.user_id=uid and s.book_id=t.book_id and s.payload->>'cycleId'=t.payload->>'cycleId') then
   prior:=jsonb_build_object('status',meta->>'previous');
   if meta ? 'startedOn' then prior:=prior||jsonb_build_object('startedOn',meta->'startedOn');end if;
   if meta ? 'finishedOn' then prior:=prior||jsonb_build_object('finishedOn',meta->'finishedOn');end if;
   if meta ? 'cycleId' then prior:=prior||jsonb_build_object('cycleId',meta->'cycleId');end if;
   update public.whimsy_books set payload=(payload-'status'-'startedOn'-'finishedOn'-'cycleId')||prior,revision=revision+1,updated_at=clock_timestamp() where user_id=uid and id=b.id;
   restored:=true;
  end if;
 end if;
 delete from public.whimsy_reading_timers where user_id=uid;
 result:=jsonb_build_object('deleted',true,'restored',restored,'bookId',t.book_id);
 insert into public.whimsy_commands values(uid,p_command_id,hash,result);return result;
end$$;
revoke all on function public.discard_reading_timer(bigint,uuid) from public,anon;
grant execute on function public.discard_reading_timer(bigint,uuid) to authenticated;

-- The first timer on a planned book and the first timer of a reread open the read together.
-- If either write fails, neither the status change nor the timer is committed.
create function public.start_book_reading_timer(p_book_record jsonb,p_expected_book_revision bigint,p_timer_payload jsonb,p_command_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();book_id uuid;receipt public.whimsy_commands;hash bytea;book_result jsonb;timer_result jsonb;result jsonb;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_book_record is null or p_timer_payload is null or p_expected_book_revision is null or p_expected_book_revision<1 or p_command_id is null then raise exception 'Invalid reading start' using errcode='22023';end if;
 book_id:=(p_book_record->>'id')::uuid;
 if book_id is null or p_book_record->>'status' is distinct from 'reading' or p_timer_payload->>'bookId' is distinct from book_id::text
    or p_book_record->>'cycleId' is distinct from p_timer_payload->>'cycleId'
    or p_timer_payload->'autoStatus'->>'bookRevision' is distinct from (p_expected_book_revision+1)::text
    or coalesce(p_timer_payload->'autoStatus'->>'previous','') not in ('planned','finished') then raise exception 'Reading start does not match book' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('muse.whimsy.'||uid::text,0));
 hash:=sha256(convert_to(jsonb_build_array('startBookReadingTimer',p_book_record,p_expected_book_revision,p_timer_payload)::text,'UTF8'));
 select * into receipt from public.whimsy_commands where user_id=uid and id=p_command_id;
 if found then if receipt.request_hash<>hash then raise exception 'Command reused' using errcode='22023';end if;return receipt.result;end if;
 if not exists(select 1 from public.whimsy_books where user_id=uid and id=book_id and revision=p_expected_book_revision and payload->>'status'=p_timer_payload->'autoStatus'->>'previous') then raise exception 'Book changed elsewhere' using errcode='40001';end if;
 book_result:=public.save_whimsy_record('books',p_expected_book_revision,gen_random_uuid(),p_book_record,false);
 timer_result:=public.save_reading_timer(0,gen_random_uuid(),p_timer_payload);
 result:=jsonb_build_object('bookRevision',book_result->'revision','timerRevision',timer_result->'revision');
 insert into public.whimsy_commands values(uid,p_command_id,hash,result);return result;
end$$;
revoke all on function public.start_book_reading_timer(jsonb,bigint,jsonb,uuid) from public,anon;
grant execute on function public.start_book_reading_timer(jsonb,bigint,jsonb,uuid) to authenticated;

-- A countdown is only a target on the existing recoverable timer; saved sessions still store actual segments.
alter table public.whimsy_reading_timers add constraint reading_timer_target_minutes_valid check (
 case when payload ? 'targetMinutes' then
  jsonb_typeof(payload->'targetMinutes')='number' and (payload->>'targetMinutes')::numeric between 1 and 720
  and (payload->>'targetMinutes')::numeric=trunc((payload->>'targetMinutes')::numeric)
 else true end
);
