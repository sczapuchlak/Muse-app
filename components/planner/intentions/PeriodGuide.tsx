"use client";
import Link from "next/link";
import { shiftDate, weekDates } from "@/lib/dates";
import { intentionRange, type IntentionPeriod, type IntentionRange } from "@/lib/intentions/periods";

const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { ...o, timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

/**
 * A period's own way of looking around (#119 Intentions, Option A): the week as seven days, the month as its weeks,
 * the quarter as three months, the year as four quarters. Pure navigation derived from the range: nothing here is
 * stored, copied or written, so it needs no data and can never disagree with the pages it links to.
 */
export function PeriodGuide({ range, today, go }: { range: IntentionRange; today: string; go: (period: IntentionPeriod, date: string) => void }) {
  const inside = (r: IntentionRange) => !!today && today >= r.start && today <= r.end;
  const jump = (period: IntentionPeriod, anchor: string) => { const r = intentionRange(period, anchor); go(period, inside(r) ? today : r.start); };
  const total = daysBetween(range.start, range.end) + 1, elapsed = !today ? 0 : today < range.start ? 0 : today > range.end ? total : daysBetween(range.start, today) + 1;
  const noun = range.period, pct = Math.round(100 * elapsed / total);
  const progress = <div className="muse-intentions-progress" role="img" aria-label={elapsed === 0 ? `This ${noun} hasn’t started` : elapsed >= total ? `This ${noun} is complete` : `Day ${elapsed} of ${total}`}>
    <span style={{ width: `${pct}%` }} /><small>{elapsed === 0 ? `Starts ${fmt(range.start, { month: "short", day: "numeric" })}` : elapsed >= total ? `${total} days · complete` : `Day ${elapsed} of ${total}`}</small></div>;

  if (range.period === "week") {
    const days = weekDates(range.start);
    return <nav className="muse-intentions-guide" data-period="week" aria-label="The seven days of this week">
      <ol className="muse-intentions-days">{days.map((d) => <li key={d} data-today={d === today || undefined}>
        <Link href={`/planner?view=agenda&date=${d}`} aria-label={`Open ${fmt(d, { weekday: "long", month: "long", day: "numeric" })} in your planner`}><small>{fmt(d, { weekday: "short" })}</small><strong>{Number(d.slice(8))}</strong></Link></li>)}</ol>
      {progress}</nav>;
  }
  if (range.period === "month") {
    const weeks: { start: string; end: string }[] = [];
    for (let s = weekDates(range.start)[0]; s <= range.end; s = shiftDate(s, 7)) weeks.push({ start: s, end: shiftDate(s, 6) });
    return <nav className="muse-intentions-guide" data-period="month" aria-label="The weeks of this month">
      <ol className="muse-intentions-ladder">{weeks.map((w, i) => <li key={w.start} data-today={(today >= w.start && today <= w.end) || undefined}>
        <button type="button" onClick={() => jump("week", w.start)}><small>Week {i + 1}</small><strong>{fmt(w.start, { month: "short", day: "numeric" })} – {fmt(w.end, w.end.slice(0, 7) === w.start.slice(0, 7) ? { day: "numeric" } : { month: "short", day: "numeric" })}</strong></button></li>)}</ol>
      {progress}</nav>;
  }
  if (range.period === "quarter") {
    const months = [0, 1, 2].map((i) => `${range.start.slice(0, 4)}-${String(Number(range.start.slice(5, 7)) + i).padStart(2, "0")}-01`);
    return <nav className="muse-intentions-guide" data-period="quarter" aria-label="The three months of this season">
      <ol className="muse-intentions-lanes">{months.map((m, i) => { const r = intentionRange("month", m); return <li key={m} data-today={inside(r) || undefined}>
        <button type="button" onClick={() => jump("month", m)}><small>Month {i + 1}</small><strong>{fmt(m, { month: "long" })}</strong></button></li>; })}</ol>
      {progress}</nav>;
  }
  const year = range.start.slice(0, 4), quarters = [1, 4, 7, 10].map((m, i) => ({ q: i + 1, start: `${year}-${String(m).padStart(2, "0")}-01`, label: ["Jan – Mar", "Apr – Jun", "Jul – Sep", "Oct – Dec"][i] }));
  return <nav className="muse-intentions-guide" data-period="year" aria-label="The four quarters of this year">
    <ol className="muse-intentions-quarters">{quarters.map((q) => { const r = intentionRange("quarter", q.start); return <li key={q.q} data-today={inside(r) || undefined}>
      <button type="button" onClick={() => jump("quarter", q.start)}><small>{q.label}</small><strong>Q{q.q}</strong></button></li>; })}</ol>
    {progress}</nav>;
}
