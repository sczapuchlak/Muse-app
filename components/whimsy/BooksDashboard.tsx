'use client';
import {useState,type CSSProperties,type ReactNode} from 'react';
import {MuseIcon} from '@/components/MuseIcon';
import type {Book,ReadingGoal,ReadingSession} from '@/lib/whimsy/models';
import {goalProgress} from '@/lib/whimsy/books';
import {Cover} from './atlas/CoverCalendar';
import {PagedList} from './atlas/PagedList';
import {yearDate} from './atlas/parts';
import './BooksDashboard.css';

/** The goals card: one compact slide at a time (today's reading goal, the annual challenge), ready for more later. */
export function GoalsCarousel({slides}:{slides:{id:string;label:string;node:ReactNode}[]}){
 const [at,setAt]=useState(0),count=slides.length,current=Math.min(at,count-1);
 if(!count)return null;
 return <section className="muse-dash-goals" aria-roledescription="carousel" aria-label="Reading goals">
  <div className="muse-dash-goals-head"><span className="small-label">{slides[current].label}</span>
   {count>1&&<div className="muse-dash-goals-nav"><div className="muse-dash-dots" role="tablist" aria-label="Goal">{slides.map((s,i)=><button key={s.id} type="button" role="tab" aria-selected={i===current} aria-label={s.label} onClick={()=>setAt(i)}/>)}</div>
    <button type="button" className="muse-button button-ghost" aria-label="Previous goal" disabled={current===0} onClick={()=>setAt(current-1)}><MuseIcon name="chevron" size={14}/></button>
    <button type="button" className="muse-button button-ghost" aria-label="Next goal" disabled={current>=count-1} onClick={()=>setAt(current+1)}><MuseIcon name="chevron" size={14}/></button></div>}</div>
  <div className="muse-dash-goal-slide" aria-live="polite">{slides[current].node}</div>
 </section>;
}

/** Recently read: the latest sittings, three at a time, with arrows for more. */
export function RecentActivity({books,sessions,onOpen}:{books:Book[];sessions:ReadingSession[];onOpen:(id:string)=>void}){
 const byId=new Map(books.map(b=>[b.id,b])),recent=[...sessions].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)).slice(0,18);
 return <section className="muse-dash-card muse-dash-recent" aria-labelledby="dash-recent"><header><h3 id="dash-recent">Recently read</h3></header>
  {recent.length?<PagedList items={recent} size={3} label="recent sittings" className="muse-dash-recent-list" render={s=>{const b=byId.get(s.bookId);return <button type="button" role="listitem" key={s.id} onClick={()=>b&&onOpen(b.id)}><span className="muse-finished-cover" aria-hidden="true"><Cover book={b}/></span><span className="muse-finished-copy"><strong>{b?.title??'A book'}</strong><span>{yearDate(s.date)} · {s.pages} {s.pages===1?'page':'pages'}</span></span></button>;}}/>:<p>Your sittings show up here after the first one.</p>}</section>;
}
