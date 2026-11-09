-- Mindspace Lists (#12 follow-up): how a list lays out its sections. 0 = auto (as many columns as fit), or a fixed
-- 1, 2 or 3 columns. Plus how All items is grouped and sorted (display only; stored positions never change).
-- Additive; existing lists start on auto columns, grouped by section, in their own order.
alter table public.lists add column section_columns smallint not null default 0 check (section_columns between 0 and 3);
alter table public.lists
  add column item_group text not null default 'section' check (item_group in ('section', 'frequency', 'none')),
  add column item_sort text not null default 'manual' check (item_sort in ('manual', 'frequency', 'due', 'name'));
