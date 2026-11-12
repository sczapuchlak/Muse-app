'use client';
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {MuseIcon} from '@/components/MuseIcon';
import {GlassPopover} from '@/components/GlassPopover';
import {BOOK_STATUS_LABEL,BOOK_STATUS_ORDER} from '@/lib/books/status';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import {bookPosition} from '@/lib/whimsy/books';
import './ReadingDesk.css';

const shelves:[Book['status'],string][]=BOOK_STATUS_ORDER.map(id=>[id,BOOK_STATUS_LABEL[id]]);

/**
 * One compact reading tile: cover, title, author and progress, nothing else to read. Pressing the tile opens the book;
 * Start begins a sitting right here; the ⋯ menu holds the rest.
 */
function DeskTile({book,sessions,cover,busy,canStart,onOpen,onStart,onLog,onMove}:{book:Book;sessions:readonly ReadingSession[];cover:ReactNode;busy:boolean;canStart:boolean;onOpen:()=>void;onStart:()=>void;onLog:()=>void;onMove:(status:Book['status'])=>void}){
 const anchor=useRef<HTMLButtonElement>(null),[menu,setMenu]=useState(false);
 const position=bookPosition(book,[...sessions]),percent=book.totalPages?Math.min(100,Math.round(100*position/book.totalPages)):null;
 return <article className="muse-desk-tile" onClick={event=>{if((event.target as HTMLElement).closest('.muse-desk-tile-actions'))return;onOpen();}}>
  <span className="muse-desk-tile-cover" aria-hidden="true">{cover}</span>
  <div className="muse-desk-tile-body">
   <h4><button type="button" className="muse-desk-tile-open" title={book.title} onClick={event=>{event.stopPropagation();onOpen();}}>{book.title}</button></h4>
   <p className="muse-desk-tile-author">{book.author||'Author not recorded'}</p>
   <div className="muse-desk-tile-progress">
    <span className="muse-desk-pool" style={{'--fill':`${percent===null?0:Math.max(percent,3)}%`} as CSSProperties} role="meter" aria-label={`${book.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent??0}><span/></span>
    <span className="muse-desk-tile-pages type-numeric">{book.totalPages?<><strong>{percent}%</strong> · p. {position} of {book.totalPages}</>:<>p. {position}</>}</span>
   </div>
   <div className="muse-desk-tile-actions">
    <button type="button" className="muse-button button-primary muse-desk-start" disabled={busy||!canStart} onClick={onStart}><MuseIcon name="play" size={14}/><span>Start reading</span></button>
    <button ref={anchor} type="button" className="muse-button button-ghost muse-desk-more" aria-label={`More for ${book.title}`} aria-haspopup="dialog" aria-expanded={menu} onClick={()=>setMenu(v=>!v)}><MuseIcon name="more" size={16}/></button>
    <GlassPopover id={`desk-more-${book.id}`} label={`More for ${book.title}`} open={menu} anchorRef={anchor} onClose={()=>setMenu(false)} width={240} align="end" bare>
     <div className="muse-desk-menu popover-choice-list">
      <button type="button" className="popover-choice" onClick={()=>{setMenu(false);onOpen();}}><span><MuseIcon name="book" size={15}/>Open book</span></button>
      <button type="button" className="popover-choice" onClick={()=>{setMenu(false);onLog();}}><span><MuseIcon name="plus" size={15}/>Log reading manually</span></button>
      <span className="muse-desk-menu-label">Move to shelf</span>
      {shelves.filter(([id])=>id!==book.status).map(([id,label])=><button key={id} type="button" className="popover-choice" disabled={busy} onClick={()=>{setMenu(false);onMove(id);}}><span>{label}</span></button>)}
     </div>
    </GlassPopover>
   </div>
  </div>
 </article>;
}

/**
 * The Reading Desk (#135): what you're reading and what to do next. Compact tiles in a horizontal track (two across on
 * phones, more swipe in), the Reading Challenge beside it on wide screens. Advanced reading data lives in Book Detail.
 */
export function ReadingDesk({books,sessions,renderCover,busy,canStart,onOpen,onStart,onLog,onMove,goals,empty}:{books:Book[];sessions:readonly ReadingSession[];renderCover:(book:Book)=>ReactNode;busy:boolean;canStart:boolean;onOpen:(book:Book)=>void;onStart:(book:Book)=>void;onLog:(book:Book)=>void;onMove:(book:Book,status:Book['status'])=>void;goals?:ReactNode;empty:ReactNode}){
 const track=useRef<HTMLOListElement>(null),[first,setFirst]=useState(0),[visible,setVisible]=useState(1);
 function measure(){const el=track.current,tile=el?.firstElementChild as HTMLElement|null;if(!el||!tile)return;const step=tile.offsetWidth+parseFloat(getComputedStyle(el).columnGap||'0');setVisible(Math.max(1,Math.round((el.clientWidth+1)/step)));setFirst(Math.round(el.scrollLeft/step));}
 function move(direction:-1|1){const el=track.current;if(!el)return;el.scrollBy({left:direction*el.clientWidth,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
 useEffect(()=>{const frame=requestAnimationFrame(measure);window.addEventListener('resize',measure);return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',measure);};},[books.length]);
 const count=books.length,more=count>visible;
 return <div className="muse-desk-layout" data-count={Math.min(count,3)} data-goals={goals?true:undefined}>
  <section className="muse-desk-reading" aria-labelledby="desk-reading-heading">
   <header className="muse-desk-head"><h3 id="desk-reading-heading">Currently reading <span className="muse-desk-count type-numeric">{count}</span></h3>
    {more&&<div className="muse-desk-nav"><span className="small-label type-numeric">{first+1}–{Math.min(count,first+visible)} of {count}</span><button type="button" className="muse-button button-ghost" aria-label="Previous books" disabled={first===0} onClick={()=>move(-1)}><MuseIcon name="chevron" size={16}/></button><button type="button" className="muse-button button-ghost" aria-label="Next books" disabled={first+visible>=count} onClick={()=>move(1)}><MuseIcon name="chevron" size={16}/></button></div>}
   </header>
   {count?<ol ref={track} className="muse-desk-track" onScroll={measure} onPointerEnter={measure} onFocus={measure}>{books.map(book=><li key={book.id}><DeskTile book={book} sessions={sessions} cover={renderCover(book)} busy={busy} canStart={canStart} onOpen={()=>onOpen(book)} onStart={()=>onStart(book)} onLog={()=>onLog(book)} onMove={status=>onMove(book,status)}/></li>)}</ol>:empty}
  </section>
  {goals&&<aside className="muse-desk-goals" aria-label="Reading goals">{goals}</aside>}
 </div>;
}
