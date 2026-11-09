-- Mindspace Lists (#12 follow-up): how a list lays out its sections. 0 = auto (as many columns as fit), or a fixed
-- 1, 2 or 3 columns. Additive; existing lists start on auto.
alter table public.lists add column section_columns smallint not null default 0 check (section_columns between 0 and 3);
