/**
 * Deterministic journal statistics (Journal V1 §17): counts, words, days, journals, people and topics for a week,
 * plus streaks and On This Day. No AI is involved, and days without entries stay empty (never invented).
 */
import { isListed, type Conversation, type EntryTag, type Tag, type TagKind } from "./model";

const DAY = 86400000;
const parse = (d: string) => Date.parse(`${d}T12:00:00Z`);
export const addDays = (d: string, n: number) => new Date(parse(d) + n * DAY).toISOString().slice(0, 10);
/** Monday of the week containing `d`. */
export const weekStart = (d: string) => { const wd = (new Date(parse(d)).getUTCDay() + 6) % 7; return addDays(d, -wd); };
export const weekDays = (start: string) => Array.from({ length: 7 }, (_, i) => addDays(start, i));

export type WeekStats = {
  start: string; end: string; entries: number; days: number; words: number;
  byDay: { date: string; words: number; entries: number }[];
  journals: { id: string; entries: number }[];
  tags: Record<TagKind, { id: string; name: string; entries: number }[]>;
  entryIds: string[];
};
export function weekStats(start: string, conversations: readonly Conversation[], links: readonly EntryTag[], tags: readonly Tag[]): WeekStats {
  const days = weekDays(start), end = days[6];
  const list = conversations.filter((c) => isListed(c) && c.localDate >= start && c.localDate <= end);
  const byDay = days.map((date) => { const on = list.filter((c) => c.localDate === date); return { date, entries: on.length, words: on.reduce((n, c) => n + c.userWords, 0) }; });
  const journals = new Map<string, number>(); for (const c of list) journals.set(c.journalId, (journals.get(c.journalId) ?? 0) + 1);
  const ids = new Set(list.map((c) => c.id)), byTag = new Map<string, number>();
  for (const l of links) if (ids.has(l.conversationId)) byTag.set(l.tagId, (byTag.get(l.tagId) ?? 0) + 1);
  const grouped: WeekStats["tags"] = { custom: [], person: [], place: [], topic: [], theme: [], mood: [] };
  for (const t of tags) { const n = byTag.get(t.id); if (n) grouped[t.kind].push({ id: t.id, name: t.name, entries: n }); }
  for (const k of Object.keys(grouped) as TagKind[]) grouped[k].sort((a, b) => b.entries - a.entries || a.name.localeCompare(b.name));
  return {
    start, end, entries: list.length, days: byDay.filter((d) => d.entries).length, words: list.reduce((n, c) => n + c.userWords, 0), byDay,
    journals: [...journals.entries()].map(([id, entries]) => ({ id, entries })).sort((a, b) => b.entries - a.entries), tags: grouped, entryIds: list.map((c) => c.id),
  };
}

/** A stable fingerprint of a week's source entries, so a cached report knows when it is out of date. */
export function sourceSignature(list: readonly Pick<Conversation, "id" | "revision" | "userWords">[]) {
  return list.map((c) => `${c.id.slice(0, 8)}:${c.revision}:${c.userWords}`).sort().join(",").slice(0, 200);
}

/** Consecutive days with a journal message of your own, ending today (or yesterday, if today has none yet). */
export function streak(days: ReadonlySet<string>, today: string) {
  let d = days.has(today) ? today : addDays(today, -1), n = 0;
  while (days.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

/** Whether a year has a February 29. */
const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
/**
 * Entries written on this calendar date in earlier years (never this year), newest first, keeping their original
 * dates. February 29 entries surface on February 28 in years without a 29th, so they're never lost.
 */
export function onThisDay(conversations: readonly Conversation[], today: string) {
  const md = today.slice(5), year = today.slice(0, 4);
  const also = md === "02-28" && !leap(Number(year)) ? "02-29" : null;
  return conversations.filter((c) => isListed(c) && c.localDate.slice(0, 4) < year && (c.localDate.slice(5) === md || c.localDate.slice(5) === also))
    .sort((a, b) => b.localDate.localeCompare(a.localDate) || b.startedAt.localeCompare(a.startedAt));
}

/** Life Review periods: Monday–Sunday weeks, calendar months, calendar years. Dates are the person's own days. */
export type Period = "week" | "month" | "year";
export function periodStart(kind: Period, d: string) { return kind === "week" ? weekStart(d) : kind === "month" ? `${d.slice(0, 7)}-01` : `${d.slice(0, 4)}-01-01`; }
export function periodEnd(kind: Period, start: string) {
  if (kind === "week") return addDays(start, 6);
  if (kind === "year") return `${start.slice(0, 4)}-12-31`;
  const [y, m] = start.split("-").map(Number); const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return addDays(next, -1);
}
export function shiftPeriod(kind: Period, start: string, n: number) {
  if (kind === "week") return addDays(start, 7 * n);
  if (kind === "year") return `${Number(start.slice(0, 4)) + n}-01-01`;
  const [y, m] = start.split("-").map(Number), k = y * 12 + (m - 1) + n;
  return `${Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, "0")}-01`;
}
export const validPeriodStart = (kind: Period, d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(parse(d)) && periodStart(kind, d) === d;

/**
 * When a review may be written (in the person's own day). Each opens on its last day, from midnight: a week on its
 * Sunday, a month on its last day (Nov 30), a year on December 31. Earlier periods (imported history included) are
 * always open; the rest of the current period, and any later one, never.
 */
export function reviewLock(kind: Period, start: string, today: string): "open" | "until-sunday" | "until-end" | "future" {
  const current = periodStart(kind, today);
  if (start > current) return "future";
  if (start < current) return "open";
  if (today >= periodEnd(kind, start)) return "open";
  return kind === "week" ? "until-sunday" : "until-end";
}

/** Counts for any range (months and years use the same tallies as a week, without the day-by-day chart). */
export function rangeStats(start: string, end: string, conversations: readonly Conversation[], links: readonly EntryTag[], tags: readonly Tag[]): WeekStats {
  const list = conversations.filter((c) => isListed(c) && c.localDate >= start && c.localDate <= end);
  const journals = new Map<string, number>(); for (const c of list) journals.set(c.journalId, (journals.get(c.journalId) ?? 0) + 1);
  const ids = new Set(list.map((c) => c.id)), byTag = new Map<string, number>();
  for (const l of links) if (ids.has(l.conversationId)) byTag.set(l.tagId, (byTag.get(l.tagId) ?? 0) + 1);
  const grouped: WeekStats["tags"] = { custom: [], person: [], place: [], topic: [], theme: [], mood: [] };
  for (const t of tags) { const n = byTag.get(t.id); if (n) grouped[t.kind].push({ id: t.id, name: t.name, entries: n }); }
  for (const k of Object.keys(grouped) as TagKind[]) grouped[k].sort((a, b) => b.entries - a.entries || a.name.localeCompare(b.name));
  return { start, end, entries: list.length, days: new Set(list.map((c) => c.localDate)).size, words: list.reduce((n, c) => n + c.userWords, 0), byDay: [],
    journals: [...journals.entries()].map(([id, entries]) => ({ id, entries })).sort((a, b) => b.entries - a.entries), tags: grouped, entryIds: list.map((c) => c.id) };
}

/**
 * Sunday unlock for the weekly reflection (Monday–Sunday weeks, in the person's own day): a completed week is open,
 * the current week opens on its Sunday (from midnight), a future week never.
 */
export function reflectionLock(start: string, today: string): "open" | "until-sunday" | "future" {
  const current = weekStart(today);
  if (start > current) return "future";
  if (start === current && today < addDays(start, 6)) return "until-sunday";
  return "open";
}
