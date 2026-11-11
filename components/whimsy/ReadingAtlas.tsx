'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {useSearchParams} from 'next/navigation';
import {dateLabel,shiftDate,todayInTimeZone} from '@/lib/dates';
import type {Book,ReadingGoal,ReadingSession} from '@/lib/whimsy/models';
import {bookPosition,bookReadingStats,goalProgress,goalWindow,readingSeries} from '@/lib/whimsy/books';
import {readingByDay} from '@/lib/whimsy/integrations';
import {activitySeries,bookProgress,inclusiveCalendarDays,periodRange,periodSummary,readingStreaks,type ReadingPeriod} from '@/lib/whimsy/reading-stats';
import {SessionHistory} from './SessionHistory';
import {MuseStar} from '@/components/MuseStar';
import {readingMilestones,milestoneCelebration,type MilestoneState} from '@/lib/whimsy/reading-dna';
import {ActivityBars,days,duration,hours,monthLabel,num,shortMonth,yearDate} from './atlas/parts';
import {ReadingDNA} from './atlas/ReadingDNA';
import {BooksMilestones} from './atlas/BooksMilestones';
import {YearInReview} from './atlas/YearInReview';
import {ReadingChallenge} from './atlas/ReadingChallenge';
import {Patterns} from './atlas/Patterns';
import {Streaks} from './atlas/Streaks';
import {CoverCalendar,ReadingYear} from './atlas/CoverCalendar';
import {AlmanacWhisper} from '../almanac/AlmanacWhisper';
import {surfaces} from '@/lib/almanac/select';
import type {Signal} from '@/lib/almanac/types';
import type {CollectionsSnapshot} from '@/lib/collections/models';

export type AtlasSection='overview'|'streak'|'dna'|'patterns'|'books'|'year';
const sections:Record<AtlasSection,string>={overview:'Overview',streak:'Streaks',dna:'Reading DNA',patterns:'Patterns',books:'Books & Milestones',year:'Year in Review'};

const periods={day:'Daily',week:'Weekly',month:'Monthly',year:'Yearly'};
const overviewPeriods:Record<ReadingPeriod,string>={today:'Today',week:'This week',month:'This month',year:'This year',all:'All time'};

export function ReadingAtlas({timeZone,books,sessions,goals,today,range,setRange,calendarMonth,setCalendarMonth,selectedDay,setSelectedDay,onAddGoal,onRemoveGoal,onSaveChallenge,onOpenBook,challengeBusy=false,onEditSession,onDeleteSession,initialSection='overview',milestoneState,milestonesReady=false,onMilestonesSeen,collections,almanacSignals=[]}:{almanacSignals?:Signal[];collections?:Pick<CollectionsSnapshot,'series'|'seriesMembers'|'media'>;initialSection?:AtlasSection;milestoneState?:MilestoneState;milestonesReady?:boolean;onMilestonesSeen?:(seen:string[])=>void;timeZone:string;books:Book[];sessions:ReadingSession[];goals:ReadingGoal[];today:string;range:ReadingGoal['period'];setRange:(range:ReadingGoal['period'])=>void;calendarMonth:string;setCalendarMonth:(month:string)=>void;selectedDay:string;setSelectedDay:(day:string)=>void;onAddGoal:()=>void;onRemoveGoal:(goal:ReadingGoal)=>void;onSaveChallenge?:(year:string,target:number,existing:ReadingGoal|null)=>void;onOpenBook?:(bookId:string)=>void;challengeBusy?:boolean;onEditSession:(session:ReadingSession)=>void;onDeleteSession:(session:ReadingSession)=>void}){
 const searchParams=useSearchParams();
 const [period,setPeriod]=useState<ReadingPeriod>('all'),[section,setSection]=useState<AtlasSection>(()=>{const id=searchParams?.get('section');return id&&id in sections?id as AtlasSection:initialSection;});
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
 const maxTime=Math.max(1,...series.map(s=>s.seconds)),maxPages=Math.max(1,...series.map(s=>s.pages));
 const label=period==='all'?'all time':overviewPeriods[period].toLowerCase(),c=summary.completions;
 return <section className="muse-books-section" aria-label="Reading Atlas">
  {!sessions.length&&<div className="muse-empty-state muse-books-empty" data-variant="editorial"><h4>A reading life, taking shape.</h4><p>Your first logged session will bring time, pages, and rhythm into focus. Your shelf and goals are ready whenever you are.</p></div>}
  <div className="muse-atlas-sections" role="group" aria-label="Reading Atlas section">{(Object.keys(sections) as AtlasSection[]).map(id=><button key={id} type="button" aria-pressed={section===id} onClick={()=>setSection(id)}>{sections[id]}</button>)}</div>
  {celebrating.length>0&&<div className="muse-atlas-celebration" role="status"><span className="muse-finish-shimmer" aria-hidden="true"><MuseStar size={16}/><MuseStar size={11} color="aqua"/><MuseStar size={9} color="pink"/></span>
   <div><span className="small-label">{celebrating.length===1?'New milestone':'New milestones'}</span>{celebrating.map(id=>{const m=milestones.find(x=>x.id===id);return m?<strong key={id}>{m.title}{m.achievedOn?<small> · {yearDate(m.achievedOn)}</small>:null}</strong>:null;})}</div>
   <button type="button" className="text-button" onClick={()=>setCelebrating([])}>Dismiss</button></div>}
  {section==='streak'&&<Streaks sessions={sessions} today={today}/>}
  {section!=='year'&&section!=='streak'&&<div className="muse-books-atlas-period" role="group" aria-label="Statistics period">{(Object.keys(overviewPeriods) as ReadingPeriod[]).map(id=><button key={id} type="button" className="muse-button button-ghost" aria-pressed={period===id} onClick={()=>setPeriod(id)}>{overviewPeriods[id]}</button>)}</div>}
  {section==='dna'&&<ReadingDNA books={books} sessions={sessions} range={range_} label={label} today={today}/>}
  {section==='patterns'&&<Patterns books={books} sessions={sessions} range={range_} label={label} series={collections?.series??[]} seriesMembers={collections?.seriesMembers??[]} media={collections?.media??[]} onOpenBook={onOpenBook}/>}
  {section==='books'&&<BooksMilestones books={books} sessions={sessions} range={range_} label={label}/>}
  {section==='year'&&<YearInReview books={books} sessions={sessions} today={today} goals={goals}/>}
  {section==='overview'&&<><AlmanacWhisper surface={surfaces.atlas} signals={almanacSignals} today={today} className="muse-atlas-observations"/>
  <dl className="muse-atlas-ribbon" aria-live="polite">
   <div><dt>Reading time</dt><dd>{summary.seconds?hours(summary.seconds):'—'}</dd><span>{summary.seconds?'pauses excluded':`none ${label}`}</span></div>
   <div><dt>Pages</dt><dd className="type-numeric">{summary.sessions?num(summary.pages):'—'}</dd><span>from saved sittings</span></div>
   <div><dt>Books finished</dt><dd className="type-numeric">{c.count}</dd><span>{c.count?`${c.uniqueTitles} ${c.uniqueTitles===1?'title':'titles'}${c.rereads?` · ${c.rereads} reread${c.rereads===1?'':'s'}`:''}`:`none ${label}`}</span></div>
   <div><dt>Reading days</dt><dd className="type-numeric">{summary.readingDays||'—'}</dd><span>each day once</span></div>
  </dl>
  <ul className="muse-atlas-chips" aria-label="More about this period">
   <li><span>Sittings</span><strong className="type-numeric">{summary.sessions}</strong></li>
   {summary.averageSessionSeconds!==null&&<li><span>Average sitting</span><strong>{duration(summary.averageSessionSeconds)}</strong></li>}
   {summary.longest&&<li><span>Longest</span><strong>{duration(summary.longest.seconds)}</strong></li>}
   {summary.pace.pagesPerHour!==null&&summary.pace.sessions>=2&&<li><span>Pace</span><strong>{Math.round(summary.pace.pagesPerHour)} pages/hr</strong></li>}
   <li><a href="?section=streak" onClick={e=>{e.preventDefault();setSection('streak');}}><span>Streak</span><strong>{days(streak.current)}</strong><span aria-hidden="true">›</span></a></li>
  </ul>
  <p className="small-label muse-books-atlas-days">Reading days · this week {readingDaysIn('week')} · this month {readingDaysIn('month')} · this year {readingDaysIn('year')}</p>
  {/* Goals span the width; the two charts stack beside the calendar and stretch to its height (no gaps); rhythm, a list, spans the width below. */}
  {onSaveChallenge&&<ReadingChallenge variant="full" books={books} goals={goals} today={today} busy={challengeBusy} onSave={onSaveChallenge} onRemove={onRemoveGoal} onOpenBook={onOpenBook}/>}
  <article className="muse-books-panel muse-books-goals-panel"><div className="muse-books-panel-head"><div><span className="small-label">A LITTLE INTENTION</span><h4>Your goals</h4></div><button type="button" className="muse-button button-ghost" onClick={onAddGoal}>+ Goal</button></div>{!goals.length?<p>No goals yet. Reading counts without one, too.</p>:<div className="muse-books-goals-grid">{goals.map(goal=>{const progress=goalProgress(goal,books,sessions,today),window=goalWindow(goal,today),percent=Math.round(progress/goal.target*100);return <div className="muse-books-goal" key={goal.id}><div><strong>{periods[goal.period]} · {goal.target} {goal.unit}</strong><span>{Math.round(progress)} / {goal.target} {goal.unit}</span></div><progress value={Math.min(progress,goal.target)} max={goal.target} aria-label={`${periods[goal.period]} goal: ${Math.round(progress)} of ${goal.target} ${goal.unit}`}/><small>{dateLabel(window.start)} – {dateLabel(window.end)}{goal.unit==='books'?' · each finished read counts':''}</small><div><span className="small-label">{percent>=100?'Goal reached ✦':`${percent}% of your goal`}</span><button type="button" className="text-button" onClick={()=>onRemoveGoal(goal)}>Remove goal</button></div></div>;})}</div>}</article>
  <CoverCalendar books={books} sessions={sessions} month={calendarMonth} setMonth={setCalendarMonth} selected={selectedDay} setSelected={setSelectedDay} today={today} onOpenBook={onOpenBook}/>
  <ReadingYear books={books} year={calendarMonth.slice(0,4)} onOpenMonth={m=>{setCalendarMonth(m);if(typeof document!=='undefined')document.querySelector('.muse-cal')?.scrollIntoView({behavior:'smooth',block:'start'});}}/>
  <div className="muse-atlas-overview-grid">
   <div className="muse-atlas-stack">
   <ActivityBars title="Reading time by week" note="Last 12 weeks · each bar is a Monday-to-Sunday week, labelled by its Monday" items={weekly.map(w=>({key:w.start,label:`${dateLabel(w.start)} – ${dateLabel(shiftDate(w.start,6))}`,short:new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${w.start}T12:00:00Z`)),value:w.seconds,text:duration(w.seconds)}))}/>
   <ActivityBars title="Pages read by month" note="Last 12 months · pages stay on the session date" items={monthly.map(m=>({key:m.start,label:monthLabel(m.start.slice(0,7)),short:shortMonth(m.start),value:m.pages,text:`${m.pages} pages`}))}/>
   </div>
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
