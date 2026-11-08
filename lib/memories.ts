/**
 * Daily Memories (#105): one little moment per local calendar date, independent of Day Pulse, Mood notes and
 * Reflections. Structured and date-linked so Insights (and later Reflections) can read a date range.
 */
import type {createMuseBrowserClient} from '@/lib/supabase/client';
type Client=ReturnType<typeof createMuseBrowserClient>;
export const MEMORY_MAX=500;
export type DailyMemory={id:string;date:string;body:string;emoji:string|null;revision:number};
type Row={id:string;local_date:string;body:string;emoji:string|null;revision:number};
const fromRow=(r:Row):DailyMemory=>({id:r.id,date:r.local_date,body:r.body,emoji:r.emoji,revision:r.revision});
const columns='id,local_date,body,emoji,revision';
export const cleanBody=(v:string)=>v.trim().slice(0,MEMORY_MAX);
export const cleanEmoji=(v:string|null|undefined)=>v&&v.trim()?v.trim().slice(0,16):null;

export async function readMemories(client:Client,start:string,end:string):Promise<DailyMemory[]>{
 const {data,error}=await client.from('daily_memories').select(columns).gte('local_date',start).lte('local_date',end).order('local_date').limit(400);
 if(error)throw error;return (data as Row[]).map(fromRow);
}
/**
 * Save the day's one memory. A new memory inserts; if another tab already created one for that date (unique
 * user + date), this updates that record instead, so a day never gets two memories.
 */
export async function saveMemory(client:Client,date:string,body:string,emoji:string|null,existing?:DailyMemory|null):Promise<DailyMemory>{
 const text=cleanBody(body);if(!text)throw Error('Write a few words, or delete the memory.');
 const row={body:text,emoji:cleanEmoji(emoji)};
 if(existing){
  const r=await client.from('daily_memories').update(row).eq('id',existing.id).eq('revision',existing.revision).select(columns).maybeSingle();
  if(r.error)throw r.error;if(!r.data)throw Error('This memory changed on another device. Reload to see it.');return fromRow(r.data as Row);
 }
 const r=await client.from('daily_memories').insert({local_date:date,...row}).select(columns).single();
 if(!r.error)return fromRow(r.data as Row);
 if(r.error.code!=='23505')throw r.error;
 const current=await client.from('daily_memories').select(columns).eq('local_date',date).single();
 if(current.error)throw current.error;
 return saveMemory(client,date,body,emoji,fromRow(current.data as Row));
}
export async function deleteMemory(client:Client,id:string){const {error}=await client.from('daily_memories').delete().eq('id',id);if(error)throw error;}
