'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {dateLabel,shiftDate,todayInTimeZone} from '@/lib/dates';
import type {Book,ReadingGoal,ReadingSession} from '@/lib/whimsy/models';
import {activeSeconds,bookPosition,bookReadingStats,endOfPeriod,goalProgress,goalWindow,readingSeries} from '@/lib/whimsy/books';
import {readingByDay} from '@/lib/whimsy/integrations';
import {activitySeries,bookProgress,inclusiveCalendarDays,periodRange,periodSummary,readingStreaks,type ReadingPeriod} from '@/lib/whimsy/reading-stats';
import {SessionHistory} from './SessionHistory';
import {MuseStar} from '@/components/MuseStar';
import {readingMilestones,milestoneCelebration,type MilestoneState} from '@/lib/whimsy/reading-dna';
import {ActivityBars,AtlasMetric,days,duration,hours,monthLabel,num,shortMonth,yearDate} from './atlas/parts';
import {ReadingDNA} from './atlas/ReadingDNA';
import {BooksMilestones} from './atlas/BooksMilestones';
import {YearInReview} from './atlas/YearInReview';

export type AtlasSection='overview'|'dna'|'books'|'year';
const sections:Record<AtlasSection,string>={overview:'Overview',dna:'Reading DNA',books:'Books & Milestones',year:'Year in Review'};

const periods={day:'Daily',week:'Weekly',month:'Monthly',year:'Yearly'};
const overviewPeriods:Record<ReadingPeriod,string>={today:'Today',week:'This week',month:'This month',year:'This year',all:'All time'};

export function ReadingAtlas({timeZone,books,sessions,goals,today,range,setRange,calendarMonth,setCalendarMonth,selectedDay,setSelectedDay,onAddGoal,onRemoveGoal,onEditSession,onDeleteSession,initialSection='overview',milestoneState,milestonesReady=false,onMilestonesSeen}:{initialSection?:AtlasSection;milestoneState?:MilestoneState;milestonesReady?:boolean;onMilestonesSeen?:(seen:string[])=>void;timeZone:string;books:Book[];sessions:ReadingSession[];goals:ReadingGoal[];today:string;range:ReadingGoal['period'];setRange:(range:ReadingGoal['period'])=>void;calendarMonth:string;setCalendarMonth:(month:string)=>void;selectedDay:string;setSelectedDay:(day:string)=>void;onAddGoal:()=>void;onRemoveGoal:(goal:ReadingGoal)=>void;onEditSession:(session:ReadingSession)=>void;onDeleteSession:(session:ReadingSession)=>void}){
 const [period,setPeriod]=useState<ReadingPeriod>('all'),[section,setSection]=useState<AtlasSection>(initialSection);
 // Milestones: celebrate only ones reached and never shown before (synced on the account); the first visit is a silent baseline.
 const milestones=readingMilestones(books,sessions),achieved=milestones.filter(m=>m.achievedOn).map(m=>m.id),{celebrate,nextSeen}=milestoneCelebration(achieved,milestoneState);
 const [celebrating,setCelebrating]=useState<string[]>([]),sent=useRef('');
 if(milestonesReady&&celebrate.some(id=>!celebrating.includes(id)))setCelebrating([...celebrating,...celebrate.filter(id=>!celebrating.includes(id))]);
 const unsaved=milestonesReady&&(!milestoneState||celebrate.length>0),key=JSON.stringify(nextSeen);
 useEffect(()=>{if(!unsaved||!onMilestonesSeen||sent.current===key)return;sent.current=key;onMilestonesSeen(JSON.parse(key));},[unsaved,key,onMilestonesSeen]);
 const daily=readingByDay(sessions),summary=periodSummary(books,sessions,period,today),streak=readingStreaks(sessions,today);
 const readingDaysIn=(p:ReadingPeriod)=>{const r=periodRange(p,today)!;return daily.filter(d=>d.date>=r.start&&d.date<=r.end&&(d.seconds>0||d.pages>0)).length;};
 const series=readingSeries(sessions,range),weekly=activitySeries(sessions,'week',12,today),monthly=activitySeries(sessions,'month',12,today);
 const shelf=books.filter(b=>!b.archivedAt),range_=periodRange(period,today);
 const monthStart=`${calendarMonth}-01`,monthEnd=endOfPeriod(monthStart,'month'),length=Number(monthEnd.slice(-2)),offset=(new Date(`${monthStart}T12:00:00Z`).getUTCDay()+6)%7,calendarDays=Array.from({length},(_,i)=>shiftDate(monthStart,i)),chosen=daily.find(d=>d.date===selectedDay),chosenSessions=sessions.filter(s=>s.date===selectedDay||chosen?.sessionIds.includes(s.id));
 const maxTime=Math.max(1,...series.map(s=>s.seconds)),maxPages=Math.max(1,...series.map(s=>s.pages)),maxDay=Math.max(1,...daily.map(d=>d.seconds||d.pages*60));
 const label=period==='all'?'all time':overviewPeriods[period].toLowerCase(),c=summary.completions;
 return <section className="muse-books-section" aria-label="Reading Atlas">
  <div className="muse-books-section-head"><div><h3>Reading Atlas</h3><p>A map of the time you spent among stories.</p></div><span className="small-label">Your reading, at a glance</span></div>
  {!sessions.length&&<div className="muse-empty-state muse-books-empty" data-variant="editorial"><h4>A reading life, taking shape.</h4><p>Your first logged session will bring time, pages, and rhythm into focus. Your shelf and goals are ready whenever you are.</p></div>}
  <div className="muse-atlas-sections" role="group" aria-label="Reading Atlas section">{(Object.keys(sections) as AtlasSection[]).map(id=><button key={id} type="button" aria-pressed={section===id} onClick={()=>setSection(id)}>{sections[id]}</button>)}</div>
  {celebrating.length>0&&<div className="muse-atlas-celebration" role="status"><span className="muse-finish-shimmer" aria-hidden="true"><MuseStar size={16}/><MuseStar size={11} color="aqua"/><MuseStar size={9} color="pink"/></span>
   <div><span className="small-label">{celebrating.length===1?'New milestone':'New milestones'}</span>{celebrating.map(id=>{const m=milestones.find(x=>x.id===id);return m?<strong key={id}>{m.title}{m.achievedOn?<small> · {yearDate(m.achievedOn)}</small>:null}</strong>:null;})}</div>
   <button type="button" className="text-button" onClick={()=>setCelebrating([])}>Dismiss</button></div>}
  {section!=='year'&&<div className="muse-books-atlas-period" role="group" aria-label="Statistics period">{(Object.keys(overviewPeriods) as ReadingPeriod[]).map(id=><button key={id} type="button" className="muse-button button-ghost" aria-pressed={period===id} onClick={()=>setPeriod(id)}>{overviewPeriods[id]}</button>)}</div>}
  {section==='dna'&&<ReadingDNA books={books} sessions={sessions} range={range_} label={label} today={today}/>}
  {section==='books'&&<BooksMilestones books={books} sessions={sessions} range={range_} label={label}/>}
  {section==='year'&&<YearInReview books={books} sessions={sessions} today={today}/>}
  {section==='overview'&&<>
  <div className="muse-books-stats muse-books-atlas-metrics" aria-live="polite">
   <AtlasMetric label="Reading time" value={summary.seconds?hours(summary.seconds):'—'} detail={summary.seconds?'Active time · pauses excluded':`No time recorded ${label}`}/>
   <AtlasMetric label="Pages read" value={summary.sessions?num(summary.pages):'—'} detail="From saved sessions"/>
   <AtlasMetric label="Books finished" value={String(c.count)} detail={c.count?`${c.uniqueTitles} ${c.uniqueTitles===1?'title':'titles'}${c.rereads?` · ${c.rereads} ${c.rereads===1?'reread':'rereads'}`:''}`:`None finished ${label}`}/>
   <AtlasMetric label="Reading days" value={summary.readingDays?String(summary.readingDays):'—'} detail="Each day counted once"/>
   <AtlasMetric label="Sessions" value={String(summary.sessions)} detail={summary.longest?`Longest ${duration(summary.longest.seconds)}`:'Saved reading sessions'}/>
   <AtlasMetric label="Average session" value={summary.averageSessionSeconds!==null?duration(summary.averageSessionSeconds):'—'} detail={summary.averageSessionSeconds!==null?'Timed sessions only':'No timed sessions yet'}/>
   <AtlasMetric label="Reading pace" value={summary.pace.pagesPerHour!==null?`${summary.pace.pagesPerHour.toFixed(1)} pages/h`:'—'} detail={summary.pace.pagesPerHour!==null?`From ${summary.pace.sessions} ${summary.pace.sessions===1?'session':'sessions'} with time and pages`:'Needs a session with both time and pages'}/>
   <AtlasMetric label="Current streak" value={days(streak.current)} detail={`Longest ${days(streak.longest)}${streak.current&&!streak.readToday?' · read today to keep it':''}`}/>
  </div>
  <p className="small-label muse-books-atlas-days">Reading days · this week {readingDaysIn('week')} · this month {readingDaysIn('month')} · this year {readingDaysIn('year')}</p>
  {/* Goals span the width; the two charts stack beside the calendar and stretch to its height (no gaps); rhythm, a list, spans the width below. */}
  <article className="muse-books-panel muse-books-goals-panel"><div className="muse-books-panel-head"><div><span className="small-label">A LITTLE INTENTION</span><h4>Your goals</h4></div><button type="button" className="muse-button button-ghost" onClick={onAddGoal}>+ Goal</button></div>{!goals.length?<p>No goals yet. Reading counts without one, too.</p>:<div className="muse-books-goals-grid">{goals.map(goal=>{const progress=goalProgress(goal,books,sessions,today),window=goalWindow(goal,today),percent=Math.round(progress/goal.target*100);return <div className="muse-books-goal" key={goal.id}><div><strong>{periods[goal.period]} · {goal.target} {goal.unit}</strong><span>{Math.round(progress)} / {goal.target} {goal.unit}</span></div><progress value={Math.min(progress,goal.target)} max={goal.target} aria-label={`${periods[goal.period]} goal: ${Math.round(progress)} of ${goal.target} ${goal.unit}`}/><small>{dateLabel(window.start)} – {dateLabel(window.end)}{goal.unit==='books'?' · each finished read counts':''}</small><div><span className="small-label">{percent>=100?'Goal reached ✦':`${percent}% of your goal`}</span><button type="button" className="text-button" onClick={()=>onRemoveGoal(goal)}>Remove goal</button></div></div>;})}</div>}</article>
  <div className="muse-atlas-overview-grid">
   <div className="muse-atlas-stack">
   <ActivityBars title="Reading time by week" note="Last 12 weeks · Monday to Sunday" items={weekly.map(w=>({key:w.start,label:dateLabel(w.start),short:w.start.slice(8),value:w.seconds,text:duration(w.seconds)}))}/>
   <ActivityBars title="Pages read by month" note="Last 12 months · pages stay on the session date" items={monthly.map(m=>({key:m.start,label:monthLabel(m.start.slice(0,7)),short:shortMonth(m.start),value:m.pages,text:`${m.pages} pages`}))}/>
   </div>
   <article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Reading calendar</h4><div className="muse-books-actions"><button type="button" className="text-button" aria-label="Previous month" onClick={()=>setCalendarMonth(shiftDate(monthStart,-1).slice(0,7))}>‹</button><span>{monthLabel(calendarMonth)}</span><button type="button" className="text-button" aria-label="Next month" onClick={()=>setCalendarMonth(shiftDate(monthEnd,1).slice(0,7))}>›</button></div></div><div className="muse-books-calendar-days" aria-hidden="true">{['M','T','W','T','F','S','S'].map((day,i)=><span key={i}>{day}</span>)}</div><div className="muse-books-calendar">{Array.from({length:offset},(_,i)=><span key={`blank-${i}`} aria-hidden="true"/>)}{calendarDays.map(date=>{const day=daily.find(d=>d.date===date),intensity=day&&(day.seconds>0||day.pages>0)?Math.max(1,Math.ceil((day.seconds||day.pages*60)/maxDay*3)):0;return <button key={date} type="button" data-intensity={intensity} aria-current={date===today?'date':undefined} aria-pressed={selectedDay===date} aria-label={`${dateLabel(date)}, ${day?`${duration(day.seconds)}, ${day.pages} pages`:'no reading recorded'}`} onClick={()=>setSelectedDay(date)}>{Number(date.slice(-2))}<span aria-hidden="true">{intensity?'✦':''}</span></button>;})}</div><div className="muse-books-calendar-detail" aria-live="polite"><strong>{dateLabel(selectedDay)}</strong><p>{chosen?`${duration(chosen.seconds)} · ${chosen.pages} pages · ${chosen.sessionIds.length} ${chosen.sessionIds.length===1?'session':'sessions'}`:'No reading recorded.'}</p>{chosenSessions.map(s=><p key={s.id}>{books.find(b=>b.id===s.bookId)?.title??'Book'} · {duration(activeSeconds(s.activeSegments))} · {s.pages} pages{s.reread?' · reread':''}</p>)}</div></article>
  </div>
   <article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Reading rhythm</h4><MuseChoiceMenu label="Period" valueLabel={periods[range]} options={Object.entries(periods).map(([id,text])=>({id,label:text}))} selectedIds={[range]} onSelect={id=>setRange(id as ReadingGoal['period'])}/></div>{!series.length?<p>Your rhythm begins with a saved session.</p>:<div className="muse-books-rhythm" role="list" aria-label="Reading time and pages by period">{series.slice(-16).map((item,index)=><div role="listitem" key={item.start} style={{'--reading-color':index%2?'var(--accent-secondary)':'var(--accent-primary)'} as CSSProperties}><div><span>{range==='year'?item.start.slice(0,4):range==='month'?monthLabel(item.start.slice(0,7)):range==='week'?`Week of ${yearDate(item.start)}`:yearDate(item.start)}</span><strong>{duration(item.seconds)} · {item.pages} pages · {item.sessions} {item.sessions===1?'session':'sessions'}</strong></div><progress value={item.seconds} max={maxTime} aria-label={`${item.start}: ${duration(item.seconds)}`}/><progress className="muse-books-page-bar" value={item.pages} max={maxPages} aria-label={`${item.start}: ${item.pages} pages`}/></div>)}</div>}<p className="small-label">Time and pages have separate scales. Active time crosses local midnight; pages stay on the session date.</p></article>
  <article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Books and progress</h4><span className="small-label">Position is separate from pages read</span></div>{!shelf.length?<p>Your books will find their place here.</p>:<div className="muse-books-progress-grid">{shelf.map(book=>{const p=bookProgress(book,sessions,bookPosition(book,sessions)),readingDays=bookReadingStats(book,sessions,today).readingDays,span=book.startedOn?inclusiveCalendarDays(book.startedOn,book.status==='finished'&&book.finishedOn?book.finishedOn:today):null;return <div className="muse-books-progress-book" key={book.id}><div><strong>{book.title}</strong><span>{book.author}</span></div>
   {book.status==='finished'?<><progress value={1} max={1} aria-label={`${book.title}: finished`}/><span>Finished{p.total?` · ${p.total} pages`:''}</span></>:p.total?<><progress value={p.position} max={p.total} aria-label={`${book.title}: page ${p.position} of ${p.total}`}/><span>Page {p.position} of {p.total} · {p.percent}% · {p.remaining} {p.remaining===1?'page':'pages'} left</span></>:<span>Page {p.position} · length not recorded</span>}
   <small>Added {dateLabel(todayInTimeZone(timeZone,new Date(book.createdAt)))} · Started {book.startedOn?dateLabel(book.startedOn):'not recorded'}</small>
   {p.sessions?<><span>{duration(p.seconds)} · {p.pages} pages read · {p.sessions} {p.sessions===1?'session':'sessions'}</span>
    <small>{readingDays} actual reading {readingDays===1?'day':'days'}{span!==null?` · ${days(span)} in reading span (inclusive)`:''}</small>
    <small>{p.pace.pagesPerHour!==null?`${p.pace.pagesPerHour.toFixed(1)} pages/hour`:'Pace needs a session with time and pages'}{p.averageSessionSeconds!==null?` · ${duration(p.averageSessionSeconds)} average session`:''}</small>
    {book.status!=='finished'&&p.total&&<small>{p.estimatedSecondsRemaining!==null?`About ${hours(p.estimatedSecondsRemaining)} left at your pace for this book`:'Time-left estimate appears after two timed sessions with pages'}</small>}</>:<span>No sessions logged for this book yet.</span>}</div>;})}</div>}</article>
  <SessionHistory sessions={sessions} books={books} onEdit={onEditSession} onDelete={onDeleteSession}/>
  </>}
 </section>;
}
