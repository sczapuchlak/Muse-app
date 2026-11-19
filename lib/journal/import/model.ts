/**
 * Historical import: the one shape every source becomes before it reaches Muse. A source adapter (./muse-json, and
 * Rosebud once its real export has been inspected) turns files into ImportEntry records; everything after that —
 * validation, duplicate keys, the preview, the database call — is shared and source-agnostic. Pure, so it can be
 * tested without a browser or a database. Nothing here rewrites the person's words: bodies are only trimmed at the
 * edges, and an entry that can't be kept faithfully is reported, never "fixed".
 */
import type { Mode, TagKind } from "../model";
import { costUsd, prices } from "../pricing";
import { ANALYSIS_RULES } from "../instructions";

export type ImportSource = "rosebud" | "muse";
export const sourceLabel: Record<ImportSource, string> = { rosebud: "Rosebud", muse: "Muse Journal export" };

export type ImportMessage = { role: "user" | "assistant"; body: string; createdAt: string | null };
export type ImportTag = { kind: TagKind; name: string; source?: "user" | "ai" };
export type ImportEntry = {
  /** Position in the export, for reports that never quote the entry itself. */
  index: number;
  /** The source's own identifier for this entry, when it has one. */
  sourceKey: string | null;
  journalName: string; companionName: string;
  title: string; summary: string;
  localDate: string; timeZone: string; startedAt: string; completedAt: string | null; mode?: Mode;
  messages: ImportMessage[]; tags: ImportTag[];
  /** Source metadata kept exactly as exported (its own analysis, raw dates, fields Muse has no place for). */
  original: Record<string, unknown>;
};
export type ImportProblem = { index: number; date?: string; reason: string };
export type FieldKey = "conversation" | "assistant" | "times" | "timeZone" | "title" | "summary" | "analysis" | "tags" | "companion" | "journal" | "attachments";
export type ParsedImport = { source: ImportSource; label: string; entries: ImportEntry[]; problems: ImportProblem[];
  /** Fields this source can't provide at all, with a plain reason (shown in the preview). */
  unavailable: Partial<Record<FieldKey, string>>;
  /** Sections of the file that aren't journal entries and aren't imported (named in the preview). */
  notImported?: string[] };

export const LIMITS = { messages: 2000, body: 100000, title: 200, summary: 4000, tags: 60, original: 100000 } as const;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The calendar day an instant falls on in a time zone (UTC when the zone is unknown or invalid). */
export function localDateIn(iso: string, timeZone: string): string {
  const d = new Date(iso);
  try { return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d); }
  catch { return d.toISOString().slice(0, 10); }
}
export const validTimeZone = (tz: string) => { try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; } };

/**
 * Trims message edges and drops messages with no words, keeping order. Times that go backwards are kept as exported
 * in `original` by the adapter; here a message without a time simply has none (the database orders by position).
 */
export function normalizeEntry(e: ImportEntry): ImportEntry {
  return { ...e, title: e.title.trim(), summary: e.summary.trim(), companionName: e.companionName.trim().slice(0, 80), journalName: e.journalName.trim().slice(0, 80),
    messages: e.messages.map((m) => ({ ...m, body: m.body.replace(/^\s+|\s+$/g, "") })).filter((m) => m.body.length > 0),
    tags: dedupeTags(e.tags) };
}
function dedupeTags(tags: readonly ImportTag[]) {
  const seen = new Set<string>(), out: ImportTag[] = [];
  for (const t of tags) { const name = t.name.replace(/\s+/g, " ").trim().slice(0, 80), k = `${t.kind}:${name.toLowerCase()}`; if (name && !seen.has(k)) { seen.add(k); out.push({ ...t, name }); } }
  return out.slice(0, LIMITS.tags);
}

/** Why an entry can't be imported faithfully, or null when it can. Never alters the entry. */
export function entryProblem(e: ImportEntry, today: string): string | null {
  if (!DAY.test(e.localDate) || Number.isNaN(Date.parse(`${e.localDate}T12:00:00Z`))) return "Its date couldn’t be read.";
  if (e.localDate > today) return "Its date is in the future.";
  if (Number.isNaN(Date.parse(e.startedAt))) return "Its time couldn’t be read.";
  if (!e.messages.some((m) => m.role === "user")) return "It has no words of yours.";
  if (e.messages.length > LIMITS.messages) return `It has more than ${LIMITS.messages} messages.`;
  if (e.messages.some((m) => m.body.length > LIMITS.body)) return "One message is longer than Muse can store (100,000 characters).";
  if (e.title.length > LIMITS.title) return "Its title is longer than 200 characters.";
  if (e.summary.length > LIMITS.summary) return "Its summary is longer than 4,000 characters.";
  if (e.messages.some((m) => m.createdAt && Number.isNaN(Date.parse(m.createdAt)))) return "A message time couldn’t be read.";
  if (JSON.stringify(e.original).length > LIMITS.original) return "Its source details are too large to keep.";
  return null;
}

/** A stable fingerprint of what was said, when: the day plus every message's speaker and words (whitespace-insensitive). */
export async function fingerprint(e: Pick<ImportEntry, "localDate" | "messages">): Promise<string> {
  const text = JSON.stringify([e.localDate, ...e.messages.map((m) => [m.role, m.body.replace(/\s+/g, " ").trim()])]);
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
/** The duplicate key: the source's own id when it has one, otherwise the content fingerprint. */
export const importKey = (e: Pick<ImportEntry, "sourceKey">, fp: string) => (e.sourceKey ? `id:${e.sourceKey.slice(0, 190)}` : `fp:${fp}`);

/** The JSON the database function receives for one entry. */
export function entryPayload(e: ImportEntry) {
  return {
    title: e.title, summary: e.summary, local_date: e.localDate, time_zone: e.timeZone || "UTC", started_at: e.startedAt, completed_at: e.completedAt,
    companion_name: e.companionName, mode: e.mode ?? "open",
    messages: e.messages.map((m) => ({ role: m.role, body: m.body, created_at: m.createdAt })),
    tags: e.tags.map((t) => ({ kind: t.kind, name: t.name, source: t.source ?? "ai" })),
  };
}

export type FieldCoverage = { key: FieldKey; label: string; count: number; total: number; note?: string };
export type ImportPreview = {
  total: number; valid: number; first: string | null; last: string | null;
  messages: { user: number; assistant: number };
  journals: { name: string; count: number }[];
  fields: FieldCoverage[];
  /** Entries with no summary or analysis of their own: what optional Muse enrichment could add. */
  needsAnalysis: number;
};
const fieldLabels: Record<FieldKey, string> = {
  conversation: "Your words", assistant: "AI replies", times: "Message times", timeZone: "Time zone", title: "Titles", summary: "Summaries",
  analysis: "Analysis", tags: "Tags", companion: "Companion name", journal: "Journal name", attachments: "Attachments",
};
/** What the preview shows: how many, which dates, and which fields each entry actually carries. */
export function previewOf(p: Pick<ParsedImport, "entries" | "unavailable">, valid: readonly ImportEntry[]): ImportPreview {
  const n = valid.length, has = (f: (e: ImportEntry) => boolean) => valid.filter(f).length;
  const dates = valid.map((e) => e.localDate).sort();
  const byJournal = new Map<string, number>();
  for (const e of valid) byJournal.set(e.journalName, (byJournal.get(e.journalName) ?? 0) + 1);
  const counts: Record<FieldKey, number> = {
    conversation: has((e) => e.messages.some((m) => m.role === "user")), assistant: has((e) => e.messages.some((m) => m.role === "assistant")),
    times: has((e) => e.messages.every((m) => Boolean(m.createdAt))), timeZone: has((e) => Boolean(e.original.time_zone_from_source)),
    title: has((e) => Boolean(e.title)), summary: has((e) => Boolean(e.summary)), analysis: has((e) => Boolean(e.original.analysis)),
    tags: has((e) => e.tags.length > 0), companion: has((e) => Boolean(e.companionName)), journal: has((e) => Boolean(e.journalName)),
    attachments: has((e) => Array.isArray(e.original.attachments) && (e.original.attachments as unknown[]).length > 0),
  };
  const fields = (Object.keys(fieldLabels) as FieldKey[]).map((key) => ({ key, label: fieldLabels[key], count: counts[key], total: n, note: p.unavailable[key] }));
  return {
    total: p.entries.length, valid: n, first: dates[0] ?? null, last: dates[dates.length - 1] ?? null,
    messages: { user: valid.reduce((s, e) => s + e.messages.filter((m) => m.role === "user").length, 0), assistant: valid.reduce((s, e) => s + e.messages.filter((m) => m.role === "assistant").length, 0) },
    journals: [...byJournal.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    fields, needsAnalysis: has((e) => !e.summary && !e.original.analysis),
  };
}

/**
 * Optional enrichment, estimated before anything is spent. `typical` assumes a usual analysis length; `reserved` is
 * what Muse's spending guard sets aside before each request (every input token uncached plus the full output
 * allowance), so it is the most the batch could cost.
 */
export const ANALYSIS_OUTPUT_TYPICAL = 1500, ANALYSIS_OUTPUT_MAX = 3500;
export function enrichmentEstimate(entries: readonly { chars: number }[], model: string) {
  const known = Boolean(prices[model]);
  let typical = 0, reserved = 0;
  for (const e of entries) {
    const input = Math.ceil((ANALYSIS_RULES.length + 400 + Math.min(60000, e.chars)) / 3.8);
    typical += costUsd(known ? model : "__unknown__", { inputTokens: input, cachedTokens: 0, outputTokens: ANALYSIS_OUTPUT_TYPICAL });
    reserved += costUsd(known ? model : "__unknown__", { inputTokens: Math.ceil(input * 1.15), cachedTokens: 0, outputTokens: ANALYSIS_OUTPUT_MAX });
  }
  return { count: entries.length, typical, reserved, knownPrice: known };
}
