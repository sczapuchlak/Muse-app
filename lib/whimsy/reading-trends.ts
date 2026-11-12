import {shiftDate} from '@/lib/dates';
import type {Book,ReadingSession} from './models';
import {readingByDay} from './integrations';
import {completionEvents,sessionSeconds} from './reading-stats';

/**
 * The Dashboard's rolling last-30-days snapshot. Nothing is stored and nothing is a second tracker: every figure is
 * computed from the saved sessions and completions with the same per-day logic the Atlas and the reading streak use
 * (`readingByDay`: active time split at local midnight, pages on the session's own date; a reading day is a day with
 * time or pages). Finishes come from the same completion events the Atlas counts. An imported book with no sessions
 * is not a reading day; an import's recorded finish does count as a finish on its finish date, as in the Atlas.
 */
export const WINDOW_DAYS=30;
export type TrendKey='pages'|'time'|'finished'|'days';
export type TrendWindow={start:string;end:string};
export type Trend={key:TrendKey;current:number;previous:number;daily:number[];comparable:boolean};
export type Trends={today:string;current:TrendWindow;previous:TrendWindow;empty:boolean;hasHistory:boolean;pages:Trend;time:Trend;finished:Trend;days:Trend};

const inWindow=(date:string,w:TrendWindow)=>date>=w.start&&date<=w.end;

function perDay(sessions:readonly ReadingSession[]):Map<string,{seconds:number;pages:number}>{
 const out=new Map<string,{seconds:number;pages:number}>();
 try{for(const d of readingByDay([...sessions]))out.set(d.date,{seconds:d.seconds,pages:d.pages});return out;}
 catch{/* overlapping or malformed records: fall back to each session's own date, like the streak does */}
 for(const s of sessions){const d=out.get(s.date)??{seconds:0,pages:0};d.seconds+=sessionSeconds(s);d.pages+=s.pages??0;out.set(s.date,d);}
 return out;
}

export function readingTrends(books:readonly Book[],sessions:readonly ReadingSession[],today:string):Trends{
 const current:TrendWindow={start:shiftDate(today,-(WINDOW_DAYS-1)),end:today},previous:TrendWindow={start:shiftDate(today,-(2*WINDOW_DAYS-1)),end:shiftDate(today,-WINDOW_DAYS)};
 const days=perDay(sessions),finishes=completionEvents([...books]).map(e=>e.completion.finishedOn).filter((d):d is string=>!!d);
 const active=[...days].filter(([,v])=>v.seconds>0||v.pages>0).map(([d])=>d);
 const earliest=[...active,...finishes].sort()[0];
 // Compare only when some activity exists on or before the end of the previous window; otherwise these are the first days.
 const comparable=earliest!==undefined&&earliest<=previous.end;
 const series=(value:(date:string)=>number)=>Array.from({length:WINDOW_DAYS},(_,i)=>value(shiftDate(current.start,i)));
 const sum=(w:TrendWindow,value:(date:string)=>number)=>{let n=0;for(let i=0;i<WINDOW_DAYS;i++)n+=value(shiftDate(w.start,i));return n;};
 const pagesOn=(d:string)=>days.get(d)?.pages??0,secondsOn=(d:string)=>days.get(d)?.seconds??0,dayOn=(d:string)=>{const v=days.get(d);return v&&(v.seconds>0||v.pages>0)?1:0;};
 const finishedOn=(d:string)=>finishes.reduce((n,f)=>n+(f===d?1:0),0);
 const make=(key:TrendKey,value:(d:string)=>number):Trend=>({key,current:sum(current,value),previous:sum(previous,value),daily:series(value),comparable});
 const t={pages:make('pages',pagesOn),time:make('time',secondsOn),finished:make('finished',finishedOn),days:make('days',dayOn)};
 const empty=[t.pages,t.time,t.finished,t.days].every(x=>x.current===0&&x.previous===0);
 return {today,current,previous,empty,hasHistory:comparable,...t};
}

export type Movement={tone:'up'|'down'|'same'|'new'|'none';percent:number|null;diff:number};
/** How this period compares with the one before. A decrease is information, not a failure; no invented percentages. */
export function movement(t:Pick<Trend,'current'|'previous'|'comparable'>):Movement{
 const diff=t.current-t.previous;
 if(!t.comparable)return {tone:'none',percent:null,diff:0};
 if(diff===0)return {tone:'same',percent:t.previous===0?null:0,diff:0};
 if(t.previous===0)return {tone:'new',percent:null,diff};
 return {tone:diff>0?'up':'down',percent:Math.round(Math.abs(diff)/t.previous*100),diff};
}

const hm=(seconds:number)=>{const m=Math.round(seconds/60);if(m<1)return seconds>0?'under a minute':'0 min';const h=Math.floor(m/60);return h?`${h} h${m%60?` ${m%60} min`:''}`:`${m} min`;};
/** A value in the unit of its metric: "1,240 pages", "6 h 5 min", "3 books", "11 days". */
export function formatTrend(key:TrendKey,value:number){
 if(key==='time')return hm(value);
 const n=Math.round(value).toLocaleString('en-US');
 return key==='pages'?`${n} ${Math.round(value)===1?'page':'pages'}`:key==='finished'?`${n} ${Math.round(value)===1?'book':'books'}`:`${n} ${Math.round(value)===1?'day':'days'}`;
}
/** The quiet comparison line, warm and neutral. */
export function movementLine(key:TrendKey,m:Movement):string{
 const amount=formatTrend(key,Math.abs(m.diff));
 switch(m.tone){
  case 'none':return 'Your first 30 days: nothing to compare yet';
  case 'same':return 'The same as the 30 days before';
  case 'new':return `${amount} more than the 30 days before`;
  case 'up':return `${amount} more than the 30 days before`;
  default:return `${amount} fewer than the 30 days before`;
 }
}
export const movementBadge=(m:Movement)=>m.tone==='up'?`↗ ${m.percent}%`:m.tone==='down'?`↘ ${m.percent}%`:m.tone==='new'?'↗ new':m.tone==='same'?'→ steady':'';

/** Where each metric opens in the Reading Atlas. */
export const TREND_DESTINATIONS:Record<TrendKey,string>={
 pages:'/collections/reading-atlas?period=month&focus=pages',
 time:'/collections/reading-atlas?focus=time',
 finished:'/collections/reading-atlas?section=books&focus=completed',
 days:'/collections/reading-atlas?section=streak&focus=calendar',
};
