'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import type {Aspiration,AspirationUpdate} from '@/lib/aspirations/models';
import {addAspirationUpdate,deleteAspiration,deleteAspirationUpdate,loadAspirations,saveAspiration} from '@/lib/aspirations/persistence';

/** Aspirations and their journal for the signed-in person. Each write merges the saved row instead of reloading everything. */
export function useAspirations(){
 const client=useMemo(()=>createMuseBrowserClient(),[]);
 const [userId,setUserId]=useState(''),[aspirations,setAspirations]=useState<Aspiration[]>([]),[updates,setUpdates]=useState<AspirationUpdate[]>([]);
 const [status,setStatus]=useState<{loaded:boolean;error:string;saving:boolean}>({loaded:false,error:'',saving:false});
 const reload=useCallback(async()=>{
  try{const {data,error}=await client.auth.getUser();if(error||!data.user)throw error??Error('Sign in to see your aspirations.');setUserId(data.user.id);
   const next=await loadAspirations(client,data.user.id);setAspirations(next.aspirations);setUpdates(next.updates);setStatus(s=>({...s,loaded:true,error:''}));}
  catch(e){const code=(e as {code?:string})?.code;setStatus(s=>({...s,loaded:true,error:code==='PGRST205'||code==='42P01'?'Aspirations isn’t available on this server yet. Your habits are unaffected.':e instanceof Error?e.message:'Aspirations couldn’t load.'}));}
 },[client]);
 useEffect(()=>{const t=window.setTimeout(()=>void reload(),0);return ()=>window.clearTimeout(t);},[reload]);

 async function run<T>(work:()=>Promise<T>):Promise<T|null>{
  setStatus(s=>({...s,saving:true,error:''}));
  try{const out=await work();setStatus(s=>({...s,saving:false}));return out;}
  catch(e){setStatus(s=>({...s,saving:false,error:e instanceof Error?e.message:'That didn’t save. Try again.'}));return null;}
 }
 const save=(a:Aspiration)=>run(async()=>{const saved=await saveAspiration(client,userId,a,a.revision);setAspirations(list=>[...list.filter(x=>x.id!==saved.id),saved]);return saved;});
 const remove=(a:Aspiration)=>run(async()=>{await deleteAspiration(client,userId,a);setAspirations(list=>list.filter(x=>x.id!==a.id));setUpdates(list=>list.filter(u=>u.aspirationId!==a.id));return true;});
 const addUpdate=(u:Omit<AspirationUpdate,'createdAt'>)=>run(async()=>{const saved=await addAspirationUpdate(client,userId,u);setUpdates(list=>[...list,saved]);return saved;});
 const removeUpdate=(id:string)=>run(async()=>{await deleteAspirationUpdate(client,userId,id);setUpdates(list=>list.filter(u=>u.id!==id));return true;});
 return {aspirations,updates,status,reload,save,remove,addUpdate,removeUpdate};
}
