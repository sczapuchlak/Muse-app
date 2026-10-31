"use client";

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
      <DailySaveStatus date={selectedDate}/><h1 className="muse-daily-section-title" id="daily-edit">The Daily Edit</h1>
      <div className="daily-grid" key={selectedDate}>
        <CosmicForecast compact />
        <PrioritiesCard />
        <MovementCard initialTypes={sampleMovementTypes} initialDay={day.movement} />
        <WaterCard initialDay={{ date: day.water.date, total: day.water.total }} settings={day.water.settings} />
        <ScheduleCard selectedDate={selectedDate} />
        <MealsCard selectedDate={selectedDate} />
        <DailyCapture date={selectedDate}><MoodCheckInLayout date={selectedDate} emotions={emotionCatalog} /></DailyCapture>
      </div>
      <footer className="muse-footer">Intention, priorities, Day in Three, Day Pulse and feelings save to your account. Movement, water, Planner and meals remain prototype data.</footer>
    </main>
  );
}
