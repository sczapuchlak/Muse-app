"use client";
import {useEffect,useState} from 'react';
import {observeAchievement} from '@/lib/achievement';
import {allowsMagic} from '@/lib/magic-preference';
import {MuseStar} from './MuseStar';
import './MuseMilestone.css';
/** Observe a local completion crossing, never celebrate loaded history or repeat after undo. */
export function MuseMilestone({achieved,kind='glint',ready=true}:{achieved:boolean;kind?:'shooting'|'glint';ready?:boolean}){
 const [observation,setObservation]=useState({observed:ready,awarded:achieved,achieved,ready,celebrating:false});
 if(observation.achieved!==achieved||observation.ready!==ready){const next=observeAchievement(observation,achieved,ready);setObservation({...next,achieved,ready,celebrating:next.celebrate&&allowsMagic()});}
 useEffect(()=>{if(!observation.celebrating)return;const timer=setTimeout(()=>setObservation(current=>({...current,celebrating:false})),850);return()=>clearTimeout(timer);},[observation.celebrating]);
 return observation.celebrating&&achieved?<span className={`muse-milestone muse-milestone-${kind}`} aria-hidden="true"><span className="muse-milestone-trail"/><span className="muse-milestone-flight"><MuseStar size={kind==='shooting'?30:21}/></span></span>:null;
}
