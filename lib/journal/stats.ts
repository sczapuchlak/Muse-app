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
  const grouped: WeekStats["tags"] = { person: [], place: [], topic: [], theme: [], mood: [] };
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

/** Entries written on this calendar date in earlier years, newest year first. */
export function onThisDay(conversations: readonly Conversation[], today: string) {
  const md = today.slice(5);
  return conversations.filter((c) => isListed(c) && c.localDate.slice(5) === md && c.localDate < today).sort((a, b) => b.localDate.localeCompare(a.localDate));
}
