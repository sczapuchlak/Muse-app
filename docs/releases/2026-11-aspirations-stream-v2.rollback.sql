-- Rollback for the November 2026 release: 20261116000100_stream_v2, 20261115000100_aspiration_renewals,
-- 20261114000100_aspirations (newest first). Restores production's pre-release definitions exactly as captured from
-- production on 2026-11-06. Run only with explicit approval, in one transaction, after taking the pre-release dump.
--
-- It refuses (and changes nothing) if anyone has already created aspirations, aspiration posts or resolved reports, so a
-- rollback can never silently delete someone's data. In that case, keep the release and fix forward instead.
begin;

do $$begin
 if exists (select 1 from public.stream_posts where source_kind = 'aspiration') then raise exception 'Rollback refused: aspiration posts exist'; end if;
 if exists (select 1 from public.stream_reports where resolved_at is not null) then raise exception 'Rollback refused: resolved reports exist'; end if;
 if exists (select 1 from public.aspirations) or exists (select 1 from public.aspiration_updates) then raise exception 'Rollback refused: aspirations exist'; end if;
end $$;

-- 20261116000100_stream_v2 --------------------------------------------------------------------------------------------
drop function public.stream_report_resolve(uuid, text, text);
drop function public.stream_reports_review(boolean);
alter table public.stream_reports drop constraint stream_reports_resolved, drop column resolved_at, drop column resolution, drop column resolution_note;
drop trigger stream_source_deleted on public.aspirations;
create or replace function muse_private.stream_source_exists(owner uuid, kind text, source text) returns boolean language sql stable security definer set search_path = '' as $$
 select case kind
  when 'mood' then exists (select 1 from public.mood_checkins where user_id = owner and id::text = source)
  when 'dream' then exists (select 1 from public.whimsy_dream_entries where user_id = owner and id::text = source)
  when 'tarot-reading' then exists (select 1 from public.whimsy_tarot_readings where user_id = owner and id::text = source)
  when 'fortune' then exists (select 1 from public.whimsy_saved_discoveries where user_id = owner and id::text = source)
  when 'astrology' then exists (select 1 from public.astrology_natal_charts where user_id = owner and id::text = source)
  when 'money-milestone' then exists (select 1 from public.bills where user_id = owner and id::text = source and paid)
   or exists (select 1 from public.cards where user_id = owner and id::text = source)
  else muse_private.showcase_source_exists(owner, kind, source) end;
$$;
alter table public.stream_posts drop constraint stream_posts_source_kind, drop constraint stream_posts_category_source;
alter table public.stream_posts add constraint stream_posts_source_kind_check check (((source_kind IS NULL) OR (source_kind = ANY (ARRAY['book'::text, 'media'::text, 'mood'::text, 'dream'::text, 'tarot-reading'::text, 'ritual'::text, 'side-quest'::text, 'fortune'::text, 'astrology'::text, 'money-milestone'::text]))));
alter table public.stream_posts add constraint stream_posts_check1 check (((kind = 'status'::text) OR (((((((((((((((category = 'reading'::text) AND (source_kind = 'book'::text)) OR ((category = 'watching'::text) AND (source_kind = 'media'::text))) OR ((category = 'feeling'::text) AND (source_kind = 'mood'::text))) OR ((category = 'dreaming'::text) AND (source_kind = 'dream'::text))) OR ((category = 'celebrating'::text) AND (source_kind = 'book'::text))) OR ((category = 'celebrating'::text) AND (source_kind = 'ritual'::text))) OR ((category = 'celebrating'::text) AND (source_kind = 'side-quest'::text))) OR ((category = 'tarot'::text) AND (source_kind = 'tarot-reading'::text))) OR ((category = 'side-quests'::text) AND (source_kind = 'side-quest'::text))) OR ((category = 'rituals'::text) AND (source_kind = 'ritual'::text))) OR ((category = 'fortunes'::text) AND (source_kind = 'fortune'::text))) OR ((category = 'astrology'::text) AND (source_kind = 'astrology'::text))) OR ((category = 'money'::text) AND (source_kind = 'money-milestone'::text))) OR ((category = 'celebrating'::text) AND (source_kind = 'money-milestone'::text)))));
delete from supabase_migrations.schema_migrations where version = '20261116000100';

-- 20261115000100_aspiration_renewals ------------------------------------------------------------------------------------
drop trigger aspiration_renewal_owner on public.aspirations;
drop function muse_private.aspiration_renewal_owner();
alter table public.aspirations drop constraint aspirations_not_self_renewal, drop column renewed_from;
delete from supabase_migrations.schema_migrations where version = '20261115000100';

-- 20261114000100_aspirations --------------------------------------------------------------------------------------------
drop table public.aspiration_updates;
drop table public.aspirations;
drop function muse_private.aspiration_update_owner();
delete from supabase_migrations.schema_migrations where version = '20261114000100';

commit;
