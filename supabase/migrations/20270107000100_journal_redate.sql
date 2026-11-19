-- Journal: move an entry to the day (and time) it belongs to. Additive: one function, no new columns.
-- A late-night entry that runs past midnight, or one finished days later, belongs to the day it was written for. The
-- entry and its own words move together, so History, the calendar and the streak agree; every message keeps its real
-- created_at, so when the words were actually written is never rewritten.
create or replace function public.redate_journal_entry(p_id uuid, p_local_date date, p_started_at timestamptz, p_expected_revision bigint)
returns setof public.journal_conversations
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();c public.journal_conversations;today date;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into c from public.journal_conversations where id=p_id and user_id=uid for update;
 if not found then raise exception 'Entry unavailable' using errcode='42501'; end if;
 if p_expected_revision is not null and c.revision<>p_expected_revision then
  raise exception 'This entry changed on another device. Reload and try again.' using errcode='22023';
 end if;
 today:=(now() at time zone c.time_zone)::date;
 if p_local_date is null or p_local_date<date '1900-01-01' or p_local_date>today then
  raise exception 'Choose today or a day that has already happened' using errcode='22023';
 end if;
 if p_started_at is not null and p_started_at>now()+interval '5 minutes' then
  raise exception 'Choose a time that has already happened' using errcode='22023';
 end if;
 update public.journal_messages set local_date=p_local_date where conversation_id=c.id and user_id=uid and local_date<>p_local_date;
 return query update public.journal_conversations set local_date=p_local_date, started_at=coalesce(p_started_at,started_at)
  where id=c.id and user_id=uid returning *;
end $$;
revoke all on function public.redate_journal_entry(uuid,date,timestamptz,bigint) from public, anon;
grant execute on function public.redate_journal_entry(uuid,date,timestamptz,bigint) to authenticated;
