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
import {DreamDayviewWidget} from "./whimsy/DreamDayviewWidget";
import {FortuneDayviewWidget} from "./whimsy/FortuneDayviewWidget";
import {BooksDayviewWidget} from "./whimsy/BooksDayviewWidget";
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
  const {profile,snapshot}=useDailyData();
  const priorityTaskIds=snapshot.days[selectedDate]?.priorities.flatMap(item=>item.task_id?[item.task_id]:[])??[];
  return (
    <main className="muse-page">
      <DailyEditHeader date={day.date} greeting={day.greeting} profile={profile} onDateChange={setSelectedDate} />
      <h1 className="muse-daily-section-title" id="daily-edit">The Daily Edit</h1>
      <div className="daily-working-grid" key={`working/${selectedDate}`}>
        <div className="daily-working-left">
          <CosmicForecast compact />
          <PrioritiesCard />
          <WellnessCapture><MovementCard initialTypes={sampleMovementTypes.filter(type=>type.source==='starter')} initialDay={{date:selectedDate,typeIds:[]}} /></WellnessCapture>
          <WellnessCapture><WaterCard initialDay={{ date: selectedDate, total: 0 }} settings={day.water.settings} /></WellnessCapture>
          <DailyCapture date={selectedDate}><MoodCard emotions={emotionCatalog} /><DailyReflectionCard date={selectedDate}/><DayInThreeCard /></DailyCapture>
        </div>
        <div className="daily-working-right">
          <LittleRituals date={selectedDate}/>
          <ScheduleCard selectedDate={selectedDate} priorityTaskIds={priorityTaskIds} />
          <WellnessCapture><MealsCard selectedDate={selectedDate} /></WellnessCapture>
          <DailyCapture date={selectedDate}><DayPulseCard date={selectedDate}/></DailyCapture>
          <DreamDayviewWidget date={selectedDate}/>
          <FortuneDayviewWidget date={selectedDate}/>
          <BooksDayviewWidget date={selectedDate}/>
        </div>
      </div>
      <footer className="muse-footer"><DailySaveStatus date={selectedDate}/><PlannerPersistenceStatus compact/><WellnessSaveStatus/>Your daily entries, plan, meals, hydration and movement save to your account.</footer>
    </main>
  );
}
