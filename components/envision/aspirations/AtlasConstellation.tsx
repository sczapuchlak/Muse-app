import {useId,type CSSProperties} from 'react';

/** Ten hand-placed points of a celestial band (viewBox 100×56). Areas take them in order; more than ten wrap. */
export const starPoints:[number,number][]=[[7,36],[17,17],[28,38],[38,12],[49,31],[58,9],[67,40],[77,20],[86,44],[94,15]];
const threads:[number,number][]=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[7,9],[2,4],[4,6]];
export type StarState={id:string;label:string;count:number;achieved:number;tone:number};

/**
 * The Life Atlas constellation: one star per Life Area. A star grows with its aspirations and turns golden once one
 * is achieved; threads only light between areas that both hold something. Decorative unless `labelled`.
 */
export function AtlasConstellation({stars,labelled=false,current,reveal=false,className=''}:{stars:StarState[];labelled?:boolean;current?:string;reveal?:boolean;className?:string}){
 const pts=stars.map((s,i)=>({s,i,p:starPoints[i%starPoints.length]}));
 const glow=`atlas-glow-${useId().replace(/[^a-zA-Z0-9]/g,'')}`;
 const lit=(i:number)=>(stars[i]?.count??0)>0;
 return <svg className={`muse-lifeatlas-constellation ${className}`.trim()} viewBox="0 0 100 56" data-reveal={reveal||undefined} role={labelled?'img':undefined} aria-hidden={labelled?undefined:true}
  aria-label={labelled?`Your Life Atlas: ${stars.filter(s=>s.count).map(s=>`${s.label}, ${s.count}`).join('; ')||'no aspirations yet'}`:undefined}>
  <defs><radialGradient id={glow}><stop offset="0" stopColor="currentColor" stopOpacity=".55"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></radialGradient></defs>
  {threads.filter(([a,b])=>a<stars.length&&b<stars.length).map(([a,b],k)=><line key={k} className="muse-lifeatlas-thread" data-lit={lit(a)&&lit(b)||undefined} style={{'--k':k} as CSSProperties}
   x1={starPoints[a][0]} y1={starPoints[a][1]} x2={starPoints[b][0]} y2={starPoints[b][1]} pathLength={1}/>)}
  {pts.map(({s,i,p})=>{const r=s.count?Math.min(2.6,1.15+Math.sqrt(s.count)*.5):.75;
   return <g key={s.id} className="muse-lifeatlas-star" data-lit={s.count>0||undefined} data-achieved={s.achieved>0||undefined} data-current={current===s.id||undefined}
    style={{'--i':i,'--star':`var(--chart-${s.tone})`} as CSSProperties} transform={`translate(${p[0]} ${p[1]})`}>
    {s.count>0&&<circle className="muse-lifeatlas-star-halo" r={r*3.4} fill={`url(#${glow})`}/>}
    <path className="muse-lifeatlas-star-shape" d={`M0 ${-r*1.6}C${r*.18} ${-r*.3} ${r*.3} ${-r*.18} ${r*1.6} 0C${r*.3} ${r*.18} ${r*.18} ${r*.3} 0 ${r*1.6}C${-r*.18} ${r*.3} ${-r*.3} ${r*.18} ${-r*1.6} 0C${-r*.3} ${-r*.18} ${-r*.18} ${-r*.3} 0 ${-r*1.6}Z`}/>
    {labelled&&<text className="muse-lifeatlas-star-label" y={p[1]>28?-r*2.2-1.4:r*2.2+3.2} textAnchor="middle">{s.label}</text>}
   </g>;})}
 </svg>;
}
