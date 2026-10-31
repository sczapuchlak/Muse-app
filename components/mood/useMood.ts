"use client";
import {useSyncExternalStore} from 'react';
import { useMuseState } from '../MuseSession';
import { emptyCheckIn,initialMoodState,updateMood,defaultMoodPeriod,type MoodPatch,type MoodPeriod } from '@/lib/mood';
import {mockProfile} from '@/lib/mock-profile';
const defaults=new Map<string,MoodPeriod>();
const subscribe=()=>()=>{};
/** Freeze a date's initial session once; never reclassify it during a later render. */
function captureDefault(date:string):MoodPeriod {let value=defaults.get(date);if(!value){value=defaultMoodPeriod(new Date(),mockProfile.timeZone);defaults.set(date,value);}return value;}
export function useMood(date:string) {
 const [state,setState]=useMuseState('emotional-observatory',initialMoodState,true);
 const [sessions,setSessions]=useMuseState<Record<string,MoodPeriod>>('mood-sessions',{},true);
 const initial=useSyncExternalStore(subscribe,()=>captureDefault(date),()=>null);
 const existing=state.records.filter(item=>item.date===date).sort((a,b)=>(b.updatedAt??'').localeCompare(a.updatedAt??''))[0];
 const period=sessions[date]??existing?.period??initial??'evening';
 function setPeriod(period:MoodPeriod,forDate=date){setSessions(current=>({...current,[forDate]:period}));}
 const record=state.records.find((item)=>item.date===date&&item.period===period)??emptyCheckIn(date,period);
 function update(patch:MoodPatch){setPeriod(period);setState((current)=>updateMood(current,date,period,patch,new Date().toISOString(),mockProfile.timeZone));}
 return {state,setState,record,period,setPeriod,update};
}
