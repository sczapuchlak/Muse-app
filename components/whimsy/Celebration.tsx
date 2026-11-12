'use client';
import {useEffect,useMemo,useState} from 'react';
import {MuseStar} from '@/components/MuseStar';
import {StreakHeart} from './ReadingStreak';
import {nextUnseen,type Celebration} from '@/lib/whimsy/celebrations';
import './Celebration.css';

const KEY='muse.celebrated.v1';
const read=():string[]=>{try{const v=JSON.parse(localStorage.getItem(KEY)??'[]');return Array.isArray(v)?v.filter(x=>typeof x==='string'):[];}catch{return [];}};
const remember=(id:string)=>{try{localStorage.setItem(KEY,JSON.stringify([...read().filter(x=>x!==id),id].slice(-80)));}catch{/* shown once this visit at worst */}};

/**
 * One gentle, dismissible celebration at a time, only for things true today, and each only once per device. It never
 * blocks the page and does not animate when reduced motion is on.
 */
export function CelebrationToast({events}:{events:readonly Celebration[]}){
 const [shown,setShown]=useState<Celebration|null>(null),[hidden,setHidden]=useState(false);
 const key=useMemo(()=>events.map(e=>e.id).join('|'),[events]);
 useEffect(()=>{const frame=requestAnimationFrame(()=>{const next=nextUnseen(events,read());if(next){remember(next.id);setShown(next);setHidden(false);}});return()=>cancelAnimationFrame(frame);},[key]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(!shown)return;const t=window.setTimeout(()=>setHidden(true),12000);return()=>window.clearTimeout(t);},[shown]);
 if(!shown||hidden)return null;
 return <div className="muse-celebrate" role="status" aria-live="polite" data-kind={shown.kind}>
  <span className="muse-celebrate-art" aria-hidden="true"><StreakHeart filled size={34}/><MuseStar size={14}/><MuseStar size={10} color="aqua"/><MuseStar size={12} color="pink"/></span>
  <div className="muse-celebrate-copy"><strong>{shown.title}</strong><span>{shown.line}</span></div>
  <button type="button" className="muse-celebrate-close" aria-label="Dismiss" onClick={()=>setHidden(true)}>×</button>
 </div>;
}
