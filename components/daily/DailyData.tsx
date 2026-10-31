'use client';
import {useSearchParams,usePathname} from 'next/navigation';
import {validDate} from '@/lib/dates';
import {createContext,useContext,useEffect,useLayoutEffect,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {DailyStore,type DailyProfile,type DailySnapshot} from '@/lib/data/daily-store';
import {emptyDay,type DailyPatch} from '@/lib/data/daily';
import {useMuseDate} from '../MuseSession';
export const DailyDataContext=createContext<DailyStore|null>(null);
const empty:DailySnapshot={days:{},statuses:{},influences:[],ranges:{},rangeErrors:{}};
const noop=()=>()=>{};
const emptySnapshot=()=>empty;
export function DailyDataProvider({profile,children}:{profile:DailyProfile;children:ReactNode}){
 const [store]=useState(()=>new DailyStore(createMuseBrowserClient(),profile));
 useLayoutEffect(()=>store.setProfile(profile),[store,profile]);
 useEffect(()=>{
  void store.loadInfluences();
  let channel:BroadcastChannel|undefined;try{channel=new BroadcastChannel(`muse.daily.${profile.id}`);channel.onmessage=()=>store.refresh();}catch{}
  store.setOnChange(date=>{channel?.postMessage({date});try{localStorage.setItem('muse.daily.changed',`${profile.id}/${date}/${crypto.randomUUID()}`);localStorage.removeItem('muse.daily.changed');}catch{}});
  const refresh=()=>store.refresh(),storage=(event:StorageEvent)=>{if(event.key==='muse.daily.changed'&&event.newValue?.startsWith(profile.id+'/'))refresh();};
  const unload=(event:BeforeUnloadEvent)=>{if(store.hasPending()){event.preventDefault();event.returnValue='';}};
  window.addEventListener('focus',refresh);window.addEventListener('online',refresh);window.addEventListener('storage',storage);window.addEventListener('beforeunload',unload);
  return()=>{store.setOnChange(undefined);store.pause();channel?.close();window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);window.removeEventListener('storage',storage);window.removeEventListener('beforeunload',unload);};
 },[store,profile.id]);
 return <DailyDataContext.Provider value={store}>{children}</DailyDataContext.Provider>;
}
export function useDailyData(){const store=useContext(DailyDataContext);const snapshot=useSyncExternalStore(store?.subscribe??noop,store?.getSnapshot??emptySnapshot,store?.getSnapshot??emptySnapshot);return {store,snapshot,profile:store?.profile??{id:'',firstName:'',timeZone:'UTC'}};}
export function useDailyDay(date:string){const {store,snapshot,profile}=useDailyData();useEffect(()=>{void store?.load(date);},[date,store]);return {store,profile,day:snapshot.days[date]??emptyDay(),status:snapshot.statuses[date],patch:(patch:DailyPatch)=>store?.edit(date,{kind:'daily',patch})};}
export function useDailyRange(start:string,end:string){const {store,snapshot}=useDailyData(),key=`${start}/${end}`;useEffect(()=>{void store?.loadRange(start,end);},[store,start,end]);return {loaded:!!snapshot.ranges[key],error:snapshot.rangeErrors[key],retry:()=>store?.loadRange(start,end,true)};}
/** Shared daily capture boundary: no edit is accepted before its server revision loads. */
export function DailyCapture({date,children,group=false}:{date:string;children:ReactNode;group?:boolean}){const {status}=useDailyDay(date);if(group){const disabled=!status?.loaded||!!status.error;return <div className="muse-daily-capture" role="group" aria-disabled={disabled} inert={disabled} aria-busy={!status?.loaded}>{children}</div>;}return <fieldset className="muse-daily-capture" disabled={!status?.loaded||!!status.error} aria-busy={!status?.loaded}>{children}</fieldset>;}
export function DailySaveStatus({date}:{date?:string}){const [selected]=useMuseDate(''),target=date??selected,{store,status}=useDailyDay(target),{snapshot,profile}=useDailyData();const influenceError=snapshot.rangeErrors.influences,day=snapshot.days[target];
 return <div className="muse-daily-save-state" role="status" aria-live="polite"><span>{status?.error||(!status?.loaded?'Loading daily data…':status.saving||status.pending?'Saving daily changes…':status.refreshing?'Refreshing daily data…':'Daily data is up to date.')} · {profile.timeZone}</span>{status?.error&&<>{!status.conflict&&<button type="button" className="text-button" onClick={()=>store?.retry(target)}>Retry</button>}<button type="button" className="text-button" disabled={status.saving} onClick={()=>void store?.discard(target)}>{status.pending?'Discard unsaved changes and load latest':'Load latest'}</button>{status.pending&&day&&<details><summary>Review unsaved daily changes</summary><textarea readOnly rows={6} aria-label="Unsaved daily changes" value={['Intention: '+(day.record?.intention_text??''),'Intention emoji: '+(day.record?.intention_emoji??''),'Day in Three: '+(day.record?.day_in_three.join(' ')??''),'Energy: '+(day.record?.energy??'not set'),'Stress: '+(day.record?.stress??'not set'),'Overall Day: '+(day.record?.overall_day??'not set'),...day.priorities.map(item=>(item.standalone_complete?'Complete: ':'Priority: ')+item.text),...day.checkins.map(item=>item.period+' reflection: '+(item.reflection??''))].join('\n')}/></details>}</>}{influenceError&&<span>Influences could not load. <button type="button" className="text-button" onClick={()=>void store?.loadInfluences()}>Retry influences</button></span>}</div>;
}

/** Date URLs retain intentional historical selection across refresh; no travel-zone rewriting. */
export function DailyDateSync(){const query=useSearchParams(),queryDate=query?.get('date'),path=usePathname(),[date,setDate]=useMuseDate(''),setter=useRef(setDate);useEffect(()=>{setter.current=setDate;});const current=useRef(date);useEffect(()=>{current.current=date;});useEffect(()=>{if(['/','/mood','/insights'].includes(path??''))setter.current(validDate(queryDate)?queryDate:current.current);},[queryDate,path]);return null;}
