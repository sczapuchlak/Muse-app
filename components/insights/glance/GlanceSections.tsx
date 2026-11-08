"use client";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { MuseIcon, type MuseIconName } from "../../MuseIcon";
import type { DayData, DailyPriority } from "@/lib/data/daily";
import { priorityCompletion } from "@/lib/data/daily-projections";
import { emotionCatalog } from "@/lib/emotions";
import { mealLabels, mealSlots, moodQuadrants, type DailyMealAssignment, type EmotionQuadrant } from "@/lib/models";
import type { EmotionalCheckIn } from "@/lib/mood";
import { formatWaterAmount } from "@/lib/water";
import { dayNote, monthlyRatings, type DailyGlance, type DayRating, type GlanceRange, type MonthSummary, type MovementCategory, type movementGlance, type waterGlance } from "@/lib/insights/glance";

export const families: EmotionQuadrant[] = ["yellow", "green", "blue", "red"];
export const familyWords = (q: EmotionQuadrant) => `${moodQuadrants[q].energy === "high" ? "High" : "Low"} energy · ${moodQuadrants[q].pleasantness}`;
const weekday = (d: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
export const longDay = (d: string) => new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const shortDay = (d: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const monthShort = (m: string) => new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`));
const monthLong = (m: string) => new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`));
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const ratingStyle = (v: number | null) => ({ "--rating": v === null ? 0 : v / 10 }) as CSSProperties;
const familyOf = (ids: string[]) => [...new Set(ids.map((id) => emotionCatalog.find((e) => e.id === id)?.quadrant).filter((q): q is EmotionQuadrant => !!q))];
const categoryIcon: Record<MovementCategory, MuseIconName> = { strength: "dumbbell" as MuseIconName, cardio: "run" as MuseIconName, mobility: "yoga" as MuseIconName, other: "movement" };
const categoryLabel: Record<MovementCategory, string> = { strength: "Strength", cardio: "Cardio", mobility: "Mobility", other: "Other" };

// ---------- Shared pieces ----------
/** One glance card: shared Muse card, a bold heading with a gradient icon bubble, and an optional footnote. */
export function GlanceCard({ id, title, icon, children, area, note, action, tone }: { id: string; title: string; icon: MuseIconName; children: ReactNode; area?: string; note?: ReactNode; action?: ReactNode; tone?: "warm" | "cool" | "pop" }) {
  return <section className="muse-card muse-glance-card" data-area={area} data-tone={tone} aria-labelledby={`${id}-title`}>
    <header className="muse-glance-card-head">
      <h2 id={`${id}-title`} className="muse-glance-card-title"><span className="muse-glance-badge" aria-hidden="true"><MuseIcon name={icon} size={16} /></span>{title}</h2>
      {action}
    </header>
    <div className="muse-glance-card-body">{children}</div>
    {note && <p className="muse-glance-note">{note}</p>}
  </section>;
}
/** A soft, small empty state with a faded emoji, never a big blank box. */
export const Empty = ({ children, emoji = "✧" }: { children: ReactNode; emoji?: string }) => <p className="muse-glance-empty"><span aria-hidden="true">{emoji}</span>{children}</p>;
/** Hover/focus explanation for a visual mark. The trigger's own label carries the same words for screen readers. */
export const TipBox = ({ children }: { children: ReactNode }) => <span className="muse-glance-tip" aria-hidden="true">{children}</span>;
/** The "how to read this" strip: visible on every device, including touch. */
export function Key({ items }: { items: { swatch: ReactNode; label: string }[] }) {
  return <ul className="muse-glance-key" aria-label="How to read this">{items.map((x) => <li key={x.label}><span aria-hidden="true">{x.swatch}</span>{x.label}</li>)}</ul>;
}
export const keyBar = <i className="muse-glance-key-bar" />;
export const keyDots = <span className="muse-glance-key-dots">{families.map((f) => <i key={f} data-quadrant={f} />)}</span>;
function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  return <div className="muse-glance-meter" role="img" aria-label={label} title={label}><span style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} /></div>;
}
export function Ring({ value, max = 10, label, size = "md" }: { value: number | null; max?: number; label: string; size?: "sm" | "md" | "lg" }) {
  return <span className="muse-glance-ring" data-size={size} data-missing={value === null || undefined} role="img" aria-label={label} title={label} style={{ "--ring": value === null ? 0 : value / max } as CSSProperties}>
    <span><strong>{value === null ? "—" : Number.isInteger(value) ? value : value.toFixed(1)}</strong><small>/{max}</small></span></span>;
}

// ---------- Headline tiles ----------
export function RatingSummary({ daily, area }: { daily: DailyGlance; area?: string }) {
  const { rating, energy, stress } = daily;
  return <GlanceCard id="glance-rating" title="Overall Day" icon="mood" area={area} note={rating.days ? `Average of ${plural(rating.days, "rated day")}; unrated days are left out.` : undefined}>
    {rating.average === null ? <Empty emoji="🌙">No days rated yet.</Empty> : <div className="muse-glance-rating">
      <Ring value={rating.average} size="lg" label={`Average Overall Day ${rating.average.toFixed(1)} of 10`} />
      <dl className="muse-glance-pair">
        <div><dt>⚡ Energy</dt><dd>{energy.average === null ? "—" : energy.average.toFixed(1)}<small>{energy.days ? ` · ${plural(energy.days, "day")}` : ""}</small></dd></div>
        <div><dt>🌀 Stress</dt><dd>{stress.average === null ? "—" : stress.average.toFixed(1)}<small>{stress.days ? ` · ${plural(stress.days, "day")}` : ""}</small></dd></div>
      </dl>
    </div>}
  </GlanceCard>;
}

export function PrioritiesSummary({ summary, area }: { summary: DailyGlance["priorities"]; area?: string }) {
  return <GlanceCard id="glance-priorities" title="Priorities" icon="favorite" area={area} tone="pop"
    note={summary.unknown ? `${plural(summary.unknown, "priority", "priorities")} with no recorded outcome aren’t counted as open or done.` : undefined}>
    {!summary.planned ? <Empty emoji="⭐">No priorities set.</Empty> : <>
      <p className="muse-glance-hero"><strong>{summary.completed}</strong><small>of {summary.planned} done</small></p>
      <Meter value={summary.completed} max={summary.planned} label={`${summary.completed} of ${summary.planned} priorities completed`} />
      <ul className="muse-glance-chips">
        {summary.open > 0 && <li>• {summary.open} still open</li>}
        {summary.linked > 0 && <li>🔗 {summary.linked} linked to tasks</li>}
        {summary.standalone > 0 && <li>✦ {summary.standalone} standalone</li>}
      </ul>
    </>}
  </GlanceCard>;
}

/** Day view: the day's own priorities with their recorded outcome (task-linked ones follow the task). */
export function DayPriorities({ day, area }: { day?: DayData; area?: string }) {
  const list = (day?.priorities ?? []) as DailyPriority[];
  return <GlanceCard id="glance-day-priorities" title="Priorities" icon="favorite" area={area} tone="pop" note={list.some((p) => p.task_id) ? "Linked priorities show their task’s outcome." : undefined}>
    {!list.length ? <Empty emoji="⭐">No priorities set for this day.</Empty> : <ol className="muse-glance-priorities">{list.map((p) => {
      const done = priorityCompletion(p, "display");
      return <li key={p.id} data-state={done === true ? "done" : done === false ? "open" : "unknown"}>
        <span className="muse-glance-priority-mark" aria-hidden="true">{done === true ? "✓" : done === false ? "" : "?"}</span>
        <span className="muse-glance-priority-text">{p.text || "Untitled priority"}</span>
        <span className="muse-glance-state">{done === true ? "Done" : done === false ? "Open" : "Not recorded"}</span></li>;
    })}</ol>}
  </GlanceCard>;
}

export function WaterSummary({ water, loaded, area }: { water: ReturnType<typeof waterGlance>; loaded: boolean; area?: string }) {
  const main = water[0];
  return <GlanceCard id="glance-water" title="Water" icon="water" area={area} tone="cool" note={main ? `Average of ${plural(main.days, "logged day")}; days without a log are left out.${water.length > 1 ? " Different units are kept apart." : ""}` : undefined}>
    {!loaded ? <Empty>Loading…</Empty> : !main ? <Empty emoji="💧">No water logged.</Empty> : water.map((w) => <div key={w.unit} className="muse-glance-water">
      <p className="muse-glance-hero"><strong>{formatWaterAmount(w.average)}</strong><small>{w.unit} a day</small></p>
      {w.goalDays > 0 && <>
        <div className="muse-glance-drops" role="img" aria-label={`Goal met on ${w.goalMet} of ${w.goalDays} days with a goal`}>
          {Array.from({ length: Math.min(w.goalDays, 31) }, (_, i) => <i key={i} data-met={i < w.goalMet || undefined} />)}</div>
        <p className="muse-glance-sub">💧 Goal met {w.goalMet} of {plural(w.goalDays, "day")} with a goal</p></>}
    </div>)}
  </GlanceCard>;
}

// ---------- Week ----------
/** Week: seven tiny Dayprints. Each shows only what was recorded; an empty day stays visibly empty. */
export function DayStrip({ range, days, checkIns, today, onOpen }: { range: GlanceRange; days: Record<string, DayData | undefined>; checkIns: EmotionalCheckIn[]; today: string; onOpen: (d: string) => void }) {
  return <section className="muse-glance-weekwrap" aria-label="Your week, day by day">
    <div className="muse-glance-week">{range.days.map((d) => {
      const r = days[d]?.record, rating = r?.overall_day ?? null, three = r?.day_in_three ?? [], fams = familyOf(checkIns.filter((c) => c.date === d).flatMap((c) => c.emotionIds));
      const future = !!today && d > today, empty = !r && !checkIns.some((c) => c.date === d);
      const label = `${longDay(d)}: ${rating === null ? "not rated" : `Overall Day ${rating} of 10`}${three.length ? `, Day in Three ${three.join(" ")}` : ""}${fams.length ? `, feelings ${fams.map((f) => familyWords(f)).join("; ")}` : ""}. Open the day`;
      return <button key={d} type="button" className={`muse-glance-mini${d === today ? " muse-today-ring" : ""}`} data-today={d === today || undefined} data-future={future || undefined} data-empty={empty || undefined} aria-label={future ? `${longDay(d)}, not yet` : label} onClick={() => onOpen(d)}>
        <span className="muse-glance-mini-day">{weekday(d)}<strong>{Number(d.slice(8))}</strong></span>
        <span className="muse-glance-mini-three" aria-hidden="true">{three.length ? three.map((e, i) => <span key={i}>{e}</span>) : <span className="muse-glance-dash">·</span>}</span>
        <span className="muse-glance-mini-bar" aria-hidden="true" data-missing={rating === null || undefined} style={ratingStyle(rating)}><i /></span>
        <span className="muse-glance-mini-rating" aria-hidden="true">{rating === null ? "—" : <>{rating}<small>/10</small></>}</span>
        <span className="muse-glance-mini-feelings" aria-hidden="true">{fams.map((f) => <i key={f} data-quadrant={f} />)}</span>
        {!future && <TipBox><b>{longDay(d)}</b>{rating === null ? "Not rated" : `Overall Day ${rating}/10`}{three.length ? <>{" · "}{three.join(" ")}</> : null}{fams.map((f) => <span key={f}><i data-quadrant={f} />{familyWords(f)}</span>)}</TipBox>}
      </button>;
    })}</div>
    <Key items={[{ swatch: "😊", label: "Day in Three" }, { swatch: keyBar, label: "Overall Day (1–10)" }, { swatch: <b className="muse-glance-key-num">8/10</b>, label: "the rating itself" }, { swatch: keyDots, label: "feelings from check-ins" }]} />
  </section>;
}

// ---------- Month ----------
/** Month: a compact calendar that glows by Overall Day. Unrated days are outlined, never shaded as zero. */
export function MonthCalendar({ range, days, today, onOpen, area }: { range: GlanceRange; days: Record<string, DayData | undefined>; today: string; onOpen: (d: string) => void; area?: string }) {
  const lead = (new Date(`${range.start}T12:00:00Z`).getUTCDay() + 6) % 7;
  return <GlanceCard id="glance-month" title="The month in color" icon="calendar" area={area}>
    <div className="muse-glance-calendar" role="grid" aria-label="Days of the month by Overall Day">
      {["M", "T", "W", "T", "F", "S", "S"].map((w, i) => <span key={i} className="muse-glance-weekday" aria-hidden="true">{w}</span>)}
      {Array.from({ length: lead }, (_, i) => <span key={`pad-${i}`} aria-hidden="true" />)}
      {range.days.map((d) => { const r = days[d]?.record, rating = r?.overall_day ?? null, emoji = r?.day_in_three?.[0], future = !!today && d > today;
        return <button key={d} type="button" role="gridcell" className={`muse-glance-cell${d === today ? " muse-today-ring" : ""}`} data-rated={rating !== null || undefined} data-today={d === today || undefined} data-future={future || undefined} style={ratingStyle(rating)}
          aria-label={`${longDay(d)}: ${rating === null ? "not rated" : `Overall Day ${rating} of 10`}${r?.day_in_three?.length ? `, ${r.day_in_three.join(" ")}` : ""}. Open the day`} onClick={() => onOpen(d)}>
          <span className="muse-glance-cell-date">{Number(d.slice(8))}</span>{emoji && <em aria-hidden="true">{emoji}</em>}
          {!future && <TipBox><b>{longDay(d)}</b>{rating === null ? "Not rated" : `Overall Day ${rating}/10`}{r?.day_in_three?.length ? ` · ${r.day_in_three.join(" ")}` : ""}</TipBox>}
        </button>; })}
    </div>
    <Key items={[{ swatch: <span className="muse-glance-key-scale"><i style={ratingStyle(3)} /><i style={ratingStyle(6)} /><i style={ratingStyle(10)} /></span>, label: "brighter = higher Overall Day" }, { swatch: <i className="muse-glance-key-outline" />, label: "not rated" }, { swatch: "☕", label: "first Day in Three emoji" }]} />
  </GlanceCard>;
}

// ---------- Year ----------
/** Year: one capsule per month — the average Overall Day, labelled with its value and how many days it rests on. */
export function YearMonths({ range, ratings, days, onOpen, area }: { range: GlanceRange; ratings: DayRating[]; days: Record<string, DayData | undefined>; onOpen: (d: string) => void; area?: string }) {
  const months = monthlyRatings(ratings);
  const emojiOf = (m: string) => { const c = new Map<string, number>(); for (const d of range.days) if (d.startsWith(m)) for (const e of days[d]?.record?.day_in_three ?? []) c.set(e, (c.get(e) ?? 0) + 1); return [...c].sort((a, b) => b[1] - a[1])[0]?.[0]; };
  if (months.every((m) => m.average === null)) return <GlanceCard id="glance-year" title="Your year, month by month" icon="calendar" area={area}><Empty emoji="🗓️">No days rated this year yet. Each month fills in here as you rate your days.</Empty></GlanceCard>;
  return <GlanceCard id="glance-year" title="Your year, month by month" icon="calendar" area={area}>
    <ol className="muse-glance-months">{months.map((m) => { const e = emojiOf(m.month), text = m.average === null ? "No days rated" : `Average Overall Day ${m.average.toFixed(1)}/10 · ${plural(m.days, "rated day")}`;
      return <li key={m.month}>
        <button type="button" data-missing={m.average === null || undefined} onClick={() => onOpen(`${m.month}-01`)} aria-label={`${monthLong(m.month)}: ${text}${e ? `, most chosen Day in Three ${e}` : ""}. Open the month`}>
          <span className="muse-glance-month-emoji" aria-hidden="true">{e ?? ""}</span>
          <span className="muse-glance-month-bar" aria-hidden="true"><i style={{ height: `${m.average === null ? 0 : Math.max(6, m.average * 10)}%` }} /></span>
          <span className="muse-glance-month-value" aria-hidden="true">{m.average === null ? "·" : m.average.toFixed(1)}</span>
          <span className="muse-glance-month-name" aria-hidden="true">{monthShort(m.month)}</span>
          <span className="muse-glance-month-days" aria-hidden="true">{m.days ? `${m.days}d` : " "}</span>
          <TipBox><b>{monthLong(m.month)}</b>{text}{e ? ` · ${e} most chosen` : ""}</TipBox>
        </button></li>; })}</ol>
    <Key items={[{ swatch: keyBar, label: "average Overall Day of rated days" }, { swatch: <b className="muse-glance-key-num">12d</b>, label: "days rated that month" }, { swatch: "☕", label: "most-chosen Day in Three" }]} />
  </GlanceCard>;
}

/** Year stat strip: the year in five honest numbers. */
export function YearStats({ daily, booksFinished, workouts }: { daily: DailyGlance; booksFinished: number; workouts: number }) {
  const stats: { emoji: string; value: string; label: string }[] = [
    { emoji: "📔", value: String(daily.recordedDays), label: "days recorded" },
    { emoji: "✨", value: daily.rating.average === null ? "—" : daily.rating.average.toFixed(1), label: daily.rating.days ? `avg Overall Day · ${plural(daily.rating.days, "day")}` : "avg Overall Day" },
    { emoji: "💭", value: String(daily.checkIns), label: "mood check-ins" },
    { emoji: "🏃", value: String(workouts), label: "workouts" },
    { emoji: "📚", value: String(booksFinished), label: "books finished" },
  ];
  return <ul className="muse-glance-yearstats" aria-label="The year in numbers">{stats.map((s) => <li key={s.label}><span aria-hidden="true">{s.emoji}</span><strong>{s.value}</strong><small>{s.label}</small></li>)}</ul>;
}

/** A tiny 12-column bar chart for one yearly measure; months with nothing are a dot, never a zero bar. */
export function MonthBars({ id, title, icon, months, value, format, unitNote, emptyText, area, emoji, tone }: { id: string; title: string; icon: MuseIconName; months: MonthSummary[]; value: (m: MonthSummary) => number | null; format: (m: MonthSummary, v: number) => string; unitNote?: string; emptyText: string; area?: string; emoji: string; tone?: "warm" | "cool" | "pop" }) {
  const values = months.map(value), max = Math.max(0, ...values.map((v) => v ?? 0));
  return <GlanceCard id={id} title={title} icon={icon} area={area} tone={tone} note={max > 0 ? unitNote : undefined}>
    {max <= 0 ? <Empty emoji={emoji}>{emptyText}</Empty> : <ol className="muse-glance-minibars">{months.map((m, i) => { const v = values[i], has = v !== null && v > 0;
      return <li key={m.month} tabIndex={0} aria-label={`${monthLong(m.month)}: ${has ? format(m, v!) : "nothing recorded"}`}>
        <span className="muse-glance-minibar" data-missing={!has || undefined}><i style={{ height: `${has ? Math.max(8, (v! / max) * 100) : 0}%` }} /></span>
        <small aria-hidden="true">{monthShort(m.month).slice(0, 1)}</small>
        <TipBox><b>{monthLong(m.month)}</b>{has ? format(m, v!) : "Nothing recorded"}</TipBox>
      </li>; })}</ol>}
  </GlanceCard>;
}

/** Feelings across the year: each month's feeling families as a stacked column, with words in the key. */
export function YearFeelings({ months, area }: { months: MonthSummary[]; area?: string }) {
  const any = months.some((m) => m.checkIns > 0);
  return <GlanceCard id="glance-year-feelings" title="A year of feelings" icon="mood" area={area} note={any ? "Each column is a month; colors are feeling families from your check-ins." : undefined}>
    {!any ? <Empty emoji="💭">No feelings recorded this year.</Empty> : <>
      <ol className="muse-glance-feelcols">{months.map((m) => { const total = families.reduce((n, f) => n + m.families[f], 0);
        const words = total ? families.filter((f) => m.families[f]).map((f) => `${familyWords(f)} ${m.families[f]}`).join(", ") : "no check-ins";
        return <li key={m.month} tabIndex={0} aria-label={`${monthLong(m.month)}: ${words}`}>
          <span className="muse-glance-feelcol" data-missing={!total || undefined}>{families.filter((f) => m.families[f]).map((f) => <i key={f} data-quadrant={f} style={{ flexGrow: m.families[f] }} />)}</span>
          <small aria-hidden="true">{monthShort(m.month).slice(0, 1)}</small>
          <TipBox><b>{monthLong(m.month)}</b>{total ? families.filter((f) => m.families[f]).map((f) => <span key={f}><i data-quadrant={f} />{familyWords(f)} · {m.families[f]}</span>) : "No check-ins"}</TipBox>
        </li>; })}</ol>
      <Key items={families.map((f) => ({ swatch: <i className="muse-glance-key-dot" data-quadrant={f} />, label: familyWords(f) }))} />
    </>}
  </GlanceCard>;
}

// ---------- Feelings and expression ----------
export function EmotionSnapshot({ daily, area }: { daily: DailyGlance; area?: string }) {
  const total = families.reduce((n, f) => n + daily.families[f], 0);
  return <GlanceCard id="glance-feelings" title="How it felt" icon="mood" area={area} note={daily.checkIns ? `From ${plural(daily.checkIns, "check-in")}; a feeling counts once per check-in.` : undefined}>
    {!daily.emotions.length ? <Empty emoji="💭">No feelings recorded.</Empty> : <>
      <ul className="muse-glance-feelings">{daily.emotions.slice(0, 6).map(({ id, count }) => { const e = emotionCatalog.find((x) => x.id === id); return e && <li key={id}><span className="muse-mood-history-feeling" data-quadrant={e.quadrant}>{e.emoji} {e.name}<b className="muse-glance-count">×{count}</b></span></li>; })}</ul>
      {total > 0 && <><div className="muse-glance-families" role="img" aria-label={`Feeling families: ${families.filter((f) => daily.families[f]).map((f) => `${familyWords(f)} ${daily.families[f]}`).join(", ")}`}>
        {families.filter((f) => daily.families[f]).map((f) => <i key={f} data-quadrant={f} style={{ flexGrow: daily.families[f] }} title={`${familyWords(f)} · ${daily.families[f]}`} />)}</div>
        <Key items={families.filter((f) => daily.families[f]).map((f) => ({ swatch: <i className="muse-glance-key-dot" data-quadrant={f} />, label: `${familyWords(f)} · ${daily.families[f]}` }))} /></>}
    </>}
  </GlanceCard>;
}

export function ThreeFavorites({ daily, area, title = "Day in Three" }: { daily: DailyGlance; area?: string; title?: string }) {
  return <GlanceCard id="glance-three" title={title} icon="sparkle" area={area} tone="warm" note={daily.dayInThreeDays ? `Most chosen across ${plural(daily.dayInThreeDays, "day")}.` : undefined}>
    {!daily.dayInThree.length ? <Empty emoji="😊">No Day in Three recorded.</Empty>
      : <ul className="muse-glance-emoji">{daily.dayInThree.slice(0, 8).map(({ emoji, count }, i) => <li key={emoji} data-rank={i < 3 ? i + 1 : undefined}><span aria-hidden="true">{emoji}</span><small aria-label={`${emoji} chosen ${plural(count, "time")}`}>×{count}</small></li>)}</ul>}
  </GlanceCard>;
}

/** Bright days as little highlight cards: date, rating, the day's own emojis, and the day's own words if any. */
export function GoodDays({ daily, days, checkIns, onOpen, area, limit = 4 }: { daily: DailyGlance; days: Record<string, DayData | undefined>; checkIns: EmotionalCheckIn[]; onOpen: (d: string) => void; area?: string; limit?: number }) {
  const best = daily.rating.best.slice(0, limit);
  return <GlanceCard id="glance-good" title="Bright days" icon="favorite" area={area} tone="warm" note={best.length ? "Your highest-rated days. Notes are your own Mood reflections." : undefined}>
    {!best.length ? <Empty emoji="🌤️">{daily.rating.days ? "No standout days yet." : "No days rated yet."}</Empty>
      : <ul className="muse-glance-bright">{best.map((b) => { const note = dayNote(checkIns, b.date), three = days[b.date]?.record?.day_in_three ?? [];
        return <li key={b.date}>
          <button type="button" className="muse-glance-bright-card" onClick={() => onOpen(b.date)} aria-label={`${longDay(b.date)}, Overall Day ${b.value} of 10. Open the day`}>
            <span className="muse-glance-bright-score" aria-hidden="true">{b.value}<small>/10</small></span>
            <span className="muse-glance-bright-date">{shortDay(b.date)}<small>{new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date(`${b.date}T12:00:00Z`))}</small></span>
            {three.length > 0 && <span className="muse-glance-bright-three" aria-hidden="true">{three.join("")}</span>}
          </button>
          {note ? <p className="muse-glance-bright-note">“{note.length > 120 ? `${note.slice(0, 120)}…` : note}”</p>
            : <Link className="muse-glance-pill" data-size="sm" href={`/mood?date=${b.date}`}>✎ Add why it was bright</Link>}
        </li>; })}</ul>}
  </GlanceCard>;
}

export function IntentionsList({ intentions, onOpen, area, limit = 7 }: { intentions: DailyGlance["intentions"]; onOpen: (d: string) => void; area?: string; limit?: number }) {
  const shown = intentions.slice(-limit).reverse();
  return <GlanceCard id="glance-intentions" title="Intentions" icon="notes" area={area} note={intentions.length > shown.length ? `${intentions.length - shown.length} earlier intentions not shown.` : undefined}>
    {!intentions.length ? <Empty emoji="🌱">No intentions set.</Empty>
      : <ol className="muse-glance-intentions">{shown.map((x) => <li key={x.date}>
        <button type="button" className="muse-glance-datechip" onClick={() => onOpen(x.date)} aria-label={`Open ${longDay(x.date)}`}><small>{new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(`${x.date}T12:00:00Z`))}</small><strong>{Number(x.date.slice(8))}</strong></button>
        <span className="muse-glance-intention-emoji" aria-hidden="true">{x.emoji ?? "✦"}</span>
        <span className="muse-glance-intention-text">{x.text || "—"}</span></li>)}</ol>}
  </GlanceCard>;
}

// ---------- Wellness ----------
export function MovementCard({ movement, loaded, area, perWeek, weeks, byCategory }: { movement: ReturnType<typeof movementGlance>; loaded: boolean; area?: string; perWeek?: number | null; weeks?: number; byCategory?: Record<MovementCategory, number> }) {
  const cats = byCategory ? (Object.keys(byCategory) as MovementCategory[]).filter((c) => byCategory[c] > 0) : [];
  const maxCat = Math.max(1, ...cats.map((c) => byCategory![c]));
  return <GlanceCard id="glance-movement" title="Movement" icon="movement" area={area} tone="pop" note={movement.sessions ? `Recorded activity only; plans aren’t counted.${perWeek != null && weeks ? ` Per week = workouts ÷ ${weeks} ${weeks === 1 ? "week" : "weeks"} so far.` : ""}` : undefined}>
    {!loaded ? <Empty>Loading…</Empty> : !movement.sessions ? <Empty emoji="🏃">No movement recorded.</Empty> : <>
      <dl className="muse-glance-statrow">
        <div><dt>Workouts</dt><dd>{movement.sessions}</dd></div>
        <div><dt>Active days</dt><dd>{movement.days}</dd></div>
        {perWeek != null && <div><dt>Per week</dt><dd>{perWeek}</dd></div>}
        {movement.timedSessions > 0 && <div><dt>Minutes</dt><dd>{movement.minutes}</dd></div>}
      </dl>
      {cats.length > 0 && <ul className="muse-glance-catbars" aria-label="Workouts by category">{cats.map((c) => <li key={c}>
        <span className="muse-glance-badge" aria-hidden="true"><MuseIcon name={categoryIcon[c]} size={14} /></span><span>{categoryLabel[c]}</span>
        <span className="muse-glance-catbar" aria-hidden="true"><i style={{ width: `${(byCategory![c] / maxCat) * 100}%` }} /></span><b>{byCategory![c]}</b></li>)}</ul>}
      <ul className="muse-glance-chips">{movement.top.map((t) => <li key={t.id}>{t.name} <b>×{t.count}</b></li>)}</ul>
    </>}
  </GlanceCard>;
}
export function PlannedMeals({ meals, loaded, area }: { meals: DailyMealAssignment[]; loaded: boolean; area?: string }) {
  const sorted = [...meals].sort((a, b) => mealSlots.indexOf(a.slot) - mealSlots.indexOf(b.slot));
  const emoji: Record<string, string> = { breakfast: "🥐", lunch: "🥗", dinner: "🍝", snacks: "🍪" };
  return <GlanceCard id="glance-meals" title="Meals planned" icon="meals" area={area} tone="warm" note={sorted.length ? "What was planned in Nourish, not a food log." : undefined}>
    {!loaded ? <Empty>Loading…</Empty> : !sorted.length ? <Empty emoji="🍽️">No meals planned.</Empty>
      : <ul className="muse-glance-meals">{sorted.map((m) => <li key={m.id}><span className="muse-glance-meal-emoji" aria-hidden="true">{emoji[m.slot] ?? "🍽️"}</span><span><small>{mealLabels[m.slot]}</small>{m.title}</span></li>)}</ul>}
  </GlanceCard>;
}
