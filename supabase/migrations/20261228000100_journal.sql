-- Muse Journal V1: conversational journaling, personal memory and a living archive.
--
-- Everyday → Journal owns every table here. Ownership rules (see docs/INTEGRATION_MAP.md, "Muse Journal"):
-- * A Journal is an organizational space; a Companion is an AI personality; a Conversation is one dated entry that
--   belongs to one Journal and records the Companion *version* it used (journal_companion_versions are append-only
--   snapshots, so editing a Companion never rewrites history).
-- * Messages are the original record. They are never updated in place except through correct_journal_message, which
--   keeps the earlier words in journal_message_corrections. A completed conversation accepts no new messages.
-- * AI analysis lives apart from the dialogue (journal_analyses); titles and summaries on the conversation say whether
--   the person or the AI wrote them.
-- * People, places, topics, themes and moods are one tag table, kept distinct by kind. AI-suggested tags carry source 'ai'
--   until confirmed. Similar names are never merged automatically.
-- * Memories are explicit statements. Anything the AI proposes stays 'suggested' and is never used as context until
--   the person confirms it.
-- * AI access is opt-in per account (journal_ai_entitlements) and every request is logged (journal_ai_usage). Both are
--   readable by their owner and writable only by the server (service role), so limits can't be lifted from a browser.
-- * Companion Playground tests are not stored here at all (only their usage rows, kind 'test'); "Keep as Journal
--   Entry" copies a test once through keep_journal_test.

create table public.journal_companions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 name text not null check (char_length(btrim(name)) between 1 and 80),
 description text not null default '' check (char_length(description) <= 600),
 icon text not null default 'sparkle' check (char_length(icon) between 1 and 40),
 tone smallint not null default 1 check (tone between 1 and 8),
 instructions text not null default '' check (char_length(instructions) <= 40000),
 conversation_prefs text not null default '' check (char_length(conversation_prefs) <= 8000),
 opening_style text not null default '' check (char_length(opening_style) <= 4000),
 preset_key text check (preset_key is null or preset_key ~ '^[a-z0-9-]{1,40}$'),
 preferred_journal_id uuid,
 version integer not null default 1 check (version > 0),
 position integer not null default 0,
 archived_at timestamptz,
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id, id)
);

-- Append-only snapshots of a Companion's words. No foreign key to the Companion: deleting a Companion keeps the
-- versions its past conversations used.
create table public.journal_companion_versions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 companion_id uuid not null,
 version integer not null check (version > 0),
 name text not null check (char_length(name) <= 80),
 description text not null default '' check (char_length(description) <= 600),
 instructions text not null default '' check (char_length(instructions) <= 40000),
 conversation_prefs text not null default '' check (char_length(conversation_prefs) <= 8000),
 opening_style text not null default '' check (char_length(opening_style) <= 4000),
 saved_at timestamptz not null default now(),
 unique (user_id, companion_id, version),
 unique (user_id, id)
);

create table public.journal_journals (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 name text not null check (char_length(btrim(name)) between 1 and 80),
 description text not null default '' check (char_length(description) <= 600),
 icon text not null default 'journal' check (char_length(icon) between 1 and 40),
 tone smallint not null default 5 check (tone between 1 and 8),
 cover text not null default 'dusk' check (cover ~ '^[a-z0-9-]{1,30}$'),
 default_companion_id uuid,
 instructions text not null default '' check (char_length(instructions) <= 20000),
 morning_instructions text not null default '' check (char_length(morning_instructions) <= 8000),
 evening_instructions text not null default '' check (char_length(evening_instructions) <= 8000),
 -- shared: reads and feeds the account-wide memory; journal: only this journal's own history; off: no history at all.
 memory_scope text not null default 'shared' check (memory_scope in ('shared','journal','off')),
 preset_key text check (preset_key is null or preset_key ~ '^[a-z0-9-]{1,40}$'),
 position integer not null default 0,
 archived_at timestamptz,
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id, id),
 foreign key (user_id, default_companion_id) references public.journal_companions (user_id, id) on delete set null (default_companion_id)
);
alter table public.journal_companions add foreign key (user_id, preferred_journal_id) references public.journal_journals (user_id, id) on delete set null (preferred_journal_id);

create table public.journal_preferences (
 user_id uuid primary key default auth.uid() references auth.users on delete cascade,
 global_instructions text not null default '' check (char_length(global_instructions) <= 20000),
 memory_enabled boolean not null default true,
 analysis_auto boolean not null default true,
 on_this_day boolean not null default true,
 -- Opt-in Daily Edit card (a link into the Journal, never a second journal).
 show_on_daily boolean not null default false,
 default_journal_id uuid,
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key (user_id, default_journal_id) references public.journal_journals (user_id, id) on delete set null (default_journal_id)
);

create table public.journal_conversations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 journal_id uuid not null,
 companion_id uuid,
 companion_version_id uuid,
 companion_name text not null default '' check (char_length(companion_name) <= 80),
 origin text not null default 'journal' check (origin in ('journal','playground')),
 mode text not null default 'open' check (mode in ('open','morning','evening')),
 status text not null default 'active' check (status in ('draft','active','completed')),
 local_date date not null,
 time_zone text not null default 'UTC' check (char_length(time_zone) between 1 and 64),
 started_at timestamptz not null default now(),
 completed_at timestamptz,
 title text not null default '' check (char_length(title) <= 200),
 title_source text check (title_source is null or title_source in ('user','ai')),
 summary text not null default '' check (char_length(summary) <= 4000),
 summary_source text check (summary_source is null or summary_source in ('user','ai')),
 favorite boolean not null default false,
 exclude_from_memory boolean not null default false,
 memory_off boolean not null default false,
 analysis_status text check (analysis_status is null or analysis_status in ('pending','ready','failed','skipped')),
 images jsonb not null default '[]' check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 20 and octet_length(images::text) <= 40000),
 draft text not null default '' check (char_length(draft) <= 100000),
 draft_updated_at timestamptz,
 user_words integer not null default 0,
 message_count integer not null default 0,
 last_message_at timestamptz,
 search tsvector generated always as (to_tsvector('english'::regconfig, coalesce(title, '') || ' ' || coalesce(summary, ''))) stored,
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id, id),
 check ((status = 'completed') = (completed_at is not null)),
 foreign key (user_id, journal_id) references public.journal_journals (user_id, id) on delete restrict,
 foreign key (user_id, companion_id) references public.journal_companions (user_id, id) on delete set null (companion_id),
 foreign key (user_id, companion_version_id) references public.journal_companion_versions (user_id, id) on delete set null (companion_version_id)
);
create index journal_conversations_by_date on public.journal_conversations (user_id, local_date desc, started_at desc);
create index journal_conversations_by_journal on public.journal_conversations (user_id, journal_id, local_date desc);
create index journal_conversations_search on public.journal_conversations using gin (search);

create table public.journal_messages (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 conversation_id uuid not null,
 role text not null check (role in ('user','assistant')),
 body text not null check (char_length(btrim(body)) between 1 and 100000),
 local_date date not null,
 -- An assistant message answers one user message (or is the opening when null). Unique, so a retried request can
 -- never store a second reply to the same words.
 reply_to uuid,
 companion_version_id uuid,
 model text check (model is null or char_length(model) <= 80),
 corrected_at timestamptz,
 created_at timestamptz not null default now(),
 search tsvector generated always as (to_tsvector('english'::regconfig, body)) stored,
 unique (user_id, id),
 unique (conversation_id, reply_to),
 foreign key (user_id, conversation_id) references public.journal_conversations (user_id, id) on delete cascade
);
create index journal_messages_thread on public.journal_messages (user_id, conversation_id, created_at);
create index journal_messages_days on public.journal_messages (user_id, local_date) where role = 'user';
create index journal_messages_search on public.journal_messages using gin (search);
create unique index journal_messages_one_opening on public.journal_messages (conversation_id) where role = 'assistant' and reply_to is null;

create table public.journal_message_corrections (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 message_id uuid not null,
 previous_body text not null,
 corrected_at timestamptz not null default now(),
 foreign key (user_id, message_id) references public.journal_messages (user_id, id) on delete cascade
);
create index journal_message_corrections_by_message on public.journal_message_corrections (user_id, message_id, corrected_at);

create table public.journal_tags (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 kind text not null check (kind in ('person','place','topic','theme','mood')),
 name text not null check (char_length(btrim(name)) between 1 and 80),
 normalized text generated always as (lower(btrim(name))) stored,
 aliases text[] not null default '{}' check (cardinality(aliases) <= 20 and octet_length(array_to_string(aliases, '')) <= 1600),
 note text not null default '' check (char_length(note) <= 600),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id, id),
 unique (user_id, kind, normalized)
);

create table public.journal_entry_tags (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 conversation_id uuid not null,
 tag_id uuid not null,
 source text not null default 'user' check (source in ('user','ai')),
 created_at timestamptz not null default now(),
 primary key (user_id, conversation_id, tag_id),
 foreign key (user_id, conversation_id) references public.journal_conversations (user_id, id) on delete cascade,
 foreign key (user_id, tag_id) references public.journal_tags (user_id, id) on delete cascade
);
create index journal_entry_tags_by_tag on public.journal_entry_tags (user_id, tag_id);

create table public.journal_analyses (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 conversation_id uuid not null,
 status text not null check (status in ('ready','failed')),
 data jsonb not null default '{}' check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 60000),
 dismissed text[] not null default '{}' check (cardinality(dismissed) <= 200),
 model text check (model is null or char_length(model) <= 80),
 error text check (error is null or char_length(error) <= 300),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id, conversation_id),
 foreign key (user_id, conversation_id) references public.journal_conversations (user_id, id) on delete cascade
);

create table public.journal_bookmarks (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 conversation_id uuid not null,
 message_id uuid,
 excerpt text not null default '' check (char_length(excerpt) <= 4000),
 note text not null default '' check (char_length(note) <= 2000),
 created_at timestamptz not null default now(),
 foreign key (user_id, conversation_id) references public.journal_conversations (user_id, id) on delete cascade,
 foreign key (user_id, message_id) references public.journal_messages (user_id, id) on delete cascade
);
create index journal_bookmarks_by_entry on public.journal_bookmarks (user_id, conversation_id);

create table public.journal_memories (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 body text not null check (char_length(btrim(body)) between 1 and 1000),
 kind text not null default 'fact' check (kind in ('fact','person','situation','preference','other')),
 status text not null default 'confirmed' check (status in ('confirmed','suggested')),
 source text not null default 'user' check (source in ('user','ai')),
 -- null: any journal whose memory is shared; set: only conversations in that journal.
 journal_id uuid,
 source_conversation_id uuid,
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key (user_id, journal_id) references public.journal_journals (user_id, id) on delete cascade,
 foreign key (user_id, source_conversation_id) references public.journal_conversations (user_id, id) on delete set null (source_conversation_id)
);
create index journal_memories_by_owner on public.journal_memories (user_id, status, updated_at desc);

create table public.journal_reports (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 week_start date not null,
 data jsonb not null default '{}' check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 60000),
 source_ids uuid[] not null default '{}',
 source_signature text not null default '' check (char_length(source_signature) <= 200),
 model text check (model is null or char_length(model) <= 80),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id, week_start)
);

-- Optional, explicit links to other modules: id + name snapshot (Integration Map), never a copy.
create table public.journal_links (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 conversation_id uuid not null,
 kind text not null check (kind in ('chapter','experience','area')),
 target_id uuid not null,
 label text not null default '' check (char_length(label) <= 200),
 created_at timestamptz not null default now(),
 primary key (user_id, conversation_id, kind, target_id),
 foreign key (user_id, conversation_id) references public.journal_conversations (user_id, id) on delete cascade
);
create index journal_links_by_target on public.journal_links (user_id, kind, target_id);

-- Server-owned: who may use the Journal AI, and within what allowance. Off unless a row says otherwise.
create table public.journal_ai_entitlements (
 user_id uuid primary key references auth.users on delete cascade,
 enabled boolean not null default false,
 -- A $10 monthly target with a warning at $7.50 (owner's brief), plus a daily guard against a runaway day.
 daily_limit_usd numeric(8,4) not null default 2 check (daily_limit_usd >= 0),
 monthly_limit_usd numeric(8,4) not null default 10 check (monthly_limit_usd >= 0),
 warn_at_usd numeric(8,4) not null default 7.5 check (warn_at_usd >= 0),
 per_minute integer not null default 8 check (per_minute between 1 and 60),
 note text not null default '' check (char_length(note) <= 300),
 updated_at timestamptz not null default now()
);

create table public.journal_ai_usage (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users on delete cascade,
 kind text not null check (kind in ('reply','opening','analysis','report','test')),
 request_key text not null check (char_length(request_key) between 1 and 120),
 conversation_id uuid,
 model text not null check (char_length(model) <= 80),
 status text not null default 'pending' check (status in ('pending','ok','failed')),
 input_tokens integer not null default 0,
 cached_tokens integer not null default 0,
 output_tokens integer not null default 0,
 cost_usd numeric(12,6) not null default 0,
 -- A conservative estimate reserved while the request runs, so concurrent requests can't overspend the allowance.
 estimated_usd numeric(12,6) not null default 0,
 error_code text check (error_code is null or char_length(error_code) <= 60),
 created_at timestamptz not null default now(),
 finished_at timestamptz,
 unique (user_id, request_key)
);
create index journal_ai_usage_by_time on public.journal_ai_usage (user_id, created_at desc);

-- ── Triggers ─────────────────────────────────────────────────────────────────────────────────────────────────────

do $$declare t text;begin foreach t in array array['journal_journals','journal_preferences','journal_tags','journal_analyses','journal_memories','journal_reports'] loop
 execute format('create trigger touch_%s before update on public.%I for each row execute function muse_private.touch_collection_record()',t,t);
end loop;end $$;

-- A Companion's revision moves on every edit; its version moves (and a snapshot is kept) only when its words change.
create function muse_private.journal_companion_touch() returns trigger language plpgsql set search_path='' as $$begin
 new.revision:=old.revision+1;new.created_at:=old.created_at;new.updated_at:=clock_timestamp();
 if (new.name,new.description,new.instructions,new.conversation_prefs,new.opening_style) is distinct from (old.name,old.description,old.instructions,old.conversation_prefs,old.opening_style)
 then new.version:=old.version+1; else new.version:=old.version; end if;
 return new;
end $$;
create trigger touch_journal_companion before update on public.journal_companions for each row execute function muse_private.journal_companion_touch();
create function muse_private.journal_companion_snapshot() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op='INSERT' or new.version<>old.version then
  insert into public.journal_companion_versions (user_id,companion_id,version,name,description,instructions,conversation_prefs,opening_style)
  values (new.user_id,new.id,new.version,new.name,new.description,new.instructions,new.conversation_prefs,new.opening_style)
  on conflict (user_id,companion_id,version) do nothing;
 end if;
 return null;
end $$;
create trigger snapshot_journal_companion after insert or update on public.journal_companions for each row execute function muse_private.journal_companion_snapshot();

-- Conversations: the revision guards what a person edits (title, summary, tags of state). Counters, drafts and
-- analysis progress move without bumping it, so a message arriving never makes an open editor stale.
-- A completed entry stays completed.
create function muse_private.journal_conversation_touch() returns trigger language plpgsql set search_path='' as $$begin
 new.created_at:=old.created_at;new.updated_at:=clock_timestamp();
 if old.status='completed' and new.status<>'completed' then raise exception 'A finished entry stays finished' using errcode='22023'; end if;
 if (to_jsonb(new)-array['revision','updated_at','draft','draft_updated_at','user_words','message_count','last_message_at','analysis_status','status','search'])
    is distinct from (to_jsonb(old)-array['revision','updated_at','draft','draft_updated_at','user_words','message_count','last_message_at','analysis_status','status','search'])
    or new.status<>old.status
 then new.revision:=old.revision+1; else new.revision:=old.revision; end if;
 return new;
end $$;
create trigger touch_journal_conversation before update on public.journal_conversations for each row execute function muse_private.journal_conversation_touch();

-- Messages only join a draft or active conversation; the first one makes a draft active. Counters stay in step.
create function muse_private.journal_message_insert() returns trigger language plpgsql set search_path='' as $$
declare c public.journal_conversations;
begin
 select * into c from public.journal_conversations where id=new.conversation_id and user_id=new.user_id for update;
 if not found then raise exception 'Conversation unavailable' using errcode='42501'; end if;
 if c.status='completed' then raise exception 'This entry is finished. Start a new conversation to keep talking.' using errcode='22023'; end if;
 update public.journal_conversations set
  status='active',
  message_count=message_count+1,
  user_words=user_words+case when new.role='user' then coalesce(array_length(regexp_split_to_array(btrim(new.body),'\s+'),1),0) else 0 end,
  last_message_at=new.created_at,
  draft=case when new.role='user' then '' else draft end
 where id=c.id;
 return new;
end $$;
create trigger journal_message_insert before insert on public.journal_messages for each row execute function muse_private.journal_message_insert();
-- Security definer: account deletion cascades here as the auth service, which has no rights on journal tables. It only
-- adjusts the same owner's counters.
create function muse_private.journal_message_delete() returns trigger language plpgsql security definer set search_path='' as $$begin
 update public.journal_conversations set message_count=greatest(0,message_count-1),
  user_words=greatest(0,user_words-case when old.role='user' then coalesce(array_length(regexp_split_to_array(btrim(old.body),'\s+'),1),0) else 0 end)
 where id=old.conversation_id and user_id=old.user_id;
 return old;
end $$;
create trigger journal_message_delete after delete on public.journal_messages for each row execute function muse_private.journal_message_delete();
revoke all on function muse_private.journal_message_delete() from public, anon, authenticated;

-- ── Functions ────────────────────────────────────────────────────────────────────────────────────────────────────

-- Correct a dictation slip in one of your own words, keeping what it said before.
create function public.correct_journal_message(p_id uuid, p_body text) returns setof public.journal_messages
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();m public.journal_messages;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into m from public.journal_messages where id=p_id and user_id=uid for update;
 if not found then raise exception 'Message unavailable' using errcode='42501'; end if;
 if m.role<>'user' then raise exception 'Only your own words can be corrected' using errcode='22023'; end if;
 if char_length(btrim(coalesce(p_body,''))) not between 1 and 100000 then raise exception 'Write something first' using errcode='22023'; end if;
 if btrim(p_body)=m.body then return query select * from public.journal_messages where id=m.id; return; end if;
 insert into public.journal_message_corrections (user_id,message_id,previous_body) values (uid,m.id,m.body);
 update public.journal_conversations set user_words=greatest(0,user_words
   -coalesce(array_length(regexp_split_to_array(btrim(m.body),'\s+'),1),0)
   +coalesce(array_length(regexp_split_to_array(btrim(p_body),'\s+'),1),0)) where id=m.conversation_id and user_id=uid;
 return query update public.journal_messages set body=btrim(p_body),corrected_at=clock_timestamp() where id=m.id returning *;
end $$;

-- Merge two tags of the same kind: entries move to the kept tag; the merged name becomes an alias of a person/place.
create function public.merge_journal_tags(p_from uuid, p_into uuid) returns setof public.journal_tags
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
 delete from public.journal_tags where id=a.id and user_id=uid;
 return query update public.journal_tags set aliases=(select coalesce(array_agg(distinct x),'{}') from unnest(b.aliases||a.aliases||array[a.name]) x where lower(btrim(x))<>b.normalized)
  where id=b.id returning *;
end $$;

-- Delete a journal explicitly: either move its entries to another journal, or delete them with it.
create function public.delete_journal(p_id uuid, p_move_to uuid, p_delete_entries boolean) returns integer
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid();n integer:=0;
begin
 if not exists(select 1 from public.journal_journals where id=p_id and user_id=uid) then raise exception 'Journal unavailable' using errcode='42501'; end if;
 if p_move_to is not null then
  if p_move_to=p_id or not exists(select 1 from public.journal_journals where id=p_move_to and user_id=uid) then raise exception 'Choose another journal' using errcode='22023'; end if;
  update public.journal_conversations set journal_id=p_move_to where user_id=uid and journal_id=p_id;
  get diagnostics n=row_count;
 elsif coalesce(p_delete_entries,false) then
  delete from public.journal_conversations where user_id=uid and journal_id=p_id;
  get diagnostics n=row_count;
 elsif exists(select 1 from public.journal_conversations where user_id=uid and journal_id=p_id) then
  raise exception 'This journal still has entries. Move them or delete them with it.' using errcode='22023';
 end if;
 delete from public.journal_journals where id=p_id and user_id=uid;
 return n;
end $$;

-- Full-text search across titles, summaries and every message. Returns one row per conversation with a snippet.
create function public.search_journal(p_query text, p_limit integer default 60) returns table (conversation_id uuid, rank real, snippet text)
language sql stable security invoker set search_path='' as $$
 with q as (select websearch_to_tsquery('english'::regconfig, coalesce(p_query,'')) as q),
 hits as (
  select c.id as conversation_id, ts_rank(c.search,q.q)*2 as rank, nullif(c.summary,'') as body
   from public.journal_conversations c, q where c.user_id=(select auth.uid()) and c.status<>'draft' and c.search @@ q.q
  union all
  select m.conversation_id, ts_rank(m.search,q.q), m.body
   from public.journal_messages m, q where m.user_id=(select auth.uid()) and m.search @@ q.q
 )
 select h.conversation_id, max(h.rank)::real,
  (array_agg(ts_headline('english'::regconfig, coalesce(h.body,''), (select q from q), 'MaxWords=28,MinWords=10,StartSel=«,StopSel=»') order by h.rank desc))[1]
 from hits h group by h.conversation_id order by 2 desc limit least(greatest(coalesce(p_limit,60),1),200)
$$;

-- Days with at least one saved journal message of your own (for a connected Journaling ritual and streaks).
create function public.journal_days(p_from date) returns table (local_date date, messages integer)
language sql stable security invoker set search_path='' as $$
 select m.local_date, count(*)::integer from public.journal_messages m
 where m.user_id=(select auth.uid()) and m.role='user' and m.local_date>=coalesce(p_from,'1900-01-01'::date)
 group by m.local_date order by m.local_date
$$;

-- "Keep as Journal Entry" from the Companion Playground: copies the test once (p_key is the conversation id, so a
-- repeated press returns the same entry), in order, then finishes it.
create function public.keep_journal_test(p_key uuid, p_journal_id uuid, p_companion_id uuid, p_companion_name text, p_messages jsonb, p_local_date date, p_time_zone text)
returns setof public.journal_conversations language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid();item jsonb;i integer:=0;version_id uuid;last_user uuid;mid uuid;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if exists(select 1 from public.journal_conversations where id=p_key and user_id=uid) then return query select * from public.journal_conversations where id=p_key; return; end if;
 if jsonb_typeof(p_messages)<>'array' or jsonb_array_length(p_messages) not between 1 and 200 then raise exception 'Nothing to keep' using errcode='22023'; end if;
 select v.id into version_id from public.journal_companion_versions v join public.journal_companions c on c.id=v.companion_id and c.version=v.version
  where c.id=p_companion_id and c.user_id=uid and v.user_id=uid;
 insert into public.journal_conversations (id,user_id,journal_id,companion_id,companion_version_id,companion_name,origin,mode,status,local_date,time_zone)
  values (p_key,uid,p_journal_id,p_companion_id,version_id,left(coalesce(p_companion_name,''),80),'playground','open','active',p_local_date,coalesce(nullif(p_time_zone,''),'UTC'));
 for item in select value from jsonb_array_elements(p_messages) loop
  if item->>'role' not in ('user','assistant') then raise exception 'Unreadable message' using errcode='22023'; end if;
  mid:=gen_random_uuid();
  insert into public.journal_messages (id,user_id,conversation_id,role,body,local_date,created_at,reply_to)
   values (mid,uid,p_key,item->>'role',item->>'body',p_local_date,clock_timestamp()+(i||' milliseconds')::interval,case when item->>'role'='assistant' then last_user end);
  if item->>'role'='user' then last_user:=mid; else last_user:=null; end if;
  i:=i+1;
 end loop;
 return query update public.journal_conversations set status='completed',completed_at=clock_timestamp() where id=p_key and user_id=uid returning *;
end $$;

revoke all on function public.correct_journal_message(uuid,text) from public,anon;
revoke all on function public.merge_journal_tags(uuid,uuid) from public,anon;
revoke all on function public.delete_journal(uuid,uuid,boolean) from public,anon;
revoke all on function public.search_journal(text,integer) from public,anon;
revoke all on function public.journal_days(date) from public,anon;
revoke all on function public.keep_journal_test(uuid,uuid,uuid,text,jsonb,date,text) from public,anon;
grant execute on function public.correct_journal_message(uuid,text) to authenticated;
grant execute on function public.merge_journal_tags(uuid,uuid) to authenticated;
grant execute on function public.delete_journal(uuid,uuid,boolean) to authenticated;
grant execute on function public.search_journal(text,integer) to authenticated,service_role;
grant execute on function public.journal_days(date) to authenticated;
grant execute on function public.keep_journal_test(uuid,uuid,uuid,text,jsonb,date,text) to authenticated;

-- ── Row-level security ───────────────────────────────────────────────────────────────────────────────────────────

-- Owner-only everywhere. No anonymous access.
do $$declare t text;begin foreach t in array array['journal_companions','journal_journals','journal_preferences','journal_conversations','journal_tags','journal_entry_tags','journal_analyses','journal_bookmarks','journal_memories','journal_reports','journal_links'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated,service_role',t);
 execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
 execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',t);
 execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
 execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid())=user_id)',t);
end loop;end $$;

-- Append-only records: read, add and delete your own; never update (corrections go through correct_journal_message).
do $$declare t text;begin foreach t in array array['journal_companion_versions','journal_messages','journal_message_corrections'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select,insert,delete on public.%I to authenticated',t);
 execute format('grant select,insert,update,delete on public.%I to service_role',t);
 execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
 execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',t);
 execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid())=user_id)',t);
end loop;end $$;

-- Server-owned allowance and usage: the owner may read their own rows; only the service role writes.
do $$declare t text;begin foreach t in array array['journal_ai_entitlements','journal_ai_usage'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant select,insert,update,delete on public.%I to service_role',t);
 execute format('create policy owner_read on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
end loop;end $$;

-- ── Integrations (additive) ──────────────────────────────────────────────────────────────────────────────────────

-- Inner Compass: a discovery may say it came from a Journal entry (reference + name snapshot, set by an explicit save).
alter table public.inner_discoveries drop constraint inner_discoveries_source_kind_check;
alter table public.inner_discoveries add constraint inner_discoveries_source_kind_check
 check (source_kind is null or source_kind in ('exploration','garden','chapter','experience','journal'));

-- Rituals: a Journaling ritual may connect to Journal days (at least one saved message of your own that local day).
-- Same validator as 20261127000200 with 'journal-days' added to the sources and to weekly targets.
create or replace function muse_private.valid_ritual_connection(c jsonb,tracking text) returns boolean language sql immutable set search_path='' as $$
 select c is null or c='null'::jsonb or (
  jsonb_typeof(c)='object'
  and not exists(select 1 from jsonb_object_keys(c) k where k not in ('metric','since','category','typeId','unit','threshold','followGoal'))
  and c->>'metric' in ('water','workouts','workout-minutes','reading-minutes','reading-pages','books-finished','tasks-completed','journal-days')
  and coalesce(c->>'since','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  and (c->'category' is null or c->>'category' in ('strength','cardio','mobility','other'))
  and (c->'unit' is null or c->>'unit' in ('oz','mL'))
  and (c->'typeId' is null or (jsonb_typeof(c->'typeId')='string' and length(c->>'typeId') between 1 and 80))
  and (c->'threshold' is null or (jsonb_typeof(c->'threshold')='number' and (c->>'threshold')::numeric>0 and (c->>'threshold')::numeric<=1000000))
  and (c->'followGoal' is null or (jsonb_typeof(c->'followGoal')='boolean' and c->>'metric'='water'))
  and case tracking
   when 'duration' then c->>'metric' in ('workout-minutes','reading-minutes')
   when 'weekly-target' then c->>'metric' in ('workouts','books-finished','tasks-completed','journal-days')
   else true end)
$$;
