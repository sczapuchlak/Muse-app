'use client';
import type {Book} from '@/lib/whimsy/models';
import type {DateRange} from '@/lib/whimsy/reading-stats';
import {readOpinion} from '@/lib/whimsy/reading-cycles';
import {readsIn} from '@/lib/whimsy/reading-dna';
import {Cover} from './CoverCalendar';
import {PagedList} from './PagedList';
import {yearDate} from './parts';

/** The best reads of the period as a shelf of covers, highest rating first; a short window you can page through. */
export function TopRated({books,range,label,onOpenBook}:{books:Book[];range:DateRange|null;label:string;onOpenBook?:(id:string)=>void}){
 const rated=readsIn(books,range).map(r=>({...r,rating:readOpinion(r.book,r.completion).rating??0})).filter(r=>r.rating>0).sort((a,b)=>b.rating-a.rating||b.completion.finishedOn.localeCompare(a.completion.finishedOn));
 return <article className="muse-books-panel"><div className="muse-books-panel-head"><h4>Top rated</h4><span className="small-label">{label}</span></div>
  {!rated.length?<p>Rate a finished read and your favourites will line up here.</p>:<PagedList items={rated} size={6} label="top rated reads" className="muse-toprated" render={r=><button type="button" role="listitem" key={`${r.book.id}:${r.completion.id}`} className="muse-toprated-item" onClick={()=>onOpenBook?.(r.book.id)} title={`${r.book.title} · ${yearDate(r.completion.finishedOn)}`}>
   <span className="muse-toprated-cover"><Cover book={r.book}/></span><span className="muse-toprated-stars" aria-label={`${r.rating} of 5`}>{'★'.repeat(Math.round(r.rating))}</span><strong>{r.book.title}</strong></button>}/>}
 </article>;
}
