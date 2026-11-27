'use client';
import Link from 'next/link';
import {type CSSProperties,type ReactNode} from 'react';
import {MuseMark} from '@/components/design/MuseHeading';
import {MuseIcon} from '@/components/MuseIcon';
import type {Book,ReadingGoal,ReadingSession} from '@/lib/whimsy/models';
import type {PlanEntry} from '@/lib/books/reading-plans';
import {planEntries,periodOf} from '@/lib/books/reading-plans';
import {upNextQueue,type UpNextItem} from '@/lib/books/up-next';
import {useReadingPlans} from '@/lib/books/use-reading-plans';
import {challengeFor,challengeProgress} from '@/lib/whimsy/reading-challenge';
import {monthProgress} from '@/lib/whimsy/reading-goals';
import type {DailyGoal,GoalStreakDetail} from '@/lib/whimsy/daily-goal';
import {Cover} from '../atlas/CoverCalendar';
import {monthInk} from '../plans/PlanArt';
import './Goals.css';
import {GoalsCompact,Last30,RecentActivity,UpNextCompact} from './HomeV3';

export type GoalView='year'|'month'|'daily';
export const monthLong=(month:string)=>new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`));
const monthShort=(month:string)=>new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`));
const weekday=(date:string)=>new Intl.DateTimeFormat(undefined,{weekday:'narrow',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));

/** The books a month's plan holds, in its order (archived books are left out, as the plan view does). */
export function planBooks(entries:readonly PlanEntry[],books:readonly Book[],month:string){
 const byId=new Map(books.map(b=>[b.id,b]));return planEntries(entries,'month',month).map(e=>byId.get(e.bookId)).filter((b):b is Book=>!!b&&!b.archivedAt);
}

/** A goal's progress, Pagebound-clear: one pill with the count written inside it. */
export function GoalBar({done,target,unit='books',size='md',label}:{done:number;target:number;unit?:string;size?:'sm'|'md'|'lg';label?:string}){
 const percent=target?Math.min(100,Math.round(done/target*100)):0;
 return <span className="muse-goal-bar" data-size={size} data-reached={target>0&&done>=target||undefined} style={{'--fill':`${percent?Math.max(percent,4):0}%`} as CSSProperties} role="meter" aria-label={`${done} of ${target} ${unit}`} aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(done,target)}>
  <span className="muse-goal-bar-fill" aria-hidden="true"/><span className="muse-goal-bar-text type-numeric">{label??`${done} of ${target} ${unit} · ${percent}%`}</span></span>;
}

/** A small row of covers; finished books wear a check. */
export function GoalCovers({books,limit=6,checks=false,onOpen,label}:{books:readonly Book[];limit?:number;checks?:boolean;onOpen:(id:string)=>void;label:string}){
 if(!books.length)return null;const shown=books.slice(0,limit),more=books.length-shown.length;
 return <ol className="muse-goal-covers" aria-label={label}>{shown.map((b,i)=><li key={`${b.id}-${i}`}><button type="button" onClick={()=>onOpen(b.id)} title={b.title} aria-label={`${b.title}${checks&&b.status==='finished'?', finished':''}`}><Cover book={b}/>{checks&&b.status==='finished'&&<span className="muse-goal-check" aria-hidden="true"><MuseIcon name="check" size={11}/></span>}</button></li>)}
  {more>0&&<li className="muse-goal-more type-numeric" aria-label={`and ${more} more`}>+{more}</li>}</ol>;
}

/** Up next as a shelf: cover, title, author and the month it is planned for. Shared by the Dashboard and Plans. */
export function UpNextShelf({items,onOpenBook,slots=0,label='Up next, from your plans'}:{items:readonly UpNextItem[];onOpenBook:(id:string)=>void;slots?:number;label?:string}){
 return <ol className="muse-next-shelf" aria-label={label}>
  {items.map((i,n)=><li key={i.book.id} style={i.kind==='month'?monthInk(i.period):undefined}><button type="button" onClick={()=>onOpenBook(i.book.id)} aria-label={`${n+1}. ${i.book.title}`}>
   <span className="muse-next-cover"><Cover book={i.book}/>{n===0&&<span className="muse-next-first" aria-hidden="true">Next</span>}</span>
   <span className="muse-next-title">{i.book.title}</span><span className="muse-next-author">{i.book.author||'Author not recorded'}</span>
   <span className="muse-next-when" title={i.kind==='month'?`Planned for ${monthLong(i.period)}`:`Planned for ${i.period}, any month`}>{i.kind==='month'?monthShort(i.period):'Anytime'}</span></button></li>)}
  {Array.from({length:Math.max(0,slots-items.length)},(_,n)=><li key={`open${n}`} aria-hidden="true"><Link href="/collections/plans" tabIndex={-1} className="muse-next-open"><span className="muse-next-cover"><MuseIcon name="plus" size={18}/></span><span className="muse-next-title">Plan a book</span></Link></li>)}
 </ol>;
}

/** Up Next (Nov 26): the next books waiting in your plans. Set nothing here: reorder or add in Plans and this follows. */
export function UpNextCard({entries,loaded,books,today,onOpenBook}:{entries:readonly PlanEntry[];loaded:boolean;books:readonly Book[];today:string;onOpenBook:(id:string)=>void}){
 const items=upNextQueue(entries,books,today,8),month=periodOf('month',today);
 return <section className="muse-home-card muse-upnext-card" aria-labelledby="home-upnext">
  <header className="muse-home-card-top"><Link href="/collections/plans" className="muse-home-card-head"><h3 id="home-upnext"><MuseMark icon="dice" tone={2} size="sm" className="muse-books-mark"/>Up next <span className="muse-home-spark" aria-hidden="true">✦</span></h3></Link>
   <span className="muse-home-sub">From your reading plan</span>
   <Link href="/collections/plans?spin=1" className="muse-button muse-spin-pill"><MuseIcon name="sparkle" size={14}/>Spin a book</Link>
   <Link href="/collections/plans" className="muse-goal-open" aria-label="Open your reading plan"><span className="muse-home-chevron" aria-hidden="true"><MuseIcon name="chevron" size={16}/></span></Link></header>
  {!loaded?<div className="muse-next-shelf" aria-busy="true"/>
   :items.length?<UpNextShelf items={items} onOpenBook={onOpenBook} slots={4}/>
   :<Link href="/collections/plans" className="muse-next-empty"><span className="muse-next-empty-art" aria-hidden="true"><i/><i/><i/><i/></span><span><strong>Plan {monthLong(month)}</strong><small>Your next reads line up here, in the order you plan them.</small></span></Link>}
 </section>;
}

type Tile={id:GoalView;kicker:string;icon:'calendar'|'book'|'timer'};
/**
 * Goals on the Dashboard: the year, this month and today as tiles, each with its count in the editorial gradient (the
 * streak's) over the progress pill. The month uses its monthly goal, or its Reading Plan when it has no goal.
 */
export function GoalsCard({books,goals,entries,today,dailyGoal,dailyDetail,onNewGoal,onSetDaily}:{books:Book[];goals:ReadingGoal[];entries:readonly PlanEntry[];today:string;
 dailyGoal:DailyGoal|null;dailyDetail:GoalStreakDetail|null;onOpenBook:(id:string)=>void;onNewGoal:(view?:GoalView)=>void;onSetDaily:()=>void}){
 const year=today.slice(0,4),month=today.slice(0,7),name=monthLong(month);
 const challenge=challengeFor(goals,year),yp=challenge?challengeProgress(challenge,books,year,today):null;
 const mp=monthProgress(goals,books,planBooks(entries,books,month),month);
 const tile=(t:Tile,body:ReactNode,empty:{text:string;onClick:()=>void}|null,extra?:ReactNode)=>empty
  ?<button key={t.id} type="button" className="muse-goal-tile" data-tile={t.id} data-empty onClick={empty.onClick}><span className="muse-goal-tile-kicker"><MuseIcon name={t.icon} size={14}/>{t.kicker}</span><span className="muse-goal-tile-invite"><MuseIcon name="plus" size={14}/>{empty.text}</span></button>
  :<Link key={t.id} href={t.id==='year'?'/collections/plans?kind=year':'/collections/plans'} className="muse-goal-tile" data-tile={t.id}><span className="muse-goal-tile-kicker"><MuseIcon name={t.icon} size={14}/>{t.kicker}</span>{body}{extra}</Link>;
 const count=(done:number|string,of:string)=><strong className="muse-goal-tile-count"><b className="type-numeric">{done}</b><small className="type-numeric">{of}</small></strong>;
 const dailyTarget=dailyDetail&&dailyGoal?dailyDetail.targetToday??dailyGoal.target:0,minutes=dailyDetail?Math.floor(dailyDetail.minutesToday):0;
 return <section className="muse-home-card muse-goals-card" aria-labelledby="home-goals">
  <header className="muse-home-card-top">
   <Link href="/collections/plans" className="muse-home-card-head"><h3 id="home-goals"><MuseMark icon="target" tone={1} size="sm" className="muse-books-mark"/>Goals <span className="muse-home-spark" aria-hidden="true">✦</span></h3></Link>
   <button type="button" className="muse-button button-ghost muse-goal-addpill" onClick={()=>onNewGoal()}><MuseIcon name="plus" size={13}/>Add goal</button>
  </header>
  <div className="muse-goal-tiles">
   {tile({id:'year',kicker:`${year} goal`,icon:'book'},yp&&<>{count(yp.done,`/ ${yp.target} books`)}<GoalBar done={yp.done} target={yp.target} size="sm" label={`${yp.percent}%`}/></>,yp?null:{text:'Set a goal',onClick:()=>onNewGoal('year')})}
   {tile({id:'month',kicker:`${name} goal`,icon:'calendar'},mp.source!=='none'&&<>{count(mp.done,`/ ${mp.target} ${mp.target===1?'book':'books'}`)}<GoalBar done={mp.done} target={mp.target} size="sm" label={`${mp.percent}%`}/></>,mp.source==='none'?{text:'Plan or set a goal',onClick:()=>onNewGoal('month')}:null,mp.source==='plan'?<small className="muse-goal-tile-note">from your plan</small>:null)}
   {tile({id:'daily',kicker:'Today',icon:'timer'},dailyDetail&&dailyGoal&&<>{count(minutes,`/ ${dailyTarget} min`)}<GoalBar done={minutes} target={dailyTarget} unit="min" size="sm" label={dailyDetail.metToday?'Met ✦':`${Math.min(100,Math.round(minutes/Math.max(1,dailyTarget)*100))}%`}/></>,dailyDetail&&dailyGoal?null:{text:'Daily goal',onClick:onSetDaily},
    dailyDetail&&dailyGoal?<ol className="muse-goal-week" aria-label="Last seven days against your goal">{dailyDetail.week.map(d=><li key={d.date} data-state={d.met?'met':d.read?'read':'none'} data-today={d.date===today||undefined}><span aria-hidden="true"/><small>{weekday(d.date)}</small><span className="sr-only">{d.met?'goal met':d.read?'read, goal not met':'no reading'}</span></li>)}</ol>:null)}
  </div>
 </section>;
}

/**
 * The Books Dashboard (Nov 26, round 4, her mock): the streak strip; Goals beside Up next; Currently reading (the star)
 * beside a compact last 30 days; Recent activity. Every collection pages inside its card, so nothing grows with the data.
 */
export function BooksHomeTop({streak,reading,sessions,...props}:{streak:ReactNode;reading:ReactNode;sessions:ReadingSession[]}&Omit<Parameters<typeof GoalsCard>[0],'entries'>){
 const plans=useReadingPlans();
 // Her rule (Nov 26): a strict 2×2 grid, every card in a row the same height. Goals first, with the streak above it;
 // Currently reading beside it; then Up next beside the last 30 days (Currently reading and the last 30 days share a width).
 return <div className="muse-dv4">
  <div className="muse-dv4-cell muse-dv4-goals">{streak}<GoalsCompact books={props.books} goals={props.goals} entries={plans.entries} today={props.today} dailyGoal={props.dailyGoal} dailyDetail={props.dailyDetail} onNewGoal={props.onNewGoal} onSetDaily={props.onSetDaily}/></div>
  <div className="muse-dv4-cell muse-dash-reading">{reading}</div>
  <UpNextCompact entries={plans.entries} loaded={plans.loaded} books={props.books} today={props.today} onOpenBook={props.onOpenBook}/>
  <Last30 books={props.books} sessions={sessions} today={props.today}/>
  <div className="muse-dv4-full"><RecentActivity books={props.books} sessions={sessions} onOpen={props.onOpenBook}/></div>
 </div>;
}
