"use client";
import {useEffect,useRef} from 'react';

/**
 * Calls `onCross` once when `achieved` turns true while `ready` (loaded and saved, nothing pending). The first ready
 * observation in a scope is only a baseline, so loaded history never celebrates; changing `scope` (a date, a ritual)
 * starts a new baseline. Pair with a celebrate() key so remounts and retries never replay.
 */
export function useCelebrateOnCrossing(achieved:boolean,ready:boolean,scope:string,onCross:()=>void){
 const seen=useRef<{scope:string;achieved:boolean}|null>(null);const callback=useRef(onCross);
 useEffect(()=>{callback.current=onCross;});
 useEffect(()=>{
  if(!ready)return;
  const previous=seen.current;seen.current={scope,achieved};
  if(previous&&previous.scope===scope&&!previous.achieved&&achieved)callback.current();
 },[achieved,ready,scope]);
}
