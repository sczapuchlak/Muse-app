'use client';
import {useState} from 'react';
import type {Book} from '@/lib/whimsy/models';
import type {DateRange} from '@/lib/whimsy/reading-stats';
import {completionEvents} from '@/lib/whimsy/reading-stats';
import {readOpinion} from '@/lib/whimsy/reading-cycles';
import {emojiRanking} from '@/lib/whimsy/reading-dna';
import {Cover} from './CoverCalendar';
import {ActivityBars,monthName,shortMonth} from './parts';

/** This year, or the latest year with a finished read when this one is still empty. */
const bestYear=(books:Book[],today:string,rated=false)=>{const years=completionEvents(books).filter(e=>e.completion.finishedOn&&(!rated||(readOpinion(e.book,e.completion).rating??0)>0)).map(e=>e.completion.finishedOn!.slice(0,4)).sort();return years.includes(today.slice(0,4))||!years.length?today.slice(0,4):years[years.length-1];};
const monthsOf=(year:string)=>Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`);

/** Cherry-style bookshelf for one year: each month is a stack of the covers finished in it. */
export function MonthShelf({books,today,onOpenBook}:{books:Book[];today:string;onOpenBook?:(id:string)=>void}){
 const [year,setYear]=useState(()=>bestYear(books,today));
 const events=completionEvents(books).filter(e=>e.completion.finishedOn?.startsWith(year)).sort((a,b)=>(a.completion.finishedOn??'').localeCompare(b.completion.finishedOn??''));
 const months=monthsOf(year),best=months.map(m=>events.filter(e=>e.completion.finishedOn?.startsWith(m)).length),top=Math.max(...best);
 return <article className="muse-books-panel muse-shelf-panel"><div className="muse-books-panel-head"><h4>Books a month</h4>
  <div className="muse-shelf-years"><button type="button" className="muse-button button-ghost" aria-label="Previous year" onClick={()=>setYear(String(Number(year)-1))}>‹</button><strong className="type-numeric">{year}</strong><button type="button" className="muse-button button-ghost" aria-label="Next year" disabled={year>=today.slice(0,4)} onClick={()=>setYear(String(Number(year)+1))}>›</button></div></div>
  {!events.length?<p>Nothing finished in {year} yet.</p>:<>
   <p className="muse-atlas-books-note">{events.length} {events.length===1?'book':'books'} finished{top>0?` · best month: ${monthName(months[best.indexOf(top)])}, ${top}`:''}</p>
   <ol className="muse-shelf" aria-label={`Books finished each month of ${year}`}>{months.map((m,k)=>{const list=events.filter(e=>e.completion.finishedOn?.startsWith(m)),shown=list.slice(-4);return <li key={m}>
    <div className="muse-shelf-stack">{list.length>shown.length&&<span className="muse-shelf-more">+{list.length-shown.length}</span>}{shown.map((e,i)=><button type="button" key={`${e.book.id}-${i}`} className="muse-shelf-book" title={e.book.title} aria-label={e.book.title} onClick={()=>onOpenBook?.(e.book.id)}><Cover book={e.book}/></button>)}</div>
    <span className="muse-shelf-month">{shortMonth(m)}</span><strong className="type-numeric">{best[k]||''}</strong></li>;})}</ol></>}
 </article>;
}

/** Average rating of the reads finished in each month of the year. */
export function RatingsByMonth({books,today}:{books:Book[];today:string}){
 const year=bestYear(books,today,true),events=completionEvents(books).map(e=>({e,rating:readOpinion(e.book,e.completion).rating??0})).filter(x=>x.rating>0&&x.e.completion.finishedOn?.startsWith(year));
 const items=monthsOf(year).map(m=>{const r=events.filter(x=>x.e.completion.finishedOn?.startsWith(m)),avg=r.length?r.reduce((n,x)=>n+x.rating,0)/r.length:0;return {key:m,label:`${monthName(m)} ${year}`,short:shortMonth(m),value:avg,text:r.length?`${avg.toFixed(1)}★ average · ${r.length} rated`:'No rated reads'};});
 return <ActivityBars title="Rating by month" note={`${year} · the average star rating of the reads finished each month`} items={items} unit="rating" max={5}/>;
}

/** The vibe of the period: the emojis you picked for finished reads, sized by how often. */
export function VibeCloud({books,range,label}:{books:Book[];range:DateRange|null;label:string}){
 const {ranking}=emojiRanking(books,range),top=ranking.slice(0,14),most=Math.max(1,...top.map(t=>t.books));
 return <article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Vibes</h4><span className="small-label">{label}</span></div>
  {!top.length?<p>Add emojis to your finished reads and their vibe collects here.</p>:<ul className="muse-vibes" aria-label="Emojis by finished books">{top.map(t=><li key={t.emoji} title={`${t.books} ${t.books===1?'book':'books'}`} style={{'--size':`${1.5+1.6*t.books/most}rem`} as React.CSSProperties}><span aria-hidden="true">{t.emoji}</span><small className="type-numeric">{t.books}</small></li>)}</ul>}
 </article>;
}
