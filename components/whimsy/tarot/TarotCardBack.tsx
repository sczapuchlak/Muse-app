'use client';
import {useId,useSyncExternalStore} from 'react';
import './TarotCardBack.css';

/**
 * The face-down card. One ornate celestial design (double frame, sunburst, moon phases, the Muse star) drawn in a
 * choice of finishes. It is Muse's own artwork, separate from the 1909 card faces, so it can be restyled freely.
 * The choice is a device preference (localStorage), like the Observatory's density.
 */
export const cardBackStyles=[
 {id:'midnight',name:'Midnight Gold',note:'Violet dusk, gilded lines'},
 {id:'starry',name:'Starry Sky',note:'A deep night full of stars'},
 {id:'hologram',name:'Hologram',note:'Iridescent foil that catches the light'},
 {id:'rose',name:'Rose Quartz',note:'Blush, plum and rose gold'},
 {id:'emerald',name:'Emerald Night',note:'Deep green with champagne'},
 {id:'theme',name:'Match my theme',note:'Follows your Muse theme'},
] as const;
export type CardBackStyle=typeof cardBackStyles[number]['id'];
type Palette={bg:[string,string,string];glow:string;line:[string,string,string];foil:[string,string,string];core:string;lattice:string};
const palettes:Record<CardBackStyle,Palette>={
 midnight:{bg:['#150b2e','#3a2360','#0f2742'],glow:'#b98cff',line:['#fff0c2','#e9c46a','#b98a2f'],foil:['#9be7ff','#d9b8ff','#ff9fd0'],core:'#150b2e',lattice:'#cdb6ff'},
 starry:{bg:['#050a1f','#0d1b4a','#041a2e'],glow:'#5aa8ff',line:['#ffffff','#cfe3ff','#8fb4ff'],foil:['#8fe9ff','#b9c8ff','#f3c9ff'],core:'#050a1f',lattice:'#8fb4ff'},
 hologram:{bg:['#eaf6ff','#f3e6ff','#ffe9f4'],glow:'#ffffff',line:['#7b5cff','#ff5fb7','#19b8d6'],foil:['#19b8d6','#8a5cff','#ff5fb7'],core:'#ffffff',lattice:'#8a5cff'},
 rose:{bg:['#3a1030','#8a3b63','#431436'],glow:'#ffb3cf',line:['#fff1e6','#f6c1a6','#d98a7a'],foil:['#ffd1dc','#ffc2a8','#ff8fb8'],core:'#3a1030',lattice:'#ffc2d6'},
 emerald:{bg:['#03201c','#0c5143','#06262e'],glow:'#5df2c3',line:['#fff6d6','#e8d28a','#b59a45'],foil:['#9dffd9','#c9f59a','#7fe3ff'],core:'#03201c',lattice:'#9dffd9'},
 theme:{bg:['color-mix(in srgb,var(--accent-secondary) 45%,#0b0714)','color-mix(in srgb,var(--accent-primary) 50%,#120a22)','color-mix(in srgb,var(--accent-pop,var(--accent-secondary)) 40%,#08111c)'],glow:'var(--accent-primary)',line:['#ffffff','var(--icon-gradient-start,var(--accent-primary))','var(--icon-gradient-end,var(--accent-secondary))'],foil:['var(--chart-1)','var(--chart-3)','var(--chart-5)'],core:'#0b0714',lattice:'#ffffff'},
};
const W=220,H=375,cx=110,cy=187.5,f=(n:number)=>Number(n.toFixed(2));
function star(x:number,y:number,r:number,k=.24){return Array.from({length:8},(_,i)=>{const a=Math.PI/4*i-Math.PI/2,rr=i%2?r*k:r;return `${f(x+rr*Math.cos(a))},${f(y+rr*Math.sin(a))}`;}).join(' ');}
function star4(rv:number,rh:number,k:number,rot=0){return Array.from({length:8},(_,i)=>{const a=Math.PI/4*i-Math.PI/2+rot,rr=i%2?k:i%4?rh:rv;return `${f(cx+rr*Math.cos(a))},${f(cy+rr*Math.sin(a))}`;}).join(' ');}
const rays=Array.from({length:32},(_,i)=>{const a=2*Math.PI*i/32,r2=i%2?63:74;return `M${f(cx+50*Math.cos(a))} ${f(cy+50*Math.sin(a))}L${f(cx+r2*Math.cos(a))} ${f(cy+r2*Math.sin(a))}`;}).join('');
const ringDots=Array.from({length:12},(_,i)=>{const a=2*Math.PI*i/12-Math.PI/2;return {x:f(cx+80*Math.cos(a)),y:f(cy+80*Math.sin(a)),r:i%3?1.3:2.2};});
const accents:[number,number,number][]=[[40,96,3.2],[180,96,3.2],[40,H-96,3.2],[180,H-96,3.2],[110,88,2.6],[110,H-88,2.6],[28,187.5,2.8],[192,187.5,2.8],[62,130,1.8],[158,130,1.8],[62,H-130,1.8],[158,H-130,1.8]];
// A deterministic field of stars (same sky every render) for the Starry Sky and Hologram finishes.
const sky=Array.from({length:95},(_,i)=>{const r=(n:number)=>{const v=Math.sin((i+1)*n)*43758.5453;return v-Math.floor(v);};return {x:f(16+r(12.9898)*(W-32)),y:f(16+r(78.233)*(H-32)),r:f(.35+r(37.719)*1.05),o:f(.35+r(94.673)*.65)};});
const corners:[number,number][]=[[1,1],[-1,1],[1,-1],[-1,-1]];
function Phases({y,line}:{y:number;line:string}){
 return <>{[-36,-18,0,18,36].map((dx,j)=>{const x=cx+dx,r=j===2?6.5:j===1||j===3?5:3.8;if(j===2)return <circle key={j} cx={x} cy={y} r={r} fill={line}/>;const sweep=j<2?1:0,inner=f(r*(j===1||j===3?.35:.95));return <g key={j}><circle cx={x} cy={y} r={r} fill="none" stroke={line} strokeWidth=".8"/><path d={`M${x} ${y-r}A${r} ${r} 0 0 ${sweep} ${x} ${y+r}A${inner} ${r} 0 0 ${1-sweep} ${x} ${y-r}Z`} fill={line}/></g>;})}</>;
}

const key='muse-tarot-card-back',event='muse-tarot-card-back-change';
const valid=(value:string|null):value is CardBackStyle=>cardBackStyles.some(style=>style.id===value);
function snapshot():CardBackStyle{try{const value=window.localStorage.getItem(key);return valid(value)?value:'midnight';}catch{return 'midnight';}}
function subscribe(callback:()=>void){window.addEventListener('storage',callback);window.addEventListener(event,callback);return()=>{window.removeEventListener('storage',callback);window.removeEventListener(event,callback);};}
export function useCardBackStyle(){return useSyncExternalStore(subscribe,snapshot,():CardBackStyle=>'midnight');}
export function setCardBackStyle(style:CardBackStyle){try{window.localStorage.setItem(key,style);}catch{/* private mode: the choice lasts for this page */}window.dispatchEvent(new Event(event));}

/** Decorative by default; pass `label` where the card back is the only content of a control. */
export function TarotCardBack({style,label,className=''}:{style?:CardBackStyle;label?:string;className?:string}){
 const chosen=useCardBackStyle(),finish=style??chosen,p=palettes[finish],id=useId().replace(/[^a-zA-Z0-9]/g,''),u=(name:string)=>`url(#${name}${id})`,line=u('ln'),foil=u('fl');
 const starry=finish==='starry'||finish==='hologram';
 return <svg className={`muse-cardback ${className}`.trim()} data-finish={finish} viewBox={`0 0 ${W} ${H}`} role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true} focusable="false" preserveAspectRatio="xMidYMid slice">
  <defs>
   <linearGradient id={`bg${id}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={p.bg[0]}/><stop offset=".5" stopColor={p.bg[1]}/><stop offset="1" stopColor={p.bg[2]}/></linearGradient>
   <radialGradient id={`gw${id}`}><stop stopColor={p.glow} stopOpacity=".55"/><stop offset=".55" stopColor={p.glow} stopOpacity=".16"/><stop offset="1" stopColor={p.glow} stopOpacity="0"/></radialGradient>
   <linearGradient id={`ln${id}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={p.line[0]}/><stop offset=".45" stopColor={p.line[1]}/><stop offset="1" stopColor={p.line[2]}/></linearGradient>
   <linearGradient id={`fl${id}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={p.foil[0]}/><stop offset=".5" stopColor={p.foil[1]}/><stop offset="1" stopColor={p.foil[2]}/></linearGradient>
   <linearGradient id={`hg${id}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#7ef0ff"/><stop offset=".2" stopColor="#b79bff"/><stop offset=".4" stopColor="#ff9fd6"/><stop offset=".6" stopColor="#ffe98a"/><stop offset=".8" stopColor="#8dffc7"/><stop offset="1" stopColor="#7ecbff"/></linearGradient>
   <linearGradient id={`sh${id}`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#fff" stopOpacity="0"/><stop offset=".5" stopColor="#fff" stopOpacity=".7"/><stop offset="1" stopColor="#fff" stopOpacity="0"/></linearGradient>
   <radialGradient id={`mw${id}`}><stop stopColor={p.foil[1]} stopOpacity=".5"/><stop offset="1" stopColor={p.foil[1]} stopOpacity="0"/></radialGradient>
   <pattern id={`lt${id}`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0h14M0 0v14" stroke={p.lattice} strokeOpacity=".13" strokeWidth=".7" fill="none"/><circle cx="7" cy="7" r=".7" fill={p.line[1]} fillOpacity=".35"/></pattern>
   <clipPath id={`cp${id}`}><rect width={W} height={H} rx="12"/></clipPath>
  </defs>
  <g clipPath={u('cp')}>
   <rect width={W} height={H} fill={u('bg')}/>
   {finish==='hologram'&&<rect className="muse-cardback-foil" width={W} height={H} fill={u('hg')} opacity=".62"/>}
   {starry?<><ellipse cx={cx} cy={cy} rx="170" ry="46" fill={u('mw')} transform={`rotate(-58 ${cx} ${cy})`}/>{sky.map((s,i)=><circle key={i} cx={s.x} cy={s.y} r={s.r} fill={finish==='hologram'?p.line[i%3]:'#fff'} fillOpacity={s.o}/>)}</>:<rect x="13" y="13" width={W-26} height={H-26} rx="7" fill={u('lt')}/>}
   <ellipse cx={cx} cy={cy} rx="105" ry="150" fill={u('gw')}/>
   <rect x="6.5" y="6.5" width={W-13} height={H-13} rx="9" fill="none" stroke={line} strokeWidth="1.4"/>
   <rect x="12.5" y="12.5" width={W-25} height={H-25} rx="6" fill="none" stroke={line} strokeOpacity=".55" strokeWidth=".7"/>
   {corners.map(([sx,sy])=>{const x0=sx===1?13:W-13,y0=sy===1?13:H-13,sw=sx*sy===1?1:0;return <g key={`${sx}${sy}`}><path d={`M${x0+sx*30} ${y0}A30 30 0 0 ${sw} ${x0} ${y0+sy*30}`} fill="none" stroke={line} strokeWidth=".9"/><path d={`M${x0+sx*20} ${y0}A20 20 0 0 ${sw} ${x0} ${y0+sy*20}`} fill="none" stroke={line} strokeOpacity=".6" strokeWidth=".6"/><polygon points={star(x0+sx*11,y0+sy*11,5.5)} fill={line}/></g>;})}
   <path d={rays} stroke={line} strokeWidth=".8" strokeOpacity=".8" strokeLinecap="round"/>
   <circle cx={cx} cy={cy} r="80" fill="none" stroke={line} strokeWidth=".8"/>
   <circle cx={cx} cy={cy} r="84" fill="none" stroke={line} strokeOpacity=".5" strokeWidth=".5" strokeDasharray="1.5 4"/>
   <circle cx={cx} cy={cy} r="47" fill={p.core} fillOpacity=".55" stroke={foil} strokeWidth="1"/>
   <circle cx={cx} cy={cy} r="42" fill="none" stroke={foil} strokeOpacity=".5" strokeWidth=".5"/>
   {ringDots.map((d,i)=><circle key={i} cx={d.x} cy={d.y} r={d.r} fill={line}/>)}
   <polygon points={star4(24,24,4.5,Math.PI/4)} fill={foil} fillOpacity=".6"/>
   <polygon points={star4(38,30,5.5)} fill={line}/>
   <circle cx={cx} cy={cy} r="4.2" fill={finish==='hologram'?'#fff':p.line[0]}/>
   <Phases y={58} line={line}/><Phases y={H-58} line={line}/>
   {accents.map(([x,y,r],i)=><polygon key={i} points={star(x,y,r,.3)} fill={p.line[0]} fillOpacity=".9"/>)}
   {[30,H-30].map(y=><g key={y}><path d={`M${cx-22} ${y}H${cx-7}M${cx+7} ${y}H${cx+22}`} stroke={line} strokeWidth=".8" strokeLinecap="round"/><path d={`M${cx} ${y-4.5}L${cx+4.5} ${y}L${cx} ${y+4.5}L${cx-4.5} ${y}Z`} fill={line}/></g>)}
   <rect className="muse-cardback-sheen" x={-W} y={-40} width={W*.7} height={H+80} fill={u('sh')} transform="skewX(-18)"/>
  </g>
 </svg>;
}

/** The finish picker: a row of real miniature card backs. */
export function CardBackPicker(){
 const chosen=useCardBackStyle();
 return <fieldset className="muse-cardback-picker"><legend>Card back</legend><div role="radiogroup" aria-label="Card back">{cardBackStyles.map(style=><button key={style.id} type="button" role="radio" aria-checked={chosen===style.id} title={style.note} onClick={()=>setCardBackStyle(style.id)}><TarotCardBack style={style.id}/><span>{style.name}</span></button>)}</div><p className="small-label">Saved on this device.</p></fieldset>;
}
