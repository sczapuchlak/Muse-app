"use client";
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {AtelierDefinition} from '@/lib/atelier/model';
import type {ContrastCheck} from '@/lib/atelier/contrast';
import type {HandleLayer,HandlePatch} from './GlowHandles';
export type FrameHandles={layers:HandleLayer[];selected:string|null}|null;

export type Viewport='desktop'|'mobile';
const sizes={desktop:{width:1280,height:860},mobile:{width:390,height:844}};

/**
 * One live Muse inside an iframe, scaled to fit. The stage keeps its true width so desktop and mobile layouts use
 * Muse's real breakpoints; changes arrive by postMessage, so nothing reloads while you edit.
 */
export function PreviewFrame({definition,material,viewport,label,onContrast,handles=null,focus,onPatch,onSelect,onViewport}:{focus?:string;definition:AtelierDefinition;material:'crystal'|'frosted';viewport:Viewport;label:string;onContrast?:(checks:ContrastCheck[])=>void;handles?:FrameHandles;onPatch?:(patch:HandlePatch)=>void;onSelect?:(plane:string,id:string)=>void;onViewport?:(centerY:number)=>void}){
 const frame=useRef<HTMLIFrameElement>(null),box=useRef<HTMLDivElement>(null);
 const [ready,setReady]=useState(false);const [fit,setFit]=useState({scale:.5,height:600});
 const latest=useRef({definition,material,handles});
 const contrast=useRef(onContrast);
 const callbacks=useRef({onPatch,onSelect,onViewport});
 useLayoutEffect(()=>{latest.current={definition,material,handles};contrast.current=onContrast;callbacks.current={onPatch,onSelect,onViewport};});
 useEffect(()=>{
  const receive=(event:MessageEvent)=>{if(event.origin!==window.location.origin||event.source!==frame.current?.contentWindow)return;
   if(event.data?.type==='muse-atelier-ready'){setReady(true);frame.current?.contentWindow?.postMessage({type:'muse-atelier-state',...latest.current},window.location.origin);}
   if(event.data?.type==='muse-atelier-contrast'&&Array.isArray(event.data.checks))contrast.current?.(event.data.checks);
   if(event.data?.type==='muse-atelier-layer-patch'&&typeof event.data.id==='string')callbacks.current.onPatch?.({plane:event.data.plane,id:event.data.id,patch:event.data.patch??{}});
   if(event.data?.type==='muse-atelier-select'&&typeof event.data.id==='string')callbacks.current.onSelect?.(event.data.plane,event.data.id);
   if(event.data?.type==='muse-atelier-viewport'&&typeof event.data.centerY==='number')callbacks.current.onViewport?.(event.data.centerY);};
  window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
 },[]);
 useEffect(()=>{if(!ready)return;const id=requestAnimationFrame(()=>frame.current?.contentWindow?.postMessage({type:'muse-atelier-state',definition,material,handles},window.location.origin));return()=>cancelAnimationFrame(id);},[ready,definition,material,handles]);
 useEffect(()=>{if(ready&&focus)frame.current?.contentWindow?.postMessage({type:'muse-atelier-focus',target:focus},window.location.origin);},[ready,focus]);
 const size=sizes[viewport];
 useLayoutEffect(()=>{const element=box.current;if(!element)return;const measure=()=>{const {width,height}=element.getBoundingClientRect();setFit({scale:Math.min(1,width/size.width,viewport==='mobile'?height/size.height:Infinity),height});};measure();const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect();},[size.width,size.height,viewport]);
 return <div className="muse-atelier-frame-box" ref={box} data-viewport={viewport}>
  <div className="muse-atelier-frame-scaler" style={{width:size.width*fit.scale,height:viewport==='mobile'?size.height*fit.scale:fit.height}}>
   <iframe ref={frame} title={label} src="/atelier-preview" style={{width:size.width,height:viewport==='mobile'?size.height:fit.height/fit.scale,transform:`scale(${fit.scale})`}} data-ready={ready||undefined}/>
  </div>
  {!ready&&<p className="muse-atelier-frame-loading" role="status">Setting the stage…</p>}
 </div>;
}
