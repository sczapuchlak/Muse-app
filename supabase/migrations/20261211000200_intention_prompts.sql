-- Planner → Intentions prompts (#130): the person's favorite library prompts and their own custom prompts.
-- Additive and owner-only. The prompt library itself is app content and stores nothing; a prompt added to a page
-- becomes an ordinary section inside intention_pages (with its question copied there), so editing or deleting a
-- saved prompt here never rewrites a page.

create table public.intention_prompts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 -- 'favorite': a marker on a library prompt, by its stable key. 'custom': the person's own prompt.
 kind text not null check (kind in ('favorite', 'custom')),
 prompt_key text check (prompt_key is null or prompt_key ~ '^[a-z0-9-]{1,60}$'),
 title text check (title is null or char_length(btrim(title)) between 1 and 60),
 question text check (question is null or char_length(btrim(question)) between 1 and 280),
 response text check (response is null or response in ('writing', 'list')),
 category text check (category is null or category in ('feel', 'focus', 'body', 'heart', 'work', 'joy', 'grow', 'vision')),
 periods text[] not null default '{}' check (periods <@ array['week', 'month', 'quarter', 'year']::text[]),
 favorite boolean not null default false,
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (
  (kind = 'favorite' and prompt_key is not null and title is null and question is null and response is null)
  or (kind = 'custom' and prompt_key is null and title is not null and question is not null and response is not null)
 )
);
create unique index intention_prompts_one_favorite on public.intention_prompts(user_id, prompt_key) where kind = 'favorite';
create index intention_prompts_owner on public.intention_prompts(user_id, kind, created_at desc);

create trigger touch_intention_prompts before update on public.intention_prompts for each row execute function muse_private.touch_collection_record();
alter table public.intention_prompts enable row level security;
revoke all on public.intention_prompts from public, anon, authenticated;
grant select, insert, update, delete on public.intention_prompts to authenticated, service_role;
create policy owner_read on public.intention_prompts for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.intention_prompts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.intention_prompts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.intention_prompts for delete to authenticated using ((select auth.uid()) = user_id);
