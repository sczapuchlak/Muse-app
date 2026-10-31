-- Ordered standalone priorities: one atomic owner-scoped revision-checked command.
-- Deferrable slots allow swaps without deleting/recreating historical identities.
alter table public.daily_priorities drop constraint daily_priorities_user_id_daily_record_id_position_key;
alter table public.daily_priorities add constraint daily_priority_slots unique(user_id,daily_record_id,position) deferrable initially immediate;
create function public.save_daily_priorities(p_date date,p_items jsonb,p_expected jsonb)
returns setof public.daily_priorities language plpgsql security invoker set search_path='' as $$
declare day public.daily_records; current_versions jsonb; item jsonb; entry public.daily_priorities; slot integer:=0;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)>3 or jsonb_typeof(p_expected) is distinct from 'array' then
    raise exception 'Choose up to three priorities' using errcode='22023';
  end if;
  day:=public.ensure_daily_record(p_date);
  perform 1 from public.daily_records where id=day.id and user_id=auth.uid() for update;
  perform 1 from public.daily_priorities where daily_record_id=day.id and user_id=auth.uid() for update;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'revision',revision) order by id),'[]') into current_versions from public.daily_priorities where daily_record_id=day.id and user_id=auth.uid();
  if current_versions is distinct from (select coalesce(jsonb_agg(value order by value->>'id'),'[]') from jsonb_array_elements(p_expected)) then
    raise exception 'Priorities changed; reload before saving' using errcode='40001';
  end if;
  if (select count(distinct value->>'id') from jsonb_array_elements(p_items))<>jsonb_array_length(p_items) then raise exception 'Priority IDs must be unique' using errcode='22023'; end if;
  set constraints public.daily_priority_slots deferred;
  delete from public.daily_priorities where daily_record_id=day.id and user_id=auth.uid() and id not in (select (value->>'id')::uuid from jsonb_array_elements(p_items));
  for item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item->'complete') is distinct from 'boolean' or jsonb_typeof(item->'text') is distinct from 'string' then raise exception 'Invalid priority' using errcode='22023'; end if;
    select * into entry from public.daily_priorities where id=(item->>'id')::uuid and daily_record_id=day.id and user_id=auth.uid();
    if entry.id is null then
      insert into public.daily_priorities(id,user_id,daily_record_id,text,position,standalone_complete) values((item->>'id')::uuid,auth.uid(),day.id,btrim(item->>'text'),slot,(item->>'complete')::boolean);
    else
      update public.daily_priorities set text=btrim(item->>'text'),position=slot,standalone_complete=(item->>'complete')::boolean
      where id=entry.id and user_id=auth.uid() and (text,position,standalone_complete) is distinct from (btrim(item->>'text'),slot,(item->>'complete')::boolean);
    end if;
    slot:=slot+1;
  end loop;
  return query select * from public.daily_priorities where daily_record_id=day.id and user_id=auth.uid() order by position;
end $$;
revoke all on function public.save_daily_priorities(date,jsonb,jsonb) from public,anon;
grant execute on function public.save_daily_priorities(date,jsonb,jsonb) to authenticated;
