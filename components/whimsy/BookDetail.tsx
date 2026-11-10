'use client';
import {useState,type ReactNode} from 'react';
import Link from 'next/link';
import {MuseModal} from '@/components/MuseModal';
import {ShareToStream} from '@/components/stream/ShareToStream';
import {MuseIcon} from '@/components/MuseIcon';
import type {Book,ReadingGoal,ReadingSession} from '@/lib/whimsy/models';
import type {ReadingTimer} from '@/lib/whimsy/books';
import {activeSeconds,bookPosition,bookReadingStats,sittingClock} from '@/lib/whimsy/books';
import {bookCompletions} from '@/lib/whimsy/reading-stats';
import {seriesProgress,type CollectionsSnapshot} from '@/lib/collections/models';
import {BookAtmosphere} from './BookAtmosphere';
import {BookJournal} from './BookJournal';
import {BookSittingChoice} from './BookSittingChoice';
import {ReadHistory} from './ReadHistory';
import {AddToSeries} from './AddToSeries';
import './BookDetail.css';

type Section='overview'|'sessions'|'journal'|'history'|'edition';
const statuses:Record<Book['status'],string>={planned:'Want to Read',reading:'Currently Reading',paused:'Paused',finished:'Finished'};
const duration=(seconds:number)=>seconds>=3600?`${Math.floor(seconds/3600)} hr ${Math.round(seconds%3600/60)} min`:`${Math.round(seconds/60)} min`;

export function BookDetail({book,books,sessions,goals,checkIn,timer,tick,today,userId,collections,cover,busy,onClose,onStart,onTimer,onEdit,onLog,onArchive,onRestore,onEditSession,onDeleteSession,onSaveEmojis,onMessage,statusControl}:{book:Book;books:Book[];sessions:ReadingSession[];goals:ReadingGoal[];checkIn:ReactNode;timer:ReadingTimer|null;tick:number;today:string;userId:string;collections:CollectionsSnapshot;cover:ReactNode;busy:boolean;onClose:()=>void;onStart:(targetMinutes?:number)=>void;onTimer:(action:'pause'|'resume'|'finish'|'cancel')=>void;onEdit:()=>void;onLog:()=>void;onArchive:()=>void;onRestore:()=>void;onEditSession:(session:ReadingSession)=>void;onDeleteSession:(session:ReadingSession)=>void;onSaveEmojis:(readId:string,emojis:string[])=>Promise<boolean>;onMessage:(text:string)=>void;statusControl:ReactNode}){
 const [section,setSection]=useState<Section>('overview'),[seriesOpen,setSeriesOpen]=useState(false);
 const own=sessions.filter(session=>session.bookId===book.id).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)),stats=bookReadingStats(book,sessions,today),position=bookPosition(book,sessions),percent=book.totalPages?Math.min(100,Math.round(position/book.totalPages*100)):null,active=timer?.bookId===book.id;
 const memberships=collections.seriesMembers.filter(member=>member.book_id===book.id).map(member=>({member,series:collections.series.find(series=>series.id===member.series_id)})).filter((value):value is typeof value&{series:NonNullable<typeof value.series>}=>!!value.series);
 const timeline=new Map<string,{seconds:number;pages:number}>();for(const session of own){const point=timeline.get(session.date)??{seconds:0,pages:0};point.seconds+=activeSeconds(session.activeSegments);point.pages+=session.pages;timeline.set(session.date,point);}const days=[...timeline].sort((a,b)=>a[0].localeCompare(b[0])).slice(-14),max=Math.max(1,...days.map(([,value])=>value.pages||value.seconds/60));
 const primary=timer?.phase==='paused'?'Resume reading':'Pause reading';
 return <MuseModal id="bookshelf-detail" label="Book details" title={book.title} returnFocus={null} onClose={onClose} size="tall"><BookAtmosphere book={book}><div className="muse-book-detail">
  <header className="muse-book-detail-hero">
   <div className="muse-book-detail-art">{cover}</div>
   <div className="muse-book-detail-intro">
    <p className="small-label">YOUR LIVING LIBRARY · {statuses[book.status]}</p>
    <h2>{book.title}</h2>
    <p className="muse-book-detail-author">{book.author||'Author not recorded'}</p>
    <p className="muse-book-detail-genre">{book.genre||book.format||'Your story, your way'}</p>
    {active&&<div className="muse-book-detail-primary">
     {['running','paused'].includes(timer!.phase)&&<button type="button" className="muse-button button-primary" disabled={busy} onClick={()=>onTimer(timer?.phase==='paused'?'resume':'pause')}>{primary}</button>}
     {['running','paused'].includes(timer!.phase)&&<button type="button" className="muse-button button-ghost" disabled={busy} onClick={()=>onTimer('finish')}>Finish session</button>}
     {timer?.phase!=='saving'&&<button type="button" className="text-button" disabled={busy} onClick={()=>onTimer('cancel')}>Discard session</button>}
    </div>}
    {active&&<p className="muse-book-detail-clock" data-overtime={sittingClock(timer!,tick).overtime} role="timer">{sittingClock(timer!,tick).label} {timer?.targetMinutes?`${sittingClock(timer!,tick).overtime?'overtime':'remaining'} · `:''}active reading · {timer?.phase==='paused'?'paused':timer?.phase==='running'?'in progress':'check-in waiting'}</p>}
    {!active&&timer&&<p className="small-label">Finish your active session with another book before starting this one.</p>}
    <div className="muse-book-detail-progress"><span className="small-label">{book.totalPages?`${position} of ${book.totalPages} pages · ${percent}%`:`${position} current page · total not recorded`}</span>{percent!==null&&<progress value={percent} max={100} aria-label={`${percent}% complete`}/>}<span className="small-label">{book.startedOn?`Started ${book.startedOn}`:'Start date not recorded'}{book.status==='finished'&&book.finishedOn?` · Finished ${book.finishedOn}`:''}</span></div>
   </div>
  </header>
  {checkIn&&<section className="muse-book-detail-checkin" aria-label="Save this reading session">{checkIn}</section>}
  {!timer&&<BookSittingChoice books={books} sessions={sessions} goals={goals} today={today} tick={tick} busy={busy} onStart={onStart}/>}
  {memberships.length>0&&<div className="muse-book-detail-series">{memberships.map(({member,series})=>{const progress=seriesProgress(series,collections.seriesMembers,books,collections.media),reading=progress.ordered.filter(row=>row.item?.status==='reading').length;return <Link key={member.id} href={`/collections?view=series&series=${series.id}`}><span className="small-label">PART OF A SERIES · BOOK {member.sequence}</span><strong>{series.title}</strong><span>{progress.completed} of {progress.availableTotal} released mainline books read{reading?` · ${reading} reading`:''}</span>{progress.percentage!==null&&<progress value={progress.percentage} max={100} aria-label={`${series.title}: ${Math.round(progress.percentage)}% complete`}/>}</Link>;})}</div>}
  <nav className="muse-book-detail-nav muse-segmented" aria-label="Book detail sections">{([['overview','Overview'],['sessions','Sessions'],['journal','Journal'],['history','History'],['edition','Edition']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={section===id} onClick={()=>setSection(id)}>{label}</button>)}</nav>
  <div className="muse-book-detail-body">{section==='overview'&&<><div className="muse-book-detail-metrics"><div><span>Active time</span><strong>{stats.seconds?duration(stats.seconds):'—'}</strong></div><div><span>Pages logged</span><strong>{stats.sessions?stats.pages:'—'}</strong></div><div><span>Sessions</span><strong>{stats.sessions||'—'}</strong></div><div><span>Pace</span><strong>{stats.pagesPerHour?`${Math.round(stats.pagesPerHour)} pages/hr`:'—'}</strong></div></div>{!stats.sessions&&<p className="muse-books-detail-empty">No reading logged yet. Start a timer, log a session, or add a thought whenever you like.</p>}{book.description&&<details className="muse-books-about"><summary>About this book</summary><p>{book.description}</p></details>}<div className="muse-books-actions">{statusControl}<button type="button" className="muse-button button-ghost" onClick={onEdit}>Edit book</button><button type="button" className="muse-button button-ghost" onClick={onLog}>Log a session</button><button type="button" className="muse-button button-ghost" onClick={()=>setSection('journal')}>Write a thought</button><button type="button" className="text-button" onClick={()=>setSeriesOpen(value=>!value)}>{memberships.length?'+ Another series':'+ Add to a series'}</button><ShareToStream kind="book" id={book.id} className="text-button"/></div>{seriesOpen&&<AddToSeries book={book} onCancel={()=>setSeriesOpen(false)} onDone={text=>{setSeriesOpen(false);onMessage(text);}}/>}</>}
  {section==='sessions'&&<section><div className="muse-book-detail-section-head"><div><h3>Reading sessions</h3><p>{own.length?`${own.length} saved ${own.length===1?'session':'sessions'} · ${stats.pages} pages logged`:'Your pages and time will appear here.'}</p></div><button type="button" className="muse-button button-ghost" onClick={onLog}>+ Log manually</button></div>{days.length>1&&<div className="muse-book-detail-chart" role="img" aria-label={`Reading activity on ${days.length} recorded days`}>{days.map(([date,point])=><div key={date} title={`${date}: ${point.pages} pages, ${duration(point.seconds)}`}><span style={{height:`${Math.max(5,(point.pages||point.seconds/60)/max*100)}%`}}/><small>{date.slice(5)}</small></div>)}</div>}{!own.length?<p className="muse-books-detail-empty">No sessions yet.</p>:<ol className="muse-book-detail-session-list">{own.map(session=><li key={session.id}><div><strong>{session.date}</strong><span>{session.pages} pages · {activeSeconds(session.activeSegments)?duration(activeSeconds(session.activeSegments)):'Time not recorded'}{session.manual?' · manual':''}</span>{session.notes&&<p>{session.notes}</p>}</div><div className="muse-books-actions"><button type="button" className="text-button" onClick={()=>onEditSession(session)}>Edit</button><button type="button" className="text-button" onClick={()=>onDeleteSession(session)}>Delete</button></div></li>)}</ol>}</section>}
  <div hidden={section!=='journal'}><BookJournal book={book} sessions={sessions} today={today} userId={userId}/></div>
  {section==='history'&&<section><div className="muse-book-detail-section-head"><div><h3>Your reads</h3><p>{bookCompletions(book).length?`${bookCompletions(book).length} completed ${bookCompletions(book).length===1?'read':'reads'} · each one kept`: 'Your reading story starts here.'}</p></div></div><ReadHistory book={book} sessions={sessions} today={today} onSaveEmojis={onSaveEmojis} onEditSession={onEditSession}/></section>}
  {section==='edition'&&<section className="muse-book-detail-edition"><h3>Edition & details</h3><dl><div><dt>Format</dt><dd>{book.format||'Not recorded'}</dd></div><div><dt>ISBN</dt><dd>{book.isbn||'Not recorded'}</dd></div><div><dt>Publisher</dt><dd>{book.publisher||'Not recorded'}</dd></div><div><dt>Published</dt><dd>{book.publishedDate||'Not recorded'}</dd></div><div><dt>Pages</dt><dd>{book.totalPages??'Not recorded'}</dd></div></dl><button type="button" className="muse-button button-ghost" onClick={onEdit}>Edit details</button></section>}
  <div className="muse-book-detail-footer">{book.archivedAt?<button type="button" className="muse-button button-ghost" onClick={onRestore}>Restore to library</button>:<button type="button" className="text-button" onClick={onArchive}><MuseIcon name="trash" size={15}/> {own.length||bookCompletions(book).length?'Archive or delete':'Delete book'}</button>}</div></div>
 </div></BookAtmosphere></MuseModal>;
}
