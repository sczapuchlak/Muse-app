-- One book's reading saved in one transaction: the book (for example with a new finished read), the reading sessions
-- recorded with it, and optionally clearing the live timer whose sitting is being saved. Logging several sessions at
-- once passes no book record. Additive only: no tables, columns or existing rows change. The existing writers stay
-- the sole validators (ownership, revisions, dates, pages, active intervals, session overlap, idempotent command
-- receipts); this function only runs them together, so a failure anywhere leaves nothing behind.
create function public.save_book_reading(p_book_id uuid,p_book jsonb,p_expected_revision bigint,p_command_id uuid,p_sessions jsonb default '[]'::jsonb,p_timer jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();item jsonb;book_receipt jsonb;session_receipts jsonb:='[]'::jsonb;timer_receipt jsonb;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_book_id is null or jsonb_typeof(p_sessions) is distinct from 'array' or jsonb_array_length(p_sessions)>500
  or (p_book is not null and (jsonb_typeof(p_book)<>'object' or (p_book->>'id')::uuid is distinct from p_book_id or p_expected_revision is null or p_command_id is null))
  or (p_timer is not null and (jsonb_typeof(p_timer)<>'object' or not p_timer ?& array['expectedRevision','commandId']))
  or (p_book is null and jsonb_array_length(p_sessions)=0 and p_timer is null) then
  raise exception 'Invalid book reading command' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('muse.whimsy.'||uid::text,0));
 if p_book is null and not exists(select 1 from public.whimsy_books b where b.id=p_book_id and b.user_id=uid) then
  raise exception 'Record unavailable' using errcode='42501';end if;
 -- Only the timer of this book's sitting may be cleared here.
 if p_timer is not null and exists(select 1 from public.whimsy_reading_timers t where t.user_id=uid and t.book_id<>p_book_id) then
  raise exception 'The open reading timer belongs to another book' using errcode='22023';end if;
 if p_book is not null then book_receipt:=public.save_whimsy_record('books',p_expected_revision,p_command_id,p_book,false);end if;
 for item in select value from jsonb_array_elements(p_sessions) loop
  if jsonb_typeof(item) is distinct from 'object' or not item ?& array['record','expectedRevision','commandId'] or (item->'record'->>'bookId')::uuid is distinct from p_book_id then
   raise exception 'Every session must belong to this book' using errcode='22023';end if;
  session_receipts:=session_receipts||jsonb_build_array(public.save_whimsy_record('sessions',(item->>'expectedRevision')::bigint,(item->>'commandId')::uuid,item->'record',false));
 end loop;
 if p_timer is not null then timer_receipt:=public.save_reading_timer((p_timer->>'expectedRevision')::bigint,(p_timer->>'commandId')::uuid,null);end if;
 return jsonb_build_object('bookId',p_book_id,'book',book_receipt,'sessions',session_receipts,'timer',timer_receipt);
end $$;
revoke all on function public.save_book_reading(uuid,jsonb,bigint,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.save_book_reading(uuid,jsonb,bigint,uuid,jsonb,jsonb) to authenticated;
