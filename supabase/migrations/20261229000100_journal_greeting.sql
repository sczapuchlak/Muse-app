-- Muse Journal: "Start with a companion greeting" (owner request, 2026-11-18). Additive. When on, pressing New entry
-- asks the companion for one opening message; opening Journal never does. Defaults to on.
alter table public.journal_preferences add column greet_on_new boolean not null default true;
