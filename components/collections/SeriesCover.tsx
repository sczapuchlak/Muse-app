'use client';
/* eslint-disable @next/next/no-img-element -- catalog and Library covers are external HTTPS images, as elsewhere in Books. */
import {useState,type CSSProperties} from 'react';
import {validCoverUrl} from '@/lib/whimsy/books';
import './SeriesCover.css';

/**
 * One installment's artwork. Owned covers and catalog covers render as images; without artwork, a designed
 * cover carries the title on the catalog's own cover colour (or the theme accent), never a blank box.
 */
export function SeriesCover({title,coverUrl,color,ghost=false,size='md'}:{title:string;coverUrl:string|null;color?:string|null;ghost?:boolean;size?:'sm'|'md'|'lg'}){
 const usable=coverUrl&&validCoverUrl(coverUrl)?coverUrl:null,[failed,setFailed]=useState<string|null>(null);
 const style=color?{'--series-cover-tint':color} as CSSProperties:undefined;
 return <span className="muse-series-cover" data-size={size} data-ghost={ghost||undefined} style={style}>
  {usable&&failed!==usable?<img src={usable} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(usable)}/>:<span className="muse-series-cover-fallback" aria-hidden="true"><strong>{title}</strong></span>}
 </span>;
}
