'use client';
import {createContext,useContext,useEffect,useMemo,type ReactNode} from 'react';
import {useRituals} from './RitualStore';
import {useWellness} from '../WellnessStore';
import {usePlanner} from '../PlannerStore';
import {useWhimsyData} from '../whimsy/WhimsyData';
import {useMuseToday} from '../useMuseToday';
import {withConnections,type DerivedValue} from '@/lib/ritual-connections';
import type {ProgressSources} from '@/lib/progress/engine';
import type {RitualState} from '@/lib/rituals';

type View={state:RitualState;derived:Map<string,DerivedValue>;sources:ProgressSources;today:string;issues:string[];waiting:boolean};
const Context=createContext<View|null>(null);
const readingMetrics=new Set(['reading-minutes','reading-pages','books-finished']);

/**
 * Computes the Ritual state every surface shows, once: stored entries plus values derived from connected trackers.
 * Source owners are read, never written; a source that has not loaded yet leaves its days unknown, not missed.
 */
export function ConnectedRitualsProvider({timeZone,children}:{timeZone:string;children:ReactNode}){
 const {state}=useRituals(),wellness=useWellness(),planner=usePlanner(),whimsy=useWhimsyData({autoload:false}),today=useMuseToday(timeZone);
 const connected=state.rituals.filter(r=>r.connection);
 const needsReading=connected.some(r=>readingMetrics.has(r.connection!.metric));
 const {load}=whimsy;
 useEffect(()=>{if(needsReading)void load();},[needsReading,load]);
 const wellnessState=wellness.status.loaded&&!wellness.status.error?wellness.state:undefined;
 const plannerState=planner.status?.loaded&&!planner.status.error?planner.state:undefined;
 const records=whimsy.status.loaded&&!whimsy.status.error?whimsy.records:null;
 const value=useMemo<View>(()=>{
  const sources:ProgressSources={timeZone,wellness:wellnessState,planner:plannerState,reading:records?{sessions:records.sessions,books:records.books}:undefined};
  if(!state.rituals.some(r=>r.connection)||!today)return {state,derived:new Map(),sources,today,issues:[],waiting:false};
  const result=withConnections(state,sources,today);
  return {state:result.state,derived:result.derived,sources,today,issues:result.issues,waiting:result.unavailable};
 },[state,wellnessState,plannerState,records,today,timeZone]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** Display state for Rituals, Daily Edit and Insights. Writes still go through useRituals().dispatch. */
export function useRitualView():View{
 const view=useContext(Context),{state}=useRituals();
 return view??{state,derived:new Map(),sources:{timeZone:'UTC'},today:'',issues:[],waiting:false};
}
