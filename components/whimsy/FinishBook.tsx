'use client';
import {useMemo,useState} from 'react';
import {MuseModal} from '@/components/MuseModal';
import {MuseDatePicker,MuseOptionalDatePicker} from '@/components/MuseDatePicker';
import {MuseStar} from '@/components/MuseStar';
import {MuseIcon} from '@/components/MuseIcon';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {StarRating} from '@/components/collections/StarRating';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import {bookCompletions,sessionSeconds} from '@/lib/whimsy/reading-stats';
import {bookReads,openReadId,readLabel,sessionReadId} from '@/lib/whimsy/reading-cycles';
import {bookPosition} from '@/lib/whimsy/books';
import {blankRow,completionSummary,isBlankRow,occupiedSegments,placeRowMinutes,suggestedDates,validateDates,validateRows,type DateSource,type RowIssue,type SessionRow} from '@/lib/books/completion';
import type {ReadingPlan} from '@/lib/books/finish';
import {CoverThumb} from './BookSearch';
import {StreakHeart} from './ReadingStreak';
import {BookEmojiPicker} from './BookEmojiPicker';
import {SessionRows} from './SessionRows';
import {yearDate} from './EarlierReads';
import './Bookshelf.css';
import './FinishBook.css';

export type FinishDetails={finishedOn:string;rating?:number;review?:string;reviewEmojis:string[];favorite?:boolean};
/**
 * Where Finish Book was opened. add: Already read from Add Book · shelf: the status menu · last-page: a session reached
 * the last page · timer: "I finished this book" from the live timer · log: logging several sessions · past-read: adding
 * an earlier read from Your reads.
 */
export type FinishContext='add'|'shelf'|'last-page'|'timer'|'log'|'past-read';
/** The live sitting being finished: its own date, active time and starting page. */
export type TimerSittingInfo={date:string;seconds:number;startingPage:number};
export type FinishSave={plan:ReadingPlan;timerEndingPage?:number};

const sourceText:Record<DateSource,string>={none:'',entered:'',sessions:'From your sessions',book:'From this book',today:'Today',timer:'From this sitting'};
const minutesText=(s:number)=>{const m=Math.round(s/60);return m<60?`${m} min`:`${Math.floor(m/60)} h${m%60?` ${m%60} min`:''}`;};

/**
 * The one Finish Book sheet for every entry point. It records a read finished now or in the past — by its dates alone,
 * or with the sessions you have — and its rating (in half stars), emojis, favourite and final thoughts, the same fields
 * as a live finish. A first read starts from any rating/review already drafted on the book; another read starts empty
 * so earlier reads keep theirs. Nothing is saved until "Save as Finished"; Cancel leaves the book exactly as it was.
 */
export function FinishBook({book,today,timeZone,busy,error,context,sessions,timer,onSave,onClose}:{book:Book;today:string;timeZone:string;busy:boolean;error?:string;context:FinishContext;sessions:readonly ReadingSession[];timer?:TimerSittingInfo;onSave:(save:FinishSave)=>void;onClose:()=>void}){
 const history=bookCompletions(book),reads=bookReads(book),hasOpen=book.status!=='finished'&&book.status!=='planned';
 const [which,setWhich]=useState<'current'|'past'>(context==='past-read'||(book.status==='finished'&&context!=='log')?'past':'current');
 const finishing=context!=='log';
 const [logFinish,setLogFinish]=useState(false),willFinish=finishing||logFinish;
 const target:'current'|'past'=book.status==='finished'?'past':which;
 const reread=history.length>0,draft={rating:reread||target==='past'?undefined:book.rating,review:reread||target==='past'?undefined:book.finalThoughts?.trim()||undefined};
 const [mode,setMode]=useState<'dates'|'sessions'>(context==='log'?'sessions':'dates');
 const [rows,setRows]=useState<SessionRow[]>(()=>[blankRow(undefined,context==='log'?today:'')]);
 const [touched,setTouched]=useState<Set<string>>(()=>new Set()),[attempted,setAttempted]=useState(false),[accepted,setAccepted]=useState(false);
 const historical=context==='add'||context==='past-read'||target==='past';
 const initialStart=target==='current'&&book.startedOn?{v:book.startedOn,s:'book' as DateSource}:timer?{v:timer.date,s:'timer' as DateSource}:{v:'',s:'none' as DateSource};
 const initialFinish=historical?{v:'',s:'none' as DateSource}:{v:today,s:'today' as DateSource};
 const [start,setStart]=useState(initialStart),[finish,setFinish]=useState(initialFinish);
 const [pages,setPages]=useState(book.totalPages?String(book.totalPages):'');
 const [rating,setRating]=useState<number|null>(draft.rating??null),[emojis,setEmojis]=useState(reread||target==='past'?[]:book.reviewEmojis),[review,setReview]=useState(draft.review??''),[favorite,setFavorite]=useState(false);
 const [endPage,setEndPage]=useState(()=>timer?String(book.totalPages&&book.totalPages>=timer.startingPage?book.totalPages:''):'');
 // The read the rows belong to: the read in progress, or (logging a finished book) the read the reader picks.
 const [logRead,setLogRead]=useState(()=>reads.at(-1)?.id??'');
 const totalPages=/^\d+$/.test(pages.trim())&&Number(pages)>0?Number(pages):undefined;

 const readId=context==='log'?logRead:target==='current'?openReadId(book):undefined;
 const own=useMemo(()=>readId||target==='current'?sessions.filter(s=>s.bookId===book.id&&sessionReadId(book,s,reads)===(readId??reads.at(-1)?.id)):[],[sessions,book,reads,readId,target]);
 const firstStart=target==='past'||context==='add'?0:context==='log'&&readId!==reads.at(-1)?.id?0:bookPosition(book,sessions as ReadingSession[]);
 const usingRows=mode==='sessions'&&!timer;
 const dateWindow=willFinish?{startedOn:start.v||undefined,finishedOn:finish.v||undefined}:{};
 const {parsed,issues:rowIssues}=usingRows?validateRows(rows,{totalPages,today,firstStart,existing:own,...dateWindow}):{parsed:[],issues:[]};
 const placement=usingRows?placeRowMinutes(parsed,timeZone,occupiedSegments(sessions)):null;
 const issues:RowIssue[]=[...rowIssues,...(placement?.failures??[]).map(f=>({key:f.key,field:'minutes' as const,level:'error' as const,message:f.message}))];
 // Dates from the sessions, until the reader enters their own (the first session isn't assumed to be day one).
 const suggested=suggestedDates(parsed,totalPages);
 // An earlier start the book already knows wins over the first session; a later one gives way to it.
 const startShown=start.s==='entered'||!suggested.startedOn||(start.v&&start.v<=suggested.startedOn)?start:{v:suggested.startedOn,s:'sessions' as DateSource};
 const finishShown=finish.s==='entered'?finish:suggested.finishedOn?{v:suggested.finishedOn,s:'sessions' as DateSource}:finish;
 const sittingDates=timer?[timer.date]:parsed.map(p=>p.date);
 const dateProblems=willFinish?validateDates({target,today,startedOn:startShown.v,finishedOn:finishShown.v,completions:history,openStartedOn:target==='past'&&hasOpen?book.startedOn:undefined,openSessions:target==='past'?sessions.filter(s=>s.bookId===book.id&&sessionReadId(book,s,reads)===reads.at(-1)?.id&&!!reads.at(-1)?.open):own,sessionDates:sittingDates}):[];
 const timerEnd=timer?Number(endPage):undefined,timerProblem=timer?(!/^\d+$/.test(endPage.trim())?'Enter the page you finished on.':timerEnd!<timer.startingPage?`This sitting started on page ${timer.startingPage}.`:totalPages&&timerEnd!>totalPages?`Past the last page (${totalPages}).`:''):'';
 const pagesProblem=pages.trim()&&!totalPages?'Use a whole number of pages.':'';
 const blocking=issues.some(i=>i.level==='error')||(issues.some(i=>i.level==='confirm')&&!accepted)||dateProblems.length>0||!!timerProblem||!!pagesProblem||(usingRows&&!parsed.length);
 const showAll=attempted;
 const sessionCount=parsed.length+own.length+(timer?1:0),minutes=parsed.reduce((n,p)=>n+p.minutes*60,0)+own.reduce((n,s)=>n+sessionSeconds(s),0)+(timer?.seconds??0);

 function save(skip=false){
  setAttempted(true);if(blocking||busy)return;
  const opinion=skip?{...draft,reviewEmojis:reread||target==='past'?[]:book.reviewEmojis}:{...(rating?{rating}:{}),...(review.trim()?{review:review.trim()}:{}),reviewEmojis:emojis,...(favorite?{favorite:true}:{})};
  const plan:ReadingPlan=willFinish?{target,startedOn:startShown.v||undefined,finishedOn:finishShown.v,opinion,...(totalPages&&totalPages!==book.totalPages?{totalPages}:{}),rows:parsed}:{target:'log',rows:parsed,logReadId:logRead,...(totalPages&&totalPages!==book.totalPages?{totalPages}:{})};
  onSave({plan,...(timer?{timerEndingPage:timerEnd}:{})});
 }
 const title=context==='log'?'Log reading sessions':context==='add'?'Already read':target==='past'?(context==='past-read'?'Add a past read':'Another read, finished'):context==='last-page'?'You reached the last page':reread?'Another read, finished':'You finished it';
 const tag=(s:DateSource)=>sourceText[s]?<span className="muse-finish-source" data-source={s}>{sourceText[s]}</span>:null;
 // A missing finish date is pointed out on Save; a conflicting date as soon as it is chosen.
 const err=(field:'startedOn'|'finishedOn')=>dateProblems.find(p=>p.field===field&&(showAll||field==='startedOn'||!!finishShown.v))?.message;
 const summary=completionSummary({finishedOn:finishShown.v,totalPages,sessions:sessionCount,minutes:Math.round(minutes/60),rating});
 return <MuseModal id="bookshelf-finish-book" size="tall" label={title} title={title} returnFocus={null} onClose={onClose}>
  <form className="muse-books-dialog muse-books-form muse-finish-book" data-context={context} onSubmit={e=>{e.preventDefault();save(false);}} noValidate>
   <div className="muse-books-form-body">
   <div className="muse-finish-book-hero">
    <span className="muse-finish-shimmer" aria-hidden="true"><MuseStar size={16}/><MuseStar size={11} color="aqua"/><MuseStar size={9} color="pink"/></span>
    {book.coverUrl?<CoverThumb src={book.coverUrl}/>:<span className="muse-finish-book-cover" aria-hidden="true">{book.title.slice(0,1)}</span>}
    <div><strong>{book.title}</strong>{book.author&&<span>{book.author}</span>}{willFinish&&target==='past'&&<small className="small-label">Added to your reading history{history.length?` · your other ${history.length===1?'read keeps its':'reads keep their'} own rating and review`:''}</small>}{willFinish&&target==='current'&&reread&&<small className="small-label">Read {history.length+1} · your earlier {history.length===1?'read keeps its':'reads keep their'} own rating and review</small>}</div>
   </div>
   {error&&<p role="alert" className="muse-books-error">{error}</p>}

   {hasOpen&&(context==='add'||context==='past-read')&&<div className="muse-finish-section"><span className="small-label">Which read is this?</span><div className="muse-segmented" role="group" aria-label="Which read is this"><button type="button" aria-pressed={which==='current'} onClick={()=>setWhich('current')}>My current read</button><button type="button" aria-pressed={which==='past'} onClick={()=>setWhich('past')}>An earlier read</button></div>
    <small className="small-label">{which==='current'?'Finishes the read in progress and keeps its sessions.':'Adds a finished read from before; your current read carries on.'}</small></div>}

   {timer&&<section className="muse-finish-section muse-finish-sitting" aria-label="This sitting"><span className="small-label">This sitting</span>
    <p><strong className="type-numeric">{minutesText(timer.seconds)}</strong> from page {timer.startingPage} · {yearDate(timer.date)}</p>
    <label className="muse-finish-endpage"><span>Finished on page</span><input inputMode="numeric" value={endPage} onChange={e=>setEndPage(e.target.value)} aria-invalid={!!timerProblem&&showAll||undefined}/>{book.totalPages?<span className="small-label">of {book.totalPages}</span>:<span className="small-label">This book’s length isn’t recorded, so enter your last page.</span>}</label>
    {timerProblem&&showAll&&<p role="alert" className="muse-finish-problem">{timerProblem}</p>}
   </section>}

   {context==='log'&&reads.length>1&&<div className="muse-books-select-field"><span>Which read?</span><MuseChoiceMenu label="Which read these sessions belong to" valueLabel={readLabel(reads.find(r=>r.id===logRead)??reads.at(-1)!,yearDate)} options={reads.map(r=>({id:r.id,label:readLabel(r,yearDate)}))} selectedIds={[logRead]} onSelect={setLogRead}/></div>}

   {!timer&&context!=='log'&&<div className="muse-finish-section"><span className="small-label">How would you like to record it?</span><div className="muse-segmented muse-finish-mode" role="group" aria-label="How to record this read"><button type="button" aria-pressed={mode==='dates'} onClick={()=>setMode('dates')}>Start &amp; finish dates</button><button type="button" aria-pressed={mode==='sessions'} onClick={()=>setMode('sessions')}>Reading sessions</button></div>
    <small className="small-label">{mode==='dates'?'Just the dates. Muse won’t invent sessions, pages per day or reading time.':'Enter the sessions you have, all at once. Time counts only where you enter minutes.'}</small></div>}

   {own.length>0&&willFinish&&target==='current'&&<p className="small-label muse-finish-own">Already logged for this read: {own.length} {own.length===1?'session':'sessions'} · {minutesText(own.reduce((n,s)=>n+sessionSeconds(s),0))} · {own.reduce((n,s)=>n+s.pages,0)} pages. They stay as they are.</p>}

   {usingRows&&<section className="muse-finish-section" aria-label="Reading sessions"><SessionRows rows={rows} onChange={setRows} parsed={parsed} issues={issues} showAll={showAll} touched={touched} onTouch={key=>setTouched(t=>new Set(t).add(key))} today={today} totalPages={totalPages} firstStart={firstStart} accepted={accepted} onAccept={setAccepted}/>
    {showAll&&rows.every(isBlankRow)&&<p role="alert" className="muse-finish-problem">Add at least one session, or choose Start &amp; finish dates.</p>}
    {willFinish&&suggested.lastPage!==undefined&&totalPages&&!suggested.complete&&<p className="small-label">Your sessions end on page {suggested.lastPage} of {totalPages}. Muse won’t invent the rest; enter the day you finished.</p>}
   </section>}

   {context==='log'&&book.status!=='finished'&&<button type="button" className="muse-finish-favorite muse-finish-toggle" aria-pressed={logFinish} onClick={()=>setLogFinish(v=>!v)}><MuseIcon name="sparkle" size={18}/><span><strong>{logFinish?'These sessions finished the book':'I finished the book with these sessions'}</strong><small>{logFinish?'Add the dates, rating and review below.':'Records the read as Finished, with its dates, rating and review.'}</small></span></button>}

   {willFinish&&<div className="muse-finish-dates">
    <div className="muse-books-select-field"><span>Started <small>optional</small> {tag(startShown.s)}</span><MuseOptionalDatePicker label="Started" emptyText="Not recorded" near={finishShown.v||undefined} date={startShown.v} today={today} onChange={v=>setStart({v,s:'entered'})}/>{err('startedOn')&&<p role="alert" className="muse-finish-problem">{err('startedOn')}</p>}</div>
    <div className="muse-books-select-field"><span>Finished {tag(finishShown.s)}</span>{finishShown.v?<MuseDatePicker label="Finished on" date={finishShown.v} today={today} onChange={v=>setFinish({v,s:'entered'})}/>:<MuseOptionalDatePicker label="Finished on" emptyText="Choose the day" near={startShown.v||undefined} date="" today={today} onChange={v=>setFinish({v,s:'entered'})}/>}{err('finishedOn')&&<p role="alert" className="muse-finish-problem">{err('finishedOn')}</p>}</div>
    <label className="muse-finish-pages"><span>Pages <small>in the edition you read</small></span><input inputMode="numeric" value={pages} placeholder="Not recorded" onChange={e=>setPages(e.target.value)} aria-invalid={!!pagesProblem||undefined}/>{pagesProblem&&<p role="alert" className="muse-finish-problem">{pagesProblem}</p>}</label>
   </div>}

   {willFinish&&<>
    <StarRating step={0.5} label="Your rating for this read" value={rating} onChange={setRating}/>
    <BookEmojiPicker values={emojis} onChange={setEmojis}/>
    <button type="button" className="muse-finish-favorite" aria-pressed={favorite} onClick={()=>setFavorite(v=>!v)}><StreakHeart filled={favorite} size={22}/><span><strong>{favorite?'A favourite in your reading log':'Mark as a favourite in my reading log'}</strong><small>{finishShown.v?`It joins your favourites for ${finishShown.v.slice(0,4)} in the Atlas.`:'It joins your favourites for the year you finished it.'}</small></span></button>
    <label><span className="muse-whimsy-inline-label">Final thoughts on this read <small>optional</small></span><textarea value={review} onChange={e=>setReview(e.target.value)}/></label>
   </>}

   {finishShown.v&&willFinish&&finishShown.v.slice(0,7)!==today.slice(0,7)&&<p className="small-label muse-finish-counts">It counts in {new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${finishShown.v}T12:00:00Z`))}, when you finished it.</p>}
   </div>
   <div className="muse-books-form-footer muse-finish-footer">
   <p className="muse-finish-summary" role="status">{willFinish?summary:`${parsed.length} ${parsed.length===1?'session':'sessions'} to save${parsed.length?` · ${parsed.reduce((n,p)=>n+p.pages,0)} pages`:''}`}</p>
   {showAll&&blocking&&<p className="small-label muse-finish-problem" role="alert">Check the highlighted fields above.</p>}
   <div className="muse-books-actions muse-finish-actions">
    <button type="submit" className="muse-button button-primary" disabled={busy}>{busy?'Saving…':willFinish?'Save as Finished':'Save sessions'}</button>
    {(context==='shelf'||context==='last-page')&&mode==='dates'&&<button type="button" className="muse-button" disabled={busy} onClick={()=>save(true)}>Skip details</button>}
    <button type="button" className="muse-button button-ghost" disabled={busy} onClick={onClose}>{context==='last-page'?'Not finished yet':context==='timer'?'Back to the sitting':'Cancel'}</button>
   </div>
   </div>
  </form>
 </MuseModal>;
}
