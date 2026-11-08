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
import { useInsightsPreferences } from "../useInsightsPreferences";
import { dailyEditSample } from "@/lib/daily-edit-data";
import { emotionalRecords } from "@/lib/data/daily-store";
import { emotionCatalog } from "@/lib/emotions";
import { validDate } from "@/lib/dates";
import { dailyGlance, glancePeriods, glanceRange, glanceTitle, movementByCategory, movementGlance, movementRate, readingGlance, currentlyReading, shiftGlance, waterGlance, yearByMonth, type GlancePeriod } from "@/lib/insights/glance";
import { formatWaterAmount } from "@/lib/water";
import { DayPriorities, DayStrip, EmotionSnapshot, GoodDays, IntentionsList, LittleMoments, MonthBars, MonthCalendar, MovementCard, PlannedMeals, PrioritiesSummary, RatingSummary, ThreeFavorites, WaterSummary, YearFeelings, YearMonths, YearStats, plural } from "./GlanceSections";
import { DayPortrait } from "./DayPortrait";
import { useMemoryRange } from "../../memories/useMemories";
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
  const moments = useMemoryRange(range.start, range.end);
  const rate = useMemo(() => movementRate(movement.sessions, range, today), [movement.sessions, range, today]);
  const byCategory = useMemo(() => movementByCategory(wellness.state.activities, wellness.state.types, range), [wellness.state.activities, wellness.state.types, range]);
  const months = useMemo(() => period === "year" ? yearByMonth(range, snapshot.days, checkIns, emotionCatalog, wellness.state.water, water[0]?.unit, wellness.state.activities) : [], [period, range, snapshot.days, checkIns, wellness.state.water, water, wellness.state.activities]);
  const readingCard = (area?: string) => <ReadingSection area={area} period={period} reading={reading} nightstand={nightstand} status={whimsy.status} onRetry={whimsy.retry}
    mode={prefs.preferences.readingProgress} saving={prefs.saving} onMode={(readingProgress) => void prefs.save({ ...prefs.preferences, readingProgress })} />;

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
    {days.error ? <p role="alert" className="muse-glance-empty"><span aria-hidden="true">⚠️</span>Daily Edit history couldn’t load. <button type="button" className="muse-glance-pill" onClick={() => void days.retry()}>Retry</button></p>
      : !days.loaded ? <p role="status" className="muse-glance-lede">Gathering your days…</p> : null}

    <div className="muse-glance-layout" data-period={period} aria-busy={!days.loaded}>
      {period === "day" && <>
        <div data-area="hero"><DayPortrait memory={moments.memories[0] ?? null} date={range.start} day={snapshot.days[range.start]} checkIns={checkIns} influences={snapshot.influences} waterLoaded={wellness.status.loaded}
          water={wellness.state.water.find((w) => w.date === range.start)}
          activities={wellness.state.activities.filter((a) => a.date === range.start).map((a) => wellness.state.types.find((t) => t.id === a.typeId)?.name ?? "Recorded activity")} /></div>
        <DayPriorities day={snapshot.days[range.start]} area="a" />
        <PlannedMeals meals={wellness.state.assignments.filter((m) => m.date === range.start)} loaded={wellness.status.loaded} area="b" />
        {readingCard("c")}
      </>}

      {period === "week" && <>
        <div data-area="hero"><DayStrip range={range} days={snapshot.days} checkIns={checkIns} today={today} onOpen={(d) => open(d)} /></div>
        <div data-area="hero"><LittleMoments memories={moments.memories} checkIns={checkIns} onOpen={(d) => open(d)} period="week" /></div>
        <RatingSummary daily={daily} />
        <PrioritiesSummary summary={daily.priorities} />
        <WaterSummary water={water} loaded={wellness.status.loaded} />
        <EmotionSnapshot daily={daily} />
        <ThreeFavorites daily={daily} />
        <GoodDays daily={daily} days={snapshot.days} checkIns={checkIns} onOpen={(d) => open(d)} limit={3} />
        <IntentionsList intentions={daily.intentions} onOpen={(d) => open(d)} />
        <MovementCard movement={movement} loaded={wellness.status.loaded} />
        {readingCard()}
      </>}

      {period === "month" && <>
        <div data-area="cols" className="muse-glance-cols">
          <div className="muse-glance-col">
            <MonthCalendar range={range} days={snapshot.days} today={today} onOpen={(d) => open(d)} />
            <GoodDays daily={daily} days={snapshot.days} checkIns={checkIns} onOpen={(d) => open(d)} limit={4} />
          </div>
          <div className="muse-glance-col">
            <RatingSummary daily={daily} />
            <EmotionSnapshot daily={daily} />
            <WaterSummary water={water} loaded={wellness.status.loaded} />
          </div>
          <div className="muse-glance-col">
            <PrioritiesSummary summary={daily.priorities} />
            <MovementCard movement={movement} loaded={wellness.status.loaded} perWeek={rate.perWeek} weeks={rate.weeks} byCategory={byCategory} />
            <ThreeFavorites daily={daily} />
            {readingCard()}
          </div>
        </div>
        <div data-area="hero"><LittleMoments memories={moments.memories} checkIns={checkIns} onOpen={(d) => open(d)} period="month" /></div>
        <div data-area="hero"><IntentionsList intentions={daily.intentions} onOpen={(d) => open(d)} carousel /></div>
      </>}

      {period === "year" && <>
        <div data-area="stats"><YearStats daily={daily} booksFinished={reading.completed.length} workouts={movement.sessions} /></div>
        <div data-area="hero"><YearMonths range={range} ratings={daily.ratings} days={snapshot.days} onOpen={(d) => open(d, "month")} /></div>
        <div data-area="hero"><LittleMoments memories={moments.memories} checkIns={checkIns} onOpen={(d) => open(d)} period="year" /></div>
        <div data-area="cols" className="muse-glance-cols">
          <div className="muse-glance-col">
            <YearFeelings months={months} />
            <MonthBars id="glance-year-move" title="Movement" icon="movement" tone="pop" months={months} emoji="🏃" emptyText="No movement recorded this year."
              value={(m) => m.movement || null} format={(m, v) => `${plural(v, "workout")}`} unitNote={`${plural(movement.sessions, "workout")} across ${plural(movement.days, "active day")}.`} />
          </div>
          <div className="muse-glance-col">
            <ThreeFavorites daily={daily} title="The year in emoji" />
            <MonthBars id="glance-year-water" title="Water" icon="water" tone="cool" months={months} emoji="💧" emptyText="No water logged this year."
              value={(m) => m.water} format={(m, v) => `${formatWaterAmount(v)} ${water[0]?.unit ?? ""} a day · ${plural(m.waterDays, "logged day")}`} unitNote={water[0] ? `Average per logged day, in ${water[0].unit}.${water.length > 1 ? " Other units are kept apart." : ""}` : undefined} />
          </div>
          <div className="muse-glance-col">
            <MonthBars id="glance-year-priorities" title="Priorities done" icon="favorite" months={months} emoji="⭐" emptyText="No priorities completed this year."
              value={(m) => m.prioritiesDone || null} format={(m, v) => `${v} of ${m.prioritiesPlanned} done`} unitNote={`${daily.priorities.completed} of ${daily.priorities.planned} priorities done this year.`} />
            {readingCard()}
          </div>
        </div>
        <div data-area="hero"><GoodDays daily={daily} days={snapshot.days} checkIns={checkIns} onOpen={(d) => open(d)} limit={6} /></div>
      </>}
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
