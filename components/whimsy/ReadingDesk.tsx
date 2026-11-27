'use client';
import Link from 'next/link';
import {MuseMark} from '@/components/design/MuseHeading';
import {useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {MuseIcon} from '@/components/MuseIcon';
import {GlassPopover} from '@/components/GlassPopover';
import {BOOK_STATUS_LABEL,BOOK_STATUS_ORDER} from '@/lib/books/status';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import {sessionSeconds} from '@/lib/whimsy/reading-stats';
import {bookPosition,validCoverUrl} from '@/lib/whimsy/books';
import {CoverGlow} from './BookAtmosphere';
import {Cover} from './atlas/CoverCalendar';
import './ReadingDesk.css';

const readTime=(seconds:number)=>{const m=Math.round(seconds/60),h=Math.floor(m/60);return h?`${h}h ${String(m%60).padStart(2,'0')}m`:`${Math.max(1,m)}m`;};
const shelves:[Book['status'],string][]=BOOK_STATUS_ORDER.map(id=>[id,BOOK_STATUS_LABEL[id]]);
const startedLabel=(date:string)=>new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',...(date.slice(0,4)===String(new Date().getFullYear())?{}:{year:'numeric'}),timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));

/**
 * The selected book, large: cover, title, author, where you are, and the two things you came to do (keep reading, log
 * progress). The ⋯ menu holds the rest. Pressing the cover or title opens the book.
 */
function Spotlight({book,sessions,cover,busy,canStart,onOpen,onStart,onLog,onMove}:{book:Book;sessions:readonly ReadingSession[];cover:ReactNode;busy:boolean;canStart:boolean;onOpen:()=>void;onStart:()=>void;onLog:()=>void;onMove:(status:Book['status'])=>void}){
 const anchor=useRef<HTMLButtonElement>(null),[menu,setMenu]=useState(false);
 const position=bookPosition(book,[...sessions]),own=sessions.filter(x=>x.bookId===book.id&&(!book.cycleId||!x.cycleId||x.cycleId===book.cycleId)),seconds=own.reduce((n,x)=>n+sessionSeconds(x),0),resumed=own.length>0||position>(book.startingPage??0),percent=book.totalPages?Math.min(100,Math.round(100*position/book.totalPages)):null;
 return <article className="muse-desk-spot" data-glow={book.coverUrl&&validCoverUrl(book.coverUrl)?true:undefined}>
  <CoverGlow url={book.coverUrl}/>
  <button type="button" className="muse-desk-spot-cover" onClick={onOpen} aria-label={`Open ${book.title}`} tabIndex={-1}>{cover}</button>
  <div className="muse-desk-spot-body">
   <h4><button type="button" className="muse-desk-spot-title" onClick={onOpen}>{book.title}</button></h4>
   <p className="muse-desk-tile-author">{book.author||'Author not recorded'}</p>
   <ul className="muse-desk-spot-facts">{book.startedOn&&<li><MuseIcon name="calendar" size={14}/><span>Started {startedLabel(book.startedOn)}</span></li>}{seconds>0&&<li><MuseIcon name="timer" size={14}/><span>{readTime(seconds)} read</span></li>}</ul>
   <div className="muse-desk-spot-progress">
    <span className="muse-desk-spot-pages type-numeric">{book.totalPages?<><strong>{percent}%</strong><span>{position} of {book.totalPages} pages</span></>:<strong>Page {position}</strong>}</span>
    <span className="muse-desk-pool" data-size="lg" style={{'--fill':`${percent===null?0:Math.max(percent,3)}%`} as CSSProperties} role="meter" aria-label={`${book.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent??0}><span/></span>
   </div>
  </div>
  <div className="muse-desk-spot-actions">
   <button type="button" className="muse-button button-primary muse-desk-start" disabled={busy||!canStart} title={canStart?undefined:'Finish or pause your current sitting first'} onClick={onStart}><MuseIcon name="play" size={14}/><span>{resumed?'Continue reading':'Start reading'}</span></button>
   <button type="button" className="muse-button button-ghost muse-desk-log" disabled={busy} onClick={onLog} aria-label="Log progress" title="Log progress"><MuseIcon name="plus" size={14}/><span>Log progress</span></button>
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
 </article>;
}

const percentOf=(book:Book,sessions:readonly ReadingSession[])=>book.totalPages?Math.min(100,Math.round(100*bookPosition(book,[...sessions])/book.totalPages)):null;

/**
 * Currently reading (#135; compact split since Nov 26): the book you picked on one side (cover, progress, Continue reading,
 * Log progress), every other book you are reading as a small two-across grid on the other. Pick one to swap them. The most
 * recently read book is picked first. Advanced data lives in Book Detail.
 */
export function ReadingDesk({books,sessions,renderCover,busy,canStart,onOpen,onStart,onLog,onMove,goals,empty}:{books:Book[];sessions:readonly ReadingSession[];renderCover:(book:Book)=>ReactNode;busy:boolean;canStart:boolean;onOpen:(book:Book)=>void;onStart:(book:Book)=>void;onLog:(book:Book)=>void;onMove:(book:Book,status:Book['status'])=>void;goals?:ReactNode;empty:ReactNode}){
 const [picked,setPicked]=useState<string|null>(null),[at,setAt]=useState(0),count=books.length,book=books.find(b=>b.id===picked)??books[0],others=books.filter(b=>b.id!==book?.id),SHOWN=2,pages=Math.max(1,Math.ceil(others.length/SHOWN)),page=Math.min(at,pages-1),shown=others.slice(page*SHOWN,page*SHOWN+SHOWN);
 return <div className="muse-desk-layout" data-count={Math.min(count,3)} data-goals={goals?true:undefined}>
  <section className="muse-desk-reading" data-layout="split" data-empty={count===0||undefined} aria-labelledby="desk-reading-heading">
   <header className="muse-desk-head"><h3 id="desk-reading-heading"><MuseMark icon="openbook" tone={5} size="sm" className="muse-books-mark"/>Currently reading {count>0&&<span className="muse-desk-count type-numeric">{count} {count===1?'book':'books'}</span>}</h3><Link href="/collections?tab=library" className="muse-desk-viewlib">View library <MuseIcon name="arrow" size={13}/></Link></header>
   {book?<div className="muse-desk-split" data-alone={others.length===0||undefined}>
    <div className="muse-desk-current"><span className="muse-desk-current-label">Current read</span><Spotlight key={book.id} book={book} sessions={sessions} cover={renderCover(book)} busy={busy} canStart={canStart} onOpen={()=>onOpen(book)} onStart={()=>onStart(book)} onLog={()=>onLog(book)} onMove={status=>onMove(book,status)}/></div>
    {others.length>0&&<div className="muse-desk-others"><div className="muse-desk-others-head"><span className="muse-desk-others-label">Also reading</span>{pages>1&&<span className="muse-desk-others-nav"><small className="type-numeric">{page*SHOWN+1}–{Math.min(others.length,page*SHOWN+SHOWN)} of {others.length}</small><button type="button" aria-label="Previous books" disabled={page===0} onClick={()=>setAt(page-1)}><MuseIcon name="chevron" size={14}/></button><button type="button" aria-label="Next books" disabled={page>=pages-1} onClick={()=>setAt(page+1)}><MuseIcon name="chevron" size={14}/></button></span>}</div>
     <div className="muse-desk-picks" role="list" aria-label="Your other books">{shown.map(b=>{const pct=percentOf(b,sessions);return <button key={b.id} type="button" role="listitem" className="muse-desk-also" aria-label={`Show ${b.title}${pct!==null?`, ${pct}% read`:''}`} title={b.title} onClick={()=>setPicked(b.id)}>
      <span className="muse-desk-pick-cover"><Cover book={b}/></span><span className="muse-desk-also-copy"><strong>{b.title}</strong><small>{b.author||'Author not recorded'}</small>{pct!==null?<><span className="muse-desk-also-meter" style={{'--fill':`${Math.max(pct,3)}%`} as CSSProperties}><i/></span><small className="type-numeric">{pct}% read</small></>:<small>Progress not recorded</small>}</span></button>;})}</div></div>}
   </div>:empty}
  </section>
  {goals&&<aside className="muse-desk-goals" aria-label="Reading goals">{goals}</aside>}
 </div>;
}
