import {zodiacLabel,zodiacSigns,type ZodiacSign} from '@/lib/cosmic-forecast';
import {validDate} from '@/lib/dates';
import {forecastPeriods,forecastRange,type ForecastPeriod,type ForecastRange} from './forecast';
import type {AstrologyReference,CosmicJournalEntry} from './models';

/**
 * A reflection written beside a horoscope keeps a REFERENCE to that forecast (sign, period and the first day of
 * the period it covers), never the provider's text: CosmyDay's terms allow display with attribution, not a durable
 * copy (docs/PRODUCT_RULES.md, "CosmyDay forecast MVP"). The reference is what lets Muse be honest about dates:
 * a reflection always belongs to the forecast period it was written under, and a past day can show what the
 * reader kept without ever presenting today's reading as that day's.
 */
export type ForecastReferenceParts={sign:ZodiacSign;period:ForecastPeriod;start:string};
const periodWords:Record<ForecastPeriod,string>={daily:'Daily horoscope',weekly:'Weekly horoscope',monthly:'Monthly horoscope'};

/** Stable identity for one sign's forecast in one period. `date` is any day inside the period. */
export function forecastReferenceId(sign:ZodiacSign,period:ForecastPeriod,date:string){return `forecast/${sign}/${period}/${forecastRange(date,period).start}`;}

export function parseForecastReferenceId(id:unknown):ForecastReferenceParts|null{
 if(typeof id!=='string')return null;
 const [kind,sign,period,start,...rest]=id.split('/');
 if(kind!=='forecast'||rest.length||!zodiacSigns.includes(sign as ZodiacSign)||!forecastPeriods.includes(period as ForecastPeriod)||!validDate(start))return null;
 // Only the canonical first day of the period is an identity; anything else would let one forecast have two ids.
 if(forecastRange(start,period as ForecastPeriod).start!==start)return null;
 return {sign:sign as ZodiacSign,period:period as ForecastPeriod,start};
}

export function forecastReferenceRange(parts:ForecastReferenceParts):ForecastRange{return forecastRange(parts.start,parts.period);}
export function forecastReferenceTitle(parts:Pick<ForecastReferenceParts,'sign'|'period'>){return `${zodiacLabel(parts.sign)} · ${periodWords[parts.period]}`;}

/** The saved reference for a forecast. The server rebuilds it from the id, so a client cannot store other text. */
export function forecastReference(parts:ForecastReferenceParts):AstrologyReference{return {type:'forecast',id:`forecast/${parts.sign}/${parts.period}/${parts.start}`,title:forecastReferenceTitle(parts),date:parts.start};}

/** A forecast can be reflected on once its period has begun in the reader's own timezone, never ahead of time. */
export function forecastReferenceAllowed(parts:ForecastReferenceParts,today:string){return validDate(today)&&parts.start<=today;}

/** The one reflection kept for a sign's forecast in the period covering `date`, if any. Used to edit, never duplicate. */
export function forecastReflection(journal:readonly CosmicJournalEntry[],sign:ZodiacSign,period:ForecastPeriod,date:string){
 const id=forecastReferenceId(sign,period,date);
 return journal.find(entry=>entry.reference?.type==='forecast'&&entry.reference.id===id)??null;
}

/** Every forecast reflection whose period covers `date` (any sign), daily first, then weekly, then monthly. */
export function forecastReflectionsCovering(journal:readonly CosmicJournalEntry[],date:string){
 if(!validDate(date))return [];
 const order:Record<ForecastPeriod,number>={daily:0,weekly:1,monthly:2};
 return journal.flatMap(entry=>{
  if(entry.reference?.type!=='forecast')return [];
  const parts=parseForecastReferenceId(entry.reference.id);if(!parts)return [];
  const range=forecastReferenceRange(parts);
  return range.start<=date&&date<=range.end?[{entry,parts,range}]:[];
 }).sort((a,b)=>order[a.parts.period]-order[b.parts.period]||b.entry.updated_at.localeCompare(a.entry.updated_at));
}

/** Where a selected day sits relative to the reader's today. Only `current` may ever show a live forecast. */
export function forecastDayState(selected:string,today:string):'current'|'past'|'future'{return selected===today?'current':selected<today?'past':'future';}

export function forecastPeriodLabel(parts:ForecastReferenceParts){
 const format=(value:string,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('en-US',{...options,timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`));
 const range=forecastReferenceRange(parts);
 if(parts.period==='daily')return format(range.start,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
 if(parts.period==='monthly')return format(range.start,{month:'long',year:'numeric'});
 return `${format(range.start,{month:'short',day:'numeric'})} – ${format(range.end,{month:'short',day:'numeric',year:'numeric'})}`;
}
