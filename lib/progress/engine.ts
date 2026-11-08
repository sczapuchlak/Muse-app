import {shiftDate,validDate,weekDates} from '../dates';
import {isSeries} from '@/lib/planner-occurrences';
import type {WellnessState} from '../wellness';
import type {WaterUnit} from '../water';
import type {PlannerState} from '../planner';
import type {Book,ReadingSession} from '../whimsy/models';
import {readingByDay} from '../whimsy/integrations';
import {bookCompletions} from '../whimsy/reading-stats';
import {localTimestampDate} from '../insights/ranges';
import {movementCategory,type MovementCategory} from './movement';

/**
 * Track once, reflect everywhere: one read-only engine turns authoritative records into dated measurements.
 * Wellness goals, connected Rituals, Insights and future Goals/Recaps all evaluate these same series with their own
 * targets and periods; none of them copies or stores the source records.
 */
export type ProgressMetric='water'|'workouts'|'workout-minutes'|'reading-minutes'|'reading-pages'|'books-finished'|'tasks-completed'|'nutrition-protein'|'nutrition-calories'|'nutrition-carbs'|'nutrition-fat';
export type MetricSpec={metric:ProgressMetric;category?:MovementCategory;typeId?:string;unit?:WaterUnit};
export type ProgressSources={
 timeZone:string;
 wellness?:Pick<WellnessState,'water'|'activities'|'types'|'assignments'>;
 reading?:{sessions:readonly ReadingSession[];books:readonly Book[]};
 planner?:Pick<PlannerState,'tasks'|'completionHistory'>;
};
/** One local date. `recorded` means a source record exists; `complete` means every record carried the measured field. */
export type DayMeasure={date:string;value:number;recordIds:string[];recorded:boolean;complete:boolean};
export type MeasureResult={days:Map<string,DayMeasure>;available:boolean;issue?:string};

export const metricInfo:Record<ProgressMetric,{label:string;unit:string;owner:'Wellness'|'Collections'|'Planner';kind:'count'|'quantity'|'duration'}>={
 water:{label:'Water',unit:'oz',owner:'Wellness',kind:'quantity'},
 workouts:{label:'Workouts',unit:'sessions',owner:'Wellness',kind:'count'},
 'workout-minutes':{label:'Workout minutes',unit:'min',owner:'Wellness',kind:'duration'},
 'reading-minutes':{label:'Reading time',unit:'min',owner:'Collections',kind:'duration'},
 'reading-pages':{label:'Pages read',unit:'pages',owner:'Collections',kind:'quantity'},
 'books-finished':{label:'Books finished',unit:'books',owner:'Collections',kind:'count'},
 'tasks-completed':{label:'Tasks completed',unit:'tasks',owner:'Planner',kind:'count'},
 'nutrition-protein':{label:'Protein',unit:'g',owner:'Wellness',kind:'quantity'},
 'nutrition-calories':{label:'Calories',unit:'kcal',owner:'Wellness',kind:'quantity'},
 'nutrition-carbs':{label:'Carbs',unit:'g',owner:'Wellness',kind:'quantity'},
 'nutrition-fat':{label:'Fat',unit:'g',owner:'Wellness',kind:'quantity'},
};

const ML_PER_OZ=29.5735295625;
export function convertWater(amount:number,from:WaterUnit,to:WaterUnit){if(from===to)return amount;return from==='oz'?amount*ML_PER_OZ:amount/ML_PER_OZ;}
const round=(value:number,places=2)=>Math.round(value*10**places)/10**places;

function add(days:Map<string,DayMeasure>,date:string,value:number,recordId:string,complete=true){
 if(!validDate(date))return;
 const day=days.get(date)??{date,value:0,recordIds:[],recorded:false,complete:true};
 if(day.recordIds.includes(recordId))return; // A record is counted once, whichever surface it was logged from.
 day.value=round(day.value+value);day.recordIds.push(recordId);day.recorded=true;day.complete=day.complete&&complete;
 days.set(date,day);
}

/** The latest event per task (per occurrence for a recurring series) decides: reopened tasks stop counting, re-completed tasks count once on the latest date. */
export function taskCompletionDates(planner:Pick<PlannerState,'tasks'|'completionHistory'>,timeZone:string){
 const result=new Map<string,string>();
 if(planner.completionHistory?.length){
  // A recurring series (#89) completes once per occurrence: its history is keyed by task and occurrence date.
  const series=new Set(planner.tasks.filter(isSeries).map(t=>t.id)),key=(e:{taskId:string;plannedDate?:string})=>series.has(e.taskId)&&e.plannedDate?`${e.taskId}::${e.plannedDate}`:e.taskId;
  const latest=new Map<string,{complete:boolean;at:string;date:string}>();
  for(const event of planner.completionHistory){const k=key(event),previous=latest.get(k);if(!previous||event.occurredAt>=previous.at)latest.set(k,{complete:event.complete,at:event.occurredAt,date:event.localDate});}
  for(const [taskId,event] of latest)if(event.complete&&validDate(event.date))result.set(taskId,event.date);
  return result;
 }
 for(const task of planner.tasks){const date=task.complete?localTimestampDate(task.completedAt,timeZone):undefined;if(date)result.set(task.id,date);}
 return result;
}

export function measureDays(spec:MetricSpec,sources:ProgressSources):MeasureResult{
 const days=new Map<string,DayMeasure>();
 switch(spec.metric){
 case 'water':{
  if(!sources.wellness)return {days,available:false};
  for(const day of sources.wellness.water){const unit=day.unit??sources.wellness.water.find(d=>d.unit)?.unit??'oz';add(days,day.date,convertWater(day.total,unit,spec.unit??unit),`water/${day.date}`);}
  return {days,available:true};
 }
 case 'workouts':case 'workout-minutes':{
  if(!sources.wellness)return {days,available:false};
  const types=sources.wellness.types;
  for(const record of sources.wellness.activities){
   const type=types.find(t=>t.id===record.typeId);
   if(spec.typeId&&record.typeId!==spec.typeId)continue;
   if(spec.category&&movementCategory(type??{id:record.typeId})!==spec.category)continue;
   if(spec.metric==='workouts')add(days,record.date,1,record.id);
   else add(days,record.date,record.durationMinutes??0,record.id,record.durationMinutes!=null);
  }
  return {days,available:true};
 }
 case 'reading-minutes':case 'reading-pages':{
  if(!sources.reading)return {days,available:false};
  try{
   for(const day of readingByDay([...sources.reading.sessions])){
    const value=spec.metric==='reading-minutes'?Math.round(day.seconds/60):day.pages;
    for(const [index,id] of [...day.sessionIds].entries())add(days,day.date,index===0?value:0,`reading/${id}`);
   }
  }catch(error){return {days:new Map(),available:false,issue:error instanceof Error?error.message:'Reading sessions could not be measured.'};}
  return {days,available:true};
 }
 case 'books-finished':{
  if(!sources.reading)return {days,available:false};
  for(const book of sources.reading.books){if(book.archivedAt)continue;for(const completion of bookCompletions(book))add(days,completion.finishedOn,1,`book/${book.id}/${completion.id}`);}
  return {days,available:true};
 }
 case 'tasks-completed':{
  if(!sources.planner)return {days,available:false};
  for(const [taskId,date] of taskCompletionDates(sources.planner,sources.timeZone))add(days,date,1,`task/${taskId}`);
  return {days,available:true};
 }
 default:{
  if(!sources.wellness)return {days,available:false};
  const field=spec.metric.slice('nutrition-'.length) as 'protein'|'calories'|'carbs'|'fat';
  for(const meal of sources.wellness.assignments){const value=meal.nutrition?.[field];add(days,meal.date,typeof value==='number'&&Number.isFinite(value)?value:0,`meal/${meal.id}`,typeof value==='number'&&Number.isFinite(value));}
  return {days,available:true};
 }
 }
}

export type Period='day'|'week'|'month'|'year';
export function periodStart(date:string,period:Period){if(period==='day')return date;if(period==='week')return weekDates(date)[0];if(period==='month')return `${date.slice(0,7)}-01`;return `${date.slice(0,4)}-01-01`;}
export function periodEnd(start:string,period:Period){if(period==='day')return start;if(period==='week')return shiftDate(start,6);if(period==='month'){const next=start.slice(5,7)==='12'?`${Number(start.slice(0,4))+1}-01-01`:`${start.slice(0,4)}-${String(Number(start.slice(5,7))+1).padStart(2,'0')}-01`;return shiftDate(next,-1);}return `${start.slice(0,4)}-12-31`;}
export function nextPeriod(start:string,period:Period){return shiftDate(periodEnd(start,period),1);}
/** Period starts touching [start,end], oldest first, bounded so a bad range cannot hang the UI. */
export function periodStarts(start:string,end:string,period:Period,limit=800){const result:string[]=[];if(!validDate(start)||!validDate(end)||end<start)return result;let cursor=periodStart(start,period);while(cursor<=end&&result.length<limit){result.push(cursor);cursor=nextPeriod(cursor,period);}return result;}

export type PeriodTotal={start:string;end:string;value:number;recordIds:string[];recordedDays:number;incompleteDays:number};
/** Sum one period. `through` clips an in-progress period to today so future days never count as missing. */
export function periodTotal(days:Map<string,DayMeasure>,start:string,period:Period,through?:string):PeriodTotal{
 const end=periodEnd(start,period),last=through&&through<end?through:end;let value=0,recordedDays=0,incompleteDays=0;const recordIds:string[]=[];
 for(const day of days.values()){if(day.date<start||day.date>last)continue;value+=day.value;recordIds.push(...day.recordIds);if(day.recorded)recordedDays++;if(!day.complete)incompleteDays++;}
 return {start,end,value:round(value),recordIds,recordedDays,incompleteDays};
}
