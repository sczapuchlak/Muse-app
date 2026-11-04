'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {MuseIcon} from '@/components/MuseIcon';
import './ActiveMediaCarousel.css';

/** A bounded viewport over canonical collection records; children remain mounted and unchanged. */
export function ActiveMediaCarousel({label,count,children}:{label:string;count:number;children:ReactNode}){
 const viewport=useRef<HTMLDivElement>(null),[position,setPosition]=useState({first:0,visible:Math.min(count,3)});
 useEffect(()=>{
  const element=viewport.current;if(!element)return;
  const update=()=>{const card=element.firstElementChild?.firstElementChild as HTMLElement|null;if(!card)return;const gap=Number.parseFloat(getComputedStyle(element.firstElementChild!).columnGap)||0,step=card.getBoundingClientRect().width+gap,visible=Math.max(1,Math.min(count,Math.round((element.clientWidth+gap)/step))),first=Math.max(0,Math.min(count-visible,Math.round(element.scrollLeft/step)));setPosition({first,visible});};
  const observer=new ResizeObserver(update);observer.observe(element);update();return()=>observer.disconnect();
 },[count]);
 const move=(direction:-1|1)=>{const element=viewport.current,card=element?.firstElementChild?.firstElementChild as HTMLElement|null;if(!element||!card)return;const gap=Number.parseFloat(getComputedStyle(element.firstElementChild!).columnGap)||0;const step=card.getBoundingClientRect().width+gap;const target=Math.max(0,Math.min(count-position.visible,position.first+direction));element.scrollTo({left:target*step,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
 return <div className="muse-active-carousel" data-count={Math.min(count,3)} aria-label={label}><div className="muse-active-carousel-viewport" ref={viewport} onScroll={()=>{const element=viewport.current,card=element?.firstElementChild?.firstElementChild as HTMLElement|null;if(!element||!card)return;const gap=Number.parseFloat(getComputedStyle(element.firstElementChild!).columnGap)||0,step=card.getBoundingClientRect().width+gap;setPosition(current=>({...current,first:Math.max(0,Math.min(count-current.visible,Math.round(element.scrollLeft/step)))}));}}><div className="muse-active-carousel-track">{children}</div></div>{count>position.visible&&<div className="muse-active-carousel-controls"><span className="small-label" role="status">{position.first+1}–{Math.min(count,position.first+position.visible)} of {count}</span><button type="button" className="muse-button button-ghost" aria-label={`Previous ${label.toLowerCase()} item`} title="Previous" disabled={position.first===0} onClick={()=>move(-1)}><MuseIcon name="chevron" size={17}/></button><button type="button" className="muse-button button-ghost" aria-label={`Next ${label.toLowerCase()} item`} title="Next" disabled={position.first+position.visible>=count} onClick={()=>move(1)}><MuseIcon name="chevron" size={17}/></button></div>}</div>;
}
