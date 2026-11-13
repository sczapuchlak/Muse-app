'use client';
/* eslint-disable @next/next/no-img-element -- User-supplied HTTPS covers cannot use a fixed image optimizer. */
import {useEffect,useState,type CSSProperties,type ReactNode} from 'react';
import type {Book} from '@/lib/whimsy/models';
import {validCoverUrl} from '@/lib/whimsy/books';
import './CoverGlow.css';

const paletteCache=new Map<string,string|null>();

/**
 * Ambient light from a book's own cover: a real element holding the cover, blurred behind the card's content.
 * (A pseudo-element reading a url() custom property didn't paint in Safari.) Renders nothing without a usable cover.
 */
export function CoverGlow({url}:{url?:string|null}){
 if(!url||!validCoverUrl(url))return null;
 return <span className="muse-cover-glow" aria-hidden="true" style={{backgroundImage:`url("${url.replace(/"/g,'%22')}")`}}/>;
}

/** A small, guarded sample. Cross-origin hosts without CORS simply use Muse's theme palette. */
function coverColor(src:string):Promise<string|null>{
 return new Promise(resolve=>{
  const image=new Image();image.crossOrigin='anonymous';image.decoding='async';
  image.onload=()=>{try{const canvas=document.createElement('canvas');canvas.width=24;canvas.height=36;const context=canvas.getContext('2d',{willReadFrequently:true});if(!context){resolve(null);return;}context.drawImage(image,0,0,24,36);const data=context.getImageData(0,0,24,36).data;let r=0,g=0,b=0,n=0;for(let i=0;i<data.length;i+=16){const red=data[i],green=data[i+1],blue=data[i+2];const max=Math.max(red,green,blue),min=Math.min(red,green,blue);if(data[i+3]<200||max-min<24||max<35||min>225)continue;r+=red;g+=green;b+=blue;n++;}if(n<8){resolve(null);return;}const average=[r/n,g/n,b/n],max=Math.max(...average),min=Math.min(...average),delta=max-min;let hue=0;if(delta){const index=average.indexOf(max);hue=60*(index===0?((average[1]-average[2])/delta)%6:index===1?(average[2]-average[0])/delta+2:(average[0]-average[1])/delta+4);}resolve(`hsl(${Math.round((hue+360)%360)} 48% 48%)`);}catch{resolve(null);}};
  image.onerror=()=>resolve(null);image.src=src;
 });
}

export function BookAtmosphere({book,children}:{book:Book;children:ReactNode}){
 const url=book.coverUrl&&validCoverUrl(book.coverUrl)?book.coverUrl:null;
 const [color,setColor]=useState<string|null>(url?paletteCache.get(url)??null:null);
 const [imageFailed,setImageFailed]=useState(false);
 useEffect(()=>{if(!url)return;let live=true;if(paletteCache.has(url))return;void coverColor(url).then(value=>{paletteCache.set(url,value);if(live)setColor(value);});return()=>{live=false;};},[url]);
 return <div className="muse-book-atmosphere" style={color?{'--book-atmosphere':color} as CSSProperties:undefined}>{url&&!imageFailed&&<div className="muse-book-atmosphere-art" aria-hidden="true">
  <img src={url} alt="" loading="lazy" decoding="async" onError={()=>setImageFailed(true)}/>
 </div>}<div className="muse-book-atmosphere-content">{children}</div></div>;
}
