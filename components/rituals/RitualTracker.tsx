"use client";
import { useMemo, useRef, type CSSProperties } from "react";
import { usePlannerHeight } from "../planner/usePlannerHeight";
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

/** One ink per day of the month, cycling like a row of gel pens (pink → purple). */
const dayInk = ["#f06fa3", "#f59a4a", "#f2c93b", "#7cc95a", "#5fb7e6", "#45c2a6", "#b685e0"];
const periodTitleOf = (d: string) => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${d.slice(0, 7)}-15T12:00:00Z`));
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

  if (layout === "grid" && period === "month") {
    // The paper habit tracker: habits down the left, every day across, ruled touching cells, a dot per done day in
    // that day's rainbow color (categories keep theirs), a slash for missed, shaded weekends and daily totals.
    const days = monthDates(date), weekday = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay();
    const daily = rituals.filter((r) => r.type !== "weekly-target");
    const doneBy = new Map(days.map((d) => [d, d <= today ? daily.reduce((n, r) => n + (square(slice(r), r, d, today).level === 4 ? 1 : 0), 0) : 0]));
    const total = [...doneBy.values()].reduce((a, b) => a + b, 0), best = Math.max(0, ...doneBy.values()), maxDay = Math.max(1, daily.length);
    const chips = [`${total} done this month`, ...(days.includes(today) ? [`today ${doneBy.get(today)} of ${daily.length}`] : []), ...(best ? [`best day ${best}`] : [])];
    return <div className="muse-tracker muse-mgrid-wrap">
      <header className="muse-sheet-head"><h3 className="muse-sheet-title">Habit tracker <span>{periodTitleOf(date)}</span></h3><ul className="muse-sheet-chips">{chips.map((c) => <li key={c}>{c}</li>)}</ul></header>
      <div className="muse-mgrid" role="grid" aria-label={`Habit tracker, ${periodTitleOf(date)}`} style={{ "--days": days.length } as CSSProperties}>
        <div className="muse-mgrid-row muse-mgrid-head" role="row">
          <span className="muse-mgrid-name" role="columnheader">Habits</span>
          {days.map((d) => <span key={d} role="columnheader" className={`muse-mgrid-day${d === today ? " muse-today-ring" : ""}`} data-weekend={[0, 6].includes(weekday(d)) || undefined} data-today={d === today || undefined}>
            <b>{weekdayLetters[(weekday(d) + 6) % 7]}</b>{Number(d.slice(8))}</span>)}
          <span className="muse-mgrid-total" role="columnheader">Month</span>
        </div>
        {rituals.map((r) => { const sh = share(slice(r), r, days, today);
          return <div key={r.id} className="muse-mgrid-row" role="row" style={groupStyle(state, r)}>
            <span className="muse-mgrid-name" role="rowheader" title={r.name}>{r.name}</span>
            {days.map((d) => <span key={d} role="gridcell" className="muse-mgrid-slot" data-weekend={[0, 6].includes(weekday(d)) || undefined} data-today={d === today || undefined} style={{ "--day": dayInk[(Number(d.slice(8)) - 1) % dayInk.length], "--i": Number(d.slice(8)) } as CSSProperties}>
              <TrackerCell ritual={r} date={d} today={today} sliceState={slice(r)} onEditEntry={onEditEntry} dot /></span>)}
            <span className="muse-mgrid-total" title={r.type === "category" ? `${sh.met} of ${sh.decided} days logged` : `${sh.met} of ${sh.decided} met`}>{sh.decided ? `${sh.met}/${sh.decided}` : "—"}</span>
          </div>; })}
        <div className="muse-mgrid-row muse-mgrid-foot" role="row">
          <span className="muse-mgrid-name" role="rowheader">Done</span>
          {days.map((d) => { const n = doneBy.get(d) ?? 0; return <span key={d} role="gridcell" className="muse-mgrid-count" data-weekend={[0, 6].includes(weekday(d)) || undefined} data-today={d === today || undefined}>{d <= today && <b style={{ "--day": dayInk[(Number(d.slice(8)) - 1) % dayInk.length], "--fill": `${Math.round(n / maxDay * 100)}%` } as CSSProperties} data-zero={n === 0 || undefined} aria-label={`${n} done on ${dateLabel(d)}`}>{n}</b>}</span>; })}
          <span className="muse-mgrid-total" />
        </div>
      </div>
      <ul className="muse-tracker-legend muse-mgrid-key" aria-label="Key"><li><i data-k="done" />Done</li><li><i data-k="partial" />Partial</li><li><i data-k="missed" />Missed</li><li><i data-k="off" />Not scheduled</li><li><i data-k="row" />One colour per habit, so its rhythm shows</li></ul>
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
function TrackerCell({ ritual, date, today, sliceState, onEditEntry, dot = false }: { ritual: RitualDefinition; date: string; today: string; sliceState: RitualState; onEditEntry: EditEntry; dot?: boolean }) {
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
  return <span className="muse-tracker-cellwrap"><button type="button" className={dot ? "muse-mgrid-dot" : `muse-tracker-square${date === today ? " muse-today-ring" : ""}`} data-level={s.level} data-status={s.status} data-today={date === today || undefined} data-category={c ? true : undefined}
    style={c ? { "--category": c.color } as CSSProperties : undefined} disabled={disabled} aria-label={label} title={label}
    onClick={(e) => { if (ritual.type === "checkbox") record(null, true); else onEditEntry(ritual, date, e.currentTarget, record); }}></button>{effect}</span>;
}

function CategoryLegend({ ritual }: { ritual: RitualDefinition }) {
  if (ritual.type !== "category" || !ritual.categories?.length) return null;
  return <ul className="muse-tracker-legend" aria-label={`${ritual.name} categories`}>{ritual.categories.map((c) => <li key={c.id}><span className="muse-tracker-square" data-category style={{ "--category": c.color } as CSSProperties} aria-hidden="true" />{c.label}</li>)}</ul>;
}
/**
 * The bullet-journal year tracker: months across the top (J–D), days 1–31 down the side, every day of the year in one
 * sheet sized to the window (the Planner's height measurement), with the key (and day counts) beside it and a
 * Month / Review column: each month's most common category, or its share of goals met.
 */
function YearSheet({ ritual, sliceState, rituals, sliceOf, date, today, onMonth, style }: { ritual: RitualDefinition | null; sliceState: RitualState | null; rituals: RitualDefinition[]; sliceOf: (r: RitualDefinition) => RitualState; date: string; today: string; onMonth: (month: string) => void; style?: CSSProperties }) {
  const frame = useRef<HTMLDivElement>(null);
  usePlannerHeight(frame, `${ritual?.id}/${date.slice(0, 4)}`);
  const months = monthKeys(date), year = date.slice(0, 4), todayMonth = today.slice(0, 7), todayDay = Number(today.slice(8)), thisYear = today.startsWith(year);
  const days = useMemo(() => months.flatMap((m) => monthDates(`${m}-01`)), [months]);
  const day = (d: string): { level: Square["level"]; status: string; color?: string; categoryId?: string; label: string } => {
    if (ritual && sliceState) { if (d < ritual.startDate) return { level: 0, status: "before", label: "before this ritual began" }; const s = square(sliceState, ritual, d, today), c = categoryOf(ritual, s); return { level: s.level, status: s.status, color: c?.color, categoryId: c?.id, label: squareLabel(ritual, s, c?.label) }; }
    let met = 0, decided = 0;
    for (const r of rituals) { if (r.type === "weekly-target") continue; const s = square(sliceOf(r), r, d, today); if (["unscheduled", "open", "upcoming", "unknown"].includes(s.status)) continue; decided++; if (s.level === 4) met++; }
    return { level: d > today ? 0 : ratioLevel(decided ? met / decided : null), status: d > today ? "upcoming" : decided ? "decided" : "unknown", label: decided ? `${met} of ${decided} rituals met` : d > today ? "upcoming" : "nothing decided" };
  };
  const cells = new Map(days.map((d) => [d, day(d)]));
  const counts = new Map<string, number>(); for (const c of cells.values()) if (c.categoryId) counts.set(c.categoryId, (counts.get(c.categoryId) ?? 0) + 1);
  const yearShare = ritual && sliceState ? share(sliceState, ritual, days, today) : null;
  const streak = ritual && sliceState ? ritualStreak(sliceState, ritual, today) : null;
  type Review = { color?: string; ratio: number; label: string; short: string; tag?: string };
  const review = (m: string): Review | null => {
    const dates = monthDates(`${m}-01`).filter((d) => d <= today && (!ritual || d >= ritual.startDate));
    if (!dates.length || !ritual || !sliceState) return null;
    if (ritual.type === "category") {
      const tally = new Map<string, number>(); for (const d of dates) { const id = cells.get(d)?.categoryId; if (id) tally.set(id, (tally.get(id) ?? 0) + 1); }
      const total = [...tally.values()].reduce((x, y) => x + y, 0), top = [...tally].sort((x, y) => y[1] - x[1])[0], c = top && ritual.categories?.find((x) => x.id === top[0]);
      return c ? { color: c.color, ratio: total / dates.length, label: `mostly ${c.label}: ${top[1]} of ${total} logged days`, short: `${total}d`, tag: c.label } : null;
    }
    const sh = share(sliceState, ritual, dates, today);
    return sh.decided ? { ratio: sh.ratio ?? 0, label: `${sh.met} of ${sh.decided} met`, short: `${sh.met}/${sh.decided}` } : null;
  };
  const chips = ritual?.type === "category" ? [`${[...counts.values()].reduce((a, b) => a + b, 0)} days logged`, `${ritual.categories?.length ?? 0} categories`] : yearShare ? [`${yearShare.met} of ${yearShare.decided} met`, ...(yearShare.ratio !== null ? [`${Math.round(yearShare.ratio * 100)}%`] : [])] : [];
  if (streak && streak.count > 0) chips.push(`${streak.count}-${streak.unit === "weeks" ? "week" : "day"} streak`);
  return <div className="muse-tracker muse-tracker-sheetwrap" style={style}>
    <header className="muse-sheet-head"><h3 className="muse-sheet-title">{ritual ? ritual.name : "All rituals"} <span>{year}</span></h3>
      {chips.length > 0 && <ul className="muse-sheet-chips">{chips.map((c) => <li key={c}>{c}</li>)}</ul>}</header>
    <div ref={frame} className="muse-sheet-layout">
      <div className="muse-sheet" role="group" aria-label={`${ritual?.name ?? "All rituals"}, ${year}: months across, days down`}>
        <span className="muse-sheet-corner" aria-hidden="true" />{months.map((m, mi) => <button key={m} type="button" className="muse-sheet-month" data-current={thisYear && m === todayMonth || undefined} style={{ "--m": mi } as CSSProperties} onClick={() => onMonth(m)} title={`Open ${monthShort(m)}`}>{monthShort(m).slice(0, 1)}<span className="sr-only">{monthShort(m)}: open the month</span></button>)}
        {Array.from({ length: 31 }, (_, i) => [<span key={`n${i}`} className="muse-sheet-day" data-current={thisYear && i + 1 === todayDay || undefined} aria-hidden="true">{i + 1}</span>,
          ...months.map((m, mi) => { const d = `${m}-${String(i + 1).padStart(2, "0")}`, p = cells.get(d);
            const cross = thisYear && (m === todayMonth || i + 1 === todayDay) || undefined;
            if (!p) return <span key={d} className="muse-sheet-slot" data-void aria-hidden="true" />;
            return <span key={d} className="muse-sheet-slot" data-cross={cross}><span className={`muse-sheet-cell${d === today ? " muse-today-ring" : ""}`} data-level={p.level} data-status={p.status} data-category={p.color ? true : undefined} data-today={d === today || undefined}
              style={{ "--m": mi, ...(p.color ? { "--category": p.color } : {}) } as CSSProperties} role="img" aria-label={`${dateLabel(d)}: ${p.label}`} title={`${dateLabel(d)} · ${p.label}`}></span></span>; })])}
      </div>
      <aside className="muse-sheet-side">
        <section className="muse-sheet-panel" aria-label="Key">
          <h4>Key</h4>
          {ritual?.type === "category" ? <ul className="muse-sheet-key">{ritual.categories!.map((c) => <li key={c.id}><span className="muse-sheet-swatch" data-category style={{ "--category": c.color } as CSSProperties} aria-hidden="true" /><span>{c.label}</span><b>{counts.get(c.id) ?? 0}<small>days</small></b></li>)}</ul>
            : <ul className="muse-sheet-key" data-compact>
              <li><span className="muse-sheet-swatch" data-level="4" aria-hidden="true" /><span>Complete</span></li>
              <li><span className="muse-sheet-swatch" data-kind="partial" aria-hidden="true" /><span>Partial</span></li>
              <li><span className="muse-sheet-swatch" data-kind="missed" aria-hidden="true" /><span>Missed</span></li>
              <li><span className="muse-sheet-swatch" data-kind="empty" aria-hidden="true" /><span>Not logged</span></li>
              <li><span className="muse-sheet-swatch" data-kind="off" aria-hidden="true" /><span>Not scheduled</span></li>
            </ul>}
        </section>
        <section className="muse-sheet-panel muse-sheet-reviewpanel" aria-label="Month review">
          <h4>Month review</h4>
          <ol className="muse-sheet-months">{months.map((m) => { const r = review(m);
            return <li key={m} data-current={thisYear && m === todayMonth || undefined}>
              <button type="button" className="muse-sheet-mname" onClick={() => onMonth(m)}>{monthShort(m)}</button>
              <span className="muse-sheet-bar" aria-label={r ? `${monthShort(m)}: ${r.label}` : `${monthShort(m)}: nothing yet`} role="img">{r && <i style={{ "--w": `${Math.max(8, Math.round(r.ratio * 100))}%`, ...(r.color ? { "--category": r.color } : {}) } as CSSProperties} data-category={r.color ? true : undefined}>{r.tag && <em>{r.tag}</em>}</i>}</span>
              <small>{r?.short ?? ""}</small>
            </li>; })}</ol>
        </section>
      </aside>
    </div>
  </div>;
}
