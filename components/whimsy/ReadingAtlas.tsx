'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {useSearchParams} from 'next/navigation';
import {dateLabel,shiftDate} from '@/lib/dates';
import type {Book,ReadingGoal,ReadingSession} from '@/lib/whimsy/models';
import {goalProgress,goalWindow,readingSeries} from '@/lib/whimsy/books';
import {readingByDay} from '@/lib/whimsy/integrations';
import {activitySeries,periodRange,periodSummary,readingStreaks,type ReadingPeriod} from '@/lib/whimsy/reading-stats';
import {SessionHistory} from './SessionHistory';
import {MuseStar} from '@/components/MuseStar';
import {readingMilestones,milestoneCelebration,type MilestoneState} from '@/lib/whimsy/reading-dna';
import {ActivityBars,days,duration,hours,monthLabel,num,shortMonth,yearDate} from './atlas/parts';
import {ReadingDNA} from './atlas/ReadingDNA';
import {BooksMilestones} from './atlas/BooksMilestones';
import {YearInReview} from './atlas/YearInReview';
import {ReadingChallenge} from './atlas/ReadingChallenge';
import {Patterns} from './atlas/Patterns';
import {MonthShelf,RatingsByMonth,VibeCloud} from './atlas/Highlights';
import {Favourites} from './atlas/Favourites';
import {TopRated} from './atlas/TopRated';
import {completedBookSeries} from '@/lib/whimsy/books';
import {Streaks} from './atlas/Streaks';
import {CoverCalendar} from './atlas/CoverCalendar';
import {AlmanacWhisper} from '../almanac/AlmanacWhisper';
import {surfaces} from '@/lib/almanac/select';
import type {Signal} from '@/lib/almanac/types';
import type {CollectionsSnapshot} from '@/lib/collections/models';

export type AtlasSection='overview'|'streak'|'dna'|'patterns'|'books'|'year';
const sections:Record<AtlasSection,string>={overview:'Overview',streak:'Streaks',dna:'Reading DNA',patterns:'Patterns',books:'Books & Milestones',year:'Year in Review'};

const periods={day:'Daily',week:'Weekly',month:'Monthly',year:'Yearly'};
const overviewPeriods:Record<ReadingPeriod,string>={today:'Today',week:'This week',month:'This month',year:'This year',all:'All time'};

export function ReadingAtlas({books,sessions,goals,today,range,setRange,calendarMonth,setCalendarMonth,selectedDay,setSelectedDay,onAddGoal,onRemoveGoal,onSaveChallenge,onOpenBook,challengeBusy=false,onEditSession,onDeleteSession,initialSection='overview',milestoneState,milestonesReady=false,onMilestonesSeen,collections,almanacSignals=[]}:{almanacSignals?:Signal[];collections?:Pick<CollectionsSnapshot,'series'|'seriesMembers'|'media'>;initialSection?:AtlasSection;milestoneState?:MilestoneState;milestonesReady?:boolean;onMilestonesSeen?:(seen:string[])=>void;timeZone:string;books:Book[];sessions:ReadingSession[];goals:ReadingGoal[];today:string;range:ReadingGoal['period'];setRange:(range:ReadingGoal['period'])=>void;calendarMonth:string;setCalendarMonth:(month:string)=>void;selectedDay:string;setSelectedDay:(day:string)=>void;onAddGoal:()=>void;onRemoveGoal:(goal:ReadingGoal)=>void;onSaveChallenge?:(year:string,target:number,existing:ReadingGoal|null)=>void;onOpenBook?:(bookId:string)=>void;challengeBusy?:boolean;onEditSession:(session:ReadingSession)=>void;onDeleteSession:(session:ReadingSession)=>void}){
 const searchParams=useSearchParams();
 const [period,setPeriod]=useState<ReadingPeriod>('all'),[section,setSection]=useState<AtlasSection>(()=>{const id=searchParams?.get('section');return id&&id in sections?id as AtlasSection:initialSection;});
 // Milestones: celebrate only ones reached and never shown before (synced on the account); the first visit is a silent baseline.
 const milestones=readingMilestones(books,sessions),achieved=milestones.filter(m=>m.achievedOn).map(m=>m.id),{celebrate,nextSeen}=milestoneCelebration(achieved,milestoneState);
 const [celebrating,setCelebrating]=useState<string[]>([]),sent=useRef('');
 if(milestonesReady&&celebrate.some(id=>!celebrating.includes(id)))setCelebrating([...celebrating,...celebrate.filter(id=>!celebrating.includes(id))]);
 const unsaved=milestonesReady&&(!milestoneState||celebrate.length>0),key=JSON.stringify(nextSeen);
 useEffect(()=>{if(!unsaved||!onMilestonesSeen||sent.current===key)return;sent.current=key;onMilestonesSeen(JSON.parse(key));},[unsaved,key,onMilestonesSeen]);
 const daily=readingByDay(sessions),summary=periodSummary(books,sessions,period,today),streak=readingStreaks(sessions,today);
 const series=readingSeries(sessions,range),weekly=activitySeries(sessions,'week',12,today),monthly=activitySeries(sessions,'month',12,today);
 const range_=periodRange(period,today);
 const yearlyBooks=completedBookSeries(books,'year').slice(-10);
 const goalPeriod:Partial<Record<ReadingPeriod,ReadingGoal['period']>>={today:'day',week:'week',month:'month',year:'year'},shownGoals=goalPeriod[period]?goals.filter(g=>g.period===goalPeriod[period]):goals;
 const periodDays=range_?Array.from({length:Math.min(62,(Date.parse(`${range_.end}T00:00:00Z`)-Date.parse(`${range_.start}T00:00:00Z`))/86400000+1)},(_,i)=>{const date=shiftDate(range_.start,i),d=daily.find(x=>x.date===date);return {date,seconds:d?.seconds??0,pages:d?.pages??0};}):[];
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
  {section==='books'&&<BooksMilestones books={books} sessions={sessions} range={range_} label={label} onOpenBook={onOpenBook}/>}
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
  {/* Everything below follows the chosen period: a day shows the day, a week its days, a month its calendar, a year its months. */}
  {(period==='month'||period==='year'||period==='all')&&<div className="muse-atlas-calwrap">
   <CoverCalendar books={books} sessions={sessions} month={calendarMonth} setMonth={setCalendarMonth} today={today} onOpenBook={onOpenBook} lockView={period==='month'?'month':period==='year'?'year':undefined}/>
   <div className="muse-atlas-stack">
   {onSaveChallenge&&(period==='year'||period==='all')&&<ReadingChallenge variant="full" books={books} goals={goals} today={today} busy={challengeBusy} onSave={onSaveChallenge} onRemove={onRemoveGoal} onOpenBook={onOpenBook}/>}
  <article className="muse-books-panel muse-books-goals-panel"><div className="muse-books-panel-head"><div><span className="small-label">A LITTLE INTENTION</span><h4>Your goals</h4></div><button type="button" className="muse-button button-ghost" onClick={onAddGoal}>+ Goal</button></div>{!shownGoals.length?<p>{goals.length?`No ${label} goals. Reading counts without one.`:'No goals yet. Reading counts without one, too.'}</p>:<div className="muse-books-goals-grid">{shownGoals.map(goal=>{const progress=goalProgress(goal,books,sessions,today),window=goalWindow(goal,today),percent=Math.round(progress/goal.target*100);return <div className="muse-books-goal" key={goal.id}><div><strong>{periods[goal.period]} · {goal.target} {goal.unit}</strong><span>{Math.round(progress)} / {goal.target} {goal.unit}</span></div><progress value={Math.min(progress,goal.target)} max={goal.target} aria-label={`${periods[goal.period]} goal: ${Math.round(progress)} of ${goal.target} ${goal.unit}`}/><small>{dateLabel(window.start)} – {dateLabel(window.end)}{goal.unit==='books'?' · each finished read counts':''}</small><div><span className="small-label">{percent>=100?'Goal reached ✦':`${percent}% of your goal`}</span><button type="button" className="text-button" onClick={()=>onRemoveGoal(goal)}>Remove goal</button></div></div>;})}</div>}</article>
   </div>
  </div>}
  {(period==='today'||period==='week')&&<div className="muse-atlas-calwrap">
   {period==='week'?<ActivityBars unit="time" title="Reading time by day" note="This week, Monday to Sunday · pages stay on the session date" items={periodDays.map(d=>({key:d.date,label:dateLabel(d.date),short:new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'UTC'}).format(new Date(`${d.date}T12:00:00Z`)),value:d.seconds,text:`${duration(d.seconds)} · ${d.pages} pages`}))}/>
   :<article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Read today</h4></div>{(()=>{const todays=sessions.filter(x=>x.date===today),ids=[...new Set(todays.map(x=>x.bookId))];return !ids.length?<p>Nothing logged yet today.</p>:<ul className="muse-atlas-today">{ids.map(id=>{const b=books.find(x=>x.id===id);return <li key={id}><button type="button" className="text-button" onClick={()=>onOpenBook?.(id)}>{b?.title??'A book'}</button><span>{todays.filter(x=>x.bookId===id).reduce((n,x)=>n+x.pages,0)} pages</span></li>;})}</ul>;})()}</article>}
   <div className="muse-atlas-stack">
  <article className="muse-books-panel muse-books-goals-panel"><div className="muse-books-panel-head"><div><span className="small-label">A LITTLE INTENTION</span><h4>Your goals</h4></div><button type="button" className="muse-button button-ghost" onClick={onAddGoal}>+ Goal</button></div>{!shownGoals.length?<p>{goals.length?`No ${label} goals. Reading counts without one.`:'No goals yet. Reading counts without one, too.'}</p>:<div className="muse-books-goals-grid">{shownGoals.map(goal=>{const progress=goalProgress(goal,books,sessions,today),window=goalWindow(goal,today),percent=Math.round(progress/goal.target*100);return <div className="muse-books-goal" key={goal.id}><div><strong>{periods[goal.period]} · {goal.target} {goal.unit}</strong><span>{Math.round(progress)} / {goal.target} {goal.unit}</span></div><progress value={Math.min(progress,goal.target)} max={goal.target} aria-label={`${periods[goal.period]} goal: ${Math.round(progress)} of ${goal.target} ${goal.unit}`}/><small>{dateLabel(window.start)} – {dateLabel(window.end)}{goal.unit==='books'?' · each finished read counts':''}</small><div><span className="small-label">{percent>=100?'Goal reached ✦':`${percent}% of your goal`}</span><button type="button" className="text-button" onClick={()=>onRemoveGoal(goal)}>Remove goal</button></div></div>;})}</div>}</article>
   </div>
  </div>}
  <div className="muse-atlas-books-pair"><TopRated books={books} range={range_} label={label} onOpenBook={onOpenBook}/><Favourites books={books} range={range_} label={label} onOpenBook={onOpenBook}/></div>
  {(period==='year'||period==='all')&&<MonthShelf books={books} today={today} onOpenBook={onOpenBook}/>}
  <div className="muse-atlas-books-pair"><VibeCloud books={books} range={range_} label={label}/>{(period==='year'||period==='all')&&<RatingsByMonth books={books} today={today}/>}</div>
  {(period==='year'||period==='all')&&<ActivityBars line title="Books finished by year" note="Every year of your history · the line follows the ups and downs" items={yearlyBooks.map(y=>({key:y.start,label:y.start.slice(0,4),short:y.start.slice(0,4),value:y.count,text:`${y.count} ${y.count===1?'book':'books'}`}))}/>}
  {period==='month'&&<ActivityBars title="Pages by day" note="This month · each bar is a day" items={periodDays.map(d=>({key:d.date,label:dateLabel(d.date),short:String(Number(d.date.slice(-2))),value:d.pages,text:`${d.pages} pages`}))}/>}
  {period==='year'&&<ActivityBars title="Pages by month" note="This year · pages stay on the session date" items={Array.from({length:12},(_,i)=>`${today.slice(0,4)}-${String(i+1).padStart(2,'0')}`).map(m=>({key:m,label:monthLabel(m),short:shortMonth(m),value:monthly.find(x=>x.start.startsWith(m))?.pages??0,text:`${monthly.find(x=>x.start.startsWith(m))?.pages??0} pages`}))}/>}
  {period==='all'&&<div className="muse-atlas-overview-grid"><div className="muse-atlas-stack">
   <ActivityBars unit="time" title="Reading time by week" note="Last 12 weeks · each bar is a Monday-to-Sunday week, labelled by its Monday" items={weekly.map(w=>({key:w.start,label:`${dateLabel(w.start)} – ${dateLabel(shiftDate(w.start,6))}`,short:new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${w.start}T12:00:00Z`)),value:w.seconds,text:duration(w.seconds)}))}/>
   <ActivityBars title="Pages read by month" note="Last 12 months · pages stay on the session date" items={monthly.map(m=>({key:m.start,label:monthLabel(m.start.slice(0,7)),short:shortMonth(m.start),value:m.pages,text:`${m.pages} pages`}))}/>
   </div></div>}
  {period==='all'&&<article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Reading rhythm</h4><MuseChoiceMenu label="Period" valueLabel={periods[range]} options={Object.entries(periods).map(([id,text])=>({id,label:text}))} selectedIds={[range]} onSelect={id=>setRange(id as ReadingGoal['period'])}/></div>{!series.length?<p>Your rhythm begins with a saved session.</p>:<div className="muse-books-rhythm" role="list" aria-label="Reading time and pages by period">{series.slice(-16).map((item,index)=><div role="listitem" key={item.start} style={{'--reading-color':index%2?'var(--accent-secondary)':'var(--accent-primary)'} as CSSProperties}><div><span>{range==='year'?item.start.slice(0,4):range==='month'?monthLabel(item.start.slice(0,7)):range==='week'?`Week of ${yearDate(item.start)}`:yearDate(item.start)}</span><strong>{duration(item.seconds)} · {item.pages} pages · {item.sessions} {item.sessions===1?'session':'sessions'}</strong></div><progress value={item.seconds} max={maxTime} aria-label={`${item.start}: ${duration(item.seconds)}`}/><progress className="muse-books-page-bar" value={item.pages} max={maxPages} aria-label={`${item.start}: ${item.pages} pages`}/></div>)}</div>}<p className="small-label">Time and pages have separate scales. Active time crosses local midnight; pages stay on the session date.</p></article>}
  <SessionHistory sessions={sessions} books={books} onEdit={onEditSession} onDelete={onDeleteSession}/>
  </>}
 </section>;
}
