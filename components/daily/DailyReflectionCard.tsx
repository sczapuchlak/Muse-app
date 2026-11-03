'use client';

import {MuseCard} from '../MuseCard';
import {CardHeading} from '../CardHeading';
import {ReflectionEditor} from '../mood/ReflectionEditor';
import {useMood} from '../mood/useMood';

export function DailyReflectionCard({date}:{date:string}){
 const {period,setPeriod}=useMood(date);
 return <MuseCard id="daily-reflection" className="muse-mood-reflection muse-daily-reflection">
  <CardHeading id="daily-reflection" title="Reflection" icon="notes"><div className="muse-mood-period" role="group" aria-label="Reflection period">{(['morning','evening'] as const).map(value=><button type="button" key={value} aria-pressed={period===value} onClick={()=>setPeriod(value)}>{value}</button>)}</div></CardHeading>
  <ReflectionEditor date={date} prompt={period==='morning'?'What would you like to carry into today?':'What stayed with you today?'} id="daily-reflection-text"/>
 </MuseCard>;
}
