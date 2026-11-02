-- Keep table-specific identity checks separate: meanings has no id column.
create or replace function muse_private.bump_dream_revision() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.user_id <> old.user_id then
  raise exception 'Dream ownership cannot change' using errcode='42501';
 end if;
 if tg_table_name = 'whimsy_dream_symbol_meanings' then
  if new.symbol_id <> old.symbol_id then
   raise exception 'Dream symbol identity cannot change' using errcode='42501';
  end if;
 elsif tg_table_name = 'whimsy_dream_series' then
  if new.id <> old.id then
   raise exception 'Dream series identity cannot change' using errcode='42501';
  end if;
 end if;
 if new.revision <> old.revision then
  raise exception 'Revision is database managed' using errcode='22023';
 end if;
 new.revision := old.revision + 1;
 new.updated_at := clock_timestamp();
 return new;
end $$;
