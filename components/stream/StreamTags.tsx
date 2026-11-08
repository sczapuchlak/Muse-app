"use client";
import {useEffect,useState,type CSSProperties} from 'react';
import {MusePaintPicker} from '../MusePaintPicker';
import {MuseIcon} from '../MuseIcon';
import {decorations} from '@/lib/stream/model';
import {deleteTag,readTags,saveTag,snapshotOf,tagBorder,tagIcons,TAG_NAME_MAX,type StreamTag,type StreamTagSnapshot} from '@/lib/stream/tags';
import type {createMuseBrowserClient} from '@/lib/supabase/client';
type Client=ReturnType<typeof createMuseBrowserClient>;

/** A tag chip as friends see it: the person's icon and name, with a solid or gradient border. */
export function TagChip({tag,pressed,onClick,label}:{tag:StreamTagSnapshot;pressed?:boolean;onClick?:()=>void;label?:string}){
 const border=tagBorder(tag.paint),style={'--tag-border':border} as CSSProperties;
 const inner=<>{tag.icon&&<span aria-hidden="true">{tag.icon}</span>}{tag.name}</>;
 return onClick?<button type="button" className="muse-stream-tag" data-painted={!!border||undefined} style={style} aria-pressed={pressed} aria-label={label} onClick={onClick}>{inner}</button>
  :<span className="muse-stream-tag" data-painted={!!border||undefined} style={style}>{inner}</span>;
}

/**
 * The composer's tag row (#98): the five classic flourishes, then the person's own tags, then a compact creator.
 * Choosing one clears the other kind, so a post carries one tag. Manage lets them rename, restyle or delete.
 */
export function StreamTagPicker({client,decoration,onDecoration,custom,onCustom}:{client:Client;decoration:string|null;onDecoration:(id:string|null)=>void;custom:StreamTagSnapshot|null;onCustom:(t:StreamTagSnapshot|null)=>void}){
 const [tags,setTags]=useState<StreamTag[]>([]),[editing,setEditing]=useState<StreamTag|'new'|null>(null),[error,setError]=useState('');
 useEffect(()=>{let live=true;readTags(client).then(t=>{if(live)setTags(t);},()=>{});return()=>{live=false;};},[client]);
 return <div className="muse-stream-tagrow">
  <div className="muse-chip-row muse-stream-decorations" role="group" aria-label="Tag your status (optional)">
   {decorations.map(d=><button key={d.id} type="button" aria-pressed={decoration===d.id} onClick={()=>{onCustom(null);onDecoration(decoration===d.id?null:d.id);}}><span aria-hidden="true">{d.emoji}</span>{d.label}</button>)}
   {tags.map(t=><TagChip key={t.id} tag={snapshotOf(t)} pressed={custom?.id===t.id} onClick={()=>{onDecoration(null);onCustom(custom?.id===t.id?null:snapshotOf(t));}}/>)}
   <button type="button" className="muse-stream-tag-new" aria-expanded={editing!==null} onClick={()=>setEditing(editing?null:'new')}><MuseIcon name="plus" size={13}/>{editing?'Close':'New tag'}</button>
   {tags.length>0&&!editing&&<button type="button" className="muse-stream-tag-new" data-quiet onClick={()=>setEditing(tags[0])}><MuseIcon name="settings" size={13}/>Manage</button>}
  </div>
  {editing&&<TagEditor key={editing==='new'?'new':editing.id} tags={tags} tag={editing==='new'?null:editing} onPick={t=>setEditing(t)} error={error}
   onSave={async draft=>{setError('');try{const saved=await saveTag(client,draft);setTags(list=>[...list.filter(x=>x.id!==saved.id),saved].sort((a,b)=>a.position-b.position));setEditing(null);if(custom?.id===saved.id)onCustom(snapshotOf(saved));}catch(e){setError(e instanceof Error?e.message:'That tag didn’t save.');}}}
   onDelete={async t=>{setError('');try{await deleteTag(client,t.id);setTags(list=>list.filter(x=>x.id!==t.id));if(custom?.id===t.id)onCustom(null);setEditing(null);}catch(e){setError(e instanceof Error?e.message:'That tag wasn’t deleted.');}}}
   onClose={()=>setEditing(null)}/>}
 </div>;
}

function TagEditor({tags,tag,onPick,onSave,onDelete,onClose,error}:{tags:StreamTag[];tag:StreamTag|null;onPick:(t:StreamTag|'new')=>void;onSave:(t:Omit<StreamTag,'revision'>&{revision?:number})=>void;onDelete:(t:StreamTag)=>void;onClose:()=>void;error:string}){
 const [name,setName]=useState(tag?.name??''),[icon,setIcon]=useState<string|null>(tag?.icon??'✨'),[paint,setPaint]=useState(tag?.paint??null),[confirm,setConfirm]=useState(false);
 return <form className="muse-stream-tag-editor" onSubmit={e=>{e.preventDefault();onSave({id:tag?.id??crypto.randomUUID(),name,icon,paint,position:tag?.position??tags.length,revision:tag?.revision});}}>
  {tags.length>0&&<div className="muse-chip-row" role="group" aria-label="Choose a tag to edit">{tags.map(t=><TagChip key={t.id} tag={snapshotOf(t)} pressed={tag?.id===t.id} onClick={()=>onPick(t)}/>)}<button type="button" aria-pressed={!tag} onClick={()=>onPick('new')}>＋ New</button></div>}
  <div className="muse-stream-tag-preview" aria-hidden="true"><TagChip tag={{name:name.trim()||'Your tag',...(icon?{icon}:{}),...(paint?{paint}:{})}}/></div>
  <label className="muse-stream-tag-name">Name<input value={name} maxLength={TAG_NAME_MAX} required placeholder="Main character energy" onChange={e=>setName(e.target.value)}/></label>
  <fieldset className="muse-stream-tag-icons"><legend>Icon</legend>
   <label><input type="radio" name="tag-icon" checked={!icon} onChange={()=>setIcon(null)}/><span>None</span></label>
   {tagIcons.map(i=><label key={i}><input type="radio" name="tag-icon" checked={icon===i} onChange={()=>setIcon(i)} aria-label={i}/><span aria-hidden="true">{i}</span></label>)}
  </fieldset>
  <MusePaintPicker label="Border" allowDefault defaultLabel="No color" value={paint??undefined} onChange={p=>setPaint(p??null)}/>
  {error&&<p className="field-error" role="alert">{error}</p>}
  <div className="editor-actions">
   <button type="submit" className="muse-button button-primary" disabled={!name.trim()}>{tag?'Save tag':'Create tag'}</button>
   <button type="button" className="muse-button button-ghost" onClick={onClose}>Cancel</button>
   {tag&&(confirm?<span className="muse-stream-tag-confirm" role="group" aria-label="Confirm delete">Delete “{tag.name}”? Posts that used it keep it.<button type="button" className="muse-button" onClick={()=>onDelete(tag)}>Delete</button><button type="button" className="muse-button button-ghost" onClick={()=>setConfirm(false)}>Keep</button></span>
    :<button type="button" className="muse-button button-ghost" onClick={()=>setConfirm(true)}>Delete…</button>)}
  </div>
 </form>;
}
