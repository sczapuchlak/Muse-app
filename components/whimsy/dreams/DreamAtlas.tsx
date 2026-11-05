'use client';
import {useState,type CSSProperties,type ReactNode} from 'react';
import Link from 'next/link';
import type {DreamEntry} from '@/lib/whimsy/models';
import type {DreamSeries} from '@/lib/whimsy/dream-persistence';
import {dreamCounts,dreamDisplayTitle,dreamMonths,dreamTypeMeta,dreamWeekdays,emotionPairs,paginate,symbolConstellation} from '@/lib/whimsy/dreams';
import {dateLabel} from '@/lib/dates';
import {DreamPager,DreamTypeBadge,emotionName,monthTitle,shortDate} from './parts';

type Selection={kind:'symbol'|'emotion'|'pair'|'type'|'month'|'weekday'|'series';id:string;label:string};
const weekdayNames=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const yearDate=(d:string)=>`${dateLabel(d)}, ${d.slice(0,4)}`;

/** Dream Atlas, the Map of Your Dreaming Mind: every pattern comes from saved dreams, and every pattern opens its dreams. */
export function DreamAtlas({dreams,series,seriesOf,symbolName,symbolHref,today,onOpen,onRemoveSeries,newSeries}:{dreams:DreamEntry[];series:DreamSeries[];seriesOf:(dreamId:string)=>string;symbolName:(id:string)=>string;symbolHref:(id:string)=>string;today:string;onOpen:(d:DreamEntry)=>void;onRemoveSeries:(s:DreamSeries)=>void;newSeries:ReactNode}){
 const [sel,setSel]=useState<Selection|null>(null),[pageNo,setPageNo]=useState(0);
 const counts=dreamCounts(dreams),constellation=symbolConstellation(dreams),pairs=emotionPairs(dreams).slice(0,5),months=dreamMonths(dreams,today),weekdays=dreamWeekdays(dreams);
 const pick=(s:Selection)=>{setSel(cur=>cur&&cur.kind===s.kind&&cur.id===s.id?null:s);setPageNo(0);};
 const isSel=(kind:Selection['kind'],id:string)=>sel?.kind===kind&&sel.id===id;
 const matching=!sel?[]:dreams.filter(d=>sel.kind==='symbol'?d.symbolIds.includes(sel.id):sel.kind==='emotion'?d.emotions.includes(sel.id):sel.kind==='pair'?sel.id.split('|').every(e=>d.emotions.includes(e)):sel.kind==='type'?(d.classifications??(d.lucid?['Lucid']:[])).includes(sel.id):sel.kind==='month'?d.date.startsWith(sel.id):sel.kind==='weekday'?(new Date(`${d.date}T12:00:00Z`).getUTCDay()+6)%7===Number(sel.id):seriesOf(d.id)===sel.id).sort((a,b)=>b.date.localeCompare(a.date));
 const page=paginate(matching,pageNo,6);
 if(!dreams.length)return <section className="muse-dream-section" aria-label="Dream Atlas"><div className="muse-dream-empty-state"><span className="muse-dream-moon" aria-hidden="true">✦</span><h3>A few nights of dreaming will help the patterns emerge.</h3><p>The Atlas maps only the dreams you choose to record. Blank nights stay blank.</p></div></section>;
 const maxMonth=Math.max(1,...months.map(m=>m.count)),maxDay=Math.max(1,...weekdays),maxEmotion=counts.emotions[0]?.[1]??1,typeTotal=counts.classifications.reduce((n,[,c])=>n+c,0);
 // Constellation layout: deterministic positions on an ellipse, most frequent first.
 const W=420,H=280,nodes=constellation.nodes.map((n,i,all)=>{const a=-Math.PI/2+i*2*Math.PI/Math.max(1,all.length);return {...n,x:W/2+Math.cos(a)*(W/2-70),y:H/2+Math.sin(a)*(H/2-40),r:4+Math.min(10,n.count*1.4)};});
 const at=(id:string)=>nodes.find(n=>n.id===id)!,focus=sel?.kind==='symbol'?sel.id:'',connected=new Set(constellation.links.filter(l=>l.a===focus||l.b===focus).flatMap(l=>[l.a,l.b]));
 return <section className="muse-dream-section muse-dream-atlas" aria-label="Dream Atlas">
  <div className="muse-dream-atlas-intro"><h3>The map of your dreaming mind</h3><p className="small-label">Only dreams you chose to record appear here. Select any pattern to read the dreams behind it.</p></div>
  <div className="muse-dream-pills"><span><b>{counts.total}</b> dreams</span><span><b>{counts.lucid}</b> lucid</span><span><b>{counts.months.length}</b> {counts.months.length===1?'month':'months'}</span><span><b>{counts.symbols.filter(([,n])=>n>1).length}</b> returning symbols</span><span><b>{series.length}</b> {series.length===1?'series':'series'}</span></div>
  {dreams.length<5&&<p className="muse-dream-quiet">A few more nights of dreaming will help the patterns emerge.</p>}
  <div className="muse-dream-atlas-board">
   <article className="muse-dream-atlas-card muse-dream-constellation-card"><header><h4>Symbol constellation</h4><span className="small-label">Stars are symbols in 2+ dreams; lines join symbols that shared at least two dreams.</span></header>
    {nodes.length?<svg viewBox={`0 0 ${W} ${H}`} className="muse-dream-constellation" role="group" aria-label="Recurring symbols and the symbols they appear with">
     {constellation.links.map(l=>{const a=at(l.a),b=at(l.b),lit=!focus||l.a===focus||l.b===focus;return <line key={`${l.a}|${l.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} data-lit={lit} strokeWidth={Math.min(4,0.6+l.count*0.5)}><title>{`${symbolName(l.a)} and ${symbolName(l.b)}: together in ${l.count} dreams`}</title></line>;})}
     {nodes.map(n=><g key={n.id} className="muse-dream-star" data-selected={isSel('symbol',n.id)} data-dim={!!focus&&n.id!==focus&&!connected.has(n.id)} tabIndex={0} role="button" aria-pressed={isSel('symbol',n.id)} aria-label={`${symbolName(n.id)}: in ${n.count} dreams`} onClick={()=>pick({kind:'symbol',id:n.id,label:symbolName(n.id)})} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick({kind:'symbol',id:n.id,label:symbolName(n.id)});}}}>
      <circle cx={n.x} cy={n.y} r={n.r+7} className="muse-dream-star-halo"/><circle cx={n.x} cy={n.y} r={n.r}/><text x={n.x} y={n.y+n.r+13} textAnchor="middle">{symbolName(n.id)}</text><text x={n.x} y={n.y+n.r+24} textAnchor="middle" className="muse-dream-star-count">{n.count}</text></g>)}
    </svg>:<p className="muse-dream-quiet">No familiar visitors just yet. Some symbols take their time returning.</p>}
   </article>
   <article className="muse-dream-atlas-card"><header><h4>Emotional traces</h4></header>
    {counts.emotions.length?<ul className="muse-dream-bars">{counts.emotions.slice(0,8).map(([id,n])=><li key={id}><button type="button" aria-pressed={isSel('emotion',id)} onClick={()=>pick({kind:'emotion',id,label:emotionName(id)})}><span>{emotionName(id)}</span><span className="muse-dream-bar"><i style={{width:`${Math.round(n/maxEmotion*100)}%`}}/></span><b>{n}</b></button></li>)}</ul>:<p className="muse-dream-quiet">No feelings recorded yet.</p>}
    {pairs.length>0&&<><h5>Often felt together</h5><div className="muse-dream-pairs">{pairs.map(pr=><button type="button" key={`${pr.a}|${pr.b}`} aria-pressed={isSel('pair',`${pr.a}|${pr.b}`)} onClick={()=>pick({kind:'pair',id:`${pr.a}|${pr.b}`,label:`${emotionName(pr.a)} + ${emotionName(pr.b)}`})}>{emotionName(pr.a)} <span aria-hidden="true">+</span> {emotionName(pr.b)} <small>{pr.count}</small></button>)}</div></>}
   </article>
   <article className="muse-dream-atlas-card"><header><h4>When dreams are remembered</h4><span className="small-label">Last 12 months</span></header>
    <div className="muse-dream-columns" role="group" aria-label="Dreams per month">{months.map(m=><button type="button" key={m.month} disabled={!m.count} aria-pressed={isSel('month',m.month)} onClick={()=>pick({kind:'month',id:m.month,label:monthTitle(m.month)})} aria-label={`${monthTitle(m.month)}: ${m.count} dreams`} title={`${monthTitle(m.month)}: ${m.count}`}><span style={{'--h':`${Math.round(m.count/maxMonth*100)}%`} as CSSProperties}/><small>{monthTitle(m.month).slice(0,1)}</small></button>)}</div>
    <h5>By night of the week</h5>
    <div className="muse-dream-weekdays" role="group" aria-label="Dreams by weekday">{weekdays.map((n,i)=><button type="button" key={i} disabled={!n} aria-pressed={isSel('weekday',String(i))} onClick={()=>pick({kind:'weekday',id:String(i),label:`${weekdayNames[i]} nights`})} aria-label={`${weekdayNames[i]}: ${n} dreams`}><i style={{opacity:n?0.25+0.75*n/maxDay:0.08}}/><small>{weekdayNames[i].slice(0,2)}</small></button>)}</div>
   </article>
   <article className="muse-dream-atlas-card"><header><h4>Kinds of dreams</h4></header>
    {counts.classifications.length?<><div className="muse-dream-proportion" aria-hidden="true">{counts.classifications.map(([t,n])=><i key={t} data-tone={dreamTypeMeta[t]?.tone??'neutral'} style={{flexGrow:n}}/>)}</div>
     <div className="muse-dream-type-legend">{counts.classifications.map(([t,n])=><button type="button" key={t} aria-pressed={isSel('type',t)} onClick={()=>pick({kind:'type',id:t,label:`${t} dreams`})}><DreamTypeBadge type={t}/><small>{n} · {Math.round(n/typeTotal*100)}%</small></button>)}</div></>:<p className="muse-dream-quiet">Mark a dream lucid, vivid or recurring to see its kind here.</p>}
   </article>
   <article className="muse-dream-atlas-card muse-dream-series-card"><header><h4>Recurring series</h4><span className="small-label">Dreams you linked into a story</span></header>
    {series.length?<ul className="muse-dream-ribbons">{series.map(s=>{const linked=dreams.filter(d=>seriesOf(d.id)===s.id).sort((a,b)=>a.date.localeCompare(b.date)),first=linked[0]?.date,last=linked.at(-1)?.date,span=first&&last?Math.max(1,(Date.parse(last)-Date.parse(first))/86400000):1;
      return <li key={s.id}><button type="button" className="muse-dream-ribbon" aria-pressed={isSel('series',s.id)} onClick={()=>pick({kind:'series',id:s.id,label:s.name})}><span className="muse-dream-ribbon-name">↻ {s.name}</span><span className="small-label">{linked.length} {linked.length===1?'dream':'dreams'}{first?` · ${yearDate(first)}${last&&last!==first?` – ${yearDate(last)}`:''}`:''}</span><span className="muse-dream-ribbon-track" aria-hidden="true">{linked.map(d=><i key={d.id} style={{left:`${first?((Date.parse(d.date)-Date.parse(first))/86400000)/span*100:0}%`}}/>)}</span></button><button type="button" className="text-button" onClick={()=>onRemoveSeries(s)}>Remove series</button></li>;})}</ul>
     :<p className="muse-dream-quiet">No series yet. Link related dreams while editing them, and their story appears here.</p>}
    {newSeries}
   </article>
  </div>
  {sel&&<section className="muse-dream-revealed muse-dream-reveal" aria-label={`Dreams: ${sel.label}`} key={`${sel.kind}-${sel.id}`}>
   <header><h4>{sel.label}</h4><span className="small-label">{matching.length} {matching.length===1?'dream':'dreams'}</span>{sel.kind==='symbol'&&<Link className="text-button" href={symbolHref(sel.id)}>Open in the Encyclopedia →</Link>}<button type="button" className="text-button" onClick={()=>setSel(null)}>Close</button></header>
   <ul>{page.items.map(d=><li key={d.id}><button type="button" onClick={()=>onOpen(d)}><time dateTime={d.date}>{shortDate(d.date)}, {d.date.slice(0,4)}</time><strong>{dreamDisplayTitle(d)}</strong><span>{d.text}</span></button></li>)}</ul>
   <DreamPager page={page} onPage={setPageNo} label="Revealed dream pages"/>
  </section>}
 </section>;
}
