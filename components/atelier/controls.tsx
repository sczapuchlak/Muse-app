"use client";
import {useId,useRef,useState,type CSSProperties,type ReactNode,type PointerEvent as ReactPointerEvent,type KeyboardEvent} from 'react';
import {parseRgba,formatRgba,rgbaToHex,formatColorValue,formatStops,type ColorValue,type Rgba,type StopSpec,type Len} from '@/lib/atelier/css-values';
import {tokenInfo} from '@/lib/atelier/tokens';

const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));

/** A labelled range with a typed number beside it. `onChange(value,true)` marks the end of a drag. */
export function Slider({label,value,min,max,step=1,unit='',onChange,hint}:{label:string;value:number;min:number;max:number;step?:number;unit?:string;onChange:(value:number)=>void;hint?:string}){
 const id=useId();
 return <div className="muse-atelier-slider">
  <label htmlFor={id}>{label}</label>
  <input id={id} type="range" min={min} max={max} step={step} value={clamp(value,min,max)} onChange={event=>onChange(Number(event.target.value))} aria-describedby={hint?`${id}-hint`:undefined}/>
  <span className="muse-atelier-slider-value"><input type="number" aria-label={`${label} value`} min={min} max={max} step={step} value={Math.round(value*100)/100} onChange={event=>{const v=Number(event.target.value);if(Number.isFinite(v))onChange(clamp(v,min,max));}}/>{unit&&<small>{unit}</small>}</span>
  {hint&&<small id={`${id}-hint`} className="muse-atelier-hint">{hint}</small>}
 </div>;
}

/** Native colour picker + hex + opacity: always a concrete colour. */
export function RgbaPicker({label,value,onChange,compact=false}:{label:string;value:Rgba;onChange:(value:Rgba)=>void;compact?:boolean}){
 const id=useId();const [draft,setDraft]=useState<string|null>(null);
 return <div className="muse-atelier-rgba" data-compact={compact||undefined}>
  <span className="muse-atelier-swatch" style={{background:formatRgba(value)}}><input id={id} type="color" aria-label={`${label} colour`} value={rgbaToHex(value)} onChange={event=>{const c=parseRgba(event.target.value);if(c)onChange({...c,a:value.a});}}/></span>
  <input className="muse-atelier-hex" type="text" aria-label={`${label} hex`} value={draft??rgbaToHex(value)} maxLength={9} spellCheck={false}
   onChange={event=>{setDraft(event.target.value);const c=parseRgba(event.target.value.trim());if(c&&/^#([\da-f]{6}|[\da-f]{8})$/i.test(event.target.value.trim()))onChange(c.a===1?{...c,a:value.a}:c);}} onBlur={()=>setDraft(null)}/>
  <label className="muse-atelier-alpha"><span className="sr-only">{label} opacity</span><input type="range" min={0} max={100} value={Math.round(value.a*100)} onChange={event=>onChange({...value,a:Number(event.target.value)/100})} style={{'--alpha-color':rgbaToHex(value)} as CSSProperties}/><small>{Math.round(value.a*100)}%</small></label>
 </div>;
}

/**
 * Edits one colour token. Linked tokens (e.g. Primary accent → Aqua) show their link and can be re-linked or
 * given their own colour; concrete colours get the picker. `resolve` turns a token into its current colour.
 */
export function TokenColorField({name,value,baseValue,resolve,onChange,onReset,linkOptions,highlight}:{name:string;value:string;baseValue:string;resolve:(name:string)=>string;onChange:(value:string)=>void;onReset:()=>void;linkOptions?:string[];highlight?:boolean}){
 const info=tokenInfo[name];const alias=value.match(/^var\((--[\w-]+)\)$/);const rgba=parseRgba(alias?resolve(alias[1]):value);const changed=value!==baseValue;
 return <div className="muse-atelier-field" data-changed={changed||undefined} data-highlight={highlight||undefined} id={`token-${name.slice(2)}`}>
  <div className="muse-atelier-field-head"><span className="muse-atelier-field-label">{info?.label??name}</span>{changed&&<button type="button" className="muse-atelier-link" onClick={onReset}>Reset</button>}</div>
  {alias?<div className="muse-atelier-linked">
   <span className="muse-atelier-swatch" style={{background:rgba?formatRgba(rgba):`var(${alias[1]})`}} aria-hidden="true"/>
   {linkOptions?<label><span className="sr-only">{info?.label} follows</span><select value={alias[1]} onChange={event=>onChange(`var(${event.target.value})`)}>{[...new Set([alias[1],...linkOptions])].map(option=><option key={option} value={option}>{tokenInfo[option]?.label??option}</option>)}</select></label>:<span>Follows {tokenInfo[alias[1]]?.label??alias[1]}</span>}
   <button type="button" className="muse-atelier-link" onClick={()=>rgba&&onChange(formatRgba(rgba))}>Own colour</button>
  </div>:rgba?<RgbaPicker label={info?.label??name} value={rgba} onChange={next=>onChange(formatRgba(next))}/>:<code className="muse-atelier-code">{value}</code>}
  {info?.hint&&<small className="muse-atelier-hint">{info.hint}</small>}
 </div>;
}

/** Colour of a layer stop: linked to a theme token (thinned by a percentage) or its own colour. */
export function StopColorEditor({value,resolve,onChange,tokenOptions}:{value:ColorValue;resolve:(name:string)=>string;onChange:(value:ColorValue)=>void;tokenOptions:string[]}){
 const current=value.k==='token'?parseRgba(resolve(value.t)):value.k==='rgba'?value:null;
 return <div className="muse-atelier-stop-color">
  <div className="muse-segmented" role="group" aria-label="Stop colour source">
   <button type="button" aria-pressed={value.k==='token'} onClick={()=>value.k!=='token'&&onChange({k:'token',t:tokenOptions[0],m:value.k==='rgba'?Math.round(value.a*100):40})}>Theme colour</button>
   <button type="button" aria-pressed={value.k==='rgba'} onClick={()=>value.k!=='rgba'&&onChange(current?{k:'rgba',...current,a:value.k==='token'?(current.a*value.m/100):current.a}:{k:'rgba',r:255,g:255,b:255,a:.3})}>Own colour</button>
   <button type="button" aria-pressed={value.k==='none'} onClick={()=>onChange({k:'none'})}>Clear</button>
  </div>
  {value.k==='token'&&<><label className="muse-atelier-select"><span>Theme colour</span><select value={value.t} onChange={event=>onChange({...value,t:event.target.value})}>{[...new Set([value.t,...tokenOptions])].map(option=><option key={option} value={option}>{tokenInfo[option]?.label??option}</option>)}</select></label>
   <Slider label="Strength" value={value.m} min={0} max={100} unit="%" onChange={m=>onChange({...value,m})}/></>}
  {value.k==='rgba'&&<RgbaPicker label="Stop" value={value} onChange={next=>onChange({k:'rgba',...next})}/>}
 </div>;
}

/** A gradient bar with draggable, keyboard-movable stop handles. */
export function StopBar({stops,selected,onSelect,onMove,resolve}:{stops:StopSpec[];selected:number;onSelect:(index:number)=>void;onMove:(index:number,position:number)=>void;resolve:(name:string)=>string}){
 const bar=useRef<HTMLDivElement>(null);
 const preview=stops.map(stop=>({...stop,c:stop.c.k==='token'?((): ColorValue=>{const rgba=parseRgba(resolve(stop.c.t));return rgba?{k:'rgba',...rgba,a:rgba.a*stop.c.m/100}:stop.c;})():stop.c}));
 const at=(index:number)=>stops[index].p[0]??(index/(Math.max(1,stops.length-1)))*100;
 function drag(index:number,event:ReactPointerEvent){
  event.preventDefault();onSelect(index);const rect=bar.current!.getBoundingClientRect();(event.target as Element).setPointerCapture(event.pointerId);
  const move=(e:PointerEvent)=>onMove(index,clamp(Math.round((e.clientX-rect.left)/rect.width*1000)/10,0,100));
  const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
 }
 const key=(index:number,event:KeyboardEvent)=>{const step=event.shiftKey?10:1;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();onMove(index,clamp(at(index)+(event.key==='ArrowRight'?step:-step),0,100));}};
 return <div className="muse-atelier-stopbar" ref={bar} style={{'--stops':`linear-gradient(90deg,${formatStops(preview.map((stop,i)=>({...stop,p:[at(i)]})))})`} as CSSProperties}>
  {stops.map((stop,i)=><button key={i} type="button" className="muse-atelier-stop" aria-pressed={selected===i} aria-label={`Stop ${i+1} at ${Math.round(at(i))}%. Arrow keys move it.`} style={{left:`${at(i)}%`,'--stop':formatColorValue(preview[i].c)} as CSSProperties} onPointerDown={event=>drag(i,event)} onKeyDown={event=>key(i,event)} onClick={()=>onSelect(i)}/>)}
 </div>;
}

/** A miniature of the page: drag any layer's dot to move it. Arrow keys nudge the selected one. */
export type PadPoint={id:string;x:Len;y:Len;color:string;label:string};
export function PositionPad({points,selected,onSelect,onMove,background}:{points:PadPoint[];selected:string|null;onSelect:(id:string)=>void;onMove:(id:string,x:number,y:number)=>void;background?:ReactNode}){
 const pad=useRef<HTMLDivElement>(null);
 const span=(len:Len,axis:'x'|'y')=>len.u==='px'?(axis==='x'?1280:900):len.u==='svh'?(axis==='y'?150:100):100;
 const toPct=(len:Len,axis:'x'|'y')=>clamp(len.v/span(len,axis)*100,-5,105);
 function drag(point:PadPoint,event:ReactPointerEvent){
  event.preventDefault();onSelect(point.id);const rect=pad.current!.getBoundingClientRect();
  const move=(e:PointerEvent)=>{const px=clamp((e.clientX-rect.left)/rect.width,0,1),py=clamp((e.clientY-rect.top)/rect.height,0,1);onMove(point.id,Math.round(px*span(point.x,'x')*10)/10,Math.round(py*span(point.y,'y')*10)/10);};
  const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
 }
 const key=(point:PadPoint,event:KeyboardEvent)=>{const step=event.shiftKey?5:1;const dx=event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0,dy=event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0;if(!dx&&!dy)return;event.preventDefault();onMove(point.id,Math.round((point.x.v+dx*span(point.x,'x')/100)*10)/10,Math.round((point.y.v+dy*span(point.y,'y')/100)*10)/10);};
 return <div className="muse-atelier-pad" ref={pad} role="group" aria-label="Layer positions. Drag a dot, or focus it and use the arrow keys.">
  {background}
  {points.map(point=><button key={point.id} type="button" className="muse-atelier-pad-dot" aria-pressed={selected===point.id} aria-label={`${point.label}: ${Math.round(point.x.v)}${point.x.u} across, ${Math.round(point.y.v)}${point.y.u} down`} style={{left:`${toPct(point.x,'x')}%`,top:`${toPct(point.y,'y')}%`,'--dot':point.color} as CSSProperties} onPointerDown={event=>drag(point,event)} onKeyDown={event=>key(point,event)}/>)}
 </div>;
}

export function FieldGroup({title,children,action,description}:{title:string;children:ReactNode;action?:ReactNode;description?:ReactNode}){
 return <section className="muse-atelier-group"><header><h3>{title}</h3>{action}</header>{description&&<p className="muse-atelier-hint">{description}</p>}{children}</section>;
}
