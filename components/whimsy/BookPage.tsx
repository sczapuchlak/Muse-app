'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {MuseIcon} from '@/components/MuseIcon';
import {GlassPopover} from '@/components/GlassPopover';
import {ShareToStream} from '@/components/stream/ShareToStream';
import {SeriesCover} from '@/components/collections/SeriesCover';
import type {Book,ReadingGoal,ReadingSession} from '@/lib/whimsy/models';
import type {ReadingTimer} from '@/lib/whimsy/books';
import {activeSeconds,bookPosition,bookReadingStats,sittingClock} from '@/lib/whimsy/books';
import {bookCompletions} from '@/lib/whimsy/reading-stats';
import {seriesCompletion,seriesShelf,shelfStateLabel,type ShelfEntry} from '@/lib/books/series-view';
import {bookHref,currentReturn,goBack,rememberReturn,seriesHref} from '@/lib/books/return-nav';
import {BookAtmosphere} from './BookAtmosphere';
import {BookJournal} from './BookJournal';
import {BookSittingChoice} from './BookSittingChoice';
import {ReadHistory} from './ReadHistory';
import {AddToSeries} from './AddToSeries';
import {useBookCatalog} from './useBookCatalog';
import './BookDetail.css';
import './BookPage.css';

type Tab='sessions'|'journal'|'reads'|'details';
const statusLabel:Record<Book['status'],string>={planned:'Want to Read',reading:'Currently Reading',paused:'Paused',finished:'Finished'};
const duration=(seconds:number)=>seconds>=3600?`${Math.floor(seconds/3600)} hr ${Math.round(seconds%3600/60)} min`:`${Math.max(1,Math.round(seconds/60))} min`;
const longDate=(iso?:string)=>{if(!iso)return '';if(/^\d{4}$/.test(iso))return iso;const d=new Date(`${iso.length===7?`${iso}-01`:iso.slice(0,10)}T12:00:00Z`);return Number.isNaN(d.getTime())?iso:new Intl.DateTimeFormat(undefined,{year:'numeric',...(iso.length>7?{month:'long',day:'numeric'}:iso.length===7?{month:'long'}:{}),timeZone:'UTC'}).format(d);};
const yearOf=(iso?:string)=>iso?.match(/\b(1[5-9]\d\d|20\d\d)\b/)?.[1];
const formatLabel:Record<NonNullable<Book['format']>,string>={physical:'Print',ebook:'Ebook',audiobook:'Audiobook'};

export type BookPageProps={
 book:Book;books:Book[];sessions:ReadingSession[];goals:ReadingGoal[];today:string;userId:string;tick:number;busy:boolean;
 timer:ReadingTimer|null;timerLoaded:boolean;timerBook:Book|null;checkIn:ReactNode;cover:ReactNode;
 onStart:(targetMinutes?:number)=>void;onTimer:(action:'pause'|'resume'|'finish'|'cancel')=>void;
 onEdit:()=>void;onLog:()=>void;onArchive:()=>void;onRestore:()=>void;onMove:(status:Book['status'])=>void;
 onEditSession:(session:ReadingSession)=>void;onDeleteSession:(session:ReadingSession)=>void;
 onSaveEmojis:(readId:string,emojis:string[])=>Promise<boolean>;onMessage:(text:string)=>void;
 onEnrich:(changes:Partial<Book>)=>Promise<Book|null>;
};

/**
 * A book's own page in Collections (#136): who it is (cover, title, author, publication, series), what it is
 * about, where it sits in its series, and the reader's own time with it. The reading companion holds the one
 * shared timer and its existing write paths; nothing here changes how sessions or reads are recorded.
 */
export function BookPage(props:BookPageProps){
 const {book,books,sessions,today,timer,tick,busy}=props;
 const router=useRouter();
 const [tab,setTab]=useState<Tab>('sessions'),[aboutOpen,setAboutOpen]=useState(false),[menuOpen,setMenuOpen]=useState(false),[addingSeries,setAddingSeries]=useState(false);
 const [back,setBack]=useState<{href:string;label:string}|null>(null);
 const menuAnchor=useRef<HTMLButtonElement>(null),panelRef=useRef<HTMLElement>(null),tabsRef=useRef<HTMLDivElement>(null),stripRef=useRef<HTMLOListElement>(null);
 const [panelVisible,setPanelVisible]=useState(true);
 const catalog=useBookCatalog(book,books,props.onEnrich);
 useEffect(()=>{const frame=requestAnimationFrame(()=>setBack(currentReturn()));return()=>cancelAnimationFrame(frame);},[]);
 useEffect(()=>{const node=panelRef.current;if(!node||typeof IntersectionObserver==='undefined')return;const observer=new IntersectionObserver(([entry])=>setPanelVisible(entry.isIntersecting),{threshold:0.05});observer.observe(node);return()=>observer.disconnect();},[]);

 const own=sessions.filter(s=>s.bookId===book.id).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));
 const stats=bookReadingStats(book,sessions,today),finished=book.status==='finished',rawPosition=bookPosition(book,sessions),position=finished&&book.totalPages?Math.max(rawPosition,book.totalPages):rawPosition,percent=book.totalPages?Math.min(100,Math.round(position/book.totalPages*100)):finished?100:null;
 const reads=bookCompletions(book),active=timer?.bookId===book.id,elsewhere=!!timer&&!active;
 const clock=active?sittingClock(timer!,tick):null;

 const primary=catalog.memberships.find(m=>m.series.kind==='book')??catalog.memberships[0]??null;
 const shelf=primary?seriesShelf(primary.series,catalog.records.seriesMembers.filter(m=>m.series_id===primary.series.id),books,today):null;
 // The primary books; a novella or companion being viewed joins the strip at its own position.
 const current=shelf?.additional.find(e=>e.book?.id===book.id),strip=shelf?(current?[...shelf.primary,current].sort((a,b)=>(a.position??999)-(b.position??999)):shelf.primary):[];
 const isPrimary=!!shelf?.primary.some(e=>e.book?.id===book.id);
 const seriesKey=primary?primary.series.id:null;
 // "#3 of 7" only for a primary book; a novella keeps its own position ("#0.5") without a denominator.
 const positionText=primary&&primary.member.position_known?`#${Number(primary.member.sequence)}${isPrimary&&shelf?.primaryCount?` of ${shelf.primaryCount}`:''}`:primary?'Part of':'';

 const year=yearOf(book.publishedDate),facts=[year,book.publisher,book.totalPages?`${book.totalPages} pages`:null,book.format?formatLabel[book.format]:null].filter(Boolean) as string[];
 const genres=(book.genre??'').split(',').map(g=>g.trim()).filter(Boolean);
 const synopsis=book.description?.trim()??'',longSynopsis=synopsis.length>520||synopsis.split('\n').length>4;

 function open(href:string,label:string){rememberReturn(href.split('#')[0],label);router.push(href);}
 function leave(){goBack(router,'/collections?kind=book');}
 const openSeries=()=>{if(seriesKey)open(seriesHref(seriesKey,`book:${book.id}`),book.title);};
 const openEntry=(entry:ShelfEntry)=>{if(entry.book&&entry.book.id!==book.id)open(bookHref(entry.book.id,`book:${book.id}`),book.title);else if(!entry.book&&seriesKey)open(`${seriesHref(seriesKey,`book:${book.id}`)}#installment-${entry.member.id}`,book.title);};

 // The strip opens on this book, with its neighbours either side.
 useEffect(()=>{const strip=stripRef.current,current=strip?.querySelector<HTMLElement>('li[data-current]');if(!strip||!current)return;strip.scrollTo({left:Math.max(0,current.offsetLeft-strip.clientWidth/2+current.clientWidth/2),behavior:'instant' as ScrollBehavior});},[strip.length,primary?.series.id]);
 const sessionLabel=!active?'':timer?.phase==='running'?'Reading now':timer?.phase==='paused'?'Paused':timer?.phase==='saving'?'Saving your session':'Session check-in';
 const panel=<aside ref={panelRef} className="muse-card muse-book-panel" aria-label="Your reading" data-active={active||undefined}>
  <div className="muse-book-panel-progress">
   <div className="muse-book-panel-heading"><span className="small-label">Your reading</span>{reads.length>0&&<span className="muse-book-panel-reads">{reads.length===1?'Read once':`Read ${reads.length} times`}</span>}</div>
   <p className="muse-book-panel-pages"><strong className="type-numeric">{position}</strong><span> / {book.totalPages?<span className="type-numeric">{book.totalPages}</span>:'?'} pages</span>{percent!==null&&<em className="type-numeric">{percent}%</em>}</p>
   <div className="muse-book-panel-meter" role="meter" aria-label="Reading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent??0}><span style={{width:`${percent??0}%`}}/></div>
   <p className="muse-book-panel-dates">{book.status==='finished'&&book.finishedOn?`Finished ${longDate(book.finishedOn)}`:book.startedOn?`Started ${longDate(book.startedOn)}`:book.status==='planned'?'Not started yet':'Start date not recorded'}{!book.totalPages&&<> · <button type="button" className="text-button" onClick={props.onEdit}>Add page count</button></>}</p>
  </div>
  {active&&clock&&<section className="muse-book-session" data-phase={timer!.phase} aria-label="Reading session">
   <div className="muse-book-session-head"><span className="muse-book-session-dot" aria-hidden="true"/><span className="small-label">{sessionLabel}</span></div>
   <strong className="muse-book-session-clock type-numeric" role="timer" data-overtime={clock.overtime||undefined}>{clock.label}</strong>
   <p className="muse-book-session-note">{timer!.targetMinutes?`${clock.overtime?'Past':'Toward'} your ${timer!.targetMinutes}-minute sitting`:'Open sitting'} · pauses don’t count</p>
   {['running','paused'].includes(timer!.phase)&&<div className="muse-book-session-actions">
    <button type="button" className="muse-button button-primary" disabled={busy} onClick={()=>props.onTimer(timer!.phase==='paused'?'resume':'pause')}><MuseIcon name={timer!.phase==='paused'?'play':'pause'} size={16}/>{timer!.phase==='paused'?'Resume':'Pause'}</button>
    <button type="button" className="muse-button button-ghost" disabled={busy} onClick={()=>props.onTimer('finish')}>Finish session</button>
   </div>}
   {timer!.phase!=='saving'&&<button type="button" className="text-button muse-book-session-discard" disabled={busy} onClick={()=>props.onTimer('cancel')}>Discard session</button>}
   {props.checkIn&&<div className="muse-book-session-checkin">{props.checkIn}</div>}
  </section>}
  {elsewhere&&<section className="muse-book-session-elsewhere" aria-label="Session in progress"><span className="small-label">A sitting is open</span><p>You’re reading <strong>{props.timerBook?.title??'another book'}</strong> right now. Finish or pause it there to start this one.</p>{props.timerBook&&<button type="button" className="muse-button button-ghost" onClick={()=>open(bookHref(props.timerBook!.id),book.title)}>Go to that book</button>}</section>}
  {!timer&&props.timerLoaded&&<BookSittingChoice books={books} sessions={sessions} goals={props.goals} today={today} tick={tick} busy={busy} onStart={props.onStart} variant="panel" heading={finished?'Read it again?':undefined}/>}
  {!props.timerLoaded&&<p className="muse-book-panel-loading" role="status">Checking for an open sitting…</p>}
  <div className="muse-book-panel-stats">{stats.sessions?<><div><span>Time</span><strong>{duration(stats.seconds)}</strong></div><div><span>Pages</span><strong className="type-numeric">{stats.pages}</strong></div><div><span>Sittings</span><strong className="type-numeric">{stats.sessions}</strong></div>{stats.pagesPerHour?<div><span>Pace</span><strong>{Math.round(stats.pagesPerHour)}/hr</strong></div>:null}</>:<p>No sittings logged yet. Your time and pages gather here.</p>}</div>
  <div className="muse-book-panel-actions"><button type="button" className="muse-button button-ghost" onClick={props.onLog}><MuseIcon name="plus" size={15}/>Log reading</button><button type="button" className="muse-button button-ghost" onClick={()=>{setTab('journal');requestAnimationFrame(()=>tabsRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));}}><MuseIcon name="edit" size={15}/>Write a thought</button></div>
 </aside>;

 const seriesSection=primary&&shelf?<section className="muse-book-series-section" aria-labelledby="book-series-heading">
  <header className="muse-book-series-head">
   <div><span className="small-label">{positionText?`${positionText} in the series${isPrimary?'':' · additional work'}`:'The series'}</span><h2 id="book-series-heading"><Link href={seriesHref(seriesKey!,`book:${book.id}`)} onClick={event=>{if(event.metaKey||event.ctrlKey)return;event.preventDefault();openSeries();}}>{primary.series.title}</Link></h2></div>
   <div className="muse-book-series-chips">{shelf.primaryCount>0&&<span className="muse-book-chip" data-tone="accent">{shelf.primaryCount} primary {shelf.primaryCount===1?'book':'books'}</span>}{shelf.additional.length>0&&<span className="muse-book-chip">+{shelf.additional.length} additional {shelf.additional.length===1?'work':'works'}</span>}{seriesCompletion(shelf).badge?<span className="muse-book-chip" data-tone="done"><MuseIcon name="check" size={12}/>{seriesCompletion(shelf).badge}</span>:<span className="muse-book-chip">{shelf.readCount} of {shelf.primaryCount} read</span>}</div>
  </header>
  <div className="muse-book-series-meter" role="meter" aria-label={`${primary.series.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={shelf.percent}><span style={{width:`${shelf.percent}%`}}/></div>
  <ol ref={stripRef} className="muse-book-series-strip" aria-label={`${primary.series.title}, in reading order`}>{strip.map(entry=>{const current=entry.book?.id===book.id;return <li key={entry.key} data-current={current||undefined} data-state={entry.state}>
   <button type="button" onClick={()=>openEntry(entry)} disabled={current} aria-label={`${entry.positionLabel?`${entry.positionLabel} `:''}${entry.title}, ${current?'this book':shelfStateLabel[entry.state]}`}>
    <SeriesCover title={entry.title} coverUrl={entry.coverUrl} color={entry.coverColor} ghost={!entry.book} size="sm"/>
    {entry.positionLabel&&<span className="muse-book-series-badge-pos">{entry.positionLabel}</span>}
    {entry.state==='read'&&<span className="muse-book-series-mark" data-mark="read" aria-hidden="true"><MuseIcon name="check" size={12}/></span>}
    {entry.state==='reading'&&!current&&<span className="muse-book-series-mark" data-mark="reading" aria-hidden="true"/>}
   </button>
   {(current||entry.state!=='missing')&&<span className="muse-book-series-caption">{current?'This book':entry.state==='upcoming'&&entry.year?`Coming ${entry.year}`:shelfStateLabel[entry.state]}</span>}
  </li>;})}</ol>
  <div className="muse-book-series-foot">{shelf.next&&shelf.next.book?.id!==book.id&&<p>Next in order: <strong>{shelf.next.title}</strong>{!shelf.next.book&&' · not on your shelf yet'}</p>}<button type="button" className="text-button" onClick={openSeries}>View full series <MuseIcon name="arrow" size={14}/></button></div>
 </section>:catalog.state==='checking'?<section className="muse-book-series-section" aria-busy="true" aria-label="Looking for this book’s series"><span className="small-label">Looking for this book’s series…</span><div className="muse-book-series-strip muse-skeleton-strip" aria-hidden="true">{[0,1,2,3,4].map(i=><span key={i}/>)}</div></section>:null;

 return <BookAtmosphere book={book}><article className="muse-book-page" aria-labelledby="book-page-title">
  <nav className="muse-book-page-crumbs" aria-label="Book navigation">
   <button type="button" className="muse-book-page-back" onClick={leave}><MuseIcon name="arrow" size={16}/><span>{back?`Back to ${back.label}`:'Books'}</span></button>
   <ol className="muse-book-page-trail"><li><Link href="/collections">Collections</Link></li><li><Link href="/collections?kind=book">Books</Link></li></ol>
  </nav>
  <header className="muse-book-page-hero">
   <div className="muse-book-page-cover">{props.cover}</div>
   <div className="muse-book-page-identity">
    {primary&&<button type="button" className="muse-book-page-series-chip" onClick={openSeries}><MuseIcon name="series" size={14}/>{positionText} {positionText==='Part of'?'':'·'} {primary.series.title}</button>}
    {!primary&&catalog.state==='checking'&&<span className="muse-book-page-series-chip" data-loading="true" aria-hidden="true">Finding series…</span>}
    <h1 id="book-page-title" className="type-title">{book.title}</h1>
    <p className="muse-book-page-author">{book.author?<>by <strong>{book.author}</strong></>:'Author not recorded'}</p>
    {facts.length>0&&<p className="muse-book-page-facts">{facts.map((fact,index)=><span key={index}>{fact}</span>)}</p>}
    {genres.length>0&&<ul className="muse-book-page-genres" aria-label="Genres">{genres.map(g=><li key={g} className="muse-book-chip">{g}</li>)}</ul>}
    <div className="muse-book-page-controls">
     <span className="muse-book-page-status" data-status={book.status}><MuseChoiceMenu label={`Reading status: ${statusLabel[book.status]}`} valueLabel={statusLabel[book.status]} options={Object.entries(statusLabel).map(([id,label])=>({id,label}))} selectedIds={[book.status]} onSelect={id=>props.onMove(id as Book['status'])}/></span>
     <button type="button" className="muse-button button-ghost" onClick={props.onEdit}><MuseIcon name="edit" size={15}/>Edit</button>
     <button ref={menuAnchor} type="button" className="muse-icon-button muse-icon-button-glass" aria-label="More for this book" aria-haspopup="menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)}><MuseIcon name="more" size={18}/></button>
     <GlassPopover id="book-page-more" label="More for this book" open={menuOpen} anchorRef={menuAnchor} onClose={()=>setMenuOpen(false)} width={240} bare>
      <div className="popover-choice-list">
       <button type="button" className="popover-choice" onClick={()=>{setMenuOpen(false);setAddingSeries(true);}}><span><MuseIcon name="series" size={14}/> {primary?'Add to another series':'Add to a series'}</span></button>
       <ShareToStream kind="book" id={book.id} className="popover-choice"/>
       {book.archivedAt?<button type="button" className="popover-choice" onClick={()=>{setMenuOpen(false);props.onRestore();}}><span><MuseIcon name="undo" size={14}/> Restore to library</span></button>:<button type="button" className="popover-choice" onClick={()=>{setMenuOpen(false);props.onArchive();}}><span><MuseIcon name="trash" size={14}/> {own.length||reads.length?'Archive or delete':'Delete book'}</span></button>}
      </div>
     </GlassPopover>
    </div>
    {book.archivedAt&&<p className="muse-book-page-archived" role="note">Archived · kept in your statistics. <button type="button" className="text-button" onClick={props.onRestore}>Restore to library</button></p>}
   </div>
  </header>
  {panel}
  <div className="muse-card muse-book-page-main">
   {addingSeries&&<div className="muse-book-page-add-series"><AddToSeries book={book} onCancel={()=>setAddingSeries(false)} onDone={text=>{setAddingSeries(false);props.onMessage(text);}}/></div>}
   <section className="muse-book-about" aria-labelledby="book-about-heading">
    <h2 id="book-about-heading" className="muse-book-page-section-title">About this book</h2>
    {synopsis?<><div className="muse-book-about-text type-reading" data-clamped={longSynopsis&&!aboutOpen||undefined}>{synopsis.split(/\n{2,}|\n/).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>{longSynopsis&&<button type="button" className="text-button muse-book-about-toggle" aria-expanded={aboutOpen} onClick={()=>setAboutOpen(v=>!v)}>{aboutOpen?'Show less':'Read more'}</button>}</>
     :catalog.state==='checking'?<div className="muse-skeleton-lines" aria-busy="true" aria-label="Looking for a synopsis"><span/><span/><span/></div>
     :<p className="muse-book-about-empty">No synopsis is available from the catalog for this edition. <button type="button" className="text-button" onClick={props.onEdit}>Add your own</button></p>}
   </section>
   {seriesSection}
   <div ref={tabsRef} className="muse-book-page-tabs-wrap">
    <nav className="muse-page-tabs muse-book-page-tabs" aria-label="Your time with this book">{([['sessions',`Sittings${own.length?` · ${own.length}`:''}`],['journal','Journal'],['reads',`Reads${reads.length?` · ${reads.length}`:''}`],['details','Details']] as const).map(([id,label])=><button key={id} type="button" aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)}>{label}</button>)}</nav>
   </div>
   {tab==='sessions'&&<section className="muse-book-page-panel" aria-label="Reading sittings">
    {own.length===0?<div className="muse-book-page-empty"><p>Your sittings will gather here, with the pages and minutes of each one.</p><button type="button" className="muse-button button-ghost" onClick={props.onLog}>Log a past sitting</button></div>:<ol className="muse-book-detail-session-list">{own.map(session=><li key={session.id}><div><strong>{longDate(session.date)}</strong><span>{session.pages} {session.pages===1?'page':'pages'} · {activeSeconds(session.activeSegments)?duration(activeSeconds(session.activeSegments)):'Time not recorded'}{session.manual?' · logged by hand':''}{session.reread?' · reread':''}</span>{session.notes&&<p>{session.notes}</p>}</div><div className="muse-books-actions"><button type="button" className="text-button" onClick={()=>props.onEditSession(session)}>Edit</button><button type="button" className="text-button" onClick={()=>props.onDeleteSession(session)}>Delete</button></div></li>)}</ol>}
   </section>}
   <div hidden={tab!=='journal'}><BookJournal book={book} sessions={sessions} today={today} userId={props.userId}/></div>
   {tab==='reads'&&<section className="muse-book-page-panel" aria-label="Your reads"><ReadHistory book={book} sessions={sessions} today={today} onSaveEmojis={props.onSaveEmojis} onEditSession={props.onEditSession}/></section>}
   {tab==='details'&&<section className="muse-book-page-panel muse-book-detail-edition" aria-label="Edition and details"><dl>
    <div><dt>Published</dt><dd>{book.publishedDate?longDate(book.publishedDate):'Not listed'}</dd></div>
    <div><dt>Publisher</dt><dd>{book.publisher||'Not listed'}</dd></div>
    <div><dt>Format</dt><dd>{book.format?formatLabel[book.format]:'Not recorded'}</dd></div>
    <div><dt>Pages</dt><dd>{book.totalPages??'Not recorded'}</dd></div>
    <div><dt>ISBN</dt><dd className="type-numeric">{book.isbn||'Not listed'}</dd></div>
    <div><dt>Added</dt><dd>{longDate(book.createdAt.slice(0,10))}</dd></div>
   </dl><p className="small-label muse-book-page-source">{book.metadataSource?`Catalog details from ${book.metadataSource.provider==='google-books'?'Google Books':book.metadataSource.provider==='open-library'?'Open Library':'Hardcover'}${book.metadataSource.hardcoverId&&book.metadataSource.provider!=='hardcover'?' and Hardcover':''}. Everything stays editable.`:'Entered by you. Everything stays editable.'}</p><button type="button" className="muse-button button-ghost" onClick={props.onEdit}>Edit details</button></section>}
  </div>
  {active&&!panelVisible&&<div className="muse-book-miniplayer" role="region" aria-label="Reading session"><span className="muse-book-session-dot" aria-hidden="true"/><strong className="type-numeric">{clock?.label}</strong><span>{sessionLabel}</span>{['running','paused'].includes(timer!.phase)?<button type="button" className="muse-button button-primary" disabled={busy} onClick={()=>props.onTimer(timer!.phase==='paused'?'resume':'pause')} aria-label={timer!.phase==='paused'?'Resume reading':'Pause reading'}><MuseIcon name={timer!.phase==='paused'?'play':'pause'} size={16}/></button>:<button type="button" className="text-button" onClick={()=>panelRef.current?.scrollIntoView({behavior:'smooth',block:'center'})}>Check in</button>}</div>}
 </article></BookAtmosphere>;
}
