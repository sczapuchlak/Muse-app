import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { referenceContext } from "../context";
import { parseAnalysisData } from "../model";

type Client = SupabaseClient<Database>;
type Conv = Pick<Database["public"]["Tables"]["journal_conversations"]["Row"], "continues_id" | "continues_title" | "continues_date">;

/**
 * The developer note for "Continue from here", read with the person's own client (RLS: only their entries). `full`
 * includes the original conversation (bounded); otherwise only its summary, insight and threads. Empty when the entry
 * continues nothing.
 */
export async function referenceNote(client: Client, userId: string, conv: Conv, full: boolean): Promise<string> {
  if (!conv.continues_id) return conv.continues_title ? referenceContext({ title: conv.continues_title, date: conv.continues_date ?? "", summary: "", missing: true }, false) : "";
  const src = await client.from("journal_conversations").select("id,title,summary,local_date,exclude_from_memory").eq("id", conv.continues_id).eq("user_id", userId).maybeSingle();
  if (src.error) throw src.error;
  if (!src.data) return referenceContext({ title: conv.continues_title, date: conv.continues_date ?? "", summary: "", missing: true }, false);
  const s = src.data;
  if (s.exclude_from_memory) return referenceContext({ title: s.title, date: s.local_date, summary: "", excluded: true }, false);
  const an = await client.from("journal_analyses").select("data,status").eq("conversation_id", s.id).eq("user_id", userId).maybeSingle();
  const data = an.data?.status === "ready" ? parseAnalysisData(an.data.data) : null;
  let turns: { role: "user" | "assistant"; body: string; imageCount?: number }[] | undefined;
  if (full) {
    const [m, im] = await Promise.all([
      client.from("journal_messages").select("id,role,body").eq("conversation_id", s.id).eq("user_id", userId).order("created_at").limit(400),
      client.from("journal_message_images").select("message_id").eq("conversation_id", s.id).eq("user_id", userId),
    ]);
    if (m.error) throw m.error;
    const counts = new Map<string, number>(); for (const r of im.data ?? []) counts.set(r.message_id, (counts.get(r.message_id) ?? 0) + 1);
    turns = m.data.map((x) => ({ role: x.role as "user" | "assistant", body: x.body, imageCount: counts.get(x.id) }));
  }
  return referenceContext({ title: s.title, date: s.local_date, summary: s.summary, insight: data?.insight, threads: data?.threads, turns }, full);
}
