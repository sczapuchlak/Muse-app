-- Journal: "My tags" (custom, user-created tags) and a search that finds a memory without its date.
-- Additive. Custom tags are a separate kind ('custom'), so they stay distinct from AI-found people, places, topics,
-- themes and moods; analysis only ever adds 'ai' links and never touches them. Reuses journal_tags (normalized
-- unique names, aliases, rename and merge) and journal_entry_tags (owner RLS) unchanged.

alter table public.journal_tags drop constraint if exists journal_tags_kind_check;
alter table public.journal_tags add constraint journal_tags_kind_check check (kind in ('person','place','topic','theme','mood','custom'));

-- Search (no AI): full-text over titles, summaries and messages as before, plus case-insensitive partial matches
-- ("Ror" finds Rory) in messages, titles, summaries and saved analyses, and tag names and aliases of every kind,
-- including My tags. Results span the whole journal; the caller filters further on the device.
create or replace function public.search_journal(p_query text, p_limit integer default 60) returns table (conversation_id uuid, rank real, snippet text)
language sql stable security invoker set search_path='' as $$
 with input as (select btrim(coalesce(p_query,'')) as raw),
 q as (select websearch_to_tsquery('english'::regconfig, raw) as q,
   '%' || replace(replace(replace(lower(raw), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat,
   regexp_replace(raw, '([.*+?^${}()|\[\]\\])', '\\\1', 'g') as rx,
   char_length(raw) >= 2 as partial from input),
 hits as (
  select c.id as conversation_id, ts_rank(c.search,q.q)*2 as rank, nullif(c.summary,'') as body, true as fts
   from public.journal_conversations c, q where c.user_id=(select auth.uid()) and c.status<>'draft' and c.search @@ q.q
  union all
  select m.conversation_id, ts_rank(m.search,q.q), m.body, true
   from public.journal_messages m, q where m.user_id=(select auth.uid()) and m.search @@ q.q
  union all
  select c.id, 0.6, coalesce(nullif(c.summary,''), c.title), false
   from public.journal_conversations c, q where q.partial and c.user_id=(select auth.uid()) and c.status<>'draft'
    and (lower(c.title) like q.pat or lower(c.summary) like q.pat)
  union all
  select m.conversation_id, 0.4, m.body, false
   from public.journal_messages m, q where q.partial and m.user_id=(select auth.uid()) and lower(m.body) like q.pat
  union all
  select a.conversation_id, 0.3, null, false
   from public.journal_analyses a, q where q.partial and a.user_id=(select auth.uid()) and lower(a.data::text) like q.pat
  union all
  select et.conversation_id, 2.5, case when t.kind='custom' then '#' else '' end || t.name, false
   from public.journal_entry_tags et join public.journal_tags t on t.user_id=et.user_id and t.id=et.tag_id, q
   where q.partial and et.user_id=(select auth.uid())
    and (t.normalized like q.pat or exists (select 1 from unnest(t.aliases) al where lower(al) like q.pat))
 ),
 ranked as (
  select h.conversation_id, h.rank,
   case when h.body is null then null
    when h.fts then ts_headline('english'::regconfig, h.body, (select q from q), 'MaxWords=28,MinWords=10,StartSel=«,StopSel=»')
    else regexp_replace(
      substr(h.body, greatest(1, strpos(lower(h.body), lower((select raw from input))) - 70), 190),
      (select rx from q), '«\&»', 'gi') end as snippet
  from hits h
 )
 select r.conversation_id, max(r.rank)::real, (array_agg(r.snippet order by r.rank desc) filter (where r.snippet is not null))[1]
 from ranked r join public.journal_conversations c on c.id=r.conversation_id and c.user_id=(select auth.uid()) and c.status<>'draft'
 group by r.conversation_id order by 2 desc limit least(greatest(coalesce(p_limit,60),1),200)
$$;
revoke all on function public.search_journal(text,integer) from public,anon;
grant execute on function public.search_journal(text,integer) to authenticated,service_role;
