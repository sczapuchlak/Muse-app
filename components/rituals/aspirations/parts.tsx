import type {CSSProperties} from 'react';
import type {Aspiration} from '@/lib/aspirations/models';
import type {Progress} from '@/lib/aspirations/progress';

const fmt=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(n);
/** Words for where an aspiration stands, honest about what is unknown. */
export function progressText(a:Pick<Aspiration,'progressKind'|'status'|'unit'>,p:Progress){
 if(!p.available)return p.note??'Not available right now';
 if(a.progressKind==='binary')return a.status==='completed'?'Done':'Not yet';
 if(a.progressKind==='manual')return `${Math.round(p.percent??0)}% done`;
 if(a.progressKind==='milestones')return p.target?`${p.current} of ${p.target} ${p.unit}`:(p.note??'No milestones yet');
 if(p.current===null)return p.target?`0 of ${fmt(p.target)}${p.unit?` ${p.unit}`:''}`:'No progress recorded yet';
 return `${fmt(p.current)}${p.target?` of ${fmt(p.target)}`:''}${p.unit?` ${p.unit}`:''}`;
}
export function ProgressRing({percent,accent,size=64}:{percent:number|null;accent?:string|null;size?:number}){
 const r=26,c=2*Math.PI*r,v=percent===null?0:percent;
 return <span className="muse-aspiration-ring" data-accent={accent??'primary'} style={{width:size,height:size} as CSSProperties} role="img" aria-label={percent===null?'Progress unknown':`${Math.round(v)}% complete`}>
  <svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r={r} className="track"/><circle cx="32" cy="32" r={r} className="fill" style={{strokeDasharray:c,strokeDashoffset:c*(1-v/100)}}/></svg>
  <span aria-hidden="true">{percent===null?'—':`${Math.round(v)}%`}</span></span>;
}
