'use client';
import {useState} from 'react';
import {MuseModal} from '@/components/MuseModal';
import {localReadingInstant} from '@/lib/whimsy/books';
import type {LongStretch} from '@/lib/whimsy/reading-stats';

const hoursLabel=(seconds:number)=>{const m=Math.round(seconds/60),h=Math.floor(m/60),r=m%60;return h?`${h} hour${h===1?'':'s'}${r?` ${r} minute${r===1?'':'s'}`:''}`:`${r} minute${r===1?'':'s'}`;};
const localParts=(iso:string,zone:string)=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso)).map(x=>[x.type,x.value]));return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`};};
const clock=(iso:string,zone:string)=>new Intl.DateTimeFormat(undefined,{timeZone:zone,weekday:'short',hour:'numeric',minute:'2-digit'}).format(new Date(iso));

export type StretchResolution={kind:'keep'}|{kind:'end';end:string}|{kind:'discard'};
/**
 * Asks before an uninterrupted stretch longer than the threshold is saved as reading.
 * A long stretch can be genuine, so keeping it is a first-class answer; nothing is discarded without a choice.
 */
export function TimerRecovery({stretch,timeZone,bookTitle,busy,onResolve,onClose}:{stretch:LongStretch;timeZone:string;bookTitle:string;busy:boolean;onResolve:(resolution:StretchResolution)=>void;onClose?:()=>void}){
 const startMs=Date.parse(stretch.start),endMs=Date.parse(stretch.end);
 const [minutes,setMinutes]=useState(''),[stopAt,setStopAt]=useState(()=>localParts(new Date(Math.min(endMs,startMs+60*60000)).toISOString(),timeZone)),[mode,setMode]=useState<'end'|'minutes'>('end'),[error,setError]=useState('');
 function correctedEnd(){
  if(mode==='minutes'){const m=Number(minutes);if(!Number.isFinite(m)||m<=0)throw Error('Enter how many minutes you read.');const end=startMs+m*60000;if(end>endMs)throw Error(`That is longer than the ${hoursLabel(stretch.seconds)} the timer ran.`);return new Date(end).toISOString();}
  const end=Date.parse(localReadingInstant(stopAt.date,stopAt.time,timeZone));if(end<=startMs)throw Error('Choose a time after the stretch began.');if(end>endMs)throw Error('Choose a time before the timer stopped.');return new Date(end).toISOString();
 }
 return <MuseModal id="bookshelf-timer-recovery" label="Check this reading stretch" title="Were you reading the whole time?" returnFocus={null} onClose={()=>onClose?.()}>
  <div className="muse-books-dialog muse-books-recovery">
   <p>Your timer for <strong>{bookTitle}</strong> has been {stretch.open?'running':'recorded'} for <strong>{hoursLabel(stretch.seconds)}</strong> without a pause, since {clock(stretch.start,timeZone)}.</p>
   <p className="small-label">Long reads are welcome. If the timer kept going after you stopped, correct this stretch; earlier reading in this session stays as it is.</p>
   {error&&<p role="alert" className="muse-books-error">{error}</p>}
   <button type="button" className="muse-button button-primary" disabled={busy} onClick={()=>onResolve({kind:'keep'})}>Yes, keep {hoursLabel(stretch.seconds)}</button>
   <fieldset className="muse-books-form-section"><legend>Correct this stretch</legend>
    <div className="muse-books-actions" role="group" aria-label="Correct by">
     <button type="button" className="muse-button button-ghost" aria-pressed={mode==='end'} onClick={()=>setMode('end')}>I stopped at</button>
     <button type="button" className="muse-button button-ghost" aria-pressed={mode==='minutes'} onClick={()=>setMode('minutes')}>I read for</button>
    </div>
    {mode==='end'?<div className="muse-books-fields"><label>Date<input type="date" value={stopAt.date} onChange={e=>setStopAt({...stopAt,date:e.target.value})}/></label><label>Time<input type="time" value={stopAt.time} onChange={e=>setStopAt({...stopAt,time:e.target.value})}/></label></div>
     :<label>Minutes of reading in this stretch<input type="number" min="1" inputMode="numeric" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label>}
    <button type="button" className="muse-button" disabled={busy} onClick={()=>{try{setError('');onResolve({kind:'end',end:correctedEnd()});}catch(e){setError(e instanceof Error?e.message:'Check the time.');}}}>Save correction</button>
   </fieldset>
   <button type="button" className="text-button" disabled={busy} onClick={()=>onResolve({kind:'discard'})}>Discard this stretch only</button>
  </div>
 </MuseModal>;
}
