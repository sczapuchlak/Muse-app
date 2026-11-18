-- Journal: Manage Tags. Additive.
--  * journal_tags.suppressed: a tag you removed everywhere and asked AI never to suggest again. It keeps its row (so
--    analysis can recognise and skip the name) but has no entries and is hidden from every tag view.
--  * journal_tag_corrections: per-entry corrections you made ("Maya" was really Nia here), remembered as guidance for
--    future analysis only. Never applied automatically, never an alias, reversible (delete the row).
--  * merge_journal_tags now also moves highlight tags and remembered corrections to the kept tag.

alter table public.journal_tags add column suppressed boolean not null default false;

create table public.journal_tag_corrections (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 kind text not null check (kind in ('person','place','topic','theme','mood','custom')),
 from_name text not null check (char_length(btrim(from_name)) between 1 and 80),
 from_normalized text generated always as (lower(btrim(from_name))) stored,
 to_tag_id uuid not null,
 times integer not null default 1 check (times between 1 and 100000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id, kind, from_normalized, to_tag_id),
 foreign key (user_id, to_tag_id) references public.journal_tags (user_id, id) on delete cascade
);
alter table public.journal_tag_corrections enable row level security;
create policy owner_read on public.journal_tag_corrections for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.journal_tag_corrections for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.journal_tag_corrections for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.journal_tag_corrections for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.journal_tag_corrections from public, anon;
grant select, insert, update, delete on public.journal_tag_corrections to authenticated, service_role;

create or replace function public.merge_journal_tags(p_from uuid, p_into uuid) returns setof public.journal_tags
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid();a public.journal_tags;b public.journal_tags;
begin
 select * into a from public.journal_tags where id=p_from and user_id=uid;
 select * into b from public.journal_tags where id=p_into and user_id=uid for update;
 if a.id is null or b.id is null or a.id=b.id then raise exception 'Tags unavailable' using errcode='42501'; end if;
 if a.kind<>b.kind then raise exception 'Only tags of the same kind can be merged' using errcode='22023'; end if;
 insert into public.journal_entry_tags (user_id,conversation_id,tag_id,source,created_at)
  select user_id,conversation_id,b.id,source,created_at from public.journal_entry_tags where user_id=uid and tag_id=a.id
  on conflict (user_id,conversation_id,tag_id) do nothing;
 insert into public.journal_highlight_tags (user_id,highlight_id,tag_id,created_at)
  select user_id,highlight_id,b.id,created_at from public.journal_highlight_tags where user_id=uid and tag_id=a.id
  on conflict (user_id,highlight_id,tag_id) do nothing;
 update public.journal_tag_corrections c set to_tag_id=b.id, updated_at=now() where c.user_id=uid and c.to_tag_id=a.id
  and not exists (select 1 from public.journal_tag_corrections d where d.user_id=uid and d.kind=c.kind and d.from_normalized=c.from_normalized and d.to_tag_id=b.id);
 delete from public.journal_tags where id=a.id and user_id=uid;
 return query update public.journal_tags set suppressed=false, aliases=(select coalesce(array_agg(distinct x),'{}') from unnest(b.aliases||a.aliases||array[a.name]) x where lower(btrim(x))<>b.normalized)
  where id=b.id returning *;
end $$;
