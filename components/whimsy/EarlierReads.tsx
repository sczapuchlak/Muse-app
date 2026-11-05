'use client';
import {useState} from 'react';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {StarRating} from '@/components/collections/StarRating';
import {dateLabel} from '@/lib/dates';
/** A date with its year: reads of one book can be years apart. */
export const yearDate=(date:string)=>`${dateLabel(date)}, ${date.slice(0,4)}`;
import type {BookCompletion} from '@/lib/whimsy/models';

export type ReadSummary={sessions:number;seconds:number;pages:number;pagesPerHour:number|null;calendarDays:number|null};
export type Unassigned={rating?:number;review?:string};

const time=(seconds:number)=>seconds<60?(seconds?'under a minute':'no time recorded'):seconds<3600?`${Math.round(seconds/60)} min`:`${Math.floor(seconds/3600)} h ${Math.round(seconds%3600/60)} min`;
export function readSummaryLine(s:ReadSummary){return [`${s.sessions} ${s.sessions===1?'session':'sessions'}`,time(s.seconds),`${s.pages} pages`,s.pagesPerHour!==null?`${Math.round(s.pagesPerHour)} pages/hour`:null,s.calendarDays!==null?`${s.calendarDays} ${s.calendarDays===1?'day':'days'} (inclusive)`:null].filter(Boolean).join(' · ');}

/**
 * Earlier finished reads in the book editor. Each read keeps its own dates, rating and review; statistics come from
 * that read's sessions. A rating/review from before per-read opinions can be assigned to one read by the reader.
 */
export function EarlierReads({reads,summary,unassigned,onChange}:{reads:BookCompletion[];summary:(read:BookCompletion)=>ReadSummary;unassigned:Unassigned;onChange:(reads:BookCompletion[],unassigned:Unassigned)=>void}){
 const [removing,setRemoving]=useState<string|null>(null);
 const update=(id:string,changes:Partial<BookCompletion>)=>onChange(reads.map(r=>r.id===id?{...r,...changes}:r),unassigned);
 const hasUnassigned=unassigned.rating!==undefined||!!unassigned.review;
 return <fieldset className="muse-books-form-section muse-books-earlier-reads"><legend>Earlier reads</legend>
  <p className="small-label">Each read keeps its own dates, rating and review. Correct anything here, or remove a read recorded by mistake; its sessions stay in your totals.</p>
  {hasUnassigned&&<div className="muse-books-unassigned" role="note"><strong>From before per-read ratings</strong>
   <span>{[unassigned.rating!==undefined?`${unassigned.rating}/5`:null,unassigned.review?`“${unassigned.review}”`:null].filter(Boolean).join(' · ')}</span>
   <small className="small-label">Muse kept this because it can’t tell which read it belongs to. Assign it, or leave it as is.</small>
   <MuseChoiceMenu label="Assign to a read" valueLabel="Assign to a read" options={reads.map((r,i)=>({id:r.id,label:`Read ${i+1} · finished ${yearDate(r.finishedOn)}`}))} selectedIds={[]} onSelect={id=>{const read=reads.find(r=>r.id===id);if(!read)return;onChange(reads.map(r=>r.id===id?{...r,...(unassigned.rating!==undefined&&r.rating===undefined?{rating:unassigned.rating}:{}),...(unassigned.review&&!r.review?{review:unassigned.review}:{})}:r),{...(unassigned.rating!==undefined&&read.rating!==undefined?{rating:unassigned.rating}:{}),...(unassigned.review&&read.review?{review:unassigned.review}:{})});}}/>
   <small className="small-label">A read that already has its own rating or review keeps it.</small>
  </div>}
  {reads.map((read,index)=><div className="muse-books-completion-row muse-books-read" key={read.id}>
   <strong>Read {index+1}</strong>
   <div className="muse-books-fields">
    <label>Started<input type="date" value={read.startedOn??''} max={read.finishedOn||undefined} onChange={e=>update(read.id,{startedOn:e.target.value||undefined})}/></label>
    <label>Finished<input type="date" required value={read.finishedOn} onChange={e=>update(read.id,{finishedOn:e.target.value})}/></label>
   </div>
   <StarRating label={`Rating for read ${index+1}`} value={read.rating??null} onChange={rating=>update(read.id,{rating:rating??undefined})}/>
   <label><span className="muse-whimsy-inline-label">Review for read {index+1} <small>optional</small></span><textarea value={read.review??''} onChange={e=>update(read.id,{review:e.target.value||undefined})}/></label>
   <small className="small-label">{readSummaryLine(summary(read))}</small>
   {removing===read.id?<span className="muse-books-actions"><button type="button" className="muse-button muse-books-delete" onClick={()=>{onChange(reads.filter(r=>r.id!==read.id),unassigned);setRemoving(null);}}>Remove read {index+1}</button><button type="button" className="text-button" onClick={()=>setRemoving(null)}>Keep</button></span>
    :<button type="button" className="text-button" onClick={()=>setRemoving(read.id)}>Remove…</button>}
  </div>)}
  <p className="small-label">Changes here take effect when you save the book.</p>
 </fieldset>;
}
