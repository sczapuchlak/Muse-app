import type {DayData,DailyPriority} from './daily';
import type {DailyExpression} from '../daily-expression';
export type DailyPulseObservation={date:string;energy:number|null;stress:number|null;overallDay:number|null};
/** Preserve typing whitespace through normalization, but never mask a different refreshed value. */
export function dailyTextDisplay(saved:string,typing:string|null):string{return typing!==null&&(saved===typing||saved===typing.trim())?typing:saved;}
export function dayExpression(day?:DayData):DailyExpression{return {intention:day?.record?.intention_text??'',intentionEmoji:day?.record?.intention_emoji??null,dayInThree:day?.record?.day_in_three??[]};}
export function dayPulse(date:string,day?:DayData):DailyPulseObservation{return {date,energy:day?.record?.energy??null,stress:day?.record?.stress??null,overallDay:day?.record?.overall_day??null};}
export function hasDailyData(day:DayData){const record=day.record;return !!(day.priorities.length||day.checkins.length||record&&(record.intention_text||record.intention_emoji||record.day_in_three.length||[record.energy,record.stress,record.overall_day].some(value=>value!==null)));}

/** Null is an unknown historical fact, never an incomplete task. */
export function priorityCompletion(priority:DailyPriority,mode:'display'|'current'|'historical'='display'):boolean|null{
 if(!priority.task_id)return priority.standalone_complete;
 const key=mode==='display'?'display_complete':mode==='current'?'current_complete':'historical_complete';
 return priority[key]??null;
}
