import type {WellnessState} from './wellness';
import {shiftDate} from './dates';
import {measureDays,periodEnd,periodStarts,type Period} from './progress/engine';
import {movementCategories,movementCategory,type MovementCategory} from './progress/movement';
import type {GoalPeriodResult,GoalPeriodStatus} from './wellness-goals';

/**
 * Reusable, tested Wellness summaries for the Wellness page, Insights, Daily Edit and future Recaps. Every number is
 * traceable to records (ids included) and unknowns are counted, never filled in.
 */
export type WellnessPeriodSummary={
 start:string;end:string;
 workouts:number;workoutDays:number;byCategory:Record<MovementCategory,number>;
 minutes:number;sessionsWithoutDuration:number;
 hydration:{recordedDays:number;metDays:number};
 recordIds:string[];
};

export function wellnessPeriodSummary(state:Pick<WellnessState,'activities'|'types'|'water'>,start:string,period:Period,today?:string):WellnessPeriodSummary{
 return wellnessSpanSummary(state,start,periodEnd(start,period),today);
}
/** Any inclusive span of local dates (an Insights range need not be a calendar period). */
export function wellnessSpanSummary(state:Pick<WellnessState,'activities'|'types'|'water'>,start:string,end:string,today?:string):WellnessPeriodSummary{
 const last=today&&today<end?today:end;
 const activities=state.activities.filter(a=>a.date>=start&&a.date<=last);
 const byCategory=Object.fromEntries(movementCategories.map(c=>[c,0])) as Record<MovementCategory,number>;
 for(const a of activities)byCategory[movementCategory(state.types.find(t=>t.id===a.typeId)??{id:a.typeId})]++;
 const water=state.water.filter(d=>d.date>=start&&d.date<=last);
 return {
  start,end,
  workouts:new Set(activities.map(a=>a.id)).size,
  workoutDays:new Set(activities.map(a=>a.date)).size,
  byCategory,
  minutes:activities.reduce((sum,a)=>sum+(a.durationMinutes??0),0),
  sessionsWithoutDuration:activities.filter(a=>a.durationMinutes==null).length,
  hydration:{recordedDays:water.length,metDays:water.filter(d=>d.goal!==undefined&&d.total>=d.goal).length},
  recordIds:[...activities.map(a=>a.id),...water.map(d=>`water/${d.date}`)],
 };
}
export function wellnessSeries(state:Pick<WellnessState,'activities'|'types'|'water'>,start:string,end:string,period:Period,today?:string){
 return periodStarts(start,end,period).filter(s=>!today||s<=today).map(s=>wellnessPeriodSummary(state,s,period,today));
}

/**
 * Hydration adherence uses the tracker's own goal: each saved day carries the target that applied that day, so a
 * changed goal never re-grades history. Unrecorded days are unknown; a recorded zero is a real, below-goal day.
 */
export function hydrationHistory(state:Pick<WellnessState,'water'|'activities'|'types'|'assignments'>,today:string,count=14):GoalPeriodResult[]{
 const days=measureDays({metric:'water'},{timeZone:'UTC',wellness:state}).days;
 const results:GoalPeriodResult[]=[];
 let date=today;
 for(let i=0;i<count;i++){
  const record=state.water.find(d=>d.date===date),day=days.get(date);
  const status:GoalPeriodStatus=!record?(date===today?'in-progress':'unknown'):record.goal===undefined?'unknown':record.total>=record.goal?'achieved':date===today?'in-progress':'missed';
  results.unshift({start:date,end:date,status,value:day?.value??0,target:record?.goal??null,unit:record?.unit??'oz',direction:'atLeast',recordIds:day?.recordIds??[],recordedDays:record?1:0,incompleteDays:0});
  date=shiftDate(date,-1);
 }
 return results;
}
