"use client";
/**
 * Direct manipulation inside the preview: every editable glow gets a centre handle (drag to move), a dashed outline of
 * its reach, and edge handles (drag to resize). Shown only while editing; the page itself is never covered otherwise.
 * Positions convert to each layer's own units, so a glow stays where you put it at every page length.
 */
import {useEffect,useLayoutEffect,useState,type CSSProperties,type PointerEvent as ReactPointerEvent,type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import type {Len} from '@/lib/atelier/css-values';

export type HandleLayer={plane:string;id:string;name:string;type:'radial'|'linear'|'conic';shape:'ellipse'|'circle';x:Len;y:Len;w:Len;h:Len;color:string;builtIn?:boolean};
export type HandlePatch={plane:string;id:string;patch:{x?:Len;y?:Len;w?:Len;h?:Len}};
type Box={left:number;top:number;width:number;height:number};

export function GlowHandles({layers,selected,onPatch,onSelect}:{layers:HandleLayer[];selected:string|null;onPatch:(patch:HandlePatch)=>void;onSelect:(plane:string,id:string)=>void}){
 const [box,setBox]=useState<Box|null>(null);
 useLayoutEffect(()=>{
  const atmosphere=document.querySelector<HTMLElement>('.muse-atmosphere');if(!atmosphere)return;
  const measure=()=>{const rect=atmosphere.getBoundingClientRect();setBox({left:rect.left+window.scrollX,top:rect.top+window.scrollY,width:rect.width,height:rect.height});};
  measure();const observer=new ResizeObserver(measure);observer.observe(atmosphere);observer.observe(document.body);window.addEventListener('resize',measure);
  return()=>{observer.disconnect();window.removeEventListener('resize',measure);};
 },[]);
 const [viewH,setViewH]=useState(900);useEffect(()=>{const read=()=>setViewH(window.innerHeight);read();window.addEventListener('resize',read);return()=>window.removeEventListener('resize',read);},[]);
 if(!box)return null;
 const span=(len:Len,axis:'x'|'y')=>len.u==='px'?1:len.u==='svh'?viewH/100:(axis==='x'?box.width:box.height)/100;
 const px=(len:Len,axis:'x'|'y')=>len.v*span(len,axis);
 const back=(value:number,len:Len,axis:'x'|'y'):Len=>({v:Math.round(value/span(len,axis)*10)/10,u:len.u});
 function drag(layer:HandleLayer,mode:'move'|'w'|'h'|'r',event:ReactPointerEvent){
  event.preventDefault();event.stopPropagation();onSelect(layer.plane,layer.id);
  const startX=event.pageX,startY=event.pageY,x0=px(layer.x,'x'),y0=px(layer.y,'y'),w0=px(layer.w,'x'),h0=px(layer.h,'y');
  let frame=0,last:HandlePatch['patch']={};
  const move=(e:PointerEvent)=>{const dx=e.pageX-startX,dy=e.pageY-startY;
   last=mode==='move'?{x:back(x0+dx,layer.x,'x'),y:back(y0+dy,layer.y,'y')}:mode==='w'?{w:back(Math.max(8,w0+dx),layer.w,'x')}:mode==='h'?{h:back(Math.max(8,h0+dy),layer.h,'y')}:{w:back(Math.max(8,w0+dx),layer.w,'x')};
   if(!frame)frame=requestAnimationFrame(()=>{frame=0;onPatch({plane:layer.plane,id:layer.id,patch:last});});};
  const up=()=>{cancelAnimationFrame(frame);if(Object.keys(last).length)onPatch({plane:layer.plane,id:layer.id,patch:last});window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);
 }
 const nudge=(layer:HandleLayer,event:KeyboardEvent)=>{const step=event.shiftKey?40:8;const dx=event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0,dy=event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0;if(!dx&&!dy)return;event.preventDefault();onPatch({plane:layer.plane,id:layer.id,patch:{x:back(px(layer.x,'x')+dx,layer.x,'x'),y:back(px(layer.y,'y')+dy,layer.y,'y')}});};
 return createPortal(<div className="muse-glow-handles" style={{left:box.left,top:box.top,width:box.width,height:box.height}}>
  {layers.map(layer=>{const cx=px(layer.x,'x'),cy=px(layer.y,'y'),rx=px(layer.w,'x'),ry=layer.shape==='circle'?rx:px(layer.h,'y');const active=selected===layer.id;
   return <div key={`${layer.plane}:${layer.id}`} className="muse-glow-handle" data-active={active||undefined} data-built-in={layer.builtIn||undefined} style={{left:cx,top:cy,'--glow':layer.color} as CSSProperties}>
    {layer.type==='radial'&&(active||!layer.builtIn)&&<span className="muse-glow-reach" style={{width:rx*2,height:ry*2}} aria-hidden="true"/>}
    <button type="button" className="muse-glow-centre" aria-label={`${layer.name}. Drag to move, or use the arrow keys.`} aria-pressed={active} onPointerDown={event=>drag(layer,'move',event)} onKeyDown={event=>nudge(layer,event)} onClick={()=>onSelect(layer.plane,layer.id)}><span aria-hidden="true"/></button>
    {active&&layer.type==='radial'&&(layer.shape==='circle'?<button type="button" className="muse-glow-size" style={{left:rx,top:0}} aria-label={`Resize ${layer.name}`} onPointerDown={event=>drag(layer,'r',event)}/>
     :<><button type="button" className="muse-glow-size" style={{left:rx,top:0}} aria-label={`Change the width of ${layer.name}`} onPointerDown={event=>drag(layer,'w',event)}/><button type="button" className="muse-glow-size" style={{left:0,top:ry}} aria-label={`Change the height of ${layer.name}`} onPointerDown={event=>drag(layer,'h',event)}/></>)}
    {active&&<span className="muse-glow-label" aria-hidden="true">{layer.name}</span>}
   </div>;})}
 </div>,document.body);
}
