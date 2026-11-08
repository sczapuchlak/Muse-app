"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MusePageHeader } from "../../MusePageHeader";
import { useMuseDate } from "../../MuseSession";
import { useMuseToday } from "../../useMuseToday";
import { useDailyData, useDailyRange } from "../../daily/DailyData";
import { useWellness } from "../../WellnessStore";
import { useWhimsyData } from "../../whimsy/WhimsyData";
import { PeriodTitle } from "../../planner/PeriodTitle";
import { Dayprint } from "../../mood/Dayprint";
import { useInsightsPreferences } from "../useInsightsPreferences";
import { dailyEditSample } from "@/lib/daily-edit-data";
import { emotionalRecords } from "@/lib/data/daily-store";
import { dayExpression, dayPulse } from "@/lib/data/daily-projections";
import { emotionCatalog } from "@/lib/emotions";
import { validDate } from "@/lib/dates";
import { dailyGlance, glancePeriods, glanceRange, glanceTitle, movementGlance, readingGlance, currentlyReading, shiftGlance, waterGlance, type GlancePeriod } from "@/lib/insights/glance";
import { DayPriorities, DayStrip, EmotionSnapshot, GoodDays, IntentionsList, MonthCalendar, MovementCard, PlannedMeals, PrioritiesSummary, RatingSummary, ThreeFavorites, WaterSummary, YearMonths } from "./GlanceSections";
import { ReadingSection } from "./ReadingSection";
import "../Insights.css";
import "./Glance.css";

const periodKey = "muse.insights.period";
const isPeriod = (v: unknown): v is GlancePeriod => glancePeriods.some((p) => p.id === v);

/**
 * Insights 2.0 — Life at a Glance (#97). One page, one Day / Week / Month / Year selector, over existing records only:
 * Daily Edit (with Mood check-ins), Wellness water/movement/meals and Bookshelf. Read-only; editing stays in each
 * module. The detailed Insights are hidden behind `CLASSIC_INSIGHTS`, not removed.
 */
export function InsightsGlance() {
  const query = useSearchParams();
  const [date, setDate] = useMuseDate(dailyEditSample.date.iso);
  const { profile, snapshot } = useDailyData(), today = useMuseToday(profile.timeZone);
  const prefs = useInsightsPreferences(profile.id);
  const [period, setPeriodState] = useState<GlancePeriod>(() => { const q = query.get("period"); return isPeriod(q) ? q : "week"; });
  // The last period is remembered on this device; a ?period= link wins.
  useEffect(() => { if (isPeriod(query.get("period"))) return; const t = window.setTimeout(() => { try { const saved = window.localStorage.getItem(periodKey); if (isPeriod(saved)) setPeriodState(saved); } catch { /* defaults */ } }, 0); return () => window.clearTimeout(t); }, [query]);
  const setPeriod = (p: GlancePeriod) => { setPeriodState(p); try { window.localStorage.setItem(periodKey, p); } catch { /* this device only */ } const url = new URL(window.location.href); url.searchParams.set("period", p); window.history.replaceState(null, "", url); };
  const anchor = validDate(date) ? date : today || dailyEditSample.date.iso;
  const range = useMemo(() => glanceRange(period, anchor), [period, anchor]);

  const days = useDailyRange(range.start, range.end);
  const wellness = useWellness(), whimsy = useWhimsyData();
  const checkIns = useMemo(() => emotionalRecords(snapshot.days), [snapshot.days]);
  const daily = useMemo(() => dailyGlance(snapshot.days, checkIns, emotionCatalog, range), [snapshot.days, checkIns, range]);
  const water = useMemo(() => waterGlance(wellness.state.water, range, wellness.state.waterSettings?.unit ?? "oz"), [wellness.state.water, wellness.state.waterSettings, range]);
  const movement = useMemo(() => movementGlance(wellness.state.activities, wellness.state.types, range), [wellness.state.activities, wellness.state.types, range]);
  const records = whimsy.records;
  const books = useMemo(() => records?.books ?? [], [records]), sessions = useMemo(() => records?.sessions ?? [], [records]);
  const reading = useMemo(() => readingGlance(books, sessions, range), [books, sessions, range]);
  const nightstand = useMemo(() => currentlyReading(books, sessions), [books, sessions]);
  const open = (d: string, p: GlancePeriod = "day") => { setDate(d); setPeriod(p); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const future = !!today && range.start > today, partial = !!today && range.end > today && range.start <= today;
  const title = glanceTitle(range);

  return <main className="muse-page muse-insights-page muse-glance" data-period={period}>
    <MusePageHeader title="Insights" />
    <div className="muse-glance-toolbar">
      <PeriodTitle title={title} date={anchor} onChange={setDate} />
      <div className="muse-glance-tools">
        <div className="muse-segmented" role="group" aria-label="Period">{glancePeriods.map((p) => <button key={p.id} type="button" aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>{p.label}</button>)}</div>
        <div className="muse-glance-nav" role="group" aria-label={`Move by ${period}`}>
          <button type="button" className="muse-button" aria-label={`Previous ${period}`} onClick={() => setDate(shiftGlance(period, anchor, -1))}>‹</button>
          <button type="button" className="muse-button" disabled={!today} onClick={() => today && setDate(today)}>Today</button>
          <button type="button" className="muse-button" aria-label={`Next ${period}`} onClick={() => setDate(shiftGlance(period, anchor, 1))}>›</button>
        </div>
      </div>
    </div>
    <p className="muse-glance-lede">{lede(period, daily.recordedDays, partial ? range.days.filter((d) => d <= today).length : range.days.length, partial, future)}</p>
    {days.error ? <p role="alert">Daily Edit history couldn’t load. <button type="button" className="muse-button" onClick={() => void days.retry()}>Retry</button></p>
      : !days.loaded ? <p role="status" className="small-label">Gathering your days…</p> : null}

    <div className="muse-glance-body" aria-busy={!days.loaded}>
      {period === "day" && <>
        <Dayprint date={range.start} today={today} weekNav={false} expression={dayExpression(snapshot.days[range.start])} pulse={dayPulse(range.start, snapshot.days[range.start])}
          records={checkIns.filter((r) => r.date === range.start)} influences={snapshot.influences}
          water={wellness.status.loaded ? wellness.state.water.find((w) => w.date === range.start) : undefined}
          activities={wellness.status.loaded ? wellness.state.activities.filter((a) => a.date === range.start).map((a) => wellness.state.types.find((t) => t.id === a.typeId)?.name ?? "Recorded activity") : []}
          editHref={(r) => `/mood?date=${r.date}`} />
        <div className="muse-glance-grid">
          <DayPriorities day={snapshot.days[range.start]} />
          <PlannedMeals meals={wellness.state.assignments.filter((m) => m.date === range.start)} loaded={wellness.status.loaded} />
        </div>
      </>}

      {period !== "day" && <>
        {period === "week" && <DayStrip range={range} days={snapshot.days} checkIns={checkIns} today={today} onOpen={(d) => open(d)} />}
        {period === "month" && <MonthCalendar range={range} days={snapshot.days} today={today} onOpen={(d) => open(d)} />}
        {period === "year" && <YearMonths range={range} ratings={daily.ratings} days={snapshot.days} onOpen={(d) => open(d, "month")} />}
        <div className="muse-glance-tiles">
          <RatingSummary daily={daily} />
          <PrioritiesSummary summary={daily.priorities} />
          <WaterSummary water={water} loaded={wellness.status.loaded} />
        </div>
        <div className="muse-glance-grid">
          <EmotionSnapshot daily={daily} />
          <ThreeFavorites daily={daily} />
          <GoodDays daily={daily} onOpen={(d) => open(d)} />
          <MovementCard movement={movement} loaded={wellness.status.loaded} />
          {period !== "year" && <IntentionsList intentions={daily.intentions} onOpen={(d) => open(d)} />}
        </div>
      </>}

      <ReadingSection period={period} reading={reading} nightstand={nightstand} status={whimsy.status} onRetry={whimsy.retry}
        mode={prefs.preferences.readingProgress} saving={prefs.saving}
        onMode={(readingProgress) => void prefs.save({ ...prefs.preferences, readingProgress })} />
    </div>
    <footer className="muse-footer">From your saved records · Missing days stay missing · Editing happens in Daily Edit, Mood, Wellness and Bookshelf</footer>
  </main>;
}

function lede(period: GlancePeriod, recorded: number, total: number, partial: boolean, future: boolean) {
  if (future) return "This hasn’t happened yet. Come back when it has.";
  if (period === "day") return recorded ? "A portrait of the day, from what you recorded." : "Nothing was recorded on this day.";
  const noun = { week: "week", month: "month", year: "year" }[period];
  if (!recorded) return `Nothing recorded this ${noun} yet.`;
  return `${recorded} of ${total} days recorded${partial ? " so far" : ""} this ${noun}.`;
}
