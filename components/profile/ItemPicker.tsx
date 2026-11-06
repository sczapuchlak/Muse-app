"use client";
/* eslint-disable @next/next/no-img-element -- covers come from book and film services; next/image would proxy them. */
import {useEffect,useMemo,useRef,useState} from 'react';
import {adapters,adapterOrder,defaultApproved,victoryDisplay,moneyAmountPattern,type Candidate,type SourceBundle,type ShowcaseDisplay,type VictoryDraft} from '@/lib/profile/adapters';
import type {SourceKind} from '@/lib/profile/model';
import {MuseIcon,type MuseIconName} from '../MuseIcon';
import {MuseSearch} from '../design/MuseSearch';
import {MuseIconPicker} from '../MuseIconPicker';
import {ShowcaseView} from './ShowcaseView';

export type PickedItem={kind:SourceKind;sourceId:string|null;approved:string[];display:ShowcaseDisplay;note:string};

/** Choose something from your own Muse and decide exactly which details friends may see. */
export function ItemPicker({bundle,loaded,taken,suggest,gradient,onAdd,onClose}:{bundle:SourceBundle;loaded:boolean;taken:Set<string>;suggest?:SourceKind[];gradient:string;onAdd:(item:PickedItem)=>void;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const d=ref.current;if(d&&!d.open)d.showModal();},[]);
 const [kind,setKind]=useState<SourceKind>(suggest?.[0]??'book');const [query,setQuery]=useState('');const [picked,setPicked]=useState<Candidate|null>(null);
 const [approved,setApproved]=useState<string[]>(defaultApproved(kind));const [note,setNote]=useState('');const [added,setAdded]=useState(0);
 const [victory,setVictory]=useState<VictoryDraft>({title:'',subtitle:'',date:'',glyph:'sparkle',money:false});
 const adapter=adapters[kind];
 const candidates=useMemo(()=>adapter.candidates(bundle).filter(c=>!taken.has(`${kind}:${c.sourceId}`)&&`${c.title} ${c.subtitle??''} ${c.group}`.toLowerCase().includes(query.toLowerCase())).slice(0,120),[adapter,bundle,taken,kind,query]);
 const display=kind==='victory'?(victory.title.trim()?victoryDisplay(victory):null):picked?adapter.display(bundle,picked.sourceId,approved):null;
 const amountWarning=kind==='victory'&&victory.money&&moneyAmountPattern.test(`${victory.title} ${victory.subtitle}`);
 const close=()=>{ref.current?.close();onClose();};
 const switchKind=(next:SourceKind)=>{setKind(next);setPicked(null);setQuery('');setApproved(defaultApproved(next));};
 function add(){if(!display||amountWarning)return;onAdd({kind,sourceId:kind==='victory'?null:picked!.sourceId,approved:kind==='victory'?['title']:approved,display,note:note.trim()});setAdded(n=>n+1);setPicked(null);setNote('');setVictory({title:'',subtitle:'',date:'',glyph:'sparkle',money:false});}
 const groups=[...new Set(candidates.map(c=>c.group))];
 return <dialog ref={ref} className="muse-item-picker" aria-labelledby="item-picker-title" onCancel={e=>{e.preventDefault();close();}}>
  <header><div><p className="muse-kicker">Add to your Showcase</p><h2 id="item-picker-title">Choose a treasure</h2></div><button type="button" className="muse-button muse-edge" onClick={close}>{added?`Done · ${added} added`:'Close'}</button></header>
  <nav className="muse-item-picker-kinds" aria-label="Where from">{adapterOrder.map(k=><button key={k} type="button" aria-pressed={kind===k} onClick={()=>switchKind(k)}><MuseIcon name={adapters[k].icon} size={16}/>{adapters[k].label}{suggest?.includes(k)&&<span className="muse-item-picker-dot" aria-label="Suggested"/>}</button>)}</nav>
  <p className="muse-item-picker-privacy"><MuseIcon name="info" size={14}/>{adapter.privacy}</p>
  <div className="muse-item-picker-body">
   {kind==='victory'?<form className="muse-item-picker-victory" onSubmit={e=>{e.preventDefault();add();}}>
    <label className="muse-field-label"><span className="small-label">Your victory</span><input type="text" maxLength={120} value={victory.title} placeholder="Ran my first 5K" onChange={e=>setVictory({...victory,title:e.target.value})}/></label>
    <label className="muse-field-label"><span className="small-label">A little more (optional)</span><input type="text" maxLength={140} value={victory.subtitle} placeholder="Slow, sweaty, glorious." onChange={e=>setVictory({...victory,subtitle:e.target.value})}/></label>
    <label className="muse-field-label"><span className="small-label">When (optional)</span><input type="date" value={victory.date} onChange={e=>setVictory({...victory,date:e.target.value})}/></label>
    <div className="muse-field-label"><span className="small-label">Icon</span><MuseIconPicker value={victory.glyph as MuseIconName} onChange={v=>setVictory({...victory,glyph:v||'sparkle'})}/></div>
    <label className="muse-atelier-check"><input type="checkbox" checked={victory.money} onChange={e=>setVictory({...victory,money:e.target.checked})}/>This is a money milestone</label>
    {victory.money&&<p className={amountWarning?'field-error':'muse-atelier-hint'} role={amountWarning?'alert':undefined}>{amountWarning?'Leave out amounts and account details. Say what happened, like “Paid off a credit card!”':'Money milestones are words only. Muse never links them to your Money records.'}</p>}
   </form>
   :<div className="muse-item-picker-list">
    <MuseSearch label={`Search ${adapter.label.toLowerCase()}`} value={query} onChange={setQuery} placeholder="Search" count={candidates.length} noun={['item','items']}/>
    {!loaded&&!['tarot-card','dream-symbol'].includes(kind)?<p className="small-label" role="status">Gathering your things…</p>
    :candidates.length===0?<p className="muse-atelier-hint">{query?'Nothing matches that search.':`You don’t have any ${adapter.label.toLowerCase()} yet. Add some in their own module, then come back.`}</p>
    :groups.map(group=><div key={group} className="muse-item-picker-group"><p className="small-label">{group}</p><div className="muse-item-picker-grid">{candidates.filter(c=>c.group===group).map(c=><button key={c.sourceId} type="button" aria-pressed={picked?.sourceId===c.sourceId} onClick={()=>{setPicked(c);setApproved(defaultApproved(kind));}}>
          {c.image?<img src={c.image} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<span className="muse-item-picker-glyph"><MuseIcon name={(c.glyph as MuseIconName)||adapter.icon} size={22} treatment="prismatic"/></span>}
     <span><strong>{c.title}</strong>{c.subtitle&&<small>{c.subtitle}</small>}</span></button>)}</div></div>)}
   </div>}
   <aside className="muse-item-picker-detail" aria-label="What friends will see">
    {kind!=='victory'&&picked&&<fieldset><legend className="small-label">Share these details</legend>{adapter.fields.map(f=><label key={f.id} className="muse-atelier-check"><input type="checkbox" checked={approved.includes(f.id)} disabled={f.locked} onChange={e=>setApproved(list=>e.target.checked?[...list,f.id]:list.filter(x=>x!==f.id))}/>{f.label}</label>)}</fieldset>}
    {(picked||kind==='victory')&&<label className="muse-field-label"><span className="small-label">Your caption (optional)</span><input type="text" maxLength={280} value={note} placeholder="Why it belongs here" onChange={e=>setNote(e.target.value)}/></label>}
    {display?<><p className="small-label">Friends will see</p><ShowcaseView showcase={{id:'picker-preview',title:'Preview',description:'',icon:adapter.icon,gradient,layout:'cards',items:[{id:'preview',display,note}]}}/></>:<p className="muse-atelier-hint">{kind==='victory'?'Write your victory to see it here.':'Choose something to see how it will look.'}</p>}
    <button type="button" className="muse-button button-primary muse-edge" disabled={!display||amountWarning} onClick={add}><MuseIcon name="plus" size={16}/>Add to Showcase</button>
   </aside>
  </div>
 </dialog>;
}
