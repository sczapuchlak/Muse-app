-- READ-ONLY hosted reading-tracker check. Paste into the Supabase SQL Editor for the production project and Run.
-- It changes nothing and returns no titles, notes or other reading content: only schema facts and counts.
-- Every row should show ok = true, except "paged reads migration", which is false until that migration is applied.

with checks(item, ok, detail) as (
  select 'bookshelf foundation migration', exists(select 1 from supabase_migrations.schema_migrations where version='20261101001600'), 'whimsy_foundation'
  union all select 'timer + goals migration', exists(select 1 from supabase_migrations.schema_migrations where version='20261102002800'), 'bookshelf_timer_and_goals'
  union all select 'deletion scope migration', exists(select 1 from supabase_migrations.schema_migrations where version='20261102002900'), 'bookshelf_deletion_scope'
  union all select 'timer precedence migration', exists(select 1 from supabase_migrations.schema_migrations where version='20261102003000'), 'bookshelf_timer_precedence'
  union all select 'paged reads migration', exists(select 1 from supabase_migrations.schema_migrations where version='20261105000100'), 'whimsy_paged_reads (new; apply after approval)'
  union all select 'books table', to_regclass('public.whimsy_books') is not null, 'whimsy_books'
  union all select 'sessions table', to_regclass('public.whimsy_reading_sessions') is not null, 'whimsy_reading_sessions'
  union all select 'timer table (server-side timer)', to_regclass('public.whimsy_reading_timers') is not null, 'whimsy_reading_timers'
  union all select 'goals table', to_regclass('public.whimsy_reading_goals') is not null, 'whimsy_reading_goals'
  union all select 'row level security on sessions', coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.whimsy_reading_sessions')),false), 'owner-only access'
  union all select 'row level security on timers', coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.whimsy_reading_timers')),false), 'owner-only access'
  union all select 'save function', to_regprocedure('public.save_whimsy_record(text,bigint,uuid,jsonb,boolean)') is not null, 'save_whimsy_record'
  union all select 'timer save function', to_regprocedure('public.save_reading_timer(bigint,uuid,jsonb)') is not null, 'save_reading_timer'
  union all select 'paged read function', to_regprocedure('public.read_whimsy_page(text,timestamptz,uuid,integer)') is not null, 'present after the new migration'
)
select item, ok, detail from checks
union all
-- Aggregate counts only (all accounts in this project). Compare with what Muse shows you.
select 'count: books', true, (select count(*)::text from public.whimsy_books)
union all select 'count: reading sessions', true, (select count(*)::text from public.whimsy_reading_sessions)
union all select 'count: open timers', true, (select count(*)::text from public.whimsy_reading_timers)
union all select 'count: all Whimsy records (old ceiling is 5,000 per account)', true,
  (select max(n)::text from (select user_id, count(*) n from (
     select user_id from public.whimsy_books union all select user_id from public.whimsy_reading_sessions
     union all select user_id from public.whimsy_reading_goals union all select user_id from public.whimsy_quest_weeks
     union all select user_id from public.whimsy_quest_completions union all select user_id from public.whimsy_tarot_readings
     union all select user_id from public.whimsy_card_meanings union all select user_id from public.whimsy_dream_entries
     union all select user_id from public.whimsy_fortune_assignments union all select user_id from public.whimsy_saved_discoveries
     union all select user_id from public.whimsy_widget_preferences) r group by user_id) per_owner);
