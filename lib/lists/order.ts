/**
 * Lists (#12 follow-up): display-only grouping and sorting for All items. Nothing here changes stored positions —
 * "My order" is always the saved manual order, so switching back restores it exactly.
 */
import type { ListEvent, ListSchedule } from "./schedule";
import { schedulePresets, scheduleState } from "./schedule";
import type { ListItem } from "./model";

export type ItemGroup = "section" | "frequency" | "none";
export type ItemSort = "manual" | "frequency" | "due" | "name";
export const itemGroups: { id: ItemGroup; label: string }[] = [{ id: "section", label: "Section" }, { id: "frequency", label: "Frequency" }, { id: "none", label: "No grouping" }];
export const itemSorts: { id: ItemSort; label: string }[] = [{ id: "manual", label: "My order" }, { id: "frequency", label: "Frequency" }, { id: "due", label: "Next due" }, { id: "name", label: "Name A–Z" }];

const unitDays = { daily: 1, weekly: 7, monthly: 30.44, yearly: 365.25 } as const;
/** Days between repeats from the real rule (custom rules included; weekday lists repeat that often within a week). One-time items sort last. */
export function frequencyDays(s: ListSchedule | null) {
  if (!s) return Infinity;
  const base = unitDays[s.rule.freq] * Math.max(1, s.rule.interval);
  return s.rule.freq === "weekly" && s.rule.weekdays?.length ? base / s.rule.weekdays.length : base;
}
/** A readable bucket: the matching preset (Daily, Weekly, Every 2 weeks, Monthly, Quarterly…), else Custom; no schedule = One-time. */
export function frequencyLabel(s: ListSchedule | null) {
  if (!s) return "One-time";
  const plain = !s.rule.weekdays?.length && !s.rule.placement && !s.rule.month;
  const preset = plain ? schedulePresets.find((p) => { const r = p.rule(s.anchor); return r.freq === s.rule.freq && r.interval === s.rule.interval; }) : null;
  return preset?.label ?? "Custom";
}
/** Next due day: the planned day (or period start) for scheduled items, the due date for one-off items; none sorts last. */
export function nextDue(item: ListItem, events: ListEvent[], today: string) {
  if (!item.schedule) return item.completedAt ? "9999-12-31" : item.dueDate ?? "9999-12-30";
  const st = scheduleState(item.schedule, events, today);
  if (st.status === "completed" || st.status === "skipped") return "9999-12-29";
  return st.planned ?? st.period?.start ?? "9999-12-30";
}
export function sortItems(items: ListItem[], sort: ItemSort, eventsOf: (id: string) => ListEvent[], today: string) {
  const manual = (a: ListItem, b: ListItem) => a.position - b.position || a.createdAt.localeCompare(b.createdAt);
  const by: Record<ItemSort, (a: ListItem, b: ListItem) => number> = {
    manual,
    frequency: (a, b) => frequencyDays(a.schedule) - frequencyDays(b.schedule) || manual(a, b),
    due: (a, b) => nextDue(a, eventsOf(a.id), today).localeCompare(nextDue(b, eventsOf(b.id), today)) || manual(a, b),
    name: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) || manual(a, b),
  };
  return [...items].sort(by[sort]);
}
/** Frequency groups in real interval order (One-time last). */
export function frequencyGroups(items: ListItem[]) {
  const groups = new Map<string, { label: string; days: number; items: ListItem[] }>();
  for (const it of items) { const label = frequencyLabel(it.schedule), days = frequencyDays(it.schedule); const g = groups.get(label) ?? { label, days, items: [] }; g.days = Math.min(g.days, days); g.items.push(it); groups.set(label, g); }
  const rank = (l: string) => l === "One-time" ? 2 : l === "Custom" ? 1 : 0;
  return [...groups.values()].sort((a, b) => rank(a.label) - rank(b.label) || a.days - b.days);
}
