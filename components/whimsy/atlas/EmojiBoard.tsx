'use client';
import type {CSSProperties} from 'react';
import {MuseIcon} from '@/components/MuseIcon';
import type {Book} from '@/lib/whimsy/models';
import type {DateRange} from '@/lib/whimsy/reading-stats';
import {emojiRanking} from '@/lib/whimsy/reading-dna';
import {PagedList} from './PagedList';
import {plural} from './parts';

/**
 * Every emoji used on finished reads in a period, as in Insights: the top three in ranked circles (biggest first), the
 * rest smaller after them, each with how many books used it and what share of finished books that is. All of them are
 * reachable (paged); nothing is cut to a top three.
 */
export function EmojiBoard({books,range,label,title='Book emojis',top=3}:{books:Book[];range:DateRange|null;label:string;title?:string;top?:number}){
 const {ranking,finishedBooks,booksWithEmojis}=emojiRanking(books,range);
 const share=(n:number)=>finishedBooks?Math.round(100*n/finishedBooks):0;
 const lead=ranking.slice(0,top),rest=ranking.slice(top);
 return <article className="muse-books-panel muse-emojiboard"><div className="muse-books-panel-head"><h4><span className="muse-emojiboard-badge" aria-hidden="true"><MuseIcon name="sparkle" size={15}/></span>{title}</h4><span className="small-label">{label}</span></div>
  {!ranking.length?<p>{finishedBooks?'Add Book in Three Emojis to your finished books and they gather here.':`No finished books ${label} yet.`}</p>:<>
   <ul className="muse-emojiboard-lead" aria-label="Most used emojis">{lead.map((e,i)=><li key={e.emoji} data-rank={i+1} title={`${e.emoji} on ${plural(e.books,'book')} (${share(e.books)}% of finished books), used ${plural(e.reads,'time')}`}><span aria-hidden="true" style={{'--n':i} as CSSProperties}>{e.emoji}</span><strong className="type-numeric">×{e.books}</strong><small className="type-numeric">{share(e.books)}%</small></li>)}</ul>
   <p className="muse-emojiboard-note">{ranking[0].emoji} is on {share(ranking[0].books)}% of finished books ({plural(ranking[0].books,'book')}, used {plural(ranking[0].reads,'time')}).</p>
   {rest.length>0&&<PagedList items={rest} size={8} cols={4} label="more emojis" className="muse-emojiboard-rest" render={e=><div role="listitem" key={e.emoji} className="muse-emojiboard-item" title={`${e.emoji} on ${plural(e.books,'book')}, used ${plural(e.reads,'time')}`}><span aria-hidden="true">{e.emoji}</span><strong className="type-numeric">×{e.books}</strong><small className="type-numeric">{share(e.books)}%</small></div>}/>}
   <p className="small-label">{booksWithEmojis} of {plural(finishedBooks,'finished book')} have emojis. Each book counts each emoji once.</p></>}
 </article>;
}
