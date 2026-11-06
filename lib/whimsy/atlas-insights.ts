/**
 * Reading Atlas: richer statistics (#50). Pure functions over canonical Bookshelf data; every result says what it
 * counts (reads, unique books or sessions), returns the books behind each figure for tap-through lists, and never
 * infers what was not recorded. These outputs are also the stable inputs for the future Living Universe engine.
 */
import {validTimeZone} from '@/lib/dates';
import type {Book,ReadingSession} from './models';
import {seriesProgress as collectionSeriesProgress,type Series,type SeriesMember,type MediaItem} from '@/lib/collections/models';
import {readOpinion} from './reading-cycles';
import {completionEvents,inclusiveCalendarDays} from './reading-stats';

type Range={start:string;end:string}|null;
const within=(date:string,range:Range)=>!range||(date>=range.start&&date<=range.end);
const readsIn=(books:Book[],range:Range)=>completionEvents(books).filter(e=>within(e.completion.finishedOn,range));
export type BookRef={bookId:string;title:string;finishedOn?:string};
const ref=(book:Book,finishedOn?:string):BookRef=>({bookId:book.id,title:book.title,...(finishedOn?{finishedOn}:{})});

// ---------- Ratings: finished reads that carry a rating (per read; rereads rate independently) ----------
export function ratingsDistribution(books:Book[],range:Range){
 const buckets=new Map<number,BookRef[]>();let unrated=0,sum=0,rated=0;
 for(const e of readsIn(books,range)){const r=readOpinion(e.book,e.completion).rating;if(r===undefined){unrated++;continue;}
  const key=Math.round(r*2)/2;buckets.set(key,[...(buckets.get(key)??[]),ref(e.book,e.completion.finishedOn)]);sum+=r;rated++;}
 const values=[5,4.5,4,3.5,3,2.5,2,1.5,1,.5].filter(v=>buckets.has(v)||Number.isInteger(v));
 return {rated,unrated,average:rated?Math.round(sum/rated*10)/10:null,buckets:values.map(value=>({value,reads:buckets.get(value)?.length??0,books:buckets.get(value)??[]}))};
}

// ---------- Rhythm: active seconds by local weekday × hour, from timed sessions only ----------
const clocks=new Map<string,Intl.DateTimeFormat>();
function weekdayHour(ms:number,zone:string){let f=clocks.get(zone);if(!f){f=new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});clocks.set(zone,f);}
 const p=Object.fromEntries(f.formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
 return {day:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(p.weekday),hour:Number(p.hour)%24,minute:Number(p.minute),second:Number(p.second)};}
export const weekdayLabels=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
/** Splits each active segment at local hour boundaries (so a session across midnight lands on both days). Manual or undated entries are excluded. */
export function readingRhythm(sessions:ReadingSession[],range:Range){
 const grid=Array.from({length:7},()=>Array<number>(24).fill(0));let timed=0,excluded=0;
 for(const s of sessions){if(!within(s.date,range))continue;if(s.manual||!s.activeSegments.length){excluded++;continue;}timed++;
  const zone=validTimeZone(s.timeZone)?s.timeZone:'UTC';
  for(const seg of s.activeSegments){let t=Date.parse(seg.start);const end=Date.parse(seg.end);if(!(end>t))continue;
   for(let guard=0;t<end&&guard<100000;guard++){const c=weekdayHour(t,zone),next=(3600-c.minute*60-c.second)*1000-(((t%1000)+1000)%1000),step=Math.min(end-t,Math.max(1000,next));if(c.day>=0)grid[c.day][c.hour]+=step/1000;t+=step;}}}
 const total=grid.flat().reduce((a,b)=>a+b,0);
 const byDay=grid.map(row=>row.reduce((a,b)=>a+b,0)),byHour=Array.from({length:24},(_,h)=>grid.reduce((n,row)=>n+row[h],0));
 const band=(from:number,to:number)=>byHour.slice(from,to).reduce((a,b)=>a+b,0);
 const bands={morning:band(5,12),afternoon:band(12,17),evening:band(17,22),lateNight:band(22,24)+band(0,5)};
 const top=(xs:number[])=>xs.indexOf(Math.max(...xs));
 return {grid,total,timedSessions:timed,excludedSessions:excluded,topDay:total?top(byDay):null,topHour:total?top(byHour):null,bands};
}

// ---------- Formats: finished reads by the book's recorded format; missing stays "not recorded" ----------
export const formatLabels={physical:'Print',ebook:'Ebook',audiobook:'Audiobook',unknown:'Not recorded'} as const;
export function formatBreakdown(books:Book[],range:Range){
 const rows=new Map<keyof typeof formatLabels,BookRef[]>();const reads=readsIn(books,range);
 for(const e of reads){const k=(e.book.format??'unknown') as keyof typeof formatLabels;rows.set(k,[...(rows.get(k)??[]),ref(e.book,e.completion.finishedOn)]);}
 return {reads:reads.length,rows:(Object.keys(formatLabels) as (keyof typeof formatLabels)[]).map(k=>({format:k,label:formatLabels[k],reads:rows.get(k)?.length??0,share:reads.length?Math.round((rows.get(k)?.length??0)/reads.length*100):0,books:rows.get(k)??[]}))};
}

// ---------- Finish speed: calendar days from a read's own start to its finish ----------
export const speedBands=[{id:'same',label:'Same day',max:1},{id:'week',label:'2–7 days',max:7},{id:'fortnight',label:'8–14 days',max:14},{id:'month',label:'15–30 days',max:30},{id:'season',label:'31–90 days',max:90},{id:'long',label:'Over 90 days',max:Infinity}] as const;
export function finishSpeed(books:Book[],range:Range){
 const timed:{days:number;book:BookRef}[]=[];let missingStart=0;
 for(const e of readsIn(books,range)){const start=e.completion.startedOn;if(!start||start>e.completion.finishedOn){missingStart++;continue;}const days=inclusiveCalendarDays(start,e.completion.finishedOn);if(days===null){missingStart++;continue;}timed.push({days,book:ref(e.book,e.completion.finishedOn)});}
 const sorted=[...timed].sort((a,b)=>a.days-b.days);
 const median=sorted.length?(sorted.length%2?sorted[(sorted.length-1)/2].days:Math.round((sorted[sorted.length/2-1].days+sorted[sorted.length/2].days)/2)):null;
 return {reads:timed.length,missingStart,typicalDays:median,fastest:sorted[0]??null,slowest:sorted.at(-1)??null,
  bands:speedBands.map((b,i)=>{const min=i?speedBands[i-1].max+1:1;const items=sorted.filter(x=>x.days>=min&&x.days<=b.max);return {id:b.id,label:b.label,reads:items.length,books:items.map(x=>x.book)};})};
}

// ---------- Authors: co-authors split; reads and unique books per author; new vs returning ----------
export function bookAuthors(book:Pick<Book,'author'>){return [...new Set((book.author??'').split(/\s*(?:,|&|\band\b|;)\s*/i).map(a=>a.trim()).filter(a=>a.length>1))];}
const authorKey=(a:string)=>a.toLocaleLowerCase('en').replace(/\s+/g,' ').replace(/\./g,'');
export function authorStats(books:Book[],range:Range){
 const all=completionEvents(books),rows=new Map<string,{author:string;reads:number;ids:Set<string>;first:string;books:BookRef[]}>();
 const firstEver=new Map<string,string>();for(const e of all)for(const a of bookAuthors(e.book)){const k=authorKey(a),d=e.completion.finishedOn;if(!firstEver.has(k)||d<firstEver.get(k)!)firstEver.set(k,d);}
 for(const e of all.filter(x=>within(x.completion.finishedOn,range)))for(const a of bookAuthors(e.book)){const k=authorKey(a);const r=rows.get(k)??{author:a,reads:0,ids:new Set<string>(),first:e.completion.finishedOn,books:[]};
  r.reads++;if(!r.ids.has(e.book.id)){r.ids.add(e.book.id);r.books.push(ref(e.book,e.completion.finishedOn));}if(e.completion.finishedOn<r.first)r.first=e.completion.finishedOn;rows.set(k,r);}
 const list=[...rows.entries()].map(([k,r])=>({author:r.author,reads:r.reads,books:r.ids.size,bookList:r.books,isNew:!range||firstEver.get(k)!>=range.start})).sort((a,b)=>b.reads-a.reads||b.books-a.books||a.author.localeCompare(b.author));
 return {authors:list,newAuthors:list.filter(a=>a.isNew).length,returningAuthors:list.filter(a=>!a.isNew).length,unknownAuthorReads:readsIn(books,range).filter(e=>!bookAuthors(e.book).length).length};
}

// ---------- Series: Collections' own series progress (one algorithm), limited to series that contain books ----------
export function bookSeries(books:Book[],series:Series[],members:SeriesMember[],media:MediaItem[]=[]){
 return series.filter(s=>members.some(m=>m.series_id===s.id&&m.book_id&&books.some(b=>b.id===m.book_id)))
  .map(s=>({series:s,progress:collectionSeriesProgress(s,members,books,media)}))
  .sort((a,b)=>(b.progress.percentage??0)-(a.progress.percentage??0)||a.series.title.localeCompare(b.series.title));
}
