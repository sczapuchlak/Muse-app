import {useId,type CSSProperties} from 'react';

/** Ten hand-placed points of a celestial band (viewBox 100×56). Areas take them in order; more than ten wrap. */
export const starPoints:[number,number][]=[[7,36],[17,17],[28,38],[38,12],[49,31],[58,9],[67,40],[77,20],[86,44],[94,15]];
const threads:[number,number][]=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[7,9],[2,4],[4,6]];
/**
 * The hero's sky (viewBox 140×46): an irregular asterism, like a real constellation rather than a pattern. It rises from
 * low on the left toward the upper right, with a main spine and a few branching arms, so nothing crowds the hero's words.
 * Each point carries where its label sits (above or below), chosen so no two labels collide.
 */
const webPoints:[number,number][]=[[58,30],[73,19],[84,36],[92,10],[107,25],[120,6],[130,33],[141,18],[156,38],[169,8]];
const webAbove=[false,true,false,true,false,true,false,true,false,true];
const webThreads:[number,number][]=[[0,1],[1,3],[3,5],[5,7],[7,9],[1,2],[3,4],[4,6],[7,8],[4,7]];
/** Little unnamed stars that carry the constellation left across the open sky (Stephanie's mockup): a mountain ridge
 *  that climbs, dips, climbs again and comes down into Health & fitness, plus one stray star off Career. */
const webDust:[number,number,number][]=[[4,34,.55],[11,16,.8],[24,36,.6],[33,24,.75],[44,38,.55],[66,6,.6]];
const webDustThreads:[[number,number],[number,number]][]=[[[4,34],[11,16]],[[11,16],[24,36]],[[24,36],[33,24]],[[33,24],[44,38]],[[44,38],[58,30]],[[73,19],[66,6]]];
export type StarState={id:string;label:string;count:number;achieved:number;tone:number};

/**
 * The Life Atlas constellation: one star per Life Area. A star grows with its aspirations and turns golden once one
 * is achieved; threads only light between areas that both hold something. Decorative unless `labelled`.
 */
export function AtlasConstellation({stars,labelled=false,current,reveal=false,className='',web=false}:{stars:StarState[];labelled?:boolean;current?:string;reveal?:boolean;className?:string;web?:boolean}){
 const points=web?webPoints:starPoints,lines=web?webThreads:threads,mid=web?23:28,size=web?1.45:1;
 const pts=stars.map((s,i)=>({s,i,p:points[i%points.length]}));
 const glow=`atlas-glow-${useId().replace(/[^a-zA-Z0-9]/g,'')}`;
 const lit=(i:number)=>(stars[i]?.count??0)>0;
 return <svg className={`muse-lifeatlas-constellation ${className}`.trim()} viewBox={web?"0 0 180 46":"0 0 100 56"} data-web={web||undefined} data-reveal={reveal||undefined} role={labelled?'img':undefined} aria-hidden={labelled?undefined:true}
  aria-label={labelled?`Your Life Atlas: ${stars.filter(s=>s.count).map(s=>`${s.label}, ${s.count}`).join('; ')||'no aspirations yet'}`:undefined}>
  <defs><radialGradient id={glow}><stop offset="0" stopColor="currentColor" stopOpacity=".55"/><stop offset="1" stopColor="currentColor" stopOpacity="0"/></radialGradient></defs>
  {web&&webDustThreads.map(([p1,p2],k)=><line key={`dt${k}`} className="muse-lifeatlas-thread" data-dust x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} pathLength={1} style={{'--k':k} as CSSProperties}/>)}
  {web&&webDust.map(([x,y,r],k)=><path key={`d${k}`} className="muse-lifeatlas-dust" style={{'--i':k} as CSSProperties} d={`M${x} ${y-r*1.6}C${x+r*.18} ${y-r*.3} ${x+r*.3} ${y-r*.18} ${x+r*1.6} ${y}C${x+r*.3} ${y+r*.18} ${x+r*.18} ${y+r*.3} ${x} ${y+r*1.6}C${x-r*.18} ${y+r*.3} ${x-r*.3} ${y+r*.18} ${x-r*1.6} ${y}C${x-r*.3} ${y-r*.18} ${x-r*.18} ${y-r*.3} ${x} ${y-r*1.6}Z`}/>)}
  {lines.filter(([a,b])=>a<stars.length&&b<stars.length).map(([a,b],k)=><line key={k} className="muse-lifeatlas-thread" data-lit={lit(a)&&lit(b)||undefined} style={{'--k':k} as CSSProperties}
   x1={points[a][0]} y1={points[a][1]} x2={points[b][0]} y2={points[b][1]} pathLength={1}/>)}
  {pts.map(({s,i,p})=>{const r=(s.count?Math.min(2.6,1.15+Math.sqrt(s.count)*.5):.85)*size;
   return <g key={s.id} className="muse-lifeatlas-star" data-lit={s.count>0||undefined} data-achieved={s.achieved>0||undefined} data-current={current===s.id||undefined}
    style={{'--i':i,'--star':`var(--chart-${s.tone})`} as CSSProperties} transform={`translate(${p[0]} ${p[1]})`}>
    {s.count>0&&<circle className="muse-lifeatlas-star-halo" r={r*3.4} fill={`url(#${glow})`}/>}
    <path className="muse-lifeatlas-star-shape" d={`M0 ${-r*1.6}C${r*.18} ${-r*.3} ${r*.3} ${-r*.18} ${r*1.6} 0C${r*.3} ${r*.18} ${r*.18} ${r*.3} 0 ${r*1.6}C${-r*.18} ${r*.3} ${-r*.3} ${r*.18} ${-r*1.6} 0C${-r*.3} ${-r*.18} ${-r*.18} ${-r*.3} 0 ${-r*1.6}Z`}/>
    {labelled&&<text className="muse-lifeatlas-star-label" y={web?(webAbove[i%webAbove.length]?-r*2.1-1.2:r*2.1+3):(p[1]>mid?-r*2.1-1.6:r*2.1+3.2)} textAnchor="middle">{s.label}</text>}
   </g>;})}
 </svg>;
}
