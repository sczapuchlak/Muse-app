'use client';
import {useEffect,useMemo,useRef,useState,type CSSProperties,type KeyboardEvent as ReactKeyboardEvent,type PointerEvent as ReactPointerEvent,type ReactNode} from 'react';
import {MuseIcon} from '@/components/MuseIcon';
import {GlassPopover} from '@/components/GlassPopover';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import {useReadingPlans} from '@/lib/books/use-reading-plans';
import {moveItem,periodLabel,periodOf,planDates,planCount,planEntries,planRows,reorderWithin,shiftPeriod,shortPeriodLabel,statusDistribution,yearRollup,yearsWithPlans,PLAN_STATUS_LABEL,type PlanEntry,type PlanKind} from '@/lib/books/reading-plans';
import {eligible,upNextQueue,type SourceId} from '@/lib/books/up-next';
import {bookPosition} from '@/lib/whimsy/books';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {yearDate} from '../atlas/parts';
import {Cover} from '../atlas/CoverCalendar';
import Link from 'next/link';
import {GoalBar,monthLong,type GoalView} from '../goals/BooksHome';
import type {GoalDraft} from '../goals/NewGoalSheet';
import type {ReadingGoal} from '@/lib/whimsy/models';
import type {DailyGoal,GoalStreakDetail} from '@/lib/whimsy/daily-goal';
import type {StreakDetail} from '@/lib/whimsy/reading-streak';
import {challengeFor,challengeProgress} from '@/lib/whimsy/reading-challenge';
import {monthGoalFor,monthProgress} from '@/lib/whimsy/reading-goals';
import {completionsIn} from '@/lib/whimsy/reading-stats';
import {YearBooksModal} from '../atlas/BooksOfYear';
import {AddBooksModal} from './AddBooksModal';
import {PlacePicker} from './PlacePicker';
import {StatusChip,Stars} from './PlanStatus';
import {Roulette} from './Roulette';
import {SeasonMotif,monthInk} from './PlanArt';
import {GridGlyph,ListGlyph} from '@/components/design/ViewIcons';
import './ReadingPlans.css';

/** A plan row's own plan: the month (or the year itself) its entry belongs to. Reordering stays within one. */
type Place={kind:PlanKind;period:string};
type Row=Place&{book:Book};
const groupOf=(r:Place)=>`${r.kind}:${r.period}`;
const monthName=(period:string)=>new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(Number(period.slice(0,4)),Number(period.slice(5,7))-1,1,12)));
const done=(b:Book)=>b.status==='finished';

/**
 * One book in a plan, as a tile: the cover (rank, Up next, how far you are, a check when finished), the title, author,
 * real status and rating, a drag handle, Start reading for a waiting book, and a compact menu.
 */
function PlanCard({book,rank,index,total,where,next=false,percent,removeFrom,startable,canStart,dragging,offset,over,register,onHandleDown,onHandleMove,onHandleUp,onKeyMove,onOpen,onStart,onMove,onCopy,onRemove,onToTop}:{book:Book;rank:number;
 /** Position within its own plan (a year's month groups reorder separately). */ index:number;total:number;
 /** In a year: the month it is planned for ("Nov"), or "Anytime". */ where?:string;
 /** One of the books Up Next shows on the Dashboard. */ next?:boolean;
 /** How far into the book (Currently Reading only). */ percent:number|null;removeFrom:string;startable:boolean;canStart:boolean;
 dragging:boolean;offset?:{x:number;y:number};over:boolean;register:(el:HTMLElement|null)=>void;onHandleDown:(e:ReactPointerEvent)=>void;onHandleMove:(e:ReactPointerEvent)=>void;onHandleUp:(e:ReactPointerEvent)=>void;onKeyMove:(delta:number)=>void;onOpen:()=>void;onStart:()=>void;onMove:()=>void;onCopy:()=>void;onRemove:()=>void;onToTop:()=>void}){
 const anchor=useRef<HTMLButtonElement>(null),[menu,setMenu]=useState(false),dates=planDates(book);
 const busyTitle='Finish or pause your current sitting first';
 function keys(e:ReactKeyboardEvent){if(e.key==='ArrowUp'||e.key==='ArrowLeft'){e.preventDefault();onKeyMove(-1);}else if(e.key==='ArrowDown'||e.key==='ArrowRight'){e.preventDefault();onKeyMove(1);}}
 return <li ref={register} className="muse-plan-card" data-status={book.status} data-next={next||undefined} data-dragging={dragging||undefined} data-over={over||undefined} style={offset?{transform:`translate(${offset.x}px,${offset.y}px)`}:undefined}>
  <div className="muse-plan-cover-wrap">
   <button type="button" className="muse-plan-cover" onClick={onOpen} aria-label={`Open ${book.title}`} tabIndex={-1}><Cover book={book}/></button>
   <span className="muse-plan-rank type-numeric" aria-hidden="true">{rank}</span>
   {next&&<span className="muse-plan-next" title="Shown in Up next on your Dashboard"><MuseIcon name="sparkle" size={10}/>Up next</span>}
   {book.status==='reading'&&percent!==null&&<span className="muse-plan-pct type-numeric" style={{'--fill':`${Math.max(percent,4)}%`} as CSSProperties} aria-label={`${percent}% read`}><i/>{percent}%</span>}
   {done(book)&&<span className="muse-plan-done" aria-hidden="true"><MuseIcon name="check" size={13}/></span>}
   <button type="button" className="muse-plan-handle" aria-label={`Reorder ${book.title}. Position ${index+1} of ${total}. Use the arrow keys to move it.`} onPointerDown={onHandleDown} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp} onKeyDown={keys}><MuseIcon name="grip" size={14}/></button>
  </div>
  <div className="muse-plan-body">
   <button type="button" className="muse-plan-title" onClick={onOpen} title={book.title}>{book.title}</button>
   <span className="muse-plan-author">{book.author||'Author not recorded'}</span>
   <div className="muse-plan-meta">{where&&<span className="muse-plan-where" title={where==='Anytime'?'Planned for the year, no month yet':`Planned for ${where}`}>{where}</span>}<StatusChip status={book.status} short/>{book.rating?<Stars value={book.rating}/>:null}</div>
   {(dates.started||dates.finished)&&<span className="muse-plan-dates type-numeric">{dates.finished?`Finished ${yearDate(dates.finished)}`:`Started ${yearDate(dates.started!)}`}</span>}
  </div>
  <span className="muse-plan-actions">
   {startable&&<button type="button" className="muse-button button-ghost muse-plan-start" aria-label={`Start reading ${book.title}`} title={canStart?'Start reading':busyTitle} disabled={!canStart} onClick={onStart}><MuseIcon name="play" size={13}/></button>}
   <button ref={anchor} type="button" className="muse-button button-ghost muse-plan-more" aria-label={`Plan actions for ${book.title}`} aria-haspopup="dialog" aria-expanded={menu} onClick={()=>setMenu(v=>!v)}><MuseIcon name="more" size={15}/></button>
  </span>
  <GlassPopover id={`plan-menu-${book.id}`} label={`Plan actions for ${book.title}`} open={menu} anchorRef={anchor} onClose={()=>setMenu(false)} width={230} align="end" bare>
   <div className="popover-choice-list muse-plan-menu">
    {startable&&<button type="button" className="popover-choice" disabled={!canStart} title={canStart?undefined:busyTitle} onClick={()=>{setMenu(false);onStart();}}><span><MuseIcon name="play" size={15}/>Start reading</span></button>}
    <button type="button" className="popover-choice" onClick={()=>{setMenu(false);onOpen();}}><span><MuseIcon name="book" size={15}/>Open book</span></button>
    <button type="button" className="popover-choice" onClick={()=>{setMenu(false);onMove();}}><span><MuseIcon name="arrow" size={15}/>Move to another plan…</span></button>
    <button type="button" className="popover-choice" onClick={()=>{setMenu(false);onCopy();}}><span><MuseIcon name="plus" size={15}/>Copy to another plan…</span></button>
    {index>0&&<button type="button" className="popover-choice" onClick={()=>{setMenu(false);onKeyMove(-1);}}><span>Move up</span></button>}
    {index<total-1&&<button type="button" className="popover-choice" onClick={()=>{setMenu(false);onKeyMove(1);}}><span>Move down</span></button>}
    {index>0&&<button type="button" className="popover-choice" onClick={()=>{setMenu(false);onToTop();}}><span>Move to top</span></button>}
    <button type="button" className="popover-choice" onClick={()=>{setMenu(false);onRemove();}}><span><MuseIcon name="close" size={15}/>Remove from {removeFrom}</span></button>
   </div>
  </GlassPopover>
 </li>;
}

/** The segmented status bar: a plan's books by their real status. */
function StatusBar({books}:{books:Book[]}){
 const dist=statusDistribution(books),total=books.length;
 if(!total)return null;
 return <div className="muse-plan-bar" role="group" aria-label={`Plan progress: ${dist.map(d=>`${d.count} ${PLAN_STATUS_LABEL[d.status]}`).join(', ')}`}>
  {dist.map(d=><span key={d.status} className="muse-plan-bar-seg" data-status={d.status} style={{flexGrow:d.count} as CSSProperties} title={`${d.count} ${PLAN_STATUS_LABEL[d.status]}`}><span className="type-numeric">{d.count}</span></span>)}
 </div>;
}

/** A month (or a year's "Anytime") as a card: its motif and name, how much of it is read, then its books. */
function MonthCard({place,label,sub,books,open,onToggle,onAdd,onOpenBook,children}:{place:Place;label:string;sub?:string;books:Book[];open:boolean;onToggle?:()=>void;onAdd:()=>void;onOpenBook:(id:string)=>void;children?:ReactNode}){
 const finished=books.filter(done).length,total=books.length,percent=total?Math.round(finished/total*100):0,month=place.kind==='month';
 return <li className="muse-month-card" data-open={open||undefined} data-kind={place.kind} style={month?monthInk(place.period):undefined}>
  <header className="muse-month-head">
   <span className="muse-month-motif">{month?<SeasonMotif month={place.period} size={38}/>:<span className="muse-month-any" aria-hidden="true">✦</span>}</span>
   <div className="muse-month-titles">
    {onToggle?<button type="button" className="muse-month-name" aria-expanded={open} onClick={onToggle}>{label}</button>:<h4 className="muse-month-name">{label}</h4>}
    <span className="muse-month-count">{total} {total===1?'book':'books'} planned{sub?` · ${sub}`:''}</span>
   </div>
   {total>0&&<div className="muse-month-progress"><span className="type-numeric">{finished} of {total} read · {percent}%</span><span className="muse-month-meter" style={{'--fill':`${percent?Math.max(percent,4):0}%`} as CSSProperties} aria-hidden="true"><i/></span></div>}
   {onToggle&&<button type="button" className="muse-month-toggle" aria-label={open?`Collapse ${label}`:`Open ${label}`} aria-expanded={open} onClick={onToggle}><MuseIcon name="chevron" size={16}/></button>}
  </header>
  {open?children:<div className="muse-month-strip">
   {books.slice(0,8).map(b=><button key={b.id} type="button" className="muse-month-cover" data-status={b.status} title={b.title} aria-label={`Open ${b.title}`} onClick={()=>onOpenBook(b.id)}><Cover book={b}/>{done(b)&&<span className="muse-plan-done" aria-hidden="true"><MuseIcon name="check" size={11}/></span>}</button>)}
   {books.length>8&&<span className="muse-month-more type-numeric">+{books.length-8}</span>}
   <button type="button" className="muse-month-add" aria-label={`Add books to ${label}`} onClick={onAdd}><MuseIcon name="plus" size={18}/></button>
  </div>}
 </li>;
}

/**
 * Reading Plans (its own page since Nov 26): where planned reading is made. A drawn hero, Up next (the first waiting
 * books, which the Dashboard shows), then the months as cards with their seasons: the month you are working on open as a
 * grid of book tiles, the others as a row of covers. A year shows each of its months, then the books planned for the
 * year itself. Add books (you choose), Spin to add (the deck chooses, you decide) and Start reading all live here.
 * Membership comes from the plan tables and everything else from the books themselves.
 */
export function ReadingPlans({books,sessions=[],today,variant,onOpenBook,onStart,canStart=false,goals=[],dailyGoal=null,dailyDetail=null,streak=null,onEditGoal,onSetDaily}:{books:Book[];sessions?:readonly ReadingSession[];today:string;variant:'dashboard'|'full';onOpenBook:(id:string)=>void;
 /** Reading intentions (Nov 26): the goal records shown and edited beside the plan. */ goals?:ReadingGoal[];dailyGoal?:DailyGoal|null;dailyDetail?:GoalStreakDetail|null;streak?:StreakDetail|null;
 onEditGoal?:(draft:Partial<GoalDraft>&{timeframe:GoalView},existing:ReadingGoal|null)=>void;onSetDaily?:()=>void;
 /** The existing start flow (the reading timer); the book's status changes there, never here. */ onStart?:(book:Book)=>void;canStart?:boolean}){
 const plans=useReadingPlans();
 const [kind,setKind]=useState<PlanKind>('month'),[period,setPeriod]=useState(periodOf('month',today));
 const [addOpen,setAddOpen]=useState(false),[spinOpen,setSpinOpen]=useState(false),[jump,setJump]=useState(false),[place,setPlace]=useState<(Place&{bookId:string;mode:'move'|'copy'})|null>(null),[note,setNote]=useState('');
 const byId=useMemo(()=>new Map(books.map(b=>[b.id,b])),[books]);
 const live=(id:string)=>{const b=byId.get(id);return b&&!b.archivedAt?b:null;};
 const rows:Row[]=planRows(plans.entries,kind,period).flatMap(r=>{const book=live(r.bookId);return book?[{book,kind:r.kind,period:r.period}]:[];});
 const all=rows.map(r=>r.book),ids=all.map(b=>b.id),visible=rows;
 const current=periodOf(kind,today),thisMonth=periodOf('month',today),year=period.slice(0,4);
 const prev=shiftPeriod(kind,period,-1),prevUnfinished=planRows(plans.entries,kind,prev).map(r=>byId.get(r.bookId)).filter((b):b is Book=>!!b&&!b.archivedAt&&!['finished','dnf'].includes(b.status)&&!ids.includes(b.id));
 // Where new books go. A month: that month. A year: you choose a month or "Anytime"; this month when it is this year.
 const [yearTarget,setYearTarget]=useState<string|null>(null);
 const target:Place=kind==='month'?{kind,period}:yearTarget==='year'?{kind:'year',period}:yearTarget?{kind:'month',period:yearTarget}:year===thisMonth.slice(0,4)?{kind:'month',period:thisMonth}:{kind:'year',period};
 const targetLabel=target.kind==='year'?`${period} (any month)`:periodLabel('month',target.period);
 const wheelAt={month:kind==='month'?period:year===thisMonth.slice(0,4)?thisMonth:`${year}-01`,year},taken=new Set(ids);
 function switchKind(next:PlanKind){setKind(next);setPeriod(periodOf(next,today));setYearTarget(null);}
 function go(period2:string){setPeriod(period2);setYearTarget(null);}
 // Up Next retired into the plan: any books still waiting there join this month's plan, once.
 const adopted=useRef(false),adopt=plans.adoptUpNext;
 useEffect(()=>{if(adopted.current||!plans.loaded||!books.length)return;adopted.current=true;void adopt(books,thisMonth).then(moved=>{if(moved.length)setNote(`Up Next now lives in your Reading Plan: ${moved.length===1?'its book is':`its ${moved.length} books are`} in ${periodLabel('month',thisMonth)}.`);});},[plans.loaded,books,thisMonth,adopt]);
 // "Spin a book" on the Dashboard lands here with ?spin=1 and opens the deck once.
 useEffect(()=>{let url:URL;try{url=new URL(window.location.href);}catch{return;}const spinNow=url.searchParams.get('spin')==='1',yearNow=url.searchParams.get('kind')==='year';if(!spinNow&&!yearNow)return;url.searchParams.delete('spin');url.searchParams.delete('kind');window.history.replaceState(null,'',url);const t=window.setTimeout(()=>{if(yearNow){setKind('year');setPeriod(today.slice(0,4));}if(spinNow)setSpinOpen(true);},0);return()=>window.clearTimeout(t);},[today]);
 // Gallery or list, remembered on this device only (a viewing convenience).
 const [lineupView,setLineupView]=useState<'grid'|'list'>(()=>{try{return typeof window!=='undefined'&&window.localStorage.getItem('muse.plan.view')==='list'?'list':'grid';}catch{return 'grid';}});
 function pickView(v:'grid'|'list'){setLineupView(v);try{window.localStorage.setItem('muse.plan.view',v);}catch{/* this visit only */}}
 // Drag and drop within one plan. The handle alone captures the pointer, so the page still scrolls everywhere else.
 const cards=useRef(new Map<string,HTMLElement>()),[drag,setDrag]=useState<{id:string;x:number;y:number;over:string|null}|null>(null),origin=useRef({x:0,y:0});
 const dragId=drag?.id??null;
 useEffect(()=>{if(!dragId)return;const stop=(e:Event)=>e.preventDefault();document.addEventListener('touchmove',stop,{passive:false});return()=>document.removeEventListener('touchmove',stop);},[dragId]);
 const rowOf=(id:string)=>rows.find(r=>r.book.id===id)!;
 const groupIds=(r:Place)=>rows.filter(x=>groupOf(x)===groupOf(r)).map(x=>x.book.id);
 function overAt(x:number,y:number,self:string){const mine=groupOf(rowOf(self));for(const [id,el] of cards.current){if(id===self||groupOf(rowOf(id)??{kind:'',period:''})!==mine)continue;const r=el.getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return id;}return null;}
 const commit=(r:Place,next:string[])=>{if(next.join()!==groupIds(r).join())void plans.reorder(r.kind,r.period,next);};
 function down(id:string){return (e:ReactPointerEvent)=>{e.preventDefault();(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);origin.current={x:e.clientX,y:e.clientY};setDrag({id,x:0,y:0,over:null});};}
 function moveEv(id:string){return (e:ReactPointerEvent)=>{if(drag?.id!==id)return;setDrag({id,x:e.clientX-origin.current.x,y:e.clientY-origin.current.y,over:overAt(e.clientX,e.clientY,id)});};}
 function up(id:string){return (e:ReactPointerEvent)=>{if(drag?.id!==id)return;const over=overAt(e.clientX,e.clientY,id);setDrag(null);if(over){const r=rowOf(id),vis=visible.filter(x=>groupOf(x)===groupOf(r)).map(x=>x.book.id),next=moveItem(vis,vis.indexOf(id),vis.indexOf(over));commit(r,reorderWithin(groupIds(r),vis,next));}};}
 function nudge(id:string,delta:number){const r=rowOf(id),group=groupIds(r),i=group.indexOf(id);if(i<0||i+delta<0||i+delta>=group.length)return;commit(r,moveItem(group,i,i+delta));}
 const open=(id:string)=>onOpenBook(id);
 // Up next on the Dashboard is read from the plans: the first waiting books, in plan order (Nov 26).
 const queue=useMemo(()=>upNextQueue(plans.entries,books,today,8),[plans.entries,books,today]);
 const upNext=new Set(queue.slice(0,4).map(i=>i.book.id));
 const percentOf=(b:Book)=>b.totalPages?Math.min(100,Math.round(100*bookPosition(b,[...sessions])/b.totalPages)):null;
 const placeBook=place?byId.get(place.bookId):null;
 const label=periodLabel(kind,period);
 const placeName=(r:Place)=>r.kind==='year'?`the ${r.period} plan`:periodLabel('month',r.period);
 const add=(to:Place,added:string[])=>{void plans.add(to.kind,to.period,added).then(ok=>{if(ok)setNote(`Added ${added.length===1?`“${byId.get(added[0])?.title??'a book'}”`:`${added.length} books`} to ${placeName(to)}.`);});};
 const card=(r:Row)=>{const group=groupIds(r),id=r.book.id;return <PlanCard key={id} book={r.book} rank={group.indexOf(id)+1} index={group.indexOf(id)} total={group.length}
   next={upNext.has(id)} percent={percentOf(r.book)} removeFrom={placeName(r)}
   startable={Boolean(onStart)&&eligible(r.book)} canStart={canStart} onStart={()=>onStart?.(r.book)}
   dragging={drag?.id===id} offset={drag?.id===id?{x:drag.x,y:drag.y}:undefined} over={drag?.over===id} register={el=>{if(el)cards.current.set(id,el);else cards.current.delete(id);}}
   onHandleDown={down(id)} onHandleMove={moveEv(id)} onHandleUp={up(id)} onKeyMove={d=>nudge(id,d)} onOpen={()=>open(id)}
   onMove={()=>setPlace({bookId:id,mode:'move',kind:r.kind,period:r.period})} onCopy={()=>setPlace({bookId:id,mode:'copy',kind:r.kind,period:r.period})}
   onRemove={()=>{void plans.remove(r.kind,r.period,id).then(ok=>{if(ok)setNote(`Removed “${r.book.title}” from ${placeName(r)}. It is still in your Library.`);});}}
   onToTop={()=>commit(r,[id,...group.filter(x=>x!==id)])}/>;};
 const yearCounts=useMemo(()=>new Map(yearsWithPlans(plans.entries).map(y=>[`year:${y}`,yearRollup(plans.entries,y).length])),[plans.entries]);
 const spin=<button type="button" className="muse-plans-spin" onClick={()=>setSpinOpen(true)}><span className="muse-plans-spin-deck" aria-hidden="true"><i/><i/><i/></span><span>Spin to add</span></button>;
 const addBtn=<button type="button" className="muse-button button-primary muse-plans-add" onClick={()=>setAddOpen(true)}><MuseIcon name="plus" size={14}/>Add books</button>;
 const tiles=(list:Row[],addTo:Place)=><ol className="muse-plan-list" aria-label={`${placeName(addTo)} reading plan`}>{list.map(card)}<li className="muse-plan-addtile"><button type="button" onClick={()=>{if(kind==='year')setYearTarget(addTo.kind==='year'?'year':addTo.period);setAddOpen(true);}}><span><MuseIcon name="plus" size={20}/></span>Add a book</button></li></ol>;
 // The months on show: this month and the next two, every later month with books, and whichever month you opened.
 const season=(()=>{const s=new Set([thisMonth,shiftPeriod('month',thisMonth,1),shiftPeriod('month',thisMonth,2)]);for(const e of plans.entries)if(e.kind==='month'&&e.period>=thisMonth)s.add(e.period);if(kind==='month')s.add(period);return [...s].sort();})();
 const monthBooks=(m:string)=>planEntries(plans.entries,'month',m).map(e=>live(e.bookId)).filter((b):b is Book=>!!b);
 const nameWithYear=(m:string)=>`${monthName(m)}${m.slice(0,4)!==thisMonth.slice(0,4)?` ${m.slice(0,4)}`:''}`;
 const yearGroups=kind==='year'?visible.reduce<{key:string;place:Place;rows:Row[]}[]>((list,r)=>{const key=groupOf(r),last=list.find(g=>g.key===key);if(last)last.rows.push(r);else list.push({key,place:{kind:r.kind,period:r.period},rows:[r]});return list;},[]):[];
 const emptyMonth=<div className="muse-plans-empty"><span className="muse-plans-empty-art" aria-hidden="true"><i/><i/><i/></span><div><strong>Nothing planned for {label} yet</strong><p>Pick the books you hope to read, or let the deck choose one. Start any of them whenever you like; the order is yours.</p>
  <div className="muse-books-actions">{addBtn}{prevUnfinished.length>0&&<button type="button" className="muse-button button-ghost" onClick={()=>{void plans.add(kind,period,prevUnfinished.map(b=>b.id));setNote(`Brought over ${prevUnfinished.length} unfinished ${prevUnfinished.length===1?'book':'books'} from ${periodLabel(kind,prev)}.`);}}>Bring over {prevUnfinished.length} unfinished from {periodLabel(kind,prev)}</button>}</div></div></div>;
 // Reading intentions: the goals that apply to this month (or year), the daily rhythm, and how much of the plan is read.
 const yearKey=kind==='year'?period:period.slice(0,4),yearGoal=challengeFor(goals,yearKey),yp=yearGoal?challengeProgress(yearGoal,books,yearKey,today):null;
 const monthGoal=kind==='month'?monthGoalFor(goals,period):null,mp=kind==='month'?monthProgress(goals,books,all,period):null;
 const planDone=all.filter(done).length,planPct=all.length?Math.round(100*planDone/all.length):0;
 const yearReads=completionsIn(books,{start:`${yearKey}-01-01`,end:`${yearKey}-12-31`}).events.sort((x,y)=>y.completion.finishedOn.localeCompare(x.completion.finishedOn));
 const dailyTarget=dailyGoal&&dailyDetail?dailyDetail.targetToday??dailyGoal.target:null;
 const editYear=()=>onEditGoal?.({timeframe:'year',period:yearKey,...(yp?{target:yp.target}:{})},yearGoal&&!yearGoal.recurs?yearGoal:null);
 const editMonth=()=>onEditGoal?.({timeframe:'month',period,...(monthGoal&&mp?{target:mp.target,every:!!monthGoal.recurs}:{})},monthGoal);
 const name=kind==='month'?monthLong(period):period;
 const intentions=<section className="muse-rp-intent" aria-labelledby="rp-intent">
  <div className="muse-rp-intent-title"><span className="muse-rp-spark" aria-hidden="true">✦</span><div><h3 id="rp-intent">Your reading intentions</h3><p>What I&rsquo;m reading, and what I hope to finish.</p></div></div>
  <div className="muse-rp-intent-items">
   <button type="button" className="muse-rp-intent-item" onClick={kind==='month'?editMonth:editYear} title="Edit this goal"><span className="muse-rp-intent-icon" aria-hidden="true"><MuseIcon name="book" size={18}/></span><span className="muse-rp-intent-copy"><small>{kind==='month'?`Books to finish in ${name}`:`Books to finish in ${period}`}</small>
    {kind==='month'?(monthGoal&&mp?<><strong className="type-numeric"><b>{mp.done}</b> / {mp.target}</strong><GoalBar done={mp.done} target={mp.target} size="sm" label={`${mp.percent}%`}/></>:<em><MuseIcon name="plus" size={12}/>Set a goal</em>)
     :(yp?<><strong className="type-numeric"><b>{yp.done}</b> / {yp.target}</strong><GoalBar done={yp.done} target={yp.target} size="sm" label={`${yp.percent}%`}/></>:<em><MuseIcon name="plus" size={12}/>Set a goal</em>)}</span></button>
   <button type="button" className="muse-rp-intent-item" onClick={()=>onSetDaily?.()} title="Change the daily goal"><span className="muse-rp-intent-icon" aria-hidden="true"><MuseIcon name="timer" size={18}/></span><span className="muse-rp-intent-copy"><small>Daily reading</small>
    {dailyTarget!==null&&dailyDetail?<><strong className="type-numeric"><b>{dailyTarget}</b> min</strong><span className="muse-rp-intent-note">{Math.floor(dailyDetail.minutesToday)} min today{dailyDetail.metToday?' ✦':''}</span></>:<em><MuseIcon name="plus" size={12}/>Set a daily goal</em>}</span></button>
   <div className="muse-rp-intent-item" data-static><span className="muse-rp-intent-icon" aria-hidden="true"><MuseIcon name="check" size={18}/></span><span className="muse-rp-intent-copy"><small>{kind==='month'?'Plan progress':'Year plan progress'}</small><strong className="type-numeric"><b>{planDone}</b> / {all.length} read</strong><GoalBar done={planDone} target={Math.max(1,all.length)} size="sm" label={`${planPct}%`}/></span></div>
  </div>
  <p className="muse-rp-intent-hint">{kind==='month'?`Every book you finish in ${name} counts toward its goal, planned or not; plan progress counts only the books planned here.`:`Every book you finish in ${period} counts toward the year's goal; plan progress counts only planned books.`}</p>
 </section>;
 const side=<aside className="muse-rp-side" aria-label="Your year">
  <button type="button" className="muse-rp-sidecard" onClick={editYear}><span className="muse-rp-sidehead"><span aria-hidden="true">✦</span>This year<MuseIcon name="chevron" size={14}/></span>{yp?<><strong className="type-numeric"><b>{yp.done}</b> / {yp.target} books</strong><GoalBar done={yp.done} target={yp.target} size="sm" label={`${yp.percent}%`}/></>:<em>Set a {yearKey} goal</em>}</button>
  {streak&&<Link href="/collections/reading-atlas?section=streak" className="muse-rp-sidecard"><span className="muse-rp-sidehead"><span aria-hidden="true">🔥</span>Reading streak<MuseIcon name="chevron" size={14}/></span><strong className="type-numeric"><b>{streak.current}</b> {streak.current===1?'day':'days'} <small>Best {streak.longest}</small></strong></Link>}
  <YearReads books={books} year={yearKey} current={yearKey===today.slice(0,4)} reads={yearReads}/>
 </aside>;
 const viewToggle=<div className="muse-rp-viewtoggle" role="group" aria-label="Lineup view"><button type="button" aria-pressed={lineupView==='grid'} aria-label="Gallery" title="Gallery" onClick={()=>pickView('grid')}><GridGlyph size={15}/></button><button type="button" aria-pressed={lineupView==='list'} aria-label="List" title="List" onClick={()=>pickView('list')}><ListGlyph size={15}/></button></div>;
 const others=season.filter(m=>m!==period);
 return <section className="muse-plans" data-variant={variant} data-kind={kind} data-view={lineupView} aria-labelledby={`plans-${variant}`}>
  {/* A compact planning header: the period and its navigation, Month/Year, Spin to add and Add books. */}
  <header className="muse-rp-head">
   <div className="muse-rp-period">
    <button type="button" className="muse-button button-ghost muse-plans-step" aria-label={kind==='month'?'Previous month':'Previous year'} onClick={()=>go(shiftPeriod(kind,period,-1))}>‹</button>
    <button type="button" className="muse-rp-periodlabel" aria-haspopup="dialog" onClick={()=>setJump(true)} title="Jump to another period"><h2 id={`plans-${variant}`}>{label}</h2><span className="type-numeric">{all.length} {all.length===1?'book':'books'} planned</span></button>
    <button type="button" className="muse-button button-ghost muse-plans-step" aria-label={kind==='month'?'Next month':'Next year'} onClick={()=>go(shiftPeriod(kind,period,1))}>›</button>
    {period!==current&&<button type="button" className="muse-button button-ghost muse-plans-today" onClick={()=>go(current)}>{kind==='month'?'This month':'This year'}</button>}
   </div>
   <div className="muse-segmented" role="group" aria-label="Plan type"><button type="button" className="muse-edge" aria-pressed={kind==='month'} onClick={()=>switchKind('month')}>Month</button><button type="button" className="muse-edge" aria-pressed={kind==='year'} onClick={()=>switchKind('year')}>Year</button></div>
   <div className="muse-plans-actions">{spin}{addBtn}</div>
  </header>
  {intentions}
  {plans.error&&<p role="alert" className="muse-books-error">{plans.error} <button type="button" className="text-button" onClick={plans.clearError}>Dismiss</button></p>}
  {note&&<p role="status" className="muse-plans-note">{note}</p>}
  <div className="muse-rp-body">
   {side}
   <div className="muse-rp-main">
    {!plans.loaded?<p role="status" className="muse-plans-loading">Opening your plans…</p>
     :kind==='month'?<>
      <section className="muse-month-card muse-rp-lineup" data-open style={monthInk(period)} aria-labelledby="rp-lineup">
       <header className="muse-rp-lineup-head"><span className="muse-month-motif"><SeasonMotif month={period} size={30}/></span><h3 id="rp-lineup" className="muse-month-name">Your {name} lineup</h3><span className="muse-month-count type-numeric">{all.length} {all.length===1?'book':'books'} planned</span><span className="muse-rp-hint">Drag to reorder</span>{viewToggle}</header>
       {all.length?<div className="muse-month-body"><StatusBar books={all}/>{tiles(rows,{kind:'month',period})}</div>:emptyMonth}
      </section>
      <section className="muse-rp-others" aria-labelledby="rp-others"><h3 id="rp-others">Other months</h3>
       <ol className="muse-month-cards">{others.map(m=>{const list=monthBooks(m);return <li key={m} className="muse-month-card muse-rp-month" style={monthInk(m)}>
        <span className="muse-month-motif"><SeasonMotif month={m} size={22}/></span><button type="button" className="muse-month-name" onClick={()=>go(m)}>{nameWithYear(m)}</button><span className="muse-month-count type-numeric">{list.length} planned{list.length?` · ${list.filter(done).length} read`:''}</span>
        <span className="muse-rp-month-covers">{list.slice(0,7).map(b=><button key={b.id} type="button" title={b.title} aria-label={`Open ${b.title}`} onClick={()=>open(b.id)}><Cover book={b}/></button>)}{list.length>7&&<small className="type-numeric">+{list.length-7}</small>}</span>
        <button type="button" className="muse-rp-month-add" aria-label={`Add books to ${nameWithYear(m)}`} onClick={()=>{go(m);setAddOpen(true);}}><MuseIcon name="plus" size={14}/></button></li>;})}</ol>
       <button type="button" className="muse-plans-another" onClick={()=>setJump(true)}><MuseIcon name="plus" size={14}/>Plan another month</button>
       <PeriodChips kind={kind} entries={plans.entries} period={period} onGo={go}/>
      </section>
     </>
     :<section className="muse-rp-yearview" aria-label={`${period} by month`}>
      <PeriodChips kind={kind} entries={plans.entries} period={period} onGo={go}/>
      <header className="muse-rp-lineup-head"><h3 className="muse-rp-yeartitle">Your {period} plan</h3><span className="muse-month-count type-numeric">{all.length} {all.length===1?'book':'books'} across {yearGroups.length} {yearGroups.length===1?'plan':'plans'}</span>{viewToggle}</header>
      {all.length?<><StatusBar books={all}/><ol className="muse-month-cards">{yearGroups.map(g=><MonthCard key={g.key} place={g.place} label={g.place.kind==='month'?monthName(g.place.period):`Anytime in ${period}`} books={g.rows.map(r=>r.book)} open onAdd={()=>{setYearTarget(g.place.kind==='year'?'year':g.place.period);setAddOpen(true);}} onOpenBook={open}>
        <div className="muse-month-body">{tiles(g.rows,g.place)}</div></MonthCard>)}</ol></>
       :<div className="muse-plans-empty"><span className="muse-plans-empty-art" aria-hidden="true"><i/><i/><i/></span><div><strong>Nothing planned for {period} yet</strong><p>Books you plan for any month of {period} show here, by month. You can also plan books for the year without a month.</p><div className="muse-books-actions">{addBtn}</div></div></div>}
     </section>}
   </div>
  </div>
  {addOpen&&<AddBooksModal kind={target.kind} period={target.period} label={targetLabel} books={books} planned={new Set(planRows(plans.entries,target.kind,target.period).map(r=>r.bookId))} onAdd={added=>add(target,added)} onClose={()=>setAddOpen(false)}
    destination={kind==='year'?<MuseChoiceMenu label="Plan them for" icon="calendar" valueLabel={target.kind==='year'?`Anytime in ${period}`:monthName(target.period)} selectedIds={[target.kind==='year'?'year':target.period]}
      options={[...Array.from({length:12},(_,i)=>{const m=`${period}-${String(i+1).padStart(2,'0')}`;return {id:m,label:`${monthName(m)}${m===thisMonth?' (this month)':''}`};}),{id:'year',label:`Anytime in ${period}`}]} onSelect={setYearTarget}/>:undefined}/>}
  {spinOpen&&<Roulette books={books} plans={plans.entries} today={today} taken={taken} at={wheelAt} sources={(kind==='month'?['tbr','year','library','surprise']:['tbr','library','surprise']) as SourceId[]} initialSource="tbr"
    hint={`The deck holds books waiting to be read. Nothing is added to ${targetLabel} until you say so, and nothing starts reading.`} keepLabel={`Add to ${targetLabel}`}
    onKeep={id=>{add(target,[id]);setSpinOpen(false);}} onClose={()=>setSpinOpen(false)}/>}
  {jump&&<PlacePicker title={kind==='month'?'Plan a month':'Jump to'} kind={kind} lockKind start={period} today={today} counts={new Map([...plans.entries.filter(e=>e.kind==='month').reduce((m,e)=>m.set(`month:${e.period}`,(m.get(`month:${e.period}`)??0)+1),new Map<string,number>()),...yearCounts])} onPick={(k,p)=>{if(k!==kind)setKind(k);setPeriod(p);setYearTarget(null);setJump(false);}} onClose={()=>setJump(false)}/>}
  {place&&placeBook&&<PlacePicker title={`${place.mode==='move'?'Move':'Copy'} “${placeBook.title.length>30?placeBook.title.slice(0,29)+'…':placeBook.title}”`} kind={place.kind==='year'?'month':place.kind} lockKind={place.kind==='month'} start={place.kind==='year'?(year===thisMonth.slice(0,4)?thisMonth:`${year}-01`):place.period} today={today}
    taken={place.mode==='move'?new Set([groupOf(place)]):new Set(plans.entries.filter(e=>e.bookId===place.bookId).map(groupOf))} takenLabel={place.mode==='move'?'It is here now':'Already in this plan'}
    onPick={(k,p)=>{const from:Place={kind:place.kind,period:place.period},to:Place={kind:k,period:p},title=placeBook.title;setPlace(null);
     const finish=(ok:boolean)=>{if(ok)setNote(`${place.mode==='move'?'Moved':'Copied'} “${title}” to ${placeName(to)}.`);};
     if(place.mode==='copy')void plans.add(k,p,[placeBook.id]).then(finish);
     else if(k===from.kind)void plans.move(k,from.period,p,placeBook.id).then(finish);
     else void plans.add(k,p,[placeBook.id]).then(ok=>ok?plans.remove(from.kind,from.period,placeBook.id):false).then(finish);}} onClose={()=>setPlace(null)}/>}
 </section>;
}
/** Every period that has a plan, to jump to past and future plans. A year counts its months' books too. */
function PeriodChips({kind,entries,period,onGo}:{kind:PlanKind;entries:readonly PlanEntry[];period:string;onGo:(p:string)=>void}){
 const periods=kind==='year'?yearsWithPlans(entries):[...new Set(entries.filter(e=>e.kind==='month').map(e=>e.period))].sort().reverse();
 if(!periods.length)return null;
 return <nav className="muse-plans-periods" aria-label={kind==='month'?'Months with plans':'Years with plans'}><span className="small-label">All plans</span>{periods.map(p=><button key={p} type="button" aria-pressed={p===period} onClick={()=>onGo(p)}>{kind==='month'?`${shortPeriodLabel('month',p)} ${p.slice(0,4)}`:periodLabel(kind,p)} <small className="type-numeric">{kind==='year'?yearRollup(entries,p).length:planCount(entries,kind,p)}</small></button>)}</nav>;
}

/** The year's finished books (her note, Nov 26): up to 12 covers a page, three rows of four, then a pager; each cover
 *  opens its book and "See all" opens every book of the year by month in a modal; the heading opens the Atlas. The card never grows past three rows. */
function YearReads({books,year,current,reads}:{books:Book[];year:string;current:boolean;reads:ReturnType<typeof completionsIn>['events']}){
 const PER=12,[page,setPage]=useState(0),[all,setAll]=useState(false),pages=Math.max(1,Math.ceil(reads.length/PER)),at=Math.min(page,pages-1);
 const href=`/collections/reading-atlas?section=books&period=${current?'year':'all'}&focus=completed`;
 return <div className="muse-rp-sidecard muse-rp-yearreads"><Link href={href} className="muse-rp-sidehead"><span aria-hidden="true">📖</span>{year} reads<MuseIcon name="chevron" size={14}/></Link><strong className="type-numeric"><b>{reads.length}</b> finished</strong>
  {reads.length>0&&<ol className="muse-rp-sidecovers" aria-label={`Books finished in ${year}`}>{reads.slice(at*PER,at*PER+PER).map(e=><li key={`${e.book.id}:${e.completion.id}`}><Link href={`/collections/books/${e.book.id}`} title={e.book.title}><Cover book={e.book}/></Link></li>)}</ol>}
  <span className="muse-rp-yearreads-foot">{pages>1&&<span className="muse-rp-yearreads-pager"><button type="button" aria-label="Newer books" disabled={at===0} onClick={()=>setPage(at-1)}><MuseIcon name="chevron" size={13}/></button><small className="type-numeric">{at+1} / {pages}</small><button type="button" aria-label="Older books" disabled={at>=pages-1} onClick={()=>setPage(at+1)}><MuseIcon name="chevron" size={13}/></button></span>}{reads.length>0&&<button type="button" className="muse-rp-yearreads-all" onClick={()=>setAll(true)}>See all of {year}</button>}</span>
  {all&&<YearBooksModal books={books} year={year} onClose={()=>setAll(false)}/>}
 </div>;
}
