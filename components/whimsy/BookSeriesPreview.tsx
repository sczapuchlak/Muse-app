'use client';
/* eslint-disable @next/next/no-img-element -- saved book covers use the same external URLs as the Library. */
import type {Book} from '@/lib/whimsy/models';
import type {Series,SeriesMember} from '@/lib/collections/models';
import {bookCompletions} from '@/lib/whimsy/reading-stats';

const labels:Record<Book['status'],string>={planned:'Want to read',reading:'Reading',paused:'On hold',finished:'Read'};

/** A compact window onto the same saved installment references used by Series Detail. */
export function BookSeriesPreview({series,members,books,currentBookId,onOpen}:{series:Series;members:SeriesMember[];books:Book[];currentBookId:string;onOpen:()=>void}){
 return <section className="muse-book-series-preview" aria-label={`${series.title} series preview`}>
  <div className="muse-book-series-preview-head"><div><span className="small-label">IN THIS SERIES</span><h3>{series.title}</h3><p>{series.catalog_primary_count??members.length} known primary books · your place in the story</p></div><button type="button" className="muse-button button-ghost" onClick={onOpen}>View full series →</button></div>
  <ol className="muse-book-series-preview-list">{members.map(row=>{const owned=books.find(book=>book.id===row.book_id),read=!!owned&&bookCompletions(owned).length>0;return <li key={row.id} data-current={row.book_id===currentBookId}><span className="muse-book-series-preview-order">{row.position_known?`#${row.sequence}`:'·'}</span><span className="muse-book-series-preview-cover">{owned?.coverUrl?<img src={owned.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<span aria-hidden="true">✧</span>}</span><span className="muse-book-series-preview-copy"><strong>{owned?.title??row.catalog_title??'Untitled installment'}</strong><small>{owned?read?'Read':labels[owned.status]:'Not on your shelf'}</small></span></li>;})}</ol>
 </section>;
}
