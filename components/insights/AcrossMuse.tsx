'use client';
import Link from 'next/link';
import {InsightPanel} from './InsightPanel';
import type {CrossConnection,MacroRow} from '@/lib/insights/across';
import {formatMoney} from '@/lib/money';

const change=(row:MacroRow)=>{
 if(row.previous===null)return null;
 const diff=row.current-row.previous;
 if(!row.previous&&!row.current)return null;
 if(diff===0)return 'same as the previous period';
 const amount=row.id==='spending'?formatMoney(Math.abs(diff)):new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(Math.abs(diff));
 return `${diff>0?'+':'−'}${amount} vs the previous period`;
};

/** Macro view: separate, traceable totals per module. Never summed into one score. */
export function AcrossMuse({rows}:{rows:MacroRow[]}){
 if(!rows.length)return null;
 return <InsightPanel title="Across Muse" kicker="This period, module by module" className="muse-insight-across">
  <ul className="muse-across-grid">{rows.map(row=>{const delta=change(row);return <li key={row.id}><Link href={row.href} className="muse-across-tile"><span className="muse-across-label">{row.label}</span><strong>{row.value}</strong><span className="muse-across-detail">{row.detail}</span>{delta&&<span className="muse-across-delta">{delta}</span>}</Link></li>;})}</ul>
  <details className="muse-insight-basis"><summary>How each is counted</summary><dl className="muse-across-definitions">{rows.map(row=><div key={row.id}><dt>{row.label}</dt><dd>{row.definition}</dd></div>)}</dl></details>
  <p className="small-label">Each figure stays in its own unit and comes from the module that owns it. Modules without records in either period are left out.</p>
 </InsightPanel>;
}

const fmt=(n:number)=>n.toFixed(1);
/** Descriptive comparisons on shared dates, with sample sizes; suppressed until both sides have enough days. */
export function CrossConnections({items}:{items:CrossConnection[]}){
 if(!items.length)return null;
 return <InsightPanel title="Connections across Muse" kicker="Side by side, not cause and effect">
  <div className="muse-insight-relationships">{items.map(item=><article key={item.id}><h3>{item.title}</h3>
   {item.result.enough?<p>Mean {item.signal} was <strong>{fmt(item.result.withMean!)}</strong> on {item.result.withN} {item.withLabel}, and <strong>{fmt(item.result.withoutMean!)}</strong> on {item.result.withoutN} {item.withoutLabel}.</p>
   :<p>Needs at least five {item.withLabel} and five {item.withoutLabel}. So far: {item.result.withN} and {item.result.withoutN}.</p>}
   <p className="small-label">{item.note} Ratings are 1–10; unrated days are left out. This describes your records; it does not show that one causes the other.</p></article>)}</div>
 </InsightPanel>;
}
