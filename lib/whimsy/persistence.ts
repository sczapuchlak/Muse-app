import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from '@/lib/database.types';
import {validDate,validTimeZone,weekDates} from '@/lib/dates';
import type {Book,DreamEntry,FortuneAssignment,PersonalCardMeaning,QuestCompletion,QuestWeek,ReadingGoal,ReadingSession,SavedDiscovery,TarotReading,Owned,WhimsySources,WhimsyExperience} from './models';
import type {WhimsyReadRepository,WhimsyWriteCommand} from './repository';
import type {WhimsyRange} from './integrations';
export type WidgetPreferenceRecord=Owned&{experience:WhimsyExperience;enabled:boolean};
export type WhimsyRecords={questWeeks:QuestWeek[];questCompletions:QuestCompletion[];tarot:TarotReading[];meanings:PersonalCardMeaning[];dreams:DreamEntry[];fortunes:FortuneAssignment[];saved:SavedDiscovery[];books:Book[];sessions:ReadingSession[];goals:ReadingGoal[];widgets:WidgetPreferenceRecord[]};
export type WhimsyKind=keyof WhimsyRecords;
export type WhimsyRecord<K extends WhimsyKind>=WhimsyRecords[K][number];
export type WhimsyDraft<K extends WhimsyKind>=Omit<WhimsyRecord<K>,keyof Owned>&{id:string};
function changed(userId:string){if(typeof window==='undefined')return;window.dispatchEvent(new Event('muse-whimsy-changed'));try{localStorage.setItem(`muse.whimsy.changed.${userId}`,crypto.randomUUID());localStorage.removeItem(`muse.whimsy.changed.${userId}`);}catch{}}
const conflict=()=>Object.assign(Error('Whimsy changed elsewhere. Keep your draft and reload the latest record.'),{code:'40001'});
/** Read-only calls never draw, assign, seed or write activity. One RPC is one MVCC snapshot. */
export async function readWhimsy(client:SupabaseClient<Database>):Promise<WhimsyRecords>{const {data,error}=await client.rpc('read_whimsy');if(error)throw error;if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Whimsy response was not valid');return data as unknown as WhimsyRecords;}
/** Stable command IDs belong to callers and must be retained across uncertain retries. */
export async function saveWhimsyRecord<K extends WhimsyKind>(client:SupabaseClient<Database>,kind:K,command:WhimsyWriteCommand<WhimsyDraft<K>>):Promise<WhimsyRecord<K>>{const {data,error}=await client.rpc('save_whimsy_record',{p_kind:kind,p_expected_revision:command.expectedRevision,p_command_id:command.commandId,p_record:command.record as unknown as Json,p_delete:false});if(error)throw error;const receipt=data as unknown as {sourceId:string;revision:number};if(!receipt||receipt.sourceId!==command.record.id)throw Error('Whimsy save was not acknowledged');const snapshot=await readWhimsy(client),record=snapshot[kind].find(r=>r.id===receipt.sourceId);if(!record||record.revision!==receipt.revision)throw conflict();changed(record.userId);return record as WhimsyRecord<K>;}
export async function deleteWhimsyRecord(client:SupabaseClient<Database>,kind:WhimsyKind,id:string,expectedRevision:number,commandId:string){const {data,error}=await client.rpc('save_whimsy_record',{p_kind:kind,p_expected_revision:expectedRevision,p_command_id:commandId,p_record:{id},p_delete:true});if(error)throw error;if(!(data as {deleted?:boolean})?.deleted)throw Error('Whimsy deletion was not acknowledged');const snapshot=await readWhimsy(client);if(snapshot[kind].some(r=>r.id===id))throw conflict();if(typeof window!=='undefined')window.dispatchEvent(new Event('muse-whimsy-changed'));}
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
 readCurrentBooks:async()=>(await readWhimsy(client)).books.filter(b=>b.status==='reading'),
 readReadingSessions:async range=>{validateRange(range);return (await readWhimsy(client)).sessions;},
 };
}
export function assertWhimsyTimeZone(zone:string){if(!validTimeZone(zone))throw Error('Choose a saved IANA timezone before recording Whimsy activity.');}
