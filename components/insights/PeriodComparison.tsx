import type {ReturnTypeOfMetrics} from '@/lib/insights/metrics';
import {shortDate} from '@/lib/display-date';
export function PeriodComparison({current,previous,view}:{current:ReturnTypeOfMetrics;previous:ReturnTypeOfMetrics;view:string}){
 const lines:string[]=[];
 if((view==='overview'||view==='plans')&&previous.planner.created.length)lines.push(`Tasks created: ${current.planner.created.length} now / ${previous.planner.created.length} previous.`);
 if((view==='overview'||view==='mood')&&previous.mood.records.length)lines.push(`Mood check-ins: ${current.mood.records.length} now / ${previous.mood.records.length} previous.`);
 if(view==='mood'&&current.mood.day.n>=3&&previous.mood.day.n>=3)lines.push(`Mean Overall Day: ${current.mood.day.value!.toFixed(1)} / ${previous.mood.day.value!.toFixed(1)} (1–10), from ${current.mood.day.n} / ${previous.mood.day.n} recorded values.`);
 if(view==='nourish'&&previous.nourish.assignments.length)lines.push(`Meal plans: ${current.nourish.assignments.length} now / ${previous.nourish.assignments.length} previous. These are plans, not intake.`);
 if(view==='plans'){const now=current.rituals.complete+current.rituals.partial+current.rituals.missed,prior=previous.rituals.complete+previous.rituals.partial+previous.rituals.missed;if(now>=3&&prior>=3)lines.push(`Full daily goals among logged outcomes: ${Math.round(current.rituals.complete/now*100)}% now / ${Math.round(previous.rituals.complete/prior*100)}% previous, from ${now} / ${prior} logs. Unlogged opportunities excluded.`);}
 return <aside className="muse-insight-comparison" aria-label="Previous-period context"><strong>Previous period · {shortDate(previous.range.start)}, {previous.range.start.slice(0,4)} – {shortDate(previous.range.end)}, {previous.range.end.slice(0,4)}</strong>{lines.length?lines.map((line)=><p key={line}>{line}</p>):<p>{view==='money'?'Recorded-spending comparison appears in the Money view.':'Not enough comparable recorded data for this view yet. No percentage change is inferred from missing history.'}</p>}</aside>;
}
