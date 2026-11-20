import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from '@/lib/database.types';
import type {ReadingTimer} from './books';
import {readWhimsyRecord} from './persistence';
function changed(){if(typeof window!=='undefined')window.dispatchEvent(new Event('muse-whimsy-changed'));}
export async function readReadingTimer(client:SupabaseClient<Database>):Promise<ReadingTimer|null>{const {data,error}=await client.rpc('read_reading_timer');if(error)throw error;return data as ReadingTimer|null;}
export async function discardReadingTimer(client:SupabaseClient<Database>,revision:number,commandId:string){const {data,error}=await client.rpc('discard_reading_timer',{p_expected_revision:revision,p_command_id:commandId});if(error)throw error;const receipt=data as {deleted?:boolean;restored?:boolean}|null;if(!receipt?.deleted)throw Error('Reading timer discard was not confirmed.');changed();return {restored:!!receipt.restored};}
export async function startBookReadingTimer(client:SupabaseClient<Database>,record:Record<string,unknown>,bookRevision:number,timer:Omit<ReadingTimer,'revision'|'updatedAt'>,commandId:string){
 const {data,error}=await client.rpc('start_book_reading_timer',{p_book_record:record as Json,p_expected_book_revision:bookRevision,p_timer_payload:timer as unknown as Json,p_command_id:commandId});if(error)throw error;
 const receipt=data as {bookRevision?:number;timerRevision?:number}|null;
 if(!receipt?.bookRevision||!receipt.timerRevision)throw Error('Reading start was not confirmed. Reload before trying again.');
 const [book,latest]=await Promise.all([readWhimsyRecord(client,'books',record.id as string),readReadingTimer(client)]);
 if(!book||book.revision!==receipt.bookRevision||!latest||latest.revision!==receipt.timerRevision)throw Error('Reading changed elsewhere. Reload the latest book and timer.');
 changed();return {book,timer:latest};
}
export async function saveReadingTimer(client:SupabaseClient<Database>,timer:Omit<ReadingTimer,'revision'|'updatedAt'>|null,expectedRevision:number,commandId:string){const {data,error}=await client.rpc('save_reading_timer',{p_payload:timer as unknown as Json,p_expected_revision:expectedRevision,p_command_id:commandId});if(error)throw error;const receipt=data as {revision:number;deleted:boolean}|null;if(!receipt||receipt.revision!==expectedRevision+1)throw Error('Reading timer save could not be confirmed. Reload before trying again.');const latest=await readReadingTimer(client);if(!timer&&latest||timer&&(!latest||latest.revision!==receipt.revision))throw Error('Reading timer changed elsewhere. Reload and keep your unfinished session.');changed();return latest;}
export async function deleteBookWithSessions(client:SupabaseClient<Database>,id:string,revision:number,commandId:string){const {data,error}=await client.rpc('delete_whimsy_book',{p_book_id:id,p_expected_revision:revision,p_command_id:commandId});if(error)throw error;if(!(data as {deleted?:boolean}|null)?.deleted)throw Error('Book deletion was not confirmed.');if(await readWhimsyRecord(client,'books',id))throw Error('Book changed elsewhere. Reload before trying again.');changed();}
/** A timer's identity and recorded state, as the base of its next write (shared by every surface that controls it). */
export function readingTimerBase(t:ReadingTimer){return {bookId:t.bookId,date:t.date,timeZone:t.timeZone,startedAt:t.startedAt,startingPage:t.startingPage,sessionId:t.sessionId,sessionCommandId:t.sessionCommandId,segments:t.segments,finishDraft:t.finishDraft,...(t.confirmedSince?.length?{confirmedSince:t.confirmedSince}:{}),...(t.correctedSegments?{correctedSegments:t.correctedSegments}:{}),...(t.cycleId?{cycleId:t.cycleId}:{}),...(t.autoStatus?{autoStatus:t.autoStatus}:{}),...(t.targetMinutes?{targetMinutes:t.targetMinutes}:{})};}
export type SessionCommand={record:Record<string,unknown>;expectedRevision:number;commandId:string};
/**
 * One book's reading in one transaction (`save_book_reading`): optionally the book (e.g. with a new finished read),
 * the sessions recorded with it and, from the live timer, clearing that timer. All or nothing; each part keeps its own
 * idempotent command id, so a retry after a lost response returns the saved receipts instead of writing twice.
 */
export async function saveBookReading(client:SupabaseClient<Database>,{bookId,book,sessions=[],timer}:{bookId:string;book?:{record:Record<string,unknown>;expectedRevision:number;commandId:string};sessions?:SessionCommand[];timer?:{expectedRevision:number;commandId:string}}){
 const {data,error}=await client.rpc('save_book_reading',{p_book_id:bookId,p_book:(book?.record??null) as Json,p_expected_revision:book?.expectedRevision??null,p_command_id:book?.commandId??null,p_sessions:sessions as unknown as Json,...(timer?{p_timer:timer as unknown as Json}:{})});
 if(error)throw error;
 const receipt=data as {bookId?:string;book?:{sourceId?:string;revision?:number}|null;sessions?:{sourceId?:string}[]}|null;
 if(receipt?.bookId!==bookId||(book&&receipt.book?.sourceId!==bookId)||(receipt.sessions?.length??0)!==sessions.length)throw Error('This reading was not confirmed. Reload before trying again.');
 changed();return receipt;
}
