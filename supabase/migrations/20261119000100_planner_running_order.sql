-- Planner 2.0 Running List (#81): the person's own manual order for the Running List. It is separate from task
-- `position` (which orders tasks within a planned day on the Scheduled Board), so reordering the Running List never
-- changes a planned date, completion history or the board's day order. Holds task ids only; additive, owner-only.
create table public.planner_running_orders (
 user_id uuid primary key default auth.uid() references auth.users on delete cascade,
 task_ids jsonb not null default '[]' check (jsonb_typeof(task_ids) = 'array' and jsonb_array_length(task_ids) <= 5000),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create trigger touch_planner_running_order before update on public.planner_running_orders for each row execute function muse_private.touch_collection_record();
alter table public.planner_running_orders enable row level security;
revoke all on public.planner_running_orders from public, anon, authenticated;
grant select, insert, update, delete on public.planner_running_orders to authenticated, service_role;
create policy owner_read on public.planner_running_orders for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.planner_running_orders for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.planner_running_orders for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.planner_running_orders for delete to authenticated using ((select auth.uid()) = user_id);
