"use client";
/* eslint-disable @next/next/no-img-element -- covers come from book and film services; next/image would proxy them. */
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {audienceOptions,BODY_MAX,decorations,primaryReactionFor,primaryShortcutCount,reactions,shortcuts,shortcutById,type StreamAudience,type StreamCategory,type StreamPost,type StreamSourceKind} from '@/lib/stream/model';
import {streamAdapters,fieldsFor,defaultApprovedFor,moodTone,sensitiveKinds,type StreamCandidate} from '@/lib/stream/adapters';
import {moneyAmountPattern} from '@/lib/profile/adapters';
import {friendlyError,publishPost} from '@/lib/stream/persistence';
import {MuseIcon} from '../MuseIcon';
import {MuseSegmented} from '../design/MuseSegmented';
import {MuseAvatar} from '../profile/MuseAvatar';
import {StreamPostCard} from './StreamPostCard';
import {FriendPicker} from './FriendPicker';
import {useStreamEnv} from './StreamContext';
import {useStreamSources} from './useStreamSources';

export type ShareSource={kind:StreamSourceKind;id:string;category?:StreamCategory};
type Tone='auto'|'react'|'love'|'joy';

/**
 * "[Name] is…": a classic status, or a moment from a real saved record. Nothing is shared until the author has
 * chosen the details, the audience (Only me to start), previewed the exact card and pressed Publish.
 */
export function StreamComposer({initial,onPublished,onCancel,autoFocus=false}:{initial?:ShareSource;onPublished:(post:StreamPost)=>void;onCancel?:()=>void;autoFocus?:boolean}){
 const {client,me,friends}=useStreamEnv();const {bundle,loaded}=useStreamSources();
 const firstCategory=initial?.category??shortcuts.find(s=>initial&&s.kinds.includes(initial.kind))?.id??null;
 const [step,setStep]=useState<'write'|'preview'>('write');const [id,setId]=useState(()=>crypto.randomUUID());
 const [body,setBody]=useState('');const [decoration,setDecoration]=useState<string|null>(null);
 const [category,setCategory]=useState<StreamCategory|null>(firstCategory);const [more,setMore]=useState(!!firstCategory&&shortcuts.findIndex(s=>s.id===firstCategory)>=primaryShortcutCount);
 const [source,setSource]=useState<{kind:StreamSourceKind;id:string}|null>(initial?{kind:initial.kind,id:initial.id}:null);
 const [approved,setApproved]=useState<string[]|null>(null);const [texts,setTexts]=useState<Record<string,string>>({});
 const [tone,setTone]=useState<Tone>('auto');const [spoiler,setSpoiler]=useState(false);
 const [audience,setAudience]=useState<StreamAudience>('private');const [members,setMembers]=useState<string[]>([]);const [comments,setComments]=useState(true);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const shortcut=shortcutById(category);
 const chosen=source&&loaded?(approved??defaultApprovedFor(source.kind,bundle,source.id)):[];
 const adapter=source?streamAdapters[source.kind]:null;
 const display=source&&adapter&&loaded?adapter.display(bundle,source.id,chosen,texts):null;
 const candidates=useMemo(()=>shortcut&&loaded?shortcut.kinds.flatMap(k=>streamAdapters[k].candidates(bundle).map(c=>({...c,kind:k}))):[],[shortcut,bundle,loaded]);
 const autoTone=source?.kind==='mood'?moodTone(bundle,source.id,chosen):'react';
 const primary=primaryReactionFor(category,source?.kind==='mood'?(tone==='auto'?autoTone:tone):undefined);
 const amountWarning=(source?.kind==='money-milestone'||category==='money')&&moneyAmountPattern.test(body);
 const problem=!source&&!body.trim()?'Finish the sentence, or choose something to share.':source&&!display?'Choose at least one detail to share.':
  audience==='selected'&&!members.length?'Choose at least one friend.':amountWarning?'Keep amounts out of a money milestone. The milestone says it all.':'';

 function pickShortcut(next:StreamCategory|null){setCategory(next);setSource(null);setApproved(null);setTexts({});setTone('auto');setError('');}
 function pickSource(c:StreamCandidate&{kind:StreamSourceKind}){setSource({kind:c.kind,id:c.sourceId});setApproved(null);setTexts({});setTone('auto');}
 function reset(){setStep('write');setId(crypto.randomUUID());setBody('');setDecoration(null);pickShortcut(null);setSpoiler(false);setAudience('private');setMembers([]);setComments(true);}
 async function publish(){if(problem||busy)return;setBusy(true);setError('');
  try{const post=await publishPost(client,{id,body,decoration:source?null:decoration,category:source?category:null,sourceKind:source?.kind??null,sourceId:source?.id??null,display:source?display:null,
   spoiler,audience,members:audience==='selected'?members:[],primaryReaction:primary,commentsEnabled:comments});onPublished(post);reset();}
  catch(e){setError(friendlyError(e,'That didn’t publish. Nothing was shared; your words are still here.'));}finally{setBusy(false);}}

 const draft:StreamPost={id,author:{id:me.publicId,username:me.username,displayName:me.displayName,avatarId:me.avatarId},mine:true,kind:source?'activity':'status',body:body.trim(),decoration:source?null:decoration,
  category:source?category:null,sourceKind:source?.kind??null,display,sourceMissing:false,spoiler,createdAt:new Date().toISOString(),editedAt:null,audience,
  members:audience==='selected'?friends.filter(f=>members.includes(f.id)):null,primaryReaction:primary,commentsEnabled:comments,reactionCount:0,reacted:false,commentCount:0};

 if(step==='preview')return <section className="muse-stream-composer muse-panel" aria-label="Preview your post">
  <p className="muse-kicker">Preview · exactly what {audience==='private'?'you':'your audience'} will see</p>
  <StreamPostCard post={draft} preview headingLevel={3}/>
  <p className="muse-stream-audience-line"><MuseIcon name={audience==='private'?'focus':'people'} size={14}/>
   {audience==='private'?'Only you will see this. You can share it later.':audience==='friends'?`Your ${friends.length} friend${friends.length===1?'':'s'} will see this.`:`Only ${draft.members?.map(m=>m.displayName).join(', ')} will see this.`}
   {' '}Friends can {reactions[primary].label} and {comments?'comment':'not comment'}.</p>
  {error&&<p className="field-error" role="alert">{error}</p>}
  <div className="muse-stream-row"><button type="button" className="muse-button button-primary muse-edge" disabled={busy||!!problem} onClick={publish}>{busy?'Publishing…':audience==='private'?'Save to Only me':'Publish'}</button>
   <button type="button" className="muse-button muse-edge" disabled={busy} onClick={()=>setStep('write')}>Back to editing</button>
   {onCancel&&<button type="button" className="text-button" disabled={busy} onClick={onCancel}>Cancel</button>}</div>
 </section>;

 return <section className="muse-stream-composer muse-panel" aria-label="Write a status">
  <div className="muse-stream-composer-head">
   <MuseAvatar id={me.avatarId} size={44} decorative creator={me.creator}/>
   <label className="muse-stream-is"><span>{me.displayName} is…</span>
    <textarea rows={2} maxLength={BODY_MAX} value={body} autoFocus={autoFocus} placeholder={source?'Add your thoughts (optional)':'reading three books and finishing none.'} onChange={e=>setBody(e.target.value)}/></label>
  </div>
  {!source&&<div className="muse-chip-row muse-stream-decorations" role="group" aria-label="Optional flourish">{decorations.map(d=><button key={d.id} type="button" aria-pressed={decoration===d.id} onClick={()=>setDecoration(decoration===d.id?null:d.id)}><span aria-hidden="true">{d.emoji}</span>{d.label}</button>)}</div>}

  <div className="muse-stream-shortcuts" role="group" aria-label="Share a moment from Muse">
   {shortcuts.slice(0,more?shortcuts.length:primaryShortcutCount).map(s=><button key={s.id} type="button" className="muse-stream-shortcut" aria-pressed={category===s.id} onClick={()=>pickShortcut(category===s.id?null:s.id)}><MuseIcon name={s.icon} size={15} treatment="prismatic"/>{s.label}</button>)}
   {!more&&<button type="button" className="muse-stream-shortcut" onClick={()=>setMore(true)}><MuseIcon name="more" size={15}/>More</button>}
  </div>

  {shortcut&&!source&&<div className="muse-stream-picker">
   {!loaded?<p className="small-label" role="status">Opening your {shortcut.label.toLowerCase()}…</p>:candidates.length===0?
    <p className="small-label">Nothing to share here yet. Stream only shares things you have saved, so add one in <Link href={shortcut.home.href}>{shortcut.home.label}</Link> first.</p>:
    <ul aria-label={`Choose from your ${shortcut.label.toLowerCase()}`}>{candidates.slice(0,60).map(c=><li key={`${c.kind}:${c.sourceId}`}><button type="button" onClick={()=>pickSource(c)}>
     {c.image?<img src={c.image} alt="" referrerPolicy="no-referrer"/>:<span className="muse-stream-picker-glyph"><MuseIcon name={(c.glyph as never)||streamAdapters[c.kind].icon} size={16}/></span>}
     <span><strong>{c.title}</strong>{c.subtitle&&<small>{c.subtitle}</small>}</span><small className="muse-stream-picker-group">{c.group}</small></button></li>)}</ul>}
  </div>}

  {source&&adapter&&<div className="muse-stream-consent">
   <div className="muse-stream-row"><p className="small-label"><MuseIcon name="info" size={13}/>{adapter.privacy}</p><button type="button" className="text-button" onClick={()=>{setSource(null);setApproved(null);setTexts({});}}>Choose something else</button></div>
   {sensitiveKinds.includes(source.kind)&&<p className="muse-accent-note">This is personal, so nothing extra is ticked. Choose exactly what to share.</p>}
   <fieldset><legend className="small-label">Share these details</legend><div className="muse-stream-fields">{fieldsFor(source.kind,bundle,source.id).map(f=><label key={f.id} className="muse-atelier-check">
    <input type="checkbox" checked={chosen.includes(f.id)} disabled={f.locked} onChange={e=>setApproved(e.target.checked?[...chosen,f.id]:chosen.filter(x=>x!==f.id))}/>{f.label}</label>)}</div></fieldset>
   {adapter.texts.map(t=><label key={t.id} className="muse-field-label"><span className="small-label">{t.label}</span>
    <textarea rows={2} maxLength={t.max} value={texts[t.id]??''} onChange={e=>setTexts({...texts,[t.id]:e.target.value})}/><small className="muse-atelier-hint">{t.hint}</small>
    {t.seed&&!texts[t.id]&&<button type="button" className="text-button" onClick={()=>setTexts({...texts,[t.id]:(t.seed!(bundle,source.id)).slice(0,t.max)})}>Start from my reflection</button>}</label>)}
   {source.kind==='mood'&&<div className="muse-field-label"><span className="small-label">How friends respond</span>
    <MuseSegmented label="Reaction tone" value={tone} onChange={setTone} options={[{id:'auto',label:`Match my mood (${reactions[autoTone].label})`},{id:'react',label:'Neutral'},{id:'love',label:'Send Love'},{id:'joy',label:'Share Joy'}]}/></div>}
  </div>}

  <div className="muse-stream-composer-foot">
   <MuseSegmented label="Who can see it" value={audience} options={audienceOptions.map(a=>({id:a.id,label:a.label}))} onChange={setAudience}/>
   <p className="small-label">{audienceOptions.find(a=>a.id===audience)?.detail}</p>
   {audience==='selected'&&<FriendPicker value={members} onChange={setMembers}/>}
   <div className="muse-stream-row">
    {(source||category)&&<label className="muse-atelier-check"><input type="checkbox" checked={spoiler} onChange={e=>setSpoiler(e.target.checked)}/>Contains spoilers</label>}
    <label className="muse-atelier-check"><input type="checkbox" checked={comments} onChange={e=>setComments(e.target.checked)}/>Allow comments</label>
   </div>
   {problem&&(body||source||category)&&<p className="small-label" role="status">{problem}</p>}
   <div className="muse-stream-row"><button type="button" className="muse-button button-primary muse-edge" disabled={!!problem||!loaded&&!!source} onClick={()=>setStep('preview')}>Preview</button>
    {(onCancel||body||source)&&<button type="button" className="text-button" onClick={()=>{reset();onCancel?.();}}>Cancel</button>}</div>
  </div>
 </section>;
}
