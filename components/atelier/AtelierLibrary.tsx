"use client";
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useRef,useState,useSyncExternalStore,type CSSProperties} from 'react';
import {themes} from '@/lib/themes';
import {readThemePreference,serverThemePreference,subscribeThemePreference,selectTheme} from '@/lib/theme-preference';
import {readApplied,serverApplied,subscribeApplied,applyAtelier} from '@/lib/atelier/applied';
import {emptyDefinition,exportTheme,importTheme,themeName,freezeDefinition,baseChanged,type AtelierTheme} from '@/lib/atelier/model';
import {listAtelierThemes,saveAtelierTheme,deleteAtelierTheme,renameAtelierTheme} from '@/lib/atelier/persistence';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {MusePageHeader} from '../MusePageHeader';
import {useDailyData} from '../daily/DailyData';
import {MuseIcon} from '../MuseIcon';
import {MuseEmptyState} from '../design/MuseEmptyState';
import {ThemeThumb} from './ThemeThumb';
import './Atelier.css';

const newId=()=>crypto.randomUUID();
function download(name:string,text:string){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`${name.replace(/[^\w-]+/g,'-').replace(/^-|-$/g,'').toLowerCase()||'muse-theme'}.muse-theme.json`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}

export function AtelierLibrary(){
 const userId=useDailyData().profile.id;
 const client=useMemo(()=>createMuseBrowserClient(),[]);
 const [mine,setMine]=useState<AtelierTheme[]|null>(null);
 const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const [busy,setBusy]=useState<string|null>(null);
 const fileRef=useRef<HTMLInputElement>(null);
 const active=useSyncExternalStore(subscribeThemePreference,readThemePreference,serverThemePreference);
 const applied=useSyncExternalStore(subscribeApplied,readApplied,serverApplied);
 const load=useCallback(()=>listAtelierThemes(client,userId).then(list=>{setMine(list);setError('');},()=>{setMine(list=>list??[]);setError('Your themes could not be loaded. Official themes are still here; try again in a moment.');}),[client,userId]);
 useEffect(()=>{let cancelled=false;listAtelierThemes(client,userId).then(list=>{if(!cancelled)setMine(list);},()=>{if(!cancelled){setMine([]);setError('Your themes could not be loaded. Official themes are still here; try again in a moment.');}});return()=>{cancelled=true;};},[client,userId]);
 async function run(id:string,work:()=>Promise<void>,done?:string){setBusy(id);setError('');try{await work();await load();if(done)setNotice(done);}catch(cause){setError(cause instanceof Error&&cause.message.includes('200 themes')?cause.message:'That did not save. Please try again.');}finally{setBusy(null);}}
 /** A wearable snapshot of an official theme as it looks today, safe from future official updates. */
 const keepCopy=(id:typeof themes[number]['id'],name:string)=>run(id,()=>saveAtelierTheme(client,userId,{id:newId(),name:`${name} (${new Date().toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})})`.slice(0,60),status:'saved',definition:freezeDefinition(emptyDefinition(id))}).then(()=>undefined),`Kept a frozen copy of ${name}. It will look exactly like this even if ${name} changes.`);
 const freeze=(theme:AtelierTheme)=>run(theme.id,()=>saveAtelierTheme(client,userId,{id:theme.id,name:theme.name,status:theme.status,definition:freezeDefinition(theme.definition)}).then(()=>undefined),`Froze ${theme.name}. Changes to ${themeName(theme.definition.base)} will no longer move it.`);
 const duplicate=(theme:AtelierTheme)=>run(theme.id,()=>saveAtelierTheme(client,userId,{id:newId(),name:`${theme.name} copy`.slice(0,60),status:'draft',definition:theme.definition}).then(()=>undefined),`Duplicated ${theme.name}.`);
 async function onImport(file:File){
  const result=importTheme(await file.text());
  if(!result.ok){setError(result.error);return;}
  await run('import',()=>saveAtelierTheme(client,userId,{id:newId(),name:result.name,status:'draft',definition:result.definition}).then(()=>undefined),result.dropped.length?`Imported ${result.name} as a draft. Skipped unsupported values: ${result.dropped.join(', ')}.`:`Imported ${result.name} as a draft.`);
 }
 const saved=mine?.filter(theme=>theme.status==='saved')??[],drafts=mine?.filter(theme=>theme.status==='draft')??[];
 return <main className="muse-page muse-atelier-library">
  <MusePageHeader title="Theme Atelier" description="Remix colour, gradients, glass and atmosphere. Your real Muse only changes when you apply a theme."/>
  <div className="muse-atelier-library-bar">
   <Link className="muse-button muse-edge" href="/appearance"><MuseIcon name="arrow" size={16}/>Appearance</Link>
   <button type="button" className="muse-button muse-edge" onClick={()=>fileRef.current?.click()} disabled={busy==='import'}><MuseIcon name="plus" size={16}/>Import a theme file</button>
   <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)onImport(file);}}/>
  </div>
  <div aria-live="polite" className="muse-atelier-library-status">{error&&<p className="field-error">{error}</p>}{notice&&!error&&<p className="muse-accent-note">{notice}</p>}</div>

  <section aria-labelledby="atelier-official">
   <div className="muse-section-intro"><p className="muse-kicker">Official Muse themes</p><h2 id="atelier-official">Start from a Muse original</h2><p>Originals are never changed. Remixing one makes your own copy.</p></div>
   <div className="muse-atelier-grid">{themes.map(theme=>{const isActive=!applied&&active===theme.id;return <article key={theme.id} className="muse-atelier-card muse-panel" data-active={isActive||undefined}>
    <ThemeThumb definition={emptyDefinition(theme.id)} scope={`official-${theme.id}`}/>
    <div className="muse-atelier-card-copy"><h3>{theme.name}</h3><p>{theme.subtitle}</p>{isActive&&<span className="muse-tone-pill">Wearing now</span>}</div>
    <div className="muse-atelier-card-actions">
     <Link className="muse-button button-primary muse-edge" href={`/atelier?base=${theme.id}`}>Remix</Link>
     {!isActive&&<button type="button" className="muse-button muse-edge" onClick={()=>selectTheme(theme.id)}>Apply</button>}
     <details className="muse-atelier-more"><summary className="muse-button muse-edge" aria-label={`More for ${theme.name}`}><MuseIcon name="more" size={16}/></summary><div className="muse-atelier-more-menu"><button type="button" disabled={busy===theme.id} onClick={()=>keepCopy(theme.id,theme.name)}>Keep a frozen copy</button></div></details>
    </div>
   </article>;})}</div>
  </section>

  {[['saved','My themes','Finished remixes, ready to wear.',saved],['draft','Drafts and experiments','Works in progress. Try anything.',drafts]].map(([key,kicker,line,list])=><section key={key as string} aria-labelledby={`atelier-${key}`}>
   <div className="muse-section-intro"><p className="muse-kicker">{kicker as string}</p><h2 id={`atelier-${key}`}>{key==='saved'?'Your theme collection':'Still on the easel'}</h2><p>{line as string}</p></div>
   {mine===null?<p className="small-label" role="status">Gathering your themes…</p>:(list as AtelierTheme[]).length===0?<MuseEmptyState variant="quiet" title={key==='saved'?'No saved themes yet':'No drafts yet'} headingLevel={3}>{key==='saved'?'Remix an original above, then save it to see it here.':'Drafts you save while experimenting will wait for you here.'}</MuseEmptyState>
   :<div className="muse-atelier-grid">{(list as AtelierTheme[]).map(theme=><CustomCard key={theme.id} theme={theme} busy={busy===theme.id} applied={applied?.id===theme.id}
     onApply={()=>{applyAtelier({id:theme.id,name:theme.name,definition:theme.definition});setNotice(`${theme.name} is now your Muse theme.`);}}
     onDuplicate={()=>duplicate(theme)} onFreeze={()=>freeze(theme)} onExport={()=>download(theme.name,exportTheme(theme.name,theme.definition))}
     onRename={name=>run(theme.id,()=>renameAtelierTheme(client,userId,theme.id,name))}
     onDelete={()=>run(theme.id,()=>deleteAtelierTheme(client,userId,theme.id),`Deleted ${theme.name}.`)}/>)}</div>}
  </section>)}
 </main>;
}

function CustomCard({theme,busy,applied,onApply,onDuplicate,onFreeze,onExport,onRename,onDelete}:{theme:AtelierTheme;busy:boolean;applied:boolean;onApply:()=>void;onDuplicate:()=>void;onFreeze:()=>void;onExport:()=>void;onRename:(name:string)=>void;onDelete:()=>void}){
 const [renaming,setRenaming]=useState(false);const [name,setName]=useState(theme.name);const [confirming,setConfirming]=useState(false);
 return <article className="muse-atelier-card muse-panel" data-active={applied||undefined} aria-busy={busy}>
  <ThemeThumb definition={theme.definition} scope={`mine-${theme.id}`}/>
  <div className="muse-atelier-card-copy">
   {renaming?<form onSubmit={event=>{event.preventDefault();if(name.trim()){onRename(name.trim());setRenaming(false);}}} className="muse-atelier-rename"><label className="sr-only" htmlFor={`rename-${theme.id}`}>Theme name</label><input id={`rename-${theme.id}`} type="text" value={name} maxLength={60} autoFocus onChange={event=>setName(event.target.value)} onKeyDown={event=>{if(event.key==='Escape'){setName(theme.name);setRenaming(false);}}}/><button className="muse-button muse-edge" type="submit">Save name</button></form>
   :<h3>{theme.name}</h3>}
   <p>{theme.definition.frozen?'Frozen from':'Remix of'} {themeName(theme.definition.base)}</p>
   <span className="muse-atelier-card-pills">{applied&&<span className="muse-tone-pill">Wearing now</span>}{theme.definition.frozen&&<span className="muse-tone-pill" style={{'--tone':'var(--accent-secondary)'} as CSSProperties}>Frozen</span>}</span>
   {baseChanged(theme.definition)&&<p className="muse-accent-note" role="note">{themeName(theme.definition.base)} has changed since you saved this, so it looks different now. Open it to review, or freeze it to stop further changes.</p>}
  </div>
  {confirming?<div className="muse-atelier-card-actions" role="group" aria-label={`Delete ${theme.name}?`}><span className="small-label">Delete forever?</span><button type="button" className="muse-button muse-edge muse-atelier-danger" onClick={()=>{setConfirming(false);onDelete();}}>Delete</button><button type="button" className="muse-button muse-edge" onClick={()=>setConfirming(false)}>Keep it</button></div>
  :<div className="muse-atelier-card-actions">
   <Link className="muse-button button-primary muse-edge" href={`/atelier?theme=${theme.id}`}>Edit</Link>
   {!applied&&<button type="button" className="muse-button muse-edge" onClick={onApply} disabled={busy}>Apply</button>}
   <details className="muse-atelier-more"><summary className="muse-button muse-edge" aria-label={`More for ${theme.name}`}><MuseIcon name="more" size={16}/></summary><div className="muse-atelier-more-menu">
    <button type="button" onClick={onDuplicate} disabled={busy}>Duplicate</button>
    {!theme.definition.frozen&&<button type="button" onClick={onFreeze} disabled={busy}>Freeze appearance</button>}
    <button type="button" onClick={()=>setRenaming(true)}>Rename</button>
    <button type="button" onClick={onExport}>Export file</button>
    <button type="button" className="muse-atelier-danger" onClick={()=>setConfirming(true)}>Delete</button>
   </div></details>
  </div>}
 </article>;
}
