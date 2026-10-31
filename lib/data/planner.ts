import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from '@/lib/database.types';
import type {PlannerAction,PlannerState,TaskCompletion} from '@/lib/planner';
import type {PlannedTask} from '@/lib/models';
import {validAccent} from '@/lib/appearance-values';
import {validDate,validTimeZone} from '@/lib/dates';
type Tables=Database['public']['Tables'];
type Row<K extends keyof Tables>=Tables[K]['Row'];
export type PlannerSnapshot={revision:number;state:PlannerState};
type Raw={revision:number;workspaces:Row<'workspaces'>[];groups:Row<'task_groups'>[];tags:Row<'task_tags'>[];tasks:Row<'tasks'>[];subtasks:Row<'task_subtasks'>[];tagLinks:Row<'task_tag_links'>[];timeSessions:Row<'task_time_sessions'>[];completionHistory:Row<'task_completion_events'>[];events:Row<'planner_events'>[]};
export const emptyPlannerState=():PlannerState=>({tasks:[],events:[],workspaces:[],groups:[],tags:[],activeTimer:null,completionHistory:[]});
export function plannerProjection(raw:Raw):PlannerSnapshot{
 if(!Number.isSafeInteger(raw.revision)||raw.revision<0||!['workspaces','groups','tags','tasks','subtasks','tagLinks','timeSessions','completionHistory','events'].every(key=>Array.isArray(raw[key as keyof Raw])))throw Error('Invalid Planner response');
 const active=raw.timeSessions.find(item=>item.ended_at===null);
 const tasks:PlannedTask[]=raw.tasks.map(item=>({id:item.id,kind:'task',title:item.title,workspaceId:item.workspace_id,groupId:item.group_id??undefined,plannedDate:item.planned_date??undefined,dueDate:item.due_date??undefined,timeSlot:item.local_time_slot?.slice(0,5),estimatedMinutes:item.estimated_minutes??undefined,actualMinutes:item.actual_minutes_baseline+raw.timeSessions.filter(time=>time.task_id===item.id&&time.ended_at).reduce((sum,time)=>sum+Math.max(0,Date.parse(time.ended_at!)-Date.parse(time.started_at))/60000,0),complete:item.complete,completedAt:item.completed_at??undefined,notes:item.notes??undefined,detail:item.detail??undefined,tagIds:raw.tagLinks.filter(link=>link.task_id===item.id).map(link=>link.tag_id),subtasks:raw.subtasks.filter(subtask=>subtask.task_id===item.id).sort((a,b)=>a.position-b.position).map(subtask=>({id:subtask.id,title:subtask.title,complete:subtask.complete})),recurrence:item.recurrence_frequency?{frequency:item.recurrence_frequency as 'daily'|'weekly'|'monthly',interval:item.recurrence_interval!,until:item.recurrence_until??undefined}:undefined,createdAt:item.created_at}));
 const organization=<T extends {accent:string|null;icon_id:string|null}>(item:T)=>({accent:validAccent(item.accent??'')?item.accent as import('@/lib/appearance-values').AccentColor:'primary' as const,icon:(item.icon_id??undefined) as import('@/components/MuseIcon').MuseIconName|undefined});
 const completionHistory:TaskCompletion[]=raw.completionHistory.map(item=>({id:item.id,taskId:item.task_id,complete:item.complete,occurredAt:item.occurred_at,localDate:item.local_date,timeZone:item.time_zone,title:item.title,workspaceId:item.workspace_id,plannedDate:item.planned_date??undefined}));
 return {revision:raw.revision,state:{tasks,workspaces:raw.workspaces.map(item=>({id:item.id,name:item.name,...organization(item)})),groups:raw.groups.map(item=>({id:item.id,name:item.name,workspaceId:item.workspace_id,...organization(item),accent:item.accent&&validAccent(item.accent)?item.accent:undefined})),tags:raw.tags.map(item=>({id:item.id,name:item.name,...organization(item)})),events:raw.events.map(item=>{const [h,m]=item.local_time.split(':');return {id:item.id,kind:'event' as const,title:item.title,date:item.local_date,dateTime:`${item.local_date}T${item.local_time.slice(0,5)}`,time:`${Number(h)%12||12}:${m} ${Number(h)>=12?'PM':'AM'}`,detail:item.detail??undefined};}),activeTimer:active?{taskId:active.task_id,startedAt:active.started_at}:null,completionHistory}};
}
export async function readPlanner(client:SupabaseClient<Database>):Promise<PlannerSnapshot>{const {data,error}=await client.rpc('read_planner');if(error)throw error;return plannerProjection(data as unknown as Raw);}
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
}
export async function writePlanner(client:SupabaseClient<Database>,revision:number,id:string,action:PlannerAction,timeZone:string){validatePlannerAction(action,timeZone);if(action.type==='priority/create'){const {data,error}=await client.rpc('create_priority_task',{p_date:action.date,p_id:action.id,p_text:action.title,p_expected_planner_revision:revision,p_command_id:id});if(error)throw error;return data as number;}if(action.type==='priority/title'){const {data,error}=await client.rpc('rename_priority_task',{p_id:action.id,p_priority_revision:action.priorityRevision,p_expected_planner_revision:revision,p_title:action.title,p_command_id:id});if(error)throw error;return data as number;}if(action.type==='priority/complete'){const {data,error}=await client.rpc('complete_linked_priority',{p_id:action.id,p_priority_revision:action.priorityRevision,p_expected_planner_revision:revision,p_complete:action.complete,p_command_id:id});if(error)throw error;return data as number;}const {data,error}=await client.rpc('planner_command',{p_expected_revision:revision,p_command_id:id,p_action:plannerActionJson(action)});if(error)throw error;return data as number;}
