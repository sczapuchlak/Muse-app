/**
 * Recurrence 2.0 (#89): one rule engine shared by recurring tasks and recurring events. Pure, no I/O.
 *
 * Everything works on civil dates (YYYY-MM-DD) in the person's saved timezone. A timed event keeps its local wall
 * time on each date, so daylight-saving changes never move an occurrence to another day or hour.
 *
 * A series starts on its anchor `start` date. Occurrence identity is (series id, scheduled date): stable, because the
 * schedule is recomputed from the anchor rather than chained from the previous occurrence (Jan 31 → Feb 28 → Mar 31).
 */
import { shiftDate, validDate } from "./dates";

export type Frequency = "daily" | "weekly" | "monthly" | "yearly";
/** 0 = Sunday … 6 = Saturday (the same numbering as Date.getUTCDay and Rituals). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
/** Which week of the month: 1–4, or -1 for the last. */
export type Nth = 1 | 2 | 3 | 4 | -1;
/** Monthly/yearly placement: a day number (clamped to the month's last day), or "the second Tuesday". */
export type MonthPlacement = { kind: "day"; day: number } | { kind: "nth"; nth: Nth; weekday: Weekday };
export type RecurrenceRule = {
  freq: Frequency;
  /** Every `interval` days/weeks/months/years. */
  interval: number;
  /** Weekly: the weekdays it falls on (defaults to the start's weekday). */
  weekdays?: Weekday[];
  /** Monthly and yearly: where in the month (defaults to the start's day). */
  placement?: MonthPlacement;
  /** Yearly: the month, 1–12 (defaults to the start's month). */
  month?: number;
  /** Ends after this date (inclusive), or after `count` occurrences. Neither = repeats indefinitely. */
  until?: string;
  count?: number;
};

const MAX_SCAN = 40000; // ~110 years of days: a hard stop so a bad rule can never loop forever.
const pad = (n: number) => String(n).padStart(2, "0");
const parts = (d: string) => ({ y: Number(d.slice(0, 4)), m: Number(d.slice(5, 7)), d: Number(d.slice(8, 10)) });
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
export const weekdayOf = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay() as Weekday;
export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
/** Which occurrence of its weekday a date is within its month (1–5), and whether it's the last one. */
export function nthOfMonth(d: string) { const { y, m, d: day } = parts(d); return { nth: Math.ceil(day / 7), last: day + 7 > daysInMonth(y, m) }; }

export function validRule(r: RecurrenceRule | null | undefined): r is RecurrenceRule {
  if (!r || !["daily", "weekly", "monthly", "yearly"].includes(r.freq)) return false;
  if (!Number.isInteger(r.interval) || r.interval < 1 || r.interval > 999) return false;
  if (r.weekdays && (!r.weekdays.length || r.weekdays.some((w) => !Number.isInteger(w) || w < 0 || w > 6) || new Set(r.weekdays).size !== r.weekdays.length)) return false;
  if (r.placement) {
    if (r.placement.kind === "day" && !(Number.isInteger(r.placement.day) && r.placement.day >= 1 && r.placement.day <= 31)) return false;
    if (r.placement.kind === "nth" && !([1, 2, 3, 4, -1].includes(r.placement.nth) && Number.isInteger(r.placement.weekday) && r.placement.weekday >= 0 && r.placement.weekday <= 6)) return false;
  }
  if (r.month !== undefined && !(Number.isInteger(r.month) && r.month >= 1 && r.month <= 12)) return false;
  if (r.until !== undefined && !validDate(r.until)) return false;
  if (r.count !== undefined && !(Number.isInteger(r.count) && r.count >= 1 && r.count <= 10000)) return false;
  return true;
}

/** The date a monthly placement lands on in a given month (day numbers past the month's end clamp to its last day). */
function placeInMonth(y: number, m: number, p: MonthPlacement): string {
  const last = daysInMonth(y, m);
  if (p.kind === "day") return iso(y, m, Math.min(p.day, last));
  if (p.nth === -1) { let day = last; while (weekdayOf(iso(y, m, day)) !== p.weekday) day--; return iso(y, m, day); }
  let day = 1; while (weekdayOf(iso(y, m, day)) !== p.weekday) day++;
  return iso(y, m, day + (p.nth - 1) * 7); // nth ≤ 4 always exists
}
const placementFor = (r: RecurrenceRule, start: string): MonthPlacement => r.placement ?? { kind: "day", day: parts(start).d };

/**
 * Every scheduled date of a series, in order, from its start. Lazily generated; respects `until` and `count`.
 * `count` counts real occurrences from the start (skipped dates still use up a slot, like a paper calendar).
 */
export function* schedule(r: RecurrenceRule, start: string): Generator<string> {
  if (!validRule(r) || !validDate(start)) return;
  let produced = 0;
  const done = (d: string) => (r.until !== undefined && d > r.until) || (r.count !== undefined && produced >= r.count);
  const emit = function* (d: string) { if (d < start) return; if (done(d)) return; produced++; yield d; };
  if (r.freq === "daily") {
    for (let i = 0; i < MAX_SCAN; i++) { const d = shiftDate(start, i * r.interval); if (done(d)) return; yield* emit(d); }
    return;
  }
  if (r.freq === "weekly") {
    const days = [...(r.weekdays ?? [weekdayOf(start)])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)); // Monday-first
    const monday = shiftDate(start, -((weekdayOf(start) + 6) % 7));
    for (let w = 0; w < MAX_SCAN / 7; w++) {
      const weekStart = shiftDate(monday, w * 7 * r.interval);
      for (const wd of days) { const d = shiftDate(weekStart, (wd + 6) % 7); if (d < start) continue; if (done(d)) return; yield* emit(d); }
    }
    return;
  }
  const s = parts(start), p = placementFor(r, start);
  if (r.freq === "monthly") {
    for (let i = 0; i < MAX_SCAN / 28; i++) {
      const total = s.m - 1 + i * r.interval, y = s.y + Math.floor(total / 12), m = (total % 12) + 1, d = placeInMonth(y, m, p);
      if (d < start) continue; if (done(d)) return; yield* emit(d);
    }
    return;
  }
  const month = r.month ?? s.m;
  for (let i = 0; i < MAX_SCAN / 365; i++) {
    const d = placeInMonth(s.y + i * r.interval, month, p);
    if (d < start) continue; if (done(d)) return; yield* emit(d);
  }
}

/** Scheduled dates between `from` and `to` (inclusive), leaving out any `skip` (exception) dates. */
export function occurrencesBetween(r: RecurrenceRule, start: string, from: string, to: string, skip: Iterable<string> = []): string[] {
  const out: string[] = [], skipped = new Set(skip);
  for (const d of schedule(r, start)) { if (d > to) break; if (d >= from && !skipped.has(d)) out.push(d); }
  return out;
}
/** The first scheduled date on or after `from` (or null when the series has ended). */
export function nextOccurrence(r: RecurrenceRule, start: string, from: string, skip: Iterable<string> = []): string | null {
  const skipped = new Set(skip);
  for (const d of schedule(r, start)) if (d >= from && !skipped.has(d)) return d;
  return null;
}
export function upcoming(r: RecurrenceRule, start: string, from: string, n: number, skip: Iterable<string> = []): string[] {
  const out: string[] = [], skipped = new Set(skip);
  for (const d of schedule(r, start)) { if (out.length >= n) break; if (d >= from && !skipped.has(d)) out.push(d); }
  return out;
}
/** Whether a date is a scheduled occurrence of the series. */
export function occursOn(r: RecurrenceRule, start: string, date: string) { for (const d of schedule(r, start)) { if (d === date) return true; if (d > date) return false; } return false; }
/** The last scheduled date, or null if it repeats indefinitely. */
export function lastOccurrence(r: RecurrenceRule, start: string): string | null {
  if (r.until === undefined && r.count === undefined) return null;
  let last: string | null = null; for (const d of schedule(r, start)) last = d; return last;
}
/** "This and future": end the original series the day before `date`. A count becomes the occurrences before it. */
export function endBefore(r: RecurrenceRule, start: string, date: string): RecurrenceRule {
  const kept = occurrencesBetween(r, start, start, shiftDate(date, -1));
  const { count: _count, ...rest } = r; void _count;
  return { ...rest, until: kept.at(-1) ?? shiftDate(start, -1) };
}

/* ---------- Words ---------- */
const longDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
const nthWord = (n: Nth) => (n === -1 ? "last" : ["first", "second", "third", "fourth"][n - 1]);
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
const shortDate = (d: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

/** Plain language, e.g. "Every weekday", "First Friday of every month", "Every 2 weeks on Tuesday · until Dec 31, 2026". */
export function ruleLabel(r: RecurrenceRule, start: string): string {
  if (!validRule(r) || !validDate(start)) return "Doesn't repeat";
  const every = r.interval === 1 ? "every" : `every ${r.interval}`;
  let core: string;
  if (r.freq === "daily") core = r.interval === 1 ? "Every day" : `Every ${r.interval} days`;
  else if (r.freq === "weekly") {
    const days = [...(r.weekdays ?? [weekdayOf(start)])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    const weekday = days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d as Weekday));
    const names = weekday ? "weekday" : days.length === 7 ? "day" : list(days.map((d) => longDays[d]));
    core = r.interval === 1 ? (weekday ? "Every weekday" : days.length === 7 ? "Every day" : `Every ${names}`) : `Every ${r.interval} weeks on ${weekday ? "weekdays" : names}`;
  } else {
    const p = placementFor(r, start);
    const where = p.kind === "day" ? `the ${ordinal(p.day)}` : `the ${nthWord(p.nth)} ${longDays[p.weekday]}`;
    if (r.freq === "monthly") core = p.kind === "nth" ? `${nthWord(p.nth)[0].toUpperCase()}${nthWord(p.nth).slice(1)} ${longDays[p.weekday]} of ${every} month${r.interval === 1 ? "" : "s"}` : `Every ${r.interval === 1 ? "" : `${r.interval} `}month${r.interval === 1 ? "" : "s"} on ${where}`;
    else { const month = months[(r.month ?? parts(start).m) - 1]; core = p.kind === "day" ? `Every ${r.interval === 1 ? "" : `${r.interval} `}year${r.interval === 1 ? "" : "s"} on ${month} ${p.day}` : `Every ${r.interval === 1 ? "" : `${r.interval} `}year${r.interval === 1 ? "" : "s"} on ${where} of ${month}`; }
  }
  const end = r.until ? ` · until ${shortDate(r.until)}` : r.count ? ` · ${r.count} time${r.count === 1 ? "" : "s"}` : "";
  return core + end;
}

/** Quick choices for a start date, like a calendar app: Daily, Every weekday, Weekly on <day>, Monthly …, Yearly … */
export function presets(start: string): { id: string; label: string; rule: RecurrenceRule }[] {
  const wd = weekdayOf(start), { nth, last } = nthOfMonth(start), { m, d } = parts(start);
  const choices: { id: string; rule: RecurrenceRule }[] = [
    { id: "daily", rule: { freq: "daily", interval: 1 } },
    { id: "weekdays", rule: { freq: "weekly", interval: 1, weekdays: [1, 2, 3, 4, 5] } },
    { id: "weekly", rule: { freq: "weekly", interval: 1, weekdays: [wd] } },
    { id: "biweekly", rule: { freq: "weekly", interval: 2, weekdays: [wd] } },
    { id: "monthly-day", rule: { freq: "monthly", interval: 1, placement: { kind: "day", day: d } } },
    ...(nth <= 4 ? [{ id: "monthly-nth", rule: { freq: "monthly" as const, interval: 1, placement: { kind: "nth" as const, nth: nth as Nth, weekday: wd } } }] : []),
    ...(last ? [{ id: "monthly-last", rule: { freq: "monthly" as const, interval: 1, placement: { kind: "nth" as const, nth: -1 as Nth, weekday: wd } } }] : []),
    { id: "yearly", rule: { freq: "yearly", interval: 1, month: m, placement: { kind: "day", day: d } } },
  ];
  return choices.map((c) => ({ ...c, label: ruleLabel(c.rule, start) }));
}

/* ---------- Existing data ---------- */
export type LegacyTaskRecurrence = { frequency: "daily" | "weekly" | "monthly"; interval: number; until?: string | null };
/**
 * Today's task recurrence columns (frequency/interval/until) as a rule, anchored on the task's planned date. Nothing is
 * rewritten: the old columns stay the source until a series is saved with the new editor.
 */
export function fromLegacy(legacy: LegacyTaskRecurrence | null | undefined, anchor: string): RecurrenceRule | null {
  if (!legacy || !validDate(anchor)) return null;
  const rule: RecurrenceRule = { freq: legacy.frequency, interval: legacy.interval, ...(legacy.until ? { until: legacy.until } : {}) };
  if (legacy.frequency === "weekly") rule.weekdays = [weekdayOf(anchor)];
  if (legacy.frequency === "monthly") rule.placement = { kind: "day", day: parts(anchor).d };
  return validRule(rule) ? rule : null;
}

/** Scope of an edit to a recurring item. */
export type EditScope = "occurrence" | "future" | "series";
export const scopeLabels: Record<EditScope, { label: string; detail: string }> = {
  occurrence: { label: "This one", detail: "Only this date changes" },
  future: { label: "This and future", detail: "Earlier dates stay as they were" },
  series: { label: "Entire series", detail: "Every date, past and future" },
};
export { iso as isoDate };
