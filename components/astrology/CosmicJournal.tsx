'use client';
import {useEffect,useState} from 'react';
import type {AstrologyReference,CosmicJournalEntry} from '@/lib/astrology/models';
import {dateLabel} from '@/lib/dates';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {MuseSearch} from '@/components/design/MuseSearch';
import {MuseHeading,MuseMark,type MuseMarkIcon,type MuseTone} from '@/components/design/MuseHeading';
import {MuseEmptyState} from '@/components/design/MuseEmptyState';
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
 return <section className="muse-cosmic-section muse-cosmic-journal"><div className="muse-cosmic-section-head"><MuseHeading icon="journal" tone={3} size="lg" level={3} title="Cosmic Journal" description="A little space for what the sky brings to mind." aside={<button type="button" className="muse-button button-primary" onClick={onNew}>New reflection</button>}/></div><div className="muse-cosmic-toolbar"><MuseSearch label="Search reflections" value={query} onChange={setQuery} placeholder="Search your reflections…"/><MuseChoiceMenu label="Linked item" valueLabel={{"":"All reflections",reflection:"Personal reflection",placement:"Chart placement",event:"Celestial event",library:"Library entry",forecast:"Horoscope"}[type]??"All reflections"} options={[{id:"",label:"All reflections"},{id:"reflection",label:"Personal reflection"},{id:"placement",label:"Chart placement"},{id:"event",label:"Celestial event"},{id:"library",label:"Library entry"},{id:"forecast",label:"Horoscope"}]} selectedIds={[type]} onSelect={setType}/><MuseChoiceMenu label="Sort" valueLabel={sort==='recent'?'Newest date first':'Oldest date first'} options={[{id:"recent",label:"Newest date first"},{id:"oldest",label:"Oldest date first"}]} selectedIds={[sort]} onSelect={setSort}/></div><p className="small-label" role="status">{filtered.length} {filtered.length===1?'reflection':'reflections'}</p>
  <div className="muse-cosmic-journal-grid">{filtered.map(entry=>{const kind=kindOf(entry),d=dayParts(entry.date),context=referenceContext(entry.reference);return <button type="button" className="muse-cosmic-journal-card" data-kind={entry.reference?.type??'reflection'} key={entry.id} onClick={()=>onOpen(entry)} style={{'--mark-a':`var(--chart-${kind.tone})`} as React.CSSProperties}>
   <span className="muse-cosmic-journal-date" aria-hidden="true"><b>{d.day}</b><i>{d.month}</i><small>{d.year}</small></span>
   <span className="muse-cosmic-journal-body"><span className="muse-cosmic-journal-kind"><MuseMark icon={kind.icon} tone={kind.tone} size="sm"/>{kind.label}<span className="sr-only"> · {dateLabel(entry.date)}</span></span>
    <strong>{entry.title||(entry.reference?entry.reference.title:'A moment under the sky')}</strong>
    {context&&entry.title&&<span className="muse-cosmic-journal-context">{context}</span>}{context&&!entry.title&&entry.reference?.type==='forecast'&&<span className="muse-cosmic-journal-context">{context.split(' · ').slice(2).join(' · ')}</span>}
    {entry.text?<span className="muse-cosmic-journal-preview">{entry.text}</span>:<span className="muse-cosmic-journal-preview" data-empty>Saved to remember. Add a few words whenever you like.</span>}
    <span className="muse-cosmic-journal-foot">{d.weekday}<span aria-hidden="true">Open →</span></span></span></button>;})}</div>
  {!filtered.length&&(entries.length?<MuseEmptyState variant="quiet" title="No matching reflections">Try a different search or filter.</MuseEmptyState>:<MuseEmptyState className="muse-cosmic-journal-empty" glyph={<span className="muse-cosmic-journal-empty-art"><MuseMark icon="crescent" tone={5} size="lg"/><MuseMark icon="quill" tone={3} size="lg"/><MuseMark icon="comet" tone={7} size="lg"/></span>} title="The first page is still blank." action={<button type="button" className="muse-button button-primary" onClick={onNew}>Write a reflection</button>}>Keep a thought, a horoscope line that landed, a placement, or a moon you want to remember.</MuseEmptyState>)}
 </section>;
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
