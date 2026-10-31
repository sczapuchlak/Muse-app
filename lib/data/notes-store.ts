import {notesReducer,type NotesAction,type NotesState} from '@/lib/notes';
import {emptyNotesState,type NotesSnapshot} from './notes';
export type NotesRepository={read:()=>Promise<NotesSnapshot>;write:(revision:number,id:string,state:NotesState)=>Promise<number>};
export type NotesView={state:NotesState;loaded:boolean;pending:boolean;saving:boolean;error:string;conflict:boolean;discarded:number};
/** Existing reducer, one owner revision, bounded atomic snapshots. No second editor store. */
export class NotesStore{
 private base:NotesSnapshot={revision:0,state:emptyNotesState()};private actions:NotesAction[]=[];private batch?:{id:string;revision:number;count:number;state:NotesState};private timer?:ReturnType<typeof setTimeout>;private running=false;private loading?:Promise<void>;private epoch=0;private listeners=new Set<()=>void>();private changed?:()=>void;
 private view:NotesView={state:emptyNotesState(),loaded:false,pending:false,saving:false,error:'',conflict:false,discarded:0};
 constructor(private repository:NotesRepository){}
 getSnapshot=()=>this.view;subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 setOnChange(listener:(()=>void)|undefined){this.changed=listener;}
 private publish(){this.view={...this.view,state:this.actions.reduce(notesReducer,this.base.state),pending:!!this.actions.length,saving:this.running||!!this.timer};for(const fn of this.listeners)fn();}
 async load(force=false){if(this.actions.length||this.loading||this.view.loaded&&!force)return this.loading;const epoch=this.epoch;this.loading=(async()=>{try{const data=await this.repository.read();if(epoch===this.epoch&&!this.actions.length){this.base=data;this.view={...this.view,loaded:true,error:''};}}catch{if(epoch===this.epoch)this.view={...this.view,error:'Notes could not load. Check your connection and retry.'};}finally{this.loading=undefined;this.publish();}})();return this.loading;}
 dispatch=(action:NotesAction)=>{if(!this.view.loaded||this.view.error||action.type==='note/commit')return;this.epoch++;
  const tail=this.actions.at(-1);if(action.type==='note/draft'&&tail?.type==='note/draft'&&tail.id===action.id&&(!this.batch||this.actions.length>this.batch.count))this.actions[this.actions.length-1]={...action,patch:{...tail.patch,...action.patch}};else this.actions.push(action);
  if(!this.running){clearTimeout(this.timer);this.timer=setTimeout(()=>{this.timer=undefined;void this.drain();},action.type==='note/draft'?500:25);}this.publish();};
 private async drain(){if(this.running||this.view.error||!this.actions.length)return;this.running=true;this.publish();try{while(this.actions.length){
   if(!this.batch){let state=this.actions.reduce(notesReducer,this.base.state);for(const [id,draft]of Object.entries(state.drafts))state=notesReducer(state,{type:'note/commit',id,revision:draft.revision});this.batch={id:crypto.randomUUID(),revision:this.base.revision,count:this.actions.length,state};}
   const batch=this.batch,written=await this.repository.write(batch.revision,batch.id,batch.state),confirmed=await this.repository.read();if(confirmed.revision!==written)throw {code:'40001'};
   this.base=confirmed;this.actions.splice(0,batch.count);this.batch=undefined;this.epoch++;this.publish();this.changed?.();
  }}catch(error){const conflict=(error as {code?:string}).code==='40001';this.view={...this.view,conflict,error:conflict?'Notes changed in another window. Your draft is kept. Review it, then discard to load the latest saved version.':(error as {code?:string}).code==='22023'?'Notes content could not be validated or exceeds supported limits. Your draft is kept; review or copy it before loading the saved version.':'Notes changes are not confirmed saved. Your draft is kept. Check your connection and retry.'};}finally{this.running=false;this.publish();}}
 retry(){if(this.view.conflict)return;this.view={...this.view,error:''};if(this.actions.length)void this.drain();else void this.load(true);this.publish();}
 async discard(){if(this.running)return;clearTimeout(this.timer);this.timer=undefined;this.actions=[];this.batch=undefined;this.epoch++;this.view={...this.view,error:'',conflict:false,loaded:false,discarded:this.view.discarded+1};this.publish();await this.load(true);}
 hasPending(){return !!this.actions.length;}
 flush(){clearTimeout(this.timer);this.timer=undefined;void this.drain();}
 draftText(){return JSON.stringify({notes:this.view.state.notes.map(n=>({...n,...this.view.state.drafts[n.id]})),tags:this.view.state.tags,links:this.view.state.links},null,2);}
}
