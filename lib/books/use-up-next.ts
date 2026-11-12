'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import type {Book} from '@/lib/whimsy/models';
import {emptySlots,nudgeSlot,readUpNext,removeFromSlot,sameSlots,saveUpNext,setSlot,settle,type Slots} from './up-next';

/**
 * Up Next state: changes show at once, save through one atomic database call, and fall back to what is stored if a
 * save fails. A book that has genuinely moved to Currently Reading (through the normal start flow) leaves its slot
 * on its own; nothing here changes a reading status.
 */
export function useUpNext(books:readonly Book[]){
 const client=useMemo(()=>createMuseBrowserClient(),[]);
 const [slots,setSlots]=useState<Slots>(emptySlots),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const live=useRef(slots);useEffect(()=>{live.current=slots;},[slots]);
 const reload=useCallback(async()=>{try{setSlots(await readUpNext(client));setError('');}catch(cause){setError(cause instanceof Error?cause.message:'Your Up Next could not be loaded.');}finally{setLoaded(true);}},[client]);
 useEffect(()=>{const first=window.setTimeout(()=>void reload(),0);const onShow=()=>{if(document.visibilityState==='visible')void reload();};document.addEventListener('visibilitychange',onShow);return()=>{window.clearTimeout(first);document.removeEventListener('visibilitychange',onShow);};},[reload]);
 const commit=useCallback(async(next:Slots)=>{
  const before=live.current;if(sameSlots(before,next))return;setSlots(next);setBusy(true);setError('');
  try{await saveUpNext(client,next);}catch(cause){setSlots(before);setError(cause instanceof Error?cause.message:'That change could not be saved.');}finally{setBusy(false);}
 },[client]);
 // Started books leave Up Next once their status has really changed.
 const settled=useMemo(()=>loaded?settle(slots,books):slots,[loaded,slots,books]);
 useEffect(()=>{if(loaded&&books.length&&!sameSlots(settled,slots))void commit(settled);},[loaded,books.length,settled,slots,commit]);
 return {slots:settled,loaded,error,busy,clearError:()=>setError(''),reload,
  place:(index:number,bookId:string)=>commit(setSlot(live.current,index,bookId)),
  remove:(index:number)=>commit(removeFromSlot(live.current,index)),
  nudge:(index:number,delta:-1|1)=>commit(nudgeSlot(live.current,index,delta)),
  reorder:(next:Slots)=>commit(next)};
}
