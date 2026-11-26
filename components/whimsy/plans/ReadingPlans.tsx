'use client';
import {MuseMark} from '@/components/design/MuseHeading';
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState,type CSSProperties,type KeyboardEvent as ReactKeyboardEvent,type PointerEvent as ReactPointerEvent} from 'react';
import {MuseIcon} from '@/components/MuseIcon';
import {GlassPopover} from '@/components/GlassPopover';
import type {Book} from '@/lib/whimsy/models';
import {useReadingPlans} from '@/lib/books/use-reading-plans';
import {moveItem,periodLabel,periodOf,planDates,planCount,planRows,reorderWithin,shiftPeriod,shortPeriodLabel,statusDistribution,yearRollup,yearsWithPlans,PLAN_STATUS_LABEL,type PlanEntry,type PlanKind} from '@/lib/books/reading-plans';
import {eligible,type SourceId} from '@/lib/books/up-next';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {yearDate} from '../atlas/parts';
import {Cover} from '../atlas/CoverCalendar';
import {AddBooksModal} from './AddBooksModal';
import {PlacePicker} from './PlacePicker';
import {StatusChip,Stars} from './PlanStatus';
import {Roulette} from './Roulette';
import './ReadingPlans.css';

/** Dashboard: at most three rows tall (Nov 25): up to six books per page, down three rows then into a second column. */
const PAGE=6;

/** A plan row's own plan: the month (or the year itself) its entry belongs to. Reordering stays within one. */
type Place={kind:PlanKind;period:string};
type Row=Place&{book:Book};
const groupOf=(r:Place)=>`${r.kind}:${r.period}`;
const monthName=(period:string)=>new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(Number(period.slice(0,4)),Number(period.slice(5,7))-1,1,12)));

/** One book in a plan: rank, cover, real status, rating, a drag handle, Start reading for a waiting book, and a compact menu. */
function PlanCard({book,rank,index,total,where,removeFrom,startable,canStart,dragging,offset,over,register,onHandleDown,onHandleMove,onHandleUp,onKeyMove,onOpen,onStart,onMove,onCopy,onRemove,onToTop}:{book:Book;rank:number;
 /** Position within its own plan (a year's month groups reorder separately). */ index:number;total:number;
 /** In a year: the month it is planned for ("Nov"), or "Anytime". */ where?:string;removeFrom:string;startable:boolean;canStart:boolean;
 dragging:boolean;offset?:{x:number;y:number};over:boolean;register:(el:HTMLElement|null)=>void;onHandleDown:(e:ReactPointerEvent)=>void;onHandleMove:(e:ReactPointerEvent)=>void;onHandleUp:(e:ReactPointerEvent)=>void;onKeyMove:(delta:number)=>void;onOpen:()=>void;onStart:()=>void;onMove:()=>void;onCopy:()=>void;onRemove:()=>void;onToTop:()=>void}){
 const anchor=useRef<HTMLButtonElement>(null),[menu,setMenu]=useState(false),dates=planDates(book);
 const busyTitle='Finish or pause your current sitting first';
 function keys(e:ReactKeyboardEvent){if(e.key==='ArrowUp'||e.key==='ArrowLeft'){e.preventDefault();onKeyMove(-1);}else if(e.key==='ArrowDown'||e.key==='ArrowRight'){e.preventDefault();onKeyMove(1);}}
 return <li ref={register} className="muse-plan-card" data-status={book.status} data-dragging={dragging||undefined} data-over={over||undefined} style={offset?{transform:`translate(${offset.x}px,${offset.y}px)`}:undefined}>
  <span className="muse-plan-rank type-numeric" aria-hidden="true">{rank}</span>
  <button type="button" className="muse-plan-handle" aria-label={`Reorder ${book.title}. Position ${index+1} of ${total}. Use the arrow keys to move it.`} onPointerDown={onHandleDown} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp} onKeyDown={keys}><MuseIcon name="grip" size={16}/></button>
  <button type="button" className="muse-plan-cover" onClick={onOpen} aria-label={`Open ${book.title}`} tabIndex={-1}><Cover book={book}/></button>
  <div className="muse-plan-body">
   <button type="button" className="muse-plan-title" onClick={onOpen} title={book.title}>{book.title}</button>
   <span className="muse-plan-author">{book.author||'Author not recorded'}</span>
   <div className="muse-plan-meta">{where&&<span className="muse-plan-where" title={where==='Anytime'?'Planned for the year, no month yet':`Planned for ${where}`}>{where}</span>}<StatusChip status={book.status}/><Stars value={book.rating}/></div>
   {(dates.started||dates.finished)&&<span className="muse-plan-dates type-numeric">{dates.started?`Started ${yearDate(dates.started)}`:''}{dates.started&&dates.finished?' · ':''}{dates.finished?`Finished ${yearDate(dates.finished)}`:''}</span>}
  </div>
  <span className="muse-plan-actions">
   {startable&&<button type="button" className="muse-button button-ghost muse-plan-start" aria-label={`Start reading ${book.title}`} title={canStart?'Start reading':busyTitle} disabled={!canStart} onClick={onStart}><MuseIcon name="play" size={14}/></button>}
   <button ref={anchor} type="button" className="muse-button button-ghost muse-plan-more" aria-label={`Plan actions for ${book.title}`} aria-haspopup="dialog" aria-expanded={menu} onClick={()=>setMenu(v=>!v)}><MuseIcon name="more" size={16}/></button>
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

/**
 * Reading Plans: the one place for planned reading (Up Next merged in, Nov 25). The same planner on the Books Dashboard
 * (compact, paged) and the full view (everything, with past and future periods). A month shows its own books; a year
 * shows every month's books, by month, then the books planned for the year itself. Add books (you choose), Spin to add
 * (the book wheel chooses, you decide) and Start reading (any waiting book, in any order) all live here. Membership
 * comes from the plan tables and everything else from the books themselves.
 */
export function ReadingPlans({books,today,variant,onOpenBook,onStart,canStart=false}:{books:Book[];today:string;variant:'dashboard'|'full';onOpenBook:(id:string)=>void;
 /** The existing start flow (the reading timer); the book's status changes there, never here. */ onStart?:(book:Book)=>void;canStart?:boolean}){
 const plans=useReadingPlans();
 const [kind,setKind]=useState<PlanKind>('month'),[period,setPeriod]=useState(periodOf('month',today)),[page,setPage]=useState(0);
 const [addOpen,setAddOpen]=useState(false),[spinOpen,setSpinOpen]=useState(false),[jump,setJump]=useState(false),[place,setPlace]=useState<(Place&{bookId:string;mode:'move'|'copy'})|null>(null),[note,setNote]=useState('');
 const byId=useMemo(()=>new Map(books.map(b=>[b.id,b])),[books]);
 const rows:Row[]=planRows(plans.entries,kind,period).flatMap(r=>{const book=byId.get(r.bookId);return book&&!book.archivedAt?[{book,kind:r.kind,period:r.period}]:[];});
 const all=rows.map(r=>r.book),ids=all.map(b=>b.id),pages=Math.max(1,Math.ceil(rows.length/PAGE)),at=variant==='full'?0:Math.min(page,pages-1),visible=variant==='full'?rows:rows.slice(at*PAGE,at*PAGE+PAGE);
 const current=periodOf(kind,today),isCurrent=period===current,thisMonth=periodOf('month',today),year=period.slice(0,4);
 const prev=shiftPeriod(kind,period,-1),prevUnfinished=planRows(plans.entries,kind,prev).map(r=>byId.get(r.bookId)).filter((b):b is Book=>!!b&&!b.archivedAt&&!['finished','dnf'].includes(b.status)&&!ids.includes(b.id));
 // Where new books go. A month: that month. A year: you choose a month or "Anytime"; this month when it is this year.
 const [yearTarget,setYearTarget]=useState<string|null>(null);
 const target:Place=kind==='month'?{kind,period}:yearTarget==='year'?{kind:'year',period}:yearTarget?{kind:'month',period:yearTarget}:year===thisMonth.slice(0,4)?{kind:'month',period:thisMonth}:{kind:'year',period};
 const targetLabel=target.kind==='year'?`${period} (any month)`:periodLabel('month',target.period);
 const wheelAt={month:kind==='month'?period:year===thisMonth.slice(0,4)?thisMonth:`${year}-01`,year},taken=new Set(ids);
 function switchKind(next:PlanKind){setKind(next);setPeriod(periodOf(next,today));setPage(0);setYearTarget(null);}
 function go(period2:string){setPeriod(period2);setPage(0);setYearTarget(null);}
 // Up Next retired into the plan: any books still waiting there join this month's plan, once.
 const adopted=useRef(false),adopt=plans.adoptUpNext;
 useEffect(()=>{if(adopted.current||!plans.loaded||!books.length)return;adopted.current=true;void adopt(books,thisMonth).then(moved=>{if(moved.length)setNote(`Up Next now lives in your Reading Plan: ${moved.length===1?'its book is':`its ${moved.length} books are`} in ${periodLabel('month',thisMonth)}.`);});},[plans.loaded,books,thisMonth,adopt]);
 // Drag and drop within the visible cards, within one plan. The handle alone captures the pointer, so the page still scrolls everywhere else.
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
 function nudge(id:string,delta:number){const r=rowOf(id),group=groupIds(r),i=group.indexOf(id);if(i<0||i+delta<0||i+delta>=group.length)return;commit(r,moveItem(group,i,i+delta));if(variant==='dashboard'){const to=Math.floor((ids.indexOf(id)+delta)/PAGE);if(to!==at&&to>=0&&to<pages)setPage(to);}}
 const open=(id:string)=>onOpenBook(id);
 const placeBook=place?byId.get(place.bookId):null;
 const label=periodLabel(kind,period);
 const placeName=(r:Place)=>r.kind==='year'?`the ${r.period} plan`:periodLabel('month',r.period);
 const add=(to:Place,added:string[])=>{void plans.add(to.kind,to.period,added).then(ok=>{if(ok)setNote(`Added ${added.length===1?`“${byId.get(added[0])?.title??'a book'}”`:`${added.length} books`} to ${placeName(to)}.`);});};
 // A year groups its rows by the plan they come from: headings in the full view, a small month chip on the Dashboard.
 const grouped=kind==='year'&&variant==='full';
 const card=(r:Row)=>{const group=groupIds(r),id=r.book.id;return <PlanCard key={id} book={r.book} rank={ids.indexOf(id)+1} index={group.indexOf(id)} total={group.length}
   where={kind==='year'&&!grouped?(r.kind==='month'?shortPeriodLabel('month',r.period):'Anytime'):undefined} removeFrom={placeName(r)}
   startable={Boolean(onStart)&&eligible(r.book)} canStart={canStart} onStart={()=>onStart?.(r.book)}
   dragging={drag?.id===id} offset={drag?.id===id?{x:drag.x,y:drag.y}:undefined} over={drag?.over===id} register={el=>{if(el)cards.current.set(id,el);else cards.current.delete(id);}}
   onHandleDown={down(id)} onHandleMove={moveEv(id)} onHandleUp={up(id)} onKeyMove={d=>nudge(id,d)} onOpen={()=>open(id)}
   onMove={()=>setPlace({bookId:id,mode:'move',kind:r.kind,period:r.period})} onCopy={()=>setPlace({bookId:id,mode:'copy',kind:r.kind,period:r.period})}
   onRemove={()=>{void plans.remove(r.kind,r.period,id).then(ok=>{if(ok)setNote(`Removed “${r.book.title}” from ${placeName(r)}. It is still in your Library.`);});}}
   onToTop={()=>commit(r,[id,...group.filter(x=>x!==id)])}/>;};
 const groups=grouped?visible.reduce<{key:string;place:Place;rows:Row[]}[]>((list,r)=>{const key=groupOf(r),last=list.at(-1);if(last?.key===key)last.rows.push(r);else list.push({key,place:{kind:r.kind,period:r.period},rows:[r]});return list;},[]):[];
 const yearCounts=useMemo(()=>new Map(yearsWithPlans(plans.entries).map(y=>[`year:${y}`,yearRollup(plans.entries,y).length])),[plans.entries]);
 const actions=<><button type="button" className="muse-button button-ghost muse-plans-spin" onClick={()=>setSpinOpen(true)}><MuseIcon name="sparkle" size={14}/>Spin to add</button><button type="button" className="muse-button button-primary muse-plans-add" onClick={()=>setAddOpen(true)}><MuseIcon name="plus" size={14}/>Add books</button></>;
 return <section className="muse-plans" data-variant={variant} aria-labelledby={`plans-${variant}`}>
  <header className="muse-plans-head">
   <div className="muse-plans-title"><span className="small-label">{kind==='month'?'This month, on purpose':'The year ahead'}</span><h3 id={`plans-${variant}`}><MuseMark icon="list" tone={1} size="sm" className="muse-books-mark"/>Reading plans</h3></div>
   <div className="muse-segmented" role="group" aria-label="Plan type"><button type="button" className="muse-edge" aria-pressed={kind==='month'} onClick={()=>switchKind('month')}>Monthly</button><button type="button" className="muse-edge" aria-pressed={kind==='year'} onClick={()=>switchKind('year')}>Yearly</button></div>
  </header>
  <div className="muse-plans-period">
   <button type="button" className="muse-button button-ghost muse-plans-step" aria-label={kind==='month'?'Previous month':'Previous year'} onClick={()=>go(shiftPeriod(kind,period,-1))}>‹</button>
   <button type="button" className="muse-plans-label" aria-haspopup="dialog" onClick={()=>setJump(true)} title="Jump to another period"><strong className="muse-rainbow-year">{label}</strong><span className="muse-plans-count type-numeric">{all.length} {all.length===1?'book':'books'}</span><MuseIcon name="chevron" size={13}/></button>
   <button type="button" className="muse-button button-ghost muse-plans-step" aria-label={kind==='month'?'Next month':'Next year'} onClick={()=>go(shiftPeriod(kind,period,1))}>›</button>
   {!isCurrent&&<button type="button" className="muse-button button-ghost muse-plans-today" onClick={()=>go(current)}>{kind==='month'?'This month':'This year'}</button>}
   <span className="muse-plans-spacer"/>
   {all.length>0&&actions}
  </div>
  <StatusBar books={all}/>
  {plans.error&&<p role="alert" className="muse-books-error">{plans.error} <button type="button" className="text-button" onClick={plans.clearError}>Dismiss</button></p>}
  {note&&<p role="status" className="muse-plans-note">{note}</p>}
  {!plans.loaded?<p role="status" className="muse-plans-loading">Opening your plans…</p>
   :all.length===0?<div className="muse-plans-empty"><span className="muse-plans-empty-art" aria-hidden="true"><i/><i/><i/></span><div><strong>Nothing planned for {label} yet</strong><p>{kind==='month'?'Pick the books you hope to read this month, or spin for one. Start any of them whenever you like; the order is yours.':`Books you plan for any month of ${period} show here, by month. You can also plan books for the year without a month.`}</p>
     <div className="muse-books-actions">{actions}{prevUnfinished.length>0&&<button type="button" className="muse-button button-ghost" onClick={()=>{void plans.add(kind,period,prevUnfinished.map(b=>b.id));setNote(`Brought over ${prevUnfinished.length} unfinished ${prevUnfinished.length===1?'book':'books'} from ${periodLabel(kind,prev)}.`);}}>Bring over {prevUnfinished.length} unfinished from {periodLabel(kind,prev)}</button>}</div></div></div>
   :<>
    {grouped?<div className="muse-plan-groups">{groups.map(g=><section key={g.key} className="muse-plan-group" aria-label={g.place.kind==='month'?monthName(g.place.period):`Anytime in ${period}`}>
      <h4 className="muse-plan-group-head">{g.place.kind==='month'?monthName(g.place.period):`Anytime in ${period}`}<small className="type-numeric">{g.rows.length}</small></h4>
      <ol className="muse-plan-list" aria-label={`${g.place.kind==='month'?periodLabel('month',g.place.period):`${period}, any month`} reading plan`}>{g.rows.map(card)}</ol></section>)}</div>
     :<ol className="muse-plan-list" aria-label={`${label} reading plan`} style={{"--plan-rows":Math.max(1,Math.min(3,visible.length))} as CSSProperties}>{visible.map(card)}</ol>}
    {variant==='dashboard'&&<footer className="muse-plans-foot">{pages>1?<div className="muse-paged-nav"><span className="small-label type-numeric">{at*PAGE+1}–{Math.min(ids.length,at*PAGE+PAGE)} of {ids.length}</span><button type="button" className="muse-button button-ghost" aria-label="Previous books" disabled={at===0} onClick={()=>setPage(at-1)}><MuseIcon name="chevron" size={15}/></button><button type="button" className="muse-button button-ghost" aria-label="Next books" disabled={at>=pages-1} onClick={()=>setPage(at+1)}><MuseIcon name="chevron" size={15}/></button></div>:<span/>}<Link href="/collections/plans" className="muse-plans-full">Open full plans <MuseIcon name="arrow" size={13}/></Link></footer>}
   </>}
  {variant==='full'&&<PeriodChips kind={kind} entries={plans.entries} period={period} onGo={go}/>}
  {addOpen&&<AddBooksModal kind={target.kind} period={target.period} label={targetLabel} books={books} planned={new Set(ids)} onAdd={added=>add(target,added)} onClose={()=>setAddOpen(false)}
    destination={kind==='year'?<MuseChoiceMenu label="Plan them for" icon="calendar" valueLabel={target.kind==='year'?`Anytime in ${period}`:monthName(target.period)} selectedIds={[target.kind==='year'?'year':target.period]}
      options={[...Array.from({length:12},(_,i)=>{const m=`${period}-${String(i+1).padStart(2,'0')}`;return {id:m,label:`${monthName(m)}${m===thisMonth?' (this month)':''}`};}),{id:'year',label:`Anytime in ${period}`}]} onSelect={setYearTarget}/>:undefined}/>}
  {spinOpen&&<Roulette books={books} plans={plans.entries} today={today} taken={taken} at={wheelAt} sources={(kind==='month'?['tbr','year','library','surprise']:['tbr','library','surprise']) as SourceId[]} initialSource="tbr"
    hint={`Muse picks a book that is waiting to be read. Nothing is added to ${targetLabel} until you say so, and nothing starts reading.`} keepLabel={`Add to ${targetLabel}`}
    onKeep={id=>{add(target,[id]);setSpinOpen(false);}} onClose={()=>setSpinOpen(false)}/>}
  {jump&&<PlacePicker title="Jump to" kind={kind} lockKind start={period} today={today} counts={new Map([...plans.entries.filter(e=>e.kind==='month').reduce((m,e)=>m.set(`month:${e.period}`,(m.get(`month:${e.period}`)??0)+1),new Map<string,number>()),...yearCounts])} onPick={(k,p)=>{if(k!==kind)setKind(k);setPeriod(p);setPage(0);setYearTarget(null);setJump(false);}} onClose={()=>setJump(false)}/>}
  {place&&placeBook&&<PlacePicker title={`${place.mode==='move'?'Move':'Copy'} “${placeBook.title.length>30?placeBook.title.slice(0,29)+'…':placeBook.title}”`} kind={place.kind==='year'?'month':place.kind} lockKind={place.kind==='month'} start={place.kind==='year'?(year===thisMonth.slice(0,4)?thisMonth:`${year}-01`):place.period} today={today}
    taken={place.mode==='move'?new Set([groupOf(place)]):new Set(plans.entries.filter(e=>e.bookId===place.bookId).map(groupOf))} takenLabel={place.mode==='move'?'It is here now':'Already in this plan'}
    onPick={(k,p)=>{const from:Place={kind:place.kind,period:place.period},to:Place={kind:k,period:p},title=placeBook.title;setPlace(null);
     const done=(ok:boolean)=>{if(ok)setNote(`${place.mode==='move'?'Moved':'Copied'} “${title}” to ${placeName(to)}.`);};
     if(place.mode==='copy')void plans.add(k,p,[placeBook.id]).then(done);
     else if(k===from.kind)void plans.move(k,from.period,p,placeBook.id).then(done);
     else void plans.add(k,p,[placeBook.id]).then(ok=>ok?plans.remove(from.kind,from.period,placeBook.id):false).then(done);}} onClose={()=>setPlace(null)}/>}
 </section>;
}
/** Full view: every period that has a plan, to jump to past and future plans. A year counts its months' books too. */
function PeriodChips({kind,entries,period,onGo}:{kind:PlanKind;entries:readonly PlanEntry[];period:string;onGo:(p:string)=>void}){
 const periods=kind==='year'?yearsWithPlans(entries):[...new Set(entries.filter(e=>e.kind==='month').map(e=>e.period))].sort().reverse();
 if(!periods.length)return null;
 return <nav className="muse-plans-periods" aria-label={kind==='month'?'Months with plans':'Years with plans'}><span className="small-label">Plans</span>{periods.map(p=><button key={p} type="button" aria-pressed={p===period} onClick={()=>onGo(p)}>{periodLabel(kind,p)} <small className="type-numeric">{kind==='year'?yearRollup(entries,p).length:planCount(entries,kind,p)}</small></button>)}</nav>;
}
