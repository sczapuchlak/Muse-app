"use client";
import { useEffect,useRef } from "react";
import { useMuseToday } from "./useMuseToday";
import { dateLabel,weekDates } from "@/lib/dates";
import { MuseStar } from "./MuseStar";
import { useMuseSpark } from "./MuseSpark";
import "./WeekNavigator.css";

const weekdays=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
export type WeekDayProgress={fraction:number|null;perfect:boolean;label:string};
function WeekDay({date,weekday,selected,today,progress,onChange}:{date:string;weekday:string;selected:boolean;today:boolean;progress?:WeekDayProgress;onChange:(date:string)=>void}) {
  const {trigger,spark}=useMuseSpark(),priorPerfect=useRef(progress?.perfect??false),priorObserved=useRef(progress?.fraction!=null);
  useEffect(()=>{if(progress?.perfect&&priorObserved.current&&!priorPerfect.current)trigger();priorPerfect.current=progress?.perfect??false;priorObserved.current=progress?.fraction!=null;},[progress?.perfect,progress?.fraction,trigger]);
  const percent=progress?.fraction===null||progress?.fraction===undefined?null:Math.round(progress.fraction*100);
  const label=`${dateLabel(date)}${today?", today":""}${progress?`, ${progress.label}`:""}`;
  return <button type="button" className="muse-week-day" aria-pressed={selected} aria-current={today?"date":undefined} aria-label={label} title={label} data-today={today} data-perfect={progress?.perfect||undefined} onClick={()=>onChange(date)}>
    <span className="muse-week-label">{weekday}{today&&!selected&&!progress&&<MuseStar size={10} color="aqua"/>}</span>
    <span className="muse-week-number">{selected&&<MuseStar size={38} className="muse-week-selection"/>}<span>{Number(date.slice(-2))}</span></span>
    {progress?.perfect&&<span className="muse-week-reward" aria-hidden="true"><MuseStar size={16} color="aqua"/></span>}
    {percent!==null&&<span className="muse-week-progress" role="progressbar" aria-label="Scheduled daily rituals completed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{width:`${percent}%`}}/></span>}
    {spark}
  </button>;
}
export function WeekNavigator({selectedDate,timeZone,onChange,progress}:{selectedDate:string;timeZone:string;onChange:(date:string)=>void;progress?:Record<string,WeekDayProgress>}) {
  const today=useMuseToday(timeZone);
  return <nav className="muse-week-strip" aria-label="Week containing the selected day">{weekDates(selectedDate).map((date,index)=><WeekDay key={date} date={date} weekday={weekdays[index]} selected={date===selectedDate} today={date===today} progress={progress?.[date]} onChange={onChange}/>)}</nav>;
}
