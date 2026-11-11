'use client';
import {useEffect,useState} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {readStepRange,stepsUnavailable} from '@/lib/steps-store';
import {formatSteps,summarizeSteps,type StepDay} from '@/lib/steps';
import {shortDate} from '@/lib/display-date';
import type {InsightRange} from '@/lib/insights/ranges';
import {InsightPanel} from './InsightPanel';
import {InsightChart} from './InsightChart';

/** Manually entered steps (#130), read where they live. Only recorded days count: a day with no entry is missing, not zero. */
export function StepsInsights({range}:{range:InsightRange}){
 const key=`${range.start}/${range.end}`;
 const [loaded,setLoaded]=useState<{key:string;days:StepDay[]|'unavailable'|'error'}|null>(null);
 useEffect(()=>{let live=true;readStepRange(createMuseBrowserClient(),range.start,range.end).then(days=>{if(live)setLoaded({key,days});}).catch(e=>{if(live)setLoaded({key,days:stepsUnavailable(e)?'unavailable':'error'});});return()=>{live=false;};},[key,range.start,range.end]);
 if(!loaded||loaded.key!==key)return <InsightPanel title="Steps"><p role="status" className="card-description">Loading your steps…</p></InsightPanel>;
 if(loaded.days==='unavailable')return null;
 if(loaded.days==='error')return <InsightPanel title="Steps"><p role="status" className="card-description">Steps couldn’t load right now.</p></InsightPanel>;
 const days=loaded.days,s=summarizeSteps(days);
 return <InsightPanel title="Steps">
  <p className="card-description">{s.days?`${s.days} recorded ${s.days===1?'day':'days'}. Days without an entry aren’t counted as zero.`:'Steps you enter in Movement will show up here.'}</p>
  {s.days>0&&<ul className="muse-insight-stats" aria-label="Steps summary"><li><strong>{formatSteps(s.average??0)}</strong><span>average per recorded day</span></li><li><strong>{s.goalDays} of {s.days}</strong><span>days at or above goal</span></li>{s.best&&<li><strong>{formatSteps(s.best.steps)}</strong><span>best day · {shortDate(s.best.date)}</span></li>}</ul>}
  <InsightChart title="Daily steps" description="Each recorded day against the goal that was set at the time." kind="bar" labelKey="date" data={days.map(d=>({date:d.date,steps:d.steps,goal:d.goal}))} series={[{key:'steps',label:'Steps',color:'var(--chart-2)'}]} hasData={s.days>0} empty="No steps recorded in this range yet."/>
 </InsightPanel>;
}
