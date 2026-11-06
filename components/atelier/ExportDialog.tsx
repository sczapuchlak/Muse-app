"use client";
/**
 * Export with intent. A file can be a plain remix, a new official theme for Muse, or an update to an official theme.
 * Updating an official theme first offers to freeze the remixes built on it and to keep today's version, so
 * nothing saved changes appearance unexpectedly when the official theme changes.
 */
import {useEffect,useRef,useState} from 'react';
import {themeMode,themeName,specialEffects,exportTheme,freezeDefinition,emptyDefinition,type AtelierDefinition,type AtelierTheme,type Handoff,type SpecialEffect} from '@/lib/atelier/model';

type Intent=Handoff['intent'];
export type SaveFrozen=(theme:{id:string;name:string;status:'draft'|'saved';definition:AtelierDefinition})=>Promise<void>;
const slug=(text:string)=>text.replace(/[^\w-]+/g,'-').replace(/^-|-$/g,'').toLowerCase()||'muse-theme';
function download(file:string,text:string){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=file;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}

export function ExportDialog({name,definition,currentId,library,saveFrozen,onClose}:{name:string;definition:AtelierDefinition;currentId:string|null;library:AtelierTheme[];saveFrozen:SaveFrozen;onClose:(message?:string)=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current;if(dialog&&!dialog.open)dialog.showModal();},[]);
 const base=definition.base,baseName=themeName(base);
 const [intent,setIntent]=useState<Intent>('remix');
 const [newName,setNewName]=useState(name);const [subtitle,setSubtitle]=useState('');const [mode,setMode]=useState<'light'|'dark'>(themeMode(base));
 const [effects,setEffects]=useState<SpecialEffect[]>([]);
 const affected=library.filter(theme=>theme.definition.base===base&&!theme.definition.frozen&&theme.id!==currentId);
 const [freezeAffected,setFreezeAffected]=useState(true);const [keepOriginal,setKeepOriginal]=useState(true);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const invalid=intent==='new-theme'&&(!newName.trim()||!subtitle.trim());
 async function run(){
  setBusy(true);setError('');
  try{
   let handoff:Handoff={intent:'remix'};
   if(intent==='new-theme')handoff={intent,name:newName.trim().slice(0,40),subtitle:subtitle.trim().slice(0,90),mode,effects};
   if(intent==='update-theme'){
    const frozen:string[]=[];let kept:string|null=null;
    if(freezeAffected)for(const theme of affected){await saveFrozen({id:theme.id,name:theme.name,status:theme.status,definition:freezeDefinition(theme.definition)});frozen.push(theme.name);}
    if(keepOriginal){kept=`${baseName} (${new Date().toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})})`.slice(0,60);await saveFrozen({id:crypto.randomUUID(),name:kept,status:'saved',definition:freezeDefinition(emptyDefinition(base))});}
    handoff={intent,target:base,frozenRemixes:frozen,keptOriginal:kept};
   }
   const suffix=intent==='new-theme'?'new-theme':intent==='update-theme'?`update-${base}`:'remix';
   download(`${slug(intent==='new-theme'?newName:name)}.${suffix}.muse-theme.json`,exportTheme(intent==='new-theme'?newName.trim():name,definition,handoff));
   ref.current?.close();
   onClose(intent==='remix'?'Exported your theme file.':intent==='new-theme'?`Exported ${newName.trim()} for Muse. Hand the file to Claude to add it as an official theme.`:`Exported an update for ${baseName}.${handoff.intent==='update-theme'&&handoff.frozenRemixes.length?` Froze ${handoff.frozenRemixes.length} remix${handoff.frozenRemixes.length===1?'':'es'}.`:''}${handoff.intent==='update-theme'&&handoff.keptOriginal?` Kept today's look as “${handoff.keptOriginal}”.`:''}`);
  }catch{setError('Something did not save, so nothing was exported. Please try again.');}finally{setBusy(false);}
 }
 return <dialog ref={ref} className="muse-atelier-export" aria-labelledby="atelier-export-title" onCancel={event=>{event.preventDefault();if(!busy){ref.current?.close();onClose();}}}>
  <form method="dialog" onSubmit={event=>{event.preventDefault();if(!invalid&&!busy)run();}}>
   <p className="muse-kicker">Export</p>
   <h2 id="atelier-export-title">What is this file for?</h2>
   <fieldset className="muse-atelier-export-intents"><legend className="sr-only">Purpose</legend>
    {([['remix','Keep as a remix','A backup, or to import into Theme Atelier again.'],['new-theme','A new official theme','Claude adds it to Muse as a built-in theme with its own name.'],['update-theme',`An update to ${baseName}`,`Claude replaces ${baseName}'s official look, keeping its name.`]] as const).map(([value,label,detail])=><label key={value} data-checked={intent===value||undefined}><input type="radio" name="intent" value={value} checked={intent===value} onChange={()=>setIntent(value)}/><span><strong>{label}</strong><small>{detail}</small></span></label>)}
   </fieldset>
   {intent==='new-theme'&&<div className="muse-atelier-export-details">
    <label className="muse-field-label"><span className="small-label">Theme name</span><input type="text" required maxLength={40} value={newName} onChange={event=>setNewName(event.target.value)}/></label>
    <label className="muse-field-label"><span className="small-label">One-line description</span><input type="text" required maxLength={90} placeholder="e.g. Moonlit glass and violet weather." value={subtitle} onChange={event=>setSubtitle(event.target.value)}/></label>
    <div className="muse-segmented" role="group" aria-label="Light or dark"><button type="button" aria-pressed={mode==='light'} onClick={()=>setMode('light')}>Light</button><button type="button" aria-pressed={mode==='dark'} onClick={()=>setMode('dark')}>Dark</button></div>
    {mode!==themeMode(base)&&<p className="muse-accent-note">You started from a {themeMode(base)} theme. Claude will check text, inputs and scrollbars carefully in {mode} mode.</p>}
    <fieldset className="muse-atelier-export-effects"><legend className="small-label">Special effects to include</legend>
     {specialEffects.map(effect=><label key={effect.id} className="muse-atelier-check"><input type="checkbox" checked={effects.includes(effect.id)} onChange={event=>setEffects(list=>event.target.checked?[...list,effect.id]:list.filter(id=>id!==effect.id))}/><span><strong>{effect.label}</strong> <small>{effect.detail}</small></span></label>)}
     <small className="muse-atelier-hint">Nothing is inherited automatically from {baseName}; only what you tick here.</small>
    </fieldset>
   </div>}
   {intent==='update-theme'&&<div className="muse-atelier-export-details">
    <p>Your saved remixes inherit from {baseName}, so updating it changes how they look unless they are frozen.</p>
    {affected.length?<>
     <p className="small-label">These would change:</p><ul className="muse-atelier-export-affected">{affected.map(theme=><li key={theme.id}>{theme.name}<small>{theme.status==='draft'?' · draft':''}</small></li>)}</ul>
     <label className="muse-atelier-check"><input type="checkbox" checked={freezeAffected} onChange={event=>setFreezeAffected(event.target.checked)}/>Freeze them as they look today (recommended)</label>
    </>:<p className="muse-accent-note">None of your saved remixes would change.</p>}
    <label className="muse-atelier-check"><input type="checkbox" checked={keepOriginal} onChange={event=>setKeepOriginal(event.target.checked)}/>Keep today&apos;s {baseName} as a frozen theme you can still wear</label>
    <small className="muse-atelier-hint">Frozen themes keep every colour, layer and glow. Effects that belong to {baseName} itself, such as its glitter stars, still follow the official theme.</small>
   </div>}
   {error&&<p className="field-error" role="alert">{error}</p>}
   <div className="muse-atelier-row muse-atelier-export-actions">
    <button type="button" className="muse-button muse-edge" disabled={busy} onClick={()=>{ref.current?.close();onClose();}}>Cancel</button>
    <button type="submit" className="muse-button button-primary muse-edge" disabled={busy||invalid}>{busy?'Preparing…':intent==='update-theme'&&(freezeAffected&&affected.length||keepOriginal)?'Freeze and export':'Export file'}</button>
   </div>
  </form>
 </dialog>;
}
