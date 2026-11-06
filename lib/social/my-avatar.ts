"use client";
/**
 * The signed-in person's chosen avatar for app chrome (the sidebar's My Profile row). Undefined until loaded,
 * null when they have no social identity yet. Profile pages publish fresh values whenever they load or save.
 */
import {useEffect,useSyncExternalStore} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';

let current:{userId:string;avatarId:string|null}|null=null;const listeners=new Set<()=>void>();let loading:string|null=null;
const emit=()=>listeners.forEach(update=>update());
export function publishMyAvatar(userId:string,avatarId:string|null){if(current?.userId===userId&&current.avatarId===avatarId)return;current={userId,avatarId};emit();}
const subscribe=(update:()=>void)=>{listeners.add(update);return()=>{listeners.delete(update);};};

export function useMyAvatar(userId:string){
 const value=useSyncExternalStore(subscribe,()=>current,()=>null);
 useEffect(()=>{
  if(current?.userId===userId||loading===userId)return;loading=userId;
  createMuseBrowserClient().from('social_identities').select('avatar_id').eq('user_id',userId).maybeSingle()
   .then(({data,error})=>{if(!error)publishMyAvatar(userId,data?.avatar_id??null);},()=>{})
   .then(()=>{if(loading===userId)loading=null;});
 },[userId]);
 return value?.userId===userId?value.avatarId:null;
}
