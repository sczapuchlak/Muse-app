-- Journal: Weekly Reflection V2 (editorial upgrade). Additive.
--  * A full weekly report (review, themes, insights, wins, closing) can be longer than the original 60 KB cap.
--  * Writing a reflection again keeps the earlier one: before a report's words change, the old version is copied to
--    journal_report_versions (append-only, owner-readable, deletable with the account). Nothing is regenerated
--    automatically; this only preserves what a deliberate "Write it again" / "Update reflection" replaces.
alter table public.journal_reports drop constraint if exists journal_reports_data_check;
alter table public.journal_reports add constraint journal_reports_data_check check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 200000);

create table public.journal_report_versions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users on delete cascade,
 report_id uuid not null,
 week_start date not null,
 data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 200000),
 source_ids uuid[] not null default '{}',
 source_signature text not null default '',
 model text,
 revision bigint not null,
 written_at timestamptz not null,
 created_at timestamptz not null default now()
);
create index journal_report_versions_by_week on public.journal_report_versions (user_id, week_start, written_at desc);

alter table public.journal_report_versions enable row level security;
revoke all on public.journal_report_versions from public, anon, authenticated;
grant select, delete on public.journal_report_versions to authenticated;
grant select, insert, update, delete on public.journal_report_versions to service_role;
create policy owner_read on public.journal_report_versions for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_delete on public.journal_report_versions for delete to authenticated using ((select auth.uid()) = user_id);

-- Security definer: browsers can't insert versions directly; only this trigger does, for the same owner's report.
create function muse_private.journal_report_keep_version() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.data is distinct from old.data then
  insert into public.journal_report_versions (user_id, report_id, week_start, data, source_ids, source_signature, model, revision, written_at)
  values (old.user_id, old.id, old.week_start, old.data, old.source_ids, old.source_signature, old.model, old.revision, old.updated_at);
 end if;
 return new;
end $$;
revoke all on function muse_private.journal_report_keep_version() from public, anon, authenticated;
create trigger keep_journal_report_version before update on public.journal_reports for each row execute function muse_private.journal_report_keep_version();
