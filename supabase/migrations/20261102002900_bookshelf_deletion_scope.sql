-- Narrow deletion to this book and its own sessions on already migrated local databases.
create or replace function public.delete_whimsy_book(p_book_id uuid,p_expected_revision bigint,p_command_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
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

