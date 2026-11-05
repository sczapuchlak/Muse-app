'use client';
import Link from 'next/link';
import {useWellness} from '../WellnessStore';
import {useDailyData} from '../daily/DailyData';
import {useMuseToday} from '../useMuseToday';
import {MuseCard} from '../MuseCard';
import {CardHeading} from '../CardHeading';
import {useInsightsPreferences} from '../insights/useInsightsPreferences';
import {goalStatusLabel,currentVersion,evaluatePeriod,goalMetricInfo,goalSpec,versionAt} from '@/lib/wellness-goals';
import {measureDays,periodStart} from '@/lib/progress/engine';


/** Daily Edit glance at active Wellness goals for the selected date's period. Reads the same records; logs nothing. */
export function WellnessGoalsGlance({date}:{date:string}){
 const {state,status}=useWellness(),{profile}=useDailyData(),today=useMuseToday(profile.timeZone);
 const active=(state.goals??[]).filter(goal=>versionAt(goal,periodStart(date,goal.period))?.status==='active'&&currentVersion(goal)?.status!=='inactive');
 const prefs=useInsightsPreferences(profile.id,active.length>0);
 if(!status.loaded||!today||!active.length||!prefs.loaded||!prefs.preferences.dailyGoals)return null;
 const sources={timeZone:profile.timeZone,wellness:state};
 return <MuseCard id="wellness-goals-glance" className="muse-goals-glance">
  <CardHeading id="wellness-goals-glance" title="Goals"><Link className="text-button" href="/nourish?view=goals">Open</Link></CardHeading>
  <ul className="muse-goals-glance-list">{active.map(goal=>{const v=versionAt(goal,periodStart(date,goal.period))!,result=evaluatePeriod(goal,measureDays(goalSpec(goal,v.unit),sources).days,periodStart(date,goal.period),today),pct=result.target?Math.min(100,result.value/result.target*100):0;return <li key={goal.id}>
   <div className="muse-goals-glance-row"><span>{goalMetricInfo[goal.metric].label} <small className="small-label">this {goal.period}</small></span><span className="small-label">{new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(result.value)} / {v.target} {v.unit} · {goalStatusLabel(result.status,goalMetricInfo[goal.metric].basis)}</span></div>
   <div className="muse-goal-meter" role="meter" aria-valuemin={0} aria-valuemax={v.target} aria-valuenow={result.value} aria-label={`${goalMetricInfo[goal.metric].label} this ${goal.period}: ${result.value} of ${v.target} ${v.unit}, ${goalStatusLabel(result.status,goalMetricInfo[goal.metric].basis)}`}><span style={{inlineSize:`${pct}%`}}/></div>
  </li>;})}</ul>
 </MuseCard>;
}
