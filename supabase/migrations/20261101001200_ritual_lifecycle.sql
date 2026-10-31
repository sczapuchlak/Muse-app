-- Lifecycle is dated separately from measurement settings and observations.
alter table public.rituals add column lifecycle_status text not null default 'active' check(lifecycle_status in ('active','paused','archived'));
create table public.ritual_inactive_periods(user_id uuid not null references auth.users on delete cascade,ritual_id uuid not null,starts_on date not null,ends_before date,kind text not null check(kind in ('paused','archived')),primary key(user_id,ritual_id,starts_on),foreign key(user_id,ritual_id) references public.rituals(user_id,id) on delete cascade deferrable initially deferred,check(ends_before is null or ends_before>starts_on));
create unique index ritual_one_open_period on public.ritual_inactive_periods(user_id,ritual_id) where ends_before is null;
-- Only identity survives permanent deletion to prevent stale-client resurrection.
create table public.ritual_tombstones(id uuid primary key,user_id uuid not null references auth.users on delete cascade,deleted_at timestamptz not null default clock_timestamp());
do $$ declare t text;begin foreach t in array array['ritual_inactive_periods','ritual_tombstones'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);execute format('grant select on public.%I to authenticated',t);execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
 end loop;end $$;
create function muse_private.reject_deleted_ritual() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if exists(select 1 from public.ritual_tombstones where id=new.id) then raise exception 'Deleted ritual cannot be recreated' using errcode='22023';end if;return new;end $$;
revoke all on function muse_private.reject_deleted_ritual() from public,anon,authenticated;
create trigger ritual_no_resurrection before insert on public.rituals for each row execute function muse_private.reject_deleted_ritual();
create or replace function public.read_rituals() returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 return jsonb_build_object('revision',coalesce((select revision from public.ritual_versions_owner where user_id=auth.uid()),0),'state',jsonb_build_object(
 'groups',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',id,'name',name,'accent',accent,'icon',icon_id,'gradient',gradient,'collapsed',collapsed)) order by position,id) from public.ritual_groups where user_id=auth.uid()),'[]'),
 'rituals',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'groupId',group_id,'type',tracking_type,'goal',goal,'unit',unit,'recurrence',case recurrence when 'daily' then jsonb_build_object('kind','daily') when 'weekly' then jsonb_build_object('kind','weekly','weekday',weekdays[1]) else jsonb_build_object('kind','weekdays','weekdays',weekdays) end,'startDate',start_date,'createdAt',created_at,'status',lifecycle_status,'inactivePeriods',coalesce((select jsonb_agg(jsonb_build_object('start',p.starts_on,'end',p.ends_before,'kind',p.kind) order by p.starts_on) from public.ritual_inactive_periods p where p.user_id=rituals.user_id and p.ritual_id=rituals.id),'[]'::jsonb)) order by position,id) from public.rituals where user_id=auth.uid()),'[]'),
 'entries',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',ritual_id::text||'/'||local_date::text,'ritualId',ritual_id,'date',local_date,'value',value,'outcome',case when outcome='missed' then 'missed' end,'updatedAt',updated_at))) from public.ritual_entries where user_id=auth.uid()),'[]'),
 'celebratedMilestones','[]'::jsonb));
end $$;

-- Trigger rejects new inactive-date observations, while existing measurements can
-- still be corrected or cleared without altering original capture context.
create function muse_private.ritual_entry_active_date() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if exists(select 1 from public.ritual_inactive_periods where user_id=new.user_id and ritual_id=new.ritual_id and starts_on<=new.local_date and (ends_before is null or new.local_date<ends_before)) and not exists(select 1 from public.ritual_entries where user_id=new.user_id and ritual_id=new.ritual_id and local_date=new.local_date) then raise exception 'This ritual is inactive on that date' using errcode='22023';end if;return new;end $$;
revoke all on function muse_private.ritual_entry_active_date() from public,anon,authenticated;
create trigger ritual_entry_active_date before insert on public.ritual_entries for each row execute function muse_private.ritual_entry_active_date();
create function public.ritual_lifecycle(p_expected_revision bigint,p_command_id uuid,p_ritual_id uuid,p_operation text,p_confirm_delete boolean default false) returns bigint language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();v bigint;receipt public.ritual_commands;h bytea;r public.rituals;z text;d date;next_status text;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501';end if;
 if p_command_id is null or p_expected_revision is null or p_ritual_id is null or p_operation is null or p_operation not in ('pause','resume','archive','restore','delete') or (p_operation='delete' and p_confirm_delete is distinct from true) then raise exception 'Invalid lifecycle command or unconfirmed deletion' using errcode='22023';end if;
 select time_zone into z from public.profiles where id=uid;if z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z) then raise exception 'Configure a valid profile timezone' using errcode='22023';end if;d:=(clock_timestamp() at time zone z)::date;
 insert into public.ritual_versions_owner(user_id) values(uid) on conflict do nothing;select revision into v from public.ritual_versions_owner where user_id=uid for update;
 h:=sha256(convert_to(jsonb_build_object('lifecycle',p_operation,'id',p_ritual_id,'confirm',p_confirm_delete)::text,'UTF8'));
 select * into receipt from public.ritual_commands where user_id=uid and id=p_command_id;
 if found then if receipt.request_hash<>h then raise exception 'Command reused' using errcode='22023';end if;return receipt.revision;end if;
 if v<>p_expected_revision then raise exception 'Rituals changed; reload before saving' using errcode='40001';end if;
 select * into r from public.rituals where id=p_ritual_id and user_id=uid;if not found then
  if p_operation='delete' and exists(select 1 from public.ritual_tombstones where id=p_ritual_id and user_id=uid) then insert into public.ritual_commands values(uid,p_command_id,h,v);return v;end if;
  raise exception 'Ritual unavailable' using errcode='42501';end if;
 if p_operation='delete' then
  insert into public.ritual_tombstones(id,user_id) values(r.id,uid);
  delete from public.ritual_entries where ritual_id=r.id and user_id=uid;
  delete from public.rituals where id=r.id and user_id=uid;
 else
  if (p_operation='pause' and r.lifecycle_status not in ('active','paused')) or (p_operation='resume' and r.lifecycle_status not in ('active','paused')) or (p_operation='restore' and r.lifecycle_status not in ('active','archived')) then raise exception 'Invalid lifecycle transition' using errcode='22023';end if;
  next_status:=case p_operation when 'pause' then 'paused' when 'archive' then 'archived' else 'active' end;
  if r.lifecycle_status<>next_status then
   -- No retroactive changes when travel moves the profile-local calendar backward.
   if exists(select 1 from public.ritual_inactive_periods where user_id=uid and ritual_id=r.id and (starts_on>d or ends_before>d)) then raise exception 'Lifecycle date predates existing history; review timezone configuration' using errcode='22023';end if;
   delete from public.ritual_inactive_periods where user_id=uid and ritual_id=r.id and ends_before is null and starts_on=d;
   update public.ritual_inactive_periods set ends_before=d where user_id=uid and ritual_id=r.id and ends_before is null;
   if next_status<>'active' then insert into public.ritual_inactive_periods values(uid,r.id,d,null,next_status);end if;
   update public.rituals set lifecycle_status=next_status,updated_at=clock_timestamp() where id=r.id and user_id=uid;
  end if;
 end if;
 update public.ritual_versions_owner set revision=revision+1 where user_id=uid returning revision into v;
 insert into public.ritual_commands values(uid,p_command_id,h,v);return v;
end $$;
revoke all on function public.ritual_lifecycle(bigint,uuid,uuid,text,boolean) from public,anon;grant execute on function public.ritual_lifecycle(bigint,uuid,uuid,text,boolean) to authenticated;
