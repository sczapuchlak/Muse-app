'use client';
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {MuseIcon} from '@/components/MuseIcon';
import {GlassPopover} from '@/components/GlassPopover';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import {bookPosition} from '@/lib/whimsy/books';
import {shiftDate} from '@/lib/dates';
import './ReadingDesk.css';

function lastRead(book:Book,sessions:readonly ReadingSession[],today:string){
 const last=sessions.filter(s=>s.bookId===book.id).reduce<string>((max,s)=>s.date>max?s.date:max,'');
 if(!last)return 'Not started yet';
 if(last===today)return 'Read today';
 if(last===shiftDate(today,-1))return 'Read yesterday';
 const days=Math.round((Date.parse(`${today}T12:00:00Z`)-Date.parse(`${last}T12:00:00Z`))/86400000);
 return days<14?`Last read ${days} days ago`:`Last read ${new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${last}T12:00:00Z`))}`;
}

/** One compact reading tile: the whole tile opens the book; Continue reading is the one primary action. */
function DeskTile({book,sessions,today,cover,status,onOpen,onLog}:{book:Book;sessions:readonly ReadingSession[];today:string;cover:ReactNode;status:ReactNode;onOpen:()=>void;onLog:()=>void}){
 const anchor=useRef<HTMLButtonElement>(null),[menu,setMenu]=useState(false);
 const position=bookPosition(book,[...sessions]),percent=book.totalPages?Math.min(100,Math.round(100*position/book.totalPages)):null;
 return <article className="muse-desk-tile">
  <span className="muse-desk-tile-cover" aria-hidden="true">{cover}</span>
  <div className="muse-desk-tile-body">
   <h4><button type="button" className="muse-desk-tile-open" onClick={onOpen}>{book.title}</button></h4>
   <p className="muse-desk-tile-author">{book.author||'Author not recorded'}</p>
   <div className="muse-desk-tile-progress">
    <span className="muse-desk-pool" style={{'--fill':`${percent===null?0:Math.max(percent,3)}%`} as CSSProperties} role="meter" aria-label={`${book.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent??0}><span/></span>
    <span className="muse-desk-tile-pages type-numeric">{book.totalPages?<>p. {position} <small>of {book.totalPages}</small> · <strong>{percent}%</strong></>:<>p. {position} <small>· length unknown</small></>}</span>
   </div>
   <p className="muse-desk-tile-last">{lastRead(book,sessions,today)}</p>
   <div className="muse-desk-tile-actions">
    <button type="button" className="muse-button button-primary muse-desk-continue" onClick={onOpen}><MuseIcon name="play" size={14}/>Continue<span className="muse-desk-continue-tail">&nbsp;reading</span></button>
    <button ref={anchor} type="button" className="muse-button button-ghost muse-desk-more" aria-label={`More for ${book.title}`} aria-haspopup="dialog" aria-expanded={menu} onClick={()=>setMenu(v=>!v)}>⋯</button>
    <GlassPopover id={`desk-more-${book.id}`} label={`More for ${book.title}`} open={menu} anchorRef={anchor} onClose={()=>setMenu(false)} width={260} align="end" bare>
     <div className="muse-desk-menu"><button type="button" className="popover-choice" onClick={()=>{setMenu(false);onLog();}}><MuseIcon name="plus" size={15}/>Log reading manually</button><div className="muse-desk-menu-status">{status}</div></div>
    </GlassPopover>
   </div>
  </div>
 </article>;
}

/**
 * The Reading Desk (#135): what you're reading and what to do next. Compact tiles in a horizontal track (two across on
 * phones, more swipe in), the Reading Challenge beside it on wide screens. Advanced reading data lives in Book Detail.
 */
export function ReadingDesk({books,sessions,today,renderCover,renderStatus,onOpen,onLog,goals,empty}:{books:Book[];sessions:readonly ReadingSession[];today:string;renderCover:(book:Book)=>ReactNode;renderStatus:(book:Book)=>ReactNode;onOpen:(book:Book)=>void;onLog:(book:Book)=>void;goals?:ReactNode;empty:ReactNode}){
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
   {count?<ol ref={track} className="muse-desk-track" onScroll={measure} onPointerEnter={measure} onFocus={measure}>{books.map(book=><li key={book.id}><DeskTile book={book} sessions={sessions} today={today} cover={renderCover(book)} status={renderStatus(book)} onOpen={()=>onOpen(book)} onLog={()=>onLog(book)}/></li>)}</ol>:empty}
  </section>
  {goals&&<aside className="muse-desk-goals" aria-label="Reading goals">{goals}</aside>}
 </div>;
}
