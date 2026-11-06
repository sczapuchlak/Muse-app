"use client";
import {useEffect,useRef} from 'react';
import {celebrate} from '@/lib/celebrate';
import {pickLine,type CopyContext} from '@/lib/celebration-copy';

/** Presentation tiers over the existing streak count (no new calculation). Breaking a streak is never marked. */
export const streakTiers=[3,7,14,30,100,365] as const;
const shape:Record<number,{kind:'starburst'|'constellation';stars?:number;tier?:'small'|'medium'|'large';sound:'complete'|'celebrate'}>={
 3:{kind:'starburst',sound:'complete'},7:{kind:'constellation',stars:7,tier:'small',sound:'celebrate'},14:{kind:'constellation',stars:7,tier:'medium',sound:'celebrate'},
 30:{kind:'constellation',stars:12,tier:'medium',sound:'celebrate'},100:{kind:'constellation',stars:12,tier:'large',sound:'celebrate'},365:{kind:'constellation',stars:12,tier:'large',sound:'celebrate'},
};
export const tierFor=(count:number)=>[...streakTiers].reverse().find(t=>count>=t)??0;

/**
 * Celebrates a ritual's streak when a saved completion carries it into a new tier. The first settled reading is the
 * baseline, so opening Rituals never replays old milestones; each tier celebrates once per ritual and day.
 */
export function StreakMoments({ritualId,name,count,unit,ready,today}:{ritualId:string;name:string;count:number;unit:string;ready:boolean;today:string}){
 const baseline=useRef<{scope:string;tier:number}|null>(null);
 useEffect(()=>{
  if(!ready)return;const scope=`${ritualId}/${today}`,tier=tierFor(count),previous=baseline.current;baseline.current={scope,tier};
  if(!previous||previous.scope!==scope||tier<=previous.tier)return;
  const s=shape[tier];
  celebrate({kind:s.kind,stars:s.stars,tier:s.tier,message:pickLine(`streak${tier}` as CopyContext),detail:`${name} · ${count} ${unit} in rhythm`,sound:s.sound,key:`streak:${ritualId}:${tier}:${today}`});
 },[ready,count,ritualId,today,name,unit]);
 return null;
}
