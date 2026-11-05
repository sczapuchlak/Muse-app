import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from '@/lib/database.types';
import {validDate,validTimeZone,weekDates} from '@/lib/dates';
import type {Book,DreamEntry,FortuneAssignment,PersonalCardMeaning,QuestCompletion,QuestWeek,ReadingGoal,ReadingSession,SavedDiscovery,TarotReading,Owned,WhimsySources,WhimsyExperience} from './models';
import type {WhimsyReadRepository,WhimsyWriteCommand} from './repository';
import type {WhimsyRange} from './integrations';
export type WidgetPreferenceRecord=Owned&{experience:WhimsyExperience;enabled:boolean;featuredBookId?:string|null;readingMilestones?:{seen:string[];since:string}};
/** Bookshelf-only fields kept on its widget preference; every writer carries them so none is dropped. */
export function bookshelfWidgetExtras(pref:Pick<WidgetPreferenceRecord,'featuredBookId'|'readingMilestones'>|undefined){return {...(pref?.featuredBookId?{featuredBookId:pref.featuredBookId}:{}),...(pref?.readingMilestones?{readingMilestones:pref.readingMilestones}:{})};}
export type WhimsyRecords={questWeeks:QuestWeek[];questCompletions:QuestCompletion[];tarot:TarotReading[];meanings:PersonalCardMeaning[];dreams:DreamEntry[];fortunes:FortuneAssignment[];saved:SavedDiscovery[];books:Book[];sessions:ReadingSession[];goals:ReadingGoal[];widgets:WidgetPreferenceRecord[]};
export type WhimsyKind=keyof WhimsyRecords;
export type WhimsyRecord<K extends WhimsyKind>=WhimsyRecords[K][number];
export type WhimsyDraft<K extends WhimsyKind>=Omit<WhimsyRecord<K>,keyof Owned>&{id:string};
function changed(userId:string){if(typeof window==='undefined')return;window.dispatchEvent(new Event('muse-whimsy-changed'));try{localStorage.setItem(`muse.whimsy.changed.${userId}`,crypto.randomUUID());localStorage.removeItem(`muse.whimsy.changed.${userId}`);}catch{}}
const conflict=()=>Object.assign(Error('Whimsy changed elsewhere. Keep your draft and reload the latest record.'),{code:'40001'});
export const whimsyKinds=['questWeeks','questCompletions','tarot','meanings','dreams','fortunes','saved','books','sessions','goals','widgets'] as const satisfies readonly WhimsyKind[];
type Rpc=(fn:string,args?:Record<string,unknown>)=>PromiseLike<{data:unknown;error:{code?:string;message?:string}|null}>;
const rpc=(client:SupabaseClient<Database>)=>client.rpc.bind(client) as unknown as Rpc;
/** PostgREST reports a missing function as PGRST202; until the paged-read migration is applied, fall back. */
const missingFunction=(error:{code?:string;message?:string}|null)=>!!error&&(error.code==='PGRST202'||/could not find the function/i.test(error.message??''));
async function readWhimsySnapshot(call:Rpc):Promise<WhimsyRecords>{const {data,error}=await call('read_whimsy');if(error)throw error;if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Whimsy response was not valid');return data as WhimsyRecords;}
/** Every record of one kind, page by page. The cursor is passed back exactly as the database returned it. */
async function readKind(call:Rpc,kind:WhimsyKind):Promise<unknown[]|null>{
 const rows:unknown[]=[];let cursor:{createdAt:string;id:string}|null=null;
 for(let page=0;page<10000;page++){
  const {data,error}=await call('read_whimsy_page',{p_kind:kind,p_after_created_at:cursor?.createdAt??null,p_after_id:cursor?.id??null,p_limit:1000});
  if(missingFunction(error))return null;if(error)throw error;
  const result=data as {rows?:unknown;next?:{createdAt?:unknown;id?:unknown}|null}|null;if(!result||!Array.isArray(result.rows))throw Error('Whimsy response was not valid');
  rows.push(...result.rows);const next=result.next;
  if(!next)return rows;
  if(typeof next.createdAt!=='string'||typeof next.id!=='string')throw Error('Whimsy page cursor was not valid');
  cursor={createdAt:next.createdAt,id:next.id};
 }
 throw Error('Whimsy library is too large to read safely.');
}
/**
 * Read-only calls never draw, assign, seed or write activity. Every record is read (no ceiling), one kind at a
 * time, so all-time statistics stay complete. Each page is consistent; a record saved mid-load appears next read.
 */
export async function readWhimsy(client:SupabaseClient<Database>):Promise<WhimsyRecords>{
 const call=rpc(client),kinds=await Promise.all(whimsyKinds.map(kind=>readKind(call,kind)));
 if(kinds.some(rows=>rows===null))return readWhimsySnapshot(call);
 return Object.fromEntries(whimsyKinds.map((kind,index)=>[kind,kinds[index]])) as unknown as WhimsyRecords;
}
/** One record, or null. Falls back to a full read before the paged-read migration is applied. */
export async function readWhimsyRecord<K extends WhimsyKind>(client:SupabaseClient<Database>,kind:K,id:string):Promise<WhimsyRecord<K>|null>{
 const call=rpc(client),{data,error}=await call('read_whimsy_record',{p_kind:kind,p_id:id});
 if(missingFunction(error))return ((await readWhimsySnapshot(call))[kind] as WhimsyRecord<K>[]).find(r=>r.id===id)??null;
 if(error)throw error;return (data as WhimsyRecord<K>|null)??null;
}
/** Stable command IDs belong to callers and must be retained across uncertain retries. */
export async function saveWhimsyRecord<K extends WhimsyKind>(client:SupabaseClient<Database>,kind:K,command:WhimsyWriteCommand<WhimsyDraft<K>>):Promise<WhimsyRecord<K>>{const {data,error}=await client.rpc('save_whimsy_record',{p_kind:kind,p_expected_revision:command.expectedRevision,p_command_id:command.commandId,p_record:command.record as unknown as Json,p_delete:false});if(error)throw error;const receipt=data as unknown as {sourceId:string;revision:number};if(!receipt||receipt.sourceId!==command.record.id)throw Error('Whimsy save was not acknowledged');const record=await readWhimsyRecord(client,kind,receipt.sourceId);if(!record||record.revision!==receipt.revision)throw conflict();changed(record.userId);return record as WhimsyRecord<K>;}
export async function deleteWhimsyRecord(client:SupabaseClient<Database>,kind:WhimsyKind,id:string,expectedRevision:number,commandId:string){const {data,error}=await client.rpc('save_whimsy_record',{p_kind:kind,p_expected_revision:expectedRevision,p_command_id:commandId,p_record:{id},p_delete:true});if(error)throw error;if(!(data as {deleted?:boolean})?.deleted)throw Error('Whimsy deletion was not acknowledged');if(await readWhimsyRecord(client,kind,id))throw conflict();if(typeof window!=='undefined')window.dispatchEvent(new Event('muse-whimsy-changed'));}
export function whimsySources(records:WhimsyRecords):WhimsySources{return {questWeeks:records.questWeeks,questCompletions:records.questCompletions,tarot:records.tarot,dreams:records.dreams,fortunes:records.fortunes,saved:records.saved,books:records.books,sessions:records.sessions};}
function validateRange(range:WhimsyRange){if(!validDate(range.start)||!validDate(range.end)||range.start>range.end)throw Error('Choose valid local dates');}
/** Adapters reuse the canonical snapshot; source dates remain distinct from capture timestamps. */
export function createWhimsyRepository(client:SupabaseClient<Database>):WhimsyReadRepository{
 return {
 readRange:async range=>{validateRange(range);const snapshot=await readWhimsy(client);return {sources:whimsySources(snapshot),status:{loaded:true}};},
 readQuestWeek:async date=>{if(!validDate(date))throw Error('Choose a valid date');return (await readWhimsy(client)).questWeeks.find(w=>w.weekStart===weekDates(date)[0])??null;},
 readTarotDay:async date=>{if(!validDate(date))throw Error('Choose a valid date');return (await readWhimsy(client)).tarot.filter(r=>r.date===date);},
 readDreamDay:async date=>{if(!validDate(date))throw Error('Choose a valid date');return (await readWhimsy(client)).dreams.filter(r=>r.date===date);},
 readFortuneDay:async date=>{if(!validDate(date))throw Error('Choose a valid date');return (await readWhimsy(client)).fortunes.filter(r=>r.date===date);},
 readCurrentBooks:async()=>(await readWhimsy(client)).books.filter(b=>b.status==='reading'&&!b.archivedAt),
 readReadingSessions:async range=>{validateRange(range);return (await readWhimsy(client)).sessions;},
 };
}
export function assertWhimsyTimeZone(zone:string){if(!validTimeZone(zone))throw Error('Choose a saved IANA timezone before recording Whimsy activity.');}
