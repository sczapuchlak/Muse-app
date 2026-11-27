'use client';
import {AtlasMark} from './atlas/parts';
import './ReadingDesk.css';
import './atlas/AtlasV2.css';
import './goals/DashV3.css';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {MonthBooksModal,YearBooksModal} from './atlas/BooksOfYear';
import {useSearchParams} from 'next/navigation';
import {dateLabel,shiftDate} from '@/lib/dates';
import type {Book,ReadingGoal,ReadingSession} from '@/lib/whimsy/models';
import {goalProgress,goalWindow,readingSeries} from '@/lib/whimsy/books';
import {readingByDay} from '@/lib/whimsy/integrations';
import {activitySeries,periodRange,periodSummary,readingStreaks,type ReadingPeriod} from '@/lib/whimsy/reading-stats';
import {SessionHistory} from './SessionHistory';
import {MuseStar} from '@/components/MuseStar';
import {MuseIcon} from '@/components/MuseIcon';
import {readingMilestones,milestoneCelebration,type MilestoneState} from '@/lib/whimsy/reading-dna';
import {ActivityBars,compactTime,days,duration,hours,monthLabel,num,shortMonth,yearDate} from './atlas/parts';
import {ReadingDNA} from './atlas/ReadingDNA';
import {BooksMilestones} from './atlas/BooksMilestones';
import {YearInReview} from './atlas/YearInReview';
import {ReadingChallenge} from './atlas/ReadingChallenge';
import {Patterns} from './atlas/Patterns';
import {RatingsByMonth} from './atlas/Highlights';
import {Favorites} from './atlas/Favourites';
import {PagedList} from './atlas/PagedList';
import {EmojiBoard} from './atlas/EmojiBoard';
import {TopRated} from './atlas/TopRated';
import {completedBookSeries} from '@/lib/whimsy/books';
import {completionEvents} from '@/lib/whimsy/reading-stats';
import {Cover} from './atlas/CoverCalendar';
import {AtlasBand} from './atlas/AtlasBand';
import {OverviewHighlights} from './atlas/Highlights3';
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

export function ReadingAtlas({books,sessions,goals,today,range,setRange,calendarMonth,setCalendarMonth,selectedDay,setSelectedDay,onAddGoal,onSetDailyGoal,onRemoveGoal,onSaveChallenge,onOpenBook,challengeBusy=false,onEditSession,onDeleteSession,initialSection='overview',milestoneState,milestonesReady=false,onMilestonesSeen,collections,almanacSignals=[]}:{almanacSignals?:Signal[];collections?:Pick<CollectionsSnapshot,'series'|'seriesMembers'|'media'>;initialSection?:AtlasSection;milestoneState?:MilestoneState;milestonesReady?:boolean;onMilestonesSeen?:(seen:string[])=>void;timeZone:string;books:Book[];sessions:ReadingSession[];goals:ReadingGoal[];today:string;range:ReadingGoal['period'];setRange:(range:ReadingGoal['period'])=>void;calendarMonth:string;setCalendarMonth:(month:string)=>void;selectedDay:string;setSelectedDay:(day:string)=>void;onAddGoal:()=>void;onSetDailyGoal?:()=>void;onRemoveGoal:(goal:ReadingGoal)=>void;onSaveChallenge?:(year:string,target:number,existing:ReadingGoal|null)=>void;onOpenBook?:(bookId:string)=>void;challengeBusy?:boolean;onEditSession:(session:ReadingSession)=>void;onDeleteSession:(session:ReadingSession)=>void}){
 const searchParams=useSearchParams(),focus=searchParams?.get('focus')??'';
 const [period,setPeriod]=useState<ReadingPeriod>(()=>{const p=searchParams?.get('period');return p==='week'||p==='month'||p==='year'||p==='all'?p:'all';}),[section,setSection]=useState<AtlasSection>(()=>{const id=searchParams?.get('section');return id&&id in sections?id as AtlasSection:initialSection;});
 /** A deep link (`?focus=`) scrolls to its panel once the Atlas has drawn it. */
 useEffect(()=>{if(!focus)return;let tries=0;const go=()=>{const el=document.getElementById(`atlas-${focus}`);if(el){el.scrollIntoView({block:'start',behavior:'smooth'});el.setAttribute('data-focused','true');return;}if(++tries<30)timer=window.setTimeout(go,100);};let timer=window.setTimeout(go,150);return()=>window.clearTimeout(timer);},[focus]);
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
 const goalPeriod:Partial<Record<ReadingPeriod,ReadingGoal['period']>>={today:'day',week:'week',month:'month',year:'year'};
 const periodDays=range_?Array.from({length:Math.min(62,(Date.parse(`${range_.end}T00:00:00Z`)-Date.parse(`${range_.start}T00:00:00Z`))/86400000+1)},(_,i)=>{const date=shiftDate(range_.start,i),d=daily.find(x=>x.date===date);return {date,seconds:d?.seconds??0,pages:d?.pages??0};}):[];
 const maxTime=Math.max(1,...series.map(s=>s.seconds)),maxPages=Math.max(1,...series.map(s=>s.pages));
 const label=period==='all'?'all time':overviewPeriods[period].toLowerCase(),c=summary.completions;
 const elapsed=range_?Math.max(1,Math.round((Date.parse(`${(today<range_.end?today:range_.end)}T00:00:00Z`)-Date.parse(`${range_.start}T00:00:00Z`))/86400000)+1):0;
 /** Your goals (Atlas V2): one compact row per goal (what, progress, the window), a carousel past three; remove is a small ×. */
 const goalsPanel=<article className="muse-books-panel muse-books-goals-panel muse-atlas-goals"><div className="muse-books-panel-head"><h4><AtlasMark title="Your goals"/>Your goals</h4><button type="button" className="muse-button button-ghost muse-atlas-goal-add" onClick={onAddGoal}><MuseIcon name="plus" size={13}/>Goal</button></div>{!goals.length?<p>No goals yet. Reading counts without one, too.</p>:<PagedList items={[...goals].sort((a,b)=>['year','month','week','day'].indexOf(a.period)-['year','month','week','day'].indexOf(b.period))} size={3} label="goals" className="muse-atlas-goal-rows" render={goal=>{const progress=goalProgress(goal,books,sessions,today),window=goalWindow(goal,today),percent=Math.min(100,Math.round(progress/goal.target*100));return <div role="listitem" className="muse-atlas-goal" key={goal.id}><div className="muse-atlas-goal-top"><strong>{periods[goal.period]} · {goal.target} {goal.unit}</strong><span className="type-numeric"><b>{Math.round(progress)}</b> / {goal.target}</span><button type="button" className="muse-atlas-goal-x" aria-label={`Remove the ${periods[goal.period].toLowerCase()} goal`} title="Remove goal" onClick={()=>onRemoveGoal(goal)}><MuseIcon name="close" size={12}/></button></div><span className="muse-dv3-meter" role="meter" aria-label={`${periods[goal.period]} goal: ${Math.round(progress)} of ${goal.target} ${goal.unit}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} style={{'--fill':`${percent?Math.max(percent,3):0}%`} as CSSProperties}><i/></span><small>{percent>=100?'Goal reached ✦':`${percent}%`} · {dateLabel(window.start)} – {dateLabel(window.end)}</small></div>;}}/>}</article>;
 const usesPeriod=section!=='year'&&section!=='streak',periodIds=(Object.keys(overviewPeriods) as ReadingPeriod[]).filter(id=>id!=='today');
 const weekItems=weekly.map(w=>({key:w.start,label:`${dateLabel(w.start)} – ${dateLabel(shiftDate(w.start,6))}`,short:new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${w.start}T12:00:00Z`)),value:w.seconds,text:duration(w.seconds)}));
 const yearMonths=Array.from({length:12},(_,i)=>`${today.slice(0,4)}-${String(i+1).padStart(2,'0')}`);
 return <section className="muse-books-section muse-atlas-v2" data-section={section} aria-label="Reading Atlas">
  {!sessions.length&&<div className="muse-empty-state muse-books-empty" data-variant="editorial"><h4>A reading life, taking shape.</h4><p>Your first logged session will bring time, pages, and rhythm into focus. Your shelf and goals are ready whenever you are.</p></div>}
  {/* Atlas V2: one toolbar. Sections on the left, the timeframe on the right (a menu on phones); sections without a
      timeframe (Streaks, Year in Review) simply have none. */}
  <div className="muse-atlas-toolbar">
   <div className="muse-atlas-sections" role="group" aria-label="Reading Atlas section">{(Object.keys(sections) as AtlasSection[]).map(id=><button key={id} type="button" className="muse-edge" aria-pressed={section===id} onClick={()=>setSection(id)}>{sections[id]}</button>)}</div>
   {usesPeriod&&<><div className="muse-books-atlas-period" role="group" aria-label="Statistics period">{periodIds.map(id=><button key={id} type="button" className="muse-button button-ghost" aria-pressed={period===id} onClick={()=>setPeriod(id)}>{overviewPeriods[id]}</button>)}</div>
    <div className="muse-atlas-period-menu"><MuseChoiceMenu label="Statistics period" variant="chip" icon="calendar" valueLabel={overviewPeriods[period]} options={periodIds.map(id=>({id,label:overviewPeriods[id]}))} selectedIds={[period]} onSelect={id=>setPeriod(id as ReadingPeriod)}/></div></>}
  </div>
  {celebrating.length>0&&<div className="muse-atlas-celebration" role="status"><span className="muse-finish-shimmer" aria-hidden="true"><MuseStar size={16}/><MuseStar size={11} color="aqua"/><MuseStar size={9} color="pink"/></span>
   <div><span className="small-label">{celebrating.length===1?'New milestone':'New milestones'}</span>{celebrating.map(id=>{const m=milestones.find(x=>x.id===id);return m?<strong key={id}>{m.title}{m.achievedOn?<small> · {yearDate(m.achievedOn)}</small>:null}</strong>:null;})}</div>
   <button type="button" className="text-button" onClick={()=>setCelebrating([])}>Dismiss</button></div>}
  {section==='streak'&&<Streaks sessions={sessions} goals={goals} today={today} onSetDailyGoal={onSetDailyGoal}/>}
  {section==='dna'&&<ReadingDNA books={books} sessions={sessions} range={range_} label={label} today={today} series={collections?.series??[]} seriesMembers={collections?.seriesMembers??[]} media={collections?.media??[]} onOpenBook={onOpenBook}/>}
  {section==='patterns'&&<Patterns books={books} sessions={sessions} range={range_} label={label} series={collections?.series??[]} seriesMembers={collections?.seriesMembers??[]} media={collections?.media??[]} onOpenBook={onOpenBook}/>}
  {section==='books'&&<BooksMilestones byYear={<BooksByYear years={yearlyBooks}/>} books={books} sessions={sessions} range={range_} label={label} onOpenBook={onOpenBook} today={today} stats={[{icon:'book',value:String(c.count),label:'Books finished'},{icon:'series',value:summary.sessions?num(summary.pages):'—',label:'Pages read'},{icon:'timer',value:summary.seconds?hours(summary.seconds):'—',label:'Reading time'},{icon:'calendar',value:String(summary.readingDays||'—'),label:'Reading days'}]}/>}
  {section==='year'&&<YearInReview books={books} sessions={sessions} today={today} goals={goals} onOpenBook={onOpenBook}/>}
  {section==='overview'&&<>
  {/* Overview (her mock): one slim strip of seven numbers; calendar | challenge with its goals | the shelves; four
      charts; reading by period beside session history. Highlights live in Reading DNA and Books & Milestones. */}
  <AtlasBand art="overview" kicker={`Your reading · ${label}`} title={c.count?`${c.count} ${c.count===1?'book':'books'} finished`:'A reading life, taking shape'} line={summary.sessions?`${summary.sessions} sittings${summary.averageSessionSeconds!==null?` · about ${compactTime(summary.averageSessionSeconds)} each`:''}${summary.pace.pagesPerHour!==null&&summary.pace.sessions>=2?` · ${Math.round(summary.pace.pagesPerHour)} pages an hour`:''}${c.rereads?` · ${c.rereads} reread${c.rereads===1?'':'s'}`:''}`:undefined}
   stats={[{icon:'timer',value:compactTime(summary.seconds),label:'Reading time'},{icon:'book',value:summary.sessions?num(summary.pages):'—',label:'Pages'},{icon:'calendar',value:summary.readingDays?String(summary.readingDays):'—',label:'Reading days'},{icon:'flame',value:days(streak.current),label:'Streak'}]}/>
  <AlmanacWhisper surface={surfaces.atlas} signals={almanacSignals} today={today} className="muse-atlas-observations"/>
  <OverviewHighlights books={books} sessions={sessions} range={range_} label={label} today={today}/>
  <div className="muse-atlas-ov-grid" data-period={period}>
   {(period==='month'||period==='year'||period==='all')?<CoverCalendar books={books} sessions={sessions} month={calendarMonth} setMonth={setCalendarMonth} today={today} onOpenBook={onOpenBook} lockView={period==='month'?'month':period==='year'?'year':undefined}/>
    :period==='week'?<ActivityBars unit="time" title="Reading time by day" sub="This week, Monday to Sunday" note="Pages stay on the session date" items={periodDays.map(d=>({key:d.date,label:dateLabel(d.date),short:new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'UTC'}).format(new Date(`${d.date}T12:00:00Z`)),value:d.seconds,text:`${duration(d.seconds)} · ${d.pages} pages`}))}/>
    :<article className="muse-books-panel"><div className="muse-books-panel-head"><h4><AtlasMark title="Read today"/>Read today</h4></div>{(()=>{const todays=sessions.filter(x=>x.date===today),ids=[...new Set(todays.map(x=>x.bookId))];return !ids.length?<p>Nothing logged yet today.</p>:<ul className="muse-atlas-today">{ids.map(id=>{const b=books.find(x=>x.id===id);return <li key={id}><button type="button" className="text-button" onClick={()=>onOpenBook?.(id)}>{b?.title??'A book'}</button><span>{todays.filter(x=>x.bookId===id).reduce((n,x)=>n+x.pages,0)} pages</span></li>;})}</ul>;})()}</article>}
   <div className="muse-atlas-stack muse-atlas-challengecard">
    {onSaveChallenge&&<ReadingChallenge variant="full" books={books} goals={goals} today={today} busy={challengeBusy} onSave={onSaveChallenge} onRemove={onRemoveGoal} onOpenBook={onOpenBook}/>}
    {goalsPanel}
   </div>
   <div className="muse-atlas-stack muse-atlas-shelves">
    <TopRated books={books} range={range_} label={label} onOpenBook={onOpenBook} size={4} cols={4}/>
    <Favorites books={books} range={range_} label={label} onOpenBook={onOpenBook} size={4} cols={4}/>
    <EmojiBoard books={books} range={range_} label={label} title="Vibes" top={4} restSize={6} restCols={6}/>
   </div>
  </div>
  <div className="muse-atlas-charts">
   <ActivityBars anchor="time" unit="time" variant="area" title="Reading time" sub="by week · last 12 weeks" note="Monday-to-Sunday weeks" items={weekItems.map((w,i)=>({...w,short:i%3===0?w.short:''}))}/>
   {period==='month'?<ActivityBars anchor="pages" title="Pages read" sub="by day · this month" note="Each bar is a day" items={periodDays.map(d=>({key:d.date,label:dateLabel(d.date),short:Number(d.date.slice(-2))%5===1?String(Number(d.date.slice(-2))):'',value:d.pages,text:`${d.pages} pages`}))}/>
    :<ActivityBars anchor="pages" title="Pages read" sub={period==='year'?`by month · ${today.slice(0,4)}`:'by month · last 12 months'} note="Pages stay on the session date" items={(period==='year'?yearMonths.map(m=>({key:m,label:monthLabel(m),short:shortMonth(m),value:monthly.find(x=>x.start.startsWith(m))?.pages??0,text:`${monthly.find(x=>x.start.startsWith(m))?.pages??0} pages`})):monthly.map(m=>({key:m.start,label:monthLabel(m.start.slice(0,7)),short:shortMonth(m.start),value:m.pages,text:`${m.pages} pages`}))).map((x,i)=>({...x,short:i%2===0?x.short:''}))}/>}
   <RatingsByMonth books={books} today={today}/>
   <BooksAMonth books={books} year={today.slice(0,4)} onOpenBook={onOpenBook}/>
  </div>
  <div className="muse-atlas-books-pair muse-atlas-history"><article className="muse-books-panel muse-rhythm-panel"><div className="muse-books-panel-head"><h4><AtlasMark title="Reading by period"/>Reading by period</h4><MuseChoiceMenu label="Period" valueLabel={periods[range]} options={Object.entries(periods).map(([id,text])=>({id,label:text}))} selectedIds={[range]} onSelect={id=>setRange(id as ReadingGoal['period'])}/></div>{!series.length?<p>Time and pages by {periods[range].toLowerCase().replace('ly','')} appear after your first saved session.</p>:<PagedList items={[...series].reverse()} size={5} label="reading by period" className="muse-rhythm-list" render={item=>{const pct=Math.max(item.seconds?4:0,Math.round(100*item.seconds/maxTime));return <div role="listitem" key={item.start} className="muse-rhythm-row"><div className="muse-rhythm-head"><strong>{range==='year'?item.start.slice(0,4):range==='month'?monthLabel(item.start.slice(0,7)):range==='week'?`Week of ${yearDate(item.start)}`:yearDate(item.start)}</strong><span className="type-numeric">{item.seconds?duration(item.seconds):'No timed reading'}</span></div><span className="muse-desk-pool" style={{'--fill':`${pct}%`} as CSSProperties} role="meter" aria-label={`${duration(item.seconds)} read`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span/></span><small className="type-numeric">{item.pages} {item.pages===1?'page':'pages'} · {item.sessions} {item.sessions===1?'session':'sessions'}</small></div>;}}/>}<p className="small-label">The bar is reading time (longest period = full); pages and sessions are beneath it. Newest first.</p></article>
  <SessionHistory sessions={sessions} books={books} onEdit={onEditSession} onDelete={onDeleteSession}/></div>
  </>}
 </section>;
}

/** Short time for the stat strip: never a sentence. */

/** Books a month, as a little timeline: a dot per month on a line, the covers finished that month above it. */
function BooksAMonth({books,year,onOpenBook}:{books:Book[];year:string;onOpenBook?:(id:string)=>void}){
 const [openMonth,setOpenMonth]=useState<string|null>(null),[allBooks,setAllBooks]=useState(false);
 const events=completionEvents(books).filter(e=>e.completion.finishedOn?.startsWith(year));
 const months=Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`),best=Math.max(0,...months.map(m=>events.filter(e=>e.completion.finishedOn.startsWith(m)).length));
 return <article className="muse-books-panel muse-atlas-chart muse-atlas-bam"><div className="muse-books-panel-head"><h4><AtlasMark title="Books a month"/><span>Books a month<small className="muse-atlas-chart-sub">{year} · {events.length} finished</small></span></h4>{events.length>0&&<button type="button" className="muse-yir2-seeall" onClick={()=>setAllBooks(true)}>See all</button>}</div>
  {!events.length?<p>Books you finish in {year} gather here, month by month.</p>:<ol className="muse-bam" aria-label={`Books finished each month of ${year}`}>{months.map(m=>{const list=events.filter(e=>e.completion.finishedOn.startsWith(m));return <li key={m} data-on={list.length>0||undefined} data-best={list.length===best&&best>0||undefined}>
   <span className="muse-bam-covers">{list.slice(-1).map((e,i)=><button key={`${e.book.id}${i}`} type="button" aria-label={`${monthLabel(m)}: ${list.length} finished. Show the books`} onClick={()=>list.length>1?setOpenMonth(m):onOpenBook?.(e.book.id)}><Cover book={e.book}/>{list.length>1&&<b className="type-numeric">{list.length}</b>}</button>)}</span>
   <i aria-hidden="true"/><small>{shortMonth(m).slice(0,3)}</small></li>;})}</ol>}
  {openMonth&&<MonthBooksModal books={books} month={openMonth} onOpenBook={onOpenBook} onClose={()=>setOpenMonth(null)}/>}
  {allBooks&&<YearBooksModal books={books} year={year} onOpenBook={onOpenBook} onClose={()=>setAllBooks(false)}/>}
 </article>;
}

/**
 * Books finished by year. With only one or two years of history a chart would be a lonely bar, so it reads as a short
 * editorial summary until there is a trend to draw.
 */
function BooksByYear({years}:{years:{start:string;count:number}[]}){
 const list=[...years].reverse(),max=Math.max(1,...years.map(y=>y.count)),best=Math.max(0,...years.map(y=>y.count));
 return <article className="muse-books-panel muse-atlas-chart muse-atlas-years"><div className="muse-books-panel-head"><h4><AtlasMark title="Books by year"/><span>Books by year<small className="muse-atlas-chart-sub">every year of your history</small></span></h4></div>
  {list.length?<ol className="muse-atlas-yearbars" aria-label="Books finished each year">{list.map(y=><li key={y.start} data-best={y.count===best||undefined}><span className="type-numeric">{y.start.slice(0,4)}</span><span className="muse-atlas-yearbar" style={{'--w':`${Math.max(4,Math.round(100*y.count/max))}%`} as CSSProperties}><i/></span><b className="type-numeric">{y.count}</b></li>)}</ol>:<p>Finished books gather here by year.</p>}
 </article>;
}
