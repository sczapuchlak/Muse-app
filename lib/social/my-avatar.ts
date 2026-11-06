"use client";
/**
 * The signed-in person's identity for app chrome (the sidebar's profile row): avatar, username and the creator mark.
 * Null fields until they create a social identity. Profile pages publish fresh values whenever they load or save.
 */
import {useEffect,useSyncExternalStore} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';

export type ChromeIdentity={avatarId:string|null;username:string|null;creator:boolean};
let current:({userId:string}&ChromeIdentity)|null=null;const listeners=new Set<()=>void>();let loading:string|null=null;
const emit=()=>listeners.forEach(update=>update());
export function publishMyIdentity(userId:string,next:ChromeIdentity){
 if(current?.userId===userId&&current.avatarId===next.avatarId&&current.username===next.username&&current.creator===next.creator)return;current={userId,...next};emit();
}
/** Back-compatible: publishing just an avatar keeps the username and mark already known. */
export function publishMyAvatar(userId:string,avatarId:string|null){publishMyIdentity(userId,{avatarId,username:current?.userId===userId?current.username:null,creator:current?.userId===userId?current.creator:false});}
const subscribe=(update:()=>void)=>{listeners.add(update);return()=>{listeners.delete(update);};};

export function useMyIdentityChrome(userId:string):ChromeIdentity{
 const value=useSyncExternalStore(subscribe,()=>current,()=>null);
 useEffect(()=>{
  if(current?.userId===userId||loading===userId)return;loading=userId;
  createMuseBrowserClient().from('social_identities').select('avatar_id,username,creator').eq('user_id',userId).maybeSingle()
   .then(({data,error})=>{if(!error)publishMyIdentity(userId,{avatarId:data?.avatar_id??null,username:data?.username??null,creator:data?.creator===true});},()=>{})
   .then(()=>{if(loading===userId)loading=null;});
 },[userId]);
 return value?.userId===userId?value:{avatarId:null,username:null,creator:false};
}
export const useMyAvatar=(userId:string)=>useMyIdentityChrome(userId).avatarId;
