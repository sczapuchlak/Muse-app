'use client';
import {useMemo,useState,type CSSProperties} from 'react';
import {shiftDate} from '@/lib/dates';
import {endOfPeriod} from '@/lib/whimsy/books';
import type {ReadingGoal,ReadingSession} from '@/lib/whimsy/models';
import {activeDailyGoal,goalStreak,minutesOn,monthlyConsistency,secondsByDay,targetOn} from '@/lib/whimsy/daily-goal';
import {readingDates} from '@/lib/whimsy/reading-stats';
import './GoalHistory.css';

const monthName=(m:string)=>new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${m}-01T12:00:00Z`));
const shortMonth=(m:string)=>new Intl.DateTimeFormat(undefined,{month:'short',timeZone:'UTC'}).format(new Date(`${m}-01T12:00:00Z`));
const shiftMonth=(m:string,by:number)=>{const [y,mo]=m.split('-').map(Number),d=new Date(Date.UTC(y,mo-1+by,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;};
const safeDays=(sessions:ReadingSession[])=>{try{return new Set(readingDates(sessions));}catch{return new Set(sessions.filter(s=>(s.pages??0)>0||s.activeSegments.length>0).map(s=>s.date));}};

/** The daily goal in the Atlas: a calendar of days that met the goal, goal streaks, days read versus days met, and a monthly view. */
export function GoalHistory({sessions,goals,today,onSetDailyGoal}:{sessions:ReadingSession[];goals:ReadingGoal[];today:string;onSetDailyGoal?:()=>void}){
 const goal=activeDailyGoal(goals),[month,setMonth]=useState(today.slice(0,7));
 const seconds=useMemo(()=>secondsByDay(sessions),[sessions]),read=useMemo(()=>safeDays(sessions),[sessions]);
 const detail=useMemo(()=>goalStreak(goal,seconds,read,today),[goal,seconds,read,today]),months=useMemo(()=>monthlyConsistency(goal,seconds,read,today,12),[goal,seconds,read,today]);
 if(!goal)return <section className="muse-goalhist muse-goalhist-empty" aria-label="Daily goal history"><div><h4>Daily goal history</h4><p>Set a daily minutes goal and this page fills with the days you met it, your goal streaks and how steady each month was.</p></div>{onSetDailyGoal&&<button type="button" className="muse-button button-primary" onClick={onSetDailyGoal}>Set a daily goal</button>}</section>;
 const first=`${month}-01`,last=endOfPeriod(first,'month'),length=Number(last.slice(-2)),offset=(new Date(`${first}T12:00:00Z`).getUTCDay()+6)%7,cells=Array.from({length},(_,i)=>shiftDate(first,i));
 const metInMonth=cells.filter(d=>detail.metDays.has(d)).length,readInMonth=cells.filter(d=>read.has(d)).length,top=Math.max(1,...months.map(m=>m.read));
 return <section className="muse-goalhist" aria-label="Daily goal history">
  <div className="muse-goalhist-cal">
   <header><h4>Daily goal</h4><div className="muse-goalhist-nav"><button type="button" className="muse-button button-ghost" aria-label="Previous month" onClick={()=>setMonth(shiftMonth(month,-1))}>‹</button><strong>{monthName(month)}</strong><button type="button" className="muse-button button-ghost" aria-label="Next month" disabled={month>=today.slice(0,7)} onClick={()=>setMonth(shiftMonth(month,1))}>›</button></div></header>
   <ol className="muse-goalhist-grid">{['M','T','W','T','F','S','S'].map((d,i)=><li key={`w${i}`} className="muse-goalhist-wd" aria-hidden="true">{d}</li>)}{Array.from({length:offset},(_,i)=><li key={`e${i}`} aria-hidden="true"/>)}
    {cells.map(date=>{const t=targetOn(goal,date),met=detail.metDays.has(date),did=read.has(date),mins=Math.floor(minutesOn(seconds,date));return <li key={date} data-state={date>today?'future':met?'met':did?'read':'none'} data-unjudged={t===null||undefined} data-today={date===today||undefined} title={`${date}: ${mins} min${t?` of ${t}`:''}`}><span>{Number(date.slice(-2))}</span><span className="sr-only">{met?'goal met':did?'read, goal not met':'no reading'}</span></li>;})}</ol>
   <p className="muse-goalhist-key"><span data-k="met"/>goal met <span data-k="read"/>read, under goal <span data-k="none"/>no reading</p>
  </div>
  <div className="muse-goalhist-side">
   <dl className="muse-goalhist-stats"><div><dt>Goal streak</dt><dd className="type-numeric">{detail.current}<small> {detail.current===1?'day':'days'}</small></dd></div><div><dt>Longest</dt><dd className="type-numeric">{detail.longest}<small> {detail.longest===1?'day':'days'}</small></dd></div><div><dt>{shortMonth(month)} read</dt><dd className="type-numeric">{readInMonth}<small> days</small></dd></div><div><dt>{shortMonth(month)} met</dt><dd className="type-numeric">{metInMonth}<small> of {readInMonth||0}</small></dd></div></dl>
   <div className="muse-goalhist-months" role="img" aria-label="Days read and days meeting the goal, by month">{months.map(m=><div key={m.month} title={`${monthName(m.month)}: ${m.read} days read, ${m.met} met the goal`}><span className="muse-goalhist-bar" style={{'--read':`${Math.round(100*m.read/top)}%`,'--met':`${m.read?Math.round(100*m.met/top):0}%`} as CSSProperties}><i/><b/></span><small>{shortMonth(m.month)}</small></div>)}</div>
   <p className="muse-goalhist-note">Lighter bar: days read. Bright bar: days that met that day’s goal. Past days keep the goal they had.</p>
  </div>
 </section>;
}
