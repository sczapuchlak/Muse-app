-- Mindspace Lists (Nov 25): a section may carry a short description under its name (sections already have an icon
-- and an accent). Additive and nullable: existing sections are unchanged; copies and templates carry it like the title.
alter table public.list_sections
  add column description text check (description is null or char_length(description) <= 200);
