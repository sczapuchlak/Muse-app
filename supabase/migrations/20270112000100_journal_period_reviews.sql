-- Journal: monthly and yearly Life Reviews alongside the weekly reflection. Additive.
--  * journal_reports gains a period ('week' | 'month' | 'year'); week_start keeps its name and holds the period's first
--    day (a Monday, the 1st of a month, or January 1). One saved review per person, period and start. Every existing
--    row is a weekly reflection and keeps working unchanged.
--  * Earlier versions keep their period too.
--  * journal_entry_excerpts: the start of each entry's own words (the person's messages only), bounded, so a long
--    review reads short excerpts without downloading whole conversations. Runs as the caller (RLS applies).
alter table public.journal_reports add column period text not null default 'week' check (period in ('week','month','year'));
alter table public.journal_reports drop constraint if exists journal_reports_user_id_week_start_key;
alter table public.journal_reports add constraint journal_reports_user_period_start_key unique (user_id, period, week_start);
alter table public.journal_reports add constraint journal_reports_period_start_check check (
 (period = 'week' and extract(isodow from week_start) = 1) or (period = 'month' and extract(day from week_start) = 1)
 or (period = 'year' and extract(month from week_start) = 1 and extract(day from week_start) = 1));

alter table public.journal_report_versions add column period text not null default 'week' check (period in ('week','month','year'));
create or replace function muse_private.journal_report_keep_version() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.data is distinct from old.data then
  insert into public.journal_report_versions (user_id, report_id, period, week_start, data, source_ids, source_signature, model, revision, written_at)
  values (old.user_id, old.id, old.period, old.week_start, old.data, old.source_ids, old.source_signature, old.model, old.revision, old.updated_at);
 end if;
 return new;
end $$;
revoke all on function muse_private.journal_report_keep_version() from public, anon, authenticated;

create function public.journal_entry_excerpts(p_ids uuid[], p_chars integer default 600)
returns table (conversation_id uuid, excerpt text, chars integer)
language sql stable security invoker set search_path='' as $$
 select m.conversation_id, left(string_agg(btrim(m.body), E'\n' order by m.created_at), least(greatest(coalesce(p_chars,600),80),4000)), sum(char_length(m.body))::integer
 from public.journal_messages m
 where m.user_id=(select auth.uid()) and m.role='user' and m.conversation_id = any(p_ids[1:3000])
 group by m.conversation_id
$$;
revoke all on function public.journal_entry_excerpts(uuid[],integer) from public, anon;
grant execute on function public.journal_entry_excerpts(uuid[],integer) to authenticated, service_role;
