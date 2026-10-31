import {ritualReducer,type RitualAction,type RitualState} from '@/lib/rituals';
import {emptyRituals} from './rituals';
import type {RitualsSnapshot} from './rituals';
export type RitualsRepository={read:()=>Promise<RitualsSnapshot>;write:(revision:number,id:string,state:RitualState,action?:Extract<RitualAction,{type:'ritual/lifecycle'}>)=>Promise<number>};
export type RitualsView={state:RitualState;loaded:boolean;pending:boolean;saving:boolean;error:string;conflict:boolean;discarded:number};
/** Existing reducer, one owner revision, bounded atomic snapshots. No second domain owner. */
export class RitualsStore{
 private sequence=0;private confirmedSequence=0;private callbacks:{sequence:number;fn:()=>void}[]=[];
 private base:RitualsSnapshot={revision:0,state:emptyRituals()};private actions:RitualAction[]=[];private batch?:{id:string;revision:number;count:number;state:RitualState;action?:Extract<RitualAction,{type:'ritual/lifecycle'}>};private timer?:ReturnType<typeof setTimeout>;private running=false;private loading?:Promise<void>;private epoch=0;private listeners=new Set<()=>void>();private changed?:()=>void;
 private view:RitualsView={state:emptyRituals(),loaded:false,pending:false,saving:false,error:'',conflict:false,discarded:0};
 constructor(private repository:RitualsRepository){}
 getSnapshot=()=>this.view;subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 setOnChange(listener:(()=>void)|undefined){this.changed=listener;}
 private publish(){this.view={...this.view,state:this.actions.reduce(ritualReducer,this.base.state),pending:!!this.actions.length,saving:this.running||!!this.timer};for(const fn of this.listeners)fn();}
 async load(force=false){if(this.actions.length||this.loading||this.view.loaded&&!force)return this.loading;const epoch=this.epoch;this.loading=(async()=>{try{const data=await this.repository.read();if(epoch===this.epoch&&!this.actions.length){data.state.celebratedMilestones=[...this.view.state.celebratedMilestones];this.base=data;this.view={...this.view,loaded:true,error:''};}}catch{if(epoch===this.epoch)this.view={...this.view,error:'Rituals could not load. Check your connection and retry.'};}finally{this.loading=undefined;this.publish();}})();return this.loading;}
 dispatch=(action:RitualAction)=>{if(!this.view.loaded||this.view.error)return;this.epoch++;this.sequence++;this.actions.push(action);if(!this.running){clearTimeout(this.timer);this.timer=setTimeout(()=>{this.timer=undefined;void this.drain();},25);}this.publish();};
 private async drain(){if(this.running||this.view.error||!this.actions.length)return;this.running=true;this.publish();try{while(this.actions.length){
   if(!this.batch){const first=this.actions[0],boundary=this.actions.findIndex(a=>a.type==='ritual/lifecycle'),count=boundary===0?1:boundary<0?this.actions.length:boundary;const state=this.actions.slice(0,count).reduce(ritualReducer,this.base.state);this.batch={id:crypto.randomUUID(),revision:this.base.revision,count,state,action:first.type==='ritual/lifecycle'?first:undefined};}
   const batch=this.batch,written=await this.repository.write(batch.revision,batch.id,batch.state,batch.action),confirmed=await this.repository.read();if(confirmed.revision!==written)throw {code:'40001'};
   confirmed.state.celebratedMilestones=[...new Set([...this.view.state.celebratedMilestones,...confirmed.state.celebratedMilestones])];this.base=confirmed;this.actions.splice(0,batch.count);this.confirmedSequence+=batch.count;this.batch=undefined;this.epoch++;this.publish();this.changed?.();const ready=this.callbacks.filter(c=>c.sequence<=this.confirmedSequence);this.callbacks=this.callbacks.filter(c=>c.sequence>this.confirmedSequence);for(const callback of ready){try{callback.fn();}catch{ /* Feedback cannot change confirmed persistence. */ }}
  }}catch(error){const conflict=(error as {code?:string}).code==='40001';this.view={...this.view,conflict,error:conflict?'Rituals changed in another window. Your draft is kept. Review it, then discard to load the latest saved version.':(error as {code?:string}).code==='22023'?'Rituals content could not be validated or exceeds supported limits. Your draft is kept; review or copy it before loading the saved version.':'Rituals changes are not confirmed saved. Your draft is kept. Check your connection and retry.'};}finally{this.running=false;this.publish();}}
 retry(){if(this.view.conflict)return;this.view={...this.view,error:''};if(this.actions.length)void this.drain();else void this.load(true);this.publish();}
 async discard(){if(this.running)return;clearTimeout(this.timer);this.timer=undefined;this.actions=[];this.callbacks=[];this.confirmedSequence=this.sequence;this.batch=undefined;this.epoch++;this.view={...this.view,error:'',conflict:false,loaded:false,discarded:this.view.discarded+1};this.publish();await this.load(true);}
 whenSaved(fn:()=>void){if(this.actions.length)this.callbacks.push({sequence:this.sequence,fn});}
 hasPending(){return !!this.actions.length;}
 flush(){clearTimeout(this.timer);this.timer=undefined;void this.drain();}
 draftText(){return JSON.stringify({state:this.view.state,pendingActions:this.actions},null,2);}
}
