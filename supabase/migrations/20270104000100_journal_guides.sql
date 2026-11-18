-- Journal: Guided Journals. A guide is an optional, reusable set of questions; it is not a companion and not a journal.
-- Additive:
--  * journal_guides: your guides (owner RLS). Editing one never touches past entries.
--  * journal_journals.default_guide_id: a journal may start new entries with a guide (none by default).
--  * journal_conversations.guide_id + guide_snapshot (the guide as it was when the entry began; immutable record) +
--    guide_state (answers in progress and the current step; saves like a draft, never bumps the revision).
--  * journal_messages.guide_question_id + guide_question: an answer remembers which question it answered, as written.

create table public.journal_guides (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 name text not null check (char_length(btrim(name)) between 1 and 80),
 description text not null default '' check (char_length(description) <= 400),
 icon text not null default '' check (char_length(icon) <= 16),
 intro text not null default '' check (char_length(intro) <= 2000),
 mode text not null default 'steps' check (mode in ('steps','all')),
 companion boolean not null default false,
 questions jsonb not null default '[]' check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) <= 30 and octet_length(questions::text) <= 20000),
 version integer not null default 1 check (version >= 1),
 archived_at timestamptz,
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id, id)
);
alter table public.journal_guides enable row level security;
create policy owner_read on public.journal_guides for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.journal_guides for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.journal_guides for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.journal_guides for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.journal_guides from public, anon;
grant select, insert, update, delete on public.journal_guides to authenticated, service_role;
create trigger touch_journal_guides before update on public.journal_guides for each row execute function muse_private.touch_collection_record();

alter table public.journal_journals
 add column default_guide_id uuid,
 add constraint journal_journals_default_guide_fkey foreign key (user_id, default_guide_id) references public.journal_guides (user_id, id) on delete set null (default_guide_id);

alter table public.journal_conversations
 add column guide_id uuid,
 add column guide_snapshot jsonb check (guide_snapshot is null or (jsonb_typeof(guide_snapshot) = 'object' and octet_length(guide_snapshot::text) <= 24000)),
 add column guide_state jsonb not null default '{}' check (jsonb_typeof(guide_state) = 'object' and octet_length(guide_state::text) <= 200000),
 add constraint journal_conversations_guide_fkey foreign key (user_id, guide_id) references public.journal_guides (user_id, id) on delete set null (guide_id);

alter table public.journal_messages
 add column guide_question_id text check (guide_question_id is null or char_length(guide_question_id) <= 64),
 add column guide_question text check (guide_question is null or char_length(guide_question) <= 500);

-- Answers in progress save like a draft: they don't bump the entry's revision (so they never conflict with edits).
create or replace function muse_private.journal_conversation_touch() returns trigger language plpgsql set search_path='' as $$begin
 new.created_at:=old.created_at;new.updated_at:=clock_timestamp();
 if old.status='completed' and new.status<>'completed' then raise exception 'A finished entry stays finished' using errcode='22023'; end if;
 if (to_jsonb(new)-array['revision','updated_at','draft','draft_updated_at','user_words','message_count','last_message_at','analysis_status','status','search','guide_state'])
    is distinct from (to_jsonb(old)-array['revision','updated_at','draft','draft_updated_at','user_words','message_count','last_message_at','analysis_status','status','search','guide_state'])
    or new.status<>old.status
 then new.revision:=old.revision+1; else new.revision:=old.revision; end if;
 return new;
end $$;
