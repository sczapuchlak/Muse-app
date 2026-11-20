'use client';
import {useRef,type KeyboardEvent,type PointerEvent} from 'react';
import {MuseIcon} from '@/components/MuseIcon';
import './StarRating.css';

const text=(v:number)=>Number.isInteger(v)?`${v}`:`${Math.round(v*100)/100}`;
const fillOf=(value:number,star:number)=>value>=star?'full':value>=star-.5?'half':'none';

/**
 * The rating control. `step={0.5}` (Books) adds half stars without needing precise taps: tap a star for a whole
 * rating and tap it again for its half (4 → 3.5 → 4); with a mouse, the left half of a star sets the half directly.
 * Arrow keys move by half a star, Home/End jump to the ends, Delete clears. Unrated stays its own state (never 0).
 * `step={1}` (the default, e.g. Collections media) keeps whole stars, and tapping the chosen star clears it.
 */
export function StarRating({value,onChange,label='Rating',step=1}:{value:number|null;onChange:(value:number|null)=>void;label?:string;step?:1|0.5}){
 const group=useRef<HTMLDivElement>(null),aimed=useRef<number|null>(null),half=step===0.5;
 if(!half)return <fieldset className="muse-star-rating"><legend>{label} <small>optional</small></legend><div role="group" aria-label={label}>{[1,2,3,4,5].map(star=><button key={star} type="button" aria-label={`${star} ${star===1?'star':'stars'}`} aria-pressed={value===star} data-filled={value!==null&&star<=value} onClick={()=>onChange(value===star?null:star)}><MuseIcon name="favorite" size={23}/></button>)}</div><span className="small-label">{value?`${value} of 5 stars`:'No rating yet'}</span></fieldset>;
 const focusStar=(v:number)=>requestAnimationFrame(()=>group.current?.querySelector<HTMLButtonElement>(`[data-star="${Math.ceil(v)}"]`)?.focus());
 const tap=(star:number)=>onChange(value===star?star-.5:star);
 /** A mouse can aim at half a star; a finger never has to (it taps twice). The aim is applied by the click. */
 function pointer(event:PointerEvent<HTMLButtonElement>,star:number){
  if(event.pointerType!=='mouse'){aimed.current=null;return;}
  const box=event.currentTarget.getBoundingClientRect();aimed.current=event.clientX-box.left<box.width/2?star-.5:star;
 }
 function click(star:number){const aim=aimed.current;aimed.current=null;if(aim!==null)onChange(aim);else tap(star);}
 function key(event:KeyboardEvent<HTMLDivElement>){
  const current=value??0;let next:number|null|undefined;
  if(event.key==='ArrowRight'||event.key==='ArrowUp')next=Math.min(5,Math.max(.5,current+.5));
  else if(event.key==='ArrowLeft'||event.key==='ArrowDown')next=current<=.5?(value===null?null:.5):current-.5;
  else if(event.key==='Home')next=.5;else if(event.key==='End')next=5;
  else if(event.key==='Delete'||event.key==='Backspace')next=null;
  if(next===undefined)return;
  event.preventDefault();onChange(next);if(next!==null)focusStar(next);
 }
 const shown=value??0;
 return <fieldset className="muse-star-rating" data-step="half"><legend>{label} <small>optional</small></legend>
  <div className="muse-star-rating-row">
   <div ref={group} role="group" aria-label={`${label}, in half stars. Arrow keys change it by half a star.`} onKeyDown={key}>{[1,2,3,4,5].map(star=>{const fill=fillOf(shown,star);
    return <button key={star} type="button" data-star={star} data-fill={fill} aria-label={value===star?`${star} stars, chosen. Press again for ${text(star-.5)}`:value===star-.5?`${text(star-.5)} stars, chosen. Press again for ${star}`:`${star} ${star===1?'star':'stars'}`} aria-pressed={value!==null&&value>star-1&&value<=star}
     onPointerDown={event=>pointer(event,star)} onClick={()=>click(star)}>
     <span className="muse-star-rating-glyph" aria-hidden="true"><MuseIcon name="favorite" size={24}/><span className="muse-star-rating-fill"><MuseIcon name="favorite" size={24}/></span></span>
    </button>;})}</div>
   {value!==null&&<button type="button" className="text-button muse-star-rating-clear" onClick={()=>{onChange(null);focusStar(1);}}>Clear</button>}
  </div>
  <span className="small-label muse-star-rating-readout" aria-live="polite">{value!==null?<><strong className="type-numeric">{text(value)}</strong> of 5 stars</>:'No rating yet'}<span className="muse-star-rating-hint" data-for="touch"> · tap a star twice for a half star</span><span className="muse-star-rating-hint" data-for="mouse"> · click the left half of a star for a half star</span></span>
 </fieldset>;
}

/**
 * Display-only stars for a saved rating, in whole and half stars (a value between halves shows the half below it,
 * and the exact number stays in the label). Each surface keeps its own colours through --star-on / --star-off.
 */
export function RatingStars({value,className,showValue=false,emptyLabel}:{value:number|undefined|null;className?:string;showValue?:boolean;emptyLabel?:string}){
 if(!value){return emptyLabel?<span className={`muse-rating-stars ${className??''}`} data-empty aria-label={emptyLabel}>{[1,2,3,4,5].map(n=><i key={n} data-fill="none" aria-hidden="true"/>)}</span>:null;}
 return <span className={`muse-rating-stars ${className??''}`} role="img" aria-label={`${text(value)} out of 5 stars`}>{[1,2,3,4,5].map(n=><i key={n} data-fill={fillOf(value,n)} aria-hidden="true"/>)}{showValue&&<b className="type-numeric" aria-hidden="true">{text(value)}</b>}</span>;
}
