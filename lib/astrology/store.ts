import {emptyAstrology,type AstrologySnapshot} from './models';
export type AstrologyCommand={operation:string;record:Record<string,unknown>;expectedRevision:number;commandId:string};
export type AstrologyView={records:AstrologySnapshot;loaded:boolean;busy:boolean;error:string;pending:AstrologyCommand|null};
export class AstrologyStore{
 private view:AstrologyView={records:emptyAstrology(),loaded:false,busy:false,error:'',pending:null};private listeners=new Set<()=>void>();private reading?:Promise<void>;private activities=new Map<string,{kind:string;reference_id:string}>();private flushing=false;private activeActivity='';
 constructor(private api:{read:()=>Promise<AstrologySnapshot>;write:(command:AstrologyCommand)=>Promise<AstrologySnapshot>},private changed=()=>{}){}
 getSnapshot=()=>this.view;subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
 private publish(patch:Partial<AstrologyView>){this.view={...this.view,...patch};for(const fn of this.listeners)fn();}
 load(force=false){if(this.reading||this.view.busy||this.view.loaded&&!force)return this.reading??Promise.resolve();this.reading=(async()=>{try{this.publish({records:await this.api.read(),loaded:true,error:this.view.pending?this.view.error:''});}catch{this.publish({error:'Private Observatory records could not load. Your existing records and unfinished changes are kept.'});}finally{this.reading=undefined;}})();return this.reading;}
 noteActivity(kind:'library-viewed'|'chart-explored',reference_id:string,date:string){const key=`${kind}/${reference_id}/${date}`;if(key===this.activeActivity)return;this.activities.set(key,{kind,reference_id});void this.flushActivities();}
 private async flushActivities(){if(this.flushing||this.view.busy||this.view.pending||!this.view.loaded)return;this.flushing=true;try{while(this.activities.size&&!this.view.busy&&!this.view.pending){const [key,record]=this.activities.entries().next().value!;this.activities.delete(key);this.activeActivity=key;if(!await this.execute('activity',record))break;}}finally{this.activeActivity='';this.flushing=false;}}
 async execute(operation:string,record:Record<string,unknown>,expectedRevision=0){
  if(this.reading)await this.reading;
  if(!this.view.loaded)throw Error('Load your private Observatory before saving.');
  if(this.view.busy)throw Error('Wait for the current Observatory save.');
  const prior=this.view.pending;if(prior&&(prior.operation!==operation||prior.expectedRevision!==expectedRevision||JSON.stringify(prior.record)!==JSON.stringify(record)))throw Error('Retry the unconfirmed save or load the latest record before starting another change.');
  const command=prior??{operation,record:structuredClone(record),expectedRevision,commandId:crypto.randomUUID()};this.publish({busy:true,pending:command,error:''});
  try{const records=await this.api.write(command);this.publish({records,loaded:true,pending:null});this.changed();return true;}catch(error){this.publish({error:error instanceof Error?error.message:'The Observatory save is unconfirmed. Keep your draft and retry.'});return false;}finally{this.publish({busy:false});if(!this.flushing)void this.flushActivities();}
 }
 retry(){const command=this.view.pending;return command?this.execute(command.operation,command.record,command.expectedRevision):this.load(true);}
 async reload(){if(this.view.busy)return;this.publish({pending:null,error:''});await this.load(true);void this.flushActivities();}
}
async function apiResponse(response:Response){const payload=await response.json();if(!response.ok||!payload.snapshot)throw Error(payload.error??'Your private Observatory is unavailable.');return payload.snapshot as AstrologySnapshot;}
export function createAstrologyStore(changed:()=>void){return new AstrologyStore({read:async()=>apiResponse(await fetch('/api/astrology/records',{cache:'no-store',credentials:'same-origin'})),write:async command=>apiResponse(await fetch('/api/astrology/records',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command),credentials:'same-origin',cache:'no-store'}))},changed);}
