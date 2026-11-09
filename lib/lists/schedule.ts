/**
 * Mindspace Lists scheduling (#110). One model for every scheduled item, built on Planner's recurrence rules
 * (lib/recurrence.ts): the rule's dates split time into periods — each period runs from one scheduled date up to the
 * day before the next. The three modes only change how a period is presented:
 *   flexible  — done once, any day in the period ("clean the bathroom this week")
 *   preferred — has an intended day (the scheduled date) that can be moved within the period ("vacuum, ideally Wed")
 *   date      — a dated occurrence, moved like a Planner occurrence ("replace the air filter on Mar 1")
 * Only what happened is stored (completed, skipped, rescheduled) with the period's dates; missed periods are derived;
 * nothing is generated ahead of time.
 */
import { nextOccurrence, occurrencesBetween, ruleLabel, validRule, type RecurrenceRule } from "../recurrence";
import { shiftDate } from "../dates";

export type ScheduleMode = "flexible" | "preferred" | "date";
export type ListSchedule = { rule: RecurrenceRule; anchor: string; mode: ScheduleMode; /** Missed periods are only counted from here (the day this schedule began applying). */ since: string };
export type ListEventKind = "completed" | "skipped" | "rescheduled";
export type ListEvent = { id: string; itemId: string; listId: string; kind: ListEventKind; periodStart: string; periodEnd: string; movedTo?: string; occurredOn?: string; recordedAt: string; source: "list" | "task" };
export type Period = { start: string; end: string };
export type PeriodStatus = "completed" | "skipped" | "rescheduled" | "open" | "missed" | "upcoming";

const HISTORY_LIMIT = 60; // periods scanned for history/missed counts: bounded, so a daily item never scans years

export const validSchedule = (s: unknown): s is ListSchedule => {
  const v = s as ListSchedule | null;
  return !!v && ["flexible", "preferred", "date"].includes(v.mode) && /^\d{4}-\d{2}-\d{2}$/.test(v.anchor) && /^\d{4}-\d{2}-\d{2}$/.test(v.since) && validRule(v.rule);
};

/** The period containing `date`, or the first upcoming one when the schedule hasn't started yet. */
export function periodFor(s: ListSchedule, date: string): Period | null {
  const from = shiftDate(date, -400), dates = occurrencesBetween(s.rule, s.anchor, from, date);
  const start = dates[dates.length - 1];
  if (!start) {
    const first = nextOccurrence(s.rule, s.anchor, s.anchor);
    return first ? { start: first, end: endOf(s, first) } : null;
  }
  return { start, end: endOf(s, start) };
}

function endOf(s: ListSchedule, start: string) {
  const next = nextOccurrence(s.rule, s.anchor, shiftDate(start, 1));
  if (next) return shiftDate(next, -1);
  // Last period of a rule that ends: give it the rule's natural length.
  const span = s.rule.freq === "daily" ? 1 : s.rule.freq === "weekly" ? 7 : s.rule.freq === "monthly" ? 30 : 365;
  return shiftDate(start, span * Math.max(1, s.rule.interval) - 1);
}

/** Periods that ended in [from, to] — newest first, bounded. */
export function periodsBetween(s: ListSchedule, from: string, to: string): Period[] {
  const starts = occurrencesBetween(s.rule, s.anchor, shiftDate(from, -400), to);
  const out: Period[] = [];
  for (let i = starts.length - 1; i >= 0 && out.length < HISTORY_LIMIT; i--) {
    const p = { start: starts[i], end: endOf(s, starts[i]) };
    if (p.end < from) break;
    if (p.start <= to) out.push(p);
  }
  return out;
}

const eventsFor = (events: ListEvent[], p: Period) => events.filter((e) => e.periodStart === p.start);

/** The day this period is planned for (preferred/date modes), after any reschedule. Flexible periods have none. */
export function plannedDay(s: ListSchedule, p: Period, events: ListEvent[]): string | null {
  if (s.mode === "flexible") return null;
  return eventsFor(events, p).find((e) => e.kind === "rescheduled")?.movedTo ?? p.start;
}

export function periodStatus(s: ListSchedule, p: Period, events: ListEvent[], today: string): PeriodStatus {
  const own = eventsFor(events, p);
  if (own.some((e) => e.kind === "completed")) return "completed";
  if (own.some((e) => e.kind === "skipped")) return "skipped";
  if (p.start > today) return "upcoming";
  if (p.end < today) return "missed";
  return own.some((e) => e.kind === "rescheduled") ? "rescheduled" : "open";
}

export type ItemScheduleState = {
  period: Period | null; status: PeriodStatus; planned: string | null;
  /** True when the item belongs on the to-do pile right now (open in its current period, and past its planned day if it has one). */
  due: boolean; overdue: boolean;
  lastCompleted: string | null; completions: number; missedSinceLast: number; label: string;
};

/** Everything a row, the Due view and History need about one scheduled item, from its events alone. */
export function scheduleState(s: ListSchedule, events: ListEvent[], today: string): ItemScheduleState {
  const period = periodFor(s, today);
  const status = period ? periodStatus(s, period, events, today) : "upcoming";
  const planned = period ? plannedDay(s, period, events) : null;
  const done = events.filter((e) => e.kind === "completed").sort((a, b) => (b.occurredOn ?? "").localeCompare(a.occurredOn ?? ""));
  const lastCompleted = done[0]?.occurredOn ?? null;
  // Missed: ended periods since the schedule began (and since the last completion) with nothing recorded.
  const from = [s.since, lastCompleted ? shiftDate(lastCompleted, 1) : s.since].sort().pop()!;
  const missedSinceLast = periodsBetween(s, from, shiftDate(today, -1)).filter((p) => p.end < today && p.start >= s.since && periodStatus(s, p, events, today) === "missed").length;
  const open = status === "open" || status === "rescheduled";
  const due = open && (planned == null || planned <= today);
  return { period, status, planned, due, overdue: missedSinceLast > 0 && status !== "completed", lastCompleted, completions: done.length, missedSinceLast, label: scheduleLabel(s) };
}

export function scheduleLabel(s: ListSchedule) {
  if (s.mode === "flexible") {
    const plain = !s.rule.weekdays && !s.rule.placement && !s.rule.month;
    const preset = plain ? schedulePresets.find((p) => { const r = p.rule(s.anchor); return r.freq === s.rule.freq && r.interval === s.rule.interval; }) : null;
    const unit = { daily: "day", weekly: "week", monthly: "month", yearly: "year" }[s.rule.freq];
    return `${preset?.label ?? (s.rule.interval === 1 ? ruleLabel(s.rule, s.anchor) : `Every ${s.rule.interval} ${unit}s`)} · any day`;
  }
  const base = ruleLabel(s.rule, s.anchor);
  return s.mode === "preferred" ? `${base} · preferred day` : base;
}

/** Flexible periods start on natural boundaries (weeks on Monday, months on the 1st, years on Jan 1); others on the chosen day. */
export function anchorFor(rule: RecurrenceRule, mode: ScheduleMode, today: string) {
  if (mode !== "flexible" || rule.weekdays || rule.placement) return today;
  if (rule.freq === "weekly") { const wd = new Date(`${today}T12:00:00Z`).getUTCDay(); return shiftDate(today, -((wd + 6) % 7)); }
  if (rule.freq === "monthly") return `${today.slice(0, 7)}-01`;
  if (rule.freq === "yearly") return `${today.slice(0, 4)}-01-01`;
  return today;
}

/** History rows for an item: recorded events plus derived missed periods, newest first. */
export function itemHistory(s: ListSchedule, events: ListEvent[], today: string, limit = 12) {
  const recorded = events.filter((e) => e.kind !== "rescheduled").map((e) => ({ kind: e.kind as "completed" | "skipped", periodStart: e.periodStart, periodEnd: e.periodEnd, date: e.occurredOn ?? e.periodStart }));
  const missed = periodsBetween(s, s.since, shiftDate(today, -1)).filter((p) => p.start >= s.since && periodStatus(s, p, events, today) === "missed")
    .map((p) => ({ kind: "missed" as const, periodStart: p.start, periodEnd: p.end, date: p.end }));
  return [...recorded, ...missed].sort((a, b) => b.periodStart.localeCompare(a.periodStart)).slice(0, limit);
}

/** Whether a scheduled item lands on `date` for day views (Agenda, This week): its planned day, or — flexible — never. */
export function plannedOn(s: ListSchedule, events: ListEvent[], date: string): boolean {
  if (s.mode === "flexible") return false;
  const p = periodFor(s, date);
  if (!p) return false;
  const day = plannedDay(s, p, events);
  if (day === date) return true;
  // A period whose planned day was moved into this one.
  return events.some((e) => e.kind === "rescheduled" && e.movedTo === date);
}

export const schedulePresets: { id: string; label: string; rule: (anchor: string) => RecurrenceRule }[] = [
  { id: "daily", label: "Daily", rule: () => ({ freq: "daily", interval: 1 }) },
  { id: "weekly", label: "Weekly", rule: () => ({ freq: "weekly", interval: 1 }) },
  { id: "biweekly", label: "Every 2 weeks", rule: () => ({ freq: "weekly", interval: 2 }) },
  { id: "monthly", label: "Monthly", rule: () => ({ freq: "monthly", interval: 1 }) },
  { id: "quarterly", label: "Quarterly", rule: () => ({ freq: "monthly", interval: 3 }) },
  { id: "semiannual", label: "Twice a year", rule: () => ({ freq: "monthly", interval: 6 }) },
  { id: "yearly", label: "Yearly", rule: () => ({ freq: "yearly", interval: 1 }) },
];
