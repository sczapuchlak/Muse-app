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
import { mockProfile } from "@/lib/mock-profile";

export function DailyEdit() {
  const [selectedDate, setSelectedDate] = useMuseDate(dailyEditSample.date.iso);
  const day = mockDay(selectedDate);
  return (
    <main className="muse-page">
      <DailyEditHeader date={day.date} greeting={day.greeting} profile={mockProfile} onDateChange={setSelectedDate} />
      <h1 className="muse-daily-section-title" id="daily-edit">The Daily Edit</h1>
      <div className="daily-grid" key={selectedDate}>
        <CosmicForecast compact />
        <PrioritiesCard initialPriorities={day.priorities} initialIntention={day.intention} />
        <MovementCard initialTypes={sampleMovementTypes} initialDay={day.movement} />
        <WaterCard initialDay={{ date: day.water.date, total: day.water.total }} settings={day.water.settings} />
        <ScheduleCard selectedDate={selectedDate} />
        <MealsCard selectedDate={selectedDate} />
        <MoodCheckInLayout date={selectedDate} emotions={emotionCatalog} />
      </div>
      <footer className="muse-footer">Sample data · Daily entries reset on refresh</footer>
    </main>
  );
}
