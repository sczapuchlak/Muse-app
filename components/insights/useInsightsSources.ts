'use client';
import {useAstrologyData} from '../astrology/AstrologyData';
import {useWhimsyData} from '../whimsy/WhimsyData';
import {whimsySources} from '@/lib/whimsy/persistence';
import {useMemo} from 'react';
import {usePlanner} from '../PlannerStore';
import {useRituals} from '../rituals/RitualStore';
import {useRitualView} from '../rituals/ConnectedRituals';
import {useMoney} from '../money/MoneyStore';
import {useWellness} from '../WellnessStore';
import {useDailyData} from '../daily/DailyData';
import {persistedInsights} from '@/lib/insights/persisted';
import type {InsightSourceStatus} from '@/lib/insights/sources';
import type {ProgressSources} from '@/lib/progress/engine';
/** Existing owner subscriptions handle local edits, focus/online and cross-window invalidation. */
export function useInsightsSources(_date:string,today:string){
 const whimsy=useWhimsyData(),astrology=useAstrologyData();
 const planner=usePlanner(),rituals=useRituals(),ritualView=useRitualView(),money=useMoney(),wellness=useWellness(),{snapshot,profile,store:dailyStore}=useDailyData();
 const input=useMemo(()=>({...persistedInsights({planner:planner.state,rituals:ritualView.state,wellness:wellness.state,money:money.state,days:snapshot.days,influences:snapshot.influences,timeZone:profile.timeZone,today}),astrology:{activity:astrology.records.activity,journal:astrology.records.journal.map(({id,date,reference})=>({id,date,reference})),status:{loaded:astrology.loaded,pending:astrology.busy,error:astrology.error}},whimsy:whimsy.records?{sources:whimsySources(whimsy.records),status:whimsy.status}:undefined}),[astrology.records,astrology.loaded,astrology.busy,astrology.error,whimsy.records,whimsy.status,planner.state,wellness.state,ritualView.state,money.state,today,snapshot.days,snapshot.influences,profile.timeZone]);
 const sources:{name:string;status:InsightSourceStatus;retry:()=>void}[]=[
  {name:'Planner',status:planner.status??{loaded:false,error:'Planner is unavailable.'},retry:()=>{planner.store?.retry();void planner.store?.load(true);}},
  {name:'Rituals',status:rituals.status,retry:()=>rituals.store.retry()},
  {name:'Wellness',status:wellness.status,retry:()=>wellness.store.retry()},
  {name:'Money',status:money.status,retry:()=>money.store.retry()},
  {name:'Feeling context',status:{loaded:!!snapshot.influencesLoaded,error:snapshot.rangeErrors.influences},retry:()=>{void dailyStore?.loadInfluences();}}
 ];
 // The shared progress engine reads the same owners for cross-module and Wellness-goal summaries.
 const progress=useMemo<ProgressSources>(()=>({timeZone:profile.timeZone,wellness:wellness.state,planner:planner.state,reading:whimsy.records?{sessions:whimsy.records.sessions,books:whimsy.records.books}:undefined}),[profile.timeZone,wellness.state,planner.state,whimsy.records]);
 return {input,sources,astrology,progress,goals:wellness.state.goals};
}
