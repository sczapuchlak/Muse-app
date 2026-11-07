/**
 * Agenda (#79): the Planner's time-based views over the SAME task and event records the Tasks tab, Dayview and
 * Insights use. Nothing here stores or copies records; it only selects and arranges them. Pure, so every view can
 * be tested without a browser.
 */
import {shiftDate,weekDates} from './dates';
import type {DayEvent,PlannedTask} from './models';

export const plannerTabs=[{id:'tasks',label:'Tasks'},{id:'agenda',label:'Agenda'},{id:'reflections',label:'Reflections'}] as const;
export type PlannerTab=typeof plannerTabs[number]['id'];
export const agendaViews=[{id:'day',label:'Day'},{id:'week',label:'Week'},{id:'month',label:'Month'},{id:'year',label:'Future Log'}] as const;
export type AgendaView=typeof agendaViews[number]['id'];

export type AgendaPreferences={view:AgendaView;showCompleted:boolean;showSidebar:boolean};
export const defaultAgendaPreferences:AgendaPreferences={view:'week',showCompleted:true,showSidebar:true};
/** Saved per device; anything unrecognised falls back to the defaults. */
export function parseAgendaPreferences(value:unknown):AgendaPreferences{
 const v=value&&typeof value==='object'?value as Record<string,unknown>:{};
 return {view:agendaViews.some(a=>a.id===v.view)?v.view as AgendaView:defaultAgendaPreferences.view,
  showCompleted:typeof v.showCompleted==='boolean'?v.showCompleted:defaultAgendaPreferences.showCompleted,
  showSidebar:typeof v.showSidebar==='boolean'?v.showSidebar:defaultAgendaPreferences.showSidebar};
}
export const parsePlannerTab=(value:string|null|undefined):PlannerTab=>plannerTabs.some(t=>t.id===value)?value as PlannerTab:'tasks';

const monthStart=(date:string)=>`${date.slice(0,7)}-01`;
const daysInMonth=(date:string)=>new Date(Date.UTC(Number(date.slice(0,4)),Number(date.slice(5,7)),0)).getUTCDate();
const addMonths=(date:string,n:number)=>{const y=Number(date.slice(0,4)),m=Number(date.slice(5,7))-1+n;const d=new Date(Date.UTC(y,m,1));return d.toISOString().slice(0,10);};

/** The dates a view covers, and where "previous"/"next" go. */
export function agendaRange(view:AgendaView,date:string){
 if(view==='day')return {days:[date],previous:shiftDate(date,-1),next:shiftDate(date,1)};
 if(view==='week')return {days:weekDates(date),previous:shiftDate(date,-7),next:shiftDate(date,7)};
 if(view==='month'){const first=monthStart(date),days=Array.from({length:daysInMonth(first)},(_,i)=>shiftDate(first,i));return {days,previous:addMonths(first,-1),next:addMonths(first,1)};}
 const y=date.slice(0,4);return {days:[] as string[],previous:`${Number(y)-1}-01-01`,next:`${Number(y)+1}-01-01`};
}
/** Month grid weeks, Monday first; cells outside the month are null so the grid never invents days. */
export function monthGrid(date:string):(string|null)[][]{
 const first=monthStart(date),n=daysInMonth(first),offset=(new Date(`${first}T12:00:00Z`).getUTCDay()+6)%7;
 const cells:(string|null)[]=[...Array(offset).fill(null),...Array.from({length:n},(_,i)=>shiftDate(first,i))];
 while(cells.length%7)cells.push(null);
 return Array.from({length:cells.length/7},(_,w)=>cells.slice(w*7,w*7+7));
}
export const futureLogMonths=(date:string)=>Array.from({length:12},(_,i)=>`${date.slice(0,4)}-${String(i+1).padStart(2,'0')}`);

/** One day's events (by time) and tasks (in their saved order). Hiding completed tasks never changes them. */
export function dayItems(tasks:PlannedTask[],events:DayEvent[],day:string,showCompleted:boolean){
 return {events:events.filter(e=>e.date===day).sort((a,b)=>a.dateTime.localeCompare(b.dateTime)),
  tasks:tasks.filter(t=>t.plannedDate===day&&(showCompleted||!t.complete)),
  hiddenComplete:showCompleted?0:tasks.filter(t=>t.plannedDate===day&&t.complete).length};
}
/** Everything scheduled in a month, for the Future Log. */
export function monthItems(tasks:PlannedTask[],events:DayEvent[],month:string,showCompleted:boolean){
 return {events:events.filter(e=>e.date.startsWith(month)).sort((a,b)=>a.dateTime.localeCompare(b.dateTime)),
  tasks:tasks.filter(t=>t.plannedDate?.startsWith(month)&&(showCompleted||!t.complete)).sort((a,b)=>(a.plannedDate??'').localeCompare(b.plannedDate??''))};
}
export function agendaTitle(view:AgendaView,date:string){
 const fmt=(o:Intl.DateTimeFormatOptions,d:string)=>new Intl.DateTimeFormat('en-US',{...o,timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));
 if(view==='day')return fmt({weekday:'long',month:'long',day:'numeric',year:'numeric'},date);
 if(view==='week'){const w=weekDates(date);return `${fmt({month:'short',day:'numeric'},w[0])} – ${fmt({month:'short',day:'numeric',year:'numeric'},w[6])}`;}
 if(view==='month')return fmt({month:'long',year:'numeric'},date);
 return `${date.slice(0,4)} · Future Log`;
}
