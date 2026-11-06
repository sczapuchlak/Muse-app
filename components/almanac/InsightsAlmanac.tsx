'use client';
import {useMemo} from 'react';
import type {Revelation} from '@/lib/insights/revelations';
import type {CrossConnection} from '@/lib/insights/across';
import {recapFacts} from '@/lib/insights/across';
import {calculateInsights} from '@/lib/insights/metrics';
import type {NormalizedInsights} from '@/lib/insights/normalize';
import type {ProgressSources} from '@/lib/progress/engine';
import {shiftDate,weekDates} from '@/lib/dates';
import {surfaces} from '@/lib/almanac/select';
import {crossSignals,recapSignal,revelationSignals} from '@/lib/almanac/signals';
import type {Signal} from '@/lib/almanac/types';
import {useAlmanac} from './useAlmanac';
import {InsightPanel} from '../insights/InsightPanel';
import './Almanac.css';

const text=(sections:{heading?:string;text:string}[])=>sections.map(s=>s.text).join(' ');

/**
 * The existing Little Revelations, in the Almanac's rotating words (#53). Facts, order, evidence and links are
 * unchanged; a card with no matching entry (or before settings load) keeps its original wording.
 */
export function useVoicedRevelations(revelations:Revelation[],today:string|null|undefined):Revelation[]{
 const signals=useMemo(()=>today?revelationSignals(revelations,today):[],[revelations,today]);
 const {picks}=useAlmanac(surfaces.insightsCards,signals,today);
 return useMemo(()=>revelations.map(r=>{const p=picks.find(x=>x.signal.key===r.signal?.key);return p?{...r,title:p.rendered.title??r.title,explanation:text(p.rendered.sections)}:r;}),[revelations,picks]);
}

const monthName=(ym:string)=>new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'UTC'}).format(new Date(`${ym}-01T12:00:00Z`));
/** Last completed week (Mon–Sun) and calendar month, only when Insights has loaded data for those dates. */
export function FieldNotes({input,sources,today,loadedFrom}:{input:NormalizedInsights;sources:ProgressSources;today:string|null|undefined;loadedFrom:string}){
 const signals=useMemo(()=>{if(!today)return [] as Signal[];
  const weekStart=shiftDate(weekDates(today)[0],-7),weekEnd=shiftDate(weekStart,6);
  const monthEnd=shiftDate(`${today.slice(0,7)}-01`,-1),monthStart=`${monthEnd.slice(0,7)}-01`;
  const out:Signal[]=[];
  for(const [kind,start,end] of [['week',weekStart,weekEnd],['month',monthStart,monthEnd]] as const){
   if(start<loadedFrom)continue; // Never report on dates whose records were not loaded.
   const facts=recapFacts({metrics:calculateInsights(input,{start,end}),sources,today});
   const s=recapSignal(kind,facts,{label:monthName(start.slice(0,7)),end});if(s)out.push(s);}
  return out;},[input,sources,today,loadedFrom]);
 const {picks,dismiss}=useAlmanac(surfaces.fieldNotes,signals,today);
 if(!picks.length)return null;
 return <InsightPanel kicker="Field notes" title="Looking back" className="muse-almanac-field-notes">
  <div className="muse-almanac-notes">{picks.map((p,i)=><article key={p.entry.id} className="muse-almanac-note"><h4>{p.rendered.title}</h4>
   {p.rendered.sections.map((s,j)=><section key={j}>{s.heading&&<span>{s.heading}</span>}<p>{s.text}</p></section>)}
   <button type="button" className="text-button" onClick={()=>dismiss(i)}>Don’t show this note again</button></article>)}</div></InsightPanel>;
}

/** Cross-module stories (opt-in through sensitive observations, since they involve Mood). */
export function Constellations({connections,today}:{connections:CrossConnection[];today:string|null|undefined}){
 const signals=useMemo(()=>today?crossSignals(connections,today):[],[connections,today]);
 const {picks,dismiss}=useAlmanac(surfaces.constellations,signals,today);
 if(!picks.length)return null;
 return <InsightPanel kicker="Constellation" title="Two signals, side by side">
  {picks.map((p,i)=><article key={p.entry.id} className="muse-almanac-constellation"><h4>{p.rendered.title}</h4><p>{text(p.rendered.sections)}</p>
   <p className="small-label">Descriptive only: based on {p.signal.evidence.sampleSize} rated days. <button type="button" className="text-button" onClick={()=>dismiss(i)}>Don’t show this again</button></p></article>)}</InsightPanel>;
}
