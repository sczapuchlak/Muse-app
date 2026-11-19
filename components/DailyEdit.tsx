"use client";

import {WellnessCapture,WellnessSaveStatus} from "./WellnessStore";
import { DailyEditHeader } from "./DailyEditHeader";
import { PrioritiesCard } from "./PrioritiesCard";
import { MovementCard } from "./MovementCard";
import { WaterCard } from "./WaterCard";
import { ScheduleCard } from "./ScheduleCard";
import { MealsCard } from "./MealsCard";
import { MoodCard } from "./MoodCard";
import {DailyReflectionCard} from './daily/DailyReflectionCard';
import { DayPulseCard } from "./DayPulseCard";
import { DayInThreeCard } from "./DayInThree";
import {LittleRituals} from "./rituals/LittleRituals";
import {WellnessGoalsGlance} from "./nourish/WellnessGoalsGlance";
import "./nourish/WellnessGoals.css";
import {DreamDayviewWidget} from "./whimsy/DreamDayviewWidget";
import {FortuneDayviewWidget} from "./whimsy/FortuneDayviewWidget";
import {BooksDayviewWidget} from "./whimsy/BooksDayviewWidget";
import {ChapterDayviewWidget} from "./envision/compass/stories/ChapterDayviewWidget";
import {JournalDayviewWidget} from "./journal/JournalDayviewWidget";
import "./envision/compass/stories/ChapterDayviewWidget.css";
import {PlannerPersistenceStatus} from "./PlannerStore";
import { CosmicForecast } from "./CosmicForecast";
import { useMuseDate } from "./MuseSession";
import { Suspense, useState, type CSSProperties, type ReactNode } from "react";
import { DailyArrange, phoneOrder, useDailyLayout, type DailyCardKey } from "./daily/DailyLayout";
import { MuseIcon } from "./MuseIcon";
import { WelcomeOrientation } from "./WelcomeOrientation";

import "./DailyEdit.css";
import { dailyEditSample } from "@/lib/daily-edit-data";
import { sampleMovementTypes } from "@/lib/sample-taxonomies";
import { emotionCatalog } from "@/lib/emotions";
import { mockDay } from "@/lib/dates";
import {useDailyData,DailySaveStatus,DailyCapture} from "./daily/DailyData";

export function DailyEdit() {
  const [selectedDate, setSelectedDate] = useMuseDate(dailyEditSample.date.iso);
  const day = mockDay(selectedDate);
  const {profile,snapshot}=useDailyData();
  const priorityTaskIds=snapshot.days[selectedDate]?.priorities.flatMap(item=>item.task_id?[item.task_id]:[])??[];
  const { layout, save, error, custom } = useDailyLayout();
  const [arranging, setArranging] = useState(false);
  // Each card on its own, so the Daily Edit can be arranged; every card still owns its data and saving.
  const cards: Record<DailyCardKey, ReactNode> = {
    forecast: <CosmicForecast compact date={selectedDate} />,
    priorities: <PrioritiesCard />,
    movement: <WellnessCapture><MovementCard initialTypes={sampleMovementTypes.filter(type=>type.source==='starter')} initialDay={{date:selectedDate,typeIds:[]}} /></WellnessCapture>,
    water: <WellnessCapture><WaterCard initialDay={{ date: selectedDate, total: 0 }} settings={day.water.settings} /></WellnessCapture>,
    goals: <WellnessGoalsGlance date={selectedDate}/>,
    mood: <DailyCapture date={selectedDate}><MoodCard emotions={emotionCatalog} /></DailyCapture>,
    reflection: <DailyCapture date={selectedDate}><DailyReflectionCard date={selectedDate}/></DailyCapture>,
    dayInThree: <DailyCapture date={selectedDate}><DayInThreeCard /></DailyCapture>,
    books: <BooksDayviewWidget date={selectedDate}/>,
    rituals: <LittleRituals date={selectedDate}/>,
    schedule: <ScheduleCard selectedDate={selectedDate} priorityTaskIds={priorityTaskIds} />,
    meals: <WellnessCapture><MealsCard selectedDate={selectedDate} /></WellnessCapture>,
    pulse: <DailyCapture date={selectedDate}><DayPulseCard date={selectedDate}/></DailyCapture>,
    dreams: <DreamDayviewWidget date={selectedDate}/>,
    fortune: <FortuneDayviewWidget date={selectedDate}/>,
    chapter: <ChapterDayviewWidget/>,
    journal: <JournalDayviewWidget date={selectedDate}/>,
  };
  return (
    <main className="muse-page">
      <DailyEditHeader date={day.date} greeting={day.greeting} profile={profile} onDateChange={setSelectedDate} />
      <Suspense fallback={null}><WelcomeOrientation /></Suspense>
      <div className="muse-daily-title-row"><h1 className="muse-daily-section-title" id="daily-edit">The Daily Edit</h1>
        {!arranging && <button type="button" className="muse-button button-ghost muse-daily-arrange-toggle" onClick={() => setArranging(true)}><MuseIcon name="grip" size={15} />Arrange</button>}</div>
      {error && <p className="small-label" role="status">{error}</p>}
      {arranging ? <DailyArrange layout={layout} onCancel={() => setArranging(false)} onDone={(next) => { setArranging(false); void save(next); }} />
      : <div className="daily-working-grid" key={`working/${selectedDate}`}>
        <div className="daily-working-left">{layout.left.map((k) => <div key={k} className="muse-daily-slot" data-card={k} style={{ "--phone-order": phoneOrder(layout, custom, k) } as CSSProperties}>{cards[k]}</div>)}</div>
        <div className="daily-working-right">{layout.right.map((k) => <div key={k} className="muse-daily-slot" data-card={k} style={{ "--phone-order": phoneOrder(layout, custom, k) } as CSSProperties}>{cards[k]}</div>)}</div>
      </div>}
      <footer className="muse-footer"><DailySaveStatus date={selectedDate}/><PlannerPersistenceStatus compact/><WellnessSaveStatus/>Your daily entries, plan, meals, hydration and movement save to your account.</footer>
    </main>
  );
}
