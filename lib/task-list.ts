/**
 * The Scheduled Board's Task List (#79 §12): the source of tasks beside the dated days. Pure: it only selects and
 * groups the same canonical tasks the days, Agenda and Dayview use. Nothing is copied or stored here.
 */
import {shiftDate,weekDates} from './dates';
import type {PlannedTask} from './models';
import {taskState} from './agenda';

export const taskListScopes=[
 {id:'plan',label:'To plan',hint:'Unscheduled tasks, plus open tasks left on an earlier day'},
 {id:'overdue',label:'Overdue',hint:'Open tasks planned for an earlier day'},
 {id:'scheduled',label:'Scheduled',hint:'Tasks planned for today or later'},
 {id:'all',label:'All',hint:'Every task that matches your filters'},
] as const;
export type TaskListScope=typeof taskListScopes[number]['id'];
export const parseTaskListScope=(value:unknown):TaskListScope=>taskListScopes.some(s=>s.id===value)?value as TaskListScope:'plan';

export type TaskListGroup={id:'overdue'|'unscheduled'|'scheduled'|'complete';label:string;tasks:PlannedTask[]};
const byDate=(a:PlannedTask,b:PlannedTask)=>(a.plannedDate??'').localeCompare(b.plannedDate??'');
/**
 * The list's groups for a scope. Overdue tasks stay on their day until the person moves them; the list only gathers
 * them so they're easy to reschedule. Unscheduled tasks keep their saved order (drag order).
 */
export function taskListGroups(tasks:PlannedTask[],scope:TaskListScope,today:string):TaskListGroup[]{
 const of=(state:ReturnType<typeof taskState>)=>tasks.filter(t=>taskState(t,today)===state);
 const overdue={id:'overdue' as const,label:'Overdue',tasks:of('overdue').sort(byDate)};
 const unscheduled={id:'unscheduled' as const,label:'Unscheduled',tasks:of('unscheduled')};
 const scheduled={id:'scheduled' as const,label:'Scheduled',tasks:of('scheduled').sort(byDate)};
 const complete={id:'complete' as const,label:'Completed',tasks:of('complete').sort((a,b)=>(b.completedAt??'').localeCompare(a.completedAt??''))};
 const groups=scope==='plan'?[overdue,unscheduled]:scope==='overdue'?[overdue]:scope==='scheduled'?[scheduled]:[overdue,unscheduled,scheduled,complete];
 return groups.filter(g=>g.tasks.length);
}
export const taskListCount=(groups:TaskListGroup[])=>groups.reduce((n,g)=>n+g.tasks.length,0);

/** Quick scheduling choices for one task: today, tomorrow, the board's visible days, next Monday. */
export function scheduleChoices(today:string,boardDays:string[],current?:string){
 const nextMonday=shiftDate(weekDates(today)[0],7);
 const seen=new Set<string>(),out:{date:string;label:string}[]=[];
 const add=(date:string,label:string)=>{if(seen.has(date)||date===current)return;seen.add(date);out.push({date,label});};
 add(today,'Today');add(shiftDate(today,1),'Tomorrow');
 for(const d of boardDays)if(d>today)add(d,'');
 add(nextMonday,'Next Monday');
 return out;
}
export const shortDay=(date:string)=>new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
