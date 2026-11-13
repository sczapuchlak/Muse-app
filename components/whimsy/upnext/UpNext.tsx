'use client';
import {CoverGlow} from '../BookAtmosphere';
import {MuseMark} from '@/components/design/MuseHeading';
import {useRef,useState,type CSSProperties,type PointerEvent as ReactPointerEvent} from 'react';
import {MuseIcon} from '@/components/MuseIcon';
import {GlassPopover} from '@/components/GlassPopover';
import type {Book} from '@/lib/whimsy/models';
import {useUpNext} from '@/lib/books/use-up-next';
import {useReadingPlans} from '@/lib/books/use-reading-plans';
import {SLOT_COUNT,type SourceId} from '@/lib/books/up-next';
import {Cover} from '../atlas/CoverCalendar';
import {StatusChip} from '../plans/PlanStatus';
import {Roulette,SlotPicker} from './UpNextFlow';
import './UpNext.css';

function Slot({index,book,count,canStart,dragging,offset,over,register,onOpen,onStart,onChoose,onSpin,onReplace,onRemove,onNudge,onHandleDown,onHandleMove,onHandleUp}:{index:number;book:Book|null;count:number;canStart:boolean;dragging:boolean;offset:{x:number;y:number};over:boolean;register:(el:HTMLElement|null)=>void;onOpen:()=>void;onStart:()=>void;onChoose:()=>void;onSpin:()=>void;onReplace:()=>void;onRemove:()=>void;onNudge:(d:-1|1)=>void;onHandleDown:(e:ReactPointerEvent)=>void;onHandleMove:(e:ReactPointerEvent)=>void;onHandleUp:(e:ReactPointerEvent)=>void}){
 const anchor=useRef<HTMLButtonElement>(null),[menu,setMenu]=useState(false);
 if(!book)return <li ref={register} className="muse-upnext-slot" data-empty data-over={over||undefined}>
  <button type="button" className="muse-upnext-frame" onClick={onChoose} aria-label={`Choose a book for slot ${index+1}`}><span className="muse-upnext-plus"><MuseIcon name="plus" size={26}/></span><span className="muse-upnext-ghost" aria-hidden="true"/></button>
  <div className="muse-upnext-copy"><strong>Slot {index+1} is open</strong><span>Pick a book, or let the wheel choose.</span></div>
  <div className="muse-upnext-actions"><button type="button" className="muse-button button-ghost" onClick={onChoose}>Choose</button><button type="button" className="muse-button button-primary" onClick={onSpin}><MuseIcon name="sparkle" size={14}/>Spin</button></div>
 </li>;
 return <li ref={register} className="muse-upnext-slot" data-dragging={dragging||undefined} data-over={over||undefined} style={{'--tilt':`${(index-1)*1.2}deg`,...(dragging?{'--dx':`${offset.x}px`,'--dy':`${offset.y}px`}:{})} as CSSProperties}>
  <button type="button" className="muse-upnext-handle" aria-label={`Reorder ${book.title}. Position ${index+1} of ${count}. Use the arrow keys to move it.`} onPointerDown={onHandleDown} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();onNudge(-1);}else if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();onNudge(1);}}}><MuseIcon name="grip" size={14}/></button>
  <span className="muse-upnext-number" aria-hidden="true">{index+1}</span>
  <button type="button" className="muse-upnext-frame" data-filled data-glow={book.coverUrl?true:undefined} onClick={onOpen} aria-label={`Open ${book.title}`}><CoverGlow url={book.coverUrl}/><span className="muse-upnext-cover"><Cover book={book}/></span></button>
  <div className="muse-upnext-copy"><button type="button" className="muse-upnext-title" onClick={onOpen} title={book.title}>{book.title}</button><span>{book.author||'Author not recorded'}</span><StatusChip status={book.status}/></div>
  <div className="muse-upnext-actions"><button type="button" className="muse-button button-primary" disabled={!canStart} title={canStart?undefined:'Finish or pause your current sitting first'} onClick={onStart}><MuseIcon name="play" size={14}/>Start reading</button>
   <button ref={anchor} type="button" className="muse-button button-ghost muse-upnext-more" aria-label={`Actions for ${book.title}`} aria-haspopup="dialog" aria-expanded={menu} onClick={()=>setMenu(v=>!v)}><MuseIcon name="more" size={16}/></button></div>
  <GlassPopover id={`upnext-menu-${index}`} label={`Actions for ${book.title}`} open={menu} anchorRef={anchor} onClose={()=>setMenu(false)} width={230} align="end" bare>
   <div className="popover-choice-list muse-plan-menu">
    <button type="button" className="popover-choice" onClick={()=>{setMenu(false);onOpen();}}><span><MuseIcon name="book" size={15}/>Open book</span></button>
    <button type="button" className="popover-choice" onClick={()=>{setMenu(false);onReplace();}}><span><MuseIcon name="edit" size={15}/>Replace…</span></button>
    <button type="button" className="popover-choice" onClick={()=>{setMenu(false);onSpin();}}><span><MuseIcon name="sparkle" size={15}/>Spin for this slot</span></button>
    {index>0&&<button type="button" className="popover-choice" onClick={()=>{setMenu(false);onNudge(-1);}}><span>Move left</span></button>}
    {index<SLOT_COUNT-1&&<button type="button" className="popover-choice" onClick={()=>{setMenu(false);onNudge(1);}}><span>Move right</span></button>}
    <button type="button" className="popover-choice" onClick={()=>{setMenu(false);onRemove();}}><span><MuseIcon name="close" size={15}/>Remove from Up Next</span></button>
   </div>
  </GlassPopover>
 </li>;
}

/**
 * Up Next: three suggested reads on the Books Dashboard. Choose, spin, reorder, replace or remove; start reading uses
 * the normal start flow, and the book leaves its slot once it has genuinely become Currently Reading.
 */
export function UpNext({books,today,canStart,onOpenBook,onStart}:{books:Book[];today:string;canStart:boolean;onOpenBook:(id:string)=>void;onStart:(book:Book)=>void}){
 const upNext=useUpNext(books),plans=useReadingPlans(),byId=new Map(books.map(b=>[b.id,b]));
 const [flow,setFlow]=useState<{kind:'pick'|'spin';index:number;source?:SourceId}|null>(null),[note,setNote]=useState('');
 const taken=(index:number)=>new Set(upNext.slots.filter((id,i):id is string=>!!id&&i!==index));
 const cards=useRef(new Map<number,HTMLElement>()),[drag,setDrag]=useState<{index:number;x:number;y:number;over:number|null}|null>(null),origin=useRef({x:0,y:0});
 const dragIndex=drag?.index??null;
 const overAt=(x:number,y:number,self:number)=>{for(const [i,el] of cards.current){if(i===self)continue;const r=el.getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return i;}return null;};
 function down(i:number){return (e:ReactPointerEvent)=>{e.preventDefault();(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);origin.current={x:e.clientX,y:e.clientY};setDrag({index:i,x:0,y:0,over:null});};}
 function move(i:number){return (e:ReactPointerEvent)=>{if(dragIndex!==i)return;setDrag({index:i,x:e.clientX-origin.current.x,y:e.clientY-origin.current.y,over:overAt(e.clientX,e.clientY,i)});};}
 function up(i:number){return (e:ReactPointerEvent)=>{if(dragIndex!==i)return;const to=overAt(e.clientX,e.clientY,i);setDrag(null);if(to!==null){const next=[...upNext.slots];[next[i],next[to]]=[next[to],next[i]];void upNext.reorder(next);}};}
 const filled=upNext.slots.filter(Boolean).length;
 const choose=(index:number,id:string,keepOpen=false)=>{const b=byId.get(id);void upNext.place(index,id);if(!keepOpen)setFlow(null);if(b)setNote(`“${b.title}” is in slot ${index+1}.`);};
 return <section className="muse-upnext" aria-labelledby="up-next-heading">
  <header className="muse-upnext-head"><div><span className="small-label">A little ritual</span><h3 id="up-next-heading"><MuseMark icon="dice" tone={2} size="sm" className="muse-books-mark"/>Up next</h3></div><p>Up to three books you might reach for next. No pressure.</p></header>
  {upNext.error&&<p role="alert" className="muse-books-error">{upNext.error} <button type="button" className="text-button" onClick={upNext.clearError}>Dismiss</button></p>}
  {note&&<p role="status" className="muse-plans-note">{note}</p>}
  <ol className="muse-upnext-row" aria-label="Up Next slots">{upNext.slots.map((id,i)=>{const book=id?byId.get(id)??null:null;return <Slot key={i} index={i} book={book} count={filled} canStart={canStart} dragging={drag?.index===i} offset={{x:drag?.x??0,y:drag?.y??0}} over={drag?.over===i} register={el=>{if(el)cards.current.set(i,el);else cards.current.delete(i);}} onOpen={()=>book&&onOpenBook(book.id)} onStart={()=>book&&onStart(book)} onChoose={()=>setFlow({kind:'pick',index:i})} onSpin={()=>setFlow({kind:'spin',index:i})} onReplace={()=>setFlow({kind:'pick',index:i})} onRemove={()=>{void upNext.remove(i);setNote('Removed from Up Next. It is still in your Library.');}} onNudge={d=>void upNext.nudge(i,d)} onHandleDown={down(i)} onHandleMove={move(i)} onHandleUp={up(i)}/>;})}</ol>
  {flow?.kind==='pick'&&<SlotPicker books={books} plans={plans.entries} today={today} taken={taken(flow.index)} slotNumber={flow.index+1} initialSource={flow.source??'month'} onChoose={(id,keep)=>choose(flow.index,id,keep)} onSpin={source=>setFlow({kind:'spin',index:flow.index,source})} onClose={()=>setFlow(null)}/>}
  {flow?.kind==='spin'&&<Roulette books={books} plans={plans.entries} today={today} taken={taken(flow.index)} slotNumber={flow.index+1} initialSource={flow.source??'month'} onKeep={id=>choose(flow.index,id)} onClose={()=>setFlow(null)}/>}
 </section>;
}
