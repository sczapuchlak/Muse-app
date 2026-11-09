'use client';
import Link from 'next/link';
import type {CSSProperties} from 'react';
import {dateLabel} from '@/lib/dates';
import type {InsightRange} from '@/lib/insights/ranges';
import {aspirationTrends,progressHistory} from '@/lib/aspirations/progress';
import {useAspirations} from '../envision/aspirations/useAspirations';
import {InsightPanel} from './InsightPanel';
import '../envision/aspirations/Aspirations.css';

const pct=(n:number)=>`${Math.round(n*100)}%`;
const num=(n:number|null)=>n===null?'':new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(n);
const monthName=(ym:string)=>new Intl.DateTimeFormat('en-US',{month:'short',year:'2-digit',timeZone:'UTC'}).format(new Date(`${ym}-15T12:00:00Z`));

/**
 * Aspirations in Insights (#54), for the selected range: on-time completion, milestones and completions over time,
 * categories, and recorded progress. The Aspirations page keeps the day-to-day view; this is the look back.
 */
export function AspirationInsights({range}:{range:InsightRange}){
 const {aspirations,updates,status}=useAspirations();
 if(!status.loaded)return <InsightPanel kicker="Aspirations" title="The bigger things"><p className="card-description" role="status">Loading…</p></InsightPanel>;
 if(status.error)return <InsightPanel kicker="Aspirations" title="The bigger things"><p className="card-description">{status.error}</p></InsightPanel>;
 if(!aspirations.length)return <InsightPanel kicker="Aspirations" title="The bigger things"><p className="card-description">Aspirations you add in Envision will show their progress here over time. <Link href="/envision">Add one</Link></p></InsightPanel>;
 const t=aspirationTrends(aspirations,range),max=Math.max(1,...t.byMonth.map(m=>m.completed+m.milestones));
 const recorded=aspirations.filter(a=>(a.progressKind==='numeric'||a.progressKind==='manual')&&a.status!=='archived').map(a=>{
  const all=progressHistory(a,updates),inRange=all.filter(p=>p.date>=range.start&&p.date<=range.end),before=all.filter(p=>p.date<range.start).at(-1);
  const scale=a.progressKind==='manual'?100:a.target??0;return {a,points:inRange,from:before?.value??null,to:inRange.at(-1)?.value??null,scale};}).filter(r=>r.points.length>0);
 const quiet=!t.completed.length&&!t.milestones.length&&!recorded.length&&!t.dueCount;
 return <InsightPanel kicker="Aspirations" title="The bigger things" className="muse-aspiration-insights">
  {quiet?<p className="card-description">No milestones, finishes or recorded progress between {dateLabel(range.start)} and {dateLabel(range.end)}. Long goals have quiet stretches.</p>:<>
   <dl className="muse-aspirations-stats">
    <div><dt>Finished on time</dt><dd>{t.completionRate===null?'—':pct(t.completionRate)}</dd><small className="small-label">{t.dueCount?`${t.dueCompletedOnTime} of ${t.dueCount} due in this period`:'None were due in this period'}</small></div>
    <div><dt>Aspirations finished</dt><dd>{t.completed.length}</dd><small className="small-label">In this period</small></div>
    <div><dt>Milestones reached</dt><dd>{t.milestones.length}</dd><small className="small-label">Checked off in this period</small></div>
   </dl>
   {t.byMonth.length>0&&<div className="muse-aspiration-insight-months"><h3>Milestones and finishes by month</h3>
    <ol>{t.byMonth.map(m=><li key={m.month}><span>{monthName(m.month)}</span><span className="muse-aspiration-insight-bar" style={{'--w':`${Math.round((m.completed+m.milestones)/max*100)}%`} as CSSProperties} aria-hidden="true"/><small>{m.milestones} milestone{m.milestones===1?'':'s'}{m.completed?` · ${m.completed} finished`:''}</small></li>)}</ol></div>}
   {t.categories.length>0&&<div className="muse-aspiration-table-wrap"><table className="muse-aspiration-table"><caption className="sr-only">Aspirations by category</caption>
    <thead><tr><th scope="col">Category</th><th scope="col">Finished</th><th scope="col">Milestones</th><th scope="col">In progress</th></tr></thead>
    <tbody>{t.categories.map(c=><tr key={c.category}><th scope="row">{c.category}</th><td>{c.completed}</td><td>{c.milestones}</td><td>{c.active}</td></tr>)}</tbody></table></div>}
   {recorded.length>0&&<div className="muse-aspiration-insight-recorded"><h3>Recorded progress</h3><ul>{recorded.map(r=><li key={r.a.id}><span><strong>{r.a.title}</strong><small>{r.from!==null?`${num(r.from)} → `:''}{num(r.to)}{r.a.progressKind==='manual'?'%':r.a.unit?` ${r.a.unit}`:''}{r.scale&&r.a.progressKind!=='manual'?` · ${Math.round(Math.min(100,(r.to??0)/r.scale*100))}% of the goal`:''}</small></span>
    <ol className="muse-aspiration-spark" aria-label={`${r.a.title}: progress updates in this period`}>{r.points.slice(-12).map((p,i)=><li key={i} title={`${dateLabel(p.date)}: ${p.value}`} style={{'--h':`${r.scale?Math.max(4,Math.min(100,p.value/r.scale*100)):50}%`} as CSSProperties}><span className="sr-only">{dateLabel(p.date)}: {p.value}</span></li>)}</ol></li>)}</ul></div>}
   <p className="small-label">From the aspirations you track in Envision. “On time” means finished by its target date; goals without a target date aren’t counted as due. <Link href="/envision">Open Aspirations</Link></p>
  </>}
 </InsightPanel>;
}
