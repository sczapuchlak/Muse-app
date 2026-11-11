/* eslint-disable @next/next/no-img-element -- covers are the reader's own external HTTPS URLs, as elsewhere in Books. */
'use client';
import {useMemo} from 'react';
import {shiftDate} from '@/lib/dates';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import {activeSeconds,endOfPeriod,validCoverUrl} from '@/lib/whimsy/books';
import {completionEvents} from '@/lib/whimsy/reading-stats';
import './CoverCalendar.css';

const SEASON=['winter','winter','spring','spring','spring','summer','summer','summer','autumn','autumn','autumn','winter'] as const;
const monthName=(m:string)=>new Intl.DateTimeFormat(undefined,{month:'long',timeZone:'UTC'}).format(new Date(`${m}-01T12:00:00Z`));
const longDay=(d:string)=>new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));
const minutes=(s:number)=>s>=3600?`${Math.floor(s/3600)} hr ${Math.round(s%3600/60)} min`:`${Math.max(1,Math.round(s/60))} min`;
const shiftMonth=(month:string,by:number)=>{const [y,m]=month.split('-').map(Number),d=new Date(Date.UTC(y,m-1+by,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;};

function Cover({book}:{book:Book|undefined}){
 return book?.coverUrl&&validCoverUrl(book.coverUrl)?<img src={book.coverUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"/>:<span className="muse-cal-cover-blank">{book?.title?.slice(0,22)??'Book'}</span>;
}

/**
 * The reading calendar (#135): each day you read shows the book itself. Two books split the day diagonally; more show
 * a count. A star marks the day a book was finished. Tapping a day shows its sittings. Built from saved sessions only.
 */
export function CoverCalendar({books,sessions,month,setMonth,selected,setSelected,today,onOpenBook}:{books:Book[];sessions:ReadingSession[];month:string;setMonth:(m:string)=>void;selected:string;setSelected:(d:string)=>void;today:string;onOpenBook?:(id:string)=>void}){
 const byId=useMemo(()=>new Map(books.map(b=>[b.id,b])),[books]);
 const first=`${month}-01`,last=endOfPeriod(first,'month'),length=Number(last.slice(-2)),offset=(new Date(`${first}T12:00:00Z`).getUTCDay()+6)%7;
 const days=useMemo(()=>{const map=new Map<string,{books:string[];seconds:number;pages:number;sessions:ReadingSession[]}>();for(const s of sessions){if(s.date<first||s.date>last)continue;const d=map.get(s.date)??{books:[],seconds:0,pages:0,sessions:[]};if(!d.books.includes(s.bookId))d.books.push(s.bookId);d.seconds+=activeSeconds(s.activeSegments);d.pages+=s.pages;d.sessions.push(s);map.set(s.date,d);}return map;},[sessions,first,last]);
 const finished=useMemo(()=>{const map=new Map<string,string[]>();for(const e of completionEvents(books)){const d=e.completion.finishedOn;if(!d||d<first||d>last)continue;map.set(d,[...(map.get(d)??[]),e.book.id]);}return map;},[books,first,last]);
 const pages=[...days.values()].reduce((n,d)=>n+d.pages,0),finishedCount=[...finished.values()].reduce((n,l)=>n+l.length,0),elapsed=month===today.slice(0,7)?Number(today.slice(-2)):length;
 const chosen=days.get(selected),chosenFinished=finished.get(selected)??[],season=SEASON[Number(month.slice(5,7))-1];
 return <section className="muse-cal" aria-labelledby="atlas-cal-title" data-season={season}>
  <header className="muse-cal-head">
   <div className="muse-cal-art" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/></div>
   <button type="button" className="muse-cal-nav" aria-label="Previous month" onClick={()=>setMonth(shiftMonth(month,-1))}>‹</button>
   <h3 id="atlas-cal-title"><span>{monthName(month)}</span><small>{month.slice(0,4)}</small></h3>
   <button type="button" className="muse-cal-nav" aria-label="Next month" disabled={month>=today.slice(0,7)} onClick={()=>setMonth(shiftMonth(month,1))}>›</button>
  </header>
  <dl className="muse-cal-stats">
   <div><dd className="type-numeric">{finishedCount}</dd><dt>{finishedCount===1?'book finished':'books finished'}</dt></div>
   <div><dd className="type-numeric">{pages.toLocaleString()}</dd><dt>pages</dt></div>
   <div><dd className="type-numeric">{elapsed?Math.round(pages/elapsed):0}</dd><dt>pages / day</dt></div>
  </dl>
  <ol className="muse-cal-grid">
   {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><li key={d} className="muse-cal-weekday" aria-hidden="true">{d}</li>)}
   {Array.from({length:offset},(_,i)=><li key={`e${i}`} aria-hidden="true"/>)}
   {Array.from({length},(_,i)=>shiftDate(first,i)).map(date=>{const day=days.get(date),ids=day?.books??[],done=finished.get(date)??[],shown=ids.length?ids:done;
    return <li key={date}><button type="button" className="muse-cal-day" data-read={ids.length?true:undefined} data-books={Math.min(shown.length,2)||undefined} data-today={date===today||undefined} data-future={date>today||undefined} aria-pressed={selected===date} aria-label={`${longDay(date)}${ids.length?`, read ${ids.map(id=>byId.get(id)?.title??'a book').join(' and ')}`:''}${done.length?', finished a book':''}`} onClick={()=>setSelected(date)}>
     {shown.slice(0,2).map((id,k)=><span key={id} className="muse-cal-cover" data-slot={k}><Cover book={byId.get(id)}/></span>)}
     <span className="muse-cal-date type-numeric">{Number(date.slice(-2))}</span>
     {done.length>0&&<span className="muse-cal-finished" aria-hidden="true">✦</span>}
     {shown.length>2&&<span className="muse-cal-more" aria-hidden="true">+{shown.length-2}</span>}
    </button></li>;})}
  </ol>
  <div className="muse-cal-detail" aria-live="polite">
   <strong>{longDay(selected)}</strong>
   {chosen?<><p className="muse-cal-detail-line">{chosen.seconds?minutes(chosen.seconds)+' · ':''}{chosen.pages} pages · {chosen.sessions.length} {chosen.sessions.length===1?'sitting':'sittings'}</p>
    <ul>{chosen.books.map(id=>{const b=byId.get(id),own=chosen.sessions.filter(s=>s.bookId===id);return <li key={id}><span className="muse-cal-detail-cover"><Cover book={b}/></span><span><button type="button" className="text-button" onClick={()=>onOpenBook?.(id)}>{b?.title??'Book'}</button><small>{own.reduce((n,s)=>n+s.pages,0)} pages{own.some(s=>s.notes)?` · “${own.find(s=>s.notes)!.notes!.slice(0,90)}”`:''}</small></span>{chosenFinished.includes(id)&&<em>Finished ✦</em>}</li>;})}</ul></>
   :chosenFinished.length?<p className="muse-cal-detail-line">Finished {chosenFinished.map(id=>byId.get(id)?.title).join(', ')} ✦</p>:<p className="muse-cal-detail-line">No reading recorded.</p>}
  </div>
 </section>;
}

/** The reading year: twelve months, each with the covers of the books finished in it. */
export function ReadingYear({books,year,onOpenMonth}:{books:Book[];year:string;onOpenMonth:(month:string)=>void}){
 const events=completionEvents(books).filter(e=>e.completion.finishedOn?.startsWith(year)).sort((a,b)=>(a.completion.finishedOn??'').localeCompare(b.completion.finishedOn??''));
 const months=Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`);
 return <section className="muse-year" aria-labelledby="atlas-year-title">
  <header><h3 id="atlas-year-title">{year} in books</h3><span className="type-numeric">{events.length} {events.length===1?'book':'books'} finished</span></header>
  <ol>{months.map(m=>{const list=events.filter(e=>e.completion.finishedOn?.startsWith(m));return <li key={m}><button type="button" onClick={()=>onOpenMonth(m)} aria-label={`${monthName(m)}: ${list.length} finished`}><span className="muse-year-month">{new Intl.DateTimeFormat(undefined,{month:'short',timeZone:'UTC'}).format(new Date(`${m}-01T12:00:00Z`))}</span><span className="muse-year-shelf">{list.length?list.slice(0,8).map((e,i)=><span key={`${e.book.id}-${i}`} className="muse-year-cover" title={e.book.title}><Cover book={e.book}/></span>):<span className="muse-year-empty"/>}{list.length>8&&<span className="muse-year-more">+{list.length-8}</span>}</span></button></li>;})}</ol>
 </section>;
}
