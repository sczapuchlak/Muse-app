"use client";

import { useMuseToday } from "./useMuseToday";
import { dateLabel,weekDates } from "@/lib/dates";
import { MuseStar } from "./MuseStar";
import { MuseProgressRing } from "./MuseProgressRing";
import { AchievementBadge } from "./AchievementStar";
import "./WeekNavigator.css";

const weekdays=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
export type WeekDayProgress={fraction:number|null;perfect:boolean;label:string};
function WeekDay({date,weekday,selected,today,progress,onChange}:{date:string;weekday:string;selected:boolean;today:boolean;progress?:WeekDayProgress;onChange:(date:string)=>void}) {
  const percent=progress?.fraction===null||progress?.fraction===undefined?null:Math.round(progress.fraction*100);
  const label=`${dateLabel(date)}${today?", today":""}${progress?`, ${progress.label}`:""}`;
  return <button type="button" className="muse-week-day" aria-pressed={selected} aria-current={today?"date":undefined} aria-label={label} title={label} data-today={today} data-perfect={progress?.perfect||undefined} onClick={()=>onChange(date)}>
    <span className="muse-week-label">{weekday}{today&&!selected&&!progress&&<MuseStar size={10} color="aqua"/>}</span>
    <span className="muse-week-number" data-has-progress={percent!==null||undefined}>{percent!==null?<span role="progressbar" aria-label="Scheduled daily rituals completed" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><MuseProgressRing size={38} value={percent} goal={100}>{Number(date.slice(-2))}</MuseProgressRing></span>:<>{selected&&!progress&&<MuseStar size={38} className="muse-week-selection"/>}<span>{Number(date.slice(-2))}</span></>}</span>
    <span className="muse-week-reward"><AchievementBadge achieved={progress?.perfect??false} ready={progress?.fraction!=null} label="All scheduled daily rituals complete" size={18}/></span>

  </button>;
}
export function WeekNavigator({selectedDate,timeZone,onChange,progress}:{selectedDate:string;timeZone:string;onChange:(date:string)=>void;progress?:Record<string,WeekDayProgress>}) {
  const today=useMuseToday(timeZone);
  return <nav className="muse-week-strip" aria-label="Week containing the selected day">{weekDates(selectedDate).map((date,index)=><WeekDay key={date} date={date} weekday={weekdays[index]} selected={date===selectedDate} today={date===today} progress={progress?.[date]} onChange={onChange}/>)}</nav>;
}
