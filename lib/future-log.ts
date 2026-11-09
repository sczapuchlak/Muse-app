/**
 * Future Log (#104 §5): lightweight future plans by month. Entries are their own records — never events, tasks or
 * intentions — so adding one never schedules anything. A month-only entry has no day; a dated one stays inside its month.
 */
import type {createMuseBrowserClient} from '@/lib/supabase/client';
import type {AccentColor,CustomGradient} from './appearance-values';
import {markGradient,markIcons,type MarkIcon} from './muse-marks';
import {shiftDate} from './dates';
type Client=ReturnType<typeof createMuseBrowserClient>;
/** #112 A Future Log entry can reference a record that lives elsewhere; milestone ids are `<aspirationId>:<milestoneId>`. */
export const futureSourceKinds=['task','event','aspiration','milestone','bucket'] as const;
export type FutureSourceKind=typeof futureSourceKinds[number];
export type FutureSource={kind:FutureSourceKind;id:string};
export type FutureEntry={id:string;month:string;date:string|null;/** Last day of a multi-day entry (a trip); null for one day or month-only. */endDate?:string|null;title:string;note:string|null;icon:MarkIcon|null;color:AccentColor|null;gradient?:CustomGradient;done:boolean;position:number;revision:number;
 /** Set for a reference; `title` is then the name it had when added (shown only if the source is gone). */source?:FutureSource|null};
type Row={id:string;month:string;local_date:string|null;end_date?:string|null;title:string;note:string|null;icon:string|null;color:string|null;gradient:unknown;done:boolean;position:number;revision:number;source_kind?:string|null;source_id?:string|null};
const legacyColumns='id,month,local_date,end_date,title,note,icon,color,gradient,done,position,revision',columns=`${legacyColumns},source_kind,source_id`;
/** Before the #112 migration the source columns don't exist; read the entries without them (all standalone). */
const missingColumn=(e:unknown)=>(e as {code?:string})?.code==='42703'||(e as {code?:string})?.code==='PGRST204';
export const FUTURE_TITLE_MAX=160,FUTURE_NOTE_MAX=500;
export const monthKey=(d:string)=>d.slice(0,7);
const fromRow=(r:Row):FutureEntry=>({id:r.id,month:r.month.slice(0,7),date:r.local_date,endDate:r.end_date??null,title:r.title,note:r.note,icon:markIcons.some(i=>i.id===r.icon)?r.icon as MarkIcon:null,color:(r.color as AccentColor|null)??null,gradient:markGradient(r.gradient),done:r.done,position:r.position,revision:r.revision,source:r.source_kind&&r.source_id&&futureSourceKinds.includes(r.source_kind as FutureSourceKind)?{kind:r.source_kind as FutureSourceKind,id:r.source_id}:null});
/** Dated entries first by day, then month-only entries in the order they were added. */
export const sortEntries=(list:FutureEntry[])=>[...list].sort((a,b)=>(a.date??'9999').localeCompare(b.date??'9999')||a.position-b.position||a.title.localeCompare(b.title));
export function validEntry(e:Pick<FutureEntry,'month'|'date'|'title'|'endDate'>){
 if(!/^\d{4}-\d{2}$/.test(e.month))return 'Choose a month.';
 if(!e.title.trim())return 'Give it a few words.';
 if(e.date&&monthKey(e.date)!==e.month)return 'That day is outside this month.';
 if(e.endDate&&(!e.date||e.endDate<=e.date))return 'The last day comes after the first.';
 if(e.endDate&&e.date&&e.endDate>shiftDate(e.date,366))return 'Keep it within a year.';
 return '';
}
export async function readFutureLog(client:Client,year:string):Promise<FutureEntry[]>{
 const q=(cols:string)=>client.from('future_log_entries').select(cols).or(`month.gte.${year}-01-01,end_date.gte.${year}-01-01`).lte('month',`${year}-12-01`).order('month').limit(2000);
 let {data,error}=await q(columns);
 if(error&&missingColumn(error))({data,error}=await q(legacyColumns));
 if(error)throw error;return (data as unknown as Row[]).map(fromRow);
}
export async function saveFutureEntry(client:Client,e:FutureEntry,isNew:boolean):Promise<FutureEntry>{
 const problem=validEntry(e);if(problem)throw Error(problem);
 const row={month:`${e.month}-01`,local_date:e.date,end_date:e.date?e.endDate??null:null,title:e.title.trim().slice(0,FUTURE_TITLE_MAX),note:e.note?.trim().slice(0,FUTURE_NOTE_MAX)||null,icon:e.icon,color:e.color,gradient:(e.gradient?{colors:e.gradient.colors.filter(Boolean) as string[],angle:e.gradient.angle}:null),done:e.done,position:e.position};
 const cols=e.source?columns:legacyColumns,insert=e.source?{id:e.id,...row,done:false,source_kind:e.source.kind,source_id:e.source.id}:{id:e.id,...row};
 const r=isNew?await client.from('future_log_entries').insert(insert).select(cols).single()
  :await client.from('future_log_entries').update(e.source?{...row,done:false}:row).eq('id',e.id).eq('revision',e.revision).select(cols).maybeSingle();
 if(r.error){if((r.error as {code?:string}).code==='23505')throw Error('That’s already in your Future Log.');throw r.error;}if(!r.data)throw Error('This entry changed on another device. Reload to see it.');return fromRow(r.data as unknown as Row);
}
export async function deleteFutureEntry(client:Client,id:string){const {error}=await client.from('future_log_entries').delete().eq('id',id);if(error)throw error;}

/** Last day an entry covers (its own day when it isn't a range). */
export const entryEnd=(e:Pick<FutureEntry,'date'|'endDate'>)=>e.date&&e.endDate&&e.endDate>e.date?e.endDate:e.date;
/** Dated entries covering `day` (ranges included). Month-only entries have no day and never highlight one. */
export const entriesOn=(list:FutureEntry[],day:string)=>list.filter((e)=>!!e.date&&e.date<=day&&day<=entryEnd(e)!);

/* ---------- #112 References: explicit inclusion only, one per record, never a copy ---------- */
export const sourceKey=(s:FutureSource)=>`${s.kind}:${s.id}`;
export const futureSourceLabels:Record<FutureSourceKind,string>={task:'Planner task',event:'Planner event',aspiration:'Aspiration',milestone:'Milestone',bucket:'Bucket List'};
/** Every referenced record (kind + id); small, so the "Show in Future Log" toggles can share one read. */
/** `null` when the server predates references (#112), so the toggles stay hidden instead of failing. */
export async function readFutureReferences(client:Client):Promise<{key:string;entryId:string;year:string}[]|null>{
 const {data,error}=await client.from('future_log_entries').select('id,month,source_kind,source_id').not('source_kind','is',null).limit(2000);
 if(error){if(missingColumn(error))return null;throw error;}
 return (data??[]).map(r=>({key:`${r.source_kind}:${r.source_id}`,entryId:r.id,year:String(r.month).slice(0,4)}));
}
/** What a reference shows now, read from its source. `missing` when the record is gone or no longer readable. */
export type ResolvedSource={title:string;date:string|null;endDate:string|null;done:boolean;missing:boolean;aspirationId?:string};
export async function resolveFutureSources(client:Client,sources:FutureSource[]):Promise<Map<string,ResolvedSource>>{
 const out=new Map<string,ResolvedSource>(),ids=(k:FutureSourceKind)=>[...new Set(sources.filter(s=>s.kind===k).map(s=>s.id))];
 const uuid=(v:string)=>/^[0-9a-f-]{36}$/i.test(v);
 const tasks=ids('task').filter(uuid),events=ids('event').filter(uuid),bucket=ids('bucket').filter(uuid);
 const milestoneParents=[...new Set(ids('milestone').map(id=>id.split(':')[0]).filter(uuid))],aspirations=[...new Set([...ids('aspiration').filter(uuid),...milestoneParents])];
 const [t,e,a,b]=await Promise.all([
  tasks.length?client.from('tasks').select('id,title,planned_date,due_date,complete,deleted_at').in('id',tasks):null,
  events.length?client.from('planner_events').select('id,title,local_date,end_date').in('id',events):null,
  aspirations.length?client.from('aspirations').select('id,title,target_date,status,completed_on,milestones').in('id',aspirations):null,
  bucket.length?client.from('bucket_entries').select('id,title,status,completed_on,archived_at').in('id',bucket):null,
 ]);
 for(const r of t?.data??[])if(!r.deleted_at)out.set(`task:${r.id}`,{title:r.title,date:r.planned_date??r.due_date,endDate:null,done:r.complete,missing:false});
 for(const r of e?.data??[])out.set(`event:${r.id}`,{title:r.title,date:r.local_date,endDate:r.end_date,done:false,missing:false});
 for(const r of a?.data??[]){
  out.set(`aspiration:${r.id}`,{title:r.title,date:r.target_date,endDate:null,done:r.status==='completed',missing:false});
  for(const m of Array.isArray(r.milestones)?r.milestones as {id?:string;title?:string;targetDate?:string;completedOn?:string}[]:[])if(m?.id&&m.title)out.set(`milestone:${r.id}:${m.id}`,{title:m.title,date:m.targetDate??null,endDate:null,done:!!m.completedOn,missing:false,aspirationId:r.id});
 }
 for(const r of b?.data??[])out.set(`bucket:${r.id}`,{title:r.title,date:null,endDate:null,done:r.status==='completed',missing:false});
 return out;
}
/** A reference shows its source's current title and dates; when the source is gone, its snapshot title, marked missing. */
export function presentEntry(e:FutureEntry,resolved:Map<string,ResolvedSource>):FutureEntry&{missing?:boolean;sourceDone?:boolean}{
 if(!e.source)return e;
 const r=resolved.get(sourceKey(e.source));
 if(!r)return {...e,missing:true};
 const date=r.date&&monthKey(r.date)===e.month?r.date:e.date;
 return {...e,title:r.title,date,endDate:date===r.date?r.endDate:e.endDate,sourceDone:r.done};
}
