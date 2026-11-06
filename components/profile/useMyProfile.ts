"use client";
import {useCallback,useEffect,useMemo,useState} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {readMyIdentity,type MyIdentity} from '@/lib/social/identity';
import {readProfileDetails,readShowcases,type Showcase} from '@/lib/profile/persistence';
import type {ProfileDetails} from '@/lib/profile/model';
import {useDailyData} from '../daily/DailyData';
import {publishMyAvatar} from '@/lib/social/my-avatar';

/** The signed-in person's identity, profile and Showcases (owner-only reads). */
export function useMyProfile(){
 const {profile}=useDailyData();const userId=profile.id;
 const client=useMemo(()=>createMuseBrowserClient(),[]);
 const [state,setState]=useState<{loaded:boolean;error:string;identity:MyIdentity|null;details:ProfileDetails|null;showcases:Showcase[]}>({loaded:false,error:'',identity:null,details:null,showcases:[]});
 const reload=useCallback(async()=>{try{const [identity,details,showcases]=await Promise.all([readMyIdentity(client,userId),readProfileDetails(client,userId),readShowcases(client,userId)]);publishMyAvatar(userId,identity?.avatarId??null);setState({loaded:true,error:'',identity,details,showcases});}catch{setState(s=>({...s,loaded:true,error:'Your profile could not be loaded. Please try again.'}));}},[client,userId]);
 useEffect(()=>{let cancelled=false;Promise.all([readMyIdentity(client,userId),readProfileDetails(client,userId),readShowcases(client,userId)]).then(([identity,details,showcases])=>{publishMyAvatar(userId,identity?.avatarId??null);if(!cancelled)setState({loaded:true,error:'',identity,details,showcases});},()=>{if(!cancelled)setState(s=>({...s,loaded:true,error:'Your profile could not be loaded. Please try again.'}));});return()=>{cancelled=true;};},[client,userId]);
 return {...state,reload,setShowcases:(showcases:Showcase[])=>setState(s=>({...s,showcases})),client,userId,firstName:profile.firstName,timeZone:profile.timeZone};
}
