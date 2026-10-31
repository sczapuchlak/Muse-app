"use client";
import Link from 'next/link';
import { useEffect,useState } from 'react';
import { cachedForecastProvider,unavailableForecastProvider,zodiacLabel,type ForecastResult,type ZodiacSign } from '@/lib/cosmic-forecast';
import { useCosmicPreferences } from './useCosmicPreferences';
import { useMuseToday } from './useMuseToday';
import { shortDate } from '@/lib/display-date';
import {useDailyData} from './daily/DailyData';
import { MuseCard } from './MuseCard';
import { CardHeading } from './CardHeading';
import { MuseIcon } from './MuseIcon';
import './CosmicForecast.css';
const provider=cachedForecastProvider(unavailableForecastProvider);
function ForecastContent({sign,date}:{sign:ZodiacSign;date:string}) {
 const [response,setResponse]=useState<ForecastResult|null>(null),[expanded,setExpanded]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;provider.getForecast(sign,date).then((result)=>{if(active)setResponse(result);});return ()=>{active=false;};},[sign,date,attempt]);
 return <><p className="muse-cosmic-forecast-meta">{zodiacLabel(sign)} <span>· Today ·</span> <time dateTime={date}>{shortDate(date)}</time></p>{!response?<p role="status">Looking to the sky…</p>:response.status==='ready'?<><p>{expanded?response.forecast.text:response.forecast.text.slice(0,150)+(response.forecast.text.length>150?'…':'')}</p><p className="small-label">{response.forecast.attribution} · {response.cached?'Cached for today':'Retrieved today'}</p></>:<><p className="muse-cosmic-preview">Something lovely may be taking shape.</p><p className="small-label">Illustrative preview · {response.message}</p>{expanded&&<p className="card-description">This is a design preview, not a prediction. A daily forecast and its source will appear here once a provider is connected.</p>}</>}
 <div className="muse-cosmic-forecast-actions"><button className="text-button" type="button" aria-expanded={expanded} onClick={()=>setExpanded((value)=>!value)}>{expanded?'Less':response?.status==='ready'?'Full forecast':'About this preview'}</button>{response?.status==='error'&&<button className="text-button" type="button" onClick={()=>{setResponse(null);setAttempt((value)=>value+1);}}>Try again</button>}<Link className="text-button" href="/settings#cosmic-forecast-settings">Preferences</Link></div></>;
}
export function CosmicForecast({compact=false}:{compact?:boolean}){const {preferences,ready}=useCosmicPreferences(),{profile}=useDailyData(),today=useMuseToday(profile.timeZone);if(!ready||!preferences.enabled)return null;return <MuseCard id="cosmic-forecast" className={`muse-cosmic-forecast${compact?' muse-cosmic-forecast-compact':''}`}><CardHeading id="cosmic-forecast" title="Cosmic Forecast" icon="moon"/><MuseIcon name="moon" size={26}/>{preferences.sign&&today?<ForecastContent key={`${preferences.sign}/${today}`} sign={preferences.sign} date={today}/>:<p className="card-description">{preferences.sign?'Finding today’s date…':<>A small daily discovery, if you like. <Link href="/settings#cosmic-forecast-settings">Choose your sign</Link> to begin.</>}</p>}</MuseCard>;}
