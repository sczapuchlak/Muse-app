'use client';
import {useEffect,useState} from 'react';
import type {AstrologyReference,CosmicJournalEntry} from '@/lib/astrology/models';
import {dateLabel} from '@/lib/dates';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {MuseSearch} from '@/components/design/MuseSearch';
import {MuseHeading,MuseMark,type MuseMarkIcon,type MuseTone} from '@/components/design/MuseHeading';
import {MuseInviteCard,MuseJournalStats,sparkle} from '@/components/design/MuseJournal';
import {forecastPeriodLabel,parseForecastReferenceId} from '@/lib/astrology/forecast-reference';

type Kind=AstrologyReference['type'];
/** What a reflection is about: one mark, tone and plain name per kind. */
export const journalKinds:Record<Kind,{icon:MuseMarkIcon;tone:MuseTone;label:string}>={reflection:{icon:'quill',tone:3,label:'Personal reflection'},forecast:{icon:'crescent',tone:5,label:'Horoscope'},placement:{icon:'planet',tone:1,label:'Chart placement'},event:{icon:'comet',tone:7,label:'Celestial event'},library:{icon:'openbook',tone:6,label:'Library entry'}};
const kindOf=(entry:{reference:AstrologyReference|null})=>journalKinds[entry.reference?.type??'reflection'];
/** The context line under a reflection: for a horoscope, the exact period it was written under. */
function referenceContext(reference:AstrologyReference|null){if(!reference)return '';if(reference.type==='forecast'){const parts=parseForecastReferenceId(reference.id);return parts?`${reference.title} · ${forecastPeriodLabel(parts)}`:reference.title;}return reference.title;}
const dayParts=(date:string)=>{const d=new Date(`${date}T12:00:00Z`),f=(o:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('en-US',{...o,timeZone:'UTC'}).format(d);return {day:f({day:'numeric'}),month:f({month:'short'}),year:f({year:'numeric'}),weekday:f({weekday:'long'})};};
export type JournalDraft={id:string;revision:number;date:string;time_zone:string;title:string;text:string;reference:AstrologyReference|null};
export function JournalEditor({initial,busy,savedRevision,onSave,onCancel}:{initial:JournalDraft;busy:boolean;savedRevision:number;onSave:(draft:JournalDraft)=>Promise<void>;onCancel:()=>void}){
 const [draft,setDraft]=useState(initial),[dirty,setDirty]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 function change(patch:Partial<JournalDraft>){setDraft({...draft,...patch});setDirty(true);}
 const kind=kindOf(draft);
 return <form className="muse-cosmic-editor" onSubmit={async event=>{event.preventDefault();setError('');try{await onSave(draft);}catch(error){setError(error instanceof Error?error.message:'Your reflection is kept here. Retry saving.');}}}>
  <MuseHeading icon={kind.icon} tone={kind.tone} level={3} title={savedRevision?'Edit your reflection':'A new reflection'} description="Private to you. Horoscope text is never copied here; only your own words and a link to what prompted them."/>
  {error&&<p role="alert">{error}</p>}{savedRevision!==draft.revision&&<p role="alert">This entry changed elsewhere. Your draft is kept; close it only when you have copied any changes you want to keep, then reopen the saved version.</p>}
  <fieldset disabled={busy}><legend className="sr-only">Reflection</legend>
   {draft.reference&&<div className="muse-cosmic-editor-context"><MuseMark icon={kind.icon} tone={kind.tone} size="sm" variant="soft"/><div><strong>{referenceContext(draft.reference)}</strong><small>Linked {kind.label.toLowerCase()}{draft.reference.type!=='forecast'&&draft.reference.date?` · ${dateLabel(draft.reference.date)}`:''}</small></div><button type="button" className="text-button" onClick={()=>change({reference:null})}>Unlink</button></div>}
   <label className="muse-cosmic-editor-title"><span className="sr-only">Title (optional)</span><input maxLength={160} value={draft.title} placeholder="Give it a title, if you like" onChange={event=>change({title:event.target.value})}/></label>
   <label className="muse-cosmic-editor-page"><span className="sr-only">Your reflection</span><textarea rows={8} maxLength={10000} required={!draft.reference} value={draft.text} placeholder="What did the sky bring to mind?" onChange={event=>change({text:event.target.value})}/></label>
   <label className="muse-cosmic-editor-date"><span>Journal date</span><input type="date" required value={draft.date} onChange={event=>change({date:event.target.value})}/><small>Kept in {draft.time_zone}</small></label>
  </fieldset>
  <div className="muse-cosmic-actions"><button type="submit" className="muse-button button-primary" disabled={busy||savedRevision!==draft.revision||!draft.text.trim()&&!draft.reference}>{busy?'Saving…':'Save reflection'}</button><button type="button" className="muse-button button-ghost" disabled={busy} onClick={()=>{if(!dirty||window.confirm('Close this unfinished reflection without saving?'))onCancel();}}>Cancel</button></div>
 </form>;
}
export function CosmicJournal({entries,onNew,onOpen}:{entries:CosmicJournalEntry[];onNew:()=>void;onOpen:(entry:CosmicJournalEntry)=>void}){
 const [query,setQuery]=useState(''),[type,setType]=useState(''),[sort,setSort]=useState('recent');
 const q=query.trim().toLocaleLowerCase(),filtered=entries.filter(entry=>(!type||(entry.reference?.type??'reflection')===type)&&(!q||[entry.title,entry.text,entry.reference?.title??''].join(' ').toLocaleLowerCase().includes(q))).sort((a,b)=>sort==='oldest'?a.date.localeCompare(b.date)||a.created_at.localeCompare(b.created_at):b.date.localeCompare(a.date)||b.created_at.localeCompare(a.created_at));
 const thisMonth=entries.filter(entry=>entry.date.slice(0,7)===new Date().toISOString().slice(0,7)).length,horoscopes=entries.filter(entry=>entry.reference?.type==='forecast').length;
 return <div className="muse-journal muse-cosmic-journal">
  <section className="muse-journal-hero muse-cosmic-journal-hero" aria-labelledby="cosmic-journal-title">
   <div className="muse-journal-hero-copy">
    <p className="muse-kicker">Cosmic Journal</p>
    <h3 id="cosmic-journal-title" className="muse-journal-title">What the sky brings to mind</h3>
    <p>A horoscope line that landed, a placement you are still thinking about, a moon you want to remember. Private, and only ever in your own words.</p>
    {entries.length>0&&<MuseJournalStats items={[{label:'Reflections',value:entries.length},{label:'On horoscopes',value:horoscopes},{label:'This month',value:thisMonth}]}/>}
    <div className="muse-journal-actions"><button type="button" className="muse-button button-primary" onClick={onNew}>{entries.length?'New reflection':'Write the first reflection'}</button></div>
   </div>
   <JournalArt/>
  </section>
  <section className="muse-journal-archive muse-cosmic-journal-archive" aria-label="Your reflections">
   <div className="muse-cosmic-toolbar"><MuseSearch label="Search reflections" value={query} onChange={setQuery} placeholder="Search your reflections…"/><MuseChoiceMenu label="Linked item" valueLabel={{"":"All reflections",reflection:"Personal reflection",placement:"Chart placement",event:"Celestial event",library:"Library entry",forecast:"Horoscope"}[type]??"All reflections"} options={[{id:"",label:"All reflections"},{id:"reflection",label:"Personal reflection"},{id:"placement",label:"Chart placement"},{id:"event",label:"Celestial event"},{id:"library",label:"Library entry"},{id:"forecast",label:"Horoscope"}]} selectedIds={[type]} onSelect={setType}/><MuseChoiceMenu label="Sort" valueLabel={sort==='recent'?'Newest date first':'Oldest date first'} options={[{id:"recent",label:"Newest date first"},{id:"oldest",label:"Oldest date first"}]} selectedIds={[sort]} onSelect={setSort}/></div><p className="small-label" role="status">{filtered.length} {filtered.length===1?'reflection':'reflections'}</p>
  
   <div className="muse-cosmic-journal-grid">{filtered.map(entry=>{const kind=kindOf(entry),d=dayParts(entry.date),context=referenceContext(entry.reference);return <button type="button" className="muse-cosmic-journal-card" data-kind={entry.reference?.type??'reflection'} key={entry.id} onClick={()=>onOpen(entry)} style={{'--mark-a':`var(--chart-${kind.tone})`} as React.CSSProperties}>
   <span className="muse-cosmic-journal-date" aria-hidden="true"><b>{d.day}</b><i>{d.month}</i><small>{d.year}</small></span>
   <span className="muse-cosmic-journal-body"><span className="muse-cosmic-journal-kind"><MuseMark icon={kind.icon} tone={kind.tone} size="sm"/>{kind.label}<span className="sr-only"> · {dateLabel(entry.date)}</span></span>
    <strong>{entry.title||(entry.reference?entry.reference.title:'A moment under the sky')}</strong>
    {context&&entry.title&&<span className="muse-cosmic-journal-context">{context}</span>}{context&&!entry.title&&entry.reference?.type==='forecast'&&<span className="muse-cosmic-journal-context">{context.split(' · ').slice(2).join(' · ')}</span>}
    {entry.text?<span className="muse-cosmic-journal-preview">{entry.text}</span>:<span className="muse-cosmic-journal-preview" data-empty>Saved to remember. Add a few words whenever you like.</span>}
    <span className="muse-cosmic-journal-foot">{d.weekday}<span aria-hidden="true">Open →</span></span></span></button>;})}{!q&&!type&&filtered.length>0&&<MuseInviteCard count={filtered.length} title="New reflection" note="A horoscope line that landed, a placement, a moon." cta="Write" art={<QuillArt/>} onClick={onNew}/>}</div>
  
   {!filtered.length&&<div className="muse-journal-empty-row"><span className="muse-journal-empty-art" aria-hidden="true"><MuseMark icon="crescent" tone={5} size="md"/><MuseMark icon="quill" tone={3} size="md"/><MuseMark icon="comet" tone={7} size="md"/></span>
    <div><h4>{entries.length?'No matching reflections':'The first page is still blank.'}</h4><p>{entries.length?'Try a different search or filter.':'Keep a thought, a horoscope line that landed, a placement, or a moon you want to remember.'}</p></div></div>}
  </section>
 </div>;
}
/** An open journal under a crescent with a short trail of stars. Decorative. */
function JournalArt(){
 return <div className="muse-journal-art" aria-hidden="true"><svg viewBox="0 0 260 200">
  <path className="muse-journal-art-trail" d="M24 150C70 90 120 70 196 42"/>
  <circle className="muse-journal-art-dot" cx="24" cy="150" r="2"/><circle className="muse-journal-art-dot" cx="96" cy="86" r="1.6"/><circle className="muse-journal-art-dot" cx="150" cy="60" r="2.2"/>
  <path className="muse-journal-art-moon" d="M212 22a26 26 0 1 0 22 40a22 22 0 1 1-22-40Z"/>
  <path className="muse-journal-art-book" d="M60 176c26-12 50-12 70 0c20-12 44-12 70 0v-62c-26-12-50-12-70 0c-20-12-44-12-70 0Z"/>
  <path className="muse-journal-art-line" d="M130 114v62M76 132c16-6 30-6 44 0M76 146c16-6 30-6 44 0M140 132c16-6 30-6 44 0M140 146c16-6 30-6 44 0"/>
  <path className="muse-journal-art-star" d={sparkle(150,95,13)}/>
  <path className="muse-journal-art-twinkle" d={sparkle(58,70,5)}/><path className="muse-journal-art-twinkle" d={sparkle(236,110,4)}/>
 </svg></div>;
}
/** The invite card's drawing: a quill writing a trail of stars over a small open page. Decorative. */
function QuillArt(){
 return <svg viewBox="0 0 220 112">
  <path className="muse-journal-art-book" d="M54 100c18-8 36-8 56 0c20-8 38-8 56 0V62c-18-8-36-8-56 0c-20-8-38-8-56 0Z"/>
  <path className="muse-journal-art-line" d="M110 62v38M66 76c12-4 22-4 34 0M66 86c12-4 22-4 34 0M120 76c12-4 22-4 34 0"/>
  <g className="muse-journal-invite-float"><path className="muse-journal-art-cloud" d="M150 66C160 40 182 16 206 8C198 30 180 54 156 70Z"/><path className="muse-journal-art-line" d="M152 68L196 16"/></g>
  <path className="muse-journal-art-trail" d="M150 70C130 58 116 40 92 34"/>
  <path className="muse-journal-art-twinkle" d={sparkle(84,30,7)}/><path className="muse-journal-art-twinkle" d={sparkle(40,40,4)}/><path className="muse-journal-art-twinkle" d={sparkle(186,52,4)}/>
 </svg>;
}
export function JournalDetail({entry,onEdit,onDelete,onReference}:{entry:CosmicJournalEntry;onEdit:()=>void;onDelete:()=>void;onReference:(reference:AstrologyReference)=>void}){
 const kind=kindOf(entry),context=referenceContext(entry.reference);
 return <article className="muse-cosmic-entry muse-cosmic-journal-detail">
  <header><MuseMark icon={kind.icon} tone={kind.tone} size="lg"/><div><p className="muse-kicker">{kind.label} · {dateLabel(entry.date)}</p><h3>{entry.title||entry.reference?.title||'A moment under the sky'}</h3></div></header>
  {entry.reference&&<div className="muse-cosmic-editor-context"><MuseMark icon={kind.icon} tone={kind.tone} size="sm" variant="soft"/><div><strong>{context}</strong>{entry.reference.instant&&<small>{new Date(entry.reference.instant).toLocaleString(undefined,{timeZone:entry.time_zone,dateStyle:'full',timeStyle:'short'})}</small>}</div><button type="button" className="text-button" onClick={()=>onReference(entry.reference!)}>{entry.reference.type==='forecast'?'About this forecast':`Open ${kind.label.toLowerCase()}`}</button></div>}
  <p className="muse-cosmic-journal-text">{entry.text||'A saved reference, with room for a reflection whenever you like.'}</p>
  <p className="small-label">Saved {new Date(entry.created_at).toLocaleString(undefined,{timeZone:entry.time_zone})} · Updated {new Date(entry.updated_at).toLocaleString(undefined,{timeZone:entry.time_zone})} · {entry.time_zone}</p>
  <div className="muse-cosmic-actions"><button type="button" className="muse-button button-primary" onClick={onEdit}>Edit reflection</button><button type="button" className="muse-button button-ghost" onClick={onDelete}>Remove reflection</button></div>
 </article>;
}
