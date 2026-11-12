import {shiftDate} from '@/lib/dates';
import type {ReadingGoal,ReadingSession} from './models';
import {readingByDay} from './integrations';
import {sessionSeconds} from './reading-stats';

/**
 * The daily reading goal and its own streak. Everything is derived from saved sessions and the goal record: no counters.
 *
 * A day "meets" the goal when its real active reading time (the existing per-day, per-time-zone figure) reaches the
 * target that was in force that day. Changing the target never rewrites the past: each change adds an entry to the
 * goal's `targetHistory` (effective from a local date), and a day before the first entry is not judged at all.
 * Manual logs without a duration add no time, so they count toward the reading streak but never satisfy a time goal.
 */
export type TargetEntry={from:string;target:number};
export type DailyGoal=ReadingGoal&{targetHistory?:TargetEntry[]};
export const DAILY_PRESETS=[10,15,20,30,45,60] as const;
export const isDailyMinutesGoal=(g:ReadingGoal):g is DailyGoal=>g.period==='day'&&g.unit==='minutes';
/** The daily-minutes goal in force: the most recently started one. */
export const activeDailyGoal=(goals:readonly ReadingGoal[]):DailyGoal|null=>[...goals].filter(isDailyMinutesGoal).sort((a,b)=>b.start.localeCompare(a.start)||b.createdAt?.localeCompare(a.createdAt??'')||0)[0]??null;

const valid=(e:unknown):e is TargetEntry=>!!e&&typeof (e as TargetEntry).from==='string'&&/^\d{4}-\d{2}-\d{2}$/.test((e as TargetEntry).from)&&Number.isFinite((e as TargetEntry).target)&&(e as TargetEntry).target>0;
/** Targets in force over time, oldest first. A goal saved before history existed counts from its own start date. */
export function targetHistory(goal:DailyGoal):TargetEntry[]{
 const list=(goal.targetHistory??[]).filter(valid).sort((a,b)=>a.from.localeCompare(b.from));
 return list.length?list:[{from:goal.start,target:goal.target}];
}
/** The target that applied on a date, or null when no goal existed yet (those days are never judged). */
export function targetOn(goal:DailyGoal,date:string):number|null{
 let found:number|null=null;for(const e of targetHistory(goal)){if(e.from<=date)found=e.target;else break;}return found;
}
/** The record fields for setting or changing a target as of `today`: past entries are kept, a same-day change replaces that day's entry. */
export function withTarget(goal:DailyGoal|null,target:number,today:string):{targetHistory:TargetEntry[];target:number}{
 const kept=goal?targetHistory(goal).filter(e=>e.from<today):[];
 return {target,targetHistory:[...kept,{from:today,target}]};
}

/** Active reading time per local date, in seconds. Falls back to each session's own date if the strict per-day split cannot run. */
export function secondsByDay(sessions:readonly ReadingSession[]):Map<string,number>{
 const out=new Map<string,number>();
 try{for(const d of readingByDay([...sessions]))if(d.seconds>0)out.set(d.date,d.seconds);return out;}
 catch{for(const s of sessions){const t=sessionSeconds(s);if(t>0)out.set(s.date,(out.get(s.date)??0)+t);}return out;}
}
export const minutesOn=(seconds:ReadonlyMap<string,number>,date:string)=>(seconds.get(date)??0)/60;

export type GoalDay={date:string;minutes:number;target:number|null;met:boolean;read:boolean};
export type GoalStreakDetail={current:number;longest:number;metToday:boolean;minutesToday:number;targetToday:number|null;toGo:number;metDays:ReadonlySet<string>;runs:{start:string;end:string;length:number}[];week:GoalDay[];totalMet:number};

/** The goal streak: consecutive days meeting that day's target. Alive through today until midnight, like the reading streak. */
export function goalStreak(goal:DailyGoal|null,seconds:ReadonlyMap<string,number>,readDays:ReadonlySet<string>,today:string):GoalStreakDetail{
 const day=(date:string):GoalDay=>{const target=goal?targetOn(goal,date):null,minutes=minutesOn(seconds,date);return {date,minutes,target,met:target!==null&&minutes+1e-9>=target,read:readDays.has(date)};};
 const first=goal?targetHistory(goal)[0].from:today,met=new Set<string>(),runs:{start:string;end:string;length:number}[]=[];
 if(goal)for(const date of [...seconds.keys()].filter(d=>d>=first&&d<=today).sort())if(day(date).met)met.add(date);
 for(const date of [...met].sort()){const last=runs.at(-1);if(last&&shiftDate(last.end,1)===date){last.end=date;last.length++;}else runs.push({start:date,end:date,length:1});}
 let cursor=met.has(today)?today:shiftDate(today,-1),current=0;while(met.has(cursor)){current++;cursor=shiftDate(cursor,-1);}
 const t=day(today),targetToday=t.target;
 return {current,longest:Math.max(0,...runs.map(r=>r.length)),metToday:t.met,minutesToday:t.minutes,targetToday,toGo:targetToday===null?0:Math.max(0,Math.ceil(targetToday-t.minutes-1e-9)),metDays:met,runs,
  week:Array.from({length:7},(_,i)=>day(shiftDate(today,i-6))),totalMet:met.size};
}

/** Per-month consistency: days read versus days that met the target, for the months of a range (oldest first). */
export function monthlyConsistency(goal:DailyGoal|null,seconds:ReadonlyMap<string,number>,readDays:ReadonlySet<string>,today:string,months=12){
 const out:{month:string;read:number;met:number;daysInMonth:number}[]=[];
 const [y,m]=today.split('-').map(Number);
 for(let i=months-1;i>=0;i--){const d=new Date(Date.UTC(y,m-1-i,1)),month=`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
  const upTo=month===today.slice(0,7)?Number(today.slice(8)):new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
  let read=0,met=0;for(let day=1;day<=upTo;day++){const date=`${month}-${String(day).padStart(2,'0')}`;if(readDays.has(date))read++;if(goal){const t=targetOn(goal,date);if(t!==null&&minutesOn(seconds,date)+1e-9>=t)met++;}}
  out.push({month,read,met,daysInMonth:upTo});}
 return out;
}
