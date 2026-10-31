'use client';
import {useMemo} from 'react';
import {usePlanner} from '../PlannerStore';
import {useRituals} from '../rituals/RitualStore';
import {useMoney} from '../money/MoneyStore';
import {useWellness} from '../WellnessStore';
import {useDailyData} from '../daily/DailyData';
import {persistedInsights} from '@/lib/insights/persisted';
import type {InsightSourceStatus} from '@/lib/insights/sources';
/** Existing owner subscriptions handle local edits, focus/online and cross-window invalidation. */
export function useInsightsSources(_date:string,today:string){
 const planner=usePlanner(),rituals=useRituals(),money=useMoney(),wellness=useWellness(),{snapshot,profile,store:dailyStore}=useDailyData();
 const input=useMemo(()=>persistedInsights({planner:planner.state,rituals:rituals.state,wellness:wellness.state,money:money.state,days:snapshot.days,influences:snapshot.influences,timeZone:profile.timeZone,today}),[planner.state,wellness.state,rituals.state,money.state,today,snapshot.days,snapshot.influences,profile.timeZone]);
 const sources:{name:string;status:InsightSourceStatus;retry:()=>void}[]=[
  {name:'Planner',status:planner.status??{loaded:false,error:'Planner is unavailable.'},retry:()=>{planner.store?.retry();void planner.store?.load(true);}},
  {name:'Rituals',status:rituals.status,retry:()=>rituals.store.retry()},
  {name:'Wellness',status:wellness.status,retry:()=>wellness.store.retry()},
  {name:'Money',status:money.status,retry:()=>money.store.retry()},
  {name:'Feeling context',status:{loaded:!!snapshot.influencesLoaded,error:snapshot.rangeErrors.influences},retry:()=>{void dailyStore?.loadInfluences();}}
 ];
 return {input,sources};
}
