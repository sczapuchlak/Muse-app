'use client';
import {useId,type CSSProperties} from 'react';

/** Month → its season motif and its chart ink (themes repaint it). Nov is a leaf, Dec a snowflake, Jan a moon… */
const MOTIF:Record<number,'moon'|'heart'|'sprout'|'blossom'|'sun'|'leaf'|'snow'>={1:'moon',2:'heart',3:'sprout',4:'blossom',5:'blossom',6:'sun',7:'sun',8:'sun',9:'leaf',10:'leaf',11:'leaf',12:'snow'};
export const monthTone=(month:string)=>((Number(month.slice(5,7))+2)%8)+1;
export const monthInk=(month:string):CSSProperties=>({'--m':`var(--chart-${monthTone(month)})`,'--m2':`var(--chart-${monthTone(month)%8+1})`} as CSSProperties);

const star4=(x:number,y:number,r:number)=>`M${x} ${y-r}Q${x+r*.18} ${y-r*.18} ${x+r} ${y}Q${x+r*.18} ${y+r*.18} ${x} ${y+r}Q${x-r*.18} ${y+r*.18} ${x-r} ${y}Q${x-r*.18} ${y-r*.18} ${x} ${y-r}Z`;

/** A small drawn motif for a month, in that month's ink. Decorative. */
export function SeasonMotif({month,size=40}:{month:string;size?:number}){
 const id=useId().replace(/[^a-zA-Z0-9]/g,''),g=`url(#sm${id})`,kind=MOTIF[Number(month.slice(5,7))]??'leaf';
 return <svg className="muse-season-motif" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
  <defs><linearGradient id={`sm${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" style={{stopColor:'var(--m2,var(--accent-secondary))'}}/><stop offset="1" style={{stopColor:'var(--m,var(--accent-primary))'}}/></linearGradient></defs>
  {kind==='leaf'&&<g><path d="M8 32C8 16 18 7 34 6c0 16-9 27-26 26z" fill={g} opacity=".9"/><path d="M9 31C16 22 23 16 31 10M17 24l-1-6M22 19l5 1M13 28l-4-1" stroke="rgba(255,255,255,.75)" strokeWidth="1.3" strokeLinecap="round" fill="none"/></g>}
  {kind==='snow'&&<g stroke={g} strokeWidth="2.4" strokeLinecap="round" fill="none"><path d="M20 4v32M6 12l28 16M6 28l28-16"/><path d="M16 7l4 4 4-4M16 33l4-4 4 4M7 17l5-1-2-5M33 23l-5 1 2 5M7 23l5 1-2 5M33 17l-5-1 2-5"/></g>}
  {kind==='moon'&&<g><path d="M26 6a15 15 0 1 0 8 25A13 13 0 0 1 26 6z" fill={g}/><path d={star4(10,10,3.4)} fill={g}/><path d={star4(33,8,2.4)} fill={g} opacity=".8"/></g>}
  {kind==='heart'&&<path d="M20 34S6 25 6 15c0-5 4-8 8-8 3 0 5 2 6 4 1-2 3-4 6-4 4 0 8 3 8 8 0 10-14 19-14 19z" fill={g}/>}
  {kind==='sprout'&&<g><path d="M20 36V20" stroke={g} strokeWidth="2.4" strokeLinecap="round"/><path d="M20 22C12 22 7 17 7 9c8 0 13 5 13 13zM20 18c0-8 5-13 13-13 0 8-5 13-13 13z" fill={g}/></g>}
  {kind==='blossom'&&<g fill={g}>{[0,72,144,216,288].map(a=><ellipse key={a} cx="20" cy="11" rx="5.5" ry="8" transform={`rotate(${a} 20 20)`} opacity=".88"/>)}<circle cx="20" cy="20" r="4" fill="rgba(255,255,255,.85)"/></g>}
  {kind==='sun'&&<g><circle cx="20" cy="20" r="8" fill={g}/><g stroke={g} strokeWidth="2.4" strokeLinecap="round">{[0,45,90,135,180,225,270,315].map(a=><path key={a} d="M20 4v5" transform={`rotate(${a} 20 20)`}/>)}</g></g>}
 </svg>;
}

/** The Plans hero scene: a stack of books under a crescent moon, a sleepy cat on top, a few slow sparkles. */
export function PlansHeroArt(){
 const id=useId().replace(/[^a-zA-Z0-9]/g,''),u=(n:string)=>`url(#${n}${id})`;
 const stop=(v:string,o=0)=><stop offset={o} style={{stopColor:v}}/>;
 return <svg className="muse-plans-art" viewBox="0 0 240 150" aria-hidden="true" focusable="false">
  <defs>
   <linearGradient id={`mo${id}`} x1="0" y1="0" x2="1" y2="1">{stop('var(--accent-pop,var(--accent-primary))')}{stop('var(--accent-secondary)',1)}</linearGradient>
   <linearGradient id={`b1${id}`} x1="0" y1="0" x2="1" y2="0">{stop('var(--chart-6)')}{stop('color-mix(in srgb,var(--chart-6) 60%,#000)',1)}</linearGradient>
   <linearGradient id={`b2${id}`} x1="0" y1="0" x2="1" y2="0">{stop('var(--chart-4)')}{stop('color-mix(in srgb,var(--chart-4) 60%,#000)',1)}</linearGradient>
   <linearGradient id={`b3${id}`} x1="0" y1="0" x2="1" y2="0">{stop('var(--chart-1)')}{stop('color-mix(in srgb,var(--chart-1) 60%,#000)',1)}</linearGradient>
   <radialGradient id={`gl${id}`}>{stop('var(--accent-primary)')}<stop offset="1" style={{stopColor:'var(--accent-primary)',stopOpacity:0}}/></radialGradient>
  </defs>
  <ellipse cx="150" cy="96" rx="92" ry="54" fill={u('gl')} opacity=".22"/>
  <path d="M203 16a22 22 0 1 0 14 38 19 19 0 0 1-14-38z" fill={u('mo')}/>
  <g className="muse-plans-art-stars" fill="var(--accent-pop,var(--accent-primary))">
   <path d={star4(176,20,5)}/><path d={star4(226,74,3.6)} opacity=".8"/><path d={star4(98,30,4)} opacity=".7"/><path d={star4(132,12,2.6)} opacity=".6"/>
  </g>
  {/* the stack */}
  <rect x="92" y="122" width="128" height="18" rx="3" fill={u('b1')}/><path d="M100 122v18M210 122v18" stroke="rgba(255,255,255,.45)" strokeWidth="1.4"/><path d="M92 131h128" stroke="rgba(255,255,255,.18)"/>
  <rect x="102" y="105" width="110" height="17" rx="3" fill={u('b2')}/><path d="M110 105v17M203 105v17" stroke="rgba(255,255,255,.45)" strokeWidth="1.4"/>
  <rect x="96" y="89" width="104" height="16" rx="3" fill={u('b3')}/><path d="M104 89v16M191 89v16" stroke="rgba(255,255,255,.45)" strokeWidth="1.4"/>
  {/* the cat, curled on top, tail over the edge */}
  <g className="muse-plans-art-cat" fill="#1c1428">
   <ellipse cx="160" cy="79" rx="27" ry="12"/>
   <circle cx="135" cy="74" r="11"/>
   <path d="M126 68l1-11 7 7zM139 64l6-9 2 10z"/>
   <path className="muse-plans-art-tail" d="M185 82c8 2 10 10 6 18-2 5 1 9 5 9" stroke="#1c1428" strokeWidth="5" strokeLinecap="round" fill="none"/>
  </g>
  <path d="M130 74q2 2 4 0M138 74q2 2 4 0" stroke="#f6c76a" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
  <path d="M60 140c10-26 18-40 30-46M70 120c-8-4-12-10-12-18 8 2 12 8 12 18zM80 104c4-8 10-11 17-11-3 7-8 11-17 11z" stroke="color-mix(in srgb,var(--chart-3) 80%,#000)" strokeWidth="2" fill="color-mix(in srgb,var(--chart-3) 55%,transparent)" strokeLinecap="round"/>
 </svg>;
}
