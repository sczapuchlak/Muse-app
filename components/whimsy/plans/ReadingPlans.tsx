'use client';
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState,type CSSProperties,type KeyboardEvent as ReactKeyboardEvent,type PointerEvent as ReactPointerEvent} from 'react';
import {MuseIcon} from '@/components/MuseIcon';
import {GlassPopover} from '@/components/GlassPopover';
import type {Book} from '@/lib/whimsy/models';
import {useReadingPlans} from '@/lib/books/use-reading-plans';
import {moveItem,periodLabel,periodOf,planDates,planEntries,planCount,reorderWithin,shiftPeriod,statusDistribution,PLAN_STATUS_LABEL,type PlanEntry,type PlanKind} from '@/lib/books/reading-plans';
import {yearDate} from '../atlas/parts';
import {Cover} from '../atlas/CoverCalendar';
import {AddBooksModal} from './AddBooksModal';
import {PlacePicker} from './PlacePicker';
import {StatusChip,Stars} from './PlanStatus';
import './ReadingPlans.css';

const PAGE=4;

/** One book in a plan: cover, real status, rating and dates, a drag handle, and a compact menu. */
function PlanCard({book,index,total,dragging,offset,over,register,onHandleDown,onHandleMove,onHandleUp,onKeyMove,onOpen,onMove,onCopy,onRemove,onToTop}:{book:Book;index:number;total:number;dragging:boolean;offset?:{x:number;y:number};over:boolean;register:(el:HTMLElement|null)=>void;onHandleDown:(e:ReactPointerEvent)=>void;onHandleMove:(e:ReactPointerEvent)=>void;onHandleUp:(e:ReactPointerEvent)=>void;onKeyMove:(delta:number)=>void;onOpen:()=>void;onMove:()=>void;onCopy:()=>void;onRemove:()=>void;onToTop:()=>void}){
 const anchor=useRef<HTMLButtonElement>(null),[menu,setMenu]=useState(false),dates=planDates(book);
 function keys(e:ReactKeyboardEvent){if(e.key==='ArrowUp'||e.key==='ArrowLeft'){e.preventDefault();onKeyMove(-1);}else if(e.key==='ArrowDown'||e.key==='ArrowRight'){e.preventDefault();onKeyMove(1);}}
 return <li ref={register} className="muse-plan-card" data-status={book.status} data-dragging={dragging||undefined} data-over={over||undefined} style={offset?{transform:`translate(${offset.x}px,${offset.y}px)`}:undefined}>
  <button type="button" className="muse-plan-handle" aria-label={`Reorder ${book.title}. Position ${index+1} of ${total}. Use the arrow keys to move it.`} onPointerDown={onHandleDown} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp} onKeyDown={keys}><MuseIcon name="grip" size={16}/></button>
  <button type="button" className="muse-plan-cover" onClick={onOpen} aria-label={`Open ${book.title}`} tabIndex={-1}><Cover book={book}/></button>
  <div className="muse-plan-body">
   <button type="button" className="muse-plan-title" onClick={onOpen} title={book.title}>{book.title}</button>
   <span className="muse-plan-author">{book.author||'Author not recorded'}</span>
   <div className="muse-plan-meta"><StatusChip status={book.status}/><Stars value={book.rating}/></div>
   {(dates.started||dates.finished)&&<span className="muse-plan-dates type-numeric">{dates.started?`Started ${yearDate(dates.started)}`:''}{dates.started&&dates.finished?' · ':''}{dates.finished?`Finished ${yearDate(dates.finished)}`:''}</span>}
  </div>
  <button ref={anchor} type="button" className="muse-button button-ghost muse-plan-more" aria-label={`Plan actions for ${book.title}`} aria-haspopup="dialog" aria-expanded={menu} onClick={()=>setMenu(v=>!v)}><MuseIcon name="more" size={16}/></button>
  <GlassPopover id={`plan-menu-${book.id}`} label={`Plan actions for ${book.title}`} open={menu} anchorRef={anchor} onClose={()=>setMenu(false)} width={230} align="end" bare>
   <div className="popover-choice-list muse-plan-menu">
    <button type="button" className="popover-choice" onClick={()=>{setMenu(false);onOpen();}}><span><MuseIcon name="book" size={15}/>Open book</span></button>
    <button type="button" className="popover-choice" onClick={()=>{setMenu(false);onMove();}}><span><MuseIcon name="arrow" size={15}/>Move to another plan…</span></button>
    <button type="button" className="popover-choice" onClick={()=>{setMenu(false);onCopy();}}><span><MuseIcon name="plus" size={15}/>Copy to another plan…</span></button>
    {index>0&&<button type="button" className="popover-choice" onClick={()=>{setMenu(false);onKeyMove(-1);}}><span>Move up</span></button>}
    {index<total-1&&<button type="button" className="popover-choice" onClick={()=>{setMenu(false);onKeyMove(1);}}><span>Move down</span></button>}
    {index>0&&<button type="button" className="popover-choice" onClick={()=>{setMenu(false);onToTop();}}><span>Move to top</span></button>}
    <button type="button" className="popover-choice" onClick={()=>{setMenu(false);onRemove();}}><span><MuseIcon name="close" size={15}/>Remove from plan</span></button>
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
 * Reading Plans (Phase 2): the same planner on the Books Dashboard (compact, paged) and the full view (everything, with
 * past and future periods). It reads membership from the plan tables and everything else from the books themselves.
 */
export function ReadingPlans({books,today,variant,onOpenBook}:{books:Book[];today:string;variant:'dashboard'|'full';onOpenBook:(id:string)=>void}){
 const plans=useReadingPlans();
 const [kind,setKind]=useState<PlanKind>('month'),[period,setPeriod]=useState(periodOf('month',today)),[page,setPage]=useState(0);
 const [addOpen,setAddOpen]=useState(false),[jump,setJump]=useState(false),[place,setPlace]=useState<{bookId:string;mode:'move'|'copy'}|null>(null),[note,setNote]=useState('');
 const byId=useMemo(()=>new Map(books.map(b=>[b.id,b])),[books]);
 const entries=planEntries(plans.entries,kind,period),all=entries.map(e=>byId.get(e.bookId)).filter((b):b is Book=>!!b&&!b.archivedAt);
 const ids=all.map(b=>b.id),pages=Math.max(1,Math.ceil(all.length/PAGE)),at=variant==='full'?0:Math.min(page,pages-1),visible=variant==='full'?all:all.slice(at*PAGE,at*PAGE+PAGE);
 const current=periodOf(kind,today),isCurrent=period===current;
 const prev=shiftPeriod(kind,period,-1),prevUnfinished=planEntries(plans.entries,kind,prev).map(e=>byId.get(e.bookId)).filter((b):b is Book=>!!b&&!b.archivedAt&&!['finished','dnf'].includes(b.status)&&!ids.includes(b.id));
 function switchKind(next:PlanKind){setKind(next);setPeriod(periodOf(next,today));setPage(0);}
 function go(period2:string){setPeriod(period2);setPage(0);}
 // Drag and drop within the visible cards. The handle alone captures the pointer, so the page still scrolls everywhere else.
 const cards=useRef(new Map<string,HTMLElement>()),[drag,setDrag]=useState<{id:string;x:number;y:number;over:string|null}|null>(null),origin=useRef({x:0,y:0});
 const dragId=drag?.id??null;
 useEffect(()=>{if(!dragId)return;const stop=(e:Event)=>e.preventDefault();document.addEventListener('touchmove',stop,{passive:false});return()=>document.removeEventListener('touchmove',stop);},[dragId]);
 function overAt(x:number,y:number,self:string){for(const [id,el] of cards.current){if(id===self)continue;const r=el.getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return id;}return null;}
 const commit=(next:string[])=>{if(next.join()!==ids.join())void plans.reorder(kind,period,next);};
 function down(id:string){return (e:ReactPointerEvent)=>{e.preventDefault();(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);origin.current={x:e.clientX,y:e.clientY};setDrag({id,x:0,y:0,over:null});};}
 function moveEv(id:string){return (e:ReactPointerEvent)=>{if(drag?.id!==id)return;setDrag({id,x:e.clientX-origin.current.x,y:e.clientY-origin.current.y,over:overAt(e.clientX,e.clientY,id)});};}
 function up(id:string){return (e:ReactPointerEvent)=>{if(drag?.id!==id)return;const over=overAt(e.clientX,e.clientY,id);setDrag(null);if(over){const vis=visible.map(b=>b.id),next=moveItem(vis,vis.indexOf(id),vis.indexOf(over));commit(reorderWithin(ids,vis,next));}};}
 function nudge(id:string,delta:number){const i=ids.indexOf(id);if(i<0)return;commit(moveItem(ids,i,i+delta));if(variant==='dashboard'){const to=Math.floor((i+delta)/PAGE);if(to!==at&&to>=0&&to<pages)setPage(to);}}
 const open=(id:string)=>onOpenBook(id);
 const placeBook=place?byId.get(place.bookId):null,taken=new Set(placeBook?plansForTaken(plans.entries,place!.bookId,kind):[]);
 const label=periodLabel(kind,period);
 return <section className="muse-plans" data-variant={variant} aria-labelledby={`plans-${variant}`}>
  <header className="muse-plans-head">
   <div className="muse-plans-title"><span className="small-label">{kind==='month'?'This month, on purpose':'The year ahead'}</span><h3 id={`plans-${variant}`}>Reading plans</h3></div>
   <div className="muse-segmented" role="group" aria-label="Plan type"><button type="button" className="muse-edge" aria-pressed={kind==='month'} onClick={()=>switchKind('month')}>Monthly</button><button type="button" className="muse-edge" aria-pressed={kind==='year'} onClick={()=>switchKind('year')}>Yearly</button></div>
  </header>
  <div className="muse-plans-period">
   <button type="button" className="muse-button button-ghost muse-plans-step" aria-label={kind==='month'?'Previous month':'Previous year'} onClick={()=>go(shiftPeriod(kind,period,-1))}>‹</button>
   <button type="button" className="muse-plans-label" aria-haspopup="dialog" onClick={()=>setJump(true)} title="Jump to another period"><strong className="muse-rainbow-year">{label}</strong><span className="muse-plans-count type-numeric">{all.length} {all.length===1?'book':'books'}</span><MuseIcon name="chevron" size={13}/></button>
   <button type="button" className="muse-button button-ghost muse-plans-step" aria-label={kind==='month'?'Next month':'Next year'} onClick={()=>go(shiftPeriod(kind,period,1))}>›</button>
   {!isCurrent&&<button type="button" className="muse-button button-ghost muse-plans-today" onClick={()=>go(current)}>{kind==='month'?'This month':'This year'}</button>}
   <span className="muse-plans-spacer"/>
   <button type="button" className="muse-button button-primary muse-plans-add" onClick={()=>setAddOpen(true)}><MuseIcon name="plus" size={14}/>Add books</button>
  </div>
  <StatusBar books={all}/>
  {plans.error&&<p role="alert" className="muse-books-error">{plans.error} <button type="button" className="text-button" onClick={plans.clearError}>Dismiss</button></p>}
  {note&&<p role="status" className="muse-plans-note">{note}</p>}
  {!plans.loaded?<p role="status" className="muse-plans-loading">Opening your plans…</p>
   :all.length===0?<div className="muse-plans-empty"><span className="muse-plans-empty-art" aria-hidden="true"><i/><i/><i/></span><div><strong>Nothing planned for {label} yet</strong><p>{kind==='month'?'Pick the books you hope to read this month. Drag them into the order you like.':'Choose the books that make up your year. You can plan each month separately too.'}</p>
     <div className="muse-books-actions"><button type="button" className="muse-button button-primary" onClick={()=>setAddOpen(true)}><MuseIcon name="plus" size={14}/>Add books</button>{prevUnfinished.length>0&&<button type="button" className="muse-button button-ghost" onClick={()=>{void plans.add(kind,period,prevUnfinished.map(b=>b.id));setNote(`Brought over ${prevUnfinished.length} unfinished ${prevUnfinished.length===1?'book':'books'} from ${periodLabel(kind,prev)}.`);}}>Bring over {prevUnfinished.length} unfinished from {periodLabel(kind,prev)}</button>}</div></div></div>
   :<>
    <ol className="muse-plan-list" aria-label={`${label} reading plan`}>{visible.map(book=>{const i=ids.indexOf(book.id);return <PlanCard key={book.id} book={book} index={i} total={ids.length} dragging={drag?.id===book.id} offset={drag?.id===book.id?{x:drag.x,y:drag.y}:undefined} over={drag?.over===book.id} register={el=>{if(el)cards.current.set(book.id,el);else cards.current.delete(book.id);}} onHandleDown={down(book.id)} onHandleMove={moveEv(book.id)} onHandleUp={up(book.id)} onKeyMove={d=>nudge(book.id,d)} onOpen={()=>open(book.id)} onMove={()=>setPlace({bookId:book.id,mode:'move'})} onCopy={()=>setPlace({bookId:book.id,mode:'copy'})} onRemove={()=>{void plans.remove(kind,period,book.id);setNote(`Removed “${book.title}” from ${label}. It is still in your Library.`);}} onToTop={()=>commit([book.id,...ids.filter(x=>x!==book.id)])}/>;})}</ol>
    {variant==='dashboard'&&<footer className="muse-plans-foot">{pages>1?<div className="muse-paged-nav"><span className="small-label type-numeric">{at*PAGE+1}–{Math.min(ids.length,at*PAGE+PAGE)} of {ids.length}</span><button type="button" className="muse-button button-ghost" aria-label="Previous books" disabled={at===0} onClick={()=>setPage(at-1)}><MuseIcon name="chevron" size={15}/></button><button type="button" className="muse-button button-ghost" aria-label="Next books" disabled={at>=pages-1} onClick={()=>setPage(at+1)}><MuseIcon name="chevron" size={15}/></button></div>:<span/>}<Link href="/collections/plans" className="muse-plans-full">Open full plans <MuseIcon name="arrow" size={13}/></Link></footer>}
   </>}
  {variant==='full'&&<PeriodChips kind={kind} entries={plans.entries} period={period} onGo={go}/>}
  {addOpen&&<AddBooksModal kind={kind} period={period} label={label} books={books} planned={new Set(ids)} onAdd={added=>{void plans.add(kind,period,added);setNote(`Added ${added.length} ${added.length===1?'book':'books'} to ${label}.`);}} onClose={()=>setAddOpen(false)}/>}
  {jump&&<PlacePicker title="Jump to" kind={kind} lockKind start={period} today={today} counts={new Map(plans.entries.reduce((m,e)=>m.set(`${e.kind}:${e.period}`,(m.get(`${e.kind}:${e.period}`)??0)+1),new Map<string,number>()))} onPick={(k,p)=>{if(k!==kind)setKind(k);setPeriod(p);setPage(0);setJump(false);}} onClose={()=>setJump(false)}/>}
  {place&&placeBook&&<PlacePicker title={`${place.mode==='move'?'Move':'Copy'} “${placeBook.title.length>30?placeBook.title.slice(0,29)+'…':placeBook.title}”`} kind={kind} lockKind start={period} today={today} taken={place.mode==='move'?new Set([`${kind}:${period}`]):taken} takenLabel={place.mode==='move'?'It is here now':'Already in this plan'} onPick={(k,p)=>{void (place.mode==='move'?plans.move(k,period,p,placeBook.id):plans.add(k,p,[placeBook.id]));setNote(`${place.mode==='move'?'Moved':'Copied'} “${placeBook.title}” ${place.mode==='move'?'to':'to'} ${periodLabel(k,p)}.`);setPlace(null);}} onClose={()=>setPlace(null)}/>}
 </section>;
}
/** Full view: every period that has a plan, to jump to past and future plans. */
function PeriodChips({kind,entries,period,onGo}:{kind:PlanKind;entries:readonly PlanEntry[];period:string;onGo:(p:string)=>void}){
 const periods=[...new Set(entries.filter(e=>e.kind===kind).map(e=>e.period))].sort().reverse();
 if(!periods.length)return null;
 return <nav className="muse-plans-periods" aria-label={kind==='month'?'Months with plans':'Years with plans'}><span className="small-label">Plans</span>{periods.map(p=><button key={p} type="button" aria-pressed={p===period} onClick={()=>onGo(p)}>{periodLabel(kind,p)} <small className="type-numeric">{planCount(entries,kind,p)}</small></button>)}</nav>;
}
function plansForTaken(entries:readonly PlanEntry[],bookId:string,kind:PlanKind){return entries.filter(e=>e.bookId===bookId&&e.kind===kind).map(e=>`${e.kind}:${e.period}`);}
