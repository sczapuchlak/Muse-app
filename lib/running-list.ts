/**
 * Running List (#81): a continuous, bullet-journal style view of the SAME canonical tasks as the Scheduled Board,
 * Agenda and Dayview. A task never needs a date to be here. The weekday strip shows two different facts that are
 * never mixed: the day it was actually completed (from the server's completion history, in the person's timezone)
 * and the day it is planned for. Nothing here stores, copies or backdates anything.
 *
 * Known limits (approved, documented): only today's cell can complete a task; Muse has no canceled status; a
 * recurring task is one record with one current completion (no per-occurrence history).
 */
import {weekDates} from './dates';
import {localTimestampDate} from './insights/ranges';
import type {PlannedTask} from './models';
import type {TaskCompletion} from './planner';

export const tasksViews=[{id:'board',label:'Scheduled Board'},{id:'running',label:'Running List'}] as const;
export type TasksView=typeof tasksViews[number]['id'];
export const parseTasksView=(v:unknown):TasksView=>v==='running'?'running':'board';

export const scheduleScopes=[{id:'both',label:'All'},{id:'unscheduled',label:'Unscheduled'},{id:'scheduled',label:'Scheduled'}] as const;
export type ScheduleScope=typeof scheduleScopes[number]['id'];
export const parseScheduleScope=(v:unknown):ScheduleScope=>scheduleScopes.some(s=>s.id===v)?v as ScheduleScope:'both';
export const runningSorts=[{id:'manual',label:'Your order'},{id:'created',label:'Newest first'},{id:'planned',label:'Planned date'}] as const;
export type RunningSort=typeof runningSorts[number]['id'];
export const parseRunningSort=(v:unknown):RunningSort=>runningSorts.some(s=>s.id===v)?v as RunningSort:'manual';

/**
 * The local day each currently-completed task was completed. The server's completion events are the source (they
 * carry the person's local date); a completion the server hasn't echoed yet falls back to its timestamp in the
 * person's timezone. A reopened task has no completion day.
 */
export function completionDays(tasks:PlannedTask[],history:TaskCompletion[]|undefined,timeZone:string){
 const latest=new Map<string,TaskCompletion>();
 for(const e of history??[]){const p=latest.get(e.taskId);if(!p||e.occurredAt>=p.occurredAt)latest.set(e.taskId,e);}
 const out=new Map<string,string>();
 for(const t of tasks){
  if(!t.complete)continue;
  const e=latest.get(t.id);
  const day=e?.complete&&(!t.completedAt||Math.abs(Date.parse(e.occurredAt)-Date.parse(t.completedAt))<120000)?e.localDate:localTimestampDate(t.completedAt,timeZone);
  if(day)out.set(t.id,day);
 }
 return out;
}

/** Active (every open task, dated or not) and Completed this week. Order follows the chosen sort. */
export function runningSections(tasks:PlannedTask[],done:Map<string,string>,weekOf:string,opts:{scope:ScheduleScope;sort:RunningSort}){
 const week=weekDates(weekOf),inScope=(t:PlannedTask)=>opts.scope==='both'||(opts.scope==='scheduled')===!!t.plannedDate;
 const sorted=(list:PlannedTask[])=>opts.sort==='created'?[...list].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)):opts.sort==='planned'?[...list].sort((a,b)=>(a.plannedDate??'9999').localeCompare(b.plannedDate??'9999')):list;
 const active=sorted(tasks.filter(t=>!t.complete&&inScope(t)));
 const completed=tasks.filter(t=>t.complete&&inScope(t)&&week.includes(done.get(t.id)??'')).sort((a,b)=>(done.get(b.id)??'').localeCompare(done.get(a.id)??''));
 return {week,active,completed};
}

export type StripCell={date:string;completed:boolean;planned:boolean;today:boolean;actionable:boolean;label:string};
const long=(d:string)=>new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));
/** Seven cells. Only today's cell acts (complete, or reopen if it was completed today); earlier days are history. */
export function weekStrip(task:PlannedTask,week:string[],completedOn:string|undefined,today:string):StripCell[]{
 return week.map(date=>{
  const completed=!!task.complete&&completedOn===date,planned=task.plannedDate===date,isToday=date===today;
  const actionable=isToday&&(!task.complete||completedOn===today);
  const facts=[completed&&'completed',planned&&!completed&&'planned'].filter(Boolean).join(' and ');
  const label=`${long(date)}${facts?`: ${facts}`:''}${actionable?(task.complete?'. Reopen':'. Complete today'):''}`;
  return {date,completed,planned,today:isToday,actionable,label};
 });
}
/** Counted once per task from completion days, however many views show it. */
export function weekSummary(done:Map<string,string>,week:string[],today:string){
 let inWeek=0,onToday=0;for(const day of done.values()){if(week.includes(day))inWeek++;if(day===today)onToday++;}
 return {week:inWeek,today:onToday};
}
