/**
 * Runs an import from the browser, one entry per database call (all or nothing per entry), a few at a time, so a
 * large export never becomes one long request that can time out, and a failure costs only that entry. Re-running the
 * same export is safe: every entry carries its duplicate key, and the database refuses to import a key twice.
 * Progress and the final report never contain journal text, only counts, positions and dates.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { entryPayload, fingerprint, importKey, type ImportEntry, type ImportSource } from "./model";

type Client = SupabaseClient<Database>;
export type EntryOutcome = { index: number; date: string; status: "imported" | "duplicate" | "deleted" | "failed"; conversationId?: string | null; reason?: string };
export type ImportReport = { imported: number; duplicates: number; deleted: number; failed: number; outcomes: EntryOutcome[]; stopped: boolean };
export type ImportOne = (e: ImportEntry, key: string, fp: string) => Promise<{ status: "imported" | "duplicate" | "deleted"; conversation_id?: string | null }>;

export async function runImport(entries: readonly ImportEntry[], importOne: ImportOne, opts: { concurrency?: number; signal?: AbortSignal; onProgress?: (done: number, total: number) => void } = {}): Promise<ImportReport> {
  const outcomes: EntryOutcome[] = new Array(entries.length);
  let next = 0, done = 0;
  async function worker() {
    while (next < entries.length && !opts.signal?.aborted) {
      const i = next++, e = entries[i];
      try {
        const fp = await fingerprint(e);
        const r = await importOne(e, importKey(e, fp), fp);
        outcomes[i] = { index: e.index, date: e.localDate, status: r.status, conversationId: r.conversation_id ?? null };
      } catch (err) {
        outcomes[i] = { index: e.index, date: e.localDate, status: "failed", reason: plainReason(err) };
      }
      opts.onProgress?.(++done, entries.length);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(opts.concurrency ?? 3, 6)) }, worker));
  const list = outcomes.filter(Boolean);
  const count = (s: EntryOutcome["status"]) => list.filter((o) => o.status === s).length;
  return { imported: count("imported"), duplicates: count("duplicate"), deleted: count("deleted"), failed: count("failed"), outcomes: list, stopped: list.length < entries.length };
}
/** A database error's own plain words (they never contain the entry's text), or a generic line. */
function plainReason(e: unknown) { const m = (e as { message?: string })?.message ?? ""; return m && m.length < 160 && !/\n/.test(m) ? m : "Muse couldn’t save this entry."; }

const must = <T,>(r: { data: T | null; error: unknown }): T => { if (r.error) throw Object.assign(Error((r.error as { message?: string }).message ?? "Something went wrong."), { code: (r.error as { code?: string }).code }); return r.data as T; };

export async function startBatch(client: Client, userId: string, source: ImportSource, label: string, detected: number) {
  return must(await client.from("journal_import_batches").insert({ user_id: userId, source, label: label.slice(0, 200), detected }).select("*").single()) as Batch;
}
export function importer(client: Client, batchId: string, source: ImportSource, journalFor: (e: ImportEntry) => string): ImportOne {
  return async (e, key, fp) => must(await client.rpc("import_journal_entry", { p_batch: batchId, p_source: source, p_key: key, p_fingerprint: fp, p_journal: journalFor(e), p_entry: entryPayload(e) as unknown as Json, p_original: e.original as Json })) as unknown as Awaited<ReturnType<ImportOne>>;
}
export async function finishBatch(client: Client, userId: string, batchId: string, r: ImportReport, extra: Record<string, unknown>) {
  const status = r.failed === 0 && !r.stopped ? "complete" : r.imported > 0 || r.duplicates > 0 ? "partial" : "failed";
  // Failures and positions only; never the words of an entry.
  const report = { ...extra, deleted: r.deleted, stopped: r.stopped, failures: r.outcomes.filter((o) => o.status === "failed").slice(0, 300).map((o) => ({ index: o.index, date: o.date, reason: o.reason })) };
  return must(await client.from("journal_import_batches").update({ status, failed: r.failed, report: report as unknown as NonNullable<Json>, finished_at: new Date().toISOString() }).eq("id", batchId).eq("user_id", userId).select("*").single());
}

export type Batch = Database["public"]["Tables"]["journal_import_batches"]["Row"];
export async function listBatches(client: Client, userId: string): Promise<Batch[]> {
  const r = await client.from("journal_import_batches").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
  return r.error ? [] : r.data;
}
/** Keys and fingerprints already imported for a source, to count duplicates in the preview before anything is written. */
export async function knownImports(client: Client, userId: string, source: ImportSource) {
  const keys = new Map<string, string | null>(), fps = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const r = await client.from("journal_import_sources").select("source_key,fingerprint,conversation_id").eq("user_id", userId).eq("source", source).range(from, from + 999);
    if (r.error) break;
    for (const x of r.data) { keys.set(x.source_key, x.conversation_id); fps.add(x.fingerprint); }
    if (r.data.length < 1000) break;
  }
  return { keys, fps };
}
export async function undoBatch(client: Client, batchId: string) { return must(await client.rpc("undo_journal_import", { p_batch: batchId })) as number; }
export async function enrichmentCandidates(client: Client) { return must(await client.rpc("journal_enrichment_candidates")); }
/** Which entries were imported, and from where (for the quiet "Imported from Rosebud" note on an entry). */
export async function importOrigins(client: Client, userId: string) {
  const out = new Map<string, string>();
  for (let from = 0; ; from += 1000) {
    const r = await client.from("journal_import_sources").select("conversation_id,source").eq("user_id", userId).not("conversation_id", "is", null).range(from, from + 999);
    if (r.error) break;
    for (const x of r.data) if (x.conversation_id) out.set(x.conversation_id, x.source);
    if (r.data.length < 1000) break;
  }
  return out;
}
