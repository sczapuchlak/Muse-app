'use client';
import {useState,type CSSProperties} from 'react';
import {shiftDate} from '@/lib/dates';
import {endOfPeriod} from '@/lib/whimsy/books';
import type {ReadingSession} from '@/lib/whimsy/models';
import {streakDetail} from '@/lib/whimsy/reading-streak';
import {StreakHeart} from '../ReadingStreak';
import './Streaks.css';

const monthName=(month:string)=>new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`));
const short=(date:string)=>new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
const shortYear=(date:string)=>new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
const shiftMonth=(month:string,by:number)=>{const [y,m]=month.split('-').map(Number),d=new Date(Date.UTC(y,m-1+by,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;};
const WEEKDAYS=['M','T','W','T','F','S','S'];

/** The Reading Atlas streak view: current and longest streaks, a month of hearts, milestones and the longest runs. */
export function Streaks({sessions,today}:{sessions:ReadingSession[];today:string}){
 const detail=streakDetail(sessions,today),[month,setMonth]=useState(today.slice(0,7));
 const first=`${month}-01`,last=endOfPeriod(first,'month'),length=Number(last.slice(-2)),offset=(new Date(`${first}T12:00:00Z`).getUTCDay()+6)%7;
 const cells=Array.from({length},(_,i)=>shiftDate(first,i)),readInMonth=cells.filter(d=>detail.days.has(d)).length;
 const next=detail.nextMilestone,toNext=next?Math.round(100*detail.current/next):100;
 const runs=[...detail.runs].sort((a,b)=>b.length-a.length||b.end.localeCompare(a.end)).slice(0,3);
 return <div className="muse-atlas-streaks">
  <section className="muse-streaks-hero" aria-label="Your reading streak">
   <div className="muse-streaks-now"><span className="small-label">Current streak</span><strong className="type-numeric">{detail.current}</strong><span>{detail.current===1?'day':'days'}{detail.current>0&&!detail.readToday?' · read today to keep it':''}</span></div>
   <ol className="muse-streaks-week" aria-label="The last seven days">{detail.week.map(d=><li key={d.date}><StreakHeart filled={d.read} today={d.today} size={32}/><span>{new Intl.DateTimeFormat(undefined,{weekday:'short',timeZone:'UTC'}).format(new Date(`${d.date}T12:00:00Z`))}</span><span className="sr-only">{d.read?'read':'no reading'}</span></li>)}</ol>
   <dl className="muse-streaks-facts">
    <div><dt>Personal best</dt><dd className="type-numeric">{detail.longest}<small> days</small></dd></div>
    <div><dt>Reading days</dt><dd className="type-numeric">{detail.totalDays}<small> all time</small></dd></div>
    <div><dt>{next?`Next: ${next} days`:'Every milestone'}</dt><dd>{next?<span className="muse-streaks-pool" style={{'--fill':`${Math.max(toNext,4)}%`} as CSSProperties} role="progressbar" aria-valuemin={0} aria-valuemax={next} aria-valuenow={detail.current} aria-label={`${detail.current} of ${next} days`}><span/></span>:<span>reached ✦</span>}</dd></div>
   </dl>
  </section>

  <section className="muse-streaks-calendar" aria-labelledby="streak-month">
   <header><button type="button" className="muse-button button-ghost" aria-label="Previous month" onClick={()=>setMonth(shiftMonth(month,-1))}>‹</button><div><h4 id="streak-month">{monthName(month)}</h4><span>{readInMonth} reading {readInMonth===1?'day':'days'}</span></div><button type="button" className="muse-button button-ghost" aria-label="Next month" disabled={month>=today.slice(0,7)} onClick={()=>setMonth(shiftMonth(month,1))}>›</button></header>
   <ol className="muse-streaks-grid">
    {WEEKDAYS.map((d,i)=><li key={`w${i}`} className="muse-streaks-weekday" aria-hidden="true">{d}</li>)}
    {Array.from({length:offset},(_,i)=><li key={`e${i}`} aria-hidden="true"/>)}
    {cells.map(date=>{const read=detail.days.has(date),prev=detail.days.has(shiftDate(date,-1)),next_=detail.days.has(shiftDate(date,1));return <li key={date} data-read={read||undefined} data-future={date>today||undefined} data-today={date===today||undefined} data-run-start={read&&!prev||undefined} data-run-end={read&&!next_||undefined}>
     <span className="muse-streaks-date type-numeric">{Number(date.slice(-2))}</span>{read?<StreakHeart filled size={20}/>:null}<span className="sr-only">{read?' read':''}</span></li>;})}
   </ol>
  </section>

  <div className="muse-streaks-lower">
   <section className="muse-streaks-milestones" aria-labelledby="streak-milestones"><h4 id="streak-milestones">Milestones</h4>
    <ol>{detail.milestones.map(m=><li key={m.days} data-reached={m.reachedOn?true:undefined}><span className="muse-streaks-badge type-numeric">{m.days}</span><span><strong>{m.days}-day streak</strong><small>{m.reachedOn?`Reached ${shortYear(m.reachedOn)}`:next===m.days?`${m.days-detail.current} to go`:'Ahead of you'}</small></span></li>)}</ol>
   </section>
   <section className="muse-streaks-runs" aria-labelledby="streak-runs"><h4 id="streak-runs">Longest runs</h4>
    {runs.length?<ol>{runs.map((r,i)=><li key={r.start}><span className="muse-streaks-rank">{i+1}</span><strong className="type-numeric">{r.length} {r.length===1?'day':'days'}</strong><small>{r.length===1?short(r.start):`${short(r.start)} – ${shortYear(r.end)}`}{r.end===today||r.end===shiftDate(today,-1)?' · ongoing':''}</small></li>)}</ol>:<p className="small-label">Your first saved session starts the count.</p>}
   </section>
  </div>
  <p className="muse-streaks-note">A day counts when at least one reading session is saved for it, timed or logged by hand. Today never breaks a streak before midnight.</p>
 </div>;
}
