/**
 * Reading statistics derived only from saved sessions, books and completion history.
 *
 * Rules (documented in docs/PRODUCT_RULES.md "Reading statistics"):
 * - Active time is the sum of saved active segments; paused gaps are never counted. Time that crosses local
 *   midnight is split between the two local days using each session's own saved timezone.
 * - Pages belong to the session's saved local date (pages are not split across midnight).
 * - A reading day is a local date with any active time or pages, counted once however many sessions it has.
 * - Pace uses only sessions with both active time and pages: eligible pages ÷ eligible active hours.
 *   Sessions with no pages or no time are excluded from both sides; missing values are never treated as zero.
 * - Average session duration uses timed sessions only (active time > 0).
 * - A completion is one finished read. Books completed = completion events; unique titles = distinct books.
 *   Rereads are completions after a book's first. Annual "books" goals count completion events.
 * - Calendar completion time is inclusive: started Nov 1 and finished Nov 12 is 12 calendar days.
 * - Current streak = consecutive reading days ending today, or ending yesterday when today has no reading yet.
 */
import {shiftDate,validDate,weekDates} from '@/lib/dates';
import {readingByDay} from './integrations';
import type {Book,BookCompletion,ReadingSession} from './models';
import type {ReadingTimer} from './books';
import {sessionReadId} from './reading-cycles';

export type ReadingPeriod='today'|'week'|'month'|'year'|'all';
export type DateRange={start:string;end:string};

export const sessionSeconds=(s:Pick<ReadingSession,'activeSegments'>)=>s.activeSegments.reduce((sum,x)=>sum+Math.max(0,(Date.parse(x.end)-Date.parse(x.start))/1000),0);
const validPages=(pages:unknown):pages is number=>typeof pages==='number'&&Number.isFinite(pages)&&pages>0;

/** Pages per active hour from sessions that recorded both time and pages. */
export function readingPace(sessions:ReadingSession[]){
 let pages=0,seconds=0,count=0;
 for(const s of sessions){const time=sessionSeconds(s);if(time>0&&validPages(s.pages)){pages+=s.pages;seconds+=time;count++;}}
 return {pages,seconds,sessions:count,pagesPerHour:seconds>0&&pages>0?pages/(seconds/3600):null};
}
/** Mean duration of timed sessions only. */
export function averageSessionSeconds(sessions:ReadingSession[]){const timed=sessions.map(sessionSeconds).filter(t=>t>0);return timed.length?timed.reduce((a,b)=>a+b,0)/timed.length:null;}
export function longestSession(sessions:ReadingSession[]){let best:ReadingSession|null=null,seconds=0;for(const s of sessions){const t=sessionSeconds(s);if(t>seconds){best=s;seconds=t;}}return best?{session:best,seconds}:null;}

export function periodRange(period:ReadingPeriod,today:string):DateRange|null{
 if(period==='all')return null;
 if(period==='today')return {start:today,end:today};
 if(period==='week'){const week=weekDates(today);return {start:week[0],end:week[6]};}
 if(period==='month'){const start=`${today.slice(0,7)}-01`,next=new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7)),1));return {start,end:shiftDate(next.toISOString().slice(0,10),-1)};}
 return {start:`${today.slice(0,4)}-01-01`,end:`${today.slice(0,4)}-12-31`};
}
const within=(date:string,range:DateRange|null)=>!range||(date>=range.start&&date<=range.end);

/** Completion history, including a book's pre-history finish date as one recorded completion (never invented). */
export function bookCompletions(book:Pick<Book,'id'|'completions'|'finishedOn'|'startedOn'|'createdAt'>):BookCompletion[]{
 const recorded=(book.completions??[]).filter(c=>c&&validDate(c.finishedOn));
 if(recorded.length)return [...recorded].sort((a,b)=>a.finishedOn.localeCompare(b.finishedOn)||a.recordedAt.localeCompare(b.recordedAt));
 if(!book.finishedOn||!validDate(book.finishedOn))return [];
 const startedOn=book.startedOn&&validDate(book.startedOn)&&book.startedOn<=book.finishedOn?book.startedOn:undefined;
 return [{id:`legacy:${book.id}:${book.finishedOn}`,finishedOn:book.finishedOn,...(startedOn?{startedOn}:{}),recordedAt:book.createdAt}];
}
/**
 * Completion history after a status change or finish-date edit. Becoming Finished adds one completion (never a
 * duplicate of the latest); staying Finished with a new date corrects the latest; leaving Finished keeps history.
 */
export function nextCompletions(book:Book|undefined,next:{status:Book['status'];finishedOn?:string;startedOn?:string;cycleId?:string},now:string,id:()=>string):BookCompletion[]{
 // A pre-history completion keeps its derived id when first stored, so anything already pointing at it stays linked.
 const history=book?bookCompletions(book):[];
 if(next.status!=='finished'||!next.finishedOn||!validDate(next.finishedOn))return history;
 const startedOn=next.startedOn&&validDate(next.startedOn)&&next.startedOn<=next.finishedOn?next.startedOn:undefined;
 const latest=history.at(-1);
 if(book?.status==='finished'&&latest){return [...history.slice(0,-1),{...latest,finishedOn:next.finishedOn,...(startedOn?{startedOn}:{})}];}
 // The read being finished is already recorded (a retried finish): never a second completion for one read.
 if(next.cycleId&&history.some(c=>c.id===next.cycleId))return history;
 // Without a cycle id, an identical latest finish is the same read; with one, a same-day reread is a new read.
 if(!next.cycleId&&latest&&latest.finishedOn===next.finishedOn&&latest.startedOn===startedOn)return history;
 const fresh=next.cycleId??id();
 return [...history,{id:fresh,finishedOn:next.finishedOn,...(startedOn?{startedOn}:{}),recordedAt:now}];
}
export function completionEvents(books:Book[]){return books.flatMap(book=>bookCompletions(book).map((completion,index)=>({book,completion,reread:index>0})));}
export function completionsIn(books:Book[],range:DateRange|null){
 const events=completionEvents(books).filter(e=>within(e.completion.finishedOn,range));
 return {count:events.length,uniqueTitles:new Set(events.map(e=>e.book.id)).size,rereads:events.filter(e=>e.reread).length,importedCompletions:events.filter(e=>!!e.completion.importSource).length,events};
}
/** Sessions belonging to one read: linked by cycle id, or older unlinked sessions only where the date makes it unambiguous. */
export function cycleSessions(book:Book,sessions:ReadingSession[],completion:Pick<BookCompletion,'id'>){return sessions.filter(s=>s.bookId===book.id&&sessionReadId(book,s)===completion.id);}
export const inclusiveCalendarDays=(start:string,end:string)=>validDate(start)&&validDate(end)&&end>=start?Math.round((Date.parse(`${end}T00:00:00Z`)-Date.parse(`${start}T00:00:00Z`))/86400000)+1:null;
/** Averages across completed reads, each using only completions that have the measured value. */
export function completedReadAverages(books:Book[],sessions:ReadingSession[]){
 const events=completionEvents(books).map(({book,completion})=>({seconds:cycleSessions(book,sessions,completion).reduce((n,s)=>n+sessionSeconds(s),0),days:completion.startedOn?inclusiveCalendarDays(completion.startedOn,completion.finishedOn):null}));
 const timed=events.filter(e=>e.seconds>0),dated=events.flatMap(e=>e.days===null?[]:[e.days]);
 return {completions:events.length,timedCompletions:timed.length,averageActiveSeconds:timed.length?timed.reduce((n,e)=>n+e.seconds,0)/timed.length:null,datedCompletions:dated.length,averageCalendarDays:dated.length?dated.reduce((a,b)=>a+b,0)/dated.length:null};
}

/** Local reading days (each counted once) from saved activity. */
export function readingDates(sessions:ReadingSession[]){return readingByDay(sessions).filter(d=>d.seconds>0||d.pages>0).map(d=>d.date);}
export function readingStreaks(sessions:ReadingSession[],today:string){
 const days=[...new Set(readingDates(sessions))].sort();let longest=0,run=0,previous:string|undefined;
 for(const day of days){run=previous&&shiftDate(previous,1)===day?run+1:1;longest=Math.max(longest,run);previous=day;}
 const set=new Set(days);let cursor=set.has(today)?today:shiftDate(today,-1),current=0;
 while(set.has(cursor)){current++;cursor=shiftDate(cursor,-1);}
 return {current,longest,readToday:set.has(today)};
}

/** Headline numbers for one period. Sessions are attributed to their saved date; time is split at local midnight. */
export function periodSummary(books:Book[],sessions:ReadingSession[],period:ReadingPeriod,today:string){
 const range=periodRange(period,today),daily=readingByDay(sessions).filter(d=>within(d.date,range)),own=sessions.filter(s=>within(s.date,range));
 const completions=completionsIn(books,range);
 return {range,seconds:daily.reduce((n,d)=>n+d.seconds,0),pages:daily.reduce((n,d)=>n+d.pages,0),readingDays:daily.filter(d=>d.seconds>0||d.pages>0).length,
  sessions:own.length,averageSessionSeconds:averageSessionSeconds(own),longest:longestSession(own),pace:readingPace(own),completions};
}

/** Consecutive periods ending at `today`, filled with real zeros where nothing was read. */
export function activitySeries(sessions:ReadingSession[],period:'week'|'month',count:number,today:string){
 const daily=readingByDay(sessions),starts:string[]=[];
 let start=period==='week'?weekDates(today)[0]:`${today.slice(0,7)}-01`;
 for(let i=0;i<count;i++){starts.unshift(start);start=period==='week'?shiftDate(start,-7):`${shiftDate(start,-1).slice(0,7)}-01`;}
 return starts.map((s,i)=>{const end=i+1<starts.length?shiftDate(starts[i+1],-1):periodRange(period==='week'?'week':'month',today)!.end,days=daily.filter(d=>d.date>=s&&d.date<=end);
  return {start:s,end,seconds:days.reduce((n,d)=>n+d.seconds,0),pages:days.reduce((n,d)=>n+d.pages,0),readingDays:days.filter(d=>d.seconds>0||d.pages>0).length};});
}

/** Per-book progress. The estimate uses the book's own pace and needs at least two timed sessions with pages. */
export function bookProgress(book:Book,sessions:ReadingSession[],position:number){
 const own=sessions.filter(s=>s.bookId===book.id),pace=readingPace(own),total=book.totalPages&&book.totalPages>0?book.totalPages:undefined;
 const clamped=total?Math.min(Math.max(position,0),total):Math.max(position,0),remaining=total?Math.max(total-clamped,0):undefined;
 const reliable=pace.pagesPerHour!==null&&pace.sessions>=2&&pace.seconds>=20*60;
 return {position:clamped,total,percent:total?Math.round(clamped/total*1000)/10:null,remaining,pace,
  estimatedSecondsRemaining:remaining!==undefined&&reliable&&book.status!=='finished'?remaining/pace.pagesPerHour!*3600:null,
  seconds:own.reduce((n,s)=>n+sessionSeconds(s),0),pages:own.reduce((n,s)=>n+(validPages(s.pages)?s.pages:0),0),sessions:own.length,averageSessionSeconds:averageSessionSeconds(own)};
}

/** Uninterrupted stretches long enough to ask "were you reading the whole time?". */
export const LONG_STRETCH_SECONDS=3*3600;
export type LongStretch={start:string;end:string;seconds:number;open:boolean};
export function unconfirmedLongStretch(timer:ReadingTimer|null,now:number,threshold=LONG_STRETCH_SECONDS,pendingEnd?:string):LongStretch|null{
 if(!timer)return null;const confirmed=new Set(timer.confirmedSince??[]);
 if(timer.phase==='running'&&timer.runningSince&&!confirmed.has(timer.runningSince)){
  const endMs=pendingEnd?Date.parse(pendingEnd):now,seconds=(endMs-Date.parse(timer.runningSince))/1000;
  if(seconds>threshold)return {start:timer.runningSince,end:new Date(endMs).toISOString(),seconds,open:true};
 }
 // Closed stretches are contiguous chunks of one run; an older app could have saved an overnight run.
 const runs:{start:string;end:string}[]=[];for(const s of [...timer.segments].sort((a,b)=>a.start.localeCompare(b.start))){const last=runs.at(-1);if(last&&last.end===s.start)last.end=s.end;else runs.push({...s});}
 for(const run of runs){const seconds=(Date.parse(run.end)-Date.parse(run.start))/1000;if(seconds>threshold&&!confirmed.has(run.start))return {start:run.start,end:run.end,seconds,open:false};}
 return null;
}
/** Segments with one stretch replaced by a corrected end (or removed). Earlier valid reading is untouched. */
export function correctStretch(segments:{start:string;end:string}[],stretch:LongStretch,end:string|null){
 const inside=(s:{start:string;end:string})=>s.start>=stretch.start&&s.end<=stretch.end,kept=segments.filter(s=>!inside(s));
 if(end===null)return kept;
 const endMs=Date.parse(end),startMs=Date.parse(stretch.start);if(!Number.isFinite(endMs)||endMs<=startMs)return kept;
 const pieces:{start:string;end:string}[]=[];let cursor=startMs;const last=Math.min(endMs,Date.parse(stretch.end));
 while(cursor<last){const next=Math.min(last,cursor+23*3600000);pieces.push({start:new Date(cursor).toISOString(),end:new Date(next).toISOString()});cursor=next;}
 return [...kept,...pieces].sort((a,b)=>a.start.localeCompare(b.start));
}
