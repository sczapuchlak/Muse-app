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

/** Today's reading goal: minutes or pages read against the daily target, or a gentle prompt to set one. */
export function DailyGoal({goals,books,sessions,today,onSet}:{goals:ReadingGoal[];books:Book[];sessions:ReadingSession[];today:string;onSet:()=>void}){
 const goal=goals.find(g=>g.period==='day');
 if(!goal)return <div className="muse-dash-daily" data-empty><strong>A daily rhythm, if you want one</strong><p>Pick a few minutes or pages a day. Reading counts with or without a goal.</p><button type="button" className="muse-button button-primary" onClick={onSet}>Set a daily goal</button></div>;
 const progress=Math.round(goalProgress(goal,books,sessions,today)),percent=Math.min(100,Math.round(100*progress/goal.target)),unit=goal.unit==='minutes'?'min':goal.unit;
 return <div className="muse-dash-daily"><p className="muse-dash-daily-count"><strong className="type-numeric">{progress}</strong><span> / {goal.target} {unit} today</span></p>
  <span className="muse-desk-pool" style={{'--fill':`${Math.max(percent,percent?3:0)}%`} as CSSProperties} role="meter" aria-label="Today's reading goal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span/></span>
  <small className="muse-dash-daily-note">{percent>=100?'Goal reached today ✦':`${percent}% of today's goal`}</small></div>;
}

/** Recently read: the latest sittings, three at a time, with arrows for more. */
export function RecentActivity({books,sessions,onOpen}:{books:Book[];sessions:ReadingSession[];onOpen:(id:string)=>void}){
 const byId=new Map(books.map(b=>[b.id,b])),recent=[...sessions].sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)).slice(0,18);
 return <section className="muse-dash-card muse-dash-recent" aria-labelledby="dash-recent"><header><h3 id="dash-recent">Recently read</h3></header>
  {recent.length?<PagedList items={recent} size={3} label="recent sittings" className="muse-dash-recent-list" render={s=>{const b=byId.get(s.bookId);return <button type="button" role="listitem" key={s.id} onClick={()=>b&&onOpen(b.id)}><span className="muse-finished-cover" aria-hidden="true"><Cover book={b}/></span><span className="muse-finished-copy"><strong>{b?.title??'A book'}</strong><span>{yearDate(s.date)} · {s.pages} {s.pages===1?'page':'pages'}</span></span></button>;}}/>:<p>Your sittings show up here after the first one.</p>}</section>;
}
