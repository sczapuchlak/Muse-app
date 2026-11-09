/** Intentions persistence (#117): owner-only pages, revision-checked like Reflections and the rest of Muse. */
import type { createMuseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/database.types";
import { parseSections, type IntentionSection } from "./model";
import type { IntentionPeriod } from "./periods";

type Client = ReturnType<typeof createMuseBrowserClient>;
export type IntentionPage = { id: string; period: IntentionPeriod; start: string; end: string; sections: IntentionSection[]; revision: number; updatedAt?: string };
const columns = "id,period,period_start,period_end,sections,revision,updated_at";
type Row = { id: string; period: string; period_start: string; period_end: string; sections: unknown; revision: number; updated_at: string };
const fromRow = (r: Row): IntentionPage => ({ id: r.id, period: r.period as IntentionPeriod, start: r.period_start, end: r.period_end, sections: parseSections(r.sections), revision: r.revision, updatedAt: r.updated_at });
/** Postgres "table missing" codes: this server hasn't had the Intentions migration yet. */
export const missingTable = (e: unknown) => ["PGRST205", "42P01"].includes((e as { code?: string })?.code ?? "");

export async function readIntentions(client: Client, period: IntentionPeriod, start: string): Promise<IntentionPage | null> {
  const { data, error } = await client.from("intention_pages").select(columns).eq("period", period).eq("period_start", start).maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as Row) : null;
}
/** Whether a page exists for this period (for Reflections' "Set / See intentions" link). */
export async function hasIntentions(client: Client, period: IntentionPeriod, start: string): Promise<boolean> {
  const { count, error } = await client.from("intention_pages").select("id", { count: "exact", head: true }).eq("period", period).eq("period_start", start);
  if (error) throw error;
  return (count ?? 0) > 0;
}
/** Inserts the first save (revision 0); later saves update only if nobody else saved in between. */
export async function saveIntentions(client: Client, p: IntentionPage): Promise<IntentionPage> {
  const row = { period: p.period, period_start: p.start, period_end: p.end, sections: parseSections(p.sections) as unknown as NonNullable<Json> };
  const res = p.revision === 0
    ? await client.from("intention_pages").insert({ id: p.id, ...row }).select(columns).single()
    : await client.from("intention_pages").update({ sections: row.sections }).eq("id", p.id).eq("revision", p.revision).select(columns).maybeSingle();
  if (res.error) { if (res.error.code === "23505") throw Error("This period already has intentions (maybe from another device). Reload to open them."); throw res.error; }
  if (!res.data) throw Error("These intentions changed on another device. Reload to see the latest.");
  return fromRow(res.data as Row);
}
/** Clears the page. Linked aspirations, rituals, dreams, tasks and events are untouched. */
export async function deleteIntentions(client: Client, id: string) {
  const { error } = await client.from("intention_pages").delete().eq("id", id);
  if (error) throw error;
}
