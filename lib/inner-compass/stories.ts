/**
 * Inner Compass, Phase 2 (#211): Chapters (seasons of life), Experiences (moments lived; one authoritative record
 * each) and Collections (groupings of Experiences). Pure model: rows ⇄ records, status, search and sorting.
 *
 * - A Chapter is never measured: no completion, progress or scores. Its status comes from the person's own dates and
 *   whether they chose to close it.
 * - An Experience exists on its own. Chapters and Collections refer to it; unlinking never deletes it.
 */
import type { Tables } from "@/lib/database.types";
import type { BoardImage } from "@/lib/constellation-board";
import { isImage, isModuleType, parseContent, type Content, type ModuleType } from "./modules";

// ---------- Covers ----------
export const coverPresets = [
  { id: "nocturne", label: "Nocturne", line: "Midnight sky, a gold constellation" },
  { id: "aurora", label: "Aurora", line: "Ribbons of northern light" },
  { id: "dawn", label: "First Light", line: "A rose-gold horizon" },
  { id: "atlas", label: "Atlas", line: "An old star map in ink" },
  { id: "bloom", label: "Bloom", line: "Petal light, soft and warm" },
  { id: "eclipse", label: "Eclipse", line: "A black sun with a golden ring" },
] as const;
export type CoverPreset = typeof coverPresets[number]["id"];
export type Cover = { preset: CoverPreset; accent?: string; image?: BoardImage; board?: { id: string; label: string } };
const hex = (v: unknown) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : undefined;
const obj = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
export function parseCover(v: unknown, fallback: CoverPreset = "nocturne"): Cover {
  const o = obj(v), preset = coverPresets.find((p) => p.id === o.preset)?.id ?? fallback, b = obj(o.board);
  return { preset, ...(hex(o.accent) ? { accent: hex(o.accent) } : {}), ...(isImage(o.image) ? { image: o.image as BoardImage } : {}),
    ...(typeof b.id === "string" && /^[0-9a-f-]{36}$/.test(b.id) ? { board: { id: b.id, label: typeof b.label === "string" ? b.label.slice(0, 120) : "" } } : {}) };
}
/** A stable preset for a new record, so a list of Chapters isn't six identical covers. */
export const presetFor = (seed: string): CoverPreset => coverPresets[[...seed].reduce((n, c) => n + c.charCodeAt(0), 0) % coverPresets.length].id;

// ---------- Chapters ----------
export type ClosingAnswers = Partial<Record<"defined" | "learned" | "grateful" | "carrying" | "leaving" | "deepened", string>>;
export const closingPrompts: { key: keyof ClosingAnswers; text: string }[] = [
  { key: "defined", text: "What defined this chapter?" }, { key: "learned", text: "What did I learn about myself?" }, { key: "grateful", text: "What am I grateful for?" },
  { key: "carrying", text: "What am I carrying forward?" }, { key: "leaving", text: "What am I leaving behind?" }, { key: "deepened", text: "Which discoveries changed or deepened?" },
];
export type Chapter = {
  id: string; title: string; subtitle: string; word: string; meaning: string; startsOn: string | null; endsOn: string | null; cover: Cover;
  isPrimary: boolean; showOnDaily: boolean; closing: ClosingAnswers; closedAt: string | null; archivedAt: string | null;
  carriedFrom: string | null; carriedFromTitle: string | null; revision: number; createdAt: string; updatedAt: string;
};
export type ChapterStatus = "current" | "upcoming" | "completed" | "undated" | "archived";
export const statusLabels: Record<ChapterStatus, string> = { current: "Current", upcoming: "Upcoming", completed: "Completed", undated: "Undated", archived: "Archived" };
/** From the person's own dates and choices only. A Chapter whose end date has passed reads as completed. */
export function chapterStatus(c: Pick<Chapter, "startsOn" | "endsOn" | "closedAt" | "archivedAt">, today: string): ChapterStatus {
  if (c.archivedAt) return "archived";
  if (c.closedAt) return "completed";
  if (!c.startsOn && !c.endsOn) return "undated";
  if (c.startsOn && c.startsOn > today) return "upcoming";
  if (c.endsOn && c.endsOn < today) return "completed";
  return "current";
}
const parseClosing = (v: unknown): ClosingAnswers => Object.fromEntries(closingPrompts.flatMap((p) => { const x = obj(v)[p.key]; return typeof x === "string" && x.trim() ? [[p.key, x.slice(0, 6000)]] : []; }));
export function chapterFromRow(r: Tables<"inner_chapters">): Chapter {
  return { id: r.id, title: r.title, subtitle: r.subtitle, word: r.word, meaning: r.meaning, startsOn: r.starts_on, endsOn: r.ends_on, cover: parseCover(r.cover, presetFor(r.id)),
    isPrimary: r.is_primary, showOnDaily: r.show_on_daily, closing: parseClosing(r.closing), closedAt: r.closed_at, archivedAt: r.archived_at,
    carriedFrom: r.carried_from, carriedFromTitle: r.carried_from_title, revision: r.revision, createdAt: r.created_at, updatedAt: r.updated_at };
}
export function chapterToRow(c: Chapter) {
  return { title: c.title.trim().slice(0, 160), subtitle: c.subtitle.slice(0, 200), word: c.word.trim().slice(0, 60), meaning: c.meaning.slice(0, 4000),
    starts_on: c.startsOn, ends_on: c.startsOn && c.endsOn && c.endsOn < c.startsOn ? c.startsOn : c.endsOn, cover: c.cover, is_primary: c.isPrimary && !c.archivedAt, show_on_daily: c.showOnDaily,
    closing: c.closing, closed_at: c.closedAt, archived_at: c.archivedAt, carried_from: c.carriedFrom, carried_from_title: c.carriedFromTitle };
}
export function blankChapter(now = new Date().toISOString(), id: string = crypto.randomUUID()): Chapter {
  return { id, title: "", subtitle: "", word: "", meaning: "", startsOn: null, endsOn: null, cover: { preset: presetFor(id) }, isPrimary: false, showOnDaily: false, closing: {},
    closedAt: null, archivedAt: null, carriedFrom: null, carriedFromTitle: null, revision: 0, createdAt: now, updatedAt: now };
}
const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
/** "March 2026 – now", "Summer 2026"-style ranges without inventing precision. */
export function rangeLabel(startsOn: string | null, endsOn: string | null): string {
  const m = (d: string) => fmt(d, { month: "short", year: "numeric" });
  if (!startsOn && !endsOn) return "Undated";
  if (startsOn && !endsOn) return `${m(startsOn)} – open`;
  if (!startsOn && endsOn) return `until ${m(endsOn)}`;
  return m(startsOn!) === m(endsOn!) ? fmt(startsOn!, { month: "long", year: "numeric" }) : `${m(startsOn!)} – ${m(endsOn!)}`;
}

// ---------- Experiences ----------
export type EventRef = { id: string; date: string; title: string };
export type Experience = {
  id: string; title: string; happenedOn: string | null; description: string; location: string; people: string; theme: string; tags: string[];
  cover: Cover; photos: BoardImage[]; event: EventRef | null; archivedAt: string | null; revision: number; createdAt: string; updatedAt: string;
};
function parseEvent(v: unknown): EventRef | null {
  const o = obj(v);
  return typeof o.id === "string" && /^[A-Za-z0-9_.:-]{1,100}$/.test(o.id) && typeof o.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? { id: o.id, date: o.date, title: typeof o.title === "string" ? o.title.slice(0, 200) : "" } : null;
}
export function experienceFromRow(r: Tables<"inner_experiences">): Experience {
  return { id: r.id, title: r.title, happenedOn: r.happened_on, description: r.description, location: r.location, people: r.people, theme: r.theme, tags: r.tags ?? [],
    cover: parseCover(r.cover, presetFor(r.id)), photos: Array.isArray(r.photos) ? (r.photos as unknown[]).filter(isImage) as BoardImage[] : [], event: parseEvent(r.event),
    archivedAt: r.archived_at, revision: r.revision, createdAt: r.created_at, updatedAt: r.updated_at };
}
export function experienceToRow(e: Experience) {
  return { title: e.title.trim().slice(0, 200), happened_on: e.happenedOn, description: e.description.slice(0, 8000), location: e.location.slice(0, 200), people: e.people.slice(0, 500),
    theme: e.theme.slice(0, 80), tags: cleanTags(e.tags), cover: e.cover, photos: e.photos.slice(0, 24), event: e.event, archived_at: e.archivedAt };
}
export function blankExperience(now = new Date().toISOString(), id: string = crypto.randomUUID()): Experience {
  return { id, title: "", happenedOn: null, description: "", location: "", people: "", theme: "", tags: [], cover: { preset: presetFor(id) }, photos: [], event: null, archivedAt: null, revision: 0, createdAt: now, updatedAt: now };
}
/** Case-insensitive de-duplication that keeps the first spelling. */
export function cleanTags(tags: string[]): string[] {
  const seen = new Set<string>(), out: string[] = [];
  for (const raw of tags) { const t = raw.trim().replace(/^#/, "").trim().replace(/\s+/g, " ").slice(0, 40); if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); out.push(t); } if (out.length >= 30) break; }
  return out;
}
/** A new tag takes the spelling the person already uses elsewhere, so "Pottery" and "pottery" don't both appear. */
export function canonicalTag(tag: string, known: string[]): string {
  const t = tag.replace(/^#/, "").trim().replace(/\s+/g, " ");
  return known.find((k) => k.toLowerCase() === t.toLowerCase()) ?? t;
}
export function knownTags(list: Experience[]): { tag: string; count: number }[] {
  const m = new Map<string, { tag: string; count: number }>();
  for (const e of list) for (const t of e.tags) { const k = t.toLowerCase(), x = m.get(k); if (x) x.count++; else m.set(k, { tag: t, count: 1 }); }
  return [...m.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

// ---------- Collections ----------
export type Collection = { id: string; name: string; description: string; cover: Cover; sort: "chronological" | "manual"; revision: number; createdAt: string; updatedAt: string };
export function collectionFromRow(r: Tables<"inner_experience_collections">): Collection {
  return { id: r.id, name: r.name, description: r.description, cover: parseCover(r.cover, presetFor(r.id)), sort: r.sort === "manual" ? "manual" : "chronological", revision: r.revision, createdAt: r.created_at, updatedAt: r.updated_at };
}
export const collectionToRow = (c: Collection) => ({ name: c.name.trim().slice(0, 120), description: c.description.slice(0, 2000), cover: c.cover, sort: c.sort });
export function blankCollection(now = new Date().toISOString(), id: string = crypto.randomUUID()): Collection {
  return { id, name: "", description: "", cover: { preset: presetFor(id) }, sort: "chronological", revision: 0, createdAt: now, updatedAt: now };
}

// ---------- Modules ----------
export type Module = { id: string; owner: { kind: "chapter" | "experience"; id: string }; type: ModuleType; position: number; title: string; collapsed: boolean; content: Content; revision: number; updatedAt: string;
  /** Layout only: two consecutive half-width modules share a row; a lone half shows full width. */
  width?: ModuleWidth };
export type ModuleWidth = "full" | "half";
export function moduleFromRow(r: Tables<"inner_modules">): Module | null {
  if (!isModuleType(r.type)) return null;
  const owner = r.chapter_id ? { kind: "chapter" as const, id: r.chapter_id } : r.experience_id ? { kind: "experience" as const, id: r.experience_id } : null;
  return owner ? { id: r.id, owner, type: r.type, position: r.position, title: r.title, collapsed: r.collapsed, width: r.width === "half" ? "half" : "full", content: parseContent(r.type, r.content), revision: r.revision, updatedAt: r.updated_at } : null;
}
export const moduleToRow = (m: Module) => ({ type: m.type, position: m.position, title: m.title.slice(0, 80), collapsed: m.collapsed, width: m.width === "half" ? "half" : "full", content: m.content,
  chapter_id: m.owner.kind === "chapter" ? m.owner.id : null, experience_id: m.owner.kind === "experience" ? m.owner.id : null });
/** Positions after a move, renumbered 0..n so order is always unambiguous. */
export function reorder<T extends { id: string }>(list: T[], id: string, to: number): T[] {
  const from = list.findIndex((x) => x.id === id); if (from < 0) return list;
  const next = [...list], [item] = next.splice(from, 1); next.splice(Math.max(0, Math.min(next.length, to)), 0, item); return next;
}

// ---------- Finding things ----------
const fold = (s: string) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
export const matchesText = (q: string, ...hay: (string | null | undefined)[]) => { const words = fold(q.trim()).split(/\s+/).filter(Boolean); const h = fold(hay.filter(Boolean).join(" ")); return words.every((w) => h.includes(w)); };
export function sortExperiences(list: Experience[], sort: "recent" | "oldest" | "alpha" | "added"): Experience[] {
  const d = (e: Experience) => e.happenedOn ?? e.createdAt.slice(0, 10);
  const by = [...list];
  if (sort === "alpha") return by.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  if (sort === "oldest") return by.sort((a, b) => d(a).localeCompare(d(b)));
  if (sort === "added") return by.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return by.sort((a, b) => d(b).localeCompare(d(a)) || b.createdAt.localeCompare(a.createdAt));
}
export function sortChapters(list: Chapter[], sort: "recent" | "oldest" | "alpha"): Chapter[] {
  const d = (c: Chapter) => c.startsOn ?? c.createdAt.slice(0, 10);
  const by = [...list];
  if (sort === "alpha") return by.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  if (sort === "oldest") return by.sort((a, b) => d(a).localeCompare(d(b)));
  return by.sort((a, b) => d(b).localeCompare(d(a)));
}

/** Which modules render at half width: consecutive half-width modules pair up two to a row; one left without a partner
 *  spans the full row so the layout never shows an empty gap. */
export function halfWidthIds(list: { id: string; width?: ModuleWidth }[]): Set<string> {
  const out = new Set<string>();
  let run: string[] = [];
  const flush = () => { const even = run.length - (run.length % 2); run.slice(0, even).forEach((id) => out.add(id)); run = []; };
  for (const m of list) { if (m.width === "half") run.push(m.id); else flush(); }
  flush();
  return out;
}
