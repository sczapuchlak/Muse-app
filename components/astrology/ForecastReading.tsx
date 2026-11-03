'use client';
import {useEffect,useState} from 'react';
import {zodiacLabel,type ZodiacSign} from '@/lib/cosmic-forecast';
import {observatoryForecasts,forecastCategoryLabels,type ForecastCategory,type ForecastPeriod,type HoroscopeResult} from '@/lib/astrology/forecast';
import {shortDate} from '@/lib/display-date';
/** Observatory detail shows the entire reading immediately; Daily Edit retains compact expansion. */
export function ForecastReading({sign,date,timeZone,category='overview',period='daily',full=false,service=observatoryForecasts}:{sign:ZodiacSign;date:string;timeZone:string;category?:ForecastCategory;period?:ForecastPeriod;full?:boolean;service?:typeof observatoryForecasts}){
 const [response,setResponse]=useState<{key:string;result:HoroscopeResult}|null>(null),[expanded,setExpanded]=useState(false),[attempt,setAttempt]=useState(0),key=JSON.stringify([sign,date,timeZone,category,period,attempt]);
 useEffect(()=>{let active=true;service.request({sign,date,timeZone,category,period,language:'en'}).then(value=>{if(active)setResponse({key,result:value});});return()=>{active=false;};},[sign,date,timeZone,category,period,attempt,key,service]);
 const result=response?.key===key?response.result:null,showFull=full||expanded;
 return <><p className="muse-cosmic-forecast-meta">{zodiacLabel(sign)} · {forecastCategoryLabels[category]} · {{daily:'Daily',weekly:'Weekly',monthly:'Monthly'}[period]} · <time dateTime={date}>{shortDate(date)}</time> · {timeZone}</p>
 {!result?<p role="status">Looking to the sky…</p>:result.status==='ready'?<>{result.forecast.headline&&<h3>{result.forecast.headline}</h3>}<p className="muse-cosmic-reading-text">{showFull?result.forecast.text:result.forecast.preview}</p><p className="small-label">{result.forecast.attribution} · {result.stale?'Previously retrieved; source temporarily unavailable':result.cached?'Cached forecast':'Retrieved forecast'} · {result.forecast.range.start}–{result.forecast.range.end}</p>{showFull&&<p className="small-label">Retrieved {new Date(result.forecast.retrievedAt).toLocaleString(undefined,{timeZone})} · Expires {new Date(result.forecast.expiresAt).toLocaleString(undefined,{timeZone})} · <a href={result.forecast.sourceUrl} target="_blank" rel="noopener noreferrer">Source ↗</a></p>}</>:<p role={result.status==='error'?'alert':'status'} className="card-description">{result.message}</p>}
 <div className="muse-cosmic-forecast-actions">{result?.status==='ready'&&!full&&<button className="muse-button button-ghost" type="button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Less':'Full forecast'}</button>}{result?.status==='error'&&<button className="muse-button button-ghost" type="button" onClick={()=>setAttempt(value=>value+1)}>Try again</button>}</div>
 </>;
}
