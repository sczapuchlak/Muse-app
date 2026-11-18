-- Money: paychecks are planned by category (and optional subcategory); planning groups are retired from the app; categories can be deleted.
--
-- Approved 2026-11-17: planning groups duplicated categories ("I would just use the same planning groups as
-- categories"). A planned amount or template row no longer needs a planning group. Existing groups and each row's
-- group stay stored, unchanged and never deleted (save_money still preserves them); the app shows a row's old group
-- name only until it has a category.
alter table public.allocations alter column allocation_group_id drop not null;
alter table public.paycheck_template_allocations alter column allocation_group_id drop not null;

-- Carry existing plans over: a row with a group but no category gets the category whose name is the group's name, or
-- failing that the one subcategory whose name is, or starts with, the group's name ("Bilt" → "Bilt Card"). Anything
-- ambiguous or unmatched is left for the person to choose.
create function pg_temp.money_match(p_user uuid, p_group uuid, out category uuid, out subcategory uuid) language plpgsql as $$
declare g text; n integer;
begin
  select lower(btrim(name)) into g from public.allocation_groups where id = p_group and user_id = p_user;
  if g is null then return; end if;
  select count(*) into n from public.money_categories where user_id = p_user and lower(btrim(name)) = g;
  if n = 1 then select id into category from public.money_categories where user_id = p_user and lower(btrim(name)) = g; return; end if;
  select count(*) into n from public.money_subcategories where user_id = p_user and (lower(btrim(name)) = g or starts_with(lower(btrim(name)), g || ' '));
  if n = 1 then select category_id, id into category, subcategory from public.money_subcategories where user_id = p_user and (lower(btrim(name)) = g or starts_with(lower(btrim(name)), g || ' ')); end if;
end $$;

do $$
declare r record; m record; touched uuid[] := '{}';
begin
  for r in select id, user_id, allocation_group_id from public.allocations where category_id is null and allocation_group_id is not null loop
    select * into m from pg_temp.money_match(r.user_id, r.allocation_group_id);
    if m.category is not null then
      update public.allocations set category_id = m.category, subcategory_id = m.subcategory where id = r.id;
      touched := touched || r.user_id;
    end if;
  end loop;
  for r in select user_id, template_id, position, allocation_group_id from public.paycheck_template_allocations where category_id is null and allocation_group_id is not null loop
    select * into m from pg_temp.money_match(r.user_id, r.allocation_group_id);
    if m.category is not null then
      update public.paycheck_template_allocations set category_id = m.category, subcategory_id = m.subcategory where user_id = r.user_id and template_id = r.template_id and position = r.position;
      touched := touched || r.user_id;
    end if;
  end loop;
  -- Open Money tabs hold the old state; a new revision makes them reload before they save over the carried-over plans.
  update public.money_versions set revision = revision + 1 where user_id = any(touched);
end $$;

-- Categories can be deleted (approved 2026-11-17: "there is no way to delete a group or category or subcategory").
-- save_money used to refuse any category missing from the saved state; now a missing category is recorded in
-- money_deleted_ids (so it can't come back from a stale tab) and deleted with its subcategories. The app clears every
-- reference to it in the same save (planned amounts, template rows, purchases, splits, bills, recurring payments); those
-- foreign keys are deferred, so the save commits only if nothing still points at it. Subcategories could already be
-- removed. Only this one block of the live function changes; the patch stops if it doesn't find it exactly once.
do $patch$
declare src text; before text; after text; n integer;
begin
  src := pg_get_functiondef('public.save_money(bigint,uuid,jsonb)'::regprocedure);
  before := $b$ if exists(select 1 from public.money_categories where user_id=uid and id not in(select (value->>'id')::uuid from jsonb_array_elements(p_state->'categories'))) then
 raise exception 'Preserve existing Money definitions; use the supported archive/status actions' using errcode='22023';
 end if;$b$;
  after := $a$ if exists(select 1 from public.money_categories where user_id=uid and id not in(select (value->>'id')::uuid from jsonb_array_elements(p_state->'categories'))) then
 insert into public.money_deleted_ids(user_id,collection,id) select uid,'categories',id from public.money_categories where user_id=uid and id not in(select (value->>'id')::uuid from jsonb_array_elements(p_state->'categories')) on conflict do nothing;
 delete from public.money_subcategories where user_id=uid and category_id not in(select (value->>'id')::uuid from jsonb_array_elements(p_state->'categories'));
 delete from public.money_categories where user_id=uid and id not in(select (value->>'id')::uuid from jsonb_array_elements(p_state->'categories'));
 end if;$a$;
  n := (length(src) - length(replace(src, before, ''))) / length(before);
  if n <> 1 then raise exception 'save_money changed shape: expected the category guard once, found %', n; end if;
  execute replace(src, before, after);
end $patch$;
