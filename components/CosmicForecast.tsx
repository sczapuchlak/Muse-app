"use client";
import Link from 'next/link';
import {ForecastReading} from './astrology/ForecastReading';
import { useCosmicPreferences } from './useCosmicPreferences';
import { useMuseToday } from './useMuseToday';
import {useDailyData} from './daily/DailyData';
import { MuseCard } from './MuseCard';
import { CardHeading } from './CardHeading';
import {shortDate} from '@/lib/display-date';
import {zodiacLabel} from '@/lib/cosmic-forecast';
import './CosmicForecast.css';
export function CosmicForecast({compact=false}:{compact?:boolean}){const {preferences,ready,forecastCategory}=useCosmicPreferences(),{profile}=useDailyData(),today=useMuseToday(profile.timeZone);if(!ready||!preferences.enabled)return null;const actions=<><Link className="muse-button button-ghost" href="/whimsy/observatory?view=forecast">Cosmic Observatory</Link><Link className="muse-button button-ghost" href="/settings#cosmic-forecast-settings">Preferences</Link></>;return <MuseCard id="cosmic-forecast" className={`muse-cosmic-forecast${compact?' muse-cosmic-forecast-compact':''}`}><CardHeading id="cosmic-forecast" title="Cosmic Forecast" icon="moon"><span className="muse-cosmic-forecast-heading-meta">{preferences.sign&&<strong>{zodiacLabel(preferences.sign)}</strong>}{today&&<time dateTime={today}>{shortDate(today)}</time>}</span></CardHeading>{preferences.sign&&today?<ForecastReading key={`${preferences.sign}/${today}/${forecastCategory}`} sign={preferences.sign} date={today} timeZone={profile.timeZone} category={forecastCategory} actions={actions}/>:<><p className="card-description">{preferences.sign?'Finding today’s date…':<>A small daily discovery, if you like. <Link href="/settings#cosmic-forecast-settings">Choose your sign</Link> to begin.</>}</p><div className="muse-cosmic-forecast-actions">{actions}</div></>}</MuseCard>;}
