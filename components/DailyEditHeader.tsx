import { MuseHeaderFrame } from './MuseHeaderFrame';
import { MuseStarCluster } from './MuseStarCluster';
import { DateNavigator } from './DateNavigator';
import { WeekNavigator } from './WeekNavigator';
import { MuseMantra } from './MuseMantra';
import { personalizedGreeting } from '@/lib/mock-profile';
import './MuseHeader.css';
export type DailyEditHeaderProps={date:{iso:string;label:string};greeting:string;profile:{firstName:string;timeZone:string;zodiacSign?:string};onDateChange:(date:string)=>void};
/** Greeting and date context stay together; the forecast belongs to the content grid. */
export function DailyEditHeader({date,greeting,profile,onDateChange}:DailyEditHeaderProps){return <MuseHeaderFrame editorial signature={false} title={<p className="muse-greeting whimsy">{personalizedGreeting(greeting,profile.firstName)}<span className="muse-header-signature muse-inline-signature" aria-hidden="true"><MuseStarCluster/></span></p>} mantra={<MuseMantra module="daily"/>}><div className="muse-daily-header-right" data-header-region="daily-context"><DateNavigator date={date.iso} onChange={onDateChange}/><WeekNavigator selectedDate={date.iso} timeZone={profile.timeZone} onChange={onDateChange}/></div></MuseHeaderFrame>;}
