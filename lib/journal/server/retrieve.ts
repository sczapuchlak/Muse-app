import "server-only";
/**
 * Loads the records a Journal AI request may draw on, always with the signed-in person's own client (RLS), so another
 * person's journal can never be read here. Decisions about what is permitted and what fits live in ../context.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { journalFromRow, memoryFromRow, preferencesFromRow, tagFromRow, type Journal, type Memory, type Preferences, type Tag } from "../model";
import { matchEntities, memoryContext, memoryPermission, permittedMemories, rankRetrieved, retrievalQuery, type Candidate, type EntityHit, type MemoryContext } from "../context";
import { addDays } from "../stats";

type Client = SupabaseClient<Database>;
const must = <T,>(r: { data: T | null; error: unknown }): T => { if (r.error) throw r.error; return r.data as T; };

export type Basics = { prefs: Preferences; journals: Journal[]; memories: Memory[]; tags: Tag[] };
export async function basics(client: Client, userId: string): Promise<Basics> {
  const [p, j, m, t] = await Promise.all([
    client.from("journal_preferences").select("*").eq("user_id", userId).maybeSingle(),
    client.from("journal_journals").select("*").eq("user_id", userId).limit(500),
    // Pinned first, then newest: the same size budget decides how many fit, so pinning adds no tokens.
    client.from("journal_memories").select("*").eq("user_id", userId).eq("status", "confirmed").order("pinned", { ascending: false }).order("updated_at", { ascending: false }).limit(200),
    // Tags recall can follow: people, places, topics and their own tags (not moods or themes), never removed ones.
    client.from("journal_tags").select("*").eq("user_id", userId).in("kind", ["person", "place", "topic", "custom"]).eq("suppressed", false).limit(5000),
  ]);
  return { prefs: preferencesFromRow(must(p)), journals: must(j).map(journalFromRow), memories: must(m).map(memoryFromRow), tags: must(t).map(tagFromRow) };
}

type Row = Database["public"]["Tables"]["journal_conversations"]["Row"];
const candidate = (r: Row): Candidate => ({ id: r.id, journalId: r.journal_id, localDate: r.local_date, title: r.title, summary: r.summary, summarySource: r.summary_source as Candidate["summarySource"], status: r.status as Candidate["status"], excludeFromMemory: r.exclude_from_memory, userWords: r.user_words, mode: r.mode as Candidate["mode"], importedFrom: r.origin === "import" ? "import" : null });
const COLUMNS = "id,journal_id,local_date,title,summary,summary_source,status,exclude_from_memory,user_words,mode,origin";

/** Adds the person's own opening words (for entries without a summary) and confirmed tag names. */
async function enrich(client: Client, userId: string, list: Candidate[]) {
  if (!list.length) return list;
  const ids = list.map((c) => c.id);
  const [msgs, links] = await Promise.all([
    client.from("journal_messages").select("conversation_id,body,created_at").eq("user_id", userId).eq("role", "user").in("conversation_id", ids).order("created_at").limit(ids.length * 3),
    client.from("journal_entry_tags").select("conversation_id,journal_tags(name)").eq("user_id", userId).in("conversation_id", ids).limit(ids.length * 12),
  ]);
  const first = new Map<string, string>();
  for (const m of must(msgs)) if (!first.has(m.conversation_id)) first.set(m.conversation_id, m.body.slice(0, 600));
  const tags = new Map<string, string[]>();
  for (const l of must(links) as { conversation_id: string; journal_tags: { name: string } | null }[]) if (l.journal_tags) tags.set(l.conversation_id, [...(tags.get(l.conversation_id) ?? []), l.journal_tags.name]);
  // Imported entries say where they came from, so the companion never mistakes another app's replies for its own.
  const imported = list.filter((c) => c.importedFrom).map((c) => c.id);
  const origins = new Map<string, string>();
  if (imported.length) { const r = await client.from("journal_import_sources").select("conversation_id,source").eq("user_id", userId).in("conversation_id", imported); for (const x of r.data ?? []) if (x.conversation_id) origins.set(x.conversation_id, x.source); }
  return list.map((c) => ({ ...c, excerpt: c.excerpt || first.get(c.id), tags: tags.get(c.id), importedFrom: c.importedFrom ? origins.get(c.id) ?? "import" : null }));
}

/**
 * The memory context for one conversation in one journal. `latest` drives retrieval of older entries; `earlier` (their
 * previous few messages in this conversation) only keeps people, places and topics they named in play for follow-ups.
 */
export async function loadMemory(client: Client, userId: string, b: Basics, journal: Journal, opts: { currentId: string | null; memoryOff: boolean; today: string; latest: string; earlier?: string[] }): Promise<MemoryContext> {
  const permission = memoryPermission(b.prefs, journal, b.journals, { memoryOff: opts.memoryOff });
  if (!permission.allowed) return { stable: "", retrieved: "", used: { memories: [], recent: [], retrieved: [] } };
  const ids = [...permission.journalIds], before = addDays(opts.today, -7);
  const recentRows = must(await client.from("journal_conversations").select(COLUMNS).eq("user_id", userId).in("journal_id", ids).neq("status", "draft").eq("exclude_from_memory", false)
    .gte("local_date", before).lte("local_date", opts.today).order("local_date", { ascending: false }).order("started_at", { ascending: false }).limit(12)) as Row[];

  // 1. People, places and topics they named → entries tagged with them (canonical tags, so merges and aliases apply).
  const entities = matchEntities(b.tags, opts.latest, opts.earlier ?? []);
  const byEntity: { name: string; ids: string[] }[] = [], hits: EntityHit[] = [];
  if (entities.length) {
    const rows = must(await client.rpc("journal_tag_history", { p_tags: entities.map((e) => e.tagId), p_journals: ids, p_before: before, p_per_tag: 4 }));
    for (const e of entities) {
      const mine = rows.filter((r) => r.tag_id === e.tagId);
      if (!mine.length) continue;
      hits.push({ name: e.name, kind: e.kind, aliases: e.aliases, entries: mine[0].entries, first: mine[0].first_date, last: mine[0].last_date });
      byEntity.push({ name: e.name, ids: mine.filter((r) => r.conversation_id && r.local_date).sort((x, y) => (y.local_date ?? "").localeCompare(x.local_date ?? "")).map((r) => r.conversation_id as string) });
    }
  }
  // 2. Full-text search on the latest message's distinctive words and the names in it.
  const named = entities.filter((e) => e.inLatest && (e.kind === "person" || e.kind === "place")).map((e) => e.name);
  const query = opts.latest.trim() ? retrievalQuery(opts.latest, named) : "";
  const snippets = new Map<string, string>();
  const searchIds: string[] = [];
  if (query) {
    const found = must(await client.rpc("search_journal", { p_query: query, p_limit: 12 })) as { conversation_id: string; snippet: string }[];
    for (const h of found) if (h.conversation_id !== opts.currentId && !snippets.has(h.conversation_id)) { snippets.set(h.conversation_id, h.snippet?.replace(/[«»]/g, "") ?? ""); searchIds.push(h.conversation_id); }
  }
  // 3. One bounded, permission-checked read of the chosen entries, in rank order.
  const ranked = rankRetrieved(byEntity, searchIds.filter((id) => id !== opts.currentId));
  let retrieved: Candidate[] = [];
  if (ranked.length) {
    const rows = must(await client.from("journal_conversations").select(COLUMNS).eq("user_id", userId).in("id", ranked.map((r) => r.id)).in("journal_id", ids).neq("status", "draft").eq("exclude_from_memory", false).lt("local_date", before)) as Row[];
    const byId = new Map(rows.map((r) => [r.id, r]));
    retrieved = ranked.flatMap((r) => { const row = byId.get(r.id); return row ? [{ ...candidate(row), snippet: snippets.get(r.id) || undefined, why: r.why }] : []; });
  }
  const recent = await enrich(client, userId, recentRows.map(candidate));
  retrieved = await enrich(client, userId, retrieved);
  return memoryContext({
    memories: permittedMemories(b.memories, permission, journal.id), recent, retrieved, entities: hits, journals: new Map(b.journals.map((j) => [j.id, j.name])), today: opts.today, currentId: opts.currentId, permission,
  });
}
