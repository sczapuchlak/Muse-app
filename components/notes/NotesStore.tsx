'use client';
import {createContext,useContext,useEffect,useState,useSyncExternalStore,type ReactNode} from 'react';
import {NotesStore} from '@/lib/data/notes-store';
import {readNotes,writeNotes} from '@/lib/data/notes';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import type {DailyProfile} from '@/lib/data/daily-store';
const Context=createContext<{store:NotesStore;profile:DailyProfile}|null>(null);
export function NotesProvider({profile,children}:{profile:DailyProfile;children:ReactNode}){const [store]=useState(()=>{const client=createMuseBrowserClient();return new NotesStore({read:()=>readNotes(client),write:(v,id,state)=>writeNotes(client,v,id,state)});});
 useEffect(()=>{let channel:BroadcastChannel|undefined;try{channel=new BroadcastChannel(`muse.notes.${profile.id}`);channel.onmessage=()=>void store.load(true);}catch{}store.setOnChange(()=>{channel?.postMessage('changed');try{localStorage.setItem('muse.notes.changed',`${profile.id}/${crypto.randomUUID()}`);localStorage.removeItem('muse.notes.changed');}catch{}});
 const refresh=()=>void store.load(true),storage=(event:StorageEvent)=>{if(event.key==='muse.notes.changed'&&event.newValue?.startsWith(profile.id+'/'))refresh();},unload=(event:BeforeUnloadEvent)=>{if(store.hasPending()){event.preventDefault();event.returnValue='';}};
 window.addEventListener('focus',refresh);window.addEventListener('online',refresh);window.addEventListener('storage',storage);window.addEventListener('beforeunload',unload);
 return()=>{store.setOnChange(undefined);store.flush();channel?.close();window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);window.removeEventListener('storage',storage);window.removeEventListener('beforeunload',unload);};},[store,profile.id]);
 return <Context.Provider value={{store,profile}}>{children}</Context.Provider>;
}
export function useNotesPersistence(){const value=useContext(Context);if(!value)throw Error('Authenticated Notes require NotesProvider');const status=useSyncExternalStore(value.store.subscribe,value.store.getSnapshot,value.store.getSnapshot);return {...value,status};}
export function NotesSaveStatus(){const {store,status}=useNotesPersistence();return <div className="muse-daily-save-state" role="status" aria-live="polite"><span>{status.error||(!status.loaded?'Loading notes…':status.pending?'Saving notes…':'Notes are up to date.')}</span>{status.error&&<>{!status.conflict&&<button type="button" className="text-button" onClick={()=>store.retry()}>Retry Notes</button>}<button type="button" className="text-button" disabled={status.saving} onClick={()=>void store.discard()}>{status.pending?'Discard unsaved Notes changes and load latest':'Load latest Notes'}</button>{status.pending&&<details><summary>Review unsaved Notes changes</summary><textarea readOnly rows={6} aria-label="Unsaved Notes changes" value={store.draftText()}/></details>}</>}</div>;}
