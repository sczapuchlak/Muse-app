'use client';
import type {ReactNode} from 'react';
import Link from 'next/link';
import {MuseMark} from '@/components/design/MuseHeading';
import {zodiacLabel} from '@/lib/cosmic-forecast';
import {signInfo} from '@/lib/astrology/library';
import {forecastPeriodLabel,forecastReflectionsCovering} from '@/lib/astrology/forecast-reference';
import {useAstrologyData} from './AstrologyData';
import {SavedReflection} from './ForecastReflection';
import './ForecastReading.css';

/**
 * The Daily Edit on a day that is not today. A horoscope is published for its own day and Muse keeps no copy of
 * the source's text, so this never shows a forecast: it shows the reader's own reflections for forecasts that
 * covered the day, or says plainly that nothing was saved. Today's reading is never dressed up as another day's.
 */
export function ForecastHistory({date,state,footer}:{date:string;state:'past'|'future'|'current';footer?:ReactNode}){
 const {records,loaded}=useAstrologyData();
 const kept=loaded?forecastReflectionsCovering(records.journal,date):[];
 const day=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
 return <div className="muse-forecast-history" data-state={state}>
  {state==='future'?<div className="muse-forecast-history-empty"><MuseMark icon="hourglass" tone={5} variant="soft"/><div><p className="muse-forecast-history-title">The sky hasn’t written this day yet.</p><p>Forecasts arrive on their own day. Come back on {day}.</p></div></div>
  :!loaded?<p className="muse-forecast-history-loading" role="status">Looking through your Cosmic Journal…</p>
  :kept.length?<><p className="muse-forecast-history-lead">What you kept from the sky on <time dateTime={date}>{day}</time></p>
   <div className="muse-forecast-history-list">{kept.map(({entry,parts})=><SavedReflection key={entry.id} entry={entry} context={<span className="muse-forecast-reflect-context"><span aria-hidden="true">{signInfo[parts.sign].glyph}</span>{zodiacLabel(parts.sign)} · {forecastPeriodLabel(parts)}</span>}/>)}</div>
   <p className="muse-forecast-history-note">The forecast itself isn’t kept after its day. Your words are.</p></>
  :<div className="muse-forecast-history-empty"><MuseMark icon="crescent" tone={5} variant="soft"/><div><p className="muse-forecast-history-title">Your cosmic forecast for this day wasn’t saved.</p><p>Forecasts belong to their own day and aren’t kept afterward. When one says something worth keeping, add a reflection and it will be waiting here.</p></div></div>}
  <div className="muse-forecast-footer">{footer}<Link className="muse-cosmic-pref-link" href="/whimsy/observatory?view=journal">Cosmic Journal</Link></div>
 </div>;
}
