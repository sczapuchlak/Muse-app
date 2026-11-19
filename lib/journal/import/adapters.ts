/**
 * Source adapters: files in, ImportEntry records out (./model). Each adapter reads only what its source really
 * exports; anything it can't provide is listed in `unavailable` rather than guessed.
 *
 *  - Muse Journal export (JSON, from Journal settings → Export): fully mapped, because Muse defines that format.
 *  - Rosebud (Markdown): mapped from a real export (./rosebud). A ZIP isn't read; the Markdown file inside is.
 */
import type { Mode, TagKind } from "../model";
import { localDateIn, type ImportEntry, type ImportProblem, type ParsedImport } from "./model";
import { fromRosebud, isRosebudExport } from "./rosebud";

export type ReadFile = { name: string; size: number; text: () => Promise<string> };
export type AdapterResult = { ok: true; parsed: ParsedImport } | { ok: false; reason: string };

export const ACCEPT = ".json,.md,.markdown,.txt,.zip";
const MAX_BYTES = 80 * 1024 * 1024;

export async function readImport(files: readonly ReadFile[], opts: { timeZone?: string } = {}): Promise<AdapterResult> {
  if (!files.length) return { ok: false, reason: "Choose a file to import." };
  if (files.reduce((n, f) => n + f.size, 0) > MAX_BYTES) return { ok: false, reason: "That’s more than 80 MB. Choose fewer files at a time." };
  const kinds = new Set(files.map((f) => f.name.toLowerCase().split(".").pop() ?? ""));
  if (kinds.has("zip")) return { ok: false, reason: "Unzip it first, then choose the Markdown (.md) file inside." };
  if (kinds.has("md") || kinds.has("markdown") || kinds.has("txt")) {
    if (files.length > 1) return { ok: false, reason: "Choose the one Rosebud Markdown file." };
    const text = await files[0].text();
    if (!isRosebudExport(text)) return rosebudPending(files);
    const parsed = fromRosebud(text, files[0].name, opts.timeZone || "UTC");
    return parsed.entries.length || parsed.problems.length ? { ok: true, parsed } : { ok: false, reason: "No Rosebud entries were found in that file. Nothing was imported." };
  }
  if (files.length === 1 && kinds.has("json")) {
    let data: unknown;
    try { data = JSON.parse(await files[0].text()); } catch { return { ok: false, reason: "That JSON file couldn’t be read." }; }
    if (isMuseExport(data)) return { ok: true, parsed: fromMuseExport(data, files[0].name) };
    return { ok: false, reason: "That JSON file isn’t a Muse Journal export." };
  }
  return { ok: false, reason: "Choose a Rosebud export (Markdown or ZIP) or a Muse Journal export (JSON)." };
}

/** A Markdown file that isn't a Rosebud export: say so plainly instead of guessing at its structure. */
function rosebudPending(files: readonly ReadFile[]): AdapterResult {
  return { ok: false, reason: `That doesn’t look like a Rosebud export (it should start with “🌹 Rosebud data export”). ${files.length === 1 ? "This file wasn’t" : `These ${files.length} files weren’t`} imported or uploaded.` };
}

type MuseExport = {
  format: "Muse Journal"; version: number;
  journals: { id: string; name: string }[];
  conversations: { id: string; journal_id: string; companion_name: string; mode: string; status: string; origin?: string; local_date: string; time_zone: string; started_at: string; completed_at: string | null; title: string; summary: string }[];
  messages: { conversation_id: string; role: string; body: string; created_at: string }[];
  tags: { id: string; kind: string; name: string }[]; entryTags: { conversation_id: string; tag_id: string; source: string }[];
  analyses?: { conversation_id: string; status?: string; data?: unknown }[];
};
function isMuseExport(d: unknown): d is MuseExport {
  const x = d as MuseExport;
  return Boolean(x && x.format === "Muse Journal" && Array.isArray(x.conversations) && Array.isArray(x.messages) && Array.isArray(x.journals));
}
const tagKinds = new Set<TagKind>(["person", "place", "topic", "theme", "mood", "custom"]);

export function fromMuseExport(d: MuseExport, label: string): ParsedImport {
  const journals = new Map(d.journals.map((j) => [j.id, j.name]));
  const tags = new Map((d.tags ?? []).map((t) => [t.id, t]));
  const msgs = new Map<string, MuseExport["messages"]>();
  for (const m of d.messages) msgs.set(m.conversation_id, [...(msgs.get(m.conversation_id) ?? []), m]);
  const links = new Map<string, MuseExport["entryTags"]>();
  for (const l of d.entryTags ?? []) links.set(l.conversation_id, [...(links.get(l.conversation_id) ?? []), l]);
  const analyses = new Map((d.analyses ?? []).filter((a) => a.status === "ready").map((a) => [a.conversation_id, a.data]));
  const entries: ImportEntry[] = [], problems: ImportProblem[] = [];
  d.conversations.forEach((c, index) => {
    if (c.status === "draft") { problems.push({ index, date: c.local_date, reason: "An unfinished draft; drafts aren’t imported." }); return; }
    if (c.origin === "playground") return;
    const list = [...(msgs.get(c.id) ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const tz = c.time_zone || "UTC";
    entries.push({
      index, sourceKey: c.id, journalName: journals.get(c.journal_id) ?? "", companionName: c.companion_name ?? "",
      title: c.title ?? "", summary: c.summary ?? "", localDate: c.local_date || localDateIn(c.started_at, tz), timeZone: tz, startedAt: c.started_at, completedAt: c.completed_at,
      mode: (["morning", "evening"].includes(c.mode) ? c.mode : "open") as Mode,
      messages: list.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ role: m.role as "user" | "assistant", body: m.body, createdAt: m.created_at })),
      tags: (links.get(c.id) ?? []).flatMap((l) => { const t = tags.get(l.tag_id); return t && tagKinds.has(t.kind as TagKind) ? [{ kind: t.kind as TagKind, name: t.name, source: l.source === "user" ? "user" as const : "ai" as const }] : []; }),
      original: { source_id: c.id, time_zone_from_source: Boolean(c.time_zone), ...(analyses.has(c.id) ? { analysis: analyses.get(c.id) } : {}) },
    });
  });
  return { source: "muse", label, entries, problems, unavailable: { attachments: "Photos stay in the account they were added to; a Muse export only names them." } };
}
