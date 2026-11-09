import {isSeries} from './planner-occurrences';
/**
 * Agenda (#79): the Planner's time-based views over the SAME task and event records the Tasks tab, Dayview and
 * Insights use. Nothing here stores or copies records; it only selects and arranges them. Pure, so every view can
 * be tested without a browser.
 */
import {compactDateRange,shiftDate,weekDates} from './dates';
import type {DayEvent,PlannedTask} from './models';

/** #117: Intentions (before) sits beside Tasks; Reflections (after) stays last. */
export const plannerTabs=[{id:'tasks',label:'Tasks'},{id:'intentions',label:'Intentions'},{id:'agenda',label:'Agenda'},{id:'reflections',label:'Reflections'}] as const;
export type PlannerTab=typeof plannerTabs[number]['id'];
export const agendaViews=[{id:'day',label:'Day'},{id:'week',label:'Week'},{id:'month',label:'Month'},{id:'year',label:'Future Log'}] as const;
export type AgendaView=typeof agendaViews[number]['id'];

export type AgendaPreferences={view:AgendaView;showCompleted:boolean;showCanceled:boolean;showMarks:boolean};
export const defaultAgendaPreferences:AgendaPreferences={view:'week',showCompleted:true,showCanceled:true,showMarks:true};
/** Saved per device; anything unrecognised falls back to the defaults. */
export function parseAgendaPreferences(value:unknown):AgendaPreferences{
 const v=value&&typeof value==='object'?value as Record<string,unknown>:{};
 const flag=(k:'showCompleted'|'showCanceled'|'showMarks')=>typeof v[k]==='boolean'?v[k] as boolean:defaultAgendaPreferences[k];
 return {view:agendaViews.some(a=>a.id===v.view)?v.view as AgendaView:defaultAgendaPreferences.view,showCompleted:flag('showCompleted'),showCanceled:flag('showCanceled'),showMarks:flag('showMarks')};
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

/** The last day an event covers (one record, however many days it spans). */
export const eventEnd=(e:Pick<DayEvent,'date'|'endDate'>)=>e.endDate&&e.endDate>e.date?e.endDate:e.date;
export const eventOnDay=(e:Pick<DayEvent,'date'|'endDate'>,day:string)=>e.date<=day&&day<=eventEnd(e);
/** All-day and multi-day events first, then timed ones by start time. */
const eventOrder=(a:DayEvent,b:DayEvent)=>Number(!a.allDay)-Number(!b.allDay)||a.dateTime.localeCompare(b.dateTime)||a.title.localeCompare(b.title);
export type AgendaVisibility={showCompleted:boolean;showCanceled?:boolean};
const visibleEvent=(e:DayEvent,v:AgendaVisibility)=>v.showCanceled!==false||e.status!=='canceled';
/** One day's events (in time order) and tasks (in their saved order). Hiding never changes a record. */
export function dayItems(tasks:PlannedTask[],events:DayEvent[],day:string,visibility:boolean|AgendaVisibility){
 const v=typeof visibility==='boolean'?{showCompleted:visibility}:visibility;
 const onDay=events.filter(e=>eventOnDay(e,day));
 return {events:onDay.filter(e=>visibleEvent(e,v)).sort(eventOrder),
  tasks:tasks.filter(t=>t.plannedDate===day&&(v.showCompleted||!t.complete)),
  hiddenComplete:v.showCompleted?0:tasks.filter(t=>t.plannedDate===day&&t.complete).length,
  hiddenCanceled:onDay.filter(e=>!visibleEvent(e,v)).length};
}
/** Everything scheduled in a month, for the Future Log. A multi-day event appears once, in each month it touches. */
export function monthItems(tasks:PlannedTask[],events:DayEvent[],month:string,visibility:boolean|AgendaVisibility){
 const v=typeof visibility==='boolean'?{showCompleted:visibility}:visibility,first=`${month}-01`,last=`${month}-31`;
 return {events:events.filter(e=>e.date<=last&&eventEnd(e)>=first&&visibleEvent(e,v)).sort((a,b)=>a.date.localeCompare(b.date)||eventOrder(a,b)),
  tasks:tasks.filter(t=>t.plannedDate?.startsWith(month)&&(v.showCompleted||!t.complete)).sort((a,b)=>(a.plannedDate??'').localeCompare(b.plannedDate??''))};
}
/** "10–18", "Sep 28 – Oct 2", or just the day number, for compact Future Log and Month entries. */
export function eventDays(e:Pick<DayEvent,'date'|'endDate'>,month?:string){
 const end=eventEnd(e),d=(x:string)=>String(Number(x.slice(8))),md=(x:string)=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${x}T12:00:00Z`));
 if(end===e.date)return d(e.date);
 return e.date.slice(0,7)===end.slice(0,7)&&(!month||month===e.date.slice(0,7))?`${d(e.date)}–${d(end)}`:`${md(e.date)} – ${md(end)}`;
}
/** When an event happens, in words: "All day", "2:00 PM", "2:00 PM – 3:30 PM". */
export function eventWhen(e:DayEvent){
 if(e.allDay)return 'All day';
 if(!e.endTime)return e.time;
 const [h,m]=e.endTime.split(':');return `${e.time} – ${Number(h)%12||12}:${m} ${Number(h)>=12?'PM':'AM'}`;
}

/**
 * A task's planning state from its existing fields only (no new status is stored): completed, overdue (planned for a
 * past day and still open — never moved for you), scheduled, or unscheduled.
 */
export type TaskState='complete'|'overdue'|'scheduled'|'unscheduled';
export function taskState(t:Pick<PlannedTask,'complete'|'plannedDate'>&Partial<Pick<PlannedTask,'rule'|'recurrence'|'seriesId'>>,today:string):TaskState{
 if(t.complete)return 'complete';
 // A recurring series is ongoing, never overdue as a whole; its dated occurrences carry their own state.
 if(isSeries(t))return 'scheduled';if(!t.plannedDate)return 'unscheduled';return t.plannedDate<today?'overdue':'scheduled';
}
export const taskStateLabels:Record<TaskState,string>={complete:'Completed',overdue:'Overdue — still open from an earlier day',scheduled:'Scheduled',unscheduled:'Not scheduled'};
export function agendaTitle(view:AgendaView,date:string){
 const fmt=(o:Intl.DateTimeFormatOptions,d:string)=>new Intl.DateTimeFormat('en-US',{...o,timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));
 if(view==='day')return fmt({weekday:'long',month:'long',day:'numeric',year:'numeric'},date);
 if(view==='week'){const w=weekDates(date);return `${fmt({month:'short',day:'numeric'},w[0])} – ${fmt({month:'short',day:'numeric',year:'numeric'},w[6])}`;}
 if(view==='month')return fmt({month:'long',year:'numeric'},date);
 return `${date.slice(0,4)} · Future Log`;
}

/** The shorter title for the narrow two-row toolbar (#101); the year appears only when it isn't the current one. */
export function compactAgendaTitle(view:AgendaView,date:string,today:string){
 const fmt=(o:Intl.DateTimeFormatOptions,d:string)=>new Intl.DateTimeFormat('en-US',{...o,timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));
 const otherYear=!!today&&date.slice(0,4)!==today.slice(0,4);
 if(view==='day')return fmt({weekday:'short',month:'short',day:'numeric',...(otherYear?{year:'numeric'}:{})},date);
 if(view==='week'){const w=weekDates(date);return compactDateRange(w[0],w[6],today);}
 if(view==='month')return fmt({month:'long',...(otherYear?{year:'numeric'}:{})},date);
 return `${date.slice(0,4)} · Future Log`;
}

// ---------- Weekly spreads (#79 final layout): Mon–Thu, then Fri–Sun + the planning column ----------
export type WeekSlot={kind:'day';date:string}|{kind:'planning'};
/** Eight equal columns: the seven days (Monday first) and the customizable planning column last. */
export function weekSlots(date:string):WeekSlot[]{return [...weekDates(date).map(d=>({kind:'day' as const,date:d})),{kind:'planning'}];}
export const SPREAD_SIZE=4;
/** Which spread (0: Mon–Thu, 1: Fri–Sun + planning) a date sits in. */
export const spreadFor=(date:string)=>weekDates(date).indexOf(date)>=SPREAD_SIZE?1:0;

export type PlanningKind='notes'|'checklist';
export type PlanningConfig={kind:PlanningKind;title:string};
export const defaultPlanningConfig:PlanningConfig={kind:'checklist',title:'Weekly priorities'};
export function parsePlanningConfig(value:unknown):PlanningConfig{
 const v=value&&typeof value==='object'?value as Record<string,unknown>:{};
 const kind=v.kind==='notes'||v.kind==='checklist'?v.kind:defaultPlanningConfig.kind;
 const title=typeof v.title==='string'&&v.title.trim()?v.title.trim().slice(0,40):kind==='notes'?'Week notes':defaultPlanningConfig.title;
 return {kind,title};
}
export type PlanningItem={id:string;text:string;done:boolean};
export function parsePlanningItems(value:unknown):PlanningItem[]{
 return Array.isArray(value)?value.filter((i):i is PlanningItem=>!!i&&typeof i==='object'&&typeof (i as PlanningItem).id==='string'&&typeof (i as PlanningItem).text==='string').slice(0,40).map(i=>({id:i.id,text:i.text.slice(0,200),done:!!i.done})):[];
}
