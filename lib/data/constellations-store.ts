import {boardReducer,type BoardAction,type BoardState} from '@/lib/constellation-board';
import {emptyBoard} from '@/lib/constellation-board';
export type BoardSnapshot={revision:number;state:BoardState};
export type BoardRepository={read:()=>Promise<BoardSnapshot>;write:(revision:number,id:string,state:BoardState)=>Promise<number>};
export type BoardView={state:BoardState;loaded:boolean;pending:boolean;saving:boolean;error:string;conflict:boolean;discarded:number};
/** Existing reducer, one owner revision, bounded atomic snapshots. No second editor store. */
export class ConstellationsStore{
 private base:BoardSnapshot={revision:0,state:emptyBoard()};private actions:BoardAction[]=[];private batch?:{id:string;revision:number;count:number;state:BoardState};private timer?:ReturnType<typeof setTimeout>;private running=false;private loading?:Promise<void>;private epoch=0;private listeners=new Set<()=>void>();private changed?:()=>void;
 private view:BoardView={state:emptyBoard(),loaded:false,pending:false,saving:false,error:'',conflict:false,discarded:0};
 constructor(private repository:BoardRepository){}
 getSnapshot=()=>this.view;subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 setOnChange(listener:(()=>void)|undefined){this.changed=listener;}
 private publish(){this.view={...this.view,state:this.actions.reduce(boardReducer,this.base.state),pending:!!this.actions.length,saving:this.running||!!this.timer};for(const fn of this.listeners)fn();}
 async load(force=false){if(this.actions.length||this.loading||this.view.loaded&&!force)return this.loading;const epoch=this.epoch;this.loading=(async()=>{try{const data=await this.repository.read();if(epoch===this.epoch&&!this.actions.length){this.base=data;this.view={...this.view,loaded:true,error:''};}}catch{if(epoch===this.epoch)this.view={...this.view,error:'Constellations could not load. Check your connection and retry.'};}finally{this.loading=undefined;this.publish();}})();return this.loading;}
 dispatch=(action:BoardAction)=>{if(!this.view.loaded||this.view.error)return;this.epoch++;
  const tail=this.actions.at(-1);if(action.type==='card/update'&&tail?.type==='card/update'&&tail.id===action.id&&(!this.batch||this.actions.length>this.batch.count))this.actions[this.actions.length-1]={...action,patch:{...tail.patch,...action.patch}};else this.actions.push(action);
  if(!this.running){clearTimeout(this.timer);this.timer=setTimeout(()=>{this.timer=undefined;void this.drain();},action.type==='card/update'?500:25);}this.publish();};
 private async drain(){if(this.running||this.view.error||!this.actions.length)return;this.running=true;this.publish();try{while(this.actions.length){
   if(!this.batch){const state=this.actions.reduce(boardReducer,this.base.state);this.batch={id:crypto.randomUUID(),revision:this.base.revision,count:this.actions.length,state};}
   const batch=this.batch,written=await this.repository.write(batch.revision,batch.id,batch.state),confirmed=await this.repository.read();if(confirmed.revision!==written)throw {code:'40001'};
   this.base=confirmed;this.actions.splice(0,batch.count);this.batch=undefined;this.epoch++;this.publish();this.changed?.();
  }}catch(error){const conflict=(error as {code?:string}).code==='40001';this.view={...this.view,conflict,error:conflict?'Constellations changed in another window. Your draft is kept. Review it, then discard to load the latest saved version.':(error as {code?:string}).code==='22023'?'Constellations content could not be validated or exceeds supported limits. Your draft is kept; review or copy it before loading the saved version.':'Constellations changes are not confirmed saved. Your draft is kept. Check your connection and retry.'};}finally{this.running=false;this.publish();}}
 retry(){if(this.view.conflict)return;this.view={...this.view,error:''};if(this.actions.length)void this.drain();else void this.load(true);this.publish();}
 async discard(){if(this.running)return;clearTimeout(this.timer);this.timer=undefined;this.actions=[];this.batch=undefined;this.epoch++;this.view={...this.view,error:'',conflict:false,loaded:false,discarded:this.view.discarded+1};this.publish();await this.load(true);}
 whenSaved():Promise<void>{return new Promise((resolve,reject)=>{let unsubscribe=()=>{};const check=()=>{if(this.view.error){unsubscribe();reject(Error(this.view.error));}else if(this.view.loaded&&!this.view.pending&&!this.view.saving){unsubscribe();resolve();}};unsubscribe=this.subscribe(check);check();});}
 hasPending(){return !!this.actions.length;}
 flush(){clearTimeout(this.timer);this.timer=undefined;void this.drain();}
 draftText(){return JSON.stringify(this.view.state,null,2);}
}
