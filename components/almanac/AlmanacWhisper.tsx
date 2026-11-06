'use client';
import Link from 'next/link';
import {useState} from 'react';
import type {Signal} from '@/lib/almanac/types';
import type {Surface} from '@/lib/almanac/select';
import {MuseStar} from '../MuseStar';
import {useAlmanac} from './useAlmanac';
import './Almanac.css';

/**
 * A Whisper (#53): one observant line in context. Renders nothing when there is nothing true to say, when the person
 * turned observations off or chose Quiet, or while settings are loading.
 */
export function AlmanacWhisper({surface,signals,today,className=''}:{surface:Surface;signals:Signal[];today:string|null|undefined;className?:string}){
 const {picks,dismiss,mute}=useAlmanac(surface,signals,today),[hidden,setHidden]=useState<string[]>([]);
 const shown=picks.map((p,i)=>({p,i})).filter(({p})=>!hidden.includes(p.entry.id));
 if(!shown.length)return null;
 return <div className={`muse-almanac-whispers ${className}`}>{shown.map(({p,i})=><div key={p.entry.id} className="muse-almanac-whisper">
  <MuseStar size={12} color="aqua"/><span>{p.rendered.title&&<strong>{p.rendered.title} </strong>}{p.rendered.sections.map(s=>s.text).join(' ')}</span>
  <details className="muse-almanac-more"><summary aria-label="Options for this observation"><span aria-hidden="true">⋯</span></summary>
   <div role="group" aria-label="Observation options">
    <button type="button" className="text-button" onClick={()=>{setHidden(h=>[...h,p.entry.id]);dismiss(i);}}>Don’t show this again</button>
    <button type="button" className="text-button" onClick={()=>{setHidden(h=>[...h,p.entry.id]);mute(i);}}>Fewer like this</button>
    <Link className="text-button" href="/settings#muse-observations">Observation settings</Link>
   </div></details></div>)}</div>;
}
