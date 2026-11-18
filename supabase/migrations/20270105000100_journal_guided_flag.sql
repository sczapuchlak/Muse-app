-- Journal: guided prompts belong to a journal. A journal's one guide configuration stays in journal_guides (linked by
-- default_guide_id); `guided` turns it on or off without deleting the questions. Journals that already pointed at a
-- guide keep using it. Nothing is deleted: standalone guides from before simply aren't offered anywhere.
alter table public.journal_journals add column guided boolean not null default false;
update public.journal_journals set guided = true where default_guide_id is not null;
