'use client';
import {createContext,useContext,useEffect,useState,useSyncExternalStore,type ReactNode} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {emptyCollections,type CollectionsSnapshot} from '@/lib/collections/models';
import {readCollections} from '@/lib/collections/persistence';

type Snapshot={records:CollectionsSnapshot;loaded:boolean;pending:boolean;error:string};
class CollectionsOwner{
 private state:Snapshot={records:emptyCollections(),loaded:false,pending:false,error:''};private listeners=new Set<()=>void>();private loading?:Promise<void>;private refreshQueued=false;
 constructor(private read:()=>Promise<CollectionsSnapshot>){}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 getSnapshot=()=>this.state;
 private publish(){for(const listener of this.listeners)listener();}
 load=(force=false)=>{if(this.loading){if(force)this.refreshQueued=true;return this.loading;}if(this.state.loaded&&!force)return Promise.resolve();this.state={...this.state,pending:true,error:''};this.publish();this.loading=this.read().then(records=>{this.state={records,loaded:true,pending:false,error:''};}).catch(error=>{this.state={...this.state,pending:false,error:error instanceof Error?error.message:'Collections could not load.'};}).finally(()=>{this.loading=undefined;this.publish();if(this.refreshQueued){this.refreshQueued=false;void this.load(true);}});return this.loading;};
}
const Context=createContext<{owner:CollectionsOwner;userId:string}|null>(null);
export function CollectionsDataProvider({userId,children}:{userId:string;children:ReactNode}){const [owner]=useState(()=>{const client=createMuseBrowserClient();return new CollectionsOwner(()=>readCollections(client,userId));});useEffect(()=>{const refresh=()=>void owner.load(true);window.addEventListener('muse-collections-changed',refresh);window.addEventListener('focus',refresh);return()=>{window.removeEventListener('muse-collections-changed',refresh);window.removeEventListener('focus',refresh);};},[owner]);return <Context.Provider value={{owner,userId}}>{children}</Context.Provider>;}
export function useCollectionsData(){const value=useContext(Context);if(!value)throw Error('Collections requires its authenticated owner');const snapshot=useSyncExternalStore(value.owner.subscribe,value.owner.getSnapshot,value.owner.getSnapshot);useEffect(()=>{void value.owner.load();},[value.owner]);return {...snapshot,userId:value.userId,retry:()=>value.owner.load(true)};}
export function collectionsChanged(){window.dispatchEvent(new Event('muse-collections-changed'));}
