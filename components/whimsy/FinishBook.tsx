'use client';
import {useState} from 'react';
import {MuseModal} from '@/components/MuseModal';
import {MuseDatePicker} from '@/components/MuseDatePicker';
import {MuseStar} from '@/components/MuseStar';
import {StarRating} from '@/components/collections/StarRating';
import {dateLabel} from '@/lib/dates';
import type {Book} from '@/lib/whimsy/models';
import {bookCompletions} from '@/lib/whimsy/reading-stats';
import {CoverThumb} from './BookSearch';
import {StreakHeart} from './ReadingStreak';
import {BookEmojiPicker} from './BookEmojiPicker';

export type FinishDetails={finishedOn:string;rating?:number;review?:string;reviewEmojis:string[];favorite?:boolean};

/**
 * The finish check-in for one read: confirm the date, then optionally rate, review and choose the book's emojis.
 * A first read starts from any rating/review already drafted on the book; a reread starts empty so earlier reads
 * keep theirs. Skipping keeps the date (and a first read's existing draft) and nothing else.
 */
export function FinishBook({book,today,busy,error,reason,onFinish,onClose}:{book:Book;today:string;busy:boolean;error?:string;reason:'shelf'|'last-page';onFinish:(details:FinishDetails)=>void;onClose:()=>void}){
 const history=bookCompletions(book),reread=history.length>0,previous=history.at(-1)?.finishedOn;
 const draft={rating:reread?undefined:book.rating,review:reread?undefined:book.finalThoughts?.trim()||undefined};
 const [finishedOn,setFinishedOn]=useState(today),[rating,setRating]=useState<number|null>(draft.rating??null),[emojis,setEmojis]=useState(reread?[]:book.reviewEmojis),[review,setReview]=useState(draft.review??''),[problem,setProblem]=useState(''),[favorite,setFavorite]=useState(false);
 function save(skip:boolean){
  setProblem('');
  if(previous&&finishedOn<previous){setProblem(`This read has to finish on or after your previous finish (${dateLabel(previous)}, ${previous.slice(0,4)}).`);return;}
  onFinish(skip?{finishedOn,...draft,reviewEmojis:reread?[]:book.reviewEmojis}:{finishedOn,...(rating?{rating}:{}),...(review.trim()?{review:review.trim()}:{}),reviewEmojis:emojis,...(favorite?{favorite:true}:{})});
 }
 return <MuseModal id="bookshelf-finish-book" label="Finish book" title={reason==='last-page'?'You reached the last page':reread?'Another read, finished':'You finished it'} returnFocus={null} onClose={onClose}>
  <form className="muse-books-dialog muse-finish-book" onSubmit={e=>{e.preventDefault();save(false);}}>
   <div className="muse-finish-book-hero">
    <span className="muse-finish-shimmer" aria-hidden="true"><MuseStar size={16}/><MuseStar size={11} color="aqua"/><MuseStar size={9} color="pink"/></span>
    {book.coverUrl?<CoverThumb src={book.coverUrl}/>:<span className="muse-finish-book-cover" aria-hidden="true">{book.title.slice(0,1)}</span>}
    <div><strong>{book.title}</strong>{book.author&&<span>{book.author}</span>}{reread&&<small className="small-label">Read {history.length+1} · your earlier {history.length===1?'read keeps its':'reads keep their'} own rating and review</small>}</div>
   </div>
   {(problem||error)&&<p role="alert" className="muse-books-error">{problem||error}</p>}
   <div className="muse-books-select-field"><span>Finished on</span><MuseDatePicker label="Finished on" date={finishedOn} today={today} onChange={setFinishedOn}/></div>
   <StarRating label="Your rating for this read" value={rating} onChange={setRating}/>
   <BookEmojiPicker values={emojis} onChange={setEmojis}/>
   <button type="button" className="muse-finish-favorite" aria-pressed={favorite} onClick={()=>setFavorite(v=>!v)}><StreakHeart filled={favorite} size={22}/><span><strong>{favorite?'A favourite in your reading log':'Mark as a favourite in my reading log'}</strong><small>It joins your favourites for {finishedOn.slice(0,4)} in the Atlas.</small></span></button>
   <label><span className="muse-whimsy-inline-label">Final thoughts on this read <small>optional</small></span><textarea value={review} onChange={e=>setReview(e.target.value)}/></label>
   <div className="muse-books-actions">
    <button type="submit" className="muse-button button-primary" disabled={busy}>Save finished book</button>
    <button type="button" className="muse-button" disabled={busy} onClick={()=>save(true)}>Skip details</button>
    <button type="button" className="muse-button button-ghost" disabled={busy} onClick={onClose}>{reason==='last-page'?'Not finished yet':'Cancel'}</button>
   </div>
  </form>
 </MuseModal>;
}
