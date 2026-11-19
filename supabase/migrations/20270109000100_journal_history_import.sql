-- Journal: historical import (Rosebud and other journals) and entity-aware recall. Additive.
--
-- Cohesion (Integration Map): an imported entry is an ordinary journal_conversations row with its original messages,
-- so History, search, tags, highlights, Continue from here and memory all treat it like any other entry. There is no
-- second archive. Import provenance lives beside it, never inside it:
--  * journal_import_batches: one row per import run, with its counts and final report.
--  * journal_import_sources: one row per imported entry, keyed by the source system and the source's own identifier
--    (or a stable content fingerprint when the source has none). It keeps an immutable snapshot of the original
--    metadata (e.g. the source's own analysis), so later Muse analysis never overwrites what the source wrote.
-- Idempotent: the same source key or fingerprint is never imported twice. Deleting an imported entry by hand keeps its
-- source row (with no entry), so a later re-import respects the deletion instead of bringing the entry back.
-- Removing a whole import ("undo") deletes only that batch's imported entries and their source rows.

alter table public.journal_conversations drop constraint if exists journal_conversations_origin_check;
alter table public.journal_conversations add constraint journal_conversations_origin_check check (origin in ('journal','playground','import'));
-- 'import': written by the source journal (its own title or summary), kept as it was.
alter table public.journal_conversations drop constraint if exists journal_conversations_title_source_check;
alter table public.journal_conversations add constraint journal_conversations_title_source_check check (title_source is null or title_source in ('user','ai','import'));
alter table public.journal_conversations drop constraint if exists journal_conversations_summary_source_check;
alter table public.journal_conversations add constraint journal_conversations_summary_source_check check (summary_source is null or summary_source in ('user','ai','import'));

create table public.journal_import_batches (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 source text not null check (source in ('rosebud','muse')),
 label text not null default '' check (char_length(label) <= 200),
 status text not null default 'importing' check (status in ('importing','complete','partial','failed','undone')),
 detected integer not null default 0 check (detected >= 0),
 imported integer not null default 0 check (imported >= 0),
 duplicates integer not null default 0 check (duplicates >= 0),
 failed integer not null default 0 check (failed >= 0),
 report jsonb not null default '{}' check (jsonb_typeof(report) = 'object' and octet_length(report::text) <= 60000),
 revision bigint not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 finished_at timestamptz,
 unique (user_id, id)
);
create index journal_import_batches_by_time on public.journal_import_batches (user_id, created_at desc);

create table public.journal_import_sources (
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 source text not null check (source in ('rosebud','muse')),
 source_key text not null check (char_length(source_key) between 1 and 200),
 fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
 batch_id uuid,
 conversation_id uuid,
 original jsonb not null default '{}' check (jsonb_typeof(original) = 'object' and octet_length(original::text) <= 120000),
 created_at timestamptz not null default now(),
 primary key (user_id, source, source_key),
 foreign key (user_id, batch_id) references public.journal_import_batches (user_id, id) on delete set null (batch_id),
 foreign key (user_id, conversation_id) references public.journal_conversations (user_id, id) on delete set null (conversation_id)
);
create index journal_import_sources_fingerprint on public.journal_import_sources (user_id, fingerprint);
create index journal_import_sources_by_entry on public.journal_import_sources (user_id, conversation_id) where conversation_id is not null;
create index journal_import_sources_by_batch on public.journal_import_sources (user_id, batch_id);

create trigger touch_journal_import_batches before update on public.journal_import_batches for each row execute function muse_private.touch_collection_record();

alter table public.journal_import_batches enable row level security;
revoke all on public.journal_import_batches from public, anon, authenticated;
grant select, insert, update, delete on public.journal_import_batches to authenticated, service_role;
create policy owner_read on public.journal_import_batches for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.journal_import_batches for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_update on public.journal_import_batches for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy owner_delete on public.journal_import_batches for delete to authenticated using ((select auth.uid()) = user_id);

-- Source rows are a record of what was imported: read, add, delete; never edited in place.
alter table public.journal_import_sources enable row level security;
revoke all on public.journal_import_sources from public, anon, authenticated;
grant select, insert, delete on public.journal_import_sources to authenticated;
grant select, insert, update, delete on public.journal_import_sources to service_role;
create policy owner_read on public.journal_import_sources for select to authenticated using ((select auth.uid()) = user_id);
create policy owner_insert on public.journal_import_sources for insert to authenticated with check ((select auth.uid()) = user_id);
create policy owner_delete on public.journal_import_sources for delete to authenticated using ((select auth.uid()) = user_id);

-- Import one historical entry, all or nothing. Runs as the signed-in person (security invoker), so row-level security
-- applies to every row it writes. Returns {status, conversation_id}: 'imported', 'duplicate' (same key or the same
-- content already imported) or 'deleted' (imported before and since deleted by its owner; not brought back).
-- p_entry: {title, summary, local_date, time_zone, started_at, completed_at?, companion_name, mode?,
--           messages: [{role, body, created_at}], tags: [{kind, name, source?}]}
create function public.import_journal_entry(p_batch uuid, p_source text, p_key text, p_fingerprint text, p_journal uuid, p_entry jsonb, p_original jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 uid uuid:=auth.uid(); prior public.journal_import_sources; cid uuid; m jsonb; t jsonb; prev uuid:=null; prev_at timestamptz:=null;
 v_at timestamptz; mid uuid; started timestamptz; day date; n integer:=0; users integer:=0; v_tag uuid; v_kind text; tname text; tsource text;
begin
 if uid is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if not exists (select 1 from public.journal_import_batches where id=p_batch and user_id=uid and status='importing') then raise exception 'Import unavailable' using errcode='42501'; end if;
 if not exists (select 1 from public.journal_journals where id=p_journal and user_id=uid) then raise exception 'Journal unavailable' using errcode='42501'; end if;
 if p_source not in ('rosebud','muse') or char_length(coalesce(p_key,'')) not between 1 and 200 or coalesce(p_fingerprint,'') !~ '^[0-9a-f]{64}$' then raise exception 'Unreadable import' using errcode='22023'; end if;
 if jsonb_typeof(p_entry->'messages')<>'array' or jsonb_array_length(p_entry->'messages') not between 1 and 2000 then raise exception 'An entry needs between 1 and 2000 messages' using errcode='22023'; end if;

 select * into prior from public.journal_import_sources where user_id=uid and source=p_source and source_key=p_key;
 if found then
  update public.journal_import_batches set duplicates=duplicates+1 where id=p_batch and user_id=uid;
  return jsonb_build_object('status', case when prior.conversation_id is null then 'deleted' else 'duplicate' end, 'conversation_id', prior.conversation_id);
 end if;
 select * into prior from public.journal_import_sources where user_id=uid and fingerprint=p_fingerprint limit 1;
 if found then
  update public.journal_import_batches set duplicates=duplicates+1 where id=p_batch and user_id=uid;
  return jsonb_build_object('status', case when prior.conversation_id is null then 'deleted' else 'duplicate' end, 'conversation_id', prior.conversation_id);
 end if;

 day:=(p_entry->>'local_date')::date;
 started:=(p_entry->>'started_at')::timestamptz;
 if day is null or started is null then raise exception 'An entry needs its original date' using errcode='22023'; end if;
 if day > (now() at time zone 'utc')::date + 1 then raise exception 'An imported entry can''t be in the future' using errcode='22023'; end if;

 insert into public.journal_conversations (user_id, journal_id, companion_name, origin, mode, status, local_date, time_zone, started_at, title, title_source, summary, summary_source)
 values (uid, p_journal, left(coalesce(p_entry->>'companion_name',''),80), 'import',
  case when p_entry->>'mode' in ('morning','evening') then p_entry->>'mode' else 'open' end, 'active', day,
  left(coalesce(nullif(p_entry->>'time_zone',''),'UTC'),64), started,
  left(btrim(coalesce(p_entry->>'title','')),200), case when btrim(coalesce(p_entry->>'title',''))<>'' then 'import' end,
  left(btrim(coalesce(p_entry->>'summary','')),4000), case when btrim(coalesce(p_entry->>'summary',''))<>'' then 'import' end)
 returning id into cid;

 -- Messages in their original order. Times only ever move forward, so the order can never be reshuffled; an assistant
 -- message answers the message just before it (an opening has none), which keeps one reply per message.
 for m in select value from jsonb_array_elements(p_entry->'messages') with ordinality as x(value, i) order by i loop
  if m->>'role' not in ('user','assistant') then raise exception 'A message needs a speaker' using errcode='22023'; end if;
  if char_length(btrim(coalesce(m->>'body',''))) not between 1 and 100000 then raise exception 'A message is empty or too long' using errcode='22023'; end if;
  v_at:=coalesce((m->>'created_at')::timestamptz, started);
  if prev_at is not null and v_at <= prev_at then v_at:=prev_at + interval '1 millisecond'; end if;
  mid:=gen_random_uuid();
  insert into public.journal_messages (id, user_id, conversation_id, role, body, local_date, created_at, reply_to)
  values (mid, uid, cid, m->>'role', btrim(m->>'body'), day, v_at, case when m->>'role'='assistant' then prev end);
  if m->>'role'='user' then users:=users+1; end if;
  prev:=mid; prev_at:=v_at; n:=n+1;
 end loop;
 if users=0 then raise exception 'An entry needs at least one message of yours' using errcode='22023'; end if;

 update public.journal_conversations set status='completed', completed_at=greatest(coalesce((p_entry->>'completed_at')::timestamptz, prev_at), prev_at)
  where id=cid and user_id=uid;

 -- Tags join the existing tag records: an exact name or a confirmed alias of the same kind reuses that tag (so merges
 -- and corrections made in Muse apply); a tag removed everywhere ("never suggest again") is skipped.
 if jsonb_typeof(p_entry->'tags')='array' then
  for t in select value from jsonb_array_elements(p_entry->'tags') limit 60 loop
   v_kind:=t->>'kind'; tname:=left(btrim(regexp_replace(coalesce(t->>'name',''),'\s+',' ','g')),80);
   tsource:=case when t->>'source'='user' then 'user' else 'ai' end;
   continue when v_kind not in ('person','place','topic','theme','mood','custom') or tname='';
   select x.id into v_tag from public.journal_tags x where x.user_id=uid and x.kind=v_kind and not x.suppressed
    and (x.normalized=lower(tname) or exists (select 1 from unnest(x.aliases) a where lower(btrim(a))=lower(tname)))
    order by (x.normalized=lower(tname)) desc limit 1;
   if v_tag is null then
    if exists (select 1 from public.journal_tags x where x.user_id=uid and x.kind=v_kind and x.suppressed and x.normalized=lower(tname)) then continue; end if;
    insert into public.journal_tags (user_id, kind, name) values (uid, v_kind, tname) on conflict (user_id, kind, normalized) do nothing returning id into v_tag;
    if v_tag is null then select x.id into v_tag from public.journal_tags x where x.user_id=uid and x.kind=v_kind and x.normalized=lower(tname); end if;
   end if;
   insert into public.journal_entry_tags (user_id, conversation_id, tag_id, source) values (uid, cid, v_tag, tsource) on conflict do nothing;
   v_tag:=null;
  end loop;
 end if;

 insert into public.journal_import_sources (user_id, source, source_key, fingerprint, batch_id, conversation_id, original)
 values (uid, p_source, p_key, p_fingerprint, p_batch, cid, coalesce(p_original,'{}'));
 update public.journal_import_batches set imported=imported+1 where id=p_batch and user_id=uid;
 return jsonb_build_object('status','imported','conversation_id',cid,'messages',n);
end $$;
revoke all on function public.import_journal_entry(uuid,text,text,text,uuid,jsonb,jsonb) from public, anon;
grant execute on function public.import_journal_entry(uuid,text,text,text,uuid,jsonb,jsonb) to authenticated, service_role;

-- Remove one whole import: only that batch's imported entries (never an entry written in Muse) and their source rows,
-- so the same file can be imported again. Returns how many entries were removed.
create function public.undo_journal_import(p_batch uuid) returns integer
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid(); n integer;
begin
 if not exists (select 1 from public.journal_import_batches where id=p_batch and user_id=uid) then raise exception 'Import unavailable' using errcode='42501'; end if;
 delete from public.journal_conversations c using public.journal_import_sources s
  where s.user_id=uid and s.batch_id=p_batch and c.user_id=uid and c.id=s.conversation_id and c.origin='import';
 get diagnostics n = row_count;
 delete from public.journal_import_sources where user_id=uid and batch_id=p_batch;
 update public.journal_import_batches set status='undone', finished_at=coalesce(finished_at, now()) where id=p_batch and user_id=uid;
 return n;
end $$;
revoke all on function public.undo_journal_import(uuid) from public, anon;
grant execute on function public.undo_journal_import(uuid) to authenticated, service_role;

-- Recall by tag: for tags named in what the person just said, the newest permitted entries before p_before (at most
-- p_per_tag per tag), plus how many permitted entries each tag has overall and their date span. Runs as the person.
create function public.journal_tag_history(p_tags uuid[], p_journals uuid[], p_before date, p_per_tag integer default 4)
returns table (tag_id uuid, conversation_id uuid, local_date date, entries integer, first_date date, last_date date)
language sql stable security invoker set search_path='' as $$
 with e as (
  select et.tag_id, c.id, c.local_date, c.started_at
  from public.journal_entry_tags et join public.journal_conversations c on c.user_id=et.user_id and c.id=et.conversation_id
  where et.user_id=(select auth.uid()) and et.tag_id = any(p_tags[1:8]) and c.journal_id = any(p_journals)
   and c.status<>'draft' and not c.exclude_from_memory and c.user_words>0
 ), s as (select e.tag_id, count(*)::integer n, min(e.local_date) f, max(e.local_date) l from e group by e.tag_id),
 r as (select e.*, row_number() over (partition by e.tag_id order by e.local_date desc, e.started_at desc) k from e where e.local_date < p_before)
 select s.tag_id, r.id, r.local_date, s.n, s.f, s.l from s left join r on r.tag_id=s.tag_id and r.k <= least(greatest(coalesce(p_per_tag,4),1),12)
$$;
revoke all on function public.journal_tag_history(uuid[],uuid[],date,integer) from public, anon;
grant execute on function public.journal_tag_history(uuid[],uuid[],date,integer) to authenticated, service_role;

-- Optional enrichment: imported entries that have no ready Muse analysis yet, with their size, for a dry-run estimate.
create function public.journal_enrichment_candidates() returns table (conversation_id uuid, local_date date, chars integer, analysed boolean)
language sql stable security invoker set search_path='' as $$
 select c.id, c.local_date, coalesce((select sum(char_length(m.body)+12)::integer from public.journal_messages m where m.user_id=c.user_id and m.conversation_id=c.id),0),
  exists (select 1 from public.journal_analyses a where a.user_id=c.user_id and a.conversation_id=c.id and a.status='ready')
 from public.journal_conversations c
 where c.user_id=(select auth.uid()) and c.origin='import' and c.status='completed'
 order by c.local_date desc, c.started_at desc
$$;
revoke all on function public.journal_enrichment_candidates() from public, anon;
grant execute on function public.journal_enrichment_candidates() to authenticated, service_role;
