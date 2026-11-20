/**
 * The one Finish Book engine (historical reading, bulk sessions, half stars). Every entry point uses it: Add Book's
 * "Already read", a status change to Finished, the manual reading log, and the live timer's "I finished this book".
 * Rules (docs/PRODUCT_RULES.md "Finishing a book, now or in the past"):
 * - A finished read is one completion inside the book (reading-cycles). Recording it needs a book and a valid finish
 *   date; the start date is optional and an unknown start stays unknown. Nothing defaults to today unless the reader
 *   is finishing a live read today.
 * - Dates only: no sessions are created, so no minutes, pages per day, streak days or pace are invented.
 * - Sessions: each row becomes one manual session linked to the read by its id, with the pages and minutes entered.
 *   Minutes become active time; rows without minutes keep their pages and date and record no time. Manual sessions
 *   are excluded from time-of-day patterns, so the placeholder clock time a timed row needs is never read as a habit.
 * - Rows are validated as entered and never rewritten to fit: errors are shown inline, and conflicts with sessions
 *   already logged for the read need the reader's confirmation.
 */
import {shiftDate,validDate} from '@/lib/dates';
import {closeRunningSegment,localReadingInstant} from '@/lib/whimsy/books';
import type {ReadingSession} from '@/lib/whimsy/models';
import {sessionSeconds} from '@/lib/whimsy/reading-stats';

/** One editable session row. Values stay strings so a half-typed row is never coerced. */
export type SessionRow={key:string;date:string;startPage:string;endPage:string;minutes:string;notes:string};
export type RowField='date'|'startPage'|'endPage'|'minutes'|'row';
/** `error` blocks saving; `confirm` is a conflict with saved sessions that the reader must accept to save. */
export type RowIssue={key:string;field:RowField;level:'error'|'confirm';message:string};
export type ParsedRow={key:string;date:string;startingPage:number;endingPage:number;pages:number;minutes:number;notes:string;inheritedStart:boolean};

export const MAX_ROW_MINUTES=1440;
export const blankRow=(key:string=crypto.randomUUID(),date=''):SessionRow=>({key,date,startPage:'',endPage:'',minutes:'',notes:''});
export const isBlankRow=(r:SessionRow)=>!r.date.trim()&&!r.startPage.trim()&&!r.endPage.trim()&&!r.minutes.trim()&&!r.notes.trim();
const whole=(v:string)=>{const t=v.trim();if(!/^\d+$/.test(t))return null;const n=Number(t);return Number.isSafeInteger(n)?n:null;};
const md=(d:string)=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));
export const longDay=(d:string)=>new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));

export type RowContext={
 /** Pages in the edition read, when known. */
 totalPages?:number;today:string;
 /** Where the first row starts when its starting page is left blank (0 for a new read, the place you left off otherwise). */
 firstStart:number;
 startedOn?:string;finishedOn?:string;
 /** Sessions already saved for this read (non-reread sessions with page positions are compared). */
 existing?:readonly ReadingSession[];
};

/**
 * Validates rows in the order shown (the reader controls order; Muse never sorts silently). A blank starting page
 * continues from the row above, so cumulative "I was on page 145" data needs only the ending page.
 */
export function validateRows(rows:readonly SessionRow[],ctx:RowContext):{parsed:ParsedRow[];issues:RowIssue[]}{
 const issues:RowIssue[]=[],parsed:ParsedRow[]=[];
 const add=(key:string,field:RowField,message:string,level:RowIssue['level']='error')=>issues.push({key,field,level,message});
 let previous:ParsedRow|null=null;
 for(const row of rows){
  if(isBlankRow(row))continue;
  const before=issues.length;
  const date=row.date.trim();
  if(!date)add(row.key,'date','Enter the date of this session.');
  else if(!validDate(date))add(row.key,'date','Enter a real date.');
  else if(date>ctx.today)add(row.key,'date','This date is in the future.');
  else if(ctx.startedOn&&validDate(ctx.startedOn)&&date<ctx.startedOn)add(row.key,'date',`Before the start date (${md(ctx.startedOn)}).`);
  else if(ctx.finishedOn&&validDate(ctx.finishedOn)&&date>ctx.finishedOn)add(row.key,'date',`After the finish date (${md(ctx.finishedOn)}).`);
  const inheritedStart=!row.startPage.trim(),start=inheritedStart?(previous?.endingPage??ctx.firstStart):whole(row.startPage);
  if(start===null)add(row.key,'startPage','Use a whole page number.');
  const end=whole(row.endPage);
  if(!row.endPage.trim())add(row.key,'endPage','Enter the page you reached.');
  else if(end===null)add(row.key,'endPage','Use a whole page number.');
  else if(start!==null&&end<start)add(row.key,'endPage',`Ends before it starts (page ${start}).`);
  else if(ctx.totalPages&&end>ctx.totalPages)add(row.key,'endPage',`Past the last page (${ctx.totalPages}).`);
  if(!inheritedStart&&start!==null&&ctx.totalPages&&start>ctx.totalPages)add(row.key,'startPage',`Past the last page (${ctx.totalPages}).`);
  const minutes=row.minutes.trim()?whole(row.minutes):0;
  if(minutes===null||minutes>MAX_ROW_MINUTES)add(row.key,'minutes',`Minutes must be a whole number from 0 to ${MAX_ROW_MINUTES}.`);
  if(issues.length>before||start===null||end===null||minutes===null)continue;
  const current:ParsedRow={key:row.key,date,startingPage:start,endingPage:end,pages:end-start,minutes,notes:row.notes.trim(),inheritedStart};
  if(previous){
   if(date<previous.date)add(row.key,'row',`Dated before the session above (${md(previous.date)}). Move it up, or sort by date.`);
   else if(date===previous.date&&start===previous.startingPage&&end===previous.endingPage)add(row.key,'row','This repeats the session above.');
   else if(start<previous.endingPage)add(row.key,'row',`Overlaps the session above, which already reached page ${previous.endingPage}.`);
  }
  for(const s of ctx.existing??[]){
   if(s.reread||s.startingPage===undefined||s.endingPage===undefined)continue;
   if(start<s.endingPage&&end>s.startingPage){add(row.key,'row',`Pages ${Math.max(start,s.startingPage)}–${Math.min(end,s.endingPage)} are already logged for this read (${md(s.date)}).`,'confirm');break;}
  }
  parsed.push(current);previous=current;
 }
 return {parsed,issues};
}

/** Suggested dates from the rows. The finish is suggested only when the last row reaches the book's last page. */
export function suggestedDates(parsed:readonly ParsedRow[],totalPages?:number){
 if(!parsed.length)return {startedOn:undefined,finishedOn:undefined,complete:false,lastPage:undefined};
 const first=parsed[0],last=parsed.at(-1)!,complete=!!totalPages&&last.endingPage>=totalPages;
 return {startedOn:first.date,finishedOn:complete?last.date:undefined,complete,lastPage:last.endingPage};
}

/** Where a date came from, shown beside it, so inferred dates are never mistaken for remembered ones. */
/** `none`: not set yet (a suggestion may fill it); `entered`: the reader's own choice, including clearing it. */
export type DateSource='none'|'entered'|'sessions'|'book'|'today'|'timer';

export type CompletionTarget='current'|'past';
export type DateRules={target:CompletionTarget;today:string;startedOn?:string;finishedOn?:string;
 /** Every finished read of the book (for a past read: where it may sit; for the current read: it must finish last). */
 completions:readonly {id:string;startedOn?:string;finishedOn:string}[];
 /** The read in progress being finished, or the one a past read must not overlap. */
 openStartedOn?:string;openSessions?:readonly ReadingSession[];
 /** Rows (or the timer's sitting) that belong to this read. */
 sessionDates?:readonly string[];
};
/** Date checks shared by every entry point. Returns reader-facing messages; empty means valid. */
export function validateDates(r:DateRules){
 const problems:{field:'startedOn'|'finishedOn';message:string}[]=[];
 const start=r.startedOn||undefined,finish=r.finishedOn||undefined;
 if(!finish)problems.push({field:'finishedOn',message:'Choose the day you finished it.'});
 else if(!validDate(finish))problems.push({field:'finishedOn',message:'Enter a real finish date.'});
 else if(finish>r.today)problems.push({field:'finishedOn',message:'The finish date is in the future.'});
 if(start&&!validDate(start))problems.push({field:'startedOn',message:'Enter a real start date, or leave it blank.'});
 else if(start&&finish&&start>finish)problems.push({field:'startedOn',message:'The start date is after the finish date.'});
 if(problems.length||!finish)return problems;
 const dates=[...(r.sessionDates??[])].sort();
 if(dates.length&&dates.at(-1)!>finish)problems.push({field:'finishedOn',message:`A session on ${md(dates.at(-1)!)} comes after this finish date.`});
 if(start&&dates.length&&dates[0]<start)problems.push({field:'startedOn',message:`A session on ${md(dates[0])} comes before this start date.`});
 if(r.target==='current'){
  const previous=[...r.completions].sort((a,b)=>a.finishedOn.localeCompare(b.finishedOn)).at(-1);
  if(previous&&finish<previous.finishedOn)problems.push({field:'finishedOn',message:`This read has to finish on or after your previous finish (${md(previous.finishedOn)}). To record an earlier read, choose “An earlier read”.`});
  const logged=(r.openSessions??[]).map(s=>s.date).sort();
  if(logged.length&&logged.at(-1)!>finish)problems.push({field:'finishedOn',message:`You logged a session on ${md(logged.at(-1)!)}, after this finish date.`});
  if(start&&logged.length&&logged[0]<start)problems.push({field:'startedOn',message:`You logged a session on ${md(logged[0])}, before this start date.`});
 }else{
  const from=start??finish;
  for(const c of r.completions){
   // Reads may touch (one ends the day the next begins) but not overlap; the same finish day is almost always a duplicate.
   const cFrom=c.startedOn??c.finishedOn,clash=finish===c.finishedOn||(from<c.finishedOn&&finish>cFrom);
   if(clash){problems.push({field:'finishedOn',message:finish===c.finishedOn?`You already have a read finished on ${md(finish)}.`:`This overlaps another read (${c.startedOn?`${md(c.startedOn)} – `:''}${md(c.finishedOn)}).`});break;}
  }
  if(r.openStartedOn&&finish>r.openStartedOn)problems.push({field:'finishedOn',message:`This overlaps your current read, which started ${md(r.openStartedOn)}. Finish that read instead, or choose an earlier date.`});
  const open=(r.openSessions??[]).map(s=>s.date).sort();
  if(open.length&&finish>=open[0])problems.push({field:'finishedOn',message:`Your current read has a session on ${md(open[0])}; an earlier read has to finish before it.`});
 }
 return problems;
}

/**
 * Active segments for rows with minutes. Times of day are not part of a historical record, so each row is placed in
 * the first free stretch of its own local day (from noon), never overlapping another saved or placed session and
 * never crossing midnight, so its minutes count on the day entered. Manual sessions never feed time-of-day patterns.
 */
export function placeRowMinutes(rows:readonly Pick<ParsedRow,'key'|'date'|'minutes'>[],zone:string,occupied:readonly {start:string;end:string}[]){
 const taken=occupied.map(s=>({start:Date.parse(s.start),end:Date.parse(s.end)})).filter(s=>s.end>s.start);
 const out=new Map<string,{start:string;end:string}[]>(),failures:{key:string;message:string}[]=[];
 const at=(date:string,times:string[])=>{for(const t of times){try{return Date.parse(localReadingInstant(date,t,zone));}catch{/* a daylight-saving gap: try the next hour */}}return NaN;};
 for(const row of rows){
  if(!row.minutes){out.set(row.key,[]);continue;}
  const dayStart=at(row.date,['00:00','01:00','02:00']),dayEnd=at(shiftDate(row.date,1),['00:00','01:00','02:00']),noon=at(row.date,['12:00','13:00']),length=row.minutes*60000;
  if(![dayStart,dayEnd,noon].every(Number.isFinite)){failures.push({key:row.key,message:'This date could not be placed in your saved timezone.'});continue;}
  const busy=taken.filter(s=>s.end>dayStart&&s.start<dayEnd).sort((a,b)=>a.start-b.start);
  const candidates=[noon,...busy.map(s=>s.end).filter(t=>t>=noon),dayStart,...busy.map(s=>s.end).filter(t=>t<noon)];
  const start=candidates.find(s=>s>=dayStart&&s+length<=dayEnd&&!busy.some(b=>b.start<s+length&&b.end>s));
  if(start===undefined){failures.push({key:row.key,message:`There isn’t room on ${md(row.date)} for ${row.minutes} more minutes beside your other sessions.`});continue;}
  taken.push({start,end:start+length});
  out.set(row.key,closeRunningSegment(new Date(start).toISOString(),new Date(start+length).toISOString()));
 }
 return {segments:out,failures};
}

/** Every saved active interval for this reader, the space historical minutes must not overlap. */
export const occupiedSegments=(sessions:readonly ReadingSession[],except:ReadonlySet<string>=new Set())=>sessions.filter(s=>!except.has(s.id)).flatMap(s=>s.activeSegments);

/** Manual session records for the rows, linked to one read. Ids are the stable row keys, so a retry never duplicates. */
export function rowSessionRecords(parsed:readonly ParsedRow[],{bookId,cycleId,timeZone,segments,positionRecordedAt}:{bookId:string;cycleId:string;timeZone:string;segments:Map<string,{start:string;end:string}[]>;positionRecordedAt:(row:ParsedRow)=>string}){
 return parsed.map(row=>({id:row.key,bookId,date:row.date,timeZone,pages:row.pages,startingPage:row.startingPage,endingPage:row.endingPage,notes:row.notes,activeSegments:segments.get(row.key)??[],positionRecordedAt:positionRecordedAt(row),manual:true,cycleId}));
}

// ---------- Ratings: 0.5 to 5 in half steps; unrated is its own state (never 0) ----------
export const RATING_STEPS=[0.5,1,1.5,2,2.5,3,3.5,4,4.5,5] as const;
export const isHalfStep=(v:number)=>Number.isFinite(v)&&v>=0.5&&v<=5&&Number.isInteger(v*2);
/** A saved rating is kept exactly (an imported 4.25 stays 4.25); a new choice must be a half step. */
export const acceptableRating=(v:number,saved?:number)=>isHalfStep(v)||(saved!==undefined&&v===saved&&v>0&&v<=5);
export const ratingText=(v:number)=>Number.isInteger(v)?`${v}`:`${Math.round(v*100)/100}`;
export const starsPhrase=(v:number)=>`${ratingText(v)} ${v===1?'star':'stars'}`;

// ---------- Summary ----------
const minutesText=(m:number)=>m<60?`${m} min`:`${Math.floor(m/60)} h${m%60?` ${m%60} min`:''}`;
/** "Finished June 6, 2025 · 384 pages · 4 sessions · 4.5 stars". */
export function completionSummary({finishedOn,totalPages,sessions,minutes=0,rating}:{finishedOn?:string;totalPages?:number;sessions:number;minutes?:number;rating?:number|null}){
 return [finishedOn&&validDate(finishedOn)?`Finished ${longDay(finishedOn)}`:'Finish date needed',totalPages?`${totalPages} pages`:null,sessions?`${sessions} ${sessions===1?'session':'sessions'}`:'No detailed sessions recorded',minutes?minutesText(minutes):null,rating?starsPhrase(rating):null].filter(Boolean).join(' · ');
}
export const sessionsMinutes=(sessions:readonly ReadingSession[])=>Math.round(sessions.reduce((n,s)=>n+sessionSeconds(s),0)/60);

// ---------- Pasting rows from a spreadsheet or another app ----------
const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const iso=(y:number,m:number,d:number)=>{const v=`${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;return validDate(v)?v:null;};
/** ISO, US month/day/year, "June 1, 2025" and "1 June 2025". Never guesses a missing year. */
export function parseLooseDate(value:string):string|null{
 const s=value.trim().replace(/\s+/g,' ');let m:RegExpMatchArray|null;
 if((m=s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)))return iso(+m[1],+m[2],+m[3]);
 if((m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})$/)))return iso(m[3].length===2?2000+ +m[3]:+m[3],+m[1],+m[2]);
 const month=(name:string)=>months.indexOf(name.slice(0,3).toLowerCase())+1;
 if((m=s.match(/^(?:[A-Za-z]+,? )?([A-Za-z]{3,9})\.? (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})$/))&&month(m[1]))return iso(+m[3],month(m[1]),+m[2]);
 if((m=s.match(/^(\d{1,2}) ([A-Za-z]{3,9})\.?,? (\d{4})$/))&&month(m[2]))return iso(+m[3],month(m[2]),+m[1]);
 return null;
}
/**
 * Rows from pasted text: one session per line, as date, starting page, ending page, minutes, notes (tab or comma
 * separated). A line with a date and one number is cumulative progress (the page reached). Header lines are skipped.
 */
export function parsePastedRows(text:string,makeKey:()=>string=()=>crypto.randomUUID()){
 const rows:SessionRow[]=[],skipped:string[]=[];
 for(const raw of text.split(/\r?\n/)){
  const line=raw.trim();if(!line)continue;
  let cells:string[];
  if(line.includes('\t'))cells=line.split('\t').map(c=>c.trim());
  else{const lead=line.match(/^([A-Za-z]+,? )?[A-Za-z]{3,9}\.? \d{1,2}(?:st|nd|rd|th)?, \d{4}/)?.[0]??line.match(/^[^\s,;]+/)?.[0]??'';cells=[lead,...line.slice(lead.length).split(/[,;]|\s{2,}|\s(?=\d)/).map(c=>c.trim()).filter(Boolean)];}
  const date=parseLooseDate(cells[0]??'');
  if(!date){if(!/date|day|when/i.test(line))skipped.push(line);continue;}
  const rest=cells.slice(1).filter(c=>c!==''),numbers:number[]=[],words:string[]=[];
  for(const c of rest){const n=c.replace(/\s*(pages?|pp?\.?|min(ute)?s?|m)$/i,'');if(numbers.length<3&&!words.length&&/^\d+$/.test(n))numbers.push(Number(n));else words.push(c);}
  if(!numbers.length){skipped.push(line);continue;}
  const [a,b,c]=numbers;
  rows.push({key:makeKey(),date,startPage:numbers.length>=2?String(a):'',endPage:String(numbers.length>=2?b:a),minutes:c!==undefined?String(c):'',notes:words.join(' ')});
 }
 return {rows,skipped};
}
