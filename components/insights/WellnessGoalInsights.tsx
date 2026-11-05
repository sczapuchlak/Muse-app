'use client';
import Link from 'next/link';
import {InsightPanel} from './InsightPanel';
import {InsightChart} from './InsightChart';
import type {ProgressSources} from '@/lib/progress/engine';
import type {InsightRange} from '@/lib/insights/ranges';
import {wellnessForRange} from '@/lib/insights/across';
import {adherence,currentVersion,goalMetricInfo,goalResultsBetween,type WellnessGoal} from '@/lib/wellness-goals';
import {movementCategories,movementCategoryLabels} from '@/lib/progress/movement';

/** Wellness in Insights reuses the Wellness aggregates and goal evaluation from #30; nothing is recalculated here. */
export function WellnessGoalInsights({sources,goals,range,today}:{sources:ProgressSources;goals?:WellnessGoal[];range:InsightRange;today:string}){
 if(!sources.wellness)return null;
 const w=wellnessForRange(sources.wellness,range);
 const rows=(goals??[]).filter(goal=>currentVersion(goal)).map(goal=>{const results=goalResultsBetween(goal,sources,range.start,range.end,today);return {goal,results,summary:adherence(results.filter(r=>r.status!=='in-progress'))};}).filter(row=>row.results.some(r=>r.status!=='inactive'));
 return <>
  <InsightPanel title="Movement you recorded" kicker="Completed activity, not intentions">
   {!w.workouts?<p className="card-description">No completed movement in this range. Intentions alone are not counted as workouts.</p>:<>
    <dl className="muse-insight-small-metrics"><div><dt>Workouts</dt><dd>{w.workouts}<small> on {w.workoutDays} days</small></dd></div><div><dt>Recorded minutes</dt><dd>{w.minutes}<small>{w.sessionsWithoutDuration?` · ${w.sessionsWithoutDuration} untimed`:' · all timed'}</small></dd></div></dl>
    <InsightChart title="By category" description="Strength, Cardio, Mobility and Other come from each movement type's category." kind="bar" labelKey="label" data={movementCategories.map(c=>({label:movementCategoryLabels[c],count:w.byCategory[c]}))} series={[{key:'count',label:'Workouts',color:'var(--chart-1)'}]} hasData={w.workouts>0}/>
   </>}
  </InsightPanel>
  <InsightPanel title="Goals in this range" kicker="From Wellness → Goals">
   {!goals?<p className="card-description">Goals need the latest database update.</p>:!rows.length?<p className="card-description">No Wellness goals covered this range. <Link href="/nourish?view=goals">Set an optional goal →</Link></p>:<ul className="muse-insight-weekly-list">{rows.map(({goal,summary})=>{const v=currentVersion(goal)!;return <li key={goal.id}><div><strong>{goalMetricInfo[goal.metric].label}</strong><p>{v.direction==='atMost'?'At most':'At least'} {v.target} {v.unit} per {goal.period}{summary.unknown?` · ${summary.unknown} without a complete record`:''}{summary.paused?` · ${summary.paused} paused`:''}</p></div><span>{summary.rate===null?'—':`Met ${summary.achieved} of ${summary.achieved+summary.missed}`}</span></li>;})}</ul>}
   <p className="small-label">Finished periods only; the current one is still in progress. Each period uses the target it had at the time. Hydration days: {w.hydration.metDays} of {w.hydration.recordedDays} logged days met that day’s water goal.</p>
  </InsightPanel>
 </>;
}
