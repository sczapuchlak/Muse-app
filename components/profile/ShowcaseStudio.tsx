"use client";
/* eslint-disable @next/next/no-img-element -- covers come from book and film services; next/image would proxy them. */
import Link from 'next/link';
import {useParams,useRouter,useSearchParams} from 'next/navigation';
import {useEffect,useMemo,useState,type CSSProperties,type DragEvent,type KeyboardEvent} from 'react';
import {saveShowcase,deleteShowcase,type Showcase,type ShowcaseItem} from '@/lib/profile/persistence';
import {showcaseLayouts,starterIdeas,visibilityLabels,type ShowcaseLayout,type ShowcaseVisibility} from '@/lib/profile/model';
import {adapters,displayChanged,type ShowcaseDisplay} from '@/lib/profile/adapters';
import {offeredGradients,familyLabels,gradientCss,gradientById,type GradientFamily} from '@/lib/profile/gradients';
import {MuseIcon,type MuseIconName} from '../MuseIcon';
import {MuseIconPicker} from '../MuseIconPicker';
import {ShowcaseView} from './ShowcaseView';
import {ItemPicker,type PickedItem} from './ItemPicker';
import {useMyProfile} from './useMyProfile';
import {useShowcaseSources} from './useShowcaseSources';
import './Profile.css';

const layoutSketch:Record<ShowcaseLayout,string>={gallery:'▦',shelf:'▤',spotlight:'◧',cards:'☰',mixed:'◩'};
export function ShowcaseStudio(){
 const params=useParams<{id:string}>(),search=useSearchParams(),router=useRouter();
 const me=useMyProfile();const {bundle,loaded}=useShowcaseSources();
 const isNew=params.id==='new';const starter=starterIdeas.find(s=>s.id===search.get('starter'));
 const [draft,setDraft]=useState<Showcase|null>(null);const [baseline,setBaseline]=useState('');const [removed,setRemoved]=useState<string[]>([]);
 const [picking,setPicking]=useState(false);const [busy,setBusy]=useState(false);const [status,setStatus]=useState('');const [confirmDelete,setConfirmDelete]=useState(false);
 const [compare,setCompare]=useState<{id:string;fresh:ShowcaseDisplay}|null>(null);const [leaveArmed,setLeaveArmed]=useState(false);const [dragging,setDragging]=useState<number|null>(null);
 useEffect(()=>{if(me.loaded&&(!me.identity||!me.details))router.replace('/profile');},[me.loaded,me.identity,me.details,router]);
 if(me.loaded&&me.details&&!draft){
  const existing=me.showcases.find(s=>s.id===params.id);
  const next:Showcase|null=existing??(isNew?{id:crypto.randomUUID(),title:starter?.title??'',description:starter?.line??'',icon:starter?.icon??'sparkle',gradient:starter?.gradient??'nebula-kiss',layout:starter?.layout??'gallery',visibility:'draft',position:me.showcases.length,publishedAt:null,items:[]}:null);
  if(next){setDraft(next);setBaseline(existing?JSON.stringify(existing):'');}
 }
 const dirty=!!draft&&JSON.stringify(draft)!==baseline;
 useEffect(()=>{if(!dirty)return;const warn=(e:BeforeUnloadEvent)=>e.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 const taken=useMemo(()=>new Set((draft?.items??[]).filter(i=>i.sourceId).map(i=>`${i.kind}:${i.sourceId}`)),[draft]);
 const changes=useMemo(()=>{const map=new Map<string,ShowcaseDisplay>();if(!loaded||!draft)return map;for(const item of draft.items){if(item.kind==='victory'||!item.sourceId||item.sourceState==='missing')continue;const fresh=adapters[item.kind].display(bundle,item.sourceId,item.approved);if(fresh&&displayChanged(item.display,fresh))map.set(item.id,fresh);}return map;},[loaded,draft,bundle]);

 if(!me.loaded||(!draft&&!me.error&&me.details))return <main className="muse-page" aria-busy="true"><p className="small-label" role="status">Opening the studio…</p></main>;
 if(!draft)return <main className="muse-page"><div className="muse-empty-state" data-variant="editorial"><h1>That Showcase isn’t here</h1><p>It may have been deleted.</p><Link className="muse-button muse-edge" href="/profile">Back to my profile</Link></div></main>;
 const set=(patch:Partial<Showcase>)=>{setDraft({...draft,...patch});setStatus('');};
 const setItems=(items:ShowcaseItem[])=>set({items});
 const moveItem=(from:number,to:number)=>{if(to<0||to>=draft.items.length||from===to)return;const items=[...draft.items];const [item]=items.splice(from,1);items.splice(to,0,item);setItems(items);};
 const addItem=(picked:PickedItem)=>setItems([...draft.items,{id:crypto.randomUUID(),kind:picked.kind,sourceId:picked.sourceId,display:picked.display,approved:picked.approved,note:picked.note,position:draft.items.length,sourceState:'ok',snapshotAt:new Date().toISOString()}]);
 const removeItem=(id:string)=>{setItems(draft.items.filter(i=>i.id!==id));if(baseline.includes(id))setRemoved(r=>[...r,id]);};
 const toggleField=(item:ShowcaseItem,field:string,on:boolean)=>{const approved=on?[...item.approved,field]:item.approved.filter(f=>f!==field);const fresh=item.sourceId?adapters[item.kind].display(bundle,item.sourceId,approved):null;if(!fresh)return;setItems(draft.items.map(i=>i.id===item.id?{...i,approved,display:fresh,snapshotAt:new Date().toISOString()}:i));};
 async function save(visibility?:ShowcaseVisibility){
  const next={...draft!,visibility:visibility??draft!.visibility,title:draft!.title.trim()};if(!next.title){setStatus('Give your Showcase a name first.');return;}
  setBusy(true);setStatus('');try{const publishedAt=await saveShowcase(me.client,me.userId,next,removed);const savedShowcase={...next,publishedAt};setDraft(savedShowcase);setBaseline(JSON.stringify(savedShowcase));setRemoved([]);
   setStatus(next.visibility==='friends'?(me.details?.visibility==='friends'?'Published. Your friends can see it now.':'Saved for friends. Share your profile with friends to let them see it.'):next.visibility==='private'?'Saved, just for you.':'Saved as a draft.');
   if(isNew)router.replace(`/profile/showcases/${next.id}`,{scroll:false});}catch(cause){setStatus(cause instanceof Error&&/up to/.test(cause.message)?cause.message:'That didn’t save. Your changes are still here; please try again.');}finally{setBusy(false);}
 }
 const onDrop=(event:DragEvent,to:number)=>{event.preventDefault();if(dragging!==null)moveItem(dragging,to);setDragging(null);};
 const onRowKey=(event:KeyboardEvent,index:number)=>{if(!event.altKey)return;if(event.key==='ArrowUp'){event.preventDefault();moveItem(index,index-1);}if(event.key==='ArrowDown'){event.preventDefault();moveItem(index,index+1);}};
 const families=Object.keys(familyLabels) as GradientFamily[],preset=gradientById(draft.gradient);
 const preview={...draft,items:draft.items.map(i=>({id:i.id,display:i.display,note:i.note,missing:i.sourceState==='missing'}))};
 return <main className="muse-page muse-studio">
  <header className="muse-customizer-bar">
   <Link className="muse-button muse-edge" href="/profile" onClick={e=>{if(dirty&&!leaveArmed){e.preventDefault();setLeaveArmed(true);setStatus('You have unsaved changes. Save them, or press My profile again to leave without saving.');}}}><MuseIcon name="arrow" size={16}/>My profile</Link>
   <h1 className="type-heading">{isNew&&!baseline?'New Showcase':'Showcase Studio'}</h1>
   <span className="muse-customizer-state" aria-live="polite">{status||(dirty?'Unsaved changes':'')}</span>
   <button type="button" className="muse-button muse-edge" disabled={busy} onClick={()=>save('draft')}>Save draft</button>
   <button type="button" className="muse-button button-primary muse-edge" disabled={busy} onClick={()=>save(draft.visibility==='draft'?'friends':draft.visibility)}>{busy?'Saving…':draft.visibility==='draft'?'Publish to friends':'Save'}</button>
  </header>
  <div className="muse-customizer-layout">
   <div className="muse-customizer-controls muse-studio-steps">
    {isNew&&!draft.items.length&&<section className="muse-panel"><h2 className="muse-studio-step"><span>✦</span>Need an idea?</h2><div className="muse-chip-row">{starterIdeas.map(idea=><button key={idea.id} type="button" aria-pressed={draft.title===idea.title} onClick={()=>set({title:idea.title,description:idea.line,icon:idea.icon,gradient:idea.gradient,layout:idea.layout})}><MuseIcon name={idea.icon} size={14}/>{idea.title}</button>)}</div></section>}
    <section className="muse-panel muse-customizer-fields"><h2 className="muse-studio-step"><span>1</span>Name it</h2>
     <label className="muse-field-label"><span className="small-label">Title</span><input type="text" maxLength={80} value={draft.title} placeholder="Books That Altered My Brain Chemistry" onChange={e=>set({title:e.target.value})}/></label>
     <label className="muse-field-label"><span className="small-label">A line about it (optional)</span><input type="text" maxLength={280} value={draft.description} placeholder="In no particular order. Except the first one." onChange={e=>set({description:e.target.value})}/></label>
    </section>
    <section className="muse-panel"><h2 className="muse-studio-step"><span>2</span>Choose an icon</h2><div className="muse-studio-icon"><span className="muse-showcase-icon" aria-hidden="true"><MuseIcon name={draft.icon as MuseIconName} size={22} treatment="prismatic"/></span><MuseIconPicker value={draft.icon as MuseIconName} onChange={v=>set({icon:v||'sparkle'})}/></div></section>
    <section className="muse-panel"><h2 className="muse-studio-step"><span>3</span>Pick a border</h2>
     <div className="muse-gradient-gallery" role="radiogroup" aria-label="Border gradients">{families.map(f=><div key={f} className="muse-gradient-family"><p className="small-label">{familyLabels[f]}</p><div>{offeredGradients.filter(g=>g.family===f).map(g=><button key={g.id} type="button" role="radio" aria-checked={draft.gradient===g.id} aria-label={g.name} title={g.name} style={{'--swatch':gradientCss(g.id)} as CSSProperties} onClick={()=>set({gradient:g.id})}/>)}</div></div>)}</div>
     <p className="muse-atelier-hint">{preset.name}</p>
    </section>
    <section className="muse-panel"><h2 className="muse-studio-step"><span>4</span>Choose a layout</h2>
     <div className="muse-studio-layouts" role="radiogroup" aria-label="Layout">{showcaseLayouts.map(l=><button key={l.id} type="button" role="radio" aria-checked={draft.layout===l.id} onClick={()=>set({layout:l.id})}><span aria-hidden="true">{layoutSketch[l.id]}</span><strong>{l.label}</strong><small>{l.description}</small></button>)}</div>
    </section>
    <section className="muse-panel"><h2 className="muse-studio-step"><span>5</span>Add and arrange</h2>
     <button type="button" className="muse-button button-primary muse-edge" onClick={()=>setPicking(true)}><MuseIcon name="plus" size={16}/>Add items</button>
     {draft.items.length>0&&<p className="muse-atelier-hint">Drag to rearrange, or focus an item and press Alt with ↑ / ↓.</p>}
     <ol className="muse-studio-items">{draft.items.map((item,index)=>{const fresh=changes.get(item.id);return <li key={item.id} draggable tabIndex={0} aria-label={`${item.display.title}, position ${index+1} of ${draft.items.length}`} data-dragging={dragging===index||undefined} onDragStart={()=>setDragging(index)} onDragEnd={()=>setDragging(null)} onDragOver={e=>e.preventDefault()} onDrop={e=>onDrop(e,index)} onKeyDown={e=>onRowKey(e,index)}>
      <span className="muse-studio-grip" aria-hidden="true">⋮⋮</span>
            {item.display.image?<img src={item.display.image} alt="" referrerPolicy="no-referrer"/>:<span className="muse-studio-thumb"><MuseIcon name={(item.display.glyph as MuseIconName)||adapters[item.kind].icon} size={18} treatment="prismatic"/></span>}
      <span className="muse-studio-item-copy"><strong>{item.display.title}</strong><small>{adapters[item.kind].label}{item.sourceState==='missing'?' · source removed, hidden from friends':''}</small>
       {item.kind!=='victory'&&item.sourceState==='ok'&&<details><summary>Shared details</summary>{adapters[item.kind].fields.map(f=><label key={f.id} className="muse-atelier-check"><input type="checkbox" checked={item.approved.includes(f.id)} disabled={f.locked||!loaded} onChange={e=>toggleField(item,f.id,e.target.checked)}/>{f.label}</label>)}</details>}
       <input type="text" className="muse-studio-note" maxLength={280} value={item.note} placeholder="Caption (optional)" aria-label={`Caption for ${item.display.title}`} onChange={e=>setItems(draft.items.map(i=>i.id===item.id?{...i,note:e.target.value}:i))}/>
       {fresh&&<button type="button" className="muse-studio-update" onClick={()=>setCompare({id:item.id,fresh})}><MuseIcon name="sparkle" size={14}/>Update from source</button>}
      </span>
      <span className="muse-studio-item-actions"><button type="button" className="muse-icon-button" aria-label={`Move ${item.display.title} up`} disabled={index===0} onClick={()=>moveItem(index,index-1)}>↑</button><button type="button" className="muse-icon-button" aria-label={`Move ${item.display.title} down`} disabled={index===draft.items.length-1} onClick={()=>moveItem(index,index+1)}>↓</button><button type="button" className="muse-icon-button" aria-label={`Remove ${item.display.title}`} onClick={()=>removeItem(item.id)}>✕</button></span>
     </li>;})}</ol>
     <p className="muse-atelier-hint">Removing something here never deletes it from Muse.</p>
    </section>
    <section className="muse-panel"><h2 className="muse-studio-step"><span>6</span>Who can see it</h2>
     <div className="muse-studio-visibility" role="radiogroup" aria-label="Visibility">{(Object.keys(visibilityLabels) as ShowcaseVisibility[]).map(v=><button key={v} type="button" role="radio" aria-checked={draft.visibility===v} onClick={()=>set({visibility:v})}><strong>{visibilityLabels[v].label}</strong><small>{visibilityLabels[v].detail}</small></button>)}</div>
     {draft.visibility==='friends'&&me.details?.visibility!=='friends'&&<p className="muse-accent-note">Your profile is private right now, so friends won’t see this until you share your profile in Customize profile.</p>}
    </section>
    {baseline&&<section className="muse-panel"><h2 className="muse-studio-step"><span>✕</span>Delete</h2>{confirmDelete?<div className="muse-atelier-row"><span>Delete this Showcase? Its items stay safe in Muse.</span><button type="button" className="muse-button muse-edge muse-atelier-danger" onClick={async()=>{setBusy(true);try{await deleteShowcase(me.client,me.userId,draft.id);router.push('/profile');}catch{setStatus('That didn’t delete. Please try again.');setBusy(false);}}}>Delete Showcase</button><button type="button" className="muse-button muse-edge" onClick={()=>setConfirmDelete(false)}>Keep it</button></div>:<button type="button" className="muse-button muse-edge" onClick={()=>setConfirmDelete(true)}>Delete this Showcase…</button>}</section>}
   </div>
   <div className="muse-customizer-preview" aria-label="Live preview"><p className="small-label">Live preview · in your profile theme</p>
    <ShowcaseView showcase={{...preview,title:draft.title||'Untitled Showcase'}} emptyHint={<button type="button" className="muse-button muse-edge" onClick={()=>setPicking(true)}><MuseIcon name="plus" size={16}/>Add your first item</button>}/>
   </div>
  </div>
  {picking&&<ItemPicker bundle={bundle} loaded={loaded} taken={taken} suggest={starter?.suggest} gradient={draft.gradient} onAdd={addItem} onClose={()=>setPicking(false)}/>}
  {compare&&<UpdateFromSource item={draft.items.find(i=>i.id===compare.id)!} fresh={compare.fresh} gradient={draft.gradient} onCancel={()=>setCompare(null)} onConfirm={()=>{setItems(draft.items.map(i=>i.id===compare.id?{...i,display:compare.fresh,snapshotAt:new Date().toISOString()}:i));setCompare(null);setStatus('Updated. Save to publish the change.');}}/>}
 </main>;
}

/** Published snapshots never change on their own: this shows the difference and asks first. */
function UpdateFromSource({item,fresh,gradient,onCancel,onConfirm}:{item:ShowcaseItem;fresh:ShowcaseDisplay;gradient:string;onCancel:()=>void;onConfirm:()=>void}){
 const [open,setOpen]=useState(true);
 return <dialog open={open} className="muse-item-picker muse-update-source" aria-labelledby="update-source-title">
  <header><div><p className="muse-kicker">Update from source</p><h2 id="update-source-title">{item.display.title} has changed</h2></div></header>
  <p className="muse-atelier-hint">Friends keep seeing the version on the left until you confirm and save.</p>
  <div className="muse-update-compare">
   <figure><figcaption className="small-label">Showing now</figcaption><ShowcaseView showcase={{id:'now',title:'Now',description:'',icon:'sparkle',gradient,layout:'cards',items:[{id:'a',display:item.display,note:item.note}]}}/></figure>
   <figure><figcaption className="small-label">After updating</figcaption><ShowcaseView showcase={{id:'next',title:'After',description:'',icon:'sparkle',gradient,layout:'cards',items:[{id:'b',display:fresh,note:item.note}]}}/></figure>
  </div>
  <div className="muse-atelier-row"><button type="button" className="muse-button muse-edge" onClick={()=>{setOpen(false);onCancel();}}>Keep as it is</button><button type="button" className="muse-button button-primary muse-edge" onClick={()=>{setOpen(false);onConfirm();}}>Use the update</button></div>
 </dialog>;
}
