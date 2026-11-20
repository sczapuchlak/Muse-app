'use client';
import {useState} from 'react';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import {BookEmojiPicker} from './BookEmojiPicker';
import {StreakHeart} from './ReadingStreak';
import {bookReads,isFavoriteRead,preserveOpinions,readOpinion,readStats,unlinkedSessions} from '@/lib/whimsy/reading-cycles';
import {sessionSeconds} from '@/lib/whimsy/reading-stats';
import {readSummaryLine,yearDate} from './EarlierReads';
import {MuseIcon} from '@/components/MuseIcon';
import {RatingStars} from '@/components/collections/StarRating';

const md=(d:string)=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));
/** "Nov 9 – 18, 2026", "Dec 28, 2025 – Jan 3, 2026", "Nov 9, 2026 – now". */
function readRange(start?:string|null,end?:string|null){
 if(!start)return end?`Finished ${md(end)}, ${end.slice(0,4)}`:'Start not recorded';
 if(!end)return `${md(start)}, ${start.slice(0,4)} – now`;
 if(start.slice(0,4)!==end.slice(0,4))return `${md(start)}, ${start.slice(0,4)} – ${md(end)}, ${end.slice(0,4)}`;
 if(start===end)return `${md(start)}, ${start.slice(0,4)}`;
 return start.slice(0,7)===end.slice(0,7)?`${md(start)} – ${Number(end.slice(8))}, ${end.slice(0,4)}`:`${md(start)} – ${md(end)}, ${end.slice(0,4)}`;
}
const clock=(seconds:number)=>seconds<60?(seconds?'<1m':'—'):seconds<3600?`${Math.round(seconds/60)}m`:`${Math.floor(seconds/3600)}h${Math.round(seconds%3600/60)?` ${Math.round(seconds%3600/60)}m`:''}`;

/** Book details: each read with its own dates, rating, review and statistics, plus sessions not linked to a read. */
export function ReadHistory({book:saved,sessions,today,onEditSession,onSaveEmojis,onSaveFavorite}:{book:Book;sessions:ReadingSession[];today:string;onEditSession:(session:ReadingSession)=>void;onSaveEmojis?:(readId:string,emojis:string[])=>Promise<boolean>;onSaveFavorite?:(readId:string,favorite:boolean)=>Promise<boolean>}){
 const [editing,setEditing]=useState<{id:string;emojis:string[]}|null>(null);const [busy,setBusy]=useState(false);
 // Shown as it will be stored: an older single opinion on its read, or kept aside when it is ambiguous.
 const book=preserveOpinions(saved),reads=bookReads(book),unlinked=unlinkedSessions(book,sessions);
 if(reads.length<(onSaveFavorite?1:2)&&!unlinked.length&&book.unassignedRating===undefined&&!book.unassignedReview&&!book.unassignedEmojis?.length)return null;
 return <section className="muse-books-read-history" aria-label="Your reads">
  <h3>Your reads</h3>
  <ol>{reads.map(read=>{const stats=readStats(book,sessions,read,today),opinion=read.completion?readOpinion(book,read.completion):{};
   return <li key={read.id} className="muse-read-card" data-state={read.open?'open':'finished'}>
    <header className="muse-read-card-head"><span className="muse-read-card-number">Read {read.number}</span><span className="muse-read-card-badge">{read.open?'In progress':<><MuseIcon name="sparkle" size={12}/>Finished</>}</span></header>
    <p className="muse-read-card-dates" title={`${read.startedOn?yearDate(read.startedOn):'Start not recorded'} – ${read.finishedOn?yearDate(read.finishedOn):'now'}`}>{readRange(read.startedOn,read.finishedOn)}</p>
    <RatingStars value={opinion.rating} className="muse-read-card-stars" showValue/>
    {opinion.review&&<blockquote className="muse-read-card-review type-reading">{opinion.review}</blockquote>}
    {read.completion&&(editing?.id===read.id?<div className="muse-books-read-emojis"><BookEmojiPicker values={editing.emojis} onChange={v=>setEditing({id:read.id,emojis:v.slice(0,3)})}/>
      <div className="muse-books-actions"><button type="button" className="muse-button button-primary" disabled={busy} onClick={async()=>{if(!onSaveEmojis)return;setBusy(true);const ok=await onSaveEmojis(read.id,editing.emojis);setBusy(false);if(ok)setEditing(null);}}>{busy?'Saving…':'Save emojis'}</button><button type="button" className="text-button" onClick={()=>setEditing(null)}>Cancel</button></div></div>
     :<p className="muse-books-read-emojis muse-read-card-emojis">{opinion.emojis?.length?<span className="muse-read-card-emoji-set" aria-label={`Emojis for read ${read.number}: ${opinion.emojis.join(' ')}`}>{opinion.emojis.map((e,i)=><span key={i}>{e}</span>)}</span>:<span className="small-label">No emojis for this read</span>}{onSaveEmojis&&<button type="button" className="text-button" onClick={()=>setEditing({id:read.id,emojis:opinion.emojis??[]})}>{opinion.emojis?.length?'Edit emojis':'Add emojis'}</button>}</p>)}
    <dl className="muse-read-card-stats" aria-label={readSummaryLine(stats)}>
     <div><dt>{stats.sessions===1?'Sitting':'Sittings'}</dt><dd className="type-numeric">{stats.sessions}</dd></div>
     <div><dt>Time</dt><dd className="type-numeric">{clock(stats.seconds)}</dd></div>
     <div><dt>Pages</dt><dd className="type-numeric">{stats.pages}</dd></div>
     {stats.pagesPerHour!==null&&<div><dt>Pages / hour</dt><dd className="type-numeric">{Math.round(stats.pagesPerHour)}</dd></div>}
     {stats.calendarDays!==null&&<div><dt>{read.open?'Days so far':'Days'}</dt><dd className="type-numeric">{stats.calendarDays}</dd></div>}
    </dl>
    {read.completion&&onSaveFavorite&&(()=>{const on=isFavoriteRead(book,read.completion);return <button type="button" className="muse-read-favorite" aria-pressed={on} disabled={busy} onClick={async()=>{setBusy(true);await onSaveFavorite(read.id,!on);setBusy(false);}}><StreakHeart filled={on} size={18}/>{on?'A favourite in your reading log':'Mark as a favourite in my reading log'}</button>;})()}
   </li>;})}</ol>
  {book.unassignedEmojis?.length?<p className="small-label">Emojis kept from before per-read emojis: {book.unassignedEmojis.join(' ')} — they stay with the book until you add emojis to a read.</p>:null}
  {(book.unassignedRating!==undefined||book.unassignedReview)&&<p className="small-label">Kept from before per-read ratings: {[book.unassignedRating!==undefined?`${book.unassignedRating}/5`:null,book.unassignedReview?`“${book.unassignedReview}”`:null].filter(Boolean).join(' · ')} — assign it to a read in Edit book.</p>}
  {unlinked.length>0&&<div className="muse-books-unlinked"><h4>Not linked to a read</h4>
   <p className="small-label">These sessions count in all your totals, but Muse can’t tell which read they belong to. Edit one to choose its read.</p>
   {unlinked.map(s=><div className="muse-books-session-row" key={s.id}><div><strong>{yearDate(s.date)}</strong><span>{Math.round(sessionSeconds(s)/60)} min · {s.pages} pages</span></div><button type="button" className="text-button" onClick={()=>onEditSession(s)}>Edit</button></div>)}
  </div>}
 </section>;
}
