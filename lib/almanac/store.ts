/**
 * The Almanac's account state in the browser (#53): settings (auth user metadata, like Insights preferences) and the
 * impression history (owner-only `almanac_impressions`). Loaded once per page and shared by every surface on it.
 * If the table is not available yet, history falls back to this device so cooldowns still hold locally.
 */
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {shiftDate} from '@/lib/dates';
import {defaultAlmanacPreferences,type AlmanacPreferences,type Impression,type Pick,type Quietness} from './select';

const metadataKey='muse_almanac_preferences',localKey='muse.almanac.history',keepDays=180;
const quietness:Quietness[]=['quiet','balanced','chatty'];

export function parseAlmanacPreferences(value:unknown):AlmanacPreferences{
 const s=value&&typeof value==='object'?value as Record<string,unknown>:{};
 const bool=(k:keyof AlmanacPreferences)=>typeof s[k]==='boolean'?s[k] as boolean:defaultAlmanacPreferences[k] as boolean;
 return {enabled:bool('enabled'),sensitive:bool('sensitive'),crossModule:bool('crossModule'),
  quietness:quietness.includes(s.quietness as Quietness)?s.quietness as Quietness:defaultAlmanacPreferences.quietness,
  mutedFamilies:Array.isArray(s.mutedFamilies)?[...new Set(s.mutedFamilies.filter((f):f is string=>typeof f==='string'&&/^[a-z-]{2,40}$/.test(f)))]:[]};
}

export type AlmanacState={ready:boolean;userId:string;prefs:AlmanacPreferences;history:Impression[];remote:boolean;error:string};
let state:AlmanacState={ready:false,userId:'',prefs:defaultAlmanacPreferences,history:[],remote:false,error:''};
let client:SupabaseClient<Database>|null=null,loading:Promise<void>|null=null;
const listeners=new Set<()=>void>();
const emit=(next:Partial<AlmanacState>)=>{state={...state,...next};for(const l of listeners)l();};
export const almanacSnapshot=()=>state;
export function subscribeAlmanac(listener:()=>void){listeners.add(listener);void ensureLoaded();return ()=>{listeners.delete(listener);};}

const readLocal=():Impression[]=>{try{const v=JSON.parse(window.localStorage.getItem(localKey)??'[]');return Array.isArray(v)?v:[];}catch{return [];}};
const writeLocal=(rows:Impression[])=>{try{window.localStorage.setItem(localKey,JSON.stringify(rows.slice(-400)));}catch{/* memory only */}};
type Row={entry_id:string;version:number;variant_id:string;signal_key:string;surface:string;shown_on:string;dismissed_at:string|null};
const fromRow=(r:Row):Impression=>({entryId:r.entry_id,version:r.version,variantId:r.variant_id,signalKey:r.signal_key,surface:r.surface,shownOn:r.shown_on,dismissedAt:r.dismissed_at});

function ensureLoaded(){
 if(loading||typeof window==='undefined')return loading;
 loading=(async()=>{
  try{const c=client??=createMuseBrowserClient();const {data,error}=await c.auth.getUser();if(error||!data.user)throw error??Error('Signed out');
   const prefs=parseAlmanacPreferences(data.user.user_metadata?.[metadataKey]);
   const since=shiftDate(new Date().toISOString().slice(0,10),-keepDays);
   const rows=await c.from('almanac_impressions').select('entry_id,version,variant_id,signal_key,surface,shown_on,dismissed_at').gte('shown_on',since).order('shown_on',{ascending:true}).limit(2000);
   if(rows.error)emit({ready:true,userId:data.user.id,prefs,history:readLocal(),remote:false});
   else emit({ready:true,userId:data.user.id,prefs,history:(rows.data as Row[]).map(fromRow),remote:true});
  }catch(e){emit({ready:true,history:readLocal(),remote:false,error:e instanceof Error?e.message:'Unavailable'});}
 })();
 return loading;
}

/** Remember what a surface showed today. Idempotent per entry, surface and day. */
export async function recordPicks(picks:Pick[],surface:string,today:string){
 const fresh=picks.filter(p=>!state.history.some(h=>h.entryId===p.entry.id&&h.surface===surface&&h.shownOn===today));if(!fresh.length)return;
 const rows:Impression[]=fresh.map(p=>({entryId:p.entry.id,version:p.entry.version,variantId:p.variant.id,signalKey:p.signal.key,surface,shownOn:today,dismissedAt:null}));
 emit({history:[...state.history,...rows]});
 if(state.remote&&client){const {error}=await client.from('almanac_impressions').upsert(rows.map(r=>({entry_id:r.entryId,version:r.version,variant_id:r.variantId,signal_key:r.signalKey,surface:r.surface,shown_on:r.shownOn})),{onConflict:'user_id,entry_id,surface,shown_on',ignoreDuplicates:true});if(error)writeLocal(state.history);}
 else writeLocal(state.history);
}

/** "Don't show this again": the entry never returns (until history is cleared in Settings). */
export async function dismissPick(pick:Pick,surface:string,today:string){
 const at=new Date().toISOString(),row:Impression={entryId:pick.entry.id,version:pick.entry.version,variantId:pick.variant.id,signalKey:pick.signal.key,surface,shownOn:today,dismissedAt:at};
 emit({history:[...state.history.filter(h=>!(h.entryId===row.entryId&&h.surface===surface&&h.shownOn===today)),row]});
 if(state.remote&&client)await client.from('almanac_impressions').upsert({entry_id:row.entryId,version:row.version,variant_id:row.variantId,signal_key:row.signalKey,surface,shown_on:today,dismissed_at:at},{onConflict:'user_id,entry_id,surface,shown_on'});
 else writeLocal(state.history);
}

export async function saveAlmanacPreferences(next:AlmanacPreferences){
 const parsed=parseAlmanacPreferences(next),previous=state.prefs;emit({prefs:parsed});
 try{const c=client??=createMuseBrowserClient();const {error}=await c.auth.updateUser({data:{[metadataKey]:parsed}});if(error)throw error;return true;}
 catch{emit({prefs:previous});return false;}
}
export const muteFamily=(family:string)=>saveAlmanacPreferences({...state.prefs,mutedFamilies:[...new Set([...state.prefs.mutedFamilies,family])]});

/** Settings → "Start fresh": forget what Muse has shown and dismissed. Settings are kept. */
export async function clearAlmanacHistory(){
 emit({history:[]});writeLocal([]);
 if(state.remote&&client&&state.userId){const {error}=await client.from('almanac_impressions').delete().eq('user_id',state.userId);return !error;}
 return true;
}
/** For tests. */
export function resetAlmanacStore(next?:Partial<AlmanacState>){state={ready:false,userId:'',prefs:defaultAlmanacPreferences,history:[],remote:false,error:'',...next};loading=next?.ready?Promise.resolve():null;client=null;}
