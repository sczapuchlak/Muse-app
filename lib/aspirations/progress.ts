/**
 * Aspiration progress (#54). Pure. Each progress kind has exactly one calculation, and connected kinds read the
 * authoritative module through its own function (the progress engine, the Reading Challenge), never a copy.
 */
import {shiftDate,weekDates} from '@/lib/dates';
import {measureDays,metricInfo,type ProgressSources} from '@/lib/progress/engine';
import type {Book,ReadingGoal} from '@/lib/whimsy/models';
import {challengeFor,challengeProgress} from '@/lib/whimsy/reading-challenge';
import {ritualCell,ritualOpportunity,ritualStreak,type RitualState} from '@/lib/rituals';
import type {Aspiration,AspirationUpdate,Timeframe} from './models';

export type ProgressContext={updates:AspirationUpdate[];sources?:ProgressSources;books?:Book[];readingGoals?:ReadingGoal[];today:string};
export type Progress={percent:number|null;current:number|null;target:number|null;unit:string;source:'you'|string;automatic:boolean;available:boolean;note?:string};

const clamp=(n:number)=>Math.max(0,Math.min(100,n));
/** Latest journal value: by date, then by when it was written. */
export function latestValue(updates:AspirationUpdate[],aspirationId:string){
 return updates.filter(u=>u.aspirationId===aspirationId&&u.value!==null).sort((a,b)=>a.recordedOn.localeCompare(b.recordedOn)||a.createdAt.localeCompare(b.createdAt)).at(-1)?.value??null;
}
export function milestoneProgress(a:Pick<Aspiration,'milestones'>){
 const total=a.milestones.reduce((n,m)=>n+(m.weight&&m.weight>0?m.weight:1),0),done=a.milestones.filter(m=>m.completedOn).reduce((n,m)=>n+(m.weight&&m.weight>0?m.weight:1),0);
 return {done:a.milestones.filter(m=>m.completedOn).length,total:a.milestones.length,percent:total?clamp(done/total*100):null};
}

export function aspirationProgress(a:Aspiration,ctx:ProgressContext):Progress{
 switch(a.progressKind){
  case 'numeric':{const current=latestValue(ctx.updates,a.id);return {percent:a.target&&current!==null?clamp(current/a.target*100):current===null?0:null,current,target:a.target,unit:a.unit??'',source:'you',automatic:false,available:true};}
  case 'manual':{const current=latestValue(ctx.updates,a.id);return {percent:current===null?0:clamp(current),current,target:100,unit:'%',source:'you',automatic:false,available:true};}
  case 'milestones':{const m=milestoneProgress(a);return {percent:m.percent,current:m.done,target:m.total,unit:m.total===1?'milestone':'milestones',source:'you',automatic:false,available:true,...(m.total?{}:{note:'Add a milestone to start measuring'})};}
  case 'binary':return {percent:a.status==='completed'?100:0,current:null,target:null,unit:'',source:'you',automatic:false,available:true};
  case 'connected':{
   const c=a.connection;
   if(c?.kind==='reading-challenge'){const goal=challengeFor(ctx.readingGoals??[],c.year);
    if(!goal||!ctx.books)return {percent:null,current:null,target:null,unit:'books',source:'Bookshelf',automatic:true,available:false,note:goal?'Waiting for Bookshelf':`No ${c.year} Reading Challenge is set`};
    const p=challengeProgress(goal,ctx.books,c.year,ctx.today);return {percent:p.percent,current:p.done,target:p.target,unit:'books',source:'Bookshelf',automatic:true,available:true};}
   if(c?.kind==='metric'){const info=metricInfo[c.metric];
    if(!ctx.sources)return {percent:null,current:null,target:a.target,unit:info.unit,source:info.owner,automatic:true,available:false,note:`Waiting for ${info.owner}`};
    const m=measureDays({metric:c.metric,category:c.category,unit:c.unit},ctx.sources);
    if(!m.available)return {percent:null,current:null,target:a.target,unit:info.unit,source:info.owner,automatic:true,available:false,note:m.issue??`${info.owner} isn’t available`};
    const end=a.targetDate&&a.targetDate<ctx.today?a.targetDate:ctx.today;
    const current=[...m.days.values()].filter(d=>d.date>=a.startDate&&d.date<=end).reduce((n,d)=>n+d.value,0);
    return {percent:a.target?clamp(current/a.target*100):null,current,target:a.target,unit:c.metric==='water'?(c.unit??'oz'):info.unit,source:info.owner,automatic:true,available:true};}
   return {percent:null,current:null,target:null,unit:'',source:'you',automatic:false,available:false,note:'This connection is no longer available'};
  }
 }
}

// ---------- Home: filters, groupings and what needs attention ----------
const quarterOf=(d:string)=>`${d.slice(0,4)}-Q${Math.floor((Number(d.slice(5,7))-1)/3)+1}`;
export type TimeFilter='month'|'quarter'|'year'|'someday'|'all';
/** Which aspirations belong to a timeframe filter, by their target date (open-ended ones are "Someday"). */
export function inTimeFilter(a:Pick<Aspiration,'targetDate'|'timeframe'> & Partial<Pick<Aspiration,'targetPeriod'>>,filter:TimeFilter,today:string){
 if(filter==='all')return true;
 if(filter==='someday')return a.timeframe==='someday';
 if(!a.targetDate){if(!a.targetPeriod)return false;if(a.targetPeriod.includes('/'))return filter==='year'&&today.slice(0,4)>=a.targetPeriod.slice(0,4)&&today.slice(0,4)<=a.targetPeriod.slice(5);if(filter==='year')return a.targetPeriod.slice(0,4)===today.slice(0,4);if(a.targetPeriod.length!==7)return false;if(filter==='month')return a.targetPeriod===today.slice(0,7);return quarterOf(`${a.targetPeriod}-01`)===quarterOf(today);}
 if(filter==='month')return a.targetDate.slice(0,7)===today.slice(0,7);
 if(filter==='quarter')return quarterOf(a.targetDate)===quarterOf(today);
 return a.targetDate.slice(0,4)===today.slice(0,4);
}
/** Default dates for a new aspiration's timeframe. */
export function timeframeDates(t:Timeframe,today:string):{start:string;target:string|null}{
 const y=Number(today.slice(0,4)),m=Number(today.slice(5,7));
 const lastDay=(yy:number,mm:number)=>new Date(Date.UTC(yy,mm,0)).toISOString().slice(0,10);
 if(t==='month')return {start:today,target:lastDay(y,m)};
 if(t==='quarter'){const qEnd=Math.ceil(m/3)*3;return {start:today,target:lastDay(y,qEnd)};}
 if(t==='year')return {start:today,target:`${y}-12-31`};
 return {start:today,target:null};
}
export const isOpen=(a:Pick<Aspiration,'status'>)=>a.status==='active'||a.status==='planned'||a.status==='paused';
export function attention(aspirations:Aspiration[],today:string){
 const soon=shiftDate(today,14),month=shiftDate(today,30),ago=shiftDate(today,-30);
 const open=aspirations.filter(isOpen);
 return {
  approaching:open.filter(a=>a.targetDate&&a.targetDate>=today&&a.targetDate<=soon).sort((a,b)=>a.targetDate!.localeCompare(b.targetDate!)),
  upcomingMilestones:open.flatMap(a=>a.milestones.filter(m=>!m.completedOn&&m.targetDate&&m.targetDate>=today&&m.targetDate<=month).map(m=>({aspiration:a,milestone:m}))).sort((x,y)=>x.milestone.targetDate!.localeCompare(y.milestone.targetDate!)),
  recentMilestones:aspirations.flatMap(a=>a.milestones.filter(m=>m.completedOn&&m.completedOn>=ago).map(m=>({aspiration:a,milestone:m}))).sort((x,y)=>y.milestone.completedOn!.localeCompare(x.milestone.completedOn!)),
 };
}
export const nextMilestone=(a:Pick<Aspiration,'milestones'>)=>a.milestones.find(m=>!m.completedOn)??null;

export type SortKey='target'|'progress'|'updated'|'category'|'custom';
export function sortAspirations(list:Aspiration[],key:SortKey,percentOf:(a:Aspiration)=>number|null){
 const byTitle=(a:Aspiration,b:Aspiration)=>a.title.localeCompare(b.title);
 return [...list].sort((a,b)=>key==='target'?((a.targetDate??a.targetPeriod??'9999')+a.title).localeCompare((b.targetDate??b.targetPeriod??'9999')+b.title)
  :key==='progress'?(percentOf(b)??-1)-(percentOf(a)??-1)||byTitle(a,b)
  :key==='updated'?b.updatedAt.localeCompare(a.updatedAt)
  :key==='category'?a.category.localeCompare(b.category)||byTitle(a,b)
  :a.position-b.position||a.createdAt.localeCompare(b.createdAt));
}

// ---------- Supporting habits: consistency shown beside a goal, never counted as its progress ----------
export function habitConsistency(state:RitualState,ritualId:string,today:string,days=30){
 const ritual=state.rituals.find(r=>r.id===ritualId);if(!ritual)return null;
 let opportunities=0,complete=0,logged=0;
 for(let i=0;i<days;i++){const d=shiftDate(today,-i);if(d<ritual.startDate||!ritualOpportunity(state,ritual,d))continue;const s=ritualCell(state,ritual,d,today).status;
  if(s==='upcoming'||s==='open')continue;opportunities++;if(s==='complete')complete++;if(s!=='unknown')logged++;}
 return {ritual,streak:ritualStreak(state,ritual,today),opportunities,complete,logged,unit:ritual.type==='weekly-target'?'weeks':'scheduled days'};
}

// ---------- Insights ----------
export function aspirationStats(aspirations:Aspiration[],today:string){
 const year=today.slice(0,4),months=Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`);
 const completed=aspirations.filter(a=>a.completedOn?.startsWith(year));
 const milestonesDone=aspirations.flatMap(a=>a.milestones).filter(m=>m.completedOn?.startsWith(year));
 const byCategory=new Map<string,{active:number;completed:number}>();for(const a of aspirations.filter(x=>isOpen(x)||x.status==='completed')){const r=byCategory.get(a.category)??{active:0,completed:0};if(a.status==='completed')r.completed++;else r.active++;byCategory.set(a.category,r);}
 return {active:aspirations.filter(a=>a.status==='active').length,completedThisYear:completed.length,milestonesThisYear:milestonesDone.length,
  completedByMonth:months.map(m=>({month:m,completed:completed.filter(a=>a.completedOn!.startsWith(m)).length,milestones:milestonesDone.filter(x=>x.completedOn!.startsWith(m)).length})),
  byCategory:[...byCategory].map(([category,v])=>({category,...v})).sort((a,b)=>b.active+b.completed-a.active-a.completed)};
}
/** Progress over time from the journal (numeric and percentage goals): one point per dated update. */
export function progressHistory(a:Aspiration,updates:AspirationUpdate[]){
 return updates.filter(u=>u.aspirationId===a.id&&u.value!==null).sort((x,y)=>x.recordedOn.localeCompare(y.recordedOn)||x.createdAt.localeCompare(y.createdAt)).map(u=>({date:u.recordedOn,value:u.value!}));
}

/** Quarter thresholds reached and not yet celebrated (stored on the aspiration so every device agrees). */
export function newThresholds(a:Pick<Aspiration,'celebrated'|'status'>,percent:number|null){
 if(percent===null)return [];
 return [25,50,75,100].filter(t=>percent>=t&&!a.celebrated.includes(`p${t}`)).map(t=>`p${t}`);
}
export const weekStart=(today:string)=>weekDates(today)[0];

// ---------- Renewal: a new aspiration for the next period; the earlier one is never changed ----------
const lastDay=(y:number,m:number)=>new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
/** The next period after an aspiration's target date, for monthly, quarterly and yearly aspirations. */
export function nextPeriod(a:Pick<Aspiration,'timeframe'|'targetDate'|'startDate'>):{start:string;target:string}|null{
 const anchor=a.targetDate??a.startDate;const y=Number(anchor.slice(0,4)),m=Number(anchor.slice(5,7));
 if(a.timeframe==='year')return {start:`${y+1}-01-01`,target:`${y+1}-12-31`};
 if(a.timeframe==='month'){const ny=m===12?y+1:y,nm=m===12?1:m+1;return {start:`${ny}-${String(nm).padStart(2,'0')}-01`,target:lastDay(ny,nm)};}
 if(a.timeframe==='quarter'){const qEnd=Math.ceil(m/3)*3,ny=qEnd===12?y+1:y,startM=qEnd===12?1:qEnd+1;return {start:`${ny}-${String(startM).padStart(2,'0')}-01`,target:lastDay(ny,startM+2)};}
 return null;
}
export const canRenew=(a:Aspiration,all:Aspiration[])=>!!nextPeriod(a)&&!all.some(x=>x.renewedFrom===a.id);
/**
 * The renewed aspiration: same name, measure, links and milestone steps (all unchecked), new dates, a fresh journal and
 * celebrations. A Reading Challenge connection moves to the next year's challenge.
 */
export function renewedAspiration(a:Aspiration,id:string,now:string):Aspiration{
 const p=nextPeriod(a)!;
 const connection=a.connection?.kind==='reading-challenge'?{kind:'reading-challenge' as const,year:p.start.slice(0,4)}:a.connection;
 return {...a,id,startDate:p.start,targetDate:p.target,targetPeriod:null,status:'active',completedOn:null,reflection:null,celebrated:[],renewedFrom:a.id,connection,
  milestones:a.milestones.map(m=>({id:`${m.id.slice(0,24)}-${id.slice(0,8)}`,title:m.title,...(m.description?{description:m.description}:{}),...(m.weight?{weight:m.weight}:{})})),
  revision:0,createdAt:now,updatedAt:now};
}
/** Every period of a renewed aspiration, oldest first, each with its own record. */
export function renewalChain(a:Aspiration,all:Aspiration[]){
 const byId=new Map(all.map(x=>[x.id,x]));const back:Aspiration[]=[];let cur:Aspiration|undefined=a;const seen=new Set<string>();
 while(cur&&!seen.has(cur.id)){seen.add(cur.id);back.unshift(cur);cur=cur.renewedFrom?byId.get(cur.renewedFrom):undefined;}
 let next=all.find(x=>x.renewedFrom===a.id);while(next&&!seen.has(next.id)){seen.add(next.id);back.push(next);const id=next.id;next=all.find(x=>x.renewedFrom===id);}
 return back;
}

// ---------- Manual order ----------
/** Moves one aspiration within a list and returns only those whose position changed (so only they are saved). */
export function reorder(list:Aspiration[],id:string,toIndex:number){
 const from=list.findIndex(a=>a.id===id);if(from<0)return [];
 const next=[...list];const [item]=next.splice(from,1);next.splice(Math.max(0,Math.min(toIndex,next.length)),0,item);
 return next.map((a,i)=>({a,position:(i+1)*10})).filter(({a,position})=>a.position!==position).map(({a,position})=>({...a,position}));
}

// ---------- Insights: trends for a date range ----------
export function aspirationTrends(aspirations:Aspiration[],range:{start:string;end:string}){
 const inRange=(d?:string|null)=>!!d&&d>=range.start&&d<=range.end;
 const due=aspirations.filter(a=>a.status!=='archived'||a.completedOn).filter(a=>inRange(a.targetDate));
 const dueDone=due.filter(a=>a.completedOn&&a.completedOn<=a.targetDate!);
 const completed=aspirations.filter(a=>inRange(a.completedOn));
 const milestones=aspirations.flatMap(a=>a.milestones.filter(m=>inRange(m.completedOn)).map(m=>({aspiration:a,milestone:m})));
 const categories=new Map<string,{completed:number;milestones:number;active:number}>();
 for(const a of aspirations){if(a.status==='archived'&&!a.completedOn)continue;const r=categories.get(a.category)??{completed:0,milestones:0,active:0};
  if(inRange(a.completedOn))r.completed++;r.milestones+=a.milestones.filter(m=>inRange(m.completedOn)).length;if(isOpen(a)&&a.startDate<=range.end)r.active++;categories.set(a.category,r);}
 const byMonth=new Map<string,{completed:number;milestones:number}>();
 for(const a of completed){const k=a.completedOn!.slice(0,7);const r=byMonth.get(k)??{completed:0,milestones:0};r.completed++;byMonth.set(k,r);}
 for(const {milestone} of milestones){const k=milestone.completedOn!.slice(0,7);const r=byMonth.get(k)??{completed:0,milestones:0};r.milestones++;byMonth.set(k,r);}
 return {dueCount:due.length,dueCompletedOnTime:dueDone.length,completionRate:due.length?dueDone.length/due.length:null,completed,milestones,
  categories:[...categories].map(([category,v])=>({category,...v})).filter(c=>c.completed||c.milestones||c.active).sort((a,b)=>b.completed+b.milestones-a.completed-a.milestones||b.active-a.active),
  byMonth:[...byMonth].sort(([a],[b])=>a.localeCompare(b)).map(([month,v])=>({month,...v}))};
}
