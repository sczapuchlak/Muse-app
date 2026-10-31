'use client';
import {SaveIndicator} from './SaveIndicator';
import {createContext,useContext,useEffect,useState,useSyncExternalStore,type ReactNode} from 'react';
import {WellnessStore} from '@/lib/data/wellness-store';
import {readWellness,writeWellness} from '@/lib/data/wellness';
import {createMuseBrowserClient} from '@/lib/supabase/client';
export const WellnessContext=createContext<WellnessStore|null>(null);
export function WellnessProvider({userId,children}:{userId:string;children:ReactNode}){
 const [store]=useState(()=>{const client=createMuseBrowserClient();return new WellnessStore({read:()=>readWellness(client),write:(v,id,state)=>writeWellness(client,v,id,state)});});
 useEffect(()=>{void store.load();let channel:BroadcastChannel|undefined;try{channel=new BroadcastChannel(`muse.wellness.${userId}`);channel.onmessage=()=>void store.load(true);}catch{}
 store.setOnChange(()=>{channel?.postMessage('changed');try{localStorage.setItem('muse.wellness.changed',`${userId}/${crypto.randomUUID()}`);localStorage.removeItem('muse.wellness.changed');}catch{}});
 const refresh=()=>void store.load(true),storage=(event:StorageEvent)=>{if(event.key==='muse.wellness.changed'&&event.newValue?.startsWith(userId+'/'))refresh();},unload=(event:BeforeUnloadEvent)=>{if(store.hasPending()){event.preventDefault();event.returnValue='';}};
 window.addEventListener('focus',refresh);window.addEventListener('online',refresh);window.addEventListener('storage',storage);window.addEventListener('beforeunload',unload);
 return()=>{store.setOnChange(undefined);store.flush();channel?.close();window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);window.removeEventListener('storage',storage);window.removeEventListener('beforeunload',unload);};},[store,userId]);
 return <WellnessContext.Provider value={store}>{children}</WellnessContext.Provider>;
}
export function useWellness(){const store=useContext(WellnessContext);if(!store)throw Error('Authenticated Wellness requires its provider');const status=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);return {store,status,state:status.state,dispatch:store.dispatch};}
export function WellnessCapture({children}:{children:ReactNode}){const {status}=useWellness(),disabled=!status.loaded||!!status.error;return <div role="group" aria-label="Wellness data" aria-disabled={disabled} inert={disabled} aria-busy={!status.loaded} style={{display:'contents'}}>{children}</div>;}
export function WellnessSaveStatus(){const {store,status}=useWellness();return <div className="muse-daily-save-state" role="status" aria-live="polite"><SaveIndicator label="Wellness" loaded={status.loaded} pending={status.pending} saving={status.saving} error={status.error}/>{status.error&&<>{!status.conflict&&<button type="button" className="text-button" onClick={()=>store.retry()}>Retry wellness</button>}<button type="button" className="text-button" disabled={status.saving} onClick={()=>void store.discard()}>{status.pending?'Discard unsaved wellness changes and load latest':'Load latest wellness'}</button>{status.pending&&<details><summary>Review unsaved wellness changes</summary><textarea readOnly rows={6} aria-label="Unsaved wellness changes" value={store.draftText()}/></details>}</>}</div>;}
