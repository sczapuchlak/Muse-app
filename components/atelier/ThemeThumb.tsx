"use client";
import {useLayoutEffect,useMemo,useRef,type CSSProperties} from 'react';
import {thumbCss} from '@/lib/atelier/thumb';
import type {AtelierDefinition} from '@/lib/atelier/model';

/** A miniature Muse page drawn entirely with the theme's own tokens: atmosphere, rail icons, glass, type, accents. */
export function ThemeThumb({definition,scope}:{definition:AtelierDefinition;scope:string}){
 const css=useMemo(()=>thumbCss(definition,scope),[definition,scope]);const ref=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{const element=ref.current;if(!element)return;const fit=()=>element.style.setProperty('--thumb-scale',String(element.clientWidth/640));fit();const observer=new ResizeObserver(fit);observer.observe(element);return()=>observer.disconnect();},[]);
 return <div ref={ref} className="muse-atelier-thumb" data-thumb={scope} aria-hidden="true" style={{'--thumb-scale':.42} as CSSProperties}>
  <style>{css}</style>
  <div className="muse-atelier-thumb-page">
   <div className="muse-atelier-thumb-sky"/>
   <div className="muse-atelier-thumb-rail">{[0,1,2,3,4].map(i=><i key={i} data-active={i===1||undefined}/>)}</div>
   <div className="muse-atelier-thumb-main">
    <p className="muse-atelier-thumb-kicker">Daily Edit</p>
    <p className="muse-atelier-thumb-title">A soft, starry morning</p>
    <div className="muse-atelier-thumb-cards">
     <div className="muse-atelier-thumb-card"><b/><span/><span/><em/></div>
     <div className="muse-atelier-thumb-card"><b/><span/><i className="muse-atelier-thumb-progress"/><span/></div>
    </div>
   </div>
  </div>
 </div>;
}
