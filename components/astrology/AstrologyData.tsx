'use client';
import {createContext,useContext,useEffect,useState,useSyncExternalStore,type ReactNode} from 'react';
import {createAstrologyStore,type AstrologyStore} from '@/lib/astrology/store';
const Context=createContext<AstrologyStore|null>(null);
export function AstrologyDataProvider({userId,children}:{userId:string;children:ReactNode}){
 const [store]=useState(()=>createAstrologyStore(()=>window.dispatchEvent(new Event('muse-astrology-changed'))));
 useEffect(()=>{let channel:BroadcastChannel|undefined;try{channel=new BroadcastChannel(`muse.astrology.${userId}`);channel.onmessage=()=>void store.load(true);}catch{}
 const notify=()=>channel?.postMessage('changed'),refresh=()=>void store.load(true);window.addEventListener('muse-astrology-changed',notify);window.addEventListener('focus',refresh);window.addEventListener('online',refresh);
 return()=>{channel?.close();window.removeEventListener('muse-astrology-changed',notify);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);};},[store,userId]);
 return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function useAstrologyData(){const store=useContext(Context);if(!store)throw Error('Astrology requires its authenticated owner.');const snapshot=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);useEffect(()=>{void store.load();},[store]);return {store,...snapshot};}
