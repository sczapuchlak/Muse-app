'use client';
import {useState} from 'react';
import {ColorLabel} from '@/components/ColorLabel';
import {MuseStar} from '@/components/MuseStar';
import {accentStyle} from '@/lib/appearance-values';
import {curiosityCategoryAccents,fortuneLabels,safeSourceUrl,type FortuneContent,type FortuneKind} from '@/lib/whimsy/fortunes';
import type {SavedDiscovery} from '@/lib/whimsy/models';

/** The saved snapshot remains readable even if its original assignment is unavailable. */
export function FortuneCollectionCard({item,kind,content,busy,onReopen,onRemove,onSaveNote}:{item:SavedDiscovery;kind?:FortuneKind;content?:FortuneContent;busy:boolean;onReopen?:()=>void;onRemove:()=>void;onSaveNote:(note:string)=>Promise<boolean>}){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(item.note??'');
 const title=item.snapshot?.title??content?.title??'Historical discovery';
 const body=item.snapshot?.body??content?.body??'Original content unavailable.';
 const category=item.category||content?.metadata.category||'';
 const accent=curiosityCategoryAccents[category];
 const source=safeSourceUrl(item.snapshot?item.snapshot.sourceUrl:content?.sources[0]?.url);
 // A saved date is distinct from the original draw's date. Use the record's saved zone.
 const savedDate=new Intl.DateTimeFormat('en-US',{timeZone:item.timeZone,month:'short',day:'numeric',year:'numeric'}).format(new Date(item.savedAt));
 return <details className="muse-fortune-saved" style={accentStyle(accent)}>
  <summary className="muse-fortune-keepsake">
   <span className="muse-fortune-artifact-glyph" aria-hidden="true">{{cookie:'✧',oracle:'◈',prophecy:'✦',curiosity:'⌁'}[kind??'curiosity']}</span>
   <span className="muse-fortune-keepsake-type small-label">{kind?fortuneLabels[kind]:'Saved discovery'}<MuseStar size={16} prismatic/></span>
   {category&&<span className="small-label"><ColorLabel color={accent}>{category}</ColorLabel></span>}
   <h4>{title}</h4><span className="muse-fortune-keepsake-preview">{body}</span>
   <span className="muse-fortune-keepsake-footer"><time dateTime={item.savedAt}>Saved {savedDate}</time><span className="muse-fortune-keepsake-open">Details <span aria-hidden="true">↗</span></span></span>
  </summary>
  <div className="muse-fortune-keepsake-detail">
   <p className="muse-fortune-keepsake-body">{body}</p>
   {item.question&&<p><strong>Your question:</strong> {item.question}</p>}
   {item.note&&<p className="muse-fortune-keepsake-body"><strong>Your note:</strong> {item.note}</p>}
   {source&&<a href={source} rel="noopener noreferrer" target="_blank">Original source ↗</a>}
   <div className="muse-fortune-actions">
    {onReopen&&<button className="text-button" type="button" disabled={busy} onClick={onReopen}>Reopen experience</button>}
    <button className="text-button" type="button" disabled={busy} onClick={()=>{setDraft(item.note??'');setEditing(true);}}>Add or edit note</button>
    <button className="text-button" type="button" disabled={busy} onClick={onRemove}>Remove</button>
   </div>
   {editing&&<form className="muse-fortune-note" onSubmit={async event=>{event.preventDefault();if(!busy&&await onSaveNote(draft))setEditing(false);}}>
    <label>Private note<textarea autoFocus value={draft} maxLength={2000} disabled={busy} onChange={event=>setDraft(event.target.value)}/></label>
    <div className="muse-fortune-actions"><button className="muse-button button-ghost" type="submit" disabled={busy}>Save note</button><button className="text-button" type="button" disabled={busy} onClick={()=>setEditing(false)}>Cancel</button></div>
   </form>}
  </div>
 </details>;
}
