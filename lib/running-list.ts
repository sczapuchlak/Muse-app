/**
 * Running List (#81): a continuous, bullet-journal style view of the SAME canonical tasks as the Scheduled Board,
 * Agenda and Dayview. A task never needs a date to be here. The weekday strip shows two different facts that are
 * never mixed: the day it was actually completed (from the server's completion history, in the person's timezone)
 * and the day it is planned for. Nothing here stores, copies or backdates anything.
 *
 * Known limits (approved, documented): Muse has no canceled status; a recurring task is one record with one current
 * completion (no per-occurrence history). Any day up to today can be marked done (approved 2026-11-06).
 */
import {shiftDate,weekDates} from './dates';
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

export type StripCell={date:string;completed:boolean;planned:boolean;today:boolean;actionable:boolean;action:'complete'|'reopen'|null;label:string};
const long=(d:string)=>new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));
/**
 * Seven cells. Any day from today back (within a year) can be clicked: a blank day marks the task done on that day,
 * its × reopens it. Future days only show the plan. The completion day always comes from recorded history.
 */
export function weekStrip(task:PlannedTask,week:string[],completedOn:string|undefined,today:string):StripCell[]{
 const oldest=shiftDate(today,-366);
 return week.map(date=>{
  const completed=!!task.complete&&completedOn===date,planned=task.plannedDate===date,isToday=date===today;
  const actionable=date<=today&&date>=oldest,action=!actionable?null:completed?'reopen':'complete';
  const facts=[completed&&'completed',planned&&'planned'].filter(Boolean).join(' and ');
  const verb=action==='reopen'?'. Reopen':action==='complete'?(isToday?'. Mark done today':`. Mark done on ${long(date)}`):'';
  return {date,completed,planned,today:isToday,actionable,action,label:`${long(date)}${facts?`: ${facts}`:''}${verb}`};
 });
}
/** Counted once per task from completion days, however many views show it. */
export function weekSummary(done:Map<string,string>,week:string[],today:string){
 let inWeek=0,onToday=0;for(const day of done.values()){if(week.includes(day))inWeek++;if(day===today)onToday++;}
 return {week:inWeek,today:onToday};
}

// ---------- Manual order (separate from the board's per-day position, so it never changes a date) ----------
/** Tasks in the person's saved Running List order; tasks it doesn't know yet follow, in their existing order. */
export function applyRunningOrder(tasks:PlannedTask[],order:readonly string[]){
 const rank=new Map(order.map((id,i)=>[id,i]));
 return tasks.map((t,i)=>({t,i})).sort((a,b)=>(rank.get(a.t.id)??order.length+a.i)-(rank.get(b.t.id)??order.length+b.i)).map(x=>x.t);
}
/** Move one task before another (or to the end when beforeId is undefined). Only ids change places. */
export function moveInOrder(ordered:readonly string[],id:string,beforeId?:string){
 if(id===beforeId)return [...ordered];
 const rest=ordered.filter(x=>x!==id),at=beforeId?rest.indexOf(beforeId):-1;
 rest.splice(at<0?rest.length:at,0,id);return rest;
}
/** Move up/down by one among the visible rows (keyboard and menu path). */
export function stepInOrder(visible:readonly string[],full:readonly string[],id:string,step:-1|1){
 const i=visible.indexOf(id),j=i+step;if(i<0||j<0||j>=visible.length)return [...full];
 const target=visible[j];return step<0?moveInOrder(full,id,target):moveInOrder(full,target,id);
}
/** First and last marked weekday (0–6) for the connecting line; null when the week has no mark for this task. */
export function markSpan(cells:StripCell[]){const idx=cells.map((c,i)=>c.completed||c.planned?i:-1).filter(i=>i>=0);return idx.length?{first:idx[0],last:idx[idx.length-1]}:null;}
