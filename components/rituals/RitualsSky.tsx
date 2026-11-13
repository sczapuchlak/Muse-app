import type {CSSProperties} from "react";
import {flexible,ritualCell,ritualDayProgress,ritualOpportunity,ritualStreak,weekSummary,weeklyDays,weeklyValue,type RitualDefinition,type RitualState} from "@/lib/rituals";
import {EmojiGlyph} from "../EmojiPicker";
import "./RitualsSky.css";

/**
 * Rituals glow-up (Nov 2026): the selected day as a constellation. Each daily ritual scheduled that day is a star on
 * one gentle arc; a complete ritual burns bright, partial progress glows halfway, open and unknown days stay as faint
 * outlines (never failure), and an explicit miss is a dim cross. Lines light up between neighbouring completed stars.
 * Weekly targets and flexible rhythms are not daily obligations, so they sit beside the sky as their own meters.
 */
type Star={ritual:RitualDefinition;status:ReturnType<typeof ritualCell>["status"];value:number|null;x:number;y:number};
const W=640,H=200,fmt=(d:string,o:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat("en-US",{...o,timeZone:"UTC"}).format(new Date(`${d}T12:00:00Z`));
const r1=(n:number)=>Math.round(n*10)/10;
const starPath=(x:number,y:number,r:number)=>`M${r1(x)} ${r1(y-r)}C${r1(x+r*.16)} ${r1(y-r*.16)} ${r1(x+r*.16)} ${r1(y-r*.16)} ${r1(x+r)} ${r1(y)}C${r1(x+r*.16)} ${r1(y+r*.16)} ${r1(x+r*.16)} ${r1(y+r*.16)} ${r1(x)} ${r1(y+r)}C${r1(x-r*.16)} ${r1(y+r*.16)} ${r1(x-r*.16)} ${r1(y+r*.16)} ${r1(x-r)} ${r1(y)}C${r1(x-r*.16)} ${r1(y-r*.16)} ${r1(x-r*.16)} ${r1(y-r*.16)} ${r1(x)} ${r1(y-r)}Z`;
const lit=(s:Star["status"])=>s==="complete";

export function RitualsSky({state,date,today,week}:{state:RitualState;date:string;today:string;week:string[]}){
 const active=state.rituals.filter(r=>r.status!=="archived");
 const daily=active.filter(r=>r.type!=="weekly-target"&&!flexible(r)&&ritualOpportunity(state,r,date));
 const n=daily.length,stars:Star[]=daily.map((ritual,i)=>{const cell=ritualCell(state,ritual,date,today),t=n<2?.5:i/(n-1);return {ritual,status:cell.status,value:cell.value,x:60+t*(W-120),y:H*.56-Math.sin(t*Math.PI)*H*.22+(i%2?14:-6)};});
const done=stars.filter(s=>s.status==="complete").length,isToday=date===today,future=!!today&&date>today;
 const weekly=active.filter(r=>(r.type==="weekly-target"||flexible(r))&&week.some(d=>ritualOpportunity(state,r,d)));
 const summary=weekSummary(state,week,today),perfect=week.map(d=>({d,p:!!today&&d<=today&&ritualDayProgress(state,d,today).perfect}));
 const best=active.map(r=>({r,s:ritualStreak(state,r,today)})).filter(x=>x.s.count>0).sort((a,b)=>b.s.count-a.s.count)[0];
 const headline=!n?"A quiet sky":future?"Still to come":done===n?"Every star is lit":done===0?"The sky is waiting":"Lighting up";
 return <section className="muse-rituals-sky" aria-label={`${isToday?"Today":fmt(date,{weekday:"long",month:"long",day:"numeric"})}: ${n?`${done} of ${n} daily rituals complete`:"no daily rituals scheduled"}`}>
  <div className="muse-sky-main">
   <p className="muse-kicker">{isToday?"Today’s sky":fmt(date,{weekday:"long"})} · {fmt(date,{month:"long",day:"numeric"})}</p>
   <h2 className="muse-sky-headline">{n>0&&<span className="muse-sky-count"><b>{done}</b><small>/{n}</small></span>}<span>{headline}</span></h2>
   <svg className="muse-sky-map" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={n?stars.map(s=>`${s.ritual.name}: ${s.status==="complete"?"complete":s.status==="partial"?"partly done":s.status==="missed"?"missed":s.status==="upcoming"?"upcoming":"not logged yet"}`).join("; "):"No daily rituals scheduled on this day"}>
    <defs><linearGradient id="muse-sky-star" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--accent-secondary)"/><stop offset="1" stopColor="var(--accent-primary)"/></linearGradient><radialGradient id="muse-sky-glow"><stop offset="0" stopColor="var(--accent-primary)" stopOpacity=".55"/><stop offset="1" stopColor="var(--accent-primary)" stopOpacity="0"/></radialGradient></defs>
    {Array.from({length:26},(_,i)=><circle key={`dust-${i}`} className="muse-sky-dust" cx={r1((i*97)%W)} cy={r1((i*53+17)%H)} r={i%3?.8:1.3} style={{"--d":`${(i%7)*.6}s`} as CSSProperties}/>)}
    {stars.slice(1).map((s,i)=>{const a=stars[i];return <line key={`l-${s.ritual.id}`} className="muse-sky-line" data-lit={lit(a.status)&&lit(s.status)||undefined} x1={r1(a.x)} y1={r1(a.y)} x2={r1(s.x)} y2={r1(s.y)}/>;})}
    {stars.map((s,i)=><g key={s.ritual.id} className="muse-sky-star" data-status={s.status} style={{"--i":i} as CSSProperties}>
     {s.status==="complete"&&<circle cx={r1(s.x)} cy={r1(s.y)} r="30" fill="url(#muse-sky-glow)"/>}
     <path d={starPath(s.x,s.y,s.status==="complete"?18:s.status==="partial"?15:13)}/>
     {s.status==="missed"&&<path className="muse-sky-miss" d={`M${r1(s.x-5)} ${r1(s.y-5)}L${r1(s.x+5)} ${r1(s.y+5)}M${r1(s.x+5)} ${r1(s.y-5)}L${r1(s.x-5)} ${r1(s.y+5)}`}/>}
     <text x={r1(s.x)} y={r1(i%2?s.y-26:s.y+36)} textAnchor="middle">{s.ritual.name.length>16?`${s.ritual.name.slice(0,15)}…`:s.ritual.name}</text>
    </g>)}
    {!n&&<text className="muse-sky-empty" x={W/2} y={H/2} textAnchor="middle">No daily rituals on this day. The sky rests.</text>}
   </svg>
  </div>
  <aside className="muse-sky-side">
   <div className="muse-sky-tile"><span className="muse-sky-label">Perfect days this week</span><span className="muse-sky-perfect" role="img" aria-label={`${perfect.filter(p=>p.p).length} perfect days so far`}>{perfect.map(({d,p})=><i key={d} data-on={p||undefined} data-future={!!today&&d>today||undefined} title={fmt(d,{weekday:"short",month:"short",day:"numeric"})}/>)}</span><small>{perfect.filter(p=>p.p).length} of {week.filter(d=>!!today&&d<=today).length} days so far · every daily ritual done</small></div>
   <div className="muse-sky-tile muse-sky-streak">{best?<><span className="muse-sky-label">Longest rhythm</span><span className="muse-sky-flame" aria-hidden="true"/><strong><b>{best.s.count}</b> {best.s.unit}</strong><small>{best.r.emoji&&<EmojiGlyph value={best.r.emoji}/>} {best.r.name}</small></>:<><span className="muse-sky-label">Longest rhythm</span><strong>Just beginning</strong><small>Complete a ritual on its scheduled days to start one.</small></>}</div>
   <dl className="muse-sky-week"><div><dt>Complete</dt><dd>{summary.completed}</dd></div><div><dt>Partial</dt><dd>{summary.partial}</dd></div><div><dt>Not logged</dt><dd>{summary.unknown}</dd></div></dl>
   {weekly.length>0&&<ul className="muse-sky-targets" aria-label="Weekly rhythms">{weekly.slice(0,3).map(r=>{const flex=flexible(r),value=flex?weeklyDays(state,r,date):weeklyValue(state,r,date),target=flex?r.timesPerWeek!:r.goal;return <li key={r.id}><span>{r.name}</span><small>{value}/{target}{flex?" days":` ${r.unit}`}</small><i style={{"--f":Math.min(1,value/target)} as CSSProperties}/></li>;})}</ul>}
  </aside>
 </section>;
}
