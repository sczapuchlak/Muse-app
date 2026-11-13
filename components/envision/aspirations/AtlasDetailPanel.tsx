'use client';
import {useState} from 'react';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {MuseIcon} from '@/components/MuseIcon';
import type {Aspiration} from '@/lib/aspirations/models';
import {activePriorities,primaryAreaOf,relatedOf,secondaryAreasOf,targetYears,type Priority} from '@/lib/aspirations/atlas';
import type {LifeAtlasStore} from './useLifeAtlas';

/**
 * Where an aspiration sits in the Life Atlas: its Life Area (and any it also nurtures), the years it was chosen
 * for (each with its own note and history), related aspirations, and whether numbers are shown.
 */
export function AtlasDetailPanel({a,all,atlas,today,years,busy,onSave,onOpen}:{a:Aspiration;all:Aspiration[];atlas:LifeAtlasStore;today:string;years:number[];busy:boolean;onSave:(a:Aspiration)=>Promise<Aspiration|null>;onOpen:(id:string)=>void}){
 const primary=primaryAreaOf(a.id,atlas.links),secondary=secondaryAreasOf(a.id,atlas.links);
 const areas=atlas.areas,label=(id:string)=>areas.find(x=>x.id===id)?.label??'An earlier area';
 const mine=atlas.priorities.filter(p=>p.aspiration_id===a.id).sort((x,y)=>x.year-y.year),active=activePriorities(mine),removed=mine.filter(p=>p.removed_at);
 const related=relatedOf(a.id,atlas.related).map(id=>all.find(x=>x.id===id)).filter((x):x is Aspiration=>!!x);
 const thisYear=Number(today.slice(0,4)),due=targetYears(a);
 const working=busy||atlas.busy;
 return <section className="muse-lifeatlas-detail" aria-label="In your Life Atlas">
  <div className="muse-lifeatlas-detail-block">
   <h3>Life Area</h3>
   <div className="muse-lifeatlas-detail-row">
    <MuseChoiceMenu label="Life Area" variant="chip" icon="envision" valueLabel={primary?label(primary):'Choose a Life Area'} selectedIds={[primary??'']} options={[...areas.filter(x=>!x.archived||x.id===primary).map(x=>({id:x.id,label:x.label})),...(primary?[{id:'',label:'No Life Area'}]:[])]} onSelect={id=>void atlas.setArea(a.id,id||null,thisYear)}/>
    {secondary.map(id=><span key={id} className="muse-lifeatlas-detail-chip">Also {label(id)}<button type="button" aria-label={`Stop linking ${a.title} to ${label(id)}`} disabled={working} onClick={()=>void atlas.unlinkArea(a.id,id)}><MuseIcon name="close" size={12}/></button></span>)}
    {primary&&<MuseChoiceMenu label="Also nurtures" variant="chip" icon="plus" valueLabel="Also nurtures…" selectedIds={[]} options={areas.filter(x=>!x.archived&&x.id!==primary&&!secondary.includes(x.id)).map(x=>({id:x.id,label:x.label}))} onSelect={id=>void atlas.addSecondary(a.id,id)}/>}
   </div>
  </div>
  <div className="muse-lifeatlas-detail-block">
   <h3>Years</h3>
   <p className="small-label">Choosing a year is separate from a target date{due.length?` (this one is due in ${due.join(', ')})`:''}. Past years keep their own record.</p>
   {active.length>0&&<ul className="muse-lifeatlas-detail-years">{active.map(p=><YearRow key={p.id} p={p} a={a} atlas={atlas} areaLabel={label} busy={working}/>)}</ul>}
   <MuseChoiceMenu label="Add to a year" variant="chip" icon="calendar" valueLabel={active.length?'Another year…':'Choose a year'} selectedIds={[]} options={years.filter(y=>!active.some(p=>p.year===y)).map(y=>({id:String(y),label:String(y)}))} onSelect={id=>void atlas.chooseForYear(a,Number(id),primary)}/>
   {removed.length>0&&<details className="muse-lifeatlas-detail-earlier"><summary>Earlier plans ({removed.length})</summary><ul>{removed.map(p=><li key={p.id}>{p.year} · {p.aspiration_name}{p.area_name?` · ${p.area_name}`:''} · taken out {p.removed_at?.slice(0,10)}</li>)}</ul></details>}
  </div>
  <div className="muse-lifeatlas-detail-block">
   <h3>Related aspirations</h3>
   {related.length>0&&<ul className="muse-lifeatlas-detail-related">{related.map(r=><li key={r.id}><button type="button" className="text-button" onClick={()=>onOpen(r.id)}>{r.title}</button><button type="button" className="text-button" aria-label={`Unrelate ${r.title}`} disabled={working} onClick={()=>void atlas.unrelate(a.id,r.id)}><MuseIcon name="close" size={12}/></button></li>)}</ul>}
   <MuseChoiceMenu label="Relate an aspiration" variant="chip" icon="link" searchable valueLabel="Relate an aspiration…" selectedIds={[]} options={all.filter(x=>x.id!==a.id&&!related.includes(x)&&x.status!=='archived').map(x=>({id:x.id,label:x.title}))} emptyLabel="No other aspirations yet." onSelect={id=>void atlas.relate(a.id,id)}/>
   <p className="small-label">A light connection, like “Learn to sew” and “Make my first cosplay”. Each keeps its own progress.</p>
  </div>
  {a.progressKind!=='binary'&&a.planningStyle!=='practice'&&a.planningStyle!=='exploration'&&<label className="muse-lifeatlas-detail-toggle"><input type="checkbox" checked={a.showProgress!==false} disabled={working} onChange={e=>void onSave({...a,showProgress:e.target.checked})}/><span><strong>Show numbers</strong><small>Turn off if a percentage doesn’t fit how this one grows. Milestones and notes stay.</small></span></label>}
 </section>;
}

function YearRow({p,a,atlas,areaLabel,busy}:{p:Priority;a:Aspiration;atlas:LifeAtlasStore;areaLabel:(id:string)=>string;busy:boolean}){
 const [note,setNote]=useState(p.note),[open,setOpen]=useState(false);
 return <li>
  <div className="muse-lifeatlas-detail-row"><strong className="type-numeric">{p.year}</strong>
   <span className="small-label">{p.aspiration_name!==a.title?`Planned as “${p.aspiration_name}”`:''}{p.area_name&&p.area_id!==null&&areaLabel(p.area_id)!==p.area_name?` · planned under ${p.area_name}`:''}</span>
   <button type="button" className="text-button" aria-expanded={open} onClick={()=>setOpen(!open)}>{p.note?'Year note':'Add a year note'}</button>
   <button type="button" className="text-button" disabled={busy} aria-label={`Take ${a.title} out of ${p.year}`} onClick={()=>void atlas.unchooseForYear(a.id,p.year)}>Take out of {p.year}</button></div>
  {!open&&p.note&&<p className="muse-lifeatlas-detail-note">{p.note}</p>}
  {open&&<form className="muse-lifeatlas-inline" onSubmit={e=>{e.preventDefault();void atlas.notePriority(p,note).then(s=>{if(s)setOpen(false);});}}><label className="sr-only" htmlFor={`note-${p.id}`}>Note for {p.year}</label><textarea id={`note-${p.id}`} rows={2} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/><button type="submit" className="muse-button" disabled={busy}>Save note</button></form>}
 </li>;
}
