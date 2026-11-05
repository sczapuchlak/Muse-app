'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {saveSeries,saveSeriesMember} from '@/lib/collections/persistence';
import {collectionsChanged,useCollectionsData} from '@/components/collections/CollectionsData';
import type {Book} from '@/lib/whimsy/models';

const roles={mainline:'Mainline',optional:'Optional','spin-off':'Spin-off'} as const;
type Role=keyof typeof roles;

/**
 * Add one book to a series from its details. With no book series yet it creates one (this book as #1); otherwise
 * the reader picks a series, its position and role. A book already in the chosen series has its entry updated, never
 * duplicated. Uses the same Collections series records and saves as the Series page.
 */
export function AddToSeries({book,onDone,onCancel}:{book:Book;onDone:(message:string)=>void;onCancel:()=>void}){
 const {records,userId,retry}=useCollectionsData(),client=useMemo(()=>createMuseBrowserClient(),[]);
 const eligible=records.series.filter(s=>s.kind==='book'||s.kind==='mixed').sort((a,b)=>a.title.localeCompare(b.title));
 const [mode,setMode]=useState<'pick'|'new'>(eligible.length?'pick':'new'),[seriesId,setSeriesId]=useState(eligible[0]?.id??''),[title,setTitle]=useState(''),[role,setRole]=useState<Role>('mainline'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const members=(id:string)=>records.seriesMembers.filter(m=>m.series_id===id),existing=mode==='pick'?members(seriesId).find(m=>m.book_id===book.id):undefined;
 const nextNumber=(id:string)=>String(Math.floor(Math.max(0,...members(id).map(m=>Number(m.sequence)||0)))+1);
 const [sequence,setSequence]=useState(existing?String(existing.sequence):mode==='pick'&&seriesId?nextNumber(seriesId):'1');
 function choose(id:string){setSeriesId(id);const already=members(id).find(m=>m.book_id===book.id);setSequence(already?String(already.sequence):nextNumber(id));setRole((already?.role as Role)??'mainline');}
 async function save(){
  if(busy)return;setBusy(true);setError('');
  try{
   const order=Number(sequence);if(!Number.isFinite(order)||order<0)throw Error('Use a series number of zero or more (decimals like 1.5 are fine).');
   let target=seriesId,name=eligible.find(s=>s.id===seriesId)?.title??'';
   if(mode==='new'){if(!title.trim())throw Error('Name the series.');const created=await saveSeries(client,{id:crypto.randomUUID(),user_id:userId,title:title.trim().slice(0,200),kind:'book',description:'',cover_url:null,scope:'released',conclusion_state:'unknown'});target=created.id;name=created.title;}
   else if(!target)throw Error('Choose a series.');
   await saveSeriesMember(client,{id:existing?.id??crypto.randomUUID(),user_id:userId,series_id:target,book_id:book.id,media_id:null,sequence:order,role,release_state:existing?.release_state??'released'},existing?.revision??0);
   collectionsChanged();await retry();onDone(existing?`Updated “${book.title}” in ${name}.`:`Added “${book.title}” to ${name} as #${order}.`);
  }catch(cause){setError(cause instanceof Error?cause.message:'The series could not be saved.');}finally{setBusy(false);}
 }
 return <form className="muse-books-add-series" onSubmit={e=>{e.preventDefault();void save();}} aria-label="Add to a series">
  <div className="muse-books-panel-head"><strong>{mode==='new'?'Start a series':'Add to a series'}</strong>{eligible.length>0&&<button type="button" className="text-button" onClick={()=>{setMode(mode==='new'?'pick':'new');if(mode==='new')choose(seriesId||eligible[0].id);else setSequence('1');}}>{mode==='new'?'Choose an existing series':'+ New series'}</button>}</div>
  {error&&<p role="alert" className="muse-books-error">{error}</p>}
  <div className="muse-books-fields">
   {mode==='new'?<label>Series name<input required value={title} placeholder="e.g. The Earthsea Cycle" onChange={e=>setTitle(e.target.value)}/></label>
    :<div className="muse-books-select-field"><span>Series</span><MuseChoiceMenu label="Series" valueLabel={eligible.find(s=>s.id===seriesId)?.title??'Choose a series'} options={eligible.map(s=>({id:s.id,label:`${s.title}${members(s.id).length?` · ${members(s.id).length} ${members(s.id).length===1?'book':'books'}`:''}`}))} selectedIds={[seriesId]} onSelect={choose} searchable={eligible.length>6}/></div>}
   <label>Number in series<input type="number" min="0" step="0.5" inputMode="decimal" required value={sequence} onChange={e=>setSequence(e.target.value)}/></label>
   <div className="muse-books-select-field"><span>Role</span><MuseChoiceMenu label="Role in series" valueLabel={roles[role]} options={Object.entries(roles).map(([id,label])=>({id,label}))} selectedIds={[role]} onSelect={id=>setRole(id as Role)}/></div>
  </div>
  {existing&&<p className="small-label">Already #{existing.sequence} in this series; saving updates its number and role.</p>}
  <div className="muse-books-actions"><button type="submit" className="muse-button button-primary" disabled={busy}>{existing?'Update series entry':mode==='new'?'Create series and add':'Add to series'}</button><button type="button" className="muse-button button-ghost" disabled={busy} onClick={onCancel}>Cancel</button><Link className="text-button" href="/collections?view=series">Manage series</Link></div>
 </form>;
}
