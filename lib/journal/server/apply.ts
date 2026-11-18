import "server-only";
/**
 * Stores a finished analysis (Journal V1 addendum §3–4). The analysis row is separate from the conversation. A title
 * or summary the person wrote is never replaced. People, places, topics and themes attach as `source: 'ai'` tags,
 * reusing an existing tag only on an exact name or configured alias. Proposed memories are saved as *suggested*,
 * never confirmed, and never duplicate an existing memory.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { cleanTagName, findTag, normalizeTag, tagFromRow, type AnalysisData, type TagKind } from "../model";

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
    ...data.people.map((n) => ["person", n] as [TagKind, string]), ...data.places.map((n) => ["place", n] as [TagKind, string]),
    ...data.topics.map((n) => ["topic", n] as [TagKind, string]), ...data.themes.map((n) => ["theme", n] as [TagKind, string]), ...data.emotions.map((n) => ["mood", n] as [TagKind, string]),
  ].map(([k, n]) => [k, cleanTagName(n)] as [TagKind, string]).filter(([, n]) => n.length > 0);
  if (wanted.length) {
    const existing = await client.from("journal_tags").select("*").eq("user_id", userId).limit(5000);
    if (existing.error) throw existing.error;
    const tags = existing.data.map(tagFromRow), ids: string[] = [];
    // Tags the person removed from this entry before are remembered in the analysis' dismissed list and not re-added.
    const prior = await client.from("journal_analyses").select("dismissed").eq("conversation_id", conv.id).eq("user_id", userId).maybeSingle();
    const dismissed = new Set((prior.data?.dismissed ?? []).map((d) => d.toLowerCase()));
    for (const [kind, name] of wanted) {
      if (dismissed.has(`tag:${kind}:${normalizeTag(name)}`)) continue;
      let tag = findTag(tags, kind, name);
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
    const have = await client.from("journal_memories").select("body").eq("user_id", userId).limit(2000);
    if (have.error) throw have.error;
    const known = new Set(have.data.map((m) => m.body.trim().toLowerCase()));
    const fresh = data.memories.filter((m) => !known.has(m.trim().toLowerCase()));
    if (fresh.length) {
      const ins = await client.from("journal_memories").insert(fresh.map((body) => ({ user_id: userId, body: body.slice(0, 1000), kind: "fact", status: "suggested", source: "ai", source_conversation_id: conv.id })));
      if (ins.error) throw ins.error;
    }
  }
  const ready = await client.from("journal_conversations").update({ analysis_status: "ready" }).eq("id", conv.id).eq("user_id", userId);
  if (ready.error) throw ready.error;
  return saved.data;
}
