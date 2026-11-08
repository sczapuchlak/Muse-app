import type {RecurrenceRule} from '@/lib/recurrence';
import type {EventException,TaskOccurrence} from '@/lib/planner-occurrences';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from '@/lib/database.types';
import type {PlannerAction,PlannerState,TaskCompletion} from '@/lib/planner';
import type {DayEvent,PlannedTask} from '@/lib/models';
import {validAccent} from '@/lib/appearance-values';
import {validDate,validTimeZone} from '@/lib/dates';
type Tables=Database['public']['Tables'];
type Row<K extends keyof Tables>=Tables[K]['Row'];
export type PlannerSnapshot={revision:number;state:PlannerState};
type Raw={revision:number;workspaces:Row<'workspaces'>[];groups:Row<'task_groups'>[];tags:Row<'task_tags'>[];tasks:Row<'tasks'>[];subtasks:Row<'task_subtasks'>[];tagLinks:Row<'task_tag_links'>[];timeSessions:Row<'task_time_sessions'>[];completionHistory:Row<'task_completion_events'>[];events:Row<'planner_events'>[]};
/** Twelve-hour label for a local "HH:MM" time. */
export const clockLabel=(time:string)=>{const [h,m]=time.split(':');return `${Number(h)%12||12}:${m} ${Number(h)>=12?'PM':'AM'}`;};
/** One stored event → the shared DayEvent. Older rows (before all-day support) are timed and confirmed. */
export function eventProjection(item:Pick<Row<'planner_events'>,'id'|'title'|'local_date'|'local_time'|'detail'>&Partial<Pick<Row<'planner_events'>,'all_day'|'end_date'|'end_time'|'location'|'status'>>):DayEvent{
 const allDay=!!item.all_day||!item.local_time,start=item.local_time?.slice(0,5)??'00:00';
 return {id:item.id,kind:'event',title:item.title,date:item.local_date,dateTime:`${item.local_date}T${start}`,time:allDay?'All day':clockLabel(start),detail:item.detail??undefined,
  ...(allDay?{allDay:true}:{}),...(item.end_date&&item.end_date>item.local_date?{endDate:item.end_date}:{}),...(!allDay&&item.end_time?{endTime:item.end_time.slice(0,5)}:{}),
  ...(item.location?{location:item.location}:{}),status:item.status==='tentative'||item.status==='canceled'?item.status:'confirmed'};
}
export const emptyPlannerState=():PlannerState=>({tasks:[],events:[],workspaces:[],groups:[],tags:[],activeTimer:null,completionHistory:[]});
export function plannerProjection(raw:Raw):PlannerSnapshot{
 if(!Number.isSafeInteger(raw.revision)||raw.revision<0||!['workspaces','groups','tags','tasks','subtasks','tagLinks','timeSessions','completionHistory','events'].every(key=>Array.isArray(raw[key as keyof Raw])))throw Error('Invalid Planner response');
 const active=raw.timeSessions.find(item=>item.ended_at===null);
 const tasks:PlannedTask[]=raw.tasks.map(item=>({id:item.id,kind:'task',title:item.title,workspaceId:item.workspace_id,groupId:item.group_id??undefined,plannedDate:item.planned_date??undefined,dueDate:item.due_date??undefined,timeSlot:item.local_time_slot?.slice(0,5),estimatedMinutes:item.estimated_minutes??undefined,actualMinutes:item.actual_minutes_baseline+raw.timeSessions.filter(time=>time.task_id===item.id&&time.ended_at).reduce((sum,time)=>sum+Math.max(0,Date.parse(time.ended_at!)-Date.parse(time.started_at))/60000,0),complete:item.complete,completedAt:item.completed_at??undefined,notes:item.notes??undefined,detail:item.detail??undefined,tagIds:raw.tagLinks.filter(link=>link.task_id===item.id).map(link=>link.tag_id),subtasks:raw.subtasks.filter(subtask=>subtask.task_id===item.id).sort((a,b)=>a.position-b.position).map(subtask=>({id:subtask.id,title:subtask.title,complete:subtask.complete})),recurrence:item.recurrence_frequency?{frequency:item.recurrence_frequency as 'daily'|'weekly'|'monthly',interval:item.recurrence_interval!,until:item.recurrence_until??undefined}:undefined,createdAt:item.created_at}));
 const organization=<T extends {accent:string|null;icon_id:string|null}>(item:T)=>({accent:validAccent(item.accent??'')?item.accent as import('@/lib/appearance-values').AccentColor:'primary' as const,icon:(item.icon_id??undefined) as import('@/components/MuseIcon').MuseIconName|undefined});
 const completionHistory:TaskCompletion[]=raw.completionHistory.map(item=>({id:item.id,taskId:item.task_id,complete:item.complete,occurredAt:item.occurred_at,localDate:item.local_date,timeZone:item.time_zone,title:item.title,workspaceId:item.workspace_id,plannedDate:item.planned_date??undefined}));
 return {revision:raw.revision,state:{tasks,workspaces:raw.workspaces.map(item=>({id:item.id,name:item.name,...organization(item)})),groups:raw.groups.map(item=>({id:item.id,name:item.name,workspaceId:item.workspace_id,...organization(item),accent:item.accent&&validAccent(item.accent)?item.accent:undefined})),tags:raw.tags.map(item=>({id:item.id,name:item.name,...organization(item)})),events:raw.events.map(eventProjection),activeTimer:active?{taskId:active.task_id,startedAt:active.started_at}:null,completionHistory}};
}
export async function readPlanner(client:SupabaseClient<Database>):Promise<PlannerSnapshot>{
 const [planner,recurrence]=await Promise.all([client.rpc('read_planner'),client.rpc('read_planner_recurrence')]);
 if(planner.error)throw planner.error;
 const snapshot=plannerProjection(planner.data as unknown as Raw);
 // Recurrence 2.0 (#89). A server without the migration answers "function not found": recurrence simply stays off.
 if(recurrence.error){if(['PGRST202','42883'].includes(recurrence.error.code??''))return snapshot;throw recurrence.error;}
 return {...snapshot,state:withRecurrence(snapshot.state,recurrence.data as unknown as RecurrenceRaw)};
}
type RecurrenceRaw={tasks:{id:string;rule:RecurrenceRule}[];occurrences:TaskOccurrence[];events:{id:string;rule:RecurrenceRule}[];exceptions:EventException[]};
/** Attach series rules, occurrence history and event exceptions to the Planner state. */
export function withRecurrence(state:PlannerState,raw:RecurrenceRaw):PlannerState{
 const taskRules=new Map(raw.tasks.map(t=>[t.id,t.rule])),eventRules=new Map(raw.events.map(e=>[e.id,e.rule]));
 return {...state,tasks:state.tasks.map(t=>taskRules.has(t.id)?{...t,rule:taskRules.get(t.id),recurrence:undefined}:t),events:state.events.map(e=>eventRules.has(e.id)?{...e,rule:eventRules.get(e.id)}:e),occurrences:raw.occurrences??[],eventExceptions:raw.exceptions??[]};
}
export function plannerActionJson(action:PlannerAction):Json{return JSON.parse(JSON.stringify(action,(_key,value)=>value===undefined?null:value)) as Json;}
export function validatePlannerAction(action:PlannerAction,timeZone:string){
 if(!validTimeZone(timeZone))throw new Error('Set a valid saved IANA timezone before planning.');
 const task=action.type==='task/add'?action.task:action.type==='task/update'?action.patch:null;
 if(task){
  if('title'in task&&(!task.title?.trim()||task.title.length>160))throw Error('Task titles need 1–160 characters.');
  for(const key of ['plannedDate','dueDate'] as const)if(task[key]!==undefined&&!validDate(task[key]))throw Error('Choose a valid calendar date.');
  if(task.timeSlot!==undefined&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(task.timeSlot))throw Error('Choose a valid local time.');
  if(task.estimatedMinutes!==undefined&&(!Number.isFinite(task.estimatedMinutes)||task.estimatedMinutes<0||task.estimatedMinutes>=1e6))throw Error('Use a finite nonnegative estimate.');
  if(task.recurrence&&(!['daily','weekly','monthly'].includes(task.recurrence.frequency)||!Number.isInteger(task.recurrence.interval)||task.recurrence.interval<1||task.recurrence.interval>10000||task.recurrence.until!==undefined&&!validDate(task.recurrence.until)))throw Error('Choose a valid recurrence frequency, interval and end date.');
  if(task.subtasks?.some(item=>!item.title.trim()||item.title.length>160))throw Error('Subtask titles need 1–160 characters.');
 }
 if((action.type==='task/move'||action.type==='task/place')&&action.date!==undefined&&!validDate(action.date))throw Error('Choose a valid calendar date.');
 if(action.type==='event/add'||action.type==='event/save'){const e=action.event;
  if(!e.title.trim()||e.title.length>160)throw Error('Event titles need 1–160 characters.');
  if(!validDate(e.date)||(e.endDate!==undefined&&(!validDate(e.endDate)||e.endDate<e.date)))throw Error('Choose a valid event date range.');
  if(!e.allDay&&!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(e.dateTime))throw Error('Choose a valid local time.');
  if(e.endTime!==undefined&&(e.allDay||!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.endTime)))throw Error('Choose a valid end time.');
  if((e.location?.length??0)>200||(e.detail?.length??0)>5000)throw Error('Keep the location under 200 characters and notes under 5,000.');
 }
}
export async function writePlanner(client:SupabaseClient<Database>,revision:number,id:string,action:PlannerAction,timeZone:string){validatePlannerAction(action,timeZone);if(action.type==='priority/create'){const {data,error}=await client.rpc('create_priority_task',{p_date:action.date,p_id:action.id,p_text:action.title,p_expected_planner_revision:revision,p_command_id:id});if(error)throw error;return data as number;}if(action.type==='priority/title'){const {data,error}=await client.rpc('rename_priority_task',{p_id:action.id,p_priority_revision:action.priorityRevision,p_expected_planner_revision:revision,p_title:action.title,p_command_id:id});if(error)throw error;return data as number;}if(action.type==='priority/complete'){const {data,error}=await client.rpc('complete_linked_priority',{p_id:action.id,p_priority_revision:action.priorityRevision,p_expected_planner_revision:revision,p_complete:action.complete,p_command_id:id});if(error)throw error;return data as number;}if(action.type==='task/completeOn'){if(!validDate(action.date))throw Error('Choose a valid day.');const {data,error}=await client.rpc('planner_complete_on',{p_expected_revision:revision,p_command_id:id,p_task_id:action.id,p_local_date:action.date});if(error)throw error;return data as number;}if(action.type==='event/add'||action.type==='event/save'||action.type==='event/delete'){const {data,error}=await client.rpc('planner_event_command',{p_expected_revision:revision,p_command_id:id,p_action:plannerActionJson(action)});if(error)throw error;return data as number;}if(action.type==='recurrence'){const {data,error}=await client.rpc('planner_recurrence_command',{p_expected_revision:revision,p_command_id:id,p_action:plannerActionJson(action.change as unknown as PlannerAction)});if(error)throw error;if(data===null)throw Error('Recurrence change was not acknowledged');return data;}const {data,error}=await client.rpc('planner_command',{p_expected_revision:revision,p_command_id:id,p_action:plannerActionJson(action)});if(error)throw error;return data as number;}
