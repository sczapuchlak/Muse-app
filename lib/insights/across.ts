import type {ReturnTypeOfMetrics} from './metrics';
import type {InsightRange} from './ranges';
import {rangeDays,within} from './ranges';
import {measureDays,type ProgressSources} from '../progress/engine';
import {wellnessSpanSummary} from '../wellness-aggregates';
import {currentVersion,goalMetricInfo,goalResultsBetween,adherence,type WellnessGoal} from '../wellness-goals';
import type {WellnessState} from '../wellness';
import {formatMoney} from '../money';

/**
 * Global Insights across modules. Each figure comes from an owner's records through existing metrics or the shared
 * progress engine; nothing is combined into a score, and a module without records is omitted rather than shown as 0.
 */
export type MacroRow={id:string;label:string;value:string;detail:string;definition:string;href:string;current:number;previous:number|null};

const sumWithin=(days:Map<string,{date:string;value:number}>,range:InsightRange)=>[...days.values()].filter(d=>within(d.date,range)).reduce((n,d)=>n+d.value,0);
const fmt=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(n);

export function wellnessForRange(state:Pick<WellnessState,'activities'|'types'|'water'>,range:InsightRange){return wellnessSpanSummary(state,range.start,range.end);}

export function macroSummary({current,previous,sources,previousRange,compare}:{current:ReturnTypeOfMetrics;previous:ReturnTypeOfMetrics;sources:ProgressSources;previousRange:InsightRange;compare:boolean}):MacroRow[]{
 const range=current.range,rows:MacroRow[]=[];
 const prev=(n:number)=>compare?n:null;
 const tasks=measureDays({metric:'tasks-completed'},sources);
 if(tasks.available){const now=sumWithin(tasks.days,range),before=sumWithin(tasks.days,previousRange);if(now||before)rows.push({id:'tasks',label:'Tasks completed',value:fmt(now),detail:'distinct tasks',definition:'Each task counts once, on the date of its latest completion. Reopened tasks stop counting.',href:'/insights?view=plans',current:now,previous:prev(before)});}
 const r=current.rituals,rp=previous.rituals;
 if(r.opportunities.length||rp.opportunities.length){const decided=r.complete+r.partial+r.missed;rows.push({id:'rituals',label:'Full ritual goals',value:fmt(r.complete),detail:decided?`${Math.round(r.complete/decided*100)}% of logged opportunities`:`${r.unknown} not logged`,definition:'Daily scheduled ritual opportunities that met their goal. Unlogged days are excluded from the share, never counted as missed.',href:'/insights?view=plans',current:r.complete,previous:prev(rp.complete)});}
 if(sources.wellness){
  const w=wellnessForRange(sources.wellness,range),wp=wellnessForRange(sources.wellness,previousRange);
  if(w.workouts||wp.workouts)rows.push({id:'workouts',label:'Workouts recorded',value:fmt(w.workouts),detail:`${w.byCategory.strength} strength · ${w.byCategory.cardio} cardio · ${w.byCategory.mobility+w.byCategory.other} other`,definition:'Completed movement records (not intentions), one per type and date.',href:'/nourish?view=goals',current:w.workouts,previous:prev(wp.workouts)});
  if(w.minutes||wp.minutes)rows.push({id:'workout-minutes',label:'Workout minutes',value:fmt(w.minutes),detail:w.sessionsWithoutDuration?`${w.sessionsWithoutDuration} ${w.sessionsWithoutDuration===1?'session':'sessions'} without a time`:'every session timed',definition:'Sum of durations recorded on completed movement. Untimed sessions add nothing and are counted separately.',href:'/nourish?view=goals',current:w.minutes,previous:prev(wp.minutes)});
 }
 if(current.whimsy.ready){
  const minutes=Math.round(current.whimsy.readingSeconds/60),before=previous.whimsy.ready?Math.round(previous.whimsy.readingSeconds/60):0;
  if(minutes||before||current.whimsy.booksFinished)rows.push({id:'reading',label:'Reading time',value:`${fmt(minutes)} min`,detail:`${current.whimsy.readingDays} reading days · ${current.whimsy.booksFinished} ${current.whimsy.booksFinished===1?'book':'books'} finished`,definition:'Active time from reading sessions on their local dates; finished books by their recorded finish date.',href:'/insights?view=collections',current:minutes,previous:prev(before)});
 }
 if(current.mood.records.length||previous.mood.records.length)rows.push({id:'mood',label:'Mood check-ins',value:fmt(current.mood.records.length),detail:`across ${current.mood.loggedDays} days`,definition:'Saved check-ins. Several can share a day; a day without one is not a bad day.',href:'/insights?view=mood',current:current.mood.records.length,previous:prev(previous.mood.records.length)});
 if(current.money.transactions.length||previous.money.transactions.length)rows.push({id:'spending',label:'Recorded spending',value:formatMoney(current.money.spending),detail:`${current.money.transactions.length} transactions`,definition:'Transactions you recorded in Money for these dates. Muse has no bank connection; unrecorded spending is not estimated.',href:'/insights?view=money',current:current.money.spending,previous:prev(previous.money.spending)});
 return rows;
}

/** Days with A versus days without, among days that have the compared value. Suppressed below `min` on either side. */
export function compareDays(days:string[],has:(date:string)=>boolean,value:(date:string)=>number|null,min=5){
 const withA:number[]=[],without:number[]=[];
 for(const date of days){const v=value(date);if(v===null)continue;(has(date)?withA:without).push(v);}
 const mean=(xs:number[])=>xs.reduce((n,x)=>n+x,0)/xs.length;
 const enough=withA.length>=min&&without.length>=min;
 return {withN:withA.length,withoutN:without.length,withMean:enough?mean(withA):null,withoutMean:enough?mean(without):null,enough};
}
export type CrossConnection={id:string;title:string;signal:string;withLabel:string;withoutLabel:string;result:ReturnType<typeof compareDays>;note:string};

/** A few defensible, descriptive comparisons on shared local dates. Never causal, always with sample sizes. */
export function crossModuleConnections(metrics:ReturnTypeOfMetrics,sources:ProgressSources):CrossConnection[]{
 const days=rangeDays(metrics.range),energy=(d:string)=>metrics.mood.byDate.find(x=>x.date===d)?.energy??null,overall=(d:string)=>metrics.mood.byDate.find(x=>x.date===d)?.day??null,stress=(d:string)=>metrics.mood.byDate.find(x=>x.date===d)?.stress??null;
 const result:CrossConnection[]=[];
 if(sources.wellness){const moved=new Set(sources.wellness.activities.map(a=>a.date));result.push({id:'movement-energy',title:'Recorded movement & Energy',signal:'Energy',withLabel:'days with recorded movement',withoutLabel:'other days with an Energy rating',result:compareDays(days,d=>moved.has(d),energy),note:'Uses completed movement records, not intentions.'});}
 if(metrics.whimsy.ready){const read=new Set(metrics.whimsy.reading.filter(d=>d.seconds>0||d.pages>0).map(d=>d.date));result.push({id:'reading-day',title:'Reading & Overall Day',signal:'Overall Day',withLabel:'days you read',withoutLabel:'other days with an Overall Day rating',result:compareDays(days,d=>read.has(d),overall),note:'Reading days have at least one saved session.'});}
 const tasks=measureDays({metric:'tasks-completed'},sources);
 if(tasks.available){const busy=new Set([...tasks.days.values()].filter(d=>d.value>=3).map(d=>d.date));result.push({id:'tasks-stress',title:'Busier task days & Stress',signal:'Stress',withLabel:'days you completed 3+ tasks',withoutLabel:'other days with a Stress rating',result:compareDays(days,d=>busy.has(d),stress),note:'Completed tasks by completion date. Higher Stress is not a success measure.'});}
 return result;
}

/** Factual, recap-ready summary for any range (week, month or year). Presentation is a separate future feature. */
export function recapFacts({metrics,sources,goals,today}:{metrics:ReturnTypeOfMetrics;sources:ProgressSources;goals?:WellnessGoal[];today:string}){
 const range=metrics.range,w=sources.wellness?wellnessForRange(sources.wellness,range):null,tasks=measureDays({metric:'tasks-completed'},sources);
 const r=metrics.rituals,decided=r.complete+r.partial+r.missed;
 const goalRows=(goals??[]).filter(g=>currentVersion(g)).map(goal=>{const results=goalResultsBetween(goal,sources,range.start,range.end,today);const a=adherence(results.filter(x=>x.status!=='in-progress'));return {id:goal.id,label:goalMetricInfo[goal.metric].label,period:goal.period,basis:goalMetricInfo[goal.metric].basis,...a};}).filter(g=>g.achieved+g.missed+g.unknown+g.paused>0);
 const money=metrics.money;
 return {
  range,
  tasks:{completed:tasks.available?sumWithin(tasks.days,range):null},
  rituals:{fullGoals:r.complete,partial:r.partial,missed:r.missed,unknown:r.unknown,consistency:decided?r.complete/decided:null,connectedFullGoals:r.connectedComplete},
  wellness:w?{workouts:w.workouts,byCategory:w.byCategory,minutes:w.minutes,untimedSessions:w.sessionsWithoutDuration,hydration:w.hydration,goals:goalRows}:null,
  reading:metrics.whimsy.ready?{minutes:Math.round(metrics.whimsy.readingSeconds/60),pages:metrics.whimsy.pages,readingDays:metrics.whimsy.readingDays,booksFinished:metrics.whimsy.booksFinished}:null,
  mood:{checkins:metrics.mood.records.length,days:metrics.mood.loggedDays},
  money:money.transactions.length?{spendingCents:money.spending,topCategories:[...money.categories].sort((a,b)=>b.amount-a.amount).slice(0,3).map(c=>({label:c.name,cents:c.amount}))}:null,
 };
}
