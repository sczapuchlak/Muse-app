/**
 * Insights 2.0 — Life at a Glance (#97). Pure summaries over existing records only: Daily Edit days (rating, Day
 * Pulse, intention, Day in Three, priorities, mood check-ins), Wellness (water, movement, planned meals) and
 * Bookshelf (sessions, books). Nothing is stored; nothing is inferred.
 *
 * Rules: missing records are never zeros; averages say how many days they rest on; priorities keep completed,
 * open and unknown apart; reading time is never presented as completion; current-state reading (what's on the
 * nightstand now) is kept separate from activity inside the selected period.
 */
import {shiftDate,validDate,weekDates} from '../dates';
import type {DayData,DailyPriority} from '../data/daily';
import {priorityCompletion} from '../data/daily-projections';
import type {EmotionalCheckIn} from '../mood';
import type {Emotion,EmotionQuadrant} from '../models';
import type {DailyWater,WaterUnit} from '../water';
import type {MovementRecord} from '../wellness';
import type {Book,ReadingSession} from '../whimsy/models';
import {readingByDay} from '../whimsy/integrations';
import {bookPosition} from '../whimsy/books';
import {completionsIn,sessionSeconds} from '../whimsy/reading-stats';

export const glancePeriods=[{id:'day',label:'Day'},{id:'week',label:'Week'},{id:'month',label:'Month'},{id:'year',label:'Year'}] as const;
export type GlancePeriod=typeof glancePeriods[number]['id'];
export type GlanceRange={period:GlancePeriod;start:string;end:string;days:string[]};

const monthEnd=(month:string)=>{const [y,m]=month.split('-').map(Number);return `${month}-${String(new Date(Date.UTC(y,m,0)).getUTCDate()).padStart(2,'0')}`;};
function span(start:string,end:string){const out:string[]=[];for(let d=start;d<=end;d=shiftDate(d,1))out.push(d);return out;}
/** The period containing `anchor`. Weeks run Monday–Sunday like the rest of Muse. */
export function glanceRange(period:GlancePeriod,anchor:string):GlanceRange{
 if(!validDate(anchor))throw Error('Choose a valid date');
 const [start,end]=period==='day'?[anchor,anchor]:period==='week'?[weekDates(anchor)[0],weekDates(anchor)[6]]:period==='month'?[`${anchor.slice(0,7)}-01`,monthEnd(anchor.slice(0,7))]:[`${anchor.slice(0,4)}-01-01`,`${anchor.slice(0,4)}-12-31`];
 return {period,start,end,days:span(start,end)};
}
/** The same position one period earlier or later (month/year keep the day where they can). */
export function shiftGlance(period:GlancePeriod,anchor:string,direction:-1|1){
 if(period==='day')return shiftDate(anchor,direction);
 if(period==='week')return shiftDate(anchor,7*direction);
 const [y,m,d]=anchor.split('-').map(Number);
 const target=period==='month'?new Date(Date.UTC(y,m-1+direction,1)):new Date(Date.UTC(y+direction,m-1,1));
 const month=target.toISOString().slice(0,7),last=Number(monthEnd(month).slice(8));
 return `${month}-${String(Math.min(d,last)).padStart(2,'0')}`;
}
const fmt=(d:string,o:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('en-US',{...o,timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));
export function glanceTitle(r:GlanceRange){
 if(r.period==='day')return fmt(r.start,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
 if(r.period==='week')return r.start.slice(0,7)===r.end.slice(0,7)?`${fmt(r.start,{month:'short',day:'numeric'})} – ${fmt(r.end,{day:'numeric'})}, ${r.end.slice(0,4)}`:`${fmt(r.start,{month:'short',day:'numeric'})} – ${fmt(r.end,{month:'short',day:'numeric'})}, ${r.end.slice(0,4)}`;
 if(r.period==='month')return fmt(r.start,{month:'long',year:'numeric'});
 return r.start.slice(0,4);
}
/** Only days up to today can have happened; future days in the period are "not yet", never "missing". */
export const pastDays=(r:GlanceRange,today:string)=>r.days.filter(d=>d<=today);

const avg=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
const round1=(n:number|null)=>n===null?null:Math.round(n*10)/10;

// ---------- Daily Edit ----------
export type DayRating={date:string;overallDay:number|null;energy:number|null;stress:number|null};
export type DailyGlance={
 ratings:DayRating[];
 rating:{average:number|null;days:number;best:{date:string;value:number}[]};
 energy:{average:number|null;days:number};stress:{average:number|null;days:number};
 emotions:{id:string;count:number}[];families:Record<EmotionQuadrant,number>;checkIns:number;
 dayInThree:{emoji:string;count:number}[];dayInThreeDays:number;
 intentions:{date:string;emoji:string|null;text:string}[];
 priorities:{planned:number;completed:number;open:number;unknown:number;linked:number;standalone:number;days:number};
 recordedDays:number;
};
const familyKeys:EmotionQuadrant[]=['red','yellow','blue','green'];
export function dailyGlance(days:Record<string,DayData|undefined>,checkIns:EmotionalCheckIn[],catalog:Pick<Emotion,'id'|'quadrant'>[],range:GlanceRange):DailyGlance{
 const ratings:DayRating[]=range.days.map(date=>{const r=days[date]?.record;return {date,overallDay:r?.overall_day??null,energy:r?.energy??null,stress:r?.stress??null};});
 const rated=ratings.filter((r):r is DayRating&{overallDay:number}=>r.overallDay!==null);
 const top=Math.max(...rated.map(r=>r.overallDay),-Infinity);
 // "Good days" = the top-rated recorded days (8+ on the 0–10 scale), best first.
 const best=rated.filter(r=>r.overallDay>=8||r.overallDay===top&&rated.length>0&&top>=7).sort((a,b)=>b.overallDay-a.overallDay||a.date.localeCompare(b.date)).slice(0,5).map(r=>({date:r.date,value:r.overallDay}));
 const energy=ratings.flatMap(r=>r.energy===null?[]:[r.energy]),stress=ratings.flatMap(r=>r.stress===null?[]:[r.stress]);
 const inRange=checkIns.filter(c=>c.date>=range.start&&c.date<=range.end);
 const counts=new Map<string,number>(),families={red:0,yellow:0,blue:0,green:0} as Record<EmotionQuadrant,number>;
 for(const c of inRange)for(const id of new Set(c.emotionIds)){counts.set(id,(counts.get(id)??0)+1);const q=catalog.find(e=>e.id===id)?.quadrant;if(q&&familyKeys.includes(q))families[q]++;}
 const three=new Map<string,number>();let threeDays=0;const intentions:DailyGlance['intentions']=[];
 const pr={planned:0,completed:0,open:0,unknown:0,linked:0,standalone:0,days:0};
 let recorded=0;
 for(const date of range.days){const day=days[date];if(!day)continue;const r=day.record;
  const has=!!(day.priorities.length||day.checkins.length||r&&(r.intention_text||r.intention_emoji||r.day_in_three.length||[r.energy,r.stress,r.overall_day].some(v=>v!==null)));if(has)recorded++;
  if(r?.day_in_three.length){threeDays++;for(const e of r.day_in_three)three.set(e,(three.get(e)??0)+1);}
  if(r?.intention_text||r?.intention_emoji)intentions.push({date,emoji:r.intention_emoji,text:r.intention_text??''});
  if(day.priorities.length)pr.days++;
  for(const p of day.priorities as DailyPriority[]){pr.planned++;if(p.task_id)pr.linked++;else pr.standalone++;const done=priorityCompletion(p,'display');if(done===true)pr.completed++;else if(done===false)pr.open++;else pr.unknown++;}
 }
 return {ratings,rating:{average:round1(avg(rated.map(r=>r.overallDay))),days:rated.length,best},
  energy:{average:round1(avg(energy)),days:energy.length},stress:{average:round1(avg(stress)),days:stress.length},
  emotions:[...counts].map(([id,count])=>({id,count})).sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id)),families,checkIns:inRange.length,
  dayInThree:[...three].map(([emoji,count])=>({emoji,count})).sort((a,b)=>b.count-a.count),dayInThreeDays:threeDays,
  intentions,priorities:pr,recordedDays:recorded};
}
/** Year view: one row per month with the average rating and how many days it rests on. */
export function monthlyRatings(ratings:DayRating[]){
 const months=new Map<string,number[]>();for(const r of ratings){const m=r.date.slice(0,7);if(!months.has(m))months.set(m,[]);if(r.overallDay!==null)months.get(m)!.push(r.overallDay);}
 return [...months].map(([month,values])=>({month,average:round1(avg(values)),days:values.length}));
}

// ---------- Wellness ----------
/**
 * Water: only logged days count. A logged 0 is a real 0; an unlogged day is missing. Following the existing Insights
 * rule, amounts in different units are never totalled or converted together: each unit gets its own summary, the most
 * logged unit first.
 */
export function waterGlance(water:DailyWater[],range:GlanceRange,fallbackUnit:WaterUnit='oz'){
 const logged=water.filter(w=>w.date>=range.start&&w.date<=range.end&&Number.isFinite(w.total)&&w.total>=0);
 const units=new Map<WaterUnit,DailyWater[]>();for(const w of logged){const u=w.unit??fallbackUnit;if(!units.has(u))units.set(u,[]);units.get(u)!.push(w);}
 return [...units].map(([unit,list])=>{const withGoal=list.filter(w=>w.goal!==undefined&&w.goal>0);
  return {unit,days:list.length,average:Math.round(avg(list.map(w=>w.total))!),byDay:list.map(w=>({date:w.date,total:w.total,goal:w.goal})),goalDays:withGoal.length,goalMet:withGoal.filter(w=>w.total>=w.goal!).length};})
  .sort((a,b)=>b.days-a.days);
}
export function movementGlance(activities:MovementRecord[],types:{id:string;name:string}[],range:GlanceRange){
 const own=activities.filter(a=>a.date>=range.start&&a.date<=range.end),counts=new Map<string,number>();
 for(const a of own)counts.set(a.typeId,(counts.get(a.typeId)??0)+1);
 const minutes=own.flatMap(a=>typeof a.durationMinutes==='number'&&a.durationMinutes>0?[a.durationMinutes]:[]);
 return {sessions:own.length,days:new Set(own.map(a=>a.date)).size,minutes:minutes.reduce((a,b)=>a+b,0),timedSessions:minutes.length,
  top:[...counts].map(([id,count])=>({id,name:types.find(t=>t.id===id)?.name??'Recorded activity',count})).sort((a,b)=>b.count-a.count).slice(0,4)};
}

// ---------- Bookshelf ----------
export const readingProgressModes=[{id:'percent',label:'Percent'},{id:'pages',label:'Pages'},{id:'time',label:'Time'}] as const;
export type ReadingProgressMode=typeof readingProgressModes[number]['id'];
/** What is being read *now* (a current snapshot, not a historical claim). */
export function currentlyReading(books:Book[],sessions:ReadingSession[]){
 return books.filter(b=>b.status==='reading'&&!b.archivedAt).map(book=>{
  const position=bookPosition(book,sessions),total=book.totalPages&&book.totalPages>0?book.totalPages:undefined,clamped=total?Math.min(Math.max(position,0),total):Math.max(position,0);
  const own=sessions.filter(s=>s.bookId===book.id&&(!book.cycleId||!s.cycleId||s.cycleId===book.cycleId));
  return {book,position:clamped,total,percent:total?Math.round(clamped/total*100):null,seconds:own.reduce((n,s)=>n+sessionSeconds(s),0)};
 }).sort((a,b)=>(b.book.positionUpdatedAt??b.book.updatedAt??'').localeCompare(a.book.positionUpdatedAt??a.book.updatedAt??''));
}
/** Reading inside the selected period only: time split at local midnight, pages on their session date, completions by finish date. */
export function readingGlance(books:Book[],sessions:ReadingSession[],range:GlanceRange){
 let daily:{date:string;seconds:number;pages:number}[]=[];
 try{daily=readingByDay(sessions).filter(d=>d.date>=range.start&&d.date<=range.end);}catch{daily=[];}
 const own=sessions.filter(s=>s.date>=range.start&&s.date<=range.end),perBook=new Map<string,{pages:number;seconds:number}>();
 for(const s of own){const x=perBook.get(s.bookId)??{pages:0,seconds:0};x.pages+=Number.isFinite(s.pages)&&s.pages>0?s.pages:0;x.seconds+=sessionSeconds(s);perBook.set(s.bookId,x);}
 const done=completionsIn(books,{start:range.start,end:range.end});
 return {seconds:daily.reduce((n,d)=>n+d.seconds,0),pages:daily.reduce((n,d)=>n+d.pages,0),readingDays:daily.filter(d=>d.seconds>0||d.pages>0).length,
  sessions:own.length,completed:done.events.map(e=>({book:e.book,finishedOn:e.completion.finishedOn,reread:e.reread})),
  books:[...perBook].map(([id,x])=>({book:books.find(b=>b.id===id),...x})).filter((x):x is {book:Book;pages:number;seconds:number}=>!!x.book).sort((a,b)=>b.seconds-a.seconds||b.pages-a.pages)};
}
export function readingDuration(seconds:number){const m=Math.round(seconds/60);if(m<60)return `${m} min`;const h=Math.floor(m/60),r=m%60;return r?`${h} h ${r} min`:`${h} h`;}

// ---------- Polish pass (#97): per-week rates, categories, notes and the year by month ----------
/** Workouts per week over the days that have actually happened in the period (never future days). */
export function movementRate(sessions:number,range:GlanceRange,today:string){
 const elapsed=range.days.filter(d=>!today||d<=today).length;
 return {weeks:Math.round(elapsed/7*10)/10,perWeek:elapsed?Math.round(sessions/(elapsed/7)*10)/10:null};
}
export type MovementCategory='strength'|'cardio'|'mobility'|'other';
/** Recorded sessions by the type's own saved category (absent category stays "other"). */
export function movementByCategory(activities:MovementRecord[],types:{id:string;category?:MovementCategory}[],range:GlanceRange){
 const out:Record<MovementCategory,number>={strength:0,cardio:0,mobility:0,other:0};
 for(const a of activities)if(a.date>=range.start&&a.date<=range.end)out[types.find(t=>t.id===a.typeId)?.category??'other']++;
 return out;
}
/** The day's own words: its evening reflection, else its morning one. Never generated. */
export function dayNote(checkIns:EmotionalCheckIn[],date:string){
 const own=checkIns.filter(c=>c.date===date&&c.reflection.trim());
 return (own.find(c=>c.period==='evening')??own[0])?.reflection.trim()??'';
}
export type MonthSummary={month:string;rating:number|null;ratedDays:number;families:Record<EmotionQuadrant,number>;checkIns:number;
 water:number|null;waterDays:number;movement:number;prioritiesDone:number;prioritiesPlanned:number;topEmoji?:string;recordedDays:number};
/** Year view: one honest summary per month; water uses one unit (the most logged one) and never mixes units. */
export function yearByMonth(range:GlanceRange,days:Record<string,DayData|undefined>,checkIns:EmotionalCheckIn[],catalog:Pick<Emotion,'id'|'quadrant'>[],water:DailyWater[],waterUnit:WaterUnit|undefined,activities:MovementRecord[]):MonthSummary[]{
 const months=[...new Set(range.days.map(d=>d.slice(0,7)))];
 return months.map(month=>{
  const mr=glanceRange('month',`${month}-01`),d=dailyGlance(days,checkIns,catalog,mr);
  const w=waterUnit?water.filter(x=>x.date.startsWith(month)&&(x.unit??waterUnit)===waterUnit&&Number.isFinite(x.total)&&x.total>=0):[];
  return {month,rating:d.rating.average,ratedDays:d.rating.days,families:d.families,checkIns:d.checkIns,water:w.length?Math.round(avg(w.map(x=>x.total))!):null,waterDays:w.length,
   movement:activities.filter(a=>a.date.startsWith(month)).length,prioritiesDone:d.priorities.completed,prioritiesPlanned:d.priorities.planned,topEmoji:d.dayInThree[0]?.emoji,recordedDays:d.recordedDays};
 });
}
