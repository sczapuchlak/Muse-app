"use client";
import {useDailyData} from "../daily/DailyData";
import { ritualDayProgress } from "@/lib/rituals";
import { weekDates } from "@/lib/dates";
import { WeekNavigator } from "../WeekNavigator";
import { useRitualView } from "./ConnectedRituals";

export function RitualWeekNavigator({selectedDate,today,onChange}:{selectedDate:string;today:string;onChange:(date:string)=>void}) {const {profile}=useDailyData();
  const {state}=useRitualView();
  const progress=Object.fromEntries(weekDates(selectedDate).map((date)=>{
    const day=ritualDayProgress(state,date,today);
    const label=!today?"Daily progress loading":date>today?"Upcoming; no completion percentage":!day.total?"No scheduled daily rituals":`${day.completed} of ${day.total} scheduled daily rituals complete, ${Math.round(day.fraction!*100)}%${day.perfect?", all scheduled daily rituals completed":""}; weekly goals tracked separately`;
    return [date,{fraction:day.fraction,perfect:day.perfect,label}];
  }));
  return <WeekNavigator selectedDate={selectedDate} timeZone={profile.timeZone} onChange={onChange} progress={progress}/>;
}
