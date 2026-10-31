"use client";

import {WellnessCapture,WellnessSaveStatus} from "./WellnessStore";
import { DailyEditHeader } from "./DailyEditHeader";
import { PrioritiesCard } from "./PrioritiesCard";
import { MovementCard } from "./MovementCard";
import { WaterCard } from "./WaterCard";
import { ScheduleCard } from "./ScheduleCard";
import { MealsCard } from "./MealsCard";
import { MoodCheckInLayout } from "./mood/MoodCheckInLayout";
import { CosmicForecast } from "./CosmicForecast";
import { useMuseDate } from "./MuseSession";

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
      <DailySaveStatus date={selectedDate}/><WellnessSaveStatus/><h1 className="muse-daily-section-title" id="daily-edit">The Daily Edit</h1>
      <div className="daily-grid" key={selectedDate}>
        <CosmicForecast compact />
        <PrioritiesCard />
        <WellnessCapture><MovementCard initialTypes={sampleMovementTypes.filter(type=>type.source==='starter')} initialDay={{date:selectedDate,typeIds:[]}} /></WellnessCapture>
        <WellnessCapture><WaterCard initialDay={{ date: selectedDate, total: 0 }} settings={day.water.settings} /></WellnessCapture>
        <ScheduleCard selectedDate={selectedDate} />
        <WellnessCapture><MealsCard selectedDate={selectedDate} /></WellnessCapture>
        <DailyCapture date={selectedDate}><MoodCheckInLayout date={selectedDate} emotions={emotionCatalog} /></DailyCapture>
      </div>
      <footer className="muse-footer">Intention, priorities, Day in Three, Day Pulse and feelings save to your account. Planner tasks and events also save to your account. Meals, water and movement intentions save to your account.</footer>
    </main>
  );
}
