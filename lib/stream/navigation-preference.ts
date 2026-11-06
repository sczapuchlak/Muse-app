"use client";
/** Whether Stream shows in the person's navigation (account-synced; see stream_preferences). Shared by the shell and settings. */
import {useEffect,useSyncExternalStore} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';

let visible=true;let loadedFor:string|null=null;const listeners=new Set<()=>void>();
export function publishStreamNavigation(next:boolean){if(next===visible)return;visible=next;listeners.forEach(l=>l());}
const subscribe=(l:()=>void)=>{listeners.add(l);return()=>{listeners.delete(l);};};
export function useStreamNavigation(userId:string){
 const value=useSyncExternalStore(subscribe,()=>visible,()=>true);
 useEffect(()=>{if(loadedFor===userId)return;loadedFor=userId;
  (createMuseBrowserClient().rpc as unknown as (f:string)=>Promise<{data:{showInNavigation?:boolean}|null;error:unknown}>)('stream_preferences')
   .then(({data,error})=>{if(!error&&data)publishStreamNavigation(data.showInNavigation!==false);},()=>{});},[userId]);
 return value;
}
