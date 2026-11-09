-- Future Log ranges (#12): an optional last day so a trip or vacation is one entry covering several days. Additive and
-- nullable — existing entries are unchanged (single day or month-only). The range belongs to its start month and may
-- run into the next month(s) (up to a year). Entries stay their own records; nothing becomes an event or task.
alter table public.future_log_entries
  add column end_date date,
  add constraint future_log_entries_end_date check (end_date is null or (local_date is not null and end_date > local_date and end_date <= local_date + 366));
