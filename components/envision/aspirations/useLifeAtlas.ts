'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {activePriorities,relatedPair,type Priority,type YearPlan} from '@/lib/aspirations/atlas';
import {addPriority,addSecondaryArea,linkRelated,loadAtlas,removeArea,removePriority,savePlan,saveVision,setPrimaryArea,unlinkRelated,updatePriority,type AtlasData,type PlanPatch} from '@/lib/aspirations/atlas-persistence';

const empty:AtlasData={areas:[],links:[],plans:[],priorities:[],visions:[],related:[]};

/**
 * The Atlas's own records (areas, year plans, priorities, visions, related links) for the signed-in person. Each
 * write updates state from the saved row, so what is shown is what persisted; an error is reported, never hidden.
 */
export function useLifeAtlas(){
 const client=useMemo(()=>createMuseBrowserClient(),[]);
 const [data,setData]=useState<AtlasData>(empty),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const plans=useRef<YearPlan[]>([]),queue=useRef<Promise<unknown>>(Promise.resolve());
 useEffect(()=>{plans.current=data.plans;},[data.plans]);
 const reload=useCallback(async()=>{
  try{const next=await loadAtlas(client);plans.current=next.plans;setData(next);setError('');}
  catch(e){const code=(e as {code?:string})?.code;setError(code==='PGRST205'||code==='42P01'||code==='42703'?'The Life Atlas isn’t available on this server yet. Your aspirations are safe.':e instanceof Error?e.message:'The Life Atlas couldn’t load.');}
  finally{setLoaded(true);}
 },[client]);
 useEffect(()=>{const t=window.setTimeout(()=>void reload(),0);return ()=>window.clearTimeout(t);},[reload]);

 async function run<T>(work:()=>Promise<T>):Promise<T|null>{
  setBusy(true);setError('');
  try{const out=await work();return out;}
  catch(e){setError(e instanceof Error?e.message:'That didn’t save. Try again.');return null;}
  finally{setBusy(false);}
 }
 const putPlan=(p:YearPlan)=>{plans.current=[...plans.current.filter(x=>x.year!==p.year),p];setData(d=>({...d,plans:[...d.plans.filter(x=>x.year!==p.year),p].sort((a,b)=>a.year-b.year)}));};
 const putPriority=(p:Priority)=>setData(d=>({...d,priorities:[...d.priorities.filter(x=>x.id!==p.id),p]}));
 /** Plan writes run one after another, each against the latest saved revision, so quick edits never collide. */
 function serial<T>(work:()=>Promise<T>):Promise<T>{const next=queue.current.then(work,work);queue.current=next.catch(()=>{});return next;}
 async function ensurePlan(year:number){const current=plans.current.find(p=>p.year===year);if(current)return current;const saved=await savePlan(client,year,{},undefined);putPlan(saved);return saved;}

 const updatePlan=(year:number,patch:PlanPatch)=>run(()=>serial(async()=>{const saved=await savePlan(client,year,patch,plans.current.find(p=>p.year===year));putPlan(saved);return saved;}));
 /** Adds an aspiration to a year once; choosing it again is a no-op, never a duplicate. */
 const chooseForYear=(a:{id:string;title:string},year:number,areaId:string|null)=>run(async()=>{
  const existing=activePriorities(data.priorities).find(p=>p.year===year&&p.aspiration_id===a.id);if(existing)return existing;
  await serial(()=>ensurePlan(year));const saved=await addPriority(client,year,a,data.areas.find(x=>x.id===areaId)??null);putPriority(saved);return saved;});
 const unchooseForYear=(aspirationId:string,year:number)=>run(async()=>{
  for(const p of activePriorities(data.priorities).filter(x=>x.year===year&&x.aspiration_id===aspirationId)){putPriority(await removePriority(client,p));}return true;});
 const notePriority=(p:Priority,note:string)=>run(async()=>{const saved=await updatePriority(client,p,{note});putPriority(saved);return saved;});
 /** Moves an aspiration to a life area (the previous one stays as a secondary, as #82 decided). Current and future
  * year snapshots follow the move; past years keep the area they were planned under. */
 const setArea=(aspirationId:string,areaId:string|null,fromYear:number)=>run(async()=>{
  await setPrimaryArea(client,aspirationId,areaId);
  const area=data.areas.find(x=>x.id===areaId)??null;
  for(const p of activePriorities(data.priorities).filter(x=>x.aspiration_id===aspirationId&&x.year>=fromYear&&x.area_id!==(area?.id??null))){putPriority(await updatePriority(client,p,{area_id:area?.id??null,area_name:area?.label.slice(0,40)??null}));}
  const links=await client.from('aspiration_life_areas').select('aspiration_id,area_id,is_primary');if(links.error)throw links.error;setData(d=>({...d,links:links.data??[]}));return true;});
 const addSecondary=(aspirationId:string,areaId:string)=>run(async()=>{await addSecondaryArea(client,aspirationId,areaId);setData(d=>({...d,links:[...d.links,{aspiration_id:aspirationId,area_id:areaId,is_primary:false}]}));return true;});
 const unlinkArea=(aspirationId:string,areaId:string)=>run(async()=>{await removeArea(client,aspirationId,areaId);setData(d=>({...d,links:d.links.filter(l=>!(l.aspiration_id===aspirationId&&l.area_id===areaId))}));return true;});
 const writeVision=(year:number,areaId:string,vision:string)=>run(async()=>{await serial(()=>ensurePlan(year));const saved=await saveVision(client,year,areaId,vision,data.visions.find(v=>v.year===year&&v.area_id===areaId));setData(d=>({...d,visions:[...d.visions.filter(v=>!(v.year===year&&v.area_id===areaId)),saved]}));return saved;});
 const relate=(a:string,b:string)=>run(async()=>{const pair=relatedPair(a,b);await linkRelated(client,pair);setData(d=>({...d,related:[...d.related.filter(l=>!(l.aspiration_id===pair.aspiration_id&&l.related_id===pair.related_id)),pair]}));return true;});
 const unrelate=(a:string,b:string)=>run(async()=>{const pair=relatedPair(a,b);await unlinkRelated(client,pair);setData(d=>({...d,related:d.related.filter(l=>!(l.aspiration_id===pair.aspiration_id&&l.related_id===pair.related_id))}));return true;});
 /** An aspiration was deleted: its links and area associations went with it in the database (cascade). */
 const forget=(id:string)=>setData(d=>({...d,links:d.links.filter(l=>l.aspiration_id!==id),related:d.related.filter(l=>l.aspiration_id!==id&&l.related_id!==id),priorities:d.priorities.map(p=>p.aspiration_id===id?{...p,aspiration_id:null}:p)}));
 return {...data,loaded,error,busy,setError,reload,updatePlan,chooseForYear,unchooseForYear,notePriority,setArea,addSecondary,unlinkArea,writeVision,relate,unrelate,forget};
}
export type LifeAtlasStore=ReturnType<typeof useLifeAtlas>;
