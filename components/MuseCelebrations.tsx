"use client";
/* eslint-disable @next/next/no-img-element -- a book cover already shown on the shelf; next/image would proxy it. */
import {useEffect,useSyncExternalStore,type CSSProperties} from 'react';
import {dismissCelebration,readAnnouncement,readCelebration,subscribeCelebrations,type Celebration} from '@/lib/celebrate';
import {MuseStar} from './MuseStar';
import './MuseCelebrations.css';

/** Star layouts on a 200×120 sky. Small moments draw three stars; streaks seven; rare ones twelve. */
const shapes:Record<3|7|12,[number,number][]>={
 3:[[34,82],[100,30],[166,78]],
 7:[[18,70],[46,56],[74,62],[100,46],[128,72],[160,84],[182,44]],
 12:[[14,86],[36,64],[58,74],[76,48],[98,58],[112,30],[134,44],[150,22],[168,40],[186,60],[160,84],[124,92]],
};
const shapeFor=(n=7)=>n<=3?shapes[3]:n<=7?shapes[7]:shapes[12];

function Constellation({c}:{c:Celebration}){
 const stars=shapeFor(c.stars),step=c.tier==='large'?150:120;
 return <svg className="muse-cel-sky" viewBox="0 0 200 120" aria-hidden="true">
  {stars.slice(1).map(([x,y],i)=>{const [px,py]=stars[i];return <line key={i} x1={px} y1={py} x2={x} y2={y} style={{'--d':`${(i+1)*step}ms`} as CSSProperties}/>;})}
  {stars.map(([x,y],i)=><g key={i} className="muse-cel-star" style={{'--d':`${i*step}ms`,transformOrigin:`${x}px ${y}px`} as CSSProperties}><circle cx={x} cy={y} r={i===stars.length-1?4.2:3}/><circle cx={x} cy={y} r={9} className="muse-cel-halo"/></g>)}
 </svg>;
}

function BookRitual({c}:{c:Celebration}){
 const cover=c.cover&&/^(https:\/\/|\/)/.test(c.cover)?c.cover:null;
 return <div className="muse-cel-book" aria-hidden="true">
  <svg className="muse-cel-arc" viewBox="0 0 120 120"><circle cx="60" cy="60" r="54"/></svg>
  <span className="muse-cel-cover">{cover?<img src={cover} alt="" referrerPolicy="no-referrer"/>:<span className="muse-cel-cover-blank">{c.detail}</span>}<span className="muse-cel-sheen"/></span>
  <span className="muse-cel-dust">{Array.from({length:14},(_,i)=><i key={i} style={{'--i':i} as CSSProperties}><MuseStar size={i%3?7:10} color={i%2?'pink':'aqua'}/></i>)}</span>
 </div>;
}

/** Mounted once in the app shell. Shows one moment at a time; never blocks the page; Escape or Skip ends it. */
export function MuseCelebrations(){
 const c=useSyncExternalStore(subscribeCelebrations,readCelebration,()=>null);
 const said=useSyncExternalStore(subscribeCelebrations,readAnnouncement,()=>'');
 useEffect(()=>{if(!c)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape')dismissCelebration();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[c]);
 return <>
  <p className="sr-only" role="status" aria-live="polite">{said}</p>
  {c&&c.visual&&<div className="muse-cel" data-kind={c.kind} data-tier={c.tier??'medium'} key={c.id} style={{'--cel-duration':`${c.duration}ms`} as CSSProperties}>
   <div className="muse-cel-card">
    {c.kind==='book'?<BookRitual c={c}/>:c.kind==='constellation'?<Constellation c={c}/>:<span className="muse-cel-burst" aria-hidden="true">{Array.from({length:8},(_,i)=><i key={i} style={{'--i':i} as CSSProperties}><MuseStar size={9} color={i%2?'pink':'aqua'}/></i>)}<MuseStar size={22}/></span>}
    <p className="muse-cel-message" aria-hidden="true">{c.message}</p>
    {c.detail&&c.kind!=='book'&&<p className="muse-cel-detail" aria-hidden="true">{c.detail}</p>}
    {c.kind==='book'&&c.detail&&<p className="muse-cel-detail" aria-hidden="true">{c.detail}</p>}
    <button type="button" className="muse-cel-skip" onClick={dismissCelebration}>Skip</button>
   </div>
  </div>}
 </>;
}
