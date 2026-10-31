"use client";

import {WellnessCapture,WellnessSaveStatus} from "./WellnessStore";
import { DailyEditHeader } from "./DailyEditHeader";
import { PrioritiesCard } from "./PrioritiesCard";
import { MovementCard } from "./MovementCard";
import { WaterCard } from "./WaterCard";
import { ScheduleCard } from "./ScheduleCard";
import { MealsCard } from "./MealsCard";
import { MoodCheckInLayout } from "./mood/MoodCheckInLayout";
import {LittleRituals} from "./rituals/LittleRituals";
import {PlannerPersistenceStatus} from "./PlannerStore";
import { CosmicForecast } from "./CosmicForecast";
import { useMuseDate } from "./MuseSession";

import "./DailyEdit.css";
import { dailyEditSample } from "@/lib/daily-edit-data";
import { sampleMovementTypes } from "@/lib/sample-taxonomies";
import { emotionCatalog } from "@/lib/emotions";
import { mockDay } from "@/lib/dates";
import {useDailyData,DailySaveStatus,DailyCapture} from "./daily/DailyData";

export function DailyEdit() {
  const [selectedDate, setSelectedDate] = useMuseDate(dailyEditSample.date.iso);
  const day = mockDay(selectedDate);
  const {profile}=useDailyData();
  return (
    <main className="muse-page">
      <DailyEditHeader date={day.date} greeting={day.greeting} profile={profile} onDateChange={setSelectedDate} />
      <h1 className="muse-daily-section-title" id="daily-edit">The Daily Edit</h1>
      <div className="daily-focus-grid" key={`focus/${selectedDate}`}><div className="daily-focus-stack"><CosmicForecast compact /><PrioritiesCard /></div><LittleRituals date={selectedDate}/></div>
      <div className="daily-grid" key={selectedDate}>
        <div className="daily-middle-grid"><div className="daily-care-stack">
        <WellnessCapture><MovementCard initialTypes={sampleMovementTypes.filter(type=>type.source==='starter')} initialDay={{date:selectedDate,typeIds:[]}} /></WellnessCapture>
        <WellnessCapture><WaterCard initialDay={{ date: selectedDate, total: 0 }} settings={day.water.settings} /></WellnessCapture>
        <WellnessCapture><MealsCard selectedDate={selectedDate} /></WellnessCapture>
        </div><ScheduleCard selectedDate={selectedDate} /></div>
        <DailyCapture date={selectedDate}><MoodCheckInLayout date={selectedDate} emotions={emotionCatalog} layout="reflection" /></DailyCapture>
      </div>
      <footer className="muse-footer"><DailySaveStatus date={selectedDate}/><PlannerPersistenceStatus compact/><WellnessSaveStatus/>Your daily entries, plan, meals, hydration and movement save to your account.</footer>
    </main>
  );
}
