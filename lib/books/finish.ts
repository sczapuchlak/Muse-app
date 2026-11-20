/**
 * Saving a finished read (or several logged sessions) through the one completion engine, for every entry point:
 * Add Book's Already read, the status menu, the reading log and the live timer. The book, its sessions and (from the
 * timer) the timer itself are written in one transaction. Command ids are derived from the exact command, so a retry
 * of the same save reuses them and can never record the read or its sessions twice.
 */
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import {bookCarryFields} from '@/lib/whimsy/books';
import {addPastRead,finishCurrentRead,legacyOpenId,newCycleId,openReadId,preserveOpinions,type FinishOpinion} from '@/lib/whimsy/reading-cycles';
import {saveBookReading,type SessionCommand} from '@/lib/whimsy/reading-timer';
import {occupiedSegments,placeRowMinutes,rowSessionRecords,type ParsedRow} from './completion';

/** A complete book record: every write starts here so no field is silently dropped (older opinions are stored on their read first). */
export function fullBookRecord(original:Book,changes:Partial<Book>){const book=preserveOpinions(original);return {id:book.id,title:book.title,author:book.author,genre:book.genre,coverUrl:book.coverUrl,format:book.format,totalPages:book.totalPages,startingPage:book.startingPage,currentPage:book.currentPage,positionUpdatedAt:book.positionUpdatedAt,positionDate:book.positionDate,status:book.status,startedOn:book.startedOn,finishedOn:book.finishedOn,rating:book.rating,reviewEmojis:book.reviewEmojis,finalThoughts:book.finalThoughts,...bookCarryFields(book),...changes};}

/** A UUID derived from the command itself: the same save retried gets the same id, a changed save a new one. */
export async function commandId(kind:string,payload:unknown){
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([kind,payload])))).slice(0,16);
 bytes[6]=(bytes[6]&0x0f)|0x50;bytes[8]=(bytes[8]&0x3f)|0x80;
 const hex=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export type ReadingPlan={
 /** current: finish the read in progress · past: add an earlier/another finished read · log: sessions only. */
 target:'current'|'past'|'log';
 startedOn?:string;finishedOn?:string;opinion?:Omit<FinishOpinion,'finishedOn'>;
 /** Pages in the edition read, when the reader corrected it. */
 totalPages?:number;
 rows:readonly ParsedRow[];
 /** For `log`: the read these sessions belong to ('' or a legacy placeholder gives the read in progress its stored id). */
 logReadId?:string;
};
export type TimerSitting={record:Record<string,unknown>&{id:string;activeSegments:{start:string;end:string}[]};commandId:string;timer:{expectedRevision:number;commandId:string}};

/**
 * Writes one plan. `isNew` saves a book that is not yet on the shelf (Already read from Add Book) together with its read.
 * Returns the saved read id. Throws reader-facing errors; nothing is written unless everything is.
 */
export async function saveReadingPlan(client:SupabaseClient<Database>,{book,isNew=false,plan,sessions,timeZone,today,sitting}:{book:Book;isNew?:boolean;plan:ReadingPlan;sessions:readonly ReadingSession[];timeZone:string;today:string;sitting?:TimerSitting}){
 const now=new Date().toISOString();
 let changes:Partial<Book>|null=null,readId:string;
 if(plan.target==='log'){
  const open=openReadId(book);
  if(!plan.logReadId||plan.logReadId===legacyOpenId(book)){readId=open??newCycleId(book);if(!open&&book.status!=='finished')changes={cycleId:readId};}
  else readId=plan.logReadId;
 }else{
  if(!plan.finishedOn)throw Error('Choose the day you finished it.');
  const details={finishedOn:plan.finishedOn,startedOn:plan.startedOn||undefined,reviewEmojis:[],...plan.opinion} as FinishOpinion&{startedOn?:string};
  const {readId:id,...fields}=plan.target==='current'?finishCurrentRead(book,today,details):addPastRead(book,today,details);
  readId=id;changes=fields;
 }
 if(plan.totalPages&&plan.totalPages!==book.totalPages)changes={...(changes??{}),totalPages:plan.totalPages};
 const placed=placeRowMinutes(plan.rows,timeZone,[...occupiedSegments(sessions),...(sitting?.record.activeSegments??[])]);
 if(placed.failures.length)throw Error(placed.failures[0].message);
 // A historical row never moves the current place in the book; a row logged for the read in progress does.
 const stamp=(row:ParsedRow)=>plan.target==='past'||isNew||row.date<(book.positionDate??'')?`${row.date}T12:00:00.000Z`:now;
 const records=rowSessionRecords(plan.rows,{bookId:book.id,cycleId:readId,timeZone,segments:placed.segments,positionRecordedAt:stamp});
 const commands:SessionCommand[]=await Promise.all(records.map(async record=>({record,expectedRevision:0,commandId:await commandId('session',record)})));
 if(sitting)commands.unshift({record:{...sitting.record,cycleId:sitting.record.cycleId??readId},expectedRevision:0,commandId:sitting.commandId});
 const draft=isNew?{...book,revision:0}:book;
 const record=changes?fullBookRecord(draft,changes):null;
 await saveBookReading(client,{bookId:book.id,...(record?{book:{record,expectedRevision:isNew?0:book.revision,commandId:await commandId('book-reading',{record,revision:book.revision})}}:{}),sessions:commands,...(sitting?{timer:sitting.timer}:{})});
 return {readId,sessions:commands.length};
}
