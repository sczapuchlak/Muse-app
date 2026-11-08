/**
 * Future Log (#104 §5): lightweight future plans by month. Entries are their own records — never events, tasks or
 * intentions — so adding one never schedules anything. A month-only entry has no day; a dated one stays inside its month.
 */
import type {createMuseBrowserClient} from '@/lib/supabase/client';
import type {AccentColor,CustomGradient} from './appearance-values';
import {markGradient,markIcons,type MarkIcon} from './muse-marks';
type Client=ReturnType<typeof createMuseBrowserClient>;
export type FutureEntry={id:string;month:string;date:string|null;title:string;note:string|null;icon:MarkIcon|null;color:AccentColor|null;gradient?:CustomGradient;done:boolean;position:number;revision:number};
type Row={id:string;month:string;local_date:string|null;title:string;note:string|null;icon:string|null;color:string|null;gradient:unknown;done:boolean;position:number;revision:number};
const columns='id,month,local_date,title,note,icon,color,gradient,done,position,revision';
export const FUTURE_TITLE_MAX=160,FUTURE_NOTE_MAX=500;
export const monthKey=(d:string)=>d.slice(0,7);
const fromRow=(r:Row):FutureEntry=>({id:r.id,month:r.month.slice(0,7),date:r.local_date,title:r.title,note:r.note,icon:markIcons.some(i=>i.id===r.icon)?r.icon as MarkIcon:null,color:(r.color as AccentColor|null)??null,gradient:markGradient(r.gradient),done:r.done,position:r.position,revision:r.revision});
/** Dated entries first by day, then month-only entries in the order they were added. */
export const sortEntries=(list:FutureEntry[])=>[...list].sort((a,b)=>(a.date??'9999').localeCompare(b.date??'9999')||a.position-b.position||a.title.localeCompare(b.title));
export function validEntry(e:Pick<FutureEntry,'month'|'date'|'title'>){
 if(!/^\d{4}-\d{2}$/.test(e.month))return 'Choose a month.';
 if(!e.title.trim())return 'Give it a few words.';
 if(e.date&&monthKey(e.date)!==e.month)return 'That day is outside this month.';
 return '';
}
export async function readFutureLog(client:Client,year:string):Promise<FutureEntry[]>{
 const {data,error}=await client.from('future_log_entries').select(columns).gte('month',`${year}-01-01`).lte('month',`${year}-12-01`).order('month').limit(2000);
 if(error)throw error;return (data as Row[]).map(fromRow);
}
export async function saveFutureEntry(client:Client,e:FutureEntry,isNew:boolean):Promise<FutureEntry>{
 const problem=validEntry(e);if(problem)throw Error(problem);
 const row={month:`${e.month}-01`,local_date:e.date,title:e.title.trim().slice(0,FUTURE_TITLE_MAX),note:e.note?.trim().slice(0,FUTURE_NOTE_MAX)||null,icon:e.icon,color:e.color,gradient:(e.gradient?{colors:e.gradient.colors.filter(Boolean) as string[],angle:e.gradient.angle}:null),done:e.done,position:e.position};
 const r=isNew?await client.from('future_log_entries').insert({id:e.id,...row}).select(columns).single()
  :await client.from('future_log_entries').update(row).eq('id',e.id).eq('revision',e.revision).select(columns).maybeSingle();
 if(r.error)throw r.error;if(!r.data)throw Error('This entry changed on another device. Reload to see it.');return fromRow(r.data as Row);
}
export async function deleteFutureEntry(client:Client,id:string){const {error}=await client.from('future_log_entries').delete().eq('id',id);if(error)throw error;}
