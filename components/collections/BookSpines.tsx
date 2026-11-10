'use client';
import type {CSSProperties} from 'react';
import {MuseIcon} from '@/components/MuseIcon';
import {validCoverUrl} from '@/lib/whimsy/books';
import './BookSpines.css';

/** What a spine needs, nothing about series: a title, an optional position, artwork or a colour, and shelf state. */
export type SpineEntry={key:string;title:string;positionLabel?:string;coverUrl:string|null;coverColor:string|null;owned:boolean;state:string};

/**
 * A row of book spines (#136), built from each book's own artwork or colour. Ownership shows as a solid or faded
 * spine, a finished book carries a small check, and one book can be "next". Reused by the Series page now and
 * intended for the dedicated Bookshelf later; it draws no case, decoration or navigation.
 */
export function BookSpines({entries,nextKey,className=''}:{entries:SpineEntry[];nextKey?:string|null;className?:string}){
 return <div className={`muse-series-shelf-books ${className}`.trim()} data-count={entries.length}>{entries.map((entry,index)=>{
  const art=entry.coverUrl&&validCoverUrl(entry.coverUrl)?entry.coverUrl:null;
  return <span key={entry.key} className="muse-series-spine" data-owned={entry.owned||undefined} data-state={entry.state} data-next={nextKey===entry.key||undefined} style={{'--spine-art':art?`url("${art.replace(/"/g,'%22')}")`:'none','--spine-tint':entry.coverColor??undefined,'--spine-h':`${82+((index*37)%18)}%`,'--spine-delay':`${index*35}ms`} as CSSProperties}>
   <em>{entry.title}</em>{entry.positionLabel&&<small className="type-numeric">{entry.positionLabel.slice(1)}</small>}{entry.state==='read'&&<b aria-hidden="true"><MuseIcon name="check" size={10}/></b>}
  </span>;})}</div>;
}
/** Placeholder spines while a series loads. */
export function BookSpinesSkeleton({count=9}:{count?:number}){
 return <div className="muse-series-shelf-books" aria-hidden="true">{Array.from({length:count},(_,i)=><span key={i} className="muse-series-spine" data-skeleton style={{'--spine-h':`${82+((i*37)%18)}%`} as CSSProperties}/>)}</div>;
}
