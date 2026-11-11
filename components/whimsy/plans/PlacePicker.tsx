'use client';
import {useState,type ReactNode} from 'react';
import {MuseModal} from '@/components/MuseModal';
import {periodLabel,shiftPeriod,shortPeriodLabel,type PlanKind} from '@/lib/books/reading-plans';
import './ReadingPlans.css';

/**
 * Choose a month or a year: for adding, moving, copying and jumping. Periods that already hold the book (or that are
 * the current one) are shown and disabled with a reason, so a book is never added twice by accident.
 */
export function PlacePicker({title,kind:initialKind,lockKind=false,start,today,taken=new Set(),takenLabel='Already in this plan',counts,onPick,onClose,footer}:{footer?:ReactNode;title:string;kind:PlanKind;lockKind?:boolean;start:string;today:string;taken?:ReadonlySet<string>;takenLabel?:string;counts?:ReadonlyMap<string,number>;onPick:(kind:PlanKind,period:string)=>void;onClose:()=>void}){
 const [kind,setKind]=useState<PlanKind>(initialKind),[anchor,setAnchor]=useState(kind==='month'?start.slice(0,4):start);
 const year=Number(anchor.slice(0,4)),months=Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`),years=Array.from({length:6},(_,i)=>String(Number(anchor)-2+i));
 const list=kind==='month'?months:years,key=(p:string)=>`${kind}:${p}`,now=kind==='month'?today.slice(0,7):today.slice(0,4);
 const switchKind=(next:PlanKind)=>{setKind(next);setAnchor(next==='month'?today.slice(0,4):today.slice(0,4));};
 return <MuseModal id="reading-plan-place" label={title} title={title} returnFocus={null} onClose={onClose}>
  <div className="muse-plan-picker">
   {!lockKind&&<div className="muse-segmented" role="group" aria-label="Plan type"><button type="button" className="muse-edge" aria-pressed={kind==='month'} onClick={()=>switchKind('month')}>Monthly</button><button type="button" className="muse-edge" aria-pressed={kind==='year'} onClick={()=>switchKind('year')}>Yearly</button></div>}
   <div className="muse-plan-picker-nav"><button type="button" className="muse-button button-ghost" aria-label={kind==='month'?'Previous year':'Earlier years'} onClick={()=>setAnchor(kind==='month'?shiftPeriod('year',anchor.slice(0,4),-1):shiftPeriod('year',anchor,-6))}>‹</button><strong className="type-numeric">{kind==='month'?year:`${years[0]}–${years.at(-1)}`}</strong><button type="button" className="muse-button button-ghost" aria-label={kind==='month'?'Next year':'Later years'} onClick={()=>setAnchor(kind==='month'?shiftPeriod('year',anchor.slice(0,4),1):shiftPeriod('year',anchor,6))}>›</button></div>
   <ol className="muse-plan-picker-grid" data-kind={kind}>{list.map(p=>{const isTaken=taken.has(key(p)),n=counts?.get(key(p))??0;return <li key={p}><button type="button" disabled={isTaken} data-now={p===now||undefined} data-taken={isTaken||undefined} title={isTaken?takenLabel:periodLabel(kind,p)} aria-label={`${periodLabel(kind,p)}${isTaken?`, ${takenLabel}`:n?`, ${n} ${n===1?'book':'books'}`:''}`} onClick={()=>onPick(kind,p)}><span>{shortPeriodLabel(kind,p)}</span>{kind==='year'&&<small className="type-numeric">{p}</small>}{isTaken?<i aria-hidden="true">✓</i>:n>0?<i className="type-numeric" aria-hidden="true">{n}</i>:null}</button></li>;})}</ol>
   {footer&&<div className="muse-plan-picker-status" role="status">{footer}</div>}<p className="small-label">Plans never change a book’s reading status or history.</p>
  </div>
 </MuseModal>;
}
