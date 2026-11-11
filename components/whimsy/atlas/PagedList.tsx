'use client';
import {useState,type ReactNode} from 'react';
import {MuseIcon} from '@/components/MuseIcon';

/** A short window onto a long list: a few rows at a time with previous/next, so a panel never scrolls on and on. */
export function PagedList<T>({items,size,label,render,className='',tag='div'}:{items:T[];size:number;label:string;render:(item:T)=>ReactNode;className?:string;tag?:'div'|'ul'|'ol'}){
 const Tag=tag as 'div',[page,setPage]=useState(0),pages=Math.max(1,Math.ceil(items.length/size)),current=Math.min(page,pages-1),first=current*size;
 return <div className="muse-paged">
  <Tag className={`muse-paged-rows ${className}`.trim()} role={tag==="div"?"list":undefined} aria-label={label}>{items.slice(first,first+size).map(render)}</Tag>
  {pages>1&&<div className="muse-paged-nav"><span className="small-label type-numeric">{first+1}–{Math.min(items.length,first+size)} of {items.length}</span>
   <button type="button" className="muse-button button-ghost" aria-label={`Previous ${label}`} disabled={current===0} onClick={()=>setPage(current-1)}><MuseIcon name="chevron" size={15}/></button>
   <button type="button" className="muse-button button-ghost" aria-label={`Next ${label}`} disabled={current>=pages-1} onClick={()=>setPage(current+1)}><MuseIcon name="chevron" size={15}/></button></div>}
 </div>;
}
