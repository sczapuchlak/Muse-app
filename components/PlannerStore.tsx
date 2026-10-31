'use client';
import {SaveIndicator} from './SaveIndicator';
import {createContext,useContext,useEffect,useLayoutEffect,useReducer,useState,useSyncExternalStore,type Dispatch,type ReactNode} from 'react';
import {plannerReducer,type PlannerAction,type PlannerState} from '@/lib/planner';
import {plannerSample} from '@/lib/planner-sample';
import {PlannerStore,type PlannerView} from '@/lib/data/planner-store';
import type {DailyProfile} from '@/lib/data/daily-store';
import {useDailyData} from './daily/DailyData';
import {createMuseBrowserClient} from '@/lib/supabase/client';
const noop=()=>{};
type PlannerContextValue={state:PlannerState;dispatch:Dispatch<PlannerAction>;canEdit:boolean;status?:PlannerView;timeZone?:string;store?:PlannerStore;holdDraft:(id:string,value:boolean)=>void};
const PlannerContext=createContext<PlannerContextValue|null>(null);
/** Explicit fixtures retain the pure reducer for isolated previews/tests, never for authenticated routes. */
function PrototypePlanner({children,initialState}:{children:ReactNode;initialState:PlannerState}){const [state,dispatch]=useReducer(plannerReducer,initialState);return <PlannerContext.Provider value={{state,dispatch,canEdit:true,holdDraft:noop}}>{children}</PlannerContext.Provider>;}
function PersistentPlanner({children,profile}:{children:ReactNode;profile:DailyProfile}){
 const {store:dailyStore}=useDailyData();
 const [store]=useState(()=>PlannerStore.forClient(createMuseBrowserClient(),profile.timeZone));
 const status=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);
 useLayoutEffect(()=>store.setTimeZone(profile.timeZone),[store,profile.timeZone]);
 useEffect(()=>{
  const unsubscribe=dailyStore?.subscribeChanges(kind=>{if(kind==='priorities')void store.load(true);});let dailyChannel:BroadcastChannel|undefined;try{dailyChannel=new BroadcastChannel(`muse.daily.${profile.id}`);dailyChannel.onmessage=()=>void store.load(true);}catch{}
  void store.load();let channel:BroadcastChannel|undefined;try{channel=new BroadcastChannel(`muse.planner.${profile.id}`);channel.onmessage=()=>{void store.load(true);dailyStore?.refresh();};}catch{}
  store.setOnChange(()=>{dailyStore?.refresh();channel?.postMessage('changed');try{localStorage.setItem('muse.planner.changed',`${profile.id}/${crypto.randomUUID()}`);localStorage.removeItem('muse.planner.changed');}catch{}});
  const refresh=()=>{void store.load(true);dailyStore?.refresh();},storage=(event:StorageEvent)=>{if(['muse.planner.changed','muse.daily.changed'].includes(event.key??'')&&event.newValue?.startsWith(profile.id+'/'))refresh();},unload=(event:BeforeUnloadEvent)=>{if(store.hasPending()){event.preventDefault();event.returnValue='';}};
  window.addEventListener('focus',refresh);window.addEventListener('online',refresh);window.addEventListener('storage',storage);window.addEventListener('beforeunload',unload);
  return()=>{unsubscribe?.();dailyChannel?.close();store.setOnChange(undefined);store.flush();channel?.close();window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);window.removeEventListener('storage',storage);window.removeEventListener('beforeunload',unload);};
 },[store,profile.id,dailyStore]);
 return <PlannerContext.Provider value={{state:status.state,dispatch:store.dispatch,canEdit:status.loaded&&!status.error,status,timeZone:profile.timeZone,store,holdDraft:store.hold}}>{children}</PlannerContext.Provider>;
}
export function PlannerProvider({children,initialState=plannerSample,profile}:{children:ReactNode;initialState?:PlannerState;profile?:DailyProfile}){return profile?<PersistentPlanner profile={profile}>{children}</PersistentPlanner>:<PrototypePlanner initialState={initialState}>{children}</PrototypePlanner>;}
export function usePlanner(){const context=useContext(PlannerContext);if(!context)throw Error('Planner surfaces require PlannerProvider');return context;}
export function PlannerPersistenceStatus({activityOnly=false}:{activityOnly?:boolean;compact?:boolean}={}){const {status,store}=usePlanner();if(!status||activityOnly&&status.loaded&&!status.pending&&!status.error&&!status.drafting)return null;return <div className="muse-daily-save-state" role="status" aria-live="polite"><SaveIndicator label="Planner" loaded={status.loaded} pending={status.pending} saving={status.saving} error={status.error} drafting={status.drafting} refreshing={status.refreshing}/>{(status.error||status.drafting)&&<>{status.error&&!status.conflict&&<button className="text-button" type="button" onClick={()=>store?.retry()}>Retry Planner</button>}<button className="text-button" type="button" disabled={status.saving} onClick={()=>void store?.discard()}>{status.pending||status.drafting?'Discard unsaved Planner changes and load latest':'Load latest Planner'}</button>{(status.pending||status.drafting)&&<details><summary>Review unsaved Planner changes</summary><textarea readOnly rows={6} aria-label="Unsaved Planner changes" value={store?.draftText()??''}/></details>}</>}</div>;}
export function PlannerCapture({children}:{children:ReactNode}){const {canEdit,status}=usePlanner();return <fieldset className="muse-daily-capture" disabled={!canEdit} aria-busy={status&&!status.loaded}>{children}</fieldset>;}

/** Unsubmitted text survives drawers/routes and blocks refresh from replacing its editing revision. */
export function usePlannerDraft(key:string,fallback:string){const {store,status}=usePlanner(),[local,setLocal]=useState<string|null>(null);const dirty=store?status?.drafts[key]!==undefined:local!==null;const value=store?status?.drafts[key]??fallback:local??fallback;return {value,dirty,set:(value:string)=>{if(store)store.setEditorDraft(key,value);else setLocal(value);},clear:()=>{if(store)store.setEditorDraft(key,null);else setLocal(null);}};}
