import "server-only";
/**
 * Stores a finished analysis (Journal V1 addendum §3–4). The analysis row is separate from the conversation. A title
 * or summary the person wrote is never replaced. People, topics and moods attach as `source: 'ai'` tags,
 * reusing an existing tag only on an exact name or configured alias. Proposed memories are saved as *suggested*,
 * never confirmed, and never duplicate an existing memory.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { allPages } from "@/lib/supabase/pages";
import { cleanTagName, findTag, memoryOverlap, normalizeMemory, normalizeTag, tagFromRow, type AnalysisData, type TagKind } from "../model";

/** Historical (imported) entries: at most this many suggestions each, and this many waiting from imports at once. */
export const HISTORICAL_SUGGESTIONS = { perEntry: 2, waiting: 30 } as const;

type Client = SupabaseClient<Database>;
type Conv = Database["public"]["Tables"]["journal_conversations"]["Row"];

export async function applyAnalysis(client: Client, userId: string, conv: Conv, data: AnalysisData, model: string) {
  const saved = await client.from("journal_analyses").upsert({ user_id: userId, conversation_id: conv.id, status: "ready", data: data as unknown as NonNullable<Json>, model, error: null }, { onConflict: "user_id,conversation_id" }).select("*").single();
  if (saved.error) throw saved.error;

  // Title and summary first; the entry is marked ready only after its tags and suggestions exist (see the end).
  const patch: Database["public"]["Tables"]["journal_conversations"]["Update"] = {};
  if (data.title && (!conv.title.trim() || conv.title_source === "ai")) { patch.title = data.title; patch.title_source = "ai"; }
  if (data.recap && (!conv.summary.trim() || conv.summary_source === "ai")) { patch.summary = data.recap; patch.summary_source = "ai"; }
  if (Object.keys(patch).length) { const up = await client.from("journal_conversations").update(patch).eq("id", conv.id).eq("user_id", userId); if (up.error) throw up.error; }

  const wanted: [TagKind, string][] = [
    // People, topics and moods only. (Places and themes are no longer made; older ones stay as they are.)
    ...data.people.map((n) => ["person", n] as [TagKind, string]), ...data.topics.map((n) => ["topic", n] as [TagKind, string]), ...data.emotions.map((n) => ["mood", n] as [TagKind, string]),
  ].map(([k, n]) => [k, cleanTagName(n)] as [TagKind, string]).filter(([, n]) => n.length > 0);
  if (wanted.length) {
    // Every existing tag (in pages past the API's 1000-row cap), so a known name is reused rather than missed.
    const tags = (await allPages((a, z) => client.from("journal_tags").select("*").eq("user_id", userId).order("id").range(a, z))).map(tagFromRow), ids: string[] = [];
    // Tags the person removed from this entry before are remembered in the analysis' dismissed list and not re-added.
    const prior = await client.from("journal_analyses").select("dismissed").eq("conversation_id", conv.id).eq("user_id", userId).maybeSingle();
    const dismissed = new Set((prior.data?.dismissed ?? []).map((d) => d.toLowerCase()));
    for (const [kind, name] of wanted) {
      if (dismissed.has(`tag:${kind}:${normalizeTag(name)}`)) continue;
      let tag = findTag(tags, kind, name);
      if (tag?.suppressed) continue; // removed everywhere and asked never to suggest again
      if (!tag) {
        const made = await client.from("journal_tags").upsert({ user_id: userId, kind, name }, { onConflict: "user_id,kind,normalized", ignoreDuplicates: false }).select("*").single();
        if (made.error) throw made.error;
        tag = tagFromRow(made.data); tags.push(tag);
      }
      if (!ids.includes(tag.id)) ids.push(tag.id);
    }
    if (ids.length) {
      const links = await client.from("journal_entry_tags").upsert(ids.map((tag_id) => ({ user_id: userId, conversation_id: conv.id, tag_id, source: "ai" })), { onConflict: "user_id,conversation_id,tag_id", ignoreDuplicates: true });
      if (links.error) throw links.error;
    }
  }

  if (data.memories.length) {
    // Never re-propose: words you already have (any status, compared loosely), or words you dismissed or corrected
    // away for this entry. Suggestions never change a confirmed memory; they only ever wait for your approval.
    const have = { data: await allPages((a, z) => client.from("journal_memories").select("id,body,status,source,source_conversation_id").eq("user_id", userId).order("id").range(a, z)) };
    const prior = await client.from("journal_analyses").select("dismissed").eq("conversation_id", conv.id).eq("user_id", userId).maybeSingle();
    const known = new Set([...have.data.map((m) => normalizeMemory(m.body)), ...(prior.data?.dismissed ?? []).filter((d) => d.startsWith("memory:")).map((d) => d.slice(7))]);
    let fresh = [...new Set(data.memories.map((m) => m.trim()).filter(Boolean))].filter((m) => !known.has(normalizeMemory(m)));
    if (conv.origin === "import") {
      // An archive analysed in bulk would otherwise repeat the same person or situation dozens of times: skip anything
      // close to a memory already known or waiting, keep a few per entry, and stop while many imported ones wait.
      const waitingFromImports = have.data.filter((m) => m.status === "suggested" && m.source === "ai" && m.source_conversation_id).length;
      fresh = fresh.filter((m) => !have.data.some((x) => memoryOverlap(x.body, m) >= 0.6)).slice(0, Math.max(0, Math.min(HISTORICAL_SUGGESTIONS.perEntry, HISTORICAL_SUGGESTIONS.waiting - waitingFromImports)));
    }
    if (fresh.length) {
      const ins = await client.from("journal_memories").insert(fresh.map((body) => ({ user_id: userId, body: body.slice(0, 1000), kind: "fact", status: "suggested", source: "ai", source_conversation_id: conv.id })));
      if (ins.error) throw ins.error;
    }
  }
  const ready = await client.from("journal_conversations").update({ analysis_status: "ready" }).eq("id", conv.id).eq("user_id", userId);
  if (ready.error) throw ready.error;
  return saved.data;
}
