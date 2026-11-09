/**
 * Planner → Intentions (#117): the four planning periods. Weeks run Monday–Sunday like the rest of Muse; quarters are
 * calendar quarters (Jan, Apr, Jul, Oct). Dates are plain local dates (YYYY-MM-DD) in the person's Muse timezone:
 * "today" comes from their saved zone, and nothing here converts through UTC instants.
 */
import { shiftDate, validDate, weekDates } from "../dates";

export const intentionPeriods = [
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
] as const;
export type IntentionPeriod = typeof intentionPeriods[number]["id"];
export const isIntentionPeriod = (v: unknown): v is IntentionPeriod => intentionPeriods.some((p) => p.id === v);
export type IntentionRange = { period: IntentionPeriod; start: string; end: string };

const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-based
const monthEnd = (y: number, m: number) => `${y}-${pad(m)}-${pad(lastDay(y, m))}`;

/** The period that contains `anchor`. */
export function intentionRange(period: IntentionPeriod, anchor: string): IntentionRange {
  if (!validDate(anchor)) throw Error("Choose a valid date");
  const y = Number(anchor.slice(0, 4)), m = Number(anchor.slice(5, 7));
  if (period === "week") { const w = weekDates(anchor); return { period, start: w[0], end: w[6] }; }
  if (period === "month") return { period, start: `${y}-${pad(m)}-01`, end: monthEnd(y, m) };
  if (period === "quarter") { const first = Math.floor((m - 1) / 3) * 3 + 1; return { period, start: `${y}-${pad(first)}-01`, end: monthEnd(y, first + 2) }; }
  return { period, start: `${y}-01-01`, end: `${y}-12-31` };
}

/** The start of the period `steps` periods away (crosses year boundaries). */
export function shiftIntention(period: IntentionPeriod, anchor: string, steps: number): string {
  const { start } = intentionRange(period, anchor);
  if (period === "week") return shiftDate(start, 7 * steps);
  const y = Number(start.slice(0, 4)), m = Number(start.slice(5, 7));
  const months = period === "month" ? steps : period === "quarter" ? 3 * steps : 12 * steps;
  const index = y * 12 + (m - 1) + months;
  return `${Math.floor(index / 12)}-${pad((index % 12 + 12) % 12 + 1)}-01`;
}

const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { ...o, timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
/** "Nov 9 – 15, 2026", "November 2026", "Q4 2026 · Oct – Dec", "2026". */
export function intentionTitle(r: IntentionRange): string {
  if (r.period === "week") return r.start.slice(0, 7) === r.end.slice(0, 7)
    ? `${fmt(r.start, { month: "short", day: "numeric" })} – ${fmt(r.end, { day: "numeric" })}, ${r.end.slice(0, 4)}`
    : `${fmt(r.start, { month: "short", day: "numeric" })} – ${fmt(r.end, { month: "short", day: "numeric" })}, ${r.end.slice(0, 4)}`;
  if (r.period === "month") return fmt(r.start, { month: "long", year: "numeric" });
  if (r.period === "quarter") return `Q${quarterOf(r.start)} ${r.start.slice(0, 4)}`;
  return r.start.slice(0, 4);
}
export const quarterOf = (d: string) => Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1;
/** A short name for links and headings: "this week", "November", "Q4", "2026". */
export function intentionName(r: IntentionRange): string {
  if (r.period === "week") return `the week of ${fmt(r.start, { month: "short", day: "numeric" })}`;
  if (r.period === "month") return fmt(r.start, { month: "long" });
  if (r.period === "quarter") return `Q${quarterOf(r.start)}`;
  return r.start.slice(0, 4);
}
/** Where this period sits relative to today: a period can be planned ahead or revisited, never "late". */
export function intentionTense(r: IntentionRange, today: string): "past" | "current" | "future" {
  if (!today) return "current";
  return r.end < today ? "past" : r.start > today ? "future" : "current";
}
