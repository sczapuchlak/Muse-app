import {shiftDate} from '@/lib/dates';
import type {ReadingSession} from './models';
import {readingDates} from './reading-stats';

/**
 * Reading streaks: built only from saved sessions' local dates (timer or manual), never from book status, progress
 * or page visits. Several sessions on one day count once. Edits and deletions are reflected because nothing is
 * stored: every number is recalculated from the sessions. A streak stays alive through today until midnight.
 */
export const STREAK_MILESTONES=[7,14,30,50,100,200,365] as const;

export type StreakDay={date:string;read:boolean;today:boolean};
export type StreakMilestone={days:number;reachedOn:string|null};
export type StreakDetail={current:number;longest:number;readToday:boolean;totalDays:number;week:StreakDay[];milestones:StreakMilestone[];nextMilestone:number|null;days:ReadonlySet<string>;runs:{start:string;end:string;length:number}[]};

function safeDates(sessions:readonly ReadingSession[]){try{return readingDates([...sessions]);}catch{return [...new Set(sessions.filter(s=>(s.pages??0)>0||(s.activeSegments?.length??0)>0).map(s=>s.date))];}}

export function streakDetail(sessions:readonly ReadingSession[],today:string):StreakDetail{
 const sorted=[...new Set(safeDates(sessions))].filter(d=>d<=today).sort(),days=new Set(sorted);
 const runs:{start:string;end:string;length:number}[]=[];const reached=new Map<number,string>();
 for(const day of sorted){
  const last=runs.at(-1);
  if(last&&shiftDate(last.end,1)===day){last.end=day;last.length++;}else runs.push({start:day,end:day,length:1});
  const length=runs.at(-1)!.length;for(const m of STREAK_MILESTONES)if(length===m&&!reached.has(m))reached.set(m,day);
 }
 let cursor=days.has(today)?today:shiftDate(today,-1),current=0;while(days.has(cursor)){current++;cursor=shiftDate(cursor,-1);}
 const longest=Math.max(0,...runs.map(r=>r.length));
 const week=Array.from({length:7},(_,i)=>{const date=shiftDate(today,i-6);return {date,read:days.has(date),today:date===today};});
 const milestones=STREAK_MILESTONES.map(days=>({days,reachedOn:reached.get(days)??null}));
 return {current,longest,readToday:days.has(today),totalDays:days.size,week,milestones,nextMilestone:STREAK_MILESTONES.find(m=>m>current)??null,days,runs};
}

/** The milestone the current streak has just reached (only on the day it was reached), for a gentle celebration. */
export function streakCelebration(detail:StreakDetail,today:string){return detail.readToday?detail.milestones.find(m=>m.reachedOn===today&&m.days===detail.current)?.days??null:null;}
