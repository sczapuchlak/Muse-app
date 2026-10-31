'use client';
import {SaveIndicator} from '../SaveIndicator';
import {createContext,useContext,useEffect,useState,useSyncExternalStore,type ReactNode} from 'react';
import {MoneyStore} from '@/lib/data/money-store';
import {readMoney,writeMoney} from '@/lib/data/money';
import {createMuseBrowserClient} from '@/lib/supabase/client';
export const MoneyContext=createContext<MoneyStore|null>(null);
export function MoneyProvider({userId,children}:{userId:string;children:ReactNode}){
 const [store]=useState(()=>{const client=createMuseBrowserClient();return new MoneyStore({read:()=>readMoney(client),write:(v,id,state)=>writeMoney(client,v,id,state)});});
 useEffect(()=>{void store.load();let channel:BroadcastChannel|undefined;try{channel=new BroadcastChannel(`muse.money.${userId}`);channel.onmessage=()=>void store.load(true);}catch{}
 store.setOnChange(()=>{channel?.postMessage('changed');try{localStorage.setItem('muse.money.changed',`${userId}/${crypto.randomUUID()}`);localStorage.removeItem('muse.money.changed');}catch{}});
 const refresh=()=>void store.load(true),storage=(event:StorageEvent)=>{if(event.key==='muse.money.changed'&&event.newValue?.startsWith(userId+'/'))refresh();},unload=(event:BeforeUnloadEvent)=>{if(store.hasPending()){event.preventDefault();event.returnValue='';}};
 window.addEventListener('focus',refresh);window.addEventListener('online',refresh);window.addEventListener('storage',storage);window.addEventListener('beforeunload',unload);
 return()=>{store.setOnChange(undefined);store.flush();channel?.close();window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);window.removeEventListener('storage',storage);window.removeEventListener('beforeunload',unload);};},[store,userId]);
 return <MoneyContext.Provider value={store}>{children}</MoneyContext.Provider>;
}
export function useMoney(){const store=useContext(MoneyContext);if(!store)throw Error('Authenticated Money requires its provider');const status=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);return {store,status,state:status.state,dispatch:store.dispatch};}
export function MoneyCapture({children}:{children:ReactNode}){const {status}=useMoney(),disabled=!status.loaded||!!status.error;return <div role="group" aria-label="Money data" aria-disabled={disabled} inert={disabled} aria-busy={!status.loaded} style={{display:'contents'}}>{children}</div>;}
export function MoneySaveStatus(){const {store,status}=useMoney();return <div className="muse-daily-save-state" role="status" aria-live="polite"><SaveIndicator label="Money" loaded={status.loaded} pending={status.pending} saving={status.saving} error={status.error}/>{status.error&&<>{!status.conflict&&<button type="button" className="text-button" onClick={()=>store.retry()}>Retry money</button>}<button type="button" className="text-button" disabled={status.saving} onClick={()=>void store.discard()}>{status.pending?'Discard unsaved money changes and load latest':'Load latest money'}</button>{status.pending&&<details><summary>Review unsaved money changes</summary><textarea readOnly rows={6} aria-label="Unsaved money changes" value={store.draftText()}/></details>}</>}</div>;}
