'use client';
import {useState} from 'react';
import Link from 'next/link';
import {MuseModal} from '@/components/MuseModal';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {MuseDatePicker} from '@/components/MuseDatePicker';
import {dateLabel} from '@/lib/dates';
import type {BoardImage} from '@/lib/constellation-board';
import type {Aspiration} from '@/lib/aspirations/models';
import {withFrame,bucketCategories,completionStyles,statusLabels,type BucketEntry,type BucketList,type BucketStatus,type CompletionStyle} from '@/lib/bucket-list/models';
import {completeEntry,defaultYearColor,range,reopenEntry,yearColor,yearOf,yearPattern} from '@/lib/bucket-list/logic';
import {BucketPhoto,PhotoFramer,YearSwatch} from './BucketViews';
import '../aspirations/Aspirations.css';

export function blankEntry(number:number,position:number):BucketEntry{
 const now=new Date().toISOString();
 return {id:crypto.randomUUID(),number,position,title:'',notes:null,category:null,tags:[],icon:null,status:'dreaming',targetYear:null,links:[],cover:null,aspirationId:null,
  completedOn:null,completion:{},history:[],archivedAt:null,revision:0,createdAt:now,updatedAt:now};
}
const cleanUrl=(v:string)=>{try{const u=new URL(/^https?:\/\//i.test(v)?v:`https://${v}`);return u.protocol==='https:'||u.protocol==='http:'?u.toString():null;}catch{return null;}};

function Photos({photos,onChange,upload,busy}:{photos:BoardImage[];onChange:(p:BoardImage[])=>void;upload:(f:File)=>Promise<BoardImage|null>;busy:boolean}){
 const [adding,setAdding]=useState(false);
 return <div className="muse-bucket-photos">
  {photos.map(p=><figure key={p.id}><BucketPhoto image={p} className="muse-bucket-thumb"/><button type="button" className="text-button" onClick={()=>onChange(photos.filter(x=>x.id!==p.id))} aria-label={`Remove photo ${p.name}`}>Remove</button></figure>)}
  {photos.length<12&&<label className="muse-button muse-bucket-addphoto" aria-busy={adding||undefined}>{adding?'Adding…':'+ Photo'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" disabled={busy||adding}
   onChange={async ev=>{const f=ev.target.files?.[0];ev.target.value='';if(!f)return;setAdding(true);const img=await upload(f);setAdding(false);if(img)onChange([...photos,img]);}}/></label>}
 </div>;
}

/** The completion story fields, shared by the completion sheet and the editor. */
function StoryFields({c,set}:{c:BucketEntry['completion'];set:(patch:Partial<BucketEntry['completion']>)=>void}){
 return <>
  <label><span>The story <small className="small-label">· optional</small></span><textarea rows={3} maxLength={2000} value={c.story??''} onChange={e=>set({story:e.target.value})}/></label>
  <div className="muse-aspiration-row"><label>Where<input maxLength={120} value={c.location??''} placeholder="Lisbon" onChange={e=>set({location:e.target.value})}/></label>
   <label>Favorite memory<input maxLength={300} value={c.memory??''} onChange={e=>set({memory:e.target.value})}/></label></div>
 </>;
}

/** Marking a dream done: the date picks the year's color; everything else is optional. */
export function CompleteSheet({entry,list,today,busy,error,upload,onDone,onClose}:{entry:BucketEntry;list:BucketList;today:string;busy:boolean;error:string;upload:(f:File)=>Promise<BoardImage|null>;onDone:(e:BucketEntry)=>void;onClose:()=>void}){
 const [date,setDate]=useState(today),[c,setC]=useState(entry.completion),[more,setMore]=useState(false);
 const y=yearOf(date),valid=!!date&&date<=today;
 return <MuseModal id="bucket-complete" label="Mark a dream done" title="You did it" returnFocus={null} onClose={onClose}>
  <form className="muse-aspiration-form muse-bucket-form" onSubmit={e=>{e.preventDefault();if(valid)onDone(completeEntry(entry,date,{story:c.story?.trim()||undefined,location:c.location?.trim()||undefined,memory:c.memory?.trim()||undefined,photos:c.photos}));}}>
   <p className="muse-bucket-complete-title">{entry.number&&list.showNumbers?`${entry.number}. `:''}{entry.title}</p>
   <div><p className="editor-label">Completed on</p><MuseDatePicker date={date||today} today={today} label="Completed on" onChange={setDate}/></div>
   {y&&<p className="small-label muse-bucket-complete-year"><YearSwatch list={list} year={y} size="sm"/> Highlighted in {y}’s color</p>}
   <button type="button" className="text-button" aria-expanded={more} onClick={()=>setMore(!more)}>{more?'Fewer details':'Add the story, a place, photos'}</button>
   {more&&<><StoryFields c={c} set={p=>setC(x=>({...x,...p}))}/><Photos photos={c.photos??[]} busy={busy} upload={upload} onChange={photos=>setC(x=>({...x,photos}))}/></>}
   {error&&<p role="alert" className="muse-aspiration-error">{error}</p>}
   <div className="muse-aspiration-actions"><button type="submit" className="muse-button button-primary" disabled={busy||!valid}>Cross it off</button><button type="button" className="text-button" onClick={onClose}>Cancel</button></div>
  </form>
 </MuseModal>;
}

type EditorProps={initial:BucketEntry;list:BucketList;today:string;categories:string[];aspirations:Aspiration[];busy:boolean;error:string;
 upload:(f:File)=>Promise<BoardImage|null>;onSave:(e:BucketEntry)=>void;onPromote:(e:BucketEntry)=>void;onClose:()=>void};

/** Add or edit a dream. Only a title is required; numbers, years and everything else are optional. */
export function BucketEditor({initial,list,today,categories,aspirations,busy,error,upload,onSave,onPromote,onClose}:EditorProps){
 const [e,setE]=useState(initial),[tagText,setTagText]=useState(initial.tags.map(t=>`#${t}`).join(' ')),[more,setMore]=useState(initial.revision>0),[link,setLink]=useState('');
 const set=(patch:Partial<BucketEntry>)=>setE(x=>({...x,...patch}));
 const isNew=initial.revision===0,done=e.status==='completed',thisYear=Number(today.slice(0,4));
 const linked=aspirations.find(a=>a.id===e.aspirationId)??null;
 const allCategories=[...new Set([...bucketCategories,...categories])];
 const problem=!e.title.trim()?'Give it a name.':done&&(!e.completedOn||e.completedOn>today)?'Choose a completion date on or before today.':'';
 function submit(){if(problem)return;const tags=tagText.split(/[\s,]+/).map(t=>t.replace(/^#/,'').trim()).filter(Boolean);onSave({...e,tags});}
 return <MuseModal id="bucket-editor" label={isNew?'New dream':'Edit dream'} title={isNew?'A new dream':'Edit dream'} returnFocus={null} onClose={onClose} size="tall">
  <form className="muse-aspiration-form muse-bucket-form" data-scroll onSubmit={ev=>{ev.preventDefault();submit();}}><div className="muse-bucket-form-body">
   <label>The dream<input id="bucket-title" required maxLength={200} value={e.title} placeholder="See the northern lights" autoFocus onChange={ev=>set({title:ev.target.value})}/></label>
   <div className="muse-aspiration-row">
    <div><p className="editor-label">Hoping for</p><MuseChoiceMenu label="Hoping for" valueLabel={e.targetYear?String(e.targetYear):'Someday'}
     options={[{id:'',label:'Someday'},...range(Math.min(thisYear,list.horizonStart),Math.max(list.horizonEnd,e.targetYear??0,thisYear+10)).map(y=>({id:String(y),label:String(y)}))]} selectedIds={[e.targetYear?String(e.targetYear):'']} onSelect={id=>set({targetYear:id?Number(id):null})}/></div>
    <div><p className="editor-label">Status</p>{done?<p className="muse-bucket-static">Completed</p>:<MuseChoiceMenu label="Status" valueLabel={statusLabels[e.status]}
     options={(['dreaming','planned','in_progress'] as BucketStatus[]).map(id=>({id,label:statusLabels[id]}))} selectedIds={[e.status]} onSelect={id=>set({status:id as BucketStatus})}/>}</div>
   </div>
   <button type="button" className="text-button" aria-expanded={more} onClick={()=>setMore(!more)}>{more?'Fewer options':'More options'}</button>
   {more&&<div className="muse-aspiration-more">
    <div className="muse-aspiration-row">
     <label>Category<input id="bucket-category" list="bucket-categories" maxLength={40} value={e.category??''} placeholder="Travel" onChange={ev=>set({category:ev.target.value||null})}/><datalist id="bucket-categories">{allCategories.map(c=><option key={c} value={c}/>)}</datalist></label>
     <label>Emoji<input id="bucket-icon" maxLength={8} value={e.icon??''} placeholder="🌌" onChange={ev=>set({icon:ev.target.value||null})}/></label>
     <label>Number<input id="bucket-number" type="number" min={1} max={100000} value={e.number??''} onChange={ev=>set({number:ev.target.value?Math.round(Number(ev.target.value)):null})}/></label>
    </div>
    <label><span>Tags <small className="small-label">· #words, optional</small></span><input id="bucket-tags" value={tagText} placeholder="#iceland #winter" onChange={ev=>setTagText(ev.target.value)}/></label>
    <label><span>Notes and inspiration <small className="small-label">· optional</small></span><textarea id="bucket-notes" rows={3} maxLength={4000} value={e.notes??''} onChange={ev=>set({notes:ev.target.value})}/></label>
    <fieldset><legend>Links</legend>
     {e.links.filter(l=>l.kind==='url').map((l,i)=>l.kind==='url'&&<p key={i} className="muse-bucket-link"><a href={l.url} target="_blank" rel="noreferrer">{l.label||new URL(l.url).hostname}</a><button type="button" className="text-button" onClick={()=>set({links:e.links.filter(x=>x!==l)})}>Remove</button></p>)}
     <div className="muse-bucket-linkadd"><input aria-label="Add a link" value={link} placeholder="https://…" onChange={ev=>setLink(ev.target.value)}/><button type="button" className="muse-button" disabled={!cleanUrl(link)||e.links.length>=30} onClick={()=>{const url=cleanUrl(link);if(url){set({links:[...e.links,{kind:'url',url}]});setLink('');}}}>Add link</button></div>
    </fieldset>
    <fieldset><legend>Cover photo</legend>{e.cover?<div className="muse-bucket-cover-edit"><PhotoFramer image={e.cover} onChange={frame=>set({cover:withFrame(e.cover!,frame)})}/><button type="button" className="text-button" onClick={()=>set({cover:null})}>Remove photo</button></div>
     :<Photos photos={[]} busy={busy} upload={upload} onChange={p=>set({cover:p[0]??null})}/>}</fieldset>
    <fieldset><legend>Aspiration</legend>
     <p className="small-label">Link one when you want milestones. The dream and the aspiration keep their own progress; neither completes the other.</p>
     <div className="muse-aspiration-row"><div><p className="editor-label">Linked aspiration</p><MuseChoiceMenu label="Linked aspiration" valueLabel={linked?.title??'None'} searchable
      options={[{id:'',label:'None'},...aspirations.filter(a=>a.status!=='archived'||a.id===e.aspirationId).map(a=>({id:a.id,label:a.title}))]} selectedIds={[e.aspirationId??'']} onSelect={id=>set({aspirationId:id||null})}/></div>
      {!e.aspirationId&&!isNew&&<button type="button" className="muse-button" disabled={busy} onClick={()=>onPromote({...e,tags:tagText.split(/[\s,]+/).map(t=>t.replace(/^#/,'')).filter(Boolean)})}>Turn into an aspiration</button>}</div>
     {linked&&<p className="small-label"><Link href="/rituals?view=aspirations">Open “{linked.title}” in Aspirations</Link>{linked.status==='completed'?' · completed':''}</p>}
    </fieldset>
   </div>}
   {done&&<fieldset className="muse-bucket-done-fields"><legend>Completed</legend>
    <div><p className="editor-label">Completed on</p><MuseDatePicker date={e.completedOn??today} today={today} label="Completed on" onChange={d=>set({completedOn:d})}/></div>
    {yearOf(e.completedOn)&&<p className="small-label muse-bucket-complete-year"><YearSwatch list={list} year={yearOf(e.completedOn)!} size="sm"/> Shown in {yearOf(e.completedOn)}’s color. Changing the date’s year moves it to that year’s color.</p>}
    <StoryFields c={e.completion} set={p=>set({completion:{...e.completion,...p}})}/>
    <Photos photos={e.completion.photos??[]} busy={busy} upload={upload} onChange={photos=>set({completion:{...e.completion,photos}})}/>
    <button type="button" className="text-button" onClick={()=>setE(reopenEntry(e,today))}>Reopen this dream</button>
    <p className="small-label">Reopening keeps this story and remembers that it was completed.</p>
   </fieldset>}
   {e.history.length>0&&<p className="small-label">Earlier: {e.history.map(h=>`done ${dateLabel(h.completedOn)}, reopened ${dateLabel(h.reopenedOn)}`).join('; ')}</p>}
   {(problem&&e.title)||error?<p role="alert" className="muse-aspiration-error">{error||problem}</p>:null}
   </div>
   <div className="muse-aspiration-actions"><button type="submit" className="muse-button button-primary" disabled={busy||!!problem}>{isNew?'Add to the list':'Save'}</button><button type="button" className="text-button" onClick={onClose}>Cancel</button></div>
  </form>
 </MuseModal>;
}

/** List settings: title, horizon, the year color key and how completions look. */
export function BucketSettings({list,entries,busy,error,onSave,onClose}:{list:BucketList;entries:BucketEntry[];busy:boolean;error:string;onSave:(l:BucketList)=>void;onClose:()=>void}){
 const [l,setL]=useState(list);
 const years=[...new Set([...range(l.horizonStart,Math.min(l.horizonEnd,l.horizonStart+100)),...entries.map(e=>yearOf(e.completedOn)).filter((y):y is number=>!!y)])].sort((a,b)=>a-b);
 const valid=l.horizonEnd>=l.horizonStart&&l.horizonEnd-l.horizonStart<=100&&l.horizonStart>=1900&&l.horizonEnd<=2200;
 return <MuseModal id="bucket-settings" label="Bucket List settings" title="Your list" returnFocus={null} onClose={onClose} size="tall">
  <form className="muse-aspiration-form muse-bucket-form" data-scroll onSubmit={ev=>{ev.preventDefault();if(valid)onSave(l);}}><div className="muse-bucket-form-body">
   <label>Title<input maxLength={80} value={l.title} onChange={e=>setL({...l,title:e.target.value})}/></label>
   <div className="muse-aspiration-row"><label>From<input type="number" min={1900} max={2200} value={l.horizonStart} onChange={e=>setL({...l,horizonStart:Number(e.target.value)})}/></label>
    <label>To<input type="number" min={1900} max={2200} value={l.horizonEnd} onChange={e=>setL({...l,horizonEnd:Number(e.target.value)})}/></label></div>
   <p className="small-label">Your time horizon sets the years in the key. Years you complete something in always stay.</p>
   <fieldset><legend>When a dream is done</legend><div className="muse-aspiration-kinds">{completionStyles.map(s=>
    <label key={s.id}><input type="radio" name="bucket-style" checked={l.completionStyle===s.id} onChange={()=>setL({...l,completionStyle:s.id as CompletionStyle})}/><span><strong>{s.label}</strong><small>{s.detail}</small></span></label>)}</div></fieldset>
   <label className="muse-bucket-inline"><input type="checkbox" checked={l.showNumbers} onChange={e=>setL({...l,showNumbers:e.target.checked})}/> Show numbers</label>
   <fieldset><legend>Year colors</legend><ul className="muse-bucket-colorlist">{years.map(y=><li key={y}>
    <YearSwatch list={l} year={y}/><span>{y} <small className="small-label">· {yearPattern(y)}</small></span>
    <input type="color" aria-label={`Color for ${y}`} value={yearColor(l,y)} onChange={e=>setL({...l,yearColors:{...l.yearColors,[String(y)]:e.target.value}})}/>
    {yearColor(l,y)!==defaultYearColor(y)&&<button type="button" className="text-button" onClick={()=>setL({...l,yearColors:{...l.yearColors,[String(y)]:defaultYearColor(y)}})}>Reset</button>}</li>)}</ul>
    <p className="small-label">Changing a year’s color recolors everything completed that year, like redrawing the key.</p></fieldset>
   {!valid&&<p role="alert" className="muse-aspiration-error">Choose a span of up to 100 years, ending after it starts.</p>}
   {error&&<p role="alert" className="muse-aspiration-error">{error}</p>}
   </div>
   <div className="muse-aspiration-actions"><button type="submit" className="muse-button button-primary" disabled={busy||!valid}>Save</button><button type="button" className="text-button" onClick={onClose}>Cancel</button></div>
  </form>
 </MuseModal>;
}
