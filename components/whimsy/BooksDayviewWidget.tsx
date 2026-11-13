'use client';
import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import Link from 'next/link';
import {MuseCard} from '@/components/MuseCard';
import {CardHeading} from '@/components/CardHeading';
import {MuseIcon} from '@/components/MuseIcon';
import {GlassPopover} from '@/components/GlassPopover';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {bookPosition,closeRunningSegment,featuredReadingBook,sittingClock,todayForReading,type ReadingTimer} from '@/lib/whimsy/books';
import {unconfirmedLongStretch} from '@/lib/whimsy/reading-stats';
import {bookshelfWidgetExtras,saveWhimsyRecord} from '@/lib/whimsy/persistence';
import {validTimeZone} from '@/lib/dates';
import {readReadingTimer,readingTimerBase,saveReadingTimer} from '@/lib/whimsy/reading-timer';
import {useRouter} from 'next/navigation';
import {bookHref} from '@/lib/books/return-nav';
import {BookCover} from './Bookshelf';
import {useWhimsyData} from './WhimsyData';
import './BooksDayviewWidget.css';
import './ReadingDesk.css';
import {CoverGlow} from './BookAtmosphere';

/**
 * One chosen canonical book is projected onto Daily Edit; Collections keeps every active book. While a sitting is
 * open the widget becomes a compact controller for the one shared reading timer (#135): it re-reads the timer whenever
 * it changes in any tab, so a sitting started, paused, finished or discarded elsewhere is reflected here at once.
 */
export function BooksDayviewWidget({date}:{date:string}){
 const {records,status,timeZone,retry}=useWhimsyData(),client=useMemo(()=>createMuseBrowserClient(),[]),anchor=useRef<HTMLButtonElement>(null);
 const [pickerOpen,setPickerOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState<{id:string;revision:number;commandId:string;featuredBookId:string}|null>(null);
 const [timer,setTimer]=useState<ReadingTimer|null>(null),[timerLoaded,setTimerLoaded]=useState(false),[tick,setTick]=useState(()=>Date.now()),router=useRouter();
 const loadTimer=useCallback(async()=>{try{setTimer(await readReadingTimer(client));setTimerLoaded(true);}catch{/* the widget keeps its last known state; the book page remains authoritative */}},[client]);
 useEffect(()=>{
  const first=window.setTimeout(()=>void loadTimer(),0),refresh=()=>void loadTimer(),visible=()=>{if(document.visibilityState==='visible')refresh();};
  window.addEventListener('muse-whimsy-changed',refresh);window.addEventListener('storage',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible);
  return()=>{window.clearTimeout(first);window.removeEventListener('muse-whimsy-changed',refresh);window.removeEventListener('storage',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible);};
 },[loadTimer]);
 useEffect(()=>{if(timer?.phase!=='running')return;const id=window.setInterval(()=>setTick(Date.now()),1000);return()=>window.clearInterval(id);},[timer?.phase]);
 if(!validTimeZone(timeZone)||!status.loaded||!records)return null;
 const preference=records.widgets.find(item=>item.experience==='bookshelf');if(!preference?.enabled)return null;
 const books=records.books.filter(item=>item.status==='reading'),book=featuredReadingBook(records.books,preference.featuredBookId),today=todayForReading(timeZone);
 async function choose(featuredBookId:string){if(busy)return;if(featuredBookId===preference?.featuredBookId){setPickerOpen(false);anchor.current?.focus();return;}const next=attempt?.featuredBookId===featuredBookId?attempt:{id:preference!.id,revision:preference!.revision,commandId:crypto.randomUUID(),featuredBookId};setAttempt(next);setBusy(true);setError('');try{await saveWhimsyRecord(client,'widgets',{record:{id:next.id,experience:'bookshelf',enabled:true,...bookshelfWidgetExtras(preference),featuredBookId},expectedRevision:next.revision,commandId:next.commandId});await retry();setAttempt(null);setPickerOpen(false);anchor.current?.focus();}catch(cause){setError(cause instanceof Error?cause.message:'Book choice was not saved. Retry your selection.');}finally{setBusy(false);}}
 async function start(){if(!book||busy)return;setBusy(true);setError('');try{const existing=await readReadingTimer(client);if(existing){setTimer(existing);return;}const now=new Date().toISOString();await saveReadingTimer(client,{bookId:book.id,phase:'running',date:today,timeZone,startedAt:now,startingPage:bookPosition(book,records?.sessions??[]),...(book.cycleId?{cycleId:book.cycleId}:{}),sessionId:crypto.randomUUID(),sessionCommandId:crypto.randomUUID(),segments:[],runningSince:now},0,crypto.randomUUID());await loadTimer();}catch(cause){setError(cause instanceof Error?cause.message:'Could not start reading. Try again.');}finally{setBusy(false);}}

 /** Pause, resume and finish write the same shared timer the book page uses; overlong stretches are checked there. */
 async function control(action:'pause'|'resume'|'finish'){if(!timer||busy)return;const now=new Date().toISOString();
  if(action!=='resume'&&unconfirmedLongStretch(timer,Date.now())){router.push(bookHref(timer.bookId));return;}
  setBusy(true);setError('');try{const base=readingTimerBase(timer),segments=timer.phase==='running'&&timer.runningSince?[...timer.segments,...closeRunningSegment(timer.runningSince,now)]:timer.segments;
   const next=action==='resume'?{...base,phase:'running' as const,runningSince:now}:{...base,segments,phase:action==='pause'?'paused' as const:'finishing' as const};
   await saveReadingTimer(client,next,timer.revision,crypto.randomUUID());await loadTimer();if(action==='finish')router.push(bookHref(timer.bookId));
  }catch(cause){setError(cause instanceof Error?cause.message:'The reading timer could not be updated. Open the book to continue.');await loadTimer();}finally{setBusy(false);}}
 const timerBook=timer?records.books.find(item=>item.id===timer.bookId)??null:null,clock=timer?sittingClock(timer,tick):null,fill=timer?.targetMinutes&&clock?Math.min(100,Math.round(100*clock.elapsed/(timer.targetMinutes*60))):null;
 const session=timer&&clock?<div className="muse-daily-session" data-phase={timer.phase} aria-label="Reading session">
  {timerBook&&<span className="muse-daily-session-cover" aria-hidden="true"><BookCover book={timerBook}/></span>}
  <div className="muse-daily-session-body">
   <span className="muse-daily-session-state"><span className="muse-daily-session-dot" aria-hidden="true"/>{timer.phase==='running'?'Reading now':timer.phase==='paused'?'Paused':'Ready to check in'}</span>
   <strong className="muse-daily-session-title">{timerBook?.title??'Reading session'}</strong>
   <strong className="muse-daily-session-clock type-numeric" role="timer" aria-label={`${Math.floor(clock.elapsed/60)} minutes of active reading`}>{clock.label}</strong>
   {fill!==null&&<span className="muse-daily-session-pool" style={{'--session-fill':`${Math.max(fill,4)}%`} as CSSProperties} aria-hidden="true"><span/></span>}
   <span className="muse-daily-session-note">{timer.targetMinutes?`${clock.overtime?'Past':'Toward'} your ${timer.targetMinutes}-minute sitting`:'Open sitting · pauses don’t count'}</span>
  </div>
  <div className="muse-daily-session-actions">
   {timer.phase==='running'&&<button type="button" className="muse-button button-primary" disabled={busy} onClick={()=>void control('pause')}><MuseIcon name="pause" size={16}/>Pause</button>}
   {timer.phase==='paused'&&<><button type="button" className="muse-button button-primary" disabled={busy} onClick={()=>void control('resume')}><MuseIcon name="play" size={16}/>Resume</button><button type="button" className="muse-button button-ghost" disabled={busy} onClick={()=>void control('finish')}>Finish</button></>}
   {['finishing','saving'].includes(timer.phase)&&<Link href={bookHref(timer.bookId)} className="muse-button button-primary">Check in</Link>}
   <Link href={bookHref(timer.bookId)} className="muse-button button-ghost">Open book</Link>
  </div>
 </div>:null;
 return <MuseCard id="daily-bookshelf" className="muse-daily-bookshelf"><CardHeading id="daily-bookshelf" title="Bookshelf"><button ref={anchor} type="button" className="muse-button button-ghost muse-daily-bookshelf-settings" aria-label="Choose featured book" title="Choose featured book" aria-haspopup="dialog" aria-expanded={pickerOpen} onClick={()=>setPickerOpen(value=>!value)}><MuseIcon name="settings" size={16}/></button></CardHeading><GlassPopover id="daily-bookshelf-picker" label="Choose featured book" open={pickerOpen} anchorRef={anchor} onClose={()=>setPickerOpen(false)} width={300}><div className="muse-daily-bookshelf-picker"><strong>Feature a current read</strong>{books.length?books.map(item=><button type="button" className="muse-button button-ghost" aria-pressed={book?.id===item.id} disabled={busy} key={item.id} onClick={()=>void choose(item.id)}>{item.title}</button>):<p>No Currently Reading books yet.</p>}</div></GlassPopover>{session?null:book?<div className="muse-daily-bookshelf-feature" data-glow={book.coverUrl?true:undefined}><CoverGlow url={book.coverUrl}/><BookCover book={book}/><div><strong className="muse-daily-bookshelf-title">{book.title}</strong><span>{book.author||'Author not recorded'}</span><span>Page {bookPosition(book,records.sessions)}{book.totalPages?` of ${book.totalPages}`:''}</span>{book.totalPages&&(()=>{const pos=Math.min(bookPosition(book,records.sessions),book.totalPages),pct=Math.round(100*pos/book.totalPages);return <span className="muse-desk-pool muse-daily-bookshelf-meter" style={{'--fill':`${Math.max(pct,pos?3:0)}%`} as CSSProperties} role="meter" aria-label={`${book.title} reading progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span/></span>;})()}</div></div>:<p className="card-description">A story will find its place here when you mark a book Currently Reading.</p>}{error&&<p role="alert">{error}</p>}{session??<div className="muse-books-actions">{book&&date===today&&timerLoaded&&<button type="button" className="muse-button button-primary" disabled={busy} onClick={()=>void start()}><MuseIcon name="play" size={15}/>Start reading</button>}<Link href={book?bookHref(book.id):'/collections?kind=book'} className="muse-button button-ghost">{book?'Open book':'Open Bookshelf'} →</Link></div>}</MuseCard>;
}
