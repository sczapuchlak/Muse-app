"use client";
import { useEffect,useId,useState,type CSSProperties } from "react";
import { observeAchievement } from "@/lib/achievement";
import { MUSE_STAR_PATH } from "./MuseStar";
import { CosmicSprinkles } from "./CosmicSprinkles";
import "./AchievementStar.css";

/** One canonical Muse geometry, a cross-theme gold semantic identity. */
export function AchievementStar({size=26}:{size?:number}) {
  const id=useId();
  return <svg className="muse-achievement-star" width={size*.6} height={size} viewBox="0 0 24 40" aria-hidden="true" focusable="false"><defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--achievement-champagne)"/><stop offset=".32" stopColor="var(--achievement-gold)"/><stop offset=".64" stopColor="var(--achievement-champagne)"/><stop offset="1" stopColor="var(--achievement-amber)"/></linearGradient></defs><path d={MUSE_STAR_PATH} fill={`url(#${id})`} stroke="var(--achievement-amber)" strokeWidth=".55"/></svg>;
}
/** Existing milestones celebrate once per scope; opt-in threshold goals may celebrate reentry. */
export function AchievementBadge({achieved,label,size=26,ready=true,replayOnReentry=false,delay=0}:{achieved:boolean;label:string;size?:number;ready?:boolean;replayOnReentry?:boolean;delay?:number}) {
  const [observation,setObservation]=useState({observed:ready,awarded:achieved,achieved,ready,celebrating:false});
  // Adjust this component's transition state during render; no delayed effect can replay stale props.
  if(observation.achieved!==achieved||observation.ready!==ready){
    const next=observeAchievement(observation,achieved,ready,replayOnReentry);
    setObservation({...next,achieved,ready,celebrating:next.celebrate});
  }
  const celebrating=observation.celebrating;
  useEffect(()=>{
    if(!celebrating)return;
    const timer=setTimeout(()=>setObservation((current)=>({...current,celebrating:false})),650+delay);
    return ()=>clearTimeout(timer);
  },[celebrating,delay]);
  if(!achieved)return null;
  return <span className="muse-achievement" role="img" aria-label={label} data-celebrating={celebrating} style={{'--achievement-delay':`${delay}ms`} as CSSProperties}><AchievementStar size={size}/>{celebrating&&<span className="muse-achievement-glint" aria-hidden="true"/>}{celebrating&&<CosmicSprinkles celebration/>}</span>;
}
