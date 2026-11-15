/**
 * Inner Compass → My Inner World (#210). Pure model: rows ⇄ records, validation, search, sorting and the small
 * pieces of logic the screens share. No network here (see ./persistence).
 *
 * One life, one system:
 * - A discovery has one home (`inner_discoveries`). Reflections, manifesto lines, Intentions sections and Vision Board
 *   elements refer to it by id and keep a name snapshot, so later edits never rewrite something already written.
 * - An ordinary edit changes the record. Only "Record evolution" keeps the earlier words, as a version.
 * - Connections are explicit pairs the person made. Nothing is inferred.
 */
import type { Tables } from "@/lib/database.types";
import { categoryInfo, isCategory, type Category, type DetailKey } from "./categories";

export type Details = Partial<Record<DetailKey, string>>;
export type Source = { kind: "exploration" | "garden" | "chapter"; id: string | null; label: string };
export type Discovery = {
  id: string; category: Category; title: string; meaning: string; reflection: string; details: Details; tags: string[];
  favorite: boolean; significanceDate: string | null; source: Source | null; evolvedAt: string | null; archivedAt: string | null;
  revision: number; createdAt: string; updatedAt: string;
};
export type Version = {
  id: string; discoveryId: string; title: string; meaning: string; details: Details; nextTitle: string; nextMeaning: string;
  reason: string; reflection: string; evolvedOn: string; createdAt: string;
};
export type Link = { a: string; b: string; createdAt: string };
export type AreaLink = { discoveryId: string; areaId: string };
export type Reflection = {
  id: string; discoveryId: string | null; discoveryTitle: string | null; responseId: string | null; body: string; feeling: string | null;
  writtenOn: string; revision: number; createdAt: string; updatedAt: string;
};
export type Answer = { key: string; prompt: string; text: string };
export type Response = {
  id: string; explorationKey: string; explorationTitle: string; answers: Answer[]; reflection: string; completedOn: string;
  revision: number; createdAt: string; updatedAt: string;
};

export const LIMITS = { title: 300, meaning: 4000, reflection: 20000, detail: 2000, tag: 40, tags: 20, answer: 6000, body: 20000, feeling: 40 } as const;
const detailKeys: DetailKey[] = ["why", "practice", "examples", "shaped", "learned", "attribution", "theme", "area", "kind", "stance"];
const obj = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown, max: number) => typeof v === "string" ? v.slice(0, max) : "";

export function parseDetails(v: unknown): Details {
  const o = obj(v), out: Details = {};
  for (const k of detailKeys) { const s = text(o[k], LIMITS.detail).trim(); if (s) out[k] = s; }
  return out;
}
/** Only the fields this collection offers are kept, so switching a draft's category never smuggles stray fields along. */
export function detailsFor(category: Category, d: Details): Details {
  const info = categoryInfo[category], allowed = new Set<string>([...info.fields.map((f) => f.key), ...(info.stances ? ["stance"] : []), ...(info.kinds ? [info.kinds.key] : [])]);
  const valid = (k: string, v: string) => k === "stance" ? !!info.stances?.some((s) => s.id === v) : k === info.kinds?.key ? info.kinds.options.some((o) => o.id === v) : true;
  return Object.fromEntries(Object.entries(d).filter(([k, v]) => allowed.has(k) && !!v?.trim() && valid(k, v!.trim())).map(([k, v]) => [k, v!.trim()])) as Details;
}
export function cleanTags(tags: string[]): string[] {
  const seen = new Set<string>(), out: string[] = [];
  for (const raw of tags) {
    const t = raw.replace(/^#/, "").trim().replace(/\s+/g, " ").slice(0, LIMITS.tag);
    if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); out.push(t); }
    if (out.length >= LIMITS.tags) break;
  }
  return out;
}

type DiscoveryRow = Tables<"inner_discoveries">;
export function discoveryFromRow(r: DiscoveryRow): Discovery {
  return {
    id: r.id, category: isCategory(r.category) ? r.category : "values", title: r.title, meaning: r.meaning, reflection: r.reflection,
    details: parseDetails(r.details), tags: r.tags ?? [], favorite: r.favorite, significanceDate: r.significance_date,
    source: r.source_kind && (r.source_kind === "exploration" || r.source_kind === "garden" || r.source_kind === "chapter") ? { kind: r.source_kind, id: r.source_id, label: r.source_label ?? "" } : null,
    evolvedAt: r.evolved_at, archivedAt: r.archived_at, revision: r.revision, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
export function discoveryToRow(d: Discovery) {
  return {
    category: d.category, title: d.title.trim().slice(0, LIMITS.title), meaning: d.meaning.slice(0, LIMITS.meaning), reflection: d.reflection.slice(0, LIMITS.reflection),
    details: detailsFor(d.category, d.details), tags: cleanTags(d.tags), favorite: d.favorite, significance_date: d.significanceDate,
    source_kind: d.source?.kind ?? null, source_id: d.source?.id ?? null, source_label: d.source ? d.source.label.slice(0, 200) : null,
    archived_at: d.archivedAt,
  };
}
export function versionFromRow(r: Tables<"inner_discovery_versions">): Version {
  return { id: r.id, discoveryId: r.discovery_id, title: r.title, meaning: r.meaning, details: parseDetails(r.details), nextTitle: r.next_title, nextMeaning: r.next_meaning, reason: r.reason, reflection: r.reflection, evolvedOn: r.evolved_on, createdAt: r.created_at };
}
export function reflectionFromRow(r: Tables<"inner_reflections">): Reflection {
  return { id: r.id, discoveryId: r.discovery_id, discoveryTitle: r.discovery_title, responseId: r.response_id, body: r.body, feeling: r.feeling, writtenOn: r.written_on, revision: r.revision, createdAt: r.created_at, updatedAt: r.updated_at };
}
export function parseAnswers(v: unknown): Answer[] {
  return (Array.isArray(v) ? v : []).flatMap((x) => { const o = obj(x); return typeof o.key === "string" && /^[a-z0-9-]{1,40}$/.test(o.key) ? [{ key: o.key, prompt: text(o.prompt, 400), text: text(o.text, LIMITS.answer) }] : []; }).slice(0, 12);
}
export function responseFromRow(r: Tables<"inner_exploration_responses">): Response {
  return { id: r.id, explorationKey: r.exploration_key, explorationTitle: r.exploration_title, answers: parseAnswers(r.answers), reflection: r.reflection, completedOn: r.completed_on, revision: r.revision, createdAt: r.created_at, updatedAt: r.updated_at };
}

export function blankDiscovery(category: Category, now = new Date().toISOString()): Discovery {
  return { id: crypto.randomUUID(), category, title: "", meaning: "", reflection: "", details: {}, tags: [], favorite: false, significanceDate: null, source: null, evolvedAt: null, archivedAt: null, revision: 0, createdAt: now, updatedAt: now };
}
export const isNew = (d: Pick<Discovery, "revision">) => d.revision === 0;
/** Whether an edit changed the words themselves (a hint to offer "Record evolution"; never automatic). */
export const wordsChanged = (before: Discovery, after: Discovery) => before.title.trim() !== after.title.trim() || before.meaning.trim() !== after.meaning.trim();
/** Has the person written anything beyond the statement? Used to keep cards compact. */
export const hasDepth = (d: Discovery) => !!d.meaning.trim() || !!d.reflection.trim() || Object.keys(d.details).some((k) => k !== "stance" && k !== "kind" && k !== "area");

// ---------- Finding things ----------
export type Sort = "recent" | "evolved" | "alpha" | "significance" | "oldest";
export const sorts: { id: Sort; label: string }[] = [
  { id: "recent", label: "Recently added" }, { id: "evolved", label: "Recently evolved" }, { id: "significance", label: "By significance date" },
  { id: "alpha", label: "A–Z" }, { id: "oldest", label: "Oldest first" },
];
export type Filter = { category?: Category | "all"; query?: string; tag?: string | null; favorites?: boolean; stance?: string | null; archived?: "hide" | "only" | "include"; areaId?: string | null };
const fold = (s: string) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
export function matches(d: Discovery, f: Filter, areasOf?: (id: string) => string[]): boolean {
  if (f.category && f.category !== "all" && d.category !== f.category) return false;
  const archived = f.archived ?? "hide";
  if (archived === "hide" && d.archivedAt) return false;
  if (archived === "only" && !d.archivedAt) return false;
  if (f.favorites && !d.favorite) return false;
  if (f.tag && !d.tags.some((t) => t.toLowerCase() === f.tag!.toLowerCase())) return false;
  if (f.stance && d.details.stance !== f.stance && d.details.kind !== f.stance && d.details.area !== f.stance) return false;
  if (f.areaId && !(areasOf?.(d.id) ?? []).includes(f.areaId)) return false;
  const q = fold(f.query?.trim() ?? "");
  if (q) {
    const hay = fold([d.title, d.meaning, d.reflection, ...Object.values(d.details), ...d.tags].join(" "));
    if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  return true;
}
export function sortDiscoveries(list: Discovery[], sort: Sort): Discovery[] {
  const by = [...list];
  const t = (s: string | null) => s ? Date.parse(s) || 0 : 0;
  switch (sort) {
    case "alpha": return by.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    case "oldest": return by.sort((a, b) => t(a.createdAt) - t(b.createdAt));
    case "evolved": return by.sort((a, b) => t(b.evolvedAt) - t(a.evolvedAt) || t(b.updatedAt) - t(a.updatedAt));
    case "significance": return by.sort((a, b) => (b.significanceDate ?? "").localeCompare(a.significanceDate ?? "") || t(b.createdAt) - t(a.createdAt));
    default: return by.sort((a, b) => t(b.createdAt) - t(a.createdAt));
  }
}
export function allTags(list: Discovery[]): { tag: string; count: number }[] {
  const m = new Map<string, { tag: string; count: number }>();
  for (const d of list) if (!d.archivedAt) for (const tag of d.tags) { const k = tag.toLowerCase(), e = m.get(k); if (e) e.count++; else m.set(k, { tag, count: 1 }); }
  return [...m.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
export const counts = (list: Discovery[]) => Object.fromEntries((Object.keys(categoryInfo) as Category[]).map((c) => [c, list.filter((d) => d.category === c && !d.archivedAt).length])) as Record<Category, number>;

// ---------- Connections (undirected; one row per pair) ----------
export const pair = (x: string, y: string): [string, string] => x < y ? [x, y] : [y, x];
export const relatedIds = (links: Link[], id: string) => links.flatMap((l) => l.a === id ? [l.b] : l.b === id ? [l.a] : []);

/** A stable pseudo-random number in [0,1) from a string, for placing stars without storing positions. */
export function seeded(s: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}
