'use client';
import {useEffect,useId,useRef,useState} from 'react';
import Link from 'next/link';
import {MuseMark} from '@/components/design/MuseHeading';
import {MuseIcon} from '@/components/MuseIcon';
import {zodiacLabel,type ZodiacSign} from '@/lib/cosmic-forecast';
import type {ForecastPeriod} from '@/lib/astrology/forecast';
import {forecastRange} from '@/lib/astrology/forecast';
import {forecastPeriodLabel,forecastReference,forecastReflection} from '@/lib/astrology/forecast-reference';
import type {CosmicJournalEntry} from '@/lib/astrology/models';
import {useAstrologyData} from './AstrologyData';
import {ZodiacTile} from './ZodiacGlyph';

const prompts:Record<ForecastPeriod,string[]>={
 daily:['What line landed, and why today?','Where did this already show up?','What would you like to remember about this day?'],
 weekly:['What do you want this week to hold?','Which part feels true already?','What will you watch for?'],
 monthly:['What is this month asking of you?','What would you like to look back on?','Which theme do you want to follow?'],
};
const periodWord:Record<ForecastPeriod,string>={daily:'today’s forecast',weekly:'this week’s forecast',monthly:'this month’s forecast'};

/**
 * "Did the stars say something worth keeping?" An inline, private composer beside a horoscope. It saves to the
 * Cosmic Journal with a reference to this exact forecast (sign, period, first day), never the forecast's text, and
 * there is only ever one reflection per forecast: saving again updates it.
 */
export function ForecastReflection({sign,period,date,timeZone,today,compact=false}:{sign:ZodiacSign;period:ForecastPeriod;date:string;timeZone:string;today:string;compact?:boolean}){
 const {store,records,loaded,busy,pending}=useAstrologyData(),id=useId();
 const start=forecastRange(date,period).start,parts={sign,period,start};
 const saved=loaded?forecastReflection(records.journal,sign,period,date):null;
 const [open,setOpen]=useState(false),[text,setText]=useState(''),[error,setError]=useState(''),[justSaved,setJustSaved]=useState(false),[draftId]=useState(()=>crypto.randomUUID());
 const field=useRef<HTMLTextAreaElement>(null),wrap=useRef<HTMLDivElement>(null);
 // An unsaved draft is kept on this device (until saved or discarded) and offered again when the composer reopens.
 const draftKey=`muse-forecast-reflection/${sign}/${period}/${start}`;
 useEffect(()=>{if(!open)return;try{if(text.trim()&&text!==(saved?.text??''))window.sessionStorage.setItem(draftKey,text);else window.sessionStorage.removeItem(draftKey);}catch{}},[open,text,saved?.text,draftKey]);
 useEffect(()=>{if(!justSaved)return;const timer=window.setTimeout(()=>setJustSaved(false),2600);return()=>window.clearTimeout(timer);},[justSaved]);
 function begin(){let kept='';try{kept=window.sessionStorage.getItem(draftKey)??'';}catch{}setError('');setText(current=>current||kept||saved?.text||'');setOpen(true);requestAnimationFrame(()=>{field.current?.focus({preventScroll:true});wrap.current?.scrollIntoView({block:'nearest',behavior:'smooth'});});}
 // With a phone keyboard open the visual viewport shrinks; keep the field in the part that is still visible.
 function keepVisible(){window.setTimeout(()=>field.current?.scrollIntoView({block:'center',behavior:'smooth'}),280);}
 function cancel(){if(text.trim()&&text!==(saved?.text??'')&&!window.confirm('Discard this unsaved reflection?'))return;try{window.sessionStorage.removeItem(draftKey);}catch{}setText('');setOpen(false);setError('');}
 async function save(){
  const body=text.trim();if(!body||busy||pending)return;setError('');
  // The journal date is the day it was written; the reference carries the forecast's own period.
  const record=saved?{id:saved.id,date:saved.date,time_zone:saved.time_zone,title:saved.title,text:body,reference:saved.reference}:{id:draftId,date:today,time_zone:timeZone,title:'',text:body,reference:forecastReference(parts)};
  try{
   const ok=await store.execute('journal-save',record,saved?.revision??0);
   if(!ok){setError(store.getSnapshot().error||'That didn’t save. Your words are still here; try again.');return;}
   try{window.sessionStorage.removeItem(draftKey);}catch{}
   setOpen(false);setText('');setJustSaved(true);
  }catch(reason){setError(reason instanceof Error?reason.message:'That didn’t save. Your words are still here; try again.');}
 }
 const context=<span className="muse-forecast-reflect-context"><ZodiacTile sign={sign} size="sm"/>{zodiacLabel(sign)} · {forecastPeriodLabel(parts)}</span>;
 if(!loaded)return null;
 return <div className="muse-forecast-reflect" data-open={open||undefined} data-compact={compact||undefined} data-saved={!!saved&&!open||undefined} ref={wrap}>
  {open?<form className="muse-forecast-reflect-composer" onSubmit={event=>{event.preventDefault();void save();}}>
   <header><MuseMark icon="quill" tone={3} size="sm"/><div><label htmlFor={`${id}-text`}>{saved?'Your reflection':'A note to keep'}</label>{context}</div></header>
   <textarea id={`${id}-text`} ref={field} value={text} maxLength={10000} rows={compact?4:5} placeholder="Dear sky…" onChange={event=>setText(event.target.value)} onFocus={keepVisible} onKeyDown={event=>{if((event.metaKey||event.ctrlKey)&&event.key==='Enter'){event.preventDefault();void save();}}} aria-describedby={`${id}-help`}/>
   {!text.trim()&&<ul className="muse-forecast-reflect-prompts" aria-label="Ways to begin">{prompts[period].map(prompt=><li key={prompt}><button type="button" onClick={()=>{setText(`${prompt}\n`);field.current?.focus();}}>{prompt}</button></li>)}</ul>}
   {error&&<p role="alert" className="muse-forecast-reflect-error">{error}</p>}
   <footer><p id={`${id}-help`} className="small-label">Private to you. Kept in your Cosmic Journal with this forecast’s date.</p><div><button type="button" className="muse-button button-ghost" disabled={busy} onClick={cancel}>Cancel</button><button type="submit" className="muse-button button-primary" disabled={busy||!!pending||!text.trim()||text.trim()===(saved?.text??'')}>{busy?'Keeping…':saved?'Update reflection':'Keep this'}</button></div></footer>
  </form>
  :saved?<SavedReflection entry={saved} context={context} justSaved={justSaved} onEdit={begin}/>
  :<div className="muse-forecast-reflect-invite"><MuseMark icon="quill" tone={3} size={compact?'sm':'md'}/><div><p className="muse-forecast-reflect-question">Did the stars say something worth keeping?</p>{!compact&&<p className="muse-forecast-reflect-sub">A few private lines about {periodWord[period]}, saved to your Cosmic Journal.</p>}</div><button type="button" className="muse-button button-ghost" onClick={begin}>Reflect on this forecast</button></div>}
 </div>;
}

export function SavedReflection({entry,context,justSaved=false,onEdit}:{entry:CosmicJournalEntry;context?:React.ReactNode;justSaved?:boolean;onEdit?:()=>void}){
 return <div className="muse-forecast-reflect-saved">
  <header><MuseMark icon="quill" tone={3} size="sm"/><div><strong>{justSaved?'Kept in your Cosmic Journal':'Your reflection'}</strong>{context}</div>{justSaved&&<span className="muse-forecast-reflect-kept" role="status"><MuseIcon name="check" size={13}/>Saved</span>}</header>
  <blockquote>{entry.text}</blockquote>
  <footer>{onEdit&&<button type="button" className="muse-button button-ghost" onClick={onEdit}><MuseIcon name="edit" size={13}/>Edit</button>}<Link className="muse-forecast-reflect-link" href={`/whimsy/observatory?view=journal&entry=${entry.id}`}>Open in Cosmic Journal →</Link></footer>
 </div>;
}
