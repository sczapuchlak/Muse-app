import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';
import {plannerReducer,type PlannerAction,type PlannerState} from '@/lib/planner';
import {validTimeZone} from '@/lib/dates';
import {readPlanner,writePlanner,emptyPlannerState,type PlannerSnapshot} from './planner';
export type PlannerRepository={read:()=>Promise<PlannerSnapshot>;write:(revision:number,id:string,action:PlannerAction)=>Promise<number>};
export type PlannerView={state:PlannerState;loaded:boolean;pending:boolean;saving:boolean;refreshing:boolean;error:string;conflict:boolean;discarded:number;drafts:Record<string,string>;drafting:boolean;revision:number};
type Job={id:string;action:PlannerAction};
export class PlannerStore{
 private base:PlannerSnapshot={revision:0,state:emptyPlannerState()};private jobs:Job[]=[];private listeners=new Set<()=>void>();private running=false;private timer?:ReturnType<typeof setTimeout>;private loading?:Promise<void>;private epoch=0;private holds=new Set<string>();private changed?:()=>void;
 private view:PlannerView={state:emptyPlannerState(),loaded:false,pending:false,saving:false,refreshing:false,error:'',conflict:false,discarded:0,drafts:{},drafting:false,revision:0};
 constructor(private repository:PlannerRepository,public timeZone:string){}
 static forClient(client:SupabaseClient<Database>,zone:string){const store:PlannerStore=new PlannerStore({read:()=>readPlanner(client),write:(revision,id,action)=>writePlanner(client,revision,id,action,store.timeZone)},zone);return store;}
 setTimeZone(zone:string){if(this.timeZone!==zone){this.timeZone=zone;this.publish();}}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};getSnapshot=()=>this.view;
 setEditorDraft=(key:string,value:string|null)=>{const drafts={...this.view.drafts};if(value===null){delete drafts[key];this.holds.delete(key);}else{drafts[key]=value;this.holds.add(key);}this.view={...this.view,drafts};this.epoch++;this.publish();};
 setOnChange(listener:(()=>void)|undefined){this.changed=listener;}
 hold=(id:string,value:boolean)=>{if(value)this.holds.add(id);else this.holds.delete(id);};
 private publish(){let state=this.base.state;for(const job of this.jobs)state=plannerReducer(state,job.action);this.view={...this.view,revision:this.base.revision,state,pending:!!this.jobs.length,saving:this.running||!!this.timer,refreshing:!!this.loading,drafting:Object.keys(this.view.drafts).length>0};for(const listener of this.listeners)listener();}
 async load(force=false){if(this.jobs.length||this.holds.size||this.loading||this.view.loaded&&!force)return this.loading;if(!validTimeZone(this.timeZone)){this.view={...this.view,error:'Set a valid saved IANA timezone before planning.'};this.publish();return;}const epoch=this.epoch;
  this.loading=(async()=>{try{const snapshot=await this.repository.read();if(epoch===this.epoch&&!this.jobs.length&&!this.holds.size){this.base=snapshot;this.view={...this.view,loaded:true,error:''};}}catch{if(epoch===this.epoch&&!this.jobs.length)this.view={...this.view,error:'Planner could not load. Check your connection and retry.'};}finally{this.loading=undefined;this.publish();}})();this.publish();return this.loading;
 }
 dispatch=(action:PlannerAction)=>{if(!this.view.loaded||this.view.error)return;this.epoch++;const tail=this.jobs.at(-1);if(action.type==='task/update'&&tail?.action.type==='task/update'&&tail.action.id===action.id&&(!this.running||tail!==this.jobs[0]))tail.action={...tail.action,patch:{...tail.action.patch,...action.patch}};else this.jobs.push({id:crypto.randomUUID(),action});if(!this.running){clearTimeout(this.timer);this.timer=setTimeout(()=>{this.timer=undefined;void this.drain();},action.type==='task/update'?250:25);}this.publish();};
 private async drain(){if(this.running||this.view.error||!this.jobs.length)return;this.running=true;this.publish();try{while(this.jobs.length){const job=this.jobs[0];const written=await this.repository.write(this.base.revision,job.id,job.action);const snapshot=await this.repository.read();if(snapshot.revision!==written)throw {code:'40001'};this.epoch++;this.base=snapshot;this.jobs.shift();this.publish();this.changed?.();}}catch(error){const value=error as {code?:string;message?:string};const conflict=value.code==='40001';this.view={...this.view,conflict,error:conflict?'Planner changed in another window. Your unsaved changes are kept. Review them, then discard to load the latest saved version.':value.code==='22023'&&this.jobs[0]?.action.type==='priority/create'?'The priority could not be added. Your text is kept; load the latest day and check that fewer than three priorities are selected.':value.code==='23505'?'That name or item already exists. Your draft is kept; review it before reloading.':'Planner changes are not confirmed saved. Your draft is kept. Check your connection and retry.'};}finally{this.running=false;this.publish();}}
 retry(){if(this.view.conflict)return;this.view={...this.view,error:''};if(this.jobs.length)void this.drain();else void this.load(true);this.publish();}
 async discard(){if(this.running)return;clearTimeout(this.timer);this.timer=undefined;this.jobs=[];this.holds.clear();this.epoch++;this.view={...this.view,error:'',conflict:false,loaded:false,discarded:this.view.discarded+1,drafts:{}};this.publish();await this.load(true);if(this.view.loaded&&!this.view.error)this.changed?.();}
 hasPending(){return !!this.jobs.length||Object.keys(this.view.drafts).length>0;}
 draftText(){const edits=Object.entries(this.view.drafts).map(([key,value])=>`${key.startsWith('task-title/')?'Task title':'Subtask title'} draft: ${value}`).join('\n');return edits+'\n'+this.jobs.map(({action})=>{
  const task='id'in action?this.view.state.tasks.find(item=>item.id===action.id)??this.base.state.tasks.find(item=>item.id===action.id):undefined;
  if(action.type==='priority/create')return `New priority: ${action.title}\nDate: ${action.date}`;
  if(action.type==='priority/title')return `Priority title: ${action.title}`;
  if(action.type==='priority/complete')return `${action.complete?'Complete':'Reopen'} linked task: ${this.view.state.tasks.find(item=>item.id===action.taskId)?.title??'task'}`;
  if(action.type==='task/add')return `New task: ${action.task.title}\nPlanned: ${action.task.plannedDate??'Task List'}`;
  if(action.type==='task/update')return `Edit ${task?.title??'task'}:\n`+Object.entries(action.patch).map(([key,value])=>{if(key==='workspaceId')return 'Workspace: '+(this.view.state.workspaces.find(item=>item.id===value)?.name??'not set');if(key==='groupId')return 'Group: '+(this.view.state.groups.find(item=>item.id===value)?.name??'not set');if(key==='tagIds')return 'Tags: '+(value as string[]).map(id=>this.view.state.tags.find(item=>item.id===id)?.name).join(', ');if(key==='subtasks')return 'Subtasks: '+(value as {title:string;complete:boolean}[]).map(item=>(item.complete?'Complete: ':'')+item.title).join('; ');return `${key}: ${value===undefined?'not set':JSON.stringify(value)}`;}).join('\n');
  if(action.type==='task/move'||action.type==='task/place')return `Move ${task?.title??'task'} to ${action.date??'Task List'}`;
  if(action.type==='workspace/save')return 'Workspace: '+action.workspace.name;
  if(action.type==='group/save')return 'Group: '+action.group.name;
  if(action.type==='tag/save')return 'Tag: '+action.tag.name;
  if(action.type==='event/add')return `Event: ${action.event.title} · ${action.event.date}`;
  return `${action.type.replaceAll('/',' ')}: ${task?.title??'Planner item'}`;
 }).join('\n\n');}
 flush(){clearTimeout(this.timer);this.timer=undefined;void this.drain();}
}
