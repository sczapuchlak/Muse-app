'use client';
import {useState,type CSSProperties,type ReactNode} from 'react';
import {MuseIcon} from '@/components/MuseIcon';
import type {Book,ReadingGoal,ReadingSession} from '@/lib/whimsy/models';

import {Cover} from './atlas/CoverCalendar';
import {completionEvents,cycleSessions,sessionSeconds} from '@/lib/whimsy/reading-stats';
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

const span=(seconds:number)=>{if(seconds<60)return seconds?'under a minute':'time not recorded';const m=Math.round(seconds/60),h=Math.floor(m/60);return h?`${h} h ${m%60} min`:`${m} min`;};

/** Recently finished: the books you finished lately, two cards at a time, with how long each took. */
export function RecentlyFinished({books,sessions,onOpen}:{books:Book[];sessions:ReadingSession[];onOpen:(id:string)=>void}){
 const finished=completionEvents(books).filter(e=>e.completion.finishedOn).sort((a,b)=>b.completion.finishedOn.localeCompare(a.completion.finishedOn)).slice(0,10).map(e=>{const own=cycleSessions(e.book,sessions,e.completion);return {...e,seconds:own.reduce((n,x)=>n+sessionSeconds(x),0),count:own.length};});
 return <section className="muse-dash-card muse-dash-finished" aria-labelledby="dash-finished"><header><h3 id="dash-finished">Recently finished</h3></header>
  {finished.length?<PagedList items={finished} size={2} cols={2} label="recently finished books" className="muse-finished-cards" render={f=><button type="button" role="listitem" key={`${f.book.id}:${f.completion.id}`} className="muse-finished-card" onClick={()=>onOpen(f.book.id)} title={f.book.title}>
    <span className="muse-finished-card-cover"><Cover book={f.book}/></span><strong>{f.book.title}</strong>
    <span className="muse-finished-card-meta type-numeric">{f.count?`${span(f.seconds)} · ${f.count} ${f.count===1?'session':'sessions'}`:'No sessions logged'}</span><small>{yearDate(f.completion.finishedOn)}</small></button>}/>
   :<div className="muse-finished-empty"><span className="muse-finished-empty-art" aria-hidden="true"><i/><i/><i/><b>✦</b></span><div><strong>No recently finished books</strong><p>When you finish one, it lands here with how long it took.</p></div></div>}</section>;
}

/** Recent reading sessions: the latest sittings, three at a time. */
export function RecentSessions({books,sessions,onOpen}:{books:Book[];sessions:ReadingSession[];onOpen:(id:string)=>void}){
 const byId=new Map(books.map(b=>[b.id,b])),recent=[...sessions].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)).slice(0,18);
 return <section className="muse-dash-card muse-dash-recent" aria-labelledby="dash-recent"><header><h3 id="dash-recent">Recent reading sessions</h3></header>
  {recent.length?<PagedList items={recent} size={3} cols={3} label="recent sittings" className="muse-dash-recent-list" render={s=>{const b=byId.get(s.bookId);return <button type="button" role="listitem" key={s.id} onClick={()=>b&&onOpen(b.id)}><span className="muse-finished-cover" aria-hidden="true"><Cover book={b}/></span><span className="muse-finished-copy"><strong>{b?.title??'A book'}</strong><span>{yearDate(s.date)} · {sessionSeconds(s)?span(sessionSeconds(s))+' · ':''}{s.pages} {s.pages===1?'page':'pages'}</span></span></button>;}}/>:<p>Your sittings show up here after the first one.</p>}</section>;
}
