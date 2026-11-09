-- #112 Future Log as a curated view: an entry is either standalone (as before) or a reference to a record that lives
-- elsewhere in Muse (a Planner task or event, an Aspiration or one of its milestones, a Bucket List dream).
-- A reference keeps only the source's kind and id plus the title it had when added (a name snapshot for when the
-- source is gone); everything else is read from the source. References never have their own done state, and one
-- record can be in the Future Log once. Removing a reference never touches the source. Additive and nullable:
-- existing entries are unchanged and stay standalone.
alter table public.future_log_entries
 add column source_kind text check (source_kind in ('task', 'event', 'aspiration', 'milestone', 'bucket')),
 add column source_id text check (source_id is null or char_length(source_id) between 1 and 120),
 add constraint future_log_entries_source check ((source_kind is null) = (source_id is null)),
 add constraint future_log_entries_reference_not_done check (source_kind is null or done = false);
create unique index future_log_entries_one_reference on public.future_log_entries(user_id, source_kind, source_id) where source_kind is not null;
