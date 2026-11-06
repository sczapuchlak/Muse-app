'use client';
import {useState} from 'react';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import {BookEmojiPicker} from './BookEmojiPicker';
import {bookReads,preserveOpinions,readOpinion,readStats,unlinkedSessions} from '@/lib/whimsy/reading-cycles';
import {sessionSeconds} from '@/lib/whimsy/reading-stats';
import {readSummaryLine,yearDate} from './EarlierReads';

/** Book details: each read with its own dates, rating, review and statistics, plus sessions not linked to a read. */
export function ReadHistory({book:saved,sessions,today,onEditSession,onSaveEmojis}:{book:Book;sessions:ReadingSession[];today:string;onEditSession:(session:ReadingSession)=>void;onSaveEmojis?:(readId:string,emojis:string[])=>Promise<boolean>}){
 const [editing,setEditing]=useState<{id:string;emojis:string[]}|null>(null);const [busy,setBusy]=useState(false);
 // Shown as it will be stored: an older single opinion on its read, or kept aside when it is ambiguous.
 const book=preserveOpinions(saved),reads=bookReads(book),unlinked=unlinkedSessions(book,sessions);
 if(reads.length<2&&!unlinked.length&&book.unassignedRating===undefined&&!book.unassignedReview&&!book.unassignedEmojis?.length)return null;
 return <section className="muse-books-read-history" aria-label="Your reads">
  <h3>Your reads</h3>
  <ol>{reads.map(read=>{const stats=readStats(book,sessions,read,today),opinion=read.completion?readOpinion(book,read.completion):{};
   return <li key={read.id}><strong>Read {read.number}{read.open?' · in progress':''}</strong>
    <span>{read.startedOn?yearDate(read.startedOn):'Start not recorded'} – {read.finishedOn?yearDate(read.finishedOn):'now'}{opinion.rating?` · ${opinion.rating}/5`:''}</span>
    {opinion.review&&<p>{opinion.review}</p>}
    {read.completion&&(editing?.id===read.id?<div className="muse-books-read-emojis"><BookEmojiPicker values={editing.emojis} onChange={v=>setEditing({id:read.id,emojis:v.slice(0,3)})}/>
      <div className="muse-books-actions"><button type="button" className="muse-button button-primary" disabled={busy} onClick={async()=>{if(!onSaveEmojis)return;setBusy(true);const ok=await onSaveEmojis(read.id,editing.emojis);setBusy(false);if(ok)setEditing(null);}}>{busy?'Saving…':'Save emojis'}</button><button type="button" className="text-button" onClick={()=>setEditing(null)}>Cancel</button></div></div>
     :<p className="muse-books-read-emojis">{opinion.emojis?.length?<span aria-label={`Emojis for read ${read.number}: ${opinion.emojis.join(' ')}`}>{opinion.emojis.join(' ')}</span>:<span className="small-label">No emojis for this read</span>}{onSaveEmojis&&<button type="button" className="text-button" onClick={()=>setEditing({id:read.id,emojis:opinion.emojis??[]})}>{opinion.emojis?.length?'Edit emojis':'Add emojis'}</button>}</p>)}
    <small className="small-label">{readSummaryLine(stats)}</small></li>;})}</ol>
  {book.unassignedEmojis?.length?<p className="small-label">Emojis kept from before per-read emojis: {book.unassignedEmojis.join(' ')} — they stay with the book until you add emojis to a read.</p>:null}
  {(book.unassignedRating!==undefined||book.unassignedReview)&&<p className="small-label">Kept from before per-read ratings: {[book.unassignedRating!==undefined?`${book.unassignedRating}/5`:null,book.unassignedReview?`“${book.unassignedReview}”`:null].filter(Boolean).join(' · ')} — assign it to a read in Edit book.</p>}
  {unlinked.length>0&&<div className="muse-books-unlinked"><h4>Not linked to a read</h4>
   <p className="small-label">These sessions count in all your totals, but Muse can’t tell which read they belong to. Edit one to choose its read.</p>
   {unlinked.map(s=><div className="muse-books-session-row" key={s.id}><div><strong>{yearDate(s.date)}</strong><span>{Math.round(sessionSeconds(s)/60)} min · {s.pages} pages</span></div><button type="button" className="text-button" onClick={()=>onEditSession(s)}>Edit</button></div>)}
  </div>}
 </section>;
}
