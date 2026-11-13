'use client';
import {AtlasMark} from './parts';
import type {Book} from '@/lib/whimsy/models';
import type {DateRange} from '@/lib/whimsy/reading-stats';
import {isFavoriteRead} from '@/lib/whimsy/reading-cycles';
import {readsIn} from '@/lib/whimsy/reading-dna';
import {Cover} from './CoverCalendar';
import {PagedList} from './PagedList';
import {yearDate} from './parts';

/** The books you hearted that you finished in the period, newest first. */
export function Favorites({books,range,label,onOpenBook,size=6,cols=6}:{books:Book[];range:DateRange|null;label:string;onOpenBook?:(id:string)=>void;size?:number;cols?:number}){
 const picks=readsIn(books,range).filter(r=>isFavoriteRead(r.book,r.completion)).sort((a,b)=>b.completion.finishedOn.localeCompare(a.completion.finishedOn));
 return <article className="muse-books-panel"><div className="muse-books-panel-head"><h4><AtlasMark title="Favorites"/>Favorites</h4><span className="small-label">{label}</span></div>
  {!picks.length?<p>Tap the heart on a finished book and it lands on this shelf.</p>:<PagedList items={picks} size={size} label="favorites" className="muse-toprated" cols={cols} render={r=><button type="button" role="listitem" key={`${r.book.id}:${r.completion.id}`} className="muse-toprated-item" onClick={()=>onOpenBook?.(r.book.id)} title={`${r.book.title} · ${yearDate(r.completion.finishedOn)}`}>
   <span className="muse-toprated-cover"><Cover book={r.book}/></span><span className="muse-toprated-stars" aria-hidden="true">♥</span><strong>{r.book.title}</strong></button>}/>}
 </article>;
}
