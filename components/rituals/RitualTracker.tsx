"use client";
import { useMemo, type CSSProperties } from "react";
import { accentStyle } from "@/lib/appearance-values";
import { dateLabel, weekDates } from "@/lib/dates";
import { ritualFeedback, ritualReducer, ritualStreak, type RitualDefinition, type RitualState } from "@/lib/rituals";
import { calendarWeeks, habitState, monthDates, monthKeys, ratioLevel, share, square, squareLabel, type Square, type TrackerLayout, type TrackerPeriod } from "@/lib/ritual-tracker";
import { playSound } from "@/lib/muse-sound";
import { useRitualFeedback } from "../MuseRitualFeedback";
import { useRituals } from "./RitualStore";
import { useRitualView } from "./ConnectedRituals";
import { RitualWeekCell } from "./RitualWeekCell";

type EditEntry = (ritual: RitualDefinition, date: string, anchor: HTMLElement, onComplete: (value: number | null) => void) => void;
type Props = { period: TrackerPeriod; layout: TrackerLayout; habitId: string | "all"; date: string; today: string; rituals: RitualDefinition[]; onDate: (date: string, period?: TrackerPeriod, layout?: TrackerLayout) => void; onEditEntry: EditEntry };

const weekdayLetters = ["M", "T", "W", "T", "F", "S", "S"];
const monthShort = (key: string) => new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(`${key}-15T12:00:00Z`));
const groupStyle = (state: RitualState, ritual: RitualDefinition) => accentStyle(state.groups.find((g) => g.id === ritual.groupId)?.accent);
const categoryOf = (ritual: RitualDefinition, s: Square) => ritual.categories?.find((c) => c.id === s.category);

/**
 * Week / Month / Year × Grid / Focus / Heatmap (#85). Every square is the same Rituals record the week grid edits,
 * read through `useRitualView` (so connected habits show their source values and stay read-only).
 */
export function RitualTracker({ period, layout, habitId, date, today, rituals, onDate, onEditEntry }: Props) {
  const { state } = useRitualView();
  const habit = rituals.find((r) => r.id === habitId) ?? null;
  const slices = useMemo(() => new Map(rituals.map((r) => [r.id, habitState(state, r)])), [state, rituals]);
  const slice = (r: RitualDefinition) => slices.get(r.id) ?? habitState(state, r);
  if (!rituals.length) return <p className="muse-tracker-empty">Add a ritual to start a tracker.</p>;

  if (layout === "grid") {
    if (period === "month") {
      const days = monthDates(date);
      return <div className="muse-tracker muse-tracker-grid" style={{ "--days": days.length } as CSSProperties}>
        <div className="muse-tracker-grid-head" aria-hidden="true"><span />{days.map((d) => <span key={d} data-today={d === today || undefined} data-weekend={[0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay()) || undefined}><b>{weekdayLetters[(new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7]}</b>{Number(d.slice(8))}</span>)}<span>Month</span></div>
        {rituals.map((r) => { const s = share(slice(r), r, days, today);
          return <div key={r.id} className="muse-tracker-grid-row" style={groupStyle(state, r)}>
            <span className="muse-tracker-name">{r.name}</span>
            {days.map((d) => <TrackerCell key={d} ritual={r} date={d} today={today} sliceState={slice(r)} onEditEntry={onEditEntry} />)}
            <span className="muse-tracker-share" title={r.type === "category" ? `${s.met} of ${s.decided} days logged` : `${s.met} of ${s.decided} met`}>{s.decided ? `${s.met}/${s.decided}` : "—"}</span>
          </div>; })}
      </div>;
    }
    // Year grid: one square per month, shaded by the share of decided goals met that month.
    const months = monthKeys(date);
    return <div className="muse-tracker muse-tracker-grid" data-period="year" style={{ "--days": 12 } as CSSProperties}>
      <div className="muse-tracker-grid-head" aria-hidden="true"><span />{months.map((m) => <span key={m} data-today={today.startsWith(m) || undefined}>{monthShort(m)}</span>)}<span>Year</span></div>
      {rituals.map((r) => { const yearShare = share(slice(r), r, months.flatMap((m) => monthDates(`${m}-01`)), today);
        return <div key={r.id} className="muse-tracker-grid-row" style={groupStyle(state, r)}>
          <span className="muse-tracker-name">{r.name}</span>
          {months.map((m) => { const s = share(slice(r), r, monthDates(`${m}-01`), today);
            return <button key={m} type="button" className="muse-tracker-square" data-level={ratioLevel(s.ratio)} data-empty={s.decided === 0 || undefined} aria-label={`${r.name}, ${monthShort(m)}: ${s.decided ? `${s.met} of ${s.decided} ${r.type === "category" ? "days logged" : "goals met"}` : "nothing decided"}. Open the month`} title={s.decided ? `${s.met} of ${s.decided}` : "Nothing decided"} onClick={() => onDate(`${m}-01`, "month", "grid")} />; })}
          <span className="muse-tracker-share">{yearShare.decided ? `${Math.round((yearShare.ratio ?? 0) * 100)}%` : "—"}</span>
        </div>; })}
    </div>;
  }

  if (layout === "focus") {
    if (!habit) return <p className="muse-tracker-empty">Choose a ritual to focus on.</p>;
    const st = slice(habit), streak = ritualStreak(state, habit, today), dates = period === "week" ? weekDates(date) : period === "month" ? monthDates(date) : monthKeys(date).flatMap((m) => monthDates(`${m}-01`));
    const s = share(st, habit, dates, today);
    const head = <div className="muse-tracker-focus-head"><h3>{habit.name}</h3><p>{s.decided ? habit.type === "category" ? `${s.met} of ${s.decided} days logged` : `${s.met} of ${s.decided} met` : "Nothing decided yet"} · streak {streak.count} {streak.unit}</p></div>;
    if (period === "week") return <div className="muse-tracker muse-tracker-focus" style={groupStyle(state, habit)}>{head}
      <div className="muse-tracker-focus-week">{weekDates(date).map((d) => <div key={d} className={d === today ? "muse-today-ring" : undefined} data-today={d === today || undefined}><span>{new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`))} {Number(d.slice(8))}</span><RitualWeekCell ritual={habit} date={d} today={today} selected={d === date} onEditEntry={onEditEntry} /></div>)}</div>
      <CategoryLegend ritual={habit} /></div>;
    if (period === "month") return <div className="muse-tracker muse-tracker-focus" style={groupStyle(state, habit)}>{head}
      <MonthCalendar date={date} today={today} render={(d) => <RitualWeekCell ritual={habit} date={d} today={today} selected={d === date} onEditEntry={onEditEntry} />} />
      <CategoryLegend ritual={habit} /></div>;
    return <YearSheet ritual={habit} sliceState={st} rituals={rituals} sliceOf={slice} date={date} today={today} onMonth={(m) => onDate(`${m}-01`, "month", "focus")} style={groupStyle(state, habit)} />;
  }

  return null;
}

/** A Monday-first month calendar; `render` draws each date. */
function MonthCalendar({ date, today, render, mini = false }: { date: string; today: string; render: (d: string) => React.ReactNode; mini?: boolean }) {
  return <div className="muse-tracker-calendar" data-mini={mini || undefined}>
    {!mini && weekdayLetters.map((l, i) => <span key={i} className="muse-tracker-cal-head" aria-hidden="true">{l}</span>)}
    {calendarWeeks(date).flat().map((d, i) => d ? <div key={d} className={`muse-tracker-cal-day${d === today ? " muse-today-ring" : ""}`} data-today={d === today || undefined}>{!mini && <span className="muse-tracker-cal-num">{Number(d.slice(8))}</span>}{render(d)}</div> : <span key={`b${i}`} aria-hidden="true" />)}
  </div>;
}

/** A compact, editable square for the month grid: same actions as the week cell (cycle a checkbox, or open the entry sheet). */
function TrackerCell({ ritual, date, today, sliceState, onEditEntry }: { ritual: RitualDefinition; date: string; today: string; sliceState: RitualState; onEditEntry: EditEntry }) {
  const { state, dispatch, store, status } = useRituals();
  const { trigger, effect } = useRitualFeedback();
  const s = square(sliceState, ritual, date, today), c = categoryOf(ritual, s);
  const connected = !!ritual.connection && date >= ritual.connection.since;
  const disabled = connected || !status.loaded || !!status.error || s.status === "unscheduled" || s.status === "upcoming";
  function record(value: number | null, cycle = false) {
    const action = { type: cycle ? "entry/cycle" as const : "entry/set" as const, ritualId: ritual.id, date, value, today, now: new Date().toISOString() };
    const feedback = ritualFeedback(state, ritualReducer(state, action), ritual, date, today);
    dispatch(action);
    if (feedback) store.whenSaved(() => { trigger(feedback.kind); playSound(feedback.kind === "constellation" ? "celebrate" : "complete"); });
  }
  const label = `${ritual.name}, ${dateLabel(date)}: ${squareLabel(ritual, s, c?.label)}${connected ? ". Connected; edit the source record" : ""}`;
  return <span className="muse-tracker-cellwrap"><button type="button" className={`muse-tracker-square${date === today ? " muse-today-ring" : ""}`} data-level={s.level} data-status={s.status} data-today={date === today || undefined} data-category={c ? true : undefined}
    style={c ? { "--category": c.color } as CSSProperties : undefined} disabled={disabled} aria-label={label} title={label}
    onClick={(e) => { if (ritual.type === "checkbox") record(null, true); else onEditEntry(ritual, date, e.currentTarget, record); }}>{s.status === "missed" ? "×" : ""}</button>{effect}</span>;
}

function CategoryLegend({ ritual }: { ritual: RitualDefinition }) {
  if (ritual.type !== "category" || !ritual.categories?.length) return null;
  return <ul className="muse-tracker-legend" aria-label={`${ritual.name} categories`}>{ritual.categories.map((c) => <li key={c.id}><span className="muse-tracker-square" data-category style={{ "--category": c.color } as CSSProperties} aria-hidden="true" />{c.label}</li>)}</ul>;
}
function HeatLegend({ ritual }: { ritual: RitualDefinition | null }) {
  if (ritual?.type === "category") return <CategoryLegend ritual={ritual} />;
  return <ul className="muse-tracker-legend" aria-label="Key">
    <li><span className="muse-tracker-square" data-level={0} data-status="unknown" aria-hidden="true" />{ritual ? "Not logged" : "Nothing decided"}</li>
    <li><span className="muse-tracker-scale" aria-hidden="true">{([1, 2, 3, 4] as const).map((l) => <span key={l} className="muse-tracker-square" data-level={l} />)}</span>{ritual ? "Partial → complete" : "Fewer → all rituals met"}</li>
    {ritual && <li><span className="muse-tracker-square" data-status="missed" aria-hidden="true">×</span>Missed</li>}
    <li><span className="muse-tracker-square" data-status="unscheduled" aria-hidden="true" />Not scheduled</li>
  </ul>;
}

/**
 * The bullet-journal year tracker: months across the top (J–D), days 1–31 down the side, every day of the year in one
 * sheet, with the key beside it and a Month / Review column (each month's most common category, or its share of goals
 * met). For "All rituals", a day is shaded by the share of decided rituals met.
 */
function YearSheet({ ritual, sliceState, rituals, sliceOf, date, today, onMonth, style }: { ritual: RitualDefinition | null; sliceState: RitualState | null; rituals: RitualDefinition[]; sliceOf: (r: RitualDefinition) => RitualState; date: string; today: string; onMonth: (month: string) => void; style?: CSSProperties }) {
  const months = monthKeys(date);
  const day = (d: string): { level: Square["level"]; status: string; color?: string; label: string } => {
    if (ritual && sliceState) { const s = square(sliceState, ritual, d, today), c = categoryOf(ritual, s); return { level: s.level, status: s.status, color: c?.color, label: squareLabel(ritual, s, c?.label) }; }
    let met = 0, decided = 0;
    for (const r of rituals) { if (r.type === "weekly-target") continue; const s = square(sliceOf(r), r, d, today); if (["unscheduled", "open", "upcoming", "unknown"].includes(s.status)) continue; decided++; if (s.level === 4) met++; }
    return { level: d > today ? 0 : ratioLevel(decided ? met / decided : null), status: d > today ? "upcoming" : decided ? "decided" : "unknown", label: decided ? `${met} of ${decided} rituals met` : d > today ? "upcoming" : "nothing decided" };
  };
  const review = (m: string): { color?: string; level?: Square["level"]; label: string } | null => {
    const dates = monthDates(`${m}-01`).filter((d) => d <= today);
    if (!dates.length) return null;
    if (ritual?.type === "category" && sliceState) {
      const counts = new Map<string, number>();
      for (const d of dates) { const c = categoryOf(ritual, square(sliceState, ritual, d, today)); if (c) counts.set(c.id, (counts.get(c.id) ?? 0) + 1); }
      const top = [...counts].sort((a, b) => b[1] - a[1])[0], c = top && ritual.categories?.find((x) => x.id === top[0]);
      return c ? { color: c.color, label: `mostly ${c.label} (${top[1]} days)` } : null;
    }
    if (ritual && sliceState) { const sh = share(sliceState, ritual, dates, today); return sh.decided ? { level: ratioLevel(sh.ratio), label: `${sh.met} of ${sh.decided} met` } : null; }
    let met = 0, decided = 0; for (const r of rituals) { if (r.type === "weekly-target") continue; const sh = share(sliceOf(r), r, dates, today); met += sh.met; decided += sh.decided; }
    return decided ? { level: ratioLevel(met / decided), label: `${met} of ${decided} met` } : null;
  };
  const cell = (d: string, extra?: CSSProperties) => { const p = day(d);
    return <span className={`muse-sheet-cell${d === today ? " muse-today-ring" : ""}`} data-level={p.level} data-status={p.status} data-category={p.color ? true : undefined} data-today={d === today || undefined} style={{ ...(p.color ? { "--category": p.color } : {}), ...extra } as CSSProperties} role="img" aria-label={`${dateLabel(d)}: ${p.label}`} title={`${dateLabel(d)} · ${p.label}`}>{p.status === "missed" ? "×" : ""}</span>; };
  return <div className="muse-tracker muse-tracker-sheetwrap" style={style}>
    <h3 className="muse-sheet-title">{ritual ? ritual.name : "All rituals"} <span>{date.slice(0, 4)}</span></h3>
    <div className="muse-sheet-layout">
      <div className="muse-sheet" role="group" aria-label={`${ritual?.name ?? "All rituals"}, ${date.slice(0, 4)}: months across, days down`}>
        <span aria-hidden="true" />{months.map((m) => <button key={m} type="button" className="muse-sheet-month" onClick={() => onMonth(m)} title={`Open ${monthShort(m)}`}>{monthShort(m).slice(0, 1)}<span className="sr-only">{monthShort(m)}: open the month</span></button>)}
        {Array.from({ length: 31 }, (_, i) => [<span key={`n${i}`} className="muse-sheet-day" aria-hidden="true">{i + 1}</span>,
          ...months.map((m) => { const d = `${m}-${String(i + 1).padStart(2, "0")}`; return monthDates(`${m}-01`).includes(d) ? <span key={d} className="muse-sheet-slot">{cell(d)}</span> : <span key={d} className="muse-sheet-slot" data-void aria-hidden="true" />; })])}
      </div>
      <aside className="muse-sheet-side">
        {ritual?.type === "category" ? <CategoryLegend ritual={ritual} /> : <HeatLegend ritual={ritual} />}
        <table className="muse-sheet-review"><caption className="sr-only">Month review</caption><thead><tr><th scope="col">Month</th><th scope="col">Review</th></tr></thead>
          <tbody>{months.map((m) => { const r = review(m); return <tr key={m}><th scope="row">{monthShort(m)}</th><td>{r ? <span className="muse-sheet-cell" data-level={r.level ?? 4} data-category={r.color ? true : undefined} style={r.color ? { "--category": r.color } as CSSProperties : undefined} role="img" aria-label={r.label} title={r.label} /> : null}</td></tr>; })}</tbody></table>
      </aside>
    </div>
  </div>;
}
