'use client';
import {useState} from 'react';
import type {CSSProperties,ReactNode} from 'react';
import {dateLabel} from '@/lib/dates';

export const duration=(seconds:number)=>seconds?seconds<60?'Less than a minute':`${Math.round(seconds/60)} min`:'Time not recorded';
export const hours=(seconds:number)=>seconds<3600?duration(seconds):`${(seconds/3600).toFixed(seconds<36000?1:0)} h`;
export const num=(n:number)=>Math.round(n).toLocaleString('en-US');
export const days=(n:number)=>`${n} ${n===1?'day':'days'}`;
export const plural=(n:number,one:string,many=`${one}s`)=>`${n} ${n===1?one:many}`;
export const monthLabel=(month:string)=>new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`));
export const monthName=(month:string)=>new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'UTC'}).format(new Date(`${month}-01T12:00:00Z`));
export const shortMonth=(start:string)=>new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'UTC'}).format(new Date(`${start.slice(0,7)}-01T12:00:00Z`));
/** A date with its year: Atlas history spans years. */
export const yearDate=(date:string)=>`${dateLabel(date)}, ${date.slice(0,4)}`;

export function AtlasMetric({label,value,detail}:{label:string;value:string;detail:string}){return <div><span className="small-label">{label}</span><strong>{value}</strong><small>{detail}</small></div>;}

/** A compact bar chart with a text equivalent; empty periods are real zeros, never estimates. */
const axisValue=(value:number,unit:'time'|'count'|'rating')=>unit==='rating'?`${Math.round(value*10)/10}★`:unit==='time'?(value>=3600?`${+(value/3600).toFixed(1)}h`:`${Math.round(value/60)}m`):num(value);

/** A bar chart with a value axis; hover, focus or tap a bar to read its exact figure. An optional line follows the ups and downs. */
export function ActivityBars({title,note,items,line=false,unit='count',max:fixedMax}:{title:string;note:string;items:{key:string;label:string;short:string;value:number;text:string}[];line?:boolean;unit?:'time'|'count'|'rating';max?:number}){
 const [active,setActive]=useState<number|null>(null);
 const max=fixedMax??Math.max(1,...items.map(i=>i.value)),empty=items.every(i=>!i.value),n=items.length;
 const points=items.map((i,k)=>({x:(k+.5)/n*100,y:i.value/max*100}));
 const shown=active!==null?items[active]:null;
 return <article className="muse-books-panel"><div className="muse-books-panel-head"><h4>{title}</h4></div>
  {empty?<p>Nothing recorded in this window yet.</p>:<div className="muse-bars-wrap">
   <div className="muse-bars-axis" aria-hidden="true"><span>{axisValue(max,unit)}</span>{(unit!=='count'||max>=4)&&<span>{axisValue(unit==='count'?Math.round(max/2):max/2,unit)}</span>}<span>0</span></div>
   <div className="muse-bars-plot" onPointerLeave={()=>setActive(null)}>
   <div className="muse-bars-grid" aria-hidden="true"><i/>{(unit!=='count'||max>=4)&&<i/>}<i/></div>
   <ol className="muse-books-bars" aria-label={title}>{items.map((i,k)=><li key={i.key}><button type="button" className="muse-books-bar-hit" aria-label={`${i.label}: ${i.text}`} aria-pressed={active===k} onPointerEnter={()=>setActive(k)} onFocus={()=>setActive(k)} onBlur={()=>setActive(null)} onClick={()=>setActive(active===k?null:k)}><span className="muse-books-bar" data-active={active===k||undefined} style={{'--bar':`${Math.round(i.value/max*100)}%`} as CSSProperties} aria-hidden="true"/></button><small aria-hidden="true">{i.short}</small></li>)}</ol>
   {shown&&active!==null&&<div className="muse-bars-tip" role="status" style={{left:`clamp(14%,${points[active].x}%,86%)`,bottom:`calc((100% - 18px) * ${points[active].y/100} + 18px)`} as CSSProperties}><strong><span aria-hidden="true">✦</span> {shown.text}</strong><span>{shown.label}</span></div>}
   {line&&n>1&&<div className="muse-bars-line" aria-hidden="true"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={points.map(p=>`${p.x},${100-p.y}`).join(' ')} fill="none" vectorEffect="non-scaling-stroke"/></svg>{points.map((p,k)=><i key={k} style={{left:`${p.x}%`,bottom:`${p.y}%`}}/>)}</div>}
   </div>
  </div>}
  <p className="small-label">{note}</p></article>;
}

/** One answer with its evidence, or an honest empty state when the data does not exist yet. */
export function Insight({label,value,detail,empty}:{label:string;value?:ReactNode;detail?:ReactNode;empty:string}){
 return <div className="muse-atlas-insight"><span className="small-label">{label}</span>{value?<><strong>{value}</strong>{detail&&<small>{detail}</small>}</>:<small className="muse-atlas-insight-empty">{empty}</small>}</div>;
}
