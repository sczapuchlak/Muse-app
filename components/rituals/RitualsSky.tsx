import type {CSSProperties} from "react";
import {flexible,ritualCell,ritualOpportunity,type RitualDefinition,type RitualState} from "@/lib/rituals";
import "./RitualsSky.css";

/**
 * Rituals glow-up (Nov 2026): the selected day as a constellation. Each daily ritual scheduled that day is a star; a
 * complete ritual burns bright, partial progress glows halfway, open and unknown days stay as faint outlines (never
 * failure), and an explicit miss is a dim cross. Lines light up between neighbouring completed stars.
 *
 * Nov 18 (Stephanie): just the constellation. The week tiles (perfect days, longest rhythm, the logged counts) are
 * gone, and on a phone the sky rises into the top-right corner beside the title instead of sitting beneath it, so the
 * card is about half as tall.
 *
 * Nov 19 (Stephanie): a real constellation, not a ribbon. On a wide screen the stars wander across the whole sky (a
 * taller canvas, spaced evenly along a winding path, every name placed clear of the others) instead of one shallow
 * arch. Only the day's daily rituals appear: weekly targets and flexible rhythms live in their groups, not here.
 */
type Status=ReturnType<typeof ritualCell>["status"];
type Shape="band"|"rise";
type Star={ritual:RitualDefinition;status:Status;x:number;y:number;lx:number;ly:number;anchor:"start"|"middle"|"end";label:string|null};
const fmt=(d:string,o:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat("en-US",{...o,timeZone:"UTC"}).format(new Date(`${d}T12:00:00Z`));
const r1=(n:number)=>Math.round(n*10)/10;
const starPath=(x:number,y:number,r:number)=>`M${r1(x)} ${r1(y-r)}C${r1(x+r*.16)} ${r1(y-r*.16)} ${r1(x+r*.16)} ${r1(y-r*.16)} ${r1(x+r)} ${r1(y)}C${r1(x+r*.16)} ${r1(y+r*.16)} ${r1(x+r*.16)} ${r1(y+r*.16)} ${r1(x)} ${r1(y+r)}C${r1(x-r*.16)} ${r1(y+r*.16)} ${r1(x-r*.16)} ${r1(y+r*.16)} ${r1(x-r)} ${r1(y)}C${r1(x-r*.16)} ${r1(y-r*.16)} ${r1(x-r*.16)} ${r1(y-r*.16)} ${r1(x)} ${r1(y-r)}Z`;
const lit=(s:Status)=>s==="complete";
const statusWord=(s:Status)=>s==="complete"?"complete":s==="partial"?"partly done":s==="missed"?"missed":s==="upcoming"?"upcoming":"not logged yet";

type SkySpec={w:number;h:number;points:readonly (readonly [number,number])[];font:number;clear:Box[]};
/** The wide sky: a winding constellation across the whole space beside the title, rising and dipping like the Dipper
 *  and Cassiopeia rather than one arch, with room above and below each star for its name. */
const BAND:SkySpec={w:960,h:196,points:[[30,138],[150,96],[262,150],[380,70],[502,124],[618,52],[736,112],[850,62],[934,128]],font:12,clear:[]};
/** The phone sky: low along the bottom, up the right side, then curling back across the top toward the title (a hook,
 *  like the Dipper's handle), so the names have room. The title's corner is kept clear. */
const RISE:SkySpec={w:400,h:188,points:[[18,148],[180,160],[320,150],[384,104],[384,50],[330,16]],font:13,clear:[{x0:0,x1:222,y0:0,y1:20},{x0:0,x1:210,y0:20,y1:90}]};


type Box={x0:number;x1:number;y0:number;y1:number};
const clip=(name:string,max:number)=>name.length>max?`${name.slice(0,max-1).trimEnd()}…`:name;
/**
 * Stars spaced evenly along the path (by length, so they never bunch on a bend), then each name takes the first spot
 * (below, above, beside, or diagonal) that clears every other name, every star and the title. A long name is
 * shortened only when no spot fits it whole. One placement for both skies; only the path and canvas differ.
 */
export function placeAlong(names:string[],RISE:SkySpec){
 const P=RISE.points,cr=(a:number,b:number,c:number,d:number,t:number)=>.5*(2*b+(c-a)*t+(2*a-5*b+4*c-d)*t*t+(3*b-a-3*c+d)*t*t*t);
 const curve:number[][]=[];
 for(let i=0;i<P.length-1;i++){const a=P[Math.max(0,i-1)],b=P[i],c=P[i+1],d=P[Math.min(P.length-1,i+2)];for(let k=0;k<40;k++)curve.push([cr(a[0],b[0],c[0],d[0],k/40),cr(a[1],b[1],c[1],d[1],k/40)]);}
 curve.push([...P.at(-1)!]);
 const lengths=[0];for(let k=1;k<curve.length;k++)lengths.push(lengths[k-1]+Math.hypot(curve[k][0]-curve[k-1][0],curve[k][1]-curve[k-1][1]));
 const n=names.length,total=lengths.at(-1)!;
 const stars=names.map((_,i)=>{const want=n<2?total*.3:total*i/(n-1);let k=lengths.findIndex(l=>l>=want);if(k<1)k=1;const [x,y]=curve[k],[px,py]=curve[k-1];return {x,y,steep:Math.abs(y-py)>Math.abs(x-px)*.9};});
 const taken:Box[]=[...RISE.clear],cw=RISE.font*.56;
 const boxFor=(x:number,y:number,anchor:Star["anchor"],width:number):Box=>{const x0=anchor==="middle"?x-width/2:anchor==="start"?x:x-width;return {x0,x1:x0+width,y0:y-RISE.font+2,y1:y+2};};
 const overlap=(b:Box,o:Box)=>Math.max(0,Math.min(b.x1,o.x1)-Math.max(b.x0,o.x0))*Math.max(0,Math.min(b.y1,o.y1)-Math.max(b.y0,o.y0));
 const blocked=(b:Box,self:number)=>b.x0<0||b.x1>RISE.w||b.y0<-2||b.y1>RISE.h+6||taken.some(o=>b.x0<o.x1+3&&o.x0<b.x1+3&&b.y0<o.y1+1&&o.y0<b.y1+1)||stars.some((o,j)=>j!==self&&o.x>b.x0-10&&o.x<b.x1+10&&o.y>b.y0-10&&o.y<b.y1+10);
 return stars.map((s,i)=>{
  const spots={below:{lx:s.x,ly:s.y+27,anchor:"middle"},above:{lx:s.x,ly:s.y-19,anchor:"middle"},right:{lx:s.x+18,ly:s.y+4,anchor:"start"},left:{lx:s.x-18,ly:s.y+4,anchor:"end"},br:{lx:s.x+9,ly:s.y+25,anchor:"start"},bl:{lx:s.x-9,ly:s.y+25,anchor:"end"},ar:{lx:s.x+9,ly:s.y-15,anchor:"start"},al:{lx:s.x-9,ly:s.y-15,anchor:"end"}} as const;
  const order=[...(s.steep?["left","right","above","below"]:i%2?["above","below","right","left"]:["below","above","left","right"]),"br","bl","ar","al"] as (keyof typeof spots)[];
  for(const max of [16,12,9,7])for(const k of order){const label=clip(names[i],max),spot=spots[k],b=boxFor(spot.lx,spot.ly,spot.anchor,label.length*cw);if(!blocked(b,i)){taken.push(b);return {x:s.x,y:s.y,...spot,label};}}
  // Nothing fits: the shortest name where it overlaps least.
  const label=clip(names[i],7);let best:{k:keyof typeof spots;cost:number}|null=null;
  for(const k of order.slice(0,4)){const spot=spots[k],b=boxFor(spot.lx,spot.ly,spot.anchor,label.length*cw),cost=taken.reduce((t,o)=>t+overlap(b,o),0)+(b.x0<0||b.x1>RISE.w||b.y0<0?1e6:0);if(!best||cost<best.cost)best={k,cost};}
  const spot=spots[best!.k];taken.push(boxFor(spot.lx,spot.ly,spot.anchor,label.length*cw));return {x:s.x,y:s.y,...spot,label};
 });
}

function SkyMap({shape,stars,n}:{shape:Shape;stars:Star[];n:number}){
 const {w,h}=shape==="band"?BAND:RISE,id=`muse-sky-${shape}`,dust=shape==="band"?60:26;
 return <svg className="muse-sky-map" data-shape={shape} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={n?stars.map(s=>`${s.ritual.name}: ${statusWord(s.status)}`).join("; "):"No daily rituals scheduled on this day"}>
  <defs><linearGradient id={`${id}-star`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--accent-secondary)"/><stop offset="1" stopColor="var(--accent-primary)"/></linearGradient><radialGradient id={`${id}-glow`}><stop offset="0" stopColor="var(--accent-primary)" stopOpacity=".55"/><stop offset="1" stopColor="var(--accent-primary)" stopOpacity="0"/></radialGradient></defs>
  {Array.from({length:dust},(_,i)=><circle key={`dust-${i}`} className="muse-sky-dust" cx={r1((i*97+i*i*7)%w)} cy={r1((i*53+17+i*i*3)%h)} r={i%5?.8:1.4} style={{"--d":`${(i%7)*.6}s`} as CSSProperties}/>)}
  {stars.slice(1).map((s,i)=>{const a=stars[i];return <line key={`l-${s.ritual.id}`} className="muse-sky-line" data-lit={lit(a.status)&&lit(s.status)||undefined} x1={r1(a.x)} y1={r1(a.y)} x2={r1(s.x)} y2={r1(s.y)}/>;})}
  {stars.map((s,i)=><g key={s.ritual.id} className="muse-sky-star" data-status={s.status} style={{"--i":i} as CSSProperties}>
   {s.status==="complete"&&<circle cx={r1(s.x)} cy={r1(s.y)} r="24" fill={`url(#${id}-glow)`}/>}
   <path d={starPath(s.x,s.y,s.status==="complete"?18:s.status==="partial"?15:13)} fill={s.status==="complete"?`url(#${id}-star)`:undefined}/>
   {s.status==="missed"&&<path className="muse-sky-miss" d={`M${r1(s.x-5)} ${r1(s.y-5)}L${r1(s.x+5)} ${r1(s.y+5)}M${r1(s.x+5)} ${r1(s.y-5)}L${r1(s.x-5)} ${r1(s.y+5)}`}/>}
   <text x={r1(s.lx)} y={r1(s.ly)} textAnchor={s.anchor}>{s.label??clip(s.ritual.name,16)}{s.label&&s.label!==s.ritual.name?<title>{s.ritual.name}</title>:null}</text>
  </g>)}
  {!n&&<text className="muse-sky-empty" x={shape==="band"?w/2:w-12} y={shape==="band"?h/2:h-40} textAnchor={shape==="band"?"middle":"end"}>No daily rituals on this day. The sky rests.</text>}
 </svg>;
}

export function RitualsSky({state,date,today}:{state:RitualState;date:string;today:string}){
 const active=state.rituals.filter(r=>r.status!=="archived");
 const daily=active.filter(r=>r.type!=="weekly-target"&&!flexible(r)&&ritualOpportunity(state,r,date));
 const n=daily.length,cells=daily.map(ritual=>({ritual,status:ritualCell(state,ritual,date,today).status}));
 const names=cells.map(c=>c.ritual.name),wide=placeAlong(names,BAND),rise=placeAlong(names,RISE),band=cells.map((c,i)=>({...c,...wide[i]})),risen=cells.map((c,i)=>({...c,...rise[i]}));
 const done=cells.filter(s=>s.status==="complete").length,isToday=date===today,future=!!today&&date>today;
 const headline=!n?"A quiet sky":future?"Still to come":done===n?"Every star is lit":done===0?"The sky is waiting":"Lighting up";
 return <section className="muse-rituals-sky" aria-label={`${isToday?"Today":fmt(date,{weekday:"long",month:"long",day:"numeric"})}: ${n?`${done} of ${n} daily rituals complete`:"no daily rituals scheduled"}`}>
  <div className="muse-sky-stage">
   <div className="muse-sky-title">
    <p className="muse-kicker">{isToday?"Today’s sky":fmt(date,{weekday:"long"})} · {fmt(date,{month:"long",day:"numeric"})}</p>
    <h2 className="muse-sky-headline">{n>0&&<span className="muse-sky-count"><b>{done}</b><small>/{n}</small></span>}<span>{headline}</span></h2>
   </div>
   <SkyMap shape="band" stars={band} n={n}/>
   <SkyMap shape="rise" stars={risen} n={n}/>
  </div>
 </section>;
}
