'use client';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import {bookReads,preserveOpinions,readOpinion,readStats,unlinkedSessions} from '@/lib/whimsy/reading-cycles';
import {sessionSeconds} from '@/lib/whimsy/reading-stats';
import {readSummaryLine,yearDate} from './EarlierReads';

/** Book details: each read with its own dates, rating, review and statistics, plus sessions not linked to a read. */
export function ReadHistory({book:saved,sessions,today,onEditSession}:{book:Book;sessions:ReadingSession[];today:string;onEditSession:(session:ReadingSession)=>void}){
 // Shown as it will be stored: an older single opinion on its read, or kept aside when it is ambiguous.
 const book=preserveOpinions(saved),reads=bookReads(book),unlinked=unlinkedSessions(book,sessions);
 if(reads.length<2&&!unlinked.length&&book.unassignedRating===undefined&&!book.unassignedReview)return null;
 return <section className="muse-books-read-history" aria-label="Your reads">
  <h3>Your reads</h3>
  <ol>{reads.map(read=>{const stats=readStats(book,sessions,read,today),opinion=read.completion?readOpinion(book,read.completion):{};
   return <li key={read.id}><strong>Read {read.number}{read.open?' · in progress':''}</strong>
    <span>{read.startedOn?yearDate(read.startedOn):'Start not recorded'} – {read.finishedOn?yearDate(read.finishedOn):'now'}{opinion.rating?` · ${opinion.rating}/5`:''}</span>
    {opinion.review&&<p>{opinion.review}</p>}
    <small className="small-label">{readSummaryLine(stats)}</small></li>;})}</ol>
  {(book.unassignedRating!==undefined||book.unassignedReview)&&<p className="small-label">Kept from before per-read ratings: {[book.unassignedRating!==undefined?`${book.unassignedRating}/5`:null,book.unassignedReview?`“${book.unassignedReview}”`:null].filter(Boolean).join(' · ')} — assign it to a read in Edit book.</p>}
  {unlinked.length>0&&<div className="muse-books-unlinked"><h4>Not linked to a read</h4>
   <p className="small-label">These sessions count in all your totals, but Muse can’t tell which read they belong to. Edit one to choose its read.</p>
   {unlinked.map(s=><div className="muse-books-session-row" key={s.id}><div><strong>{yearDate(s.date)}</strong><span>{Math.round(sessionSeconds(s)/60)} min · {s.pages} pages</span></div><button type="button" className="text-button" onClick={()=>onEditSession(s)}>Edit</button></div>)}
  </div>}
 </section>;
}
