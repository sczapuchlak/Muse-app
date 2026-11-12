'use client';
import type {CSSProperties,ReactNode} from 'react';

/** One palette for every Atlas graphic, so a genre, a format or a time of day keeps the same colour across the page. */
export const PALETTE=['#b57cff','#2fc7e8','#ff9f3d','#ff5fae','#7bd957','#5b8dff','#f2c230','#f08a5d'] as const;
export const paletteAt=(i:number)=>PALETTE[i%PALETTE.length];
export type Slice={key:string;label:string;value:number;extra?:ReactNode;detail?:string};

/** A ring made of coloured slices (like Insights' Overall Day ring, but divided). The centre says what it adds up to. */
export function Donut({slices,main,sub,label,size=148}:{slices:Slice[];main:ReactNode;sub?:ReactNode;label:string;size?:number}){
 const total=slices.reduce((n,s)=>n+Math.max(0,s.value),0);
 let at=0;const stops=total?slices.map((s,i)=>{const from=at;at+=Math.max(0,s.value)/total*100;return `${paletteAt(i)} ${from}% ${at}%`;}).join(','):'color-mix(in srgb,var(--glass-border) 70%,transparent) 0 100%';
 return <span className="muse-donut" role="img" aria-label={label} style={{'--size':`${size}px`,'--stops':stops} as CSSProperties}><span><strong className="type-numeric">{main}</strong>{sub&&<small>{sub}</small>}</span></span>;
}

/** A single-value ring (average rating, a share): the same gradient ring as Insights. */
export function ValueRing({value,max,main,sub,label,size=120}:{value:number|null;max:number;main:ReactNode;sub?:ReactNode;label:string;size?:number}){
 return <span className="muse-donut muse-valuering" data-missing={value===null||undefined} role="img" aria-label={label} style={{'--size':`${size}px`,'--ring':value===null?0:Math.min(1,value/max)} as CSSProperties}><span><strong className="type-numeric">{main}</strong>{sub&&<small>{sub}</small>}</span></span>;
}

/** A segmented bar with a dotted legend, as in "How it felt". Segments with no value are left out. */
export function SegBar({slices,label,note}:{slices:Slice[];label:string;note?:ReactNode}){
 const live=slices.filter(s=>s.value>0),total=live.reduce((n,s)=>n+s.value,0);
 return <div className="muse-segbar-wrap">
  <div className="muse-segbar" role="img" aria-label={label}>{live.map(s=><i key={s.key} style={{flexGrow:s.value,'--c':paletteAt(slices.indexOf(s))} as CSSProperties} title={`${s.label} · ${s.value}`}/>)}</div>
  <ul className="muse-segkey">{live.map(s=><li key={s.key}><i style={{'--c':paletteAt(slices.indexOf(s))} as CSSProperties} aria-hidden="true"/><span>{s.label}</span><strong className="type-numeric">{s.detail??`${Math.round(100*s.value/total)}%`}</strong>{s.extra}</li>)}</ul>
  {note&&<p className="small-label">{note}</p>}
 </div>;
}
