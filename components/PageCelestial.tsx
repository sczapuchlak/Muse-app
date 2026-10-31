"use client";
import { useLayoutEffect,useRef,type CSSProperties } from "react";
import { MuseStar } from "./MuseStar";

import "./PageCelestial.css";

export type CelestialSignature="daily"|"path"|"orbit"|"garden"|"aurora"|"trajectories"|"thought";
const compositions={
  daily:[[28,19],[46,68],[68,22],[82,58],[58,43],[93,16]],
  path:[[22,70],[43,48],[59,24],[72,55],[88,18],[96,77]],
  orbit:[[32,22],[44,62],[57,33],[72,69],[82,29],[94,52]],
  garden:[[25,66],[45,29],[60,73],[73,21],[84,59],[96,34]],
  aurora:[[27,37],[43,71],[57,19],[72,54],[85,26],[95,79]],
  trajectories:[[21,77],[40,29],[58,63],[73,23],[85,69],[94,41]],
  thought:[[35,70],[54,26],[68,65],[79,16],[91,47],[96,81]],
} satisfies Record<CelestialSignature,number[][]>;
/** Abstract layers inhabit the whole header; no recognizable diagram or central object. */
export function PageCelestial({motif="orbit"}:{motif?:CelestialSignature}) {
  const artRef=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const art=artRef.current,header=art?.closest('header'),controls=header?.querySelector<HTMLElement>('.muse-temporal-zone,.muse-module-context');
    if(!art||!header)return;if(!controls){art.style.removeProperty('--hero-safe-end');return;}
    function reserve(){if(!art||!header||!controls)return;const bounds=header.getBoundingClientRect(),control=controls.getBoundingClientRect();art.style.setProperty('--hero-safe-end',`${Math.max(0,bounds.right-control.left+24)}px`);}
    reserve();const resize=new ResizeObserver(reserve);resize.observe(header);resize.observe(controls);return()=>resize.disconnect();
  });
  const points=compositions[motif];
  return <div ref={artRef} className="muse-page-celestial" data-motif={motif} aria-hidden="true"><div className="muse-cosmos-particles">{points.map(([x,y],index)=><span key={index} className={index===1||index===4?'muse-cosmos-crisp':'muse-cosmos-dust'} style={{left:`${x}%`,top:`${y}%`,'--particle-delay':`${index*3}s`} as CSSProperties}>{(index===1||index===4)&&<MuseStar size={index===1?19:11} color={index===1?'aqua':'pink'}/>}</span>)}</div></div>;
}
