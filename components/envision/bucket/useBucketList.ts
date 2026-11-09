'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import type {BucketEntry,BucketList} from '@/lib/bucket-list/models';
import {defaultList,withYearColor,yearOf,renumberShift} from '@/lib/bucket-list/logic';
import {deleteBucketEntry,loadBucketList,saveBucketEntry,saveBucketList} from '@/lib/bucket-list/persistence';
import {removeBoardImages,uploadBoardImage} from '@/lib/data/constellation-images';

const images=(e:BucketEntry)=>[...(e.cover?[e.cover]:[]),...(e.completion.photos??[])];

/**
 * The signed-in person's Bucket List. The list's settings row is created on the first real save (not on a visit).
 * Completing in a year whose color isn't stored yet stores it, so that year's record never changes color later.
 */
export function useBucketList(today:string){
 const client=useMemo(()=>createMuseBrowserClient(),[]);
 const [userId,setUserId]=useState(''),[stored,setStored]=useState<BucketList|null>(null),[entries,setEntries]=useState<BucketEntry[]>([]);
 const [status,setStatus]=useState<{loaded:boolean;error:string;saving:boolean}>({loaded:false,error:'',saving:false});
 const listRef=useRef<BucketList|null>(null);listRef.current=stored;
 const entriesRef=useRef<BucketEntry[]>([]);entriesRef.current=entries;
 const list=useMemo(()=>stored??(today?defaultList(today):null),[stored,today]);
 const reload=useCallback(async()=>{
  try{const {data,error}=await client.auth.getUser();if(error||!data.user)throw error??Error('Sign in to see your bucket list.');setUserId(data.user.id);
   const next=await loadBucketList(client,data.user.id);setStored(next.list);setEntries(next.entries);setStatus(s=>({...s,loaded:true,error:''}));}
  catch(e){const code=(e as {code?:string})?.code;setStatus(s=>({...s,loaded:true,error:code==='PGRST205'||code==='42P01'?'The Bucket List isn’t available on this server yet. Your habits and aspirations are unaffected.':e instanceof Error?e.message:'Your bucket list couldn’t load.'}));}
 },[client]);
 useEffect(()=>{const t=window.setTimeout(()=>void reload(),0);return ()=>window.clearTimeout(t);},[reload]);

 async function run<T>(work:()=>Promise<T>):Promise<T|null>{
  setStatus(s=>({...s,saving:true,error:''}));
  try{const out=await work();setStatus(s=>({...s,saving:false}));return out;}
  catch(e){setStatus(s=>({...s,saving:false,error:e instanceof Error?e.message:'That didn’t save. Try again.'}));return null;}
 }
 async function writeList(next:BucketList){const saved=await saveBucketList(client,userId,next);setStored(saved);listRef.current=saved;return saved;}
 /** The list row must exist (and hold the completion year's color) before an entry relies on it. */
 async function ensureList(year:number|null){
  let current=listRef.current;
  if(!current)current=await writeList(defaultList(today));
  if(year){const withYear=withYearColor(current,year);if(withYear)current=await writeList(withYear);}
  return current;
 }
 const saveList=(next:BucketList)=>run(async()=>writeList(listRef.current?{...next,revision:listRef.current.revision}:{...next,revision:0}));
 const save=(entry:BucketEntry)=>run(async()=>{let e=entry;await ensureList(yearOf(e.completedOn));
  // #12: taking a number moves the dream to that place; the dreams in between shift by one. The edited dream is
  // cleared first and the others shift in a collision-free order, so numbers stay unique at every step.
  const shift=renumberShift(entriesRef.current,e);
  const put=(x:BucketEntry)=>{setEntries(list=>[...list.filter(y=>y.id!==x.id),x]);entriesRef.current=[...entriesRef.current.filter(y=>y.id!==x.id),x];};
  const existing=entriesRef.current.find(x=>x.id===e.id);
  if(shift?.shifts.length&&existing?.number!=null){put(await saveBucketEntry(client,userId,{...existing,number:null}));e={...e,revision:entriesRef.current.find(x=>x.id===e.id)!.revision};}
  for(const s of shift?.shifts??[]){const cur=entriesRef.current.find(x=>x.id===s.id)!;put(await saveBucketEntry(client,userId,{...cur,number:s.number}));}
  const saved=await saveBucketEntry(client,userId,shift?{...e,position:shift.position}:e);
  const before=entriesRef.current.find(x=>x.id===e.id);setEntries(list=>[...list.filter(x=>x.id!==saved.id),saved]);
  // Photos removed in the editor are removed from private storage once the entry no longer points at them.
  if(before){const kept=new Set(images(saved).map(i=>i.path)),gone=images(before).filter(i=>!kept.has(i.path));if(gone.length)try{await removeBoardImages(gone);}catch{/* stays private; account deletion removes it */}}
  return saved;});
 /** Several entries in a row (reordering); stops at the first failure. */
 const saveMany=(changed:BucketEntry[])=>run(async()=>{for(const e of changed){const saved=await saveBucketEntry(client,userId,e);setEntries(list=>[...list.filter(x=>x.id!==saved.id),saved]);}return true;});
 const remove=(e:BucketEntry)=>run(async()=>{await deleteBucketEntry(client,userId,e);setEntries(list=>list.filter(x=>x.id!==e.id));
  try{await removeBoardImages(images(e));}catch{/* the files stay private; deleting the account removes them */}return true;});
 const upload=(entryId:string,file:File)=>run(async()=>uploadBoardImage(userId,entryId,file,{allowJpeg:true}));
 return {list,stored,entries,status,reload,save,saveMany,saveList,remove,upload};
}
