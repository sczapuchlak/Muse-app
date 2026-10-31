'use client';
import {createContext,useContext,useEffect,useState,useSyncExternalStore,type ReactNode} from 'react';
import {RitualsStore} from '@/lib/data/rituals-store';
import {readRituals,writeRituals} from '@/lib/data/rituals';
import {createMuseBrowserClient} from '@/lib/supabase/client';
export const RitualContext=createContext<RitualsStore|null>(null);
export function RitualProvider({userId,children}:{userId:string;children:ReactNode}){
 const [store]=useState(()=>{const client=createMuseBrowserClient();return new RitualsStore({read:()=>readRituals(client),write:(v,id,state,action)=>writeRituals(client,v,id,state,action)});});
 useEffect(()=>{void store.load();let channel:BroadcastChannel|undefined;try{channel=new BroadcastChannel(`muse.rituals.${userId}`);channel.onmessage=()=>void store.load(true);}catch{}
 store.setOnChange(()=>{channel?.postMessage('changed');try{localStorage.setItem('muse.rituals.changed',`${userId}/${crypto.randomUUID()}`);localStorage.removeItem('muse.rituals.changed');}catch{}});
 const refresh=()=>void store.load(true),storage=(event:StorageEvent)=>{if(event.key==='muse.rituals.changed'&&event.newValue?.startsWith(userId+'/'))refresh();},unload=(event:BeforeUnloadEvent)=>{if(store.hasPending()){event.preventDefault();event.returnValue='';}};
 window.addEventListener('focus',refresh);window.addEventListener('online',refresh);window.addEventListener('storage',storage);window.addEventListener('beforeunload',unload);
 return()=>{store.setOnChange(undefined);store.flush();channel?.close();window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);window.removeEventListener('storage',storage);window.removeEventListener('beforeunload',unload);};},[store,userId]);
 return <RitualContext.Provider value={store}>{children}</RitualContext.Provider>;
}
export function useRituals(){const store=useContext(RitualContext);if(!store)throw Error('Authenticated Rituals requires its provider');const status=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);return {store,status,state:status.state,dispatch:store.dispatch};}
export function RitualCapture({children}:{children:ReactNode}){const {status}=useRituals(),disabled=!status.loaded||!!status.error;return <div role="group" aria-label="Rituals data" aria-disabled={disabled} inert={disabled} aria-busy={!status.loaded} style={{display:'contents'}}>{children}</div>;}
export function RitualSaveStatus(){const {store,status}=useRituals();return <div className="muse-daily-save-state" role="status" aria-live="polite"><span>{status.error||(!status.loaded?'Loading rituals data…':status.pending?'Saving rituals changes…':'Rituals data is up to date.')}</span>{status.error&&<>{!status.conflict&&<button type="button" className="text-button" onClick={()=>store.retry()}>Retry rituals</button>}<button type="button" className="text-button" disabled={status.saving} onClick={()=>void store.discard()}>{status.pending?'Discard unsaved rituals changes and load latest':'Load latest rituals'}</button>{status.pending&&<details><summary>Review unsaved rituals changes</summary><textarea readOnly rows={6} aria-label="Unsaved rituals changes" value={store.draftText()}/></details>}</>}</div>;}
