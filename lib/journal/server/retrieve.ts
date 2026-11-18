import "server-only";
/**
 * Loads the records a Journal AI request may draw on, always with the signed-in person's own client (RLS), so another
 * person's journal can never be read here. Decisions about what is permitted and what fits live in ../context.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { journalFromRow, memoryFromRow, preferencesFromRow, tagFromRow, type Journal, type Memory, type Preferences, type Tag } from "../model";
import { memoryContext, memoryPermission, permittedMemories, retrievalQuery, type Candidate, type MemoryContext } from "../context";
import { addDays } from "../stats";

type Client = SupabaseClient<Database>;
const must = <T,>(r: { data: T | null; error: unknown }): T => { if (r.error) throw r.error; return r.data as T; };

export type Basics = { prefs: Preferences; journals: Journal[]; memories: Memory[]; tags: Tag[] };
export async function basics(client: Client, userId: string): Promise<Basics> {
  const [p, j, m, t] = await Promise.all([
    client.from("journal_preferences").select("*").eq("user_id", userId).maybeSingle(),
    client.from("journal_journals").select("*").eq("user_id", userId).limit(500),
    client.from("journal_memories").select("*").eq("user_id", userId).eq("status", "confirmed").order("updated_at", { ascending: false }).limit(200),
    client.from("journal_tags").select("*").eq("user_id", userId).in("kind", ["person", "place"]).limit(2000),
  ]);
  return { prefs: preferencesFromRow(must(p)), journals: must(j).map(journalFromRow), memories: must(m).map(memoryFromRow), tags: must(t).map(tagFromRow) };
}

type Row = Database["public"]["Tables"]["journal_conversations"]["Row"];
const candidate = (r: Row): Candidate => ({ id: r.id, journalId: r.journal_id, localDate: r.local_date, title: r.title, summary: r.summary, summarySource: r.summary_source as Candidate["summarySource"], status: r.status as Candidate["status"], excludeFromMemory: r.exclude_from_memory, userWords: r.user_words, mode: r.mode as Candidate["mode"] });
const COLUMNS = "id,journal_id,local_date,title,summary,summary_source,status,exclude_from_memory,user_words,mode";

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
  return list.map((c) => ({ ...c, excerpt: c.excerpt || first.get(c.id), tags: tags.get(c.id) }));
}

/** The memory context for one conversation in one journal. `latest` drives retrieval of older entries. */
export async function loadMemory(client: Client, userId: string, b: Basics, journal: Journal, opts: { currentId: string | null; memoryOff: boolean; today: string; latest: string }): Promise<MemoryContext> {
  const permission = memoryPermission(b.prefs, journal, b.journals, { memoryOff: opts.memoryOff });
  if (!permission.allowed) return { stable: "", retrieved: "", used: { memories: [], recent: [], retrieved: [] } };
  const ids = [...permission.journalIds];
  const recentRows = must(await client.from("journal_conversations").select(COLUMNS).eq("user_id", userId).in("journal_id", ids).neq("status", "draft").eq("exclude_from_memory", false)
    .gte("local_date", addDays(opts.today, -7)).lte("local_date", opts.today).order("local_date", { ascending: false }).order("started_at", { ascending: false }).limit(12)) as Row[];
  let retrieved: Candidate[] = [];
  const named = b.tags.filter((t) => [t.name, ...t.aliases].some((n) => n.length > 1 && new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(opts.latest))).map((t) => t.name);
  const query = opts.latest.trim() ? retrievalQuery(opts.latest, named) : "";
  if (query) {
    const hits = must(await client.rpc("search_journal", { p_query: query, p_limit: 12 })) as { conversation_id: string; snippet: string }[];
    const hitIds = hits.map((h) => h.conversation_id).filter((id) => id !== opts.currentId);
    if (hitIds.length) {
      const rows = must(await client.from("journal_conversations").select(COLUMNS).eq("user_id", userId).in("id", hitIds).in("journal_id", ids).eq("exclude_from_memory", false).lt("local_date", addDays(opts.today, -7))) as Row[];
      const byId = new Map(rows.map((r) => [r.id, r]));
      retrieved = hits.flatMap((h) => { const r = byId.get(h.conversation_id); return r ? [{ ...candidate(r), excerpt: h.snippet?.replace(/[«»]/g, "") }] : []; });
    }
  }
  const recent = await enrich(client, userId, recentRows.map(candidate));
  retrieved = await enrich(client, userId, retrieved);
  return memoryContext({
    memories: permittedMemories(b.memories, permission, journal.id), recent, retrieved, journals: new Map(b.journals.map((j) => [j.id, j.name])), today: opts.today, currentId: opts.currentId, permission,
  });
}
