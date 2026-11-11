'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {addToPlan,movePlanBook,planEntries,readPlanEntries,removeFromPlan,savePlanOrder,type PlanEntry,type PlanKind} from './reading-plans';

/**
 * Reading Plans state for the Dashboard, the full view and Book Detail. Changes show immediately, are saved through the
 * database functions, and fall back to what is stored if a save fails. Refreshing on focus keeps other devices in step.
 */
export function useReadingPlans(){
 const client=useMemo(()=>createMuseBrowserClient(),[]);
 const [entries,setEntries]=useState<PlanEntry[]>([]),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const live=useRef(entries);useEffect(()=>{live.current=entries;},[entries]);
 const reload=useCallback(async()=>{try{setEntries(await readPlanEntries(client));setError('');}catch(cause){setError(cause instanceof Error?cause.message:'Your plans could not be loaded.');}finally{setLoaded(true);}},[client]);
 useEffect(()=>{const first=window.setTimeout(()=>void reload(),0);const onShow=()=>{if(document.visibilityState==='visible')void reload();};document.addEventListener('visibilitychange',onShow);return()=>{window.clearTimeout(first);document.removeEventListener('visibilitychange',onShow);};},[reload]);
 const run=useCallback(async(optimistic:(prev:PlanEntry[])=>PlanEntry[],save:()=>Promise<void>)=>{
  const before=live.current;setEntries(optimistic(before));setBusy(true);setError('');
  try{await save();await reload();}catch(cause){setEntries(before);setError(cause instanceof Error?cause.message:'That change could not be saved.');}finally{setBusy(false);}
 },[reload]);
 const temp=(kind:PlanKind,period:string,bookId:string,position:number):PlanEntry=>({id:`pending-${kind}-${period}-${bookId}`,kind,period,bookId,position});
 const add=useCallback((kind:PlanKind,period:string,bookIds:string[])=>run(prev=>{const have=new Set(planEntries(prev,kind,period).map(e=>e.bookId)),top=prev.filter(e=>e.kind===kind&&e.period===period).reduce((n,e)=>Math.max(n,e.position+1),0);return [...prev,...bookIds.filter((id,i)=>!have.has(id)&&bookIds.indexOf(id)===i).map((id,i)=>temp(kind,period,id,top+i))];},()=>addToPlan(client,kind,period,bookIds)),[client,run]);
 const reorder=useCallback((kind:PlanKind,period:string,bookIds:string[])=>run(prev=>prev.map(e=>e.kind===kind&&e.period===period&&bookIds.includes(e.bookId)?{...e,position:bookIds.indexOf(e.bookId)}:e),()=>savePlanOrder(client,kind,period,bookIds)),[client,run]);
 const move=useCallback((kind:PlanKind,from:string,to:string,bookId:string)=>run(prev=>{const have=prev.some(e=>e.kind===kind&&e.period===to&&e.bookId===bookId),top=prev.filter(e=>e.kind===kind&&e.period===to).reduce((n,e)=>Math.max(n,e.position+1),0);return [...prev.filter(e=>!(e.kind===kind&&e.period===from&&e.bookId===bookId)),...(have?[]:[temp(kind,to,bookId,top)])];},()=>movePlanBook(client,kind,from,to,bookId)),[client,run]);
 const remove=useCallback((kind:PlanKind,period:string,bookId:string)=>run(prev=>prev.filter(e=>!(e.kind===kind&&e.period===period&&e.bookId===bookId)),()=>removeFromPlan(client,kind,period,bookId)),[client,run]);
 return {entries,loaded,error,busy,clearError:()=>setError(''),reload,add,reorder,move,remove};
}
