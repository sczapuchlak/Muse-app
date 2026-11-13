'use client';
import {useEffect,useMemo,useState} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {readLifeAreas} from '@/lib/reflections/persistence';
import type {LifeArea} from '@/lib/reflections/model';
import type {Aspiration} from '@/lib/aspirations/models';
import {inTimeFilter,type TimeFilter} from '@/lib/aspirations/progress';
import {MuseMark,type MuseMarkIcon} from '@/components/design/MuseHeading';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import Link from 'next/link';

type Association={aspiration_id:string;area_id:string;is_primary:boolean};
const symbols:MuseMarkIcon[]=['heart-pulse','envision','money','heart','letter','heart','openbook','sun','house','crescent'];

/** Life areas are the same private, editable records used by Reflections. */
export function LifeAtlas({aspirations,today,onOpen,onAdd}:{aspirations:Aspiration[];today:string;onOpen:(id:string)=>void;onAdd:(areaId:string)=>void}){
 const client=useMemo(()=>createMuseBrowserClient(),[]);
 const [areas,setAreas]=useState<LifeArea[]>([]),[links,setLinks]=useState<Association[]>([]);
 const [selected,setSelected]=useState<string|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const [statusFilter,setStatusFilter]=useState('all'),[timeFilter,setTimeFilter]=useState<TimeFilter>('all');
 async function reload(){
  try{const [a,l]=await Promise.all([readLifeAreas(client),client.from('aspiration_life_areas').select('aspiration_id,area_id,is_primary')]);
   if(l.error)throw l.error;setAreas(a);setLinks(l.data);setError('');}
  catch(e){setError(e instanceof Error?e.message:'Life areas could not be loaded.');}
 }
 useEffect(()=>{let live=true;async function load(){try{const [a,l]=await Promise.all([readLifeAreas(client),client.from('aspiration_life_areas').select('aspiration_id,area_id,is_primary')]);if(l.error)throw l.error;if(live){setAreas(a);setLinks(l.data);}}catch(e){if(live)setError(e instanceof Error?e.message:'Life areas could not be loaded.');}finally{if(live)setLoaded(true);}}void load();return()=>{live=false;};},[client]);
 async function assign(aspirationId:string,areaId:string){setBusy(true);const {error}=await client.rpc('set_aspiration_primary_area',{p_aspiration_id:aspirationId,p_area_id:areaId||null});if(error)setError(error.message);else await reload();setBusy(false);}
 async function addSecondary(aspirationId:string,areaId:string){setBusy(true);const result=await client.from('aspiration_life_areas').insert({aspiration_id:aspirationId,area_id:areaId,is_primary:false});if(result.error)setError(result.error.message);else await reload();setBusy(false);}
 async function unlink(aspirationId:string,areaId:string){setBusy(true);const result=await client.from('aspiration_life_areas').delete().eq('aspiration_id',aspirationId).eq('area_id',areaId);if(result.error)setError(result.error.message);else await reload();setBusy(false);}
 const activeAreas=areas.filter(a=>!a.archived),area=areas.find(a=>a.id===selected);
 const items=(id:string)=>aspirations.filter(a=>links.some(l=>l.area_id===id&&l.aspiration_id===a.id));
 const filteredItems=(id:string)=>items(id).filter(a=>(statusFilter==='all'||a.status===statusFilter)&&inTimeFilter(a,timeFilter,today));
 const unassigned=aspirations.filter(a=>!links.some(l=>l.aspiration_id===a.id&&l.is_primary));
 if(error&&!areas.length)return <p role="alert" className="muse-aspiration-error">{error}</p>;
 if(!loaded)return <p role="status" className="small-label">Opening your Life Atlas…</p>;
 return <section className="muse-life-atlas" aria-label="Life Atlas">
  {error&&<p role="alert" className="muse-aspiration-error">{error}</p>}
  {area?<><button type="button" className="text-button" onClick={()=>setSelected(null)}>← Life Atlas</button><header><p className="small-label">A chapter of your life</p><h3>{area.label}</h3><p>Ideas, intentions and possibilities to make your own.</p><button type="button" className="muse-button button-primary" onClick={()=>onAdd(area.id)}>+ Add aspiration</button> <Link className="text-button" href="/planner?view=reflections">Open Reflections</Link></header>
   <div className="muse-aspirations-controls">{[{label:'Status',value:statusFilter,set:(id:string)=>setStatusFilter(id),options:[{id:'all',label:'All'},{id:'active',label:'Active'},{id:'planned',label:'Planned'},{id:'paused',label:'Paused'},{id:'completed',label:'Completed'},{id:'discontinued',label:'No longer pursuing'},{id:'archived',label:'Archived'}]},{label:'Timeframe',value:timeFilter,set:(id:string)=>setTimeFilter(id as TimeFilter),options:[{id:'all',label:'All'},{id:'month',label:'This month'},{id:'quarter',label:'This quarter'},{id:'year',label:'This year'},{id:'someday',label:'Someday'}]}].map(filter=><div key={filter.label} className="muse-aspiration-choice" data-inline><span>{filter.label}</span><MuseChoiceMenu label={filter.label} valueLabel={filter.options.find(o=>o.id===filter.value)?.label??'All'} selectedIds={[filter.value]} options={filter.options} onSelect={filter.set}/></div>)}</div>
   {filteredItems(area.id).length?<div className="muse-life-atlas-list">{filteredItems(area.id).map(a=><div key={a.id}><button type="button" onClick={()=>onOpen(a.id)}><strong>{a.title}</strong><span>{a.status==='discontinued'?'No longer pursuing':a.status}</span></button><button type="button" className="text-button" disabled={busy} onClick={()=>void unlink(a.id,area.id)} aria-label={`Unlink ${a.title} from ${area.label}`}>Unlink</button></div>)}</div>:<p>{items(area.id).length?'No aspirations match these filters.':'There is room for anything you want to explore here.'}</p>}
   <h4>Connect an existing aspiration</h4><p className="small-label">Choose its primary life area. Earlier connections remain secondary.</p>
   <div className="muse-life-atlas-assign">{aspirations.filter(a=>!links.some(l=>l.aspiration_id===a.id&&l.area_id===area.id&&l.is_primary)).map(a=><div key={a.id}><span>{a.title}</span><div><button type="button" className="text-button" disabled={busy} onClick={()=>void assign(a.id,area.id)}>Make primary</button>{!links.some(l=>l.aspiration_id===a.id&&l.area_id===area.id)&&links.some(l=>l.aspiration_id===a.id&&l.is_primary)&&<button type="button" className="text-button" disabled={busy} onClick={()=>void addSecondary(a.id,area.id)}>Add as secondary</button>}</div></div>)}</div>
  </>:<><header><p className="small-label">The art of becoming</p><h3>Your Life Atlas</h3><p>Ten areas of life. Countless possibilities, all your own.</p></header><div className="muse-life-atlas-grid">{activeAreas.map(a=>{const list=items(a.id),active=list.filter(item=>item.status==='active').length,completed=list.filter(item=>item.status==='completed').length;return <button type="button" className="muse-card muse-life-atlas-area" key={a.id} onClick={()=>setSelected(a.id)} style={{'--area-color':a.color} as React.CSSProperties}><MuseMark icon={symbols[a.position]??'envision'} size="sm" variant="soft"/><span className="small-label">Life area · {String(a.position+1).padStart(2,'0')}</span><strong>{a.label}</strong><span>{list.length?`${list.length} aspiration${list.length===1?'':'s'} · ${active} active${completed?` · ${completed} completed`:''}`:'A space for possibility'}</span>{list.slice(0,2).map(item=><small key={item.id}>{item.title}</small>)}</button>;})}</div>
   {unassigned.length>0&&<p className="small-label">{unassigned.length} aspiration{unassigned.length===1?' is':'s are'} waiting for a life area. Open an area to connect {unassigned.length===1?'it':'them'}.</p>}</>}
 </section>;
}
