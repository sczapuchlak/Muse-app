'use client';
import Link from 'next/link';
import {useState,type CSSProperties,type ReactNode} from 'react';
import {MuseMark} from '@/components/design/MuseHeading';
import {MuseIcon,type MuseIconName} from '@/components/MuseIcon';
import type {Book,ReadingGoal,ReadingSession} from '@/lib/whimsy/models';
import type {PlanEntry} from '@/lib/books/reading-plans';
import {periodOf} from '@/lib/books/reading-plans';
import {upNextQueue} from '@/lib/books/up-next';
import {challengeFor,challengeProgress} from '@/lib/whimsy/reading-challenge';
import {monthProgress} from '@/lib/whimsy/reading-goals';
import type {DailyGoal,GoalStreakDetail} from '@/lib/whimsy/daily-goal';
import {completionEvents,cycleSessions,sessionSeconds} from '@/lib/whimsy/reading-stats';
import {formatTrend,movement,movementBadge,movementLine,readingTrends,type Trend,type TrendKey} from '@/lib/whimsy/reading-trends';
import {Cover} from '../atlas/CoverCalendar';
import {monthInk} from '../plans/PlanArt';
import {monthLong,planBooks,type GoalView} from './BooksHome';
import './DashV3.css';

const monthShort=(month:string)=>new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`));
const dayShort=(d:string)=>new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));
const span=(seconds:number)=>{if(seconds<60)return seconds?'under a minute':'';const m=Math.round(seconds/60),h=Math.floor(m/60);return h?`${h}h ${String(m%60).padStart(2,'0')}m`:`${m} min`;};

/** The slim progress meter (the theme's progress gradient). */
export function Meter({percent,label}:{percent:number;label:string}){
 return <span className="muse-dv3-meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} style={{'--fill':`${percent?Math.max(percent,3):0}%`} as CSSProperties}><i/></span>;
}
/** Previous / next for a fixed window onto a collection: the card never grows with the data. */
function Pager({at,pages,label,onAt}:{at:number;pages:number;label:string;onAt:(n:number)=>void}){
 if(pages<2)return null;
 return <span className="muse-dv3-pager"><button type="button" aria-label={`Previous ${label}`} disabled={at===0} onClick={()=>onAt(at-1)}><MuseIcon name="chevron" size={15}/></button><button type="button" aria-label={`Next ${label}`} disabled={at>=pages-1} onClick={()=>onAt(at+1)}><MuseIcon name="chevron" size={15}/></button></span>;
}

/** Goals: one card, three compact rows (the year, this month, today). Each row opens Reading Plan, where goals are set. */
export function GoalsCompact({books,goals,entries,today,dailyGoal,dailyDetail,onNewGoal,onSetDaily}:{books:Book[];goals:ReadingGoal[];entries:readonly PlanEntry[];today:string;
 dailyGoal:DailyGoal|null;dailyDetail:GoalStreakDetail|null;onNewGoal:(view?:GoalView)=>void;onSetDaily:()=>void}){
 const year=today.slice(0,4),month=today.slice(0,7),name=monthLong(month);
 const goal=challengeFor(goals,year),yp=goal?challengeProgress(goal,books,year,today):null;
 const mp=monthProgress(goals,books,planBooks(entries,books,month),month);
 const target=dailyGoal&&dailyDetail?dailyDetail.targetToday??dailyGoal.target:0,minutes=dailyDetail?Math.floor(dailyDetail.minutesToday):0,dailyPct=target?Math.min(100,Math.round(100*minutes/target)):0;
 const row=(icon:MuseIconName,title:string,sub:ReactNode,body:ReactNode,href?:string,onEmpty?:()=>void)=>{
  const inner=<><span className="muse-dv3-goal-icon" aria-hidden="true"><MuseIcon name={icon} size={17}/></span><span className="muse-dv3-goal-copy"><strong>{title}</strong><small>{sub}</small></span>{body}</>;
  return onEmpty?<button type="button" className="muse-dv3-goal" data-empty onClick={onEmpty}>{inner}</button>:<Link href={href??'/collections/plans'} className="muse-dv3-goal">{inner}</Link>;
 };
 const empty=(text:string)=><span className="muse-dv3-goal-empty"><MuseIcon name="plus" size={13}/>{text}</span>;
 return <section className="muse-home-card muse-dv3-goals" aria-labelledby="dv3-goals">
  <header className="muse-dv3-head"><Link href="/collections/plans" className="muse-dv3-title"><MuseMark icon="target" tone={1} size="sm" className="muse-books-mark"/><h3 id="dv3-goals">Goals</h3></Link>
   <button type="button" className="muse-button button-ghost muse-goal-addpill" onClick={()=>onNewGoal()}><MuseIcon name="plus" size={13}/>Add goal</button></header>
  <div className="muse-dv3-goal-list">
   {yp?<div className="muse-dv3-goal muse-dv3-yeargoal"><span className="muse-dv3-goal-icon" aria-hidden="true"><MuseIcon name="book" size={17}/></span><span className="muse-dv3-goal-copy"><strong>{year} reading goal</strong><small>{yp.done} of {yp.target} books</small></span><b className="type-numeric">{yp.percent}%</b>
     <ol className="muse-dv3-yearbooks" aria-label={`${yp.done} of ${yp.target} books finished in ${year}`}>{Array.from({length:Math.min(Math.max(yp.target,yp.done),60)},(_,i)=>{const r=[...yp.reads].reverse()[i];return <li key={r?r.readId:`slot${i}`} data-empty={!r||undefined}>{r?<Link href={`/collections/books/${r.bookId}`} title={`${r.title} · finished ${r.finishedOn}`}>{r.coverUrl?<img src={r.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<span>{r.title.slice(0,18)}</span>}</Link>:<span className="type-numeric">{i+1}</span>}</li>;})}</ol></div>
    :row('book',`${year} reading goal`,'Not set yet',empty('Set a goal'),undefined,()=>onNewGoal('year'))}
   {mp.source!=='none'?row('calendar',name,<>{mp.done} of {mp.target} books{mp.source==='plan'?' · from your plan':''}</>,<><Meter percent={mp.percent} label={`${name}: ${mp.done} of ${mp.target} books`}/><b className="type-numeric">{mp.percent}%</b></>)
    :row('calendar',name,'Nothing planned yet',empty('Plan or set a goal'),undefined,()=>onNewGoal('month'))}
   {dailyGoal&&dailyDetail?<button type="button" className="muse-dv3-goal muse-dv3-today" onClick={onSetDaily} title="Change the daily goal"><span className="muse-dv3-goal-icon" aria-hidden="true"><MuseIcon name="timer" size={17}/></span><span className="muse-dv3-goal-copy"><strong>Today</strong></span>
     <span className="muse-dv3-today-count type-numeric"><b>{minutes}</b> / {target} min{dailyDetail.metToday?' ✦':''}</span><Meter percent={dailyPct} label={`Today: ${minutes} of ${target} minutes`}/></button>
    :row('timer','Today','No daily goal',empty('Daily goal'),undefined,onSetDaily)}
  </div>
 </section>;
}

/** Up next: four covers at a time from the plan, with the month each is planned for. */
export function UpNextCompact({entries,loaded,books,today,onOpenBook}:{entries:readonly PlanEntry[];loaded:boolean;books:readonly Book[];today:string;onOpenBook:(id:string)=>void}){
 const items=upNextQueue(entries,books,today,12),[at,setAt]=useState(0),pages=Math.max(1,Math.ceil(items.length/4)),page=Math.min(at,pages-1),shown=items.slice(page*4,page*4+4);
 return <section className="muse-home-card muse-dv3-upnext" aria-labelledby="dv3-upnext">
  <header className="muse-dv3-head"><Link href="/collections/plans" className="muse-dv3-title"><MuseMark icon="sparkle" tone={2} size="sm" className="muse-books-mark"/><h3 id="dv3-upnext">Up next</h3></Link><Link href="/collections/plans" className="muse-dv3-sub muse-dv3-sublink">From your reading plan</Link>
   <Link href="/collections/plans?spin=1" className="muse-button muse-spin-pill"><MuseIcon name="sparkle" size={13}/>Spin a book</Link><Pager at={page} pages={pages} label="books" onAt={setAt}/></header>
  {!loaded?<div className="muse-dv3-covers" aria-busy="true"/>:items.length?<ol className="muse-dv3-covers" aria-label="Up next, from your plan">{shown.map((i,n)=><li key={i.book.id} style={i.kind==='month'?monthInk(i.period):undefined}><button type="button" onClick={()=>onOpenBook(i.book.id)} aria-label={`${page*4+n+1}. ${i.book.title}`}>
    <span className="muse-dv3-cover"><Cover book={i.book}/><span className="muse-dv3-tag">{page===0&&n===0?'Next':i.kind==='month'?monthShort(i.period):'Anytime'}</span></span>
    <strong>{i.book.title}</strong><small>{i.book.author||'Author not recorded'}</small></button></li>)}</ol>
   :<Link href="/collections/plans" className="muse-dv3-empty">Plan {monthLong(periodOf('month',today))} and your next reads line up here.</Link>}
 </section>;
}

/** Your last 30 days: three numbers (with an honest comparison when there is one) and pages per day. */
export function Last30({books,sessions,today}:{books:Book[];sessions:ReadingSession[];today:string}){
 const t=readingTrends(books,sessions,today),max=Math.max(1,...t.pages.daily);
 return <section className="muse-home-card muse-dv3-last30" aria-labelledby="dv3-last30">
  <header className="muse-dv3-head"><Link href="/collections/reading-atlas" className="muse-dv3-title"><MuseMark icon="trend" tone={6} size="sm" className="muse-books-mark"/><h3 id="dv3-last30">Your last 30 days</h3></Link><span className="muse-dv3-range type-numeric">{dayShort(t.current.start)} – {dayShort(t.current.end)}</span></header>
  <dl className="muse-dv3-stats">{([['pages','Pages read',t.pages],['finished','Books finished',t.finished],['time','Time reading',t.time]] as [TrendKey,string,Trend][]).map(([k,lbl,tr])=>{const mv=movement(tr);return <div key={k} data-tone={mv.tone}><dt>{lbl}</dt><dd className="type-numeric">{k==='time'?(tr.current>=3600?`${(tr.current/3600).toFixed(1)}h`:`${Math.round(tr.current/60)}m`):Math.round(tr.current).toLocaleString('en-US')}</dd>
   {mv.tone!=='none'&&<em data-tone={mv.tone}>{mv.tone==='up'?'↗':mv.tone==='down'?'↘':mv.tone==='new'?'↗':'→'} {mv.percent!==null?`${mv.percent}%`:mv.tone==='new'?'new':'steady'}</em>}
   <span>{movementLine(k,mv)}</span><span className="sr-only">{formatTrend(k,tr.current)}</span></div>;})}</dl>
  <div className="muse-dv3-activity"><span className="muse-dv3-activity-label">Pages per day</span>
   <span className="muse-dv3-bars" role="img" aria-label={`Pages per day for the last 30 days, ${Math.round(t.pages.current)} in all`}>{t.pages.daily.map((v,i)=><i key={i} data-on={v>0||undefined} title={`${v} pages`} style={{'--h':`${v>0?Math.max(10,Math.round(100*v/max)):4}%`} as CSSProperties}/>)}</span>
   <span className="muse-dv3-axis type-numeric"><span>{dayShort(t.current.start)}</span><span>{dayShort(t.current.end)}</span></span></div>
  <Link href="/collections/reading-atlas" className="muse-dv3-more">Explore in Reading Atlas <MuseIcon name="arrow" size={12}/></Link>
 </section>;
}

type Activity={key:string;date:string;book?:Book;kind:'session'|'finished';line:string;note?:string};
/** Recent activity: sittings and finished books, newest first, four compact rows at a time; a note opens only when asked. */
export function RecentActivity({books,sessions,onOpen}:{books:Book[];sessions:ReadingSession[];onOpen:(id:string)=>void}){
 const byId=new Map(books.map(b=>[b.id,b]));
 const finished:Activity[]=completionEvents(books).filter(e=>e.completion.finishedOn).map(e=>{const own=cycleSessions(e.book,sessions,e.completion),secs=own.reduce((n,x)=>n+sessionSeconds(x),0);return {key:`f:${e.book.id}:${e.completion.id}`,date:e.completion.finishedOn,book:e.book,kind:'finished',line:`Finished${own.length?` · ${own.length} ${own.length===1?'session':'sessions'}${secs?` · ${span(secs)}`:''}`:''}`};});
 const sat:Activity[]=sessions.map(s=>({key:`s:${s.id}`,date:s.date,book:byId.get(s.bookId),kind:'session',line:[span(sessionSeconds(s)),`${s.pages} ${s.pages===1?'page':'pages'}`].filter(Boolean).join(' · '),note:s.notes?.trim()||undefined}));
 const all=[...finished,...sat].sort((a,b)=>b.date.localeCompare(a.date)||(a.kind==='finished'?-1:1)).slice(0,24),[at,setAt]=useState(0),[openNote,setOpenNote]=useState<string|null>(null);
 const PER=6,pages=Math.max(1,Math.ceil(all.length/PER)),page=Math.min(at,pages-1);
 return <section className="muse-home-card muse-dv3-recent" aria-labelledby="dv3-recent">
  <header className="muse-dv3-head"><span className="muse-dv3-title"><MuseMark icon="clock" tone={3} size="sm" className="muse-books-mark"/><h3 id="dv3-recent">Recent activity</h3></span><Pager at={page} pages={pages} label="activity" onAt={setAt}/></header>
  {all.length?<ol className="muse-dv3-rows">{all.slice(page*PER,page*PER+PER).map(a=><li key={a.key} data-kind={a.kind}>
    <button type="button" className="muse-dv3-line" onClick={()=>a.book&&onOpen(a.book.id)}><span className="muse-dv3-thumb" aria-hidden="true"><Cover book={a.book}/></span>
     <span className="muse-dv3-row-copy"><strong>{a.book?.title??'A book'}</strong><small>{a.kind==='finished'&&<span className="muse-dv3-done"><MuseIcon name="check" size={11}/></span>}{a.line}</small></span><span className="muse-dv3-row-date type-numeric">{dayShort(a.date)}</span></button>
    {a.note&&<><button type="button" className="muse-dv3-note-toggle" aria-expanded={openNote===a.key} onClick={()=>setOpenNote(openNote===a.key?null:a.key)}>Note</button>{openNote===a.key&&<p className="muse-dv3-note">{a.note}</p>}</>}
   </li>)}</ol>:<p className="muse-dv3-empty">Your sittings and finished books show up here.</p>}
 </section>;
}
