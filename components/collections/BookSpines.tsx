'use client';
import {useCallback,useEffect,useRef,useState,type CSSProperties,type KeyboardEvent,type ReactNode} from 'react';
import {MuseIcon} from '@/components/MuseIcon';
import {validCoverUrl} from '@/lib/whimsy/books';
import './BookSpines.css';

/** What a spine needs, nothing about series: a title, an optional position, artwork or a colour, and shelf state. */
export type SpineEntry={key:string;title:string;positionLabel?:string;coverUrl:string|null;coverColor:string|null;owned:boolean;state:string};

/**
 * A row of book spines (#136), built from each book's own artwork or colour. Ownership shows as a solid or faded
 * spine, a finished book carries a small check, and one book can be "next". Books stay right-aligned and grouped;
 * when there are more than fit, the row scrolls (swipe, arrows, arrow keys) instead of shrinking spines to slivers.
 * With `onSelect` every spine is a button (tap / Enter / Space); without it they are decoration. Reused by the
 * Series page now and intended for the dedicated Bookshelf later; it draws no case, decoration or navigation.
 */
export function BookSpines({entries,nextKey,onSelect,className=''}:{entries:SpineEntry[];nextKey?:string|null;onSelect?:(key:string)=>void;className?:string}){
 const ref=useRef<HTMLDivElement>(null),[edge,setEdge]=useState({start:true,end:true});
 const update=useCallback(()=>{const el=ref.current;if(!el)return;setEdge({start:el.scrollLeft<=2,end:el.scrollLeft+el.clientWidth>=el.scrollWidth-2});},[]);
 useEffect(()=>{
  const el=ref.current;if(!el)return;
  const frame=requestAnimationFrame(update),observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(update);observer?.observe(el);
  return()=>{cancelAnimationFrame(frame);observer?.disconnect();};
 },[update,entries.length]);
 const reduced=()=>typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const page=(dir:1|-1)=>{const el=ref.current;if(!el)return;el.scrollBy({left:dir*Math.max(120,el.clientWidth*.7),behavior:reduced()?'auto':'smooth'});};
 function onKeyDown(event:KeyboardEvent<HTMLDivElement>){
  if(event.key!=='ArrowRight'&&event.key!=='ArrowLeft')return;
  const dir=event.key==='ArrowRight'?1:-1,spines=[...(ref.current?.querySelectorAll<HTMLElement>('button.muse-series-spine')??[])],at=spines.indexOf(document.activeElement as HTMLElement);
  event.preventDefault();
  if(at>=0){spines[Math.max(0,Math.min(spines.length-1,at+dir))]?.focus();return;}
  page(dir);
 }
 const overflowing=!(edge.start&&edge.end);
 const spine=(entry:SpineEntry,index:number):ReactNode=>{
  const art=entry.coverUrl&&validCoverUrl(entry.coverUrl)?entry.coverUrl:null;
  const props={className:'muse-series-spine','data-owned':entry.owned||undefined,'data-state':entry.state,'data-next':nextKey===entry.key||undefined,style:{'--spine-art':art?`url("${art.replace(/"/g,'%22')}")`:'none','--spine-tint':entry.coverColor??undefined,'--spine-h':`${82+((index*37)%18)}%`,'--spine-delay':`${Math.min(index,14)*35}ms`} as CSSProperties};
  const inner=<><em>{entry.title}</em>{entry.positionLabel&&<small className="type-numeric">{entry.positionLabel.slice(1)}</small>}{entry.state==='read'&&<b aria-hidden="true"><MuseIcon name="check" size={10}/></b>}</>;
  if(!onSelect)return <span key={entry.key} {...props}>{inner}</span>;
  const label=`${entry.positionLabel?`${entry.positionLabel} `:''}${entry.title}, ${entry.owned?'on your shelf':'not on your shelf'}`;
  return <button key={entry.key} type="button" {...props} aria-label={label} onClick={()=>onSelect(entry.key)}>{inner}</button>;
 };
 return <div className={`muse-spines ${className}`.trim()} data-overflow={overflowing||undefined} data-start={edge.start||undefined} data-end={edge.end||undefined}>
  {overflowing&&<button type="button" className="muse-spines-arrow" data-dir="prev" disabled={edge.start} aria-label="Earlier books" onClick={()=>page(-1)}><MuseIcon name="chevron" size={16}/></button>}
  <div ref={ref} className="muse-series-shelf-books" data-count={entries.length} tabIndex={overflowing?0:undefined} aria-label={overflowing?'Books in this series; use the arrow keys to move along the shelf':undefined} onScroll={update} onKeyDown={onKeyDown}>{entries.map(spine)}</div>
  {overflowing&&<button type="button" className="muse-spines-arrow" data-dir="next" disabled={edge.end} aria-label="Later books" onClick={()=>page(1)}><MuseIcon name="chevron" size={16}/></button>}
 </div>;
}
/** Placeholder spines while a series loads. */
export function BookSpinesSkeleton({count=9}:{count?:number}){
 return <div className="muse-spines" aria-hidden="true"><div className="muse-series-shelf-books">{Array.from({length:count},(_,i)=><span key={i} className="muse-series-spine" data-skeleton style={{'--spine-h':`${82+((i*37)%18)}%`} as CSSProperties}/>)}</div></div>;
}
