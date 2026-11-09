'use client';
import {SaveIndicator} from '../SaveIndicator';
import {createContext,useContext,useEffect,useState,useSyncExternalStore,type ReactNode} from 'react';
import {ConstellationsStore} from '@/lib/data/constellations-store';
import {readConstellations,writeConstellations} from '@/lib/data/constellations';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import type {DailyProfile} from '@/lib/data/daily-store';
export const ConstellationsContext=createContext<{store:ConstellationsStore;profile:DailyProfile}|null>(null);
export function ConstellationsProvider({profile,children}:{profile:DailyProfile;children:ReactNode}){const [store]=useState(()=>{const client=createMuseBrowserClient();return new ConstellationsStore({read:()=>readConstellations(client),write:(v,id,state)=>writeConstellations(client,v,id,state)});});
 useEffect(()=>{let channel:BroadcastChannel|undefined;try{channel=new BroadcastChannel(`muse.constellations.${profile.id}`);channel.onmessage=()=>void store.load(true);}catch{}store.setOnChange(()=>{channel?.postMessage('changed');try{localStorage.setItem('muse.constellations.changed',`${profile.id}/${crypto.randomUUID()}`);localStorage.removeItem('muse.constellations.changed');}catch{}});
 const refresh=()=>void store.load(true),storage=(event:StorageEvent)=>{if(event.key==='muse.constellations.changed'&&event.newValue?.startsWith(profile.id+'/'))refresh();},unload=(event:BeforeUnloadEvent)=>{if(store.hasPending()){event.preventDefault();event.returnValue='';}};
 window.addEventListener('focus',refresh);window.addEventListener('online',refresh);window.addEventListener('storage',storage);window.addEventListener('beforeunload',unload);
 return()=>{store.setOnChange(undefined);store.flush();channel?.close();window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);window.removeEventListener('storage',storage);window.removeEventListener('beforeunload',unload);};},[store,profile.id]);
 return <ConstellationsContext.Provider value={{store,profile}}>{children}</ConstellationsContext.Provider>;
}
export function useConstellationsPersistence(){const value=useContext(ConstellationsContext);if(!value)throw Error('Authenticated Constellations require ConstellationsProvider');const status=useSyncExternalStore(value.store.subscribe,value.store.getSnapshot,value.store.getSnapshot);return {...value,status};}
export function ConstellationsSaveStatus(){const {store,status}=useConstellationsPersistence();return <div className="muse-daily-save-state" role="status" aria-live="polite"><SaveIndicator label="Sticky Board" loaded={status.loaded} pending={status.pending} saving={status.saving} error={status.error}/>{status.error&&<>{!status.conflict&&<button type="button" className="text-button" onClick={()=>store.retry()}>Retry Sticky Board</button>}<button type="button" className="text-button" disabled={status.saving} onClick={()=>void store.discard()}>{status.pending?'Discard unsaved Sticky Board changes and load latest':'Load latest Sticky Board'}</button>{status.pending&&<details><summary>Review unsaved Sticky Board changes</summary><textarea readOnly rows={6} aria-label="Unsaved Sticky Board changes" value={store.draftText()}/></details>}</>}</div>;}
