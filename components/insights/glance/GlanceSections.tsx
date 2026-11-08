"use client";
import type { CSSProperties, ReactNode } from "react";
import { MuseIcon, type MuseIconName } from "../../MuseIcon";
import { MuseStar } from "../../MuseStar";
import type { DayData, DailyPriority } from "@/lib/data/daily";
import { priorityCompletion } from "@/lib/data/daily-projections";
import { emotionCatalog } from "@/lib/emotions";
import { mealLabels, mealSlots, moodQuadrants, type DailyMealAssignment, type EmotionQuadrant } from "@/lib/models";
import type { EmotionalCheckIn } from "@/lib/mood";
import { formatWaterAmount } from "@/lib/water";
import { monthlyRatings, type DailyGlance, type DayRating, type GlanceRange, type movementGlance, type waterGlance } from "@/lib/insights/glance";

const families: EmotionQuadrant[] = ["yellow", "green", "blue", "red"];
const familyWords = (q: EmotionQuadrant) => `${moodQuadrants[q].energy === "high" ? "High" : "Low"} energy · ${moodQuadrants[q].pleasantness}`;
const weekday = (d: string, style: "short" | "narrow" = "short") => new Intl.DateTimeFormat("en-US", { weekday: style, timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const longDay = (d: string) => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const shortDay = (d: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const monthShort = (m: string) => new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** One glance card: the shared Muse card with a small prismatic heading. */
export function GlanceCard({ id, title, icon, children, wide, note }: { id: string; title: string; icon?: MuseIconName; children: ReactNode; wide?: boolean; note?: ReactNode }) {
  return <section className="muse-card muse-glance-card" data-wide={wide || undefined} aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className="muse-glance-card-title">{icon ? <MuseIcon name={icon} size={18} treatment="prismatic" /> : <MuseStar size={18} prismatic />}{title}</h2>
    {children}
    {note && <p className="muse-glance-note">{note}</p>}
  </section>;
}
const Empty = ({ children }: { children: ReactNode }) => <p className="muse-glance-empty">{children}</p>;

// ---------- Headline tiles ----------
export function RatingSummary({ daily }: { daily: DailyGlance }) {
  const { rating, energy, stress } = daily;
  return <GlanceCard id="glance-rating" title="Overall Day" icon="mood" note={rating.days ? `Average of ${plural(rating.days, "rated day")}. Unrated days are left out.` : undefined}>
    {rating.average === null ? <Empty>No days rated yet.</Empty> : <>
      <p className="muse-glance-hero"><strong>{rating.average.toFixed(1)}</strong><small> / 10</small></p>
      <dl className="muse-glance-pair">
        <div><dt>Energy</dt><dd>{energy.average === null ? "—" : energy.average.toFixed(1)}{energy.days > 0 && <small> · {plural(energy.days, "day")}</small>}</dd></div>
        <div><dt>Stress</dt><dd>{stress.average === null ? "—" : stress.average.toFixed(1)}{stress.days > 0 && <small> · {plural(stress.days, "day")}</small>}</dd></div>
      </dl>
    </>}
  </GlanceCard>;
}

export function PrioritiesSummary({ summary }: { summary: DailyGlance["priorities"] }) {
  return <GlanceCard id="glance-priorities" title="Priorities" icon="favorite" note={summary.unknown ? `${plural(summary.unknown, "priority", "priorities")} with no recorded outcome aren’t counted as open or done.` : summary.planned ? `${summary.linked} linked to tasks · ${summary.standalone} standalone` : undefined}>
    {!summary.planned ? <Empty>No priorities set.</Empty> : <>
      <p className="muse-glance-hero"><strong>{summary.completed}</strong><small> of {summary.planned} done</small></p>
      <Meter value={summary.completed} max={summary.planned} label={`${summary.completed} of ${summary.planned} priorities completed`} />
      {summary.open > 0 && <p className="small-label">{summary.open} still open</p>}
    </>}
  </GlanceCard>;
}
/** Day view: the day's own priorities with their recorded outcome (task-linked ones follow the task). */
export function DayPriorities({ day }: { day?: DayData }) {
  const list = (day?.priorities ?? []) as DailyPriority[];
  return <GlanceCard id="glance-day-priorities" title="Priorities" icon="favorite" note={list.some((p) => p.task_id) ? "Linked priorities show their task’s outcome." : undefined}>
    {!list.length ? <Empty>No priorities set for this day.</Empty> : <ol className="muse-glance-priorities">{list.map((p) => {
      const done = priorityCompletion(p, "display");
      return <li key={p.id} data-done={done === true || undefined}><span className="muse-glance-priority-mark" aria-hidden="true">{done === true ? "✓" : done === false ? "•" : "?"}</span>
        <span>{p.text || "Untitled priority"}</span><span className="small-label">{done === true ? "Done" : done === false ? "Open" : "Not recorded"}{p.task_id ? " · Task" : ""}</span></li>;
    })}</ol>}
  </GlanceCard>;
}

export function WaterSummary({ water, loaded }: { water: ReturnType<typeof waterGlance>; loaded: boolean }) {
  const main = water[0];
  return <GlanceCard id="glance-water" title="Water" icon="water" note={main ? `Average across ${plural(main.days, "logged day")}; days without a log are left out.${water.length > 1 ? " Different units are kept apart." : ""}` : undefined}>
    {!loaded ? <Empty>Loading…</Empty> : !main ? <Empty>No water logged.</Empty> : water.map((w) => <div key={w.unit} className="muse-glance-water">
      <p className="muse-glance-hero"><strong>{formatWaterAmount(w.average)}</strong><small> {w.unit} a day</small></p>
      {w.goalDays > 0 && <><Meter value={w.goalMet} max={w.goalDays} label={`Goal met on ${w.goalMet} of ${w.goalDays} days`} /><p className="small-label">Goal met {w.goalMet} of {plural(w.goalDays, "day")} with a goal</p></>}
    </div>)}
  </GlanceCard>;
}
function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  return <div className="muse-glance-meter" role="img" aria-label={label} title={label}><span style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} /></div>;
}

// ---------- Period visuals ----------
const ratingStyle = (v: number | null) => ({ "--rating": v === null ? 0 : v / 10 }) as CSSProperties;
const familyOf = (ids: string[]) => [...new Set(ids.map((id) => emotionCatalog.find((e) => e.id === id)?.quadrant).filter((q): q is EmotionQuadrant => !!q))];

/** Week: seven tiny Dayprints. Each shows only what was recorded; an empty day stays visibly empty. */
export function DayStrip({ range, days, checkIns, today, onOpen }: { range: GlanceRange; days: Record<string, DayData | undefined>; checkIns: EmotionalCheckIn[]; today: string; onOpen: (d: string) => void }) {
  return <section className="muse-glance-week" aria-label="Your week, day by day">{range.days.map((d) => {
    const r = days[d]?.record, rating = r?.overall_day ?? null, three = r?.day_in_three ?? [], fams = familyOf(checkIns.filter((c) => c.date === d).flatMap((c) => c.emotionIds));
    const future = !!today && d > today, empty = !r && !checkIns.some((c) => c.date === d);
    const label = `${longDay(d)}: ${rating === null ? "not rated" : `Overall Day ${rating} of 10`}${three.length ? `, Day in Three ${three.join(" ")}` : ""}${fams.length ? `, feelings ${fams.map((f) => familyWords(f)).join("; ")}` : ""}. Open the day`;
    return <button key={d} type="button" className={`muse-glance-mini${d === today ? " muse-today-ring" : ""}`} data-today={d === today || undefined} data-future={future || undefined} data-empty={empty || undefined} aria-label={future ? `${longDay(d)}, not yet` : label} onClick={() => onOpen(d)}>
      <span className="muse-glance-mini-day">{weekday(d)}<strong>{Number(d.slice(8))}</strong></span>
      <span className="muse-glance-mini-three" aria-hidden="true">{three.length ? three.join("") : <span className="muse-glance-dash">—</span>}</span>
      <span className="muse-glance-mini-bar" aria-hidden="true" data-missing={rating === null || undefined} style={ratingStyle(rating)}><i /></span>
      <span className="muse-glance-mini-rating" aria-hidden="true">{rating === null ? "·" : rating}</span>
      <span className="muse-glance-mini-feelings" aria-hidden="true">{fams.map((f) => <i key={f} data-quadrant={f} />)}</span>
    </button>;
  })}</section>;
}

/** Month: a calendar where each day glows by its Overall Day. Unrated days are outlined, never shaded as zero. */
export function MonthCalendar({ range, days, today, onOpen }: { range: GlanceRange; days: Record<string, DayData | undefined>; today: string; onOpen: (d: string) => void }) {
  const lead = (new Date(`${range.start}T12:00:00Z`).getUTCDay() + 6) % 7;
  return <section className="muse-card muse-glance-card muse-glance-month" aria-labelledby="glance-month-title">
    <h2 id="glance-month-title" className="muse-glance-card-title"><MuseIcon name="calendar" size={18} treatment="prismatic" />The month in color</h2>
    <div className="muse-glance-calendar" role="grid" aria-label="Days of the month by Overall Day">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => <span key={w} className="muse-glance-weekday" aria-hidden="true">{w}</span>)}
      {Array.from({ length: lead }, (_, i) => <span key={`pad-${i}`} aria-hidden="true" />)}
      {range.days.map((d) => { const r = days[d]?.record, rating = r?.overall_day ?? null, emoji = r?.day_in_three?.[0];
        return <button key={d} type="button" role="gridcell" className={`muse-glance-cell${d === today ? " muse-today-ring" : ""}`} data-rated={rating !== null || undefined} data-today={d === today || undefined} data-future={!!today && d > today || undefined} style={ratingStyle(rating)}
          title={`${shortDay(d)} · ${rating === null ? "not rated" : `${rating}/10`}`} aria-label={`${longDay(d)}: ${rating === null ? "not rated" : `Overall Day ${rating} of 10`}${r?.day_in_three?.length ? `, ${r.day_in_three.join(" ")}` : ""}. Open the day`} onClick={() => onOpen(d)}>
          <span>{Number(d.slice(8))}</span>{emoji && <em aria-hidden="true">{emoji}</em>}</button>; })}
    </div>
    <p className="muse-glance-note"><span className="muse-glance-legend" aria-hidden="true"><i style={ratingStyle(2)} /><i style={ratingStyle(6)} /><i style={ratingStyle(10)} /></span>Brighter means a higher Overall Day. Outlined days weren’t rated.</p>
  </section>;
}

/** Year: one column per month — the average Overall Day and how many days it rests on. */
export function YearMonths({ range, ratings, days, onOpen }: { range: GlanceRange; ratings: DayRating[]; days: Record<string, DayData | undefined>; onOpen: (d: string) => void }) {
  const months = monthlyRatings(ratings);
  const emojiOf = (m: string) => { const c = new Map<string, number>(); for (const d of range.days) if (d.startsWith(m)) for (const e of days[d]?.record?.day_in_three ?? []) c.set(e, (c.get(e) ?? 0) + 1); return [...c].sort((a, b) => b[1] - a[1])[0]?.[0]; };
  return <section className="muse-card muse-glance-card muse-glance-year" aria-labelledby="glance-year-title">
    <h2 id="glance-year-title" className="muse-glance-card-title"><MuseIcon name="calendar" size={18} treatment="prismatic" />Month by month</h2>
    <ol className="muse-glance-months">{months.map((m) => <li key={m.month}>
      <button type="button" onClick={() => onOpen(`${m.month}-01`)} title={`${monthShort(m.month)} · ${m.average === null ? "no ratings" : `${m.average.toFixed(1)}/10 across ${plural(m.days, "day")}`}`}
        aria-label={`${monthShort(m.month)}: ${m.average === null ? "no ratings" : `average Overall Day ${m.average.toFixed(1)} across ${plural(m.days, "rated day")}`}. Open the month`}>
        <span className="muse-glance-month-emoji" aria-hidden="true">{emojiOf(m.month) ?? ""}</span>
        <span className="muse-glance-month-bar" data-missing={m.average === null || undefined} aria-hidden="true"><i style={{ height: `${m.average === null ? 0 : Math.max(4, m.average * 10)}%` }} /></span>
        <span className="muse-glance-month-value" aria-hidden="true">{m.average === null ? "—" : m.average.toFixed(1)}</span>
        <span className="muse-glance-month-name" aria-hidden="true">{monthShort(m.month)}</span>
      </button></li>)}</ol>
    <p className="muse-glance-note">Bars show the average Overall Day of rated days. The emoji is that month’s most-chosen Day in Three.</p>
  </section>;
}

// ---------- Feelings and expression ----------
export function EmotionSnapshot({ daily }: { daily: DailyGlance }) {
  const total = families.reduce((n, f) => n + daily.families[f], 0);
  return <GlanceCard id="glance-feelings" title="How it felt" icon="mood" note={daily.checkIns ? `From ${plural(daily.checkIns, "check-in")}. A feeling counts once per check-in.` : undefined}>
    {!daily.emotions.length ? <Empty>No feelings recorded.</Empty> : <>
      <ul className="muse-glance-feelings">{daily.emotions.slice(0, 6).map(({ id, count }) => { const e = emotionCatalog.find((x) => x.id === id); return e && <li key={id}><span className="muse-mood-history-feeling" data-quadrant={e.quadrant}>{e.emoji} {e.name}</span><span className="small-label">×{count}</span></li>; })}</ul>
      {total > 0 && <><div className="muse-glance-families" role="img" aria-label={`Feeling families: ${families.filter((f) => daily.families[f]).map((f) => `${familyWords(f)} ${daily.families[f]}`).join(", ")}`}>
        {families.filter((f) => daily.families[f]).map((f) => <i key={f} data-quadrant={f} style={{ flexGrow: daily.families[f] }} title={`${familyWords(f)} · ${daily.families[f]}`} />)}</div>
        <ul className="muse-glance-family-key">{families.filter((f) => daily.families[f]).map((f) => <li key={f}><i data-quadrant={f} aria-hidden="true" />{familyWords(f)} <span className="small-label">{daily.families[f]}</span></li>)}</ul></>}
    </>}
  </GlanceCard>;
}

export function ThreeFavorites({ daily }: { daily: DailyGlance }) {
  return <GlanceCard id="glance-three" title="Day in Three" icon="sparkle" note={daily.dayInThreeDays ? `Most chosen across ${plural(daily.dayInThreeDays, "day")}.` : undefined}>
    {!daily.dayInThree.length ? <Empty>No Day in Three recorded.</Empty>
      : <ul className="muse-glance-emoji">{daily.dayInThree.slice(0, 8).map(({ emoji, count }, i) => <li key={emoji} data-rank={i < 3 ? i + 1 : undefined} title={`${emoji} chosen ${plural(count, "time")}`}><span aria-hidden="true">{emoji}</span><small aria-label={`${emoji} chosen ${plural(count, "time")}`}>{count}</small></li>)}</ul>}
  </GlanceCard>;
}

export function GoodDays({ daily, onOpen }: { daily: DailyGlance; onOpen: (d: string) => void }) {
  return <GlanceCard id="glance-good" title="Bright days" icon="favorite" note={daily.rating.best.length ? "Your highest-rated days." : undefined}>
    {!daily.rating.best.length ? <Empty>{daily.rating.days ? "No standout days yet." : "No days rated yet."}</Empty>
      : <ol className="muse-glance-good">{daily.rating.best.map((b) => <li key={b.date}><button type="button" className="text-button" onClick={() => onOpen(b.date)}>{longDay(b.date)}</button><span className="muse-glance-good-score">{b.value}<small>/10</small></span></li>)}</ol>}
  </GlanceCard>;
}

export function IntentionsList({ intentions, onOpen }: { intentions: DailyGlance["intentions"]; onOpen: (d: string) => void }) {
  const shown = intentions.slice(-6).reverse();
  return <GlanceCard id="glance-intentions" title="Intentions" icon="notes" note={intentions.length > shown.length ? `${intentions.length - shown.length} earlier intentions not shown.` : undefined}>
    {!intentions.length ? <Empty>No intentions set.</Empty>
      : <ul className="muse-glance-intentions">{shown.map((x) => <li key={x.date}><button type="button" className="text-button" onClick={() => onOpen(x.date)}>{shortDay(x.date)}</button><span>{x.emoji ? `${x.emoji} ` : ""}{x.text}</span></li>)}</ul>}
  </GlanceCard>;
}

// ---------- Wellness ----------
export function MovementCard({ movement, loaded }: { movement: ReturnType<typeof movementGlance>; loaded: boolean }) {
  return <GlanceCard id="glance-movement" title="Movement" icon="movement" note={movement.sessions ? "Recorded activity only; plans aren’t counted." : undefined}>
    {!loaded ? <Empty>Loading…</Empty> : !movement.sessions ? <Empty>No movement recorded.</Empty> : <>
      <p className="muse-glance-hero"><strong>{movement.days}</strong><small> active {movement.days === 1 ? "day" : "days"}</small></p>
      {movement.timedSessions > 0 && <p className="small-label">{movement.minutes} min across {plural(movement.timedSessions, "timed session")}</p>}
      <ul className="muse-glance-tags">{movement.top.map((t) => <li key={t.id}>{t.name} <span className="small-label">×{t.count}</span></li>)}</ul>
    </>}
  </GlanceCard>;
}
export function PlannedMeals({ meals, loaded }: { meals: DailyMealAssignment[]; loaded: boolean }) {
  const sorted = [...meals].sort((a, b) => mealSlots.indexOf(a.slot) - mealSlots.indexOf(b.slot));
  return <GlanceCard id="glance-meals" title="Meals planned" icon="meals" note={sorted.length ? "What was planned in Nourish, not a food log." : undefined}>
    {!loaded ? <Empty>Loading…</Empty> : !sorted.length ? <Empty>No meals planned.</Empty>
      : <ul className="muse-glance-meals">{sorted.map((m) => <li key={m.id}><span className="small-label">{mealLabels[m.slot]}</span>{m.title}</li>)}</ul>}
  </GlanceCard>;
}
