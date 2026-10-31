import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';
import {readDay,readDays,emptyDay,ensureDailyRecord,saveDailyRecord,savePriorities,saveMoodCheckin,deleteMoodCheckin,type DayData,type DailyPatch,type PriorityInput} from './daily';
import {defaultMoodPeriod,type MoodPeriod,type MoodPatch,type EmotionalCheckIn} from '@/lib/mood';
export type DailyProfile={id:string;firstName:string;timeZone:string};
type Job={kind:'daily';patch:DailyPatch}|{kind:'priorities';items:PriorityInput[];plannerRevision?:number;commandId?:string}|{kind:MoodPeriod;patch:MoodPatch}|{kind:'delete';id:string};
type Lane={discarded:number;epoch:number;base:DayData;jobs:Job[];running:boolean;loaded:boolean;error:string;conflict:boolean;timer?:ReturnType<typeof setTimeout>;loading?:Promise<void>};
export type DayStatus={discarded:number;refreshing:boolean;loaded:boolean;saving:boolean;error:string;conflict:boolean;pending:boolean};
export type DailySnapshot={days:Record<string,DayData>;statuses:Record<string,DayStatus>;influences:{id:string;name:string;archived?:boolean}[];rangeErrors:Record<string,string>;ranges:Record<string,boolean>};
export function describeDailyError(error:unknown):string{
 const value=error as {code?:string;message?:string};
 if(value?.code==='40001')return 'This day changed in another window. Your draft is kept. Discard it to load the latest saved version before editing again.';
 if(value?.code==='23505')return 'This item already exists or changed elsewhere. Your draft is kept; reload the saved version to continue.';
 return 'Could not save or load your daily data. Check your connection and try again. Your unsaved draft is kept in this tab.';
}
export function emotionalRecords(days:Record<string,DayData>):EmotionalCheckIn[]{
 return Object.entries(days).flatMap(([date,day])=>day.checkins.map(item=>({id:item.id,date,period:item.period as MoodPeriod,emotionIds:item.checkin_emotions.map(row=>row.emotion_id),causeTagIds:[...item.checkin_influences].sort((a,b)=>a.position-b.position).map(row=>row.influence_id),reflection:item.reflection??'',createdAt:item.created_at,updatedAt:item.updated_at,timeZone:item.captured_time_zone,energy:null,stress:null,overallDay:null})));
}
/** A single user-scoped cache. Draft commands serialize per date; RLS and revisions remain authoritative. */
export class DailyStore {
 private lanes=new Map<string,Lane>();private listeners=new Set<()=>void>();private periods=new Map<string,MoodPeriod>();private rangeRequests=new Map<string,Promise<void>>();
 private snapshot:DailySnapshot={days:{},statuses:{},influences:[],rangeErrors:{},ranges:{}};
 constructor(readonly client:SupabaseClient<Database>,readonly profile:DailyProfile){}
 getSnapshot=()=>this.snapshot;
 period(date:string){let value=this.periods.get(date);if(!value){value=defaultMoodPeriod(new Date(),this.profile.timeZone);this.periods.set(date,value);}return value;}
 setOnChange(listener:((date:string)=>void)|undefined){this.changed=listener;}
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
 private lane(date:string){let lane=this.lanes.get(date);if(!lane){lane={discarded:0,epoch:0,base:emptyDay(),jobs:[],running:false,loaded:false,error:'',conflict:false};this.lanes.set(date,lane);}return lane;}
 private apply(date:string,base:DayData,job:Job):DayData{
  const record=base.record??{id:'',user_id:this.profile.id,local_date:date,time_zone:this.profile.timeZone,intention_text:null,intention_emoji:null,day_in_three:[],energy:null,stress:null,overall_day:null,revision:0,created_at:'',updated_at:''};
  if(job.kind==='daily')return {...base,record:{...record,...job.patch}};
  if(job.kind==='priorities')return {...base,record,priorities:job.items.map((item,position)=>({...base.priorities.find(row=>row.id===item.id),id:item.id,user_id:this.profile.id,daily_record_id:record.id,text:item.text,position,...(item.taskId!==undefined&&item.taskId!==(base.priorities.find(row=>row.id===item.id)?.task_id??null)?{current_complete:null,historical_complete:null,display_complete:null}:{}),task_id:item.taskId===undefined?(base.priorities.find(row=>row.id===item.id)?.task_id??null):item.taskId,completion_origin:item.taskId?'linked':base.priorities.find(row=>row.id===item.id)?.completion_origin??'standalone',linked_at:base.priorities.find(row=>row.id===item.id)?.linked_at??null,materialized_task_id:base.priorities.find(row=>row.id===item.id)?.materialized_task_id??null,materialized_at:base.priorities.find(row=>row.id===item.id)?.materialized_at??null,standalone_complete:item.complete,completed_at:item.complete?'draft':null,created_at:base.priorities.find(row=>row.id===item.id)?.created_at??'',updated_at:'',revision:base.priorities.find(row=>row.id===item.id)?.revision??0}))};
  if(job.kind==='delete')return {...base,checkins:base.checkins.filter(item=>item.id!==job.id)};
  const previous=base.checkins.find(item=>item.period===job.kind),patch=job.patch;
  const item={id:previous?.id??`draft-${date}-${job.kind}`,user_id:this.profile.id,daily_record_id:record.id,period:job.kind,captured_time_zone:previous?.captured_time_zone??this.profile.timeZone,created_at:previous?.created_at??'',updated_at:previous?.updated_at??'',revision:previous?.revision??0,reflection:patch.reflection??previous?.reflection??null,checkin_emotions:patch.emotionIds?.map(emotion_id=>({emotion_id}))??previous?.checkin_emotions??[],checkin_influences:patch.causeTagIds?.map((influence_id,position)=>({influence_id,position}))??previous?.checkin_influences??[]};
  return {...base,record,checkins:[...base.checkins.filter(row=>row.period!==job.kind),...(item.reflection?.trim()||item.checkin_emotions.length||item.checkin_influences.length?[item]:[])]};
 }
 private publish(){const days:Record<string,DayData>={},statuses:Record<string,DayStatus>={};for(const [date,lane]of this.lanes){days[date]=lane.jobs.reduce((data,job)=>this.apply(date,data,job),lane.base);statuses[date]={discarded:lane.discarded,refreshing:!!lane.loading,loaded:lane.loaded,saving:lane.running||!!lane.timer,error:lane.error,conflict:lane.conflict,pending:!!lane.jobs.length};}this.snapshot={...this.snapshot,days,statuses};for(const listener of this.listeners)listener();}
 async load(date:string,force=false){const lane=this.lane(date);if(lane.jobs.length)return;if(lane.loading)return lane.loading;if(lane.loaded&&!force)return;
  const epoch=lane.epoch;lane.loading=(async()=>{try{const data=await readDay(this.client,date);if(!lane.jobs.length&&lane.epoch===epoch){lane.base=data;lane.loaded=true;lane.error='';}}catch(error){lane.error=describeDailyError(error);}finally{lane.loading=undefined;this.publish();}})();this.publish();return lane.loading;
 }
 async loadRange(start:string,end:string,force=false){const key=`${start}/${end}`;if(this.rangeRequests.has(key))return this.rangeRequests.get(key);if(this.snapshot.ranges[key]&&!force)return;
  const epochs=new Map([...this.lanes].map(([date,lane])=>[date,lane.epoch]));
  const request=(async()=>{try{const days=await readDays(this.client,start,end);for(const [date,lane]of this.lanes)if(date>=start&&date<=end&&!lane.jobs.length&&lane.epoch===(epochs.get(date)??0)){lane.base=days[date]??emptyDay();lane.loaded=true;lane.error='';}for(const [date,data]of Object.entries(days)){const lane=this.lane(date);if(!lane.jobs.length&&lane.epoch===(epochs.get(date)??0)){lane.base=data;lane.loaded=true;lane.error='';}}this.snapshot={...this.snapshot,ranges:{...this.snapshot.ranges,[key]:true},rangeErrors:{...this.snapshot.rangeErrors,[key]:''}};}catch(error){this.snapshot={...this.snapshot,rangeErrors:{...this.snapshot.rangeErrors,[key]:describeDailyError(error)}};}finally{this.rangeRequests.delete(key);this.publish();}})();this.rangeRequests.set(key,request);return request;
 }
 async loadInfluences(){try{const {data,error}=await this.client.from('influence_tags').select('id,label,archived_at').order('label');if(error)throw error;this.snapshot={...this.snapshot,influences:data.map(item=>({id:item.id,name:item.label,archived:!!item.archived_at})),rangeErrors:{...this.snapshot.rangeErrors,influences:''}};}catch(error){this.snapshot={...this.snapshot,rangeErrors:{...this.snapshot.rangeErrors,influences:describeDailyError(error)}};}this.publish();}
 async createInfluence(name:string){const label=name.trim();if(!label||label.length>50)throw Error('Use an influence name of up to 50 characters.');const {data,error}=await this.client.from('influence_tags').insert({label}).select('id,label').single();if(error){await this.loadInfluences();const existing=this.snapshot.influences.find(item=>!item.archived&&item.name.toLowerCase()===label.toLowerCase());if(existing)return existing.id;throw error;}this.snapshot={...this.snapshot,influences:[...this.snapshot.influences,{id:data.id,name:data.label}]};this.publish();return data.id;}
 edit(date:string,job:Job){const lane=this.lane(date);if(!lane.loaded||lane.error)return;lane.epoch++;if(job.kind==='priorities')job.commandId??=crypto.randomUUID();const tail=lane.jobs.at(-1);if(tail&&tail!==lane.jobs[0]&&tail.kind==='daily'&&job.kind==='daily')tail.patch={...tail.patch,...job.patch};else if(tail&&!lane.running&&tail.kind==='daily'&&job.kind==='daily')tail.patch={...tail.patch,...job.patch};else lane.jobs.push(job);
  if(!lane.running){clearTimeout(lane.timer);lane.timer=setTimeout(()=>{lane.timer=undefined;void this.drain(date);},job.kind==='daily'?350:50);}this.publish();
 }
 private async drain(date:string){const lane=this.lane(date);if(lane.running||lane.error||!lane.jobs.length)return;lane.running=true;this.publish();
  try{while(lane.jobs.length){const job=lane.jobs[0],base=lane.base;let confirmed:DayData|undefined;
    if(job.kind==='daily'){let record=base.record;if(!record){record=await ensureDailyRecord(this.client,date);if(record.revision!==1)throw {code:'40001'};}await saveDailyRecord(this.client,record,job.patch);}
    else if(job.kind==='priorities'){const ack=await savePriorities(this.client,date,job.items,base.priorities,{commandId:job.commandId,plannerRevision:job.plannerRevision});const current=await readDay(this.client,date);confirmed=current;if(JSON.stringify(ack.map(row=>[row.id,row.revision]).sort())!==JSON.stringify(current.priorities.map(row=>[row.id,row.revision]).sort()))throw {code:'40001'};}
    else if(job.kind==='delete'){const record=base.checkins.find(item=>item.id===job.id);if(record)await deleteMoodCheckin(this.client,record);else throw {code:'40001'};}
    else {const desired=this.apply(date,base,job).checkins.find(item=>item.period===job.kind),existing=base.checkins.find(item=>item.period===job.kind);await saveMoodCheckin(this.client,{date,period:job.kind,reflection:desired?.reflection??null,emotionIds:desired?.checkin_emotions.map(row=>row.emotion_id)??[],influenceIds:desired?.checkin_influences.map(row=>row.influence_id)??[],revision:existing?.revision??null});}
    // Keep the command until its authoritative projection is read back. An uncertain response is never "saved".
    const saved=confirmed??await readDay(this.client,date);lane.epoch++;lane.base=saved;lane.jobs.shift();this.publish();this.changed?.(date);
  }}catch(error){lane.error=describeDailyError(error);lane.conflict=(error as {code?:string})?.code==='40001';}finally{lane.running=false;this.publish();}
 }
 changed?:(date:string)=>void;
 retry(date:string){const lane=this.lane(date);if(lane.conflict)return;lane.error='';if(lane.jobs.length)void this.drain(date);else void this.load(date,true);this.publish();}
 async discard(date:string){const lane=this.lane(date);if(lane.running)return;clearTimeout(lane.timer);lane.timer=undefined;lane.epoch++;lane.discarded++;lane.jobs=[];lane.error='';lane.conflict=false;lane.loaded=false;this.publish();await this.load(date,true);}
 refresh(){for(const [date,lane]of this.lanes)if(!lane.jobs.length)void this.load(date,true);void this.loadInfluences();for(const key of Object.keys(this.snapshot.ranges)){const [start,end]=key.split('/');void this.loadRange(start,end,true);}}
 hasPending(){return [...this.lanes.values()].some(lane=>lane.jobs.length>0);}
 pause(){for(const [date,lane]of this.lanes)if(lane.timer){clearTimeout(lane.timer);lane.timer=undefined;void this.drain(date);}}
}
