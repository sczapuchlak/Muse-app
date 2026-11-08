'use client';
/* eslint-disable @next/next/no-img-element -- covers are the person's own external HTTPS URLs, as elsewhere in Collections. */
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {MuseModal} from '@/components/MuseModal';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {canonicalItems,completed,seriesProgress,type Series,type SeriesMember} from '@/lib/collections/models';
import {deleteSeries,deleteSeriesMember,saveSeries,saveSeriesMember} from '@/lib/collections/persistence';
import {useWhimsyData} from '@/components/whimsy/WhimsyData';
import {BookCover} from '@/components/whimsy/Bookshelf';
import {collectionsChanged,useCollectionsData} from './CollectionsData';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {MuseIconButton} from '@/components/MuseIconButton';
import {MuseIcon} from '@/components/MuseIcon';
import {GlassPopover} from '@/components/GlassPopover';
import {Bookshelf} from '@/components/whimsy/Bookshelf';
import './Series.css';

type Form={id:string;revision:number;title:string;kind:string;description:string;coverUrl:string;scope:string;conclusionState:string};
type MemberForm={id:string;revision:number;itemId:string;sequence:string;role:string;releaseState:string};
const blank=():Form=>({id:crypto.randomUUID(),revision:0,title:'',kind:'book',description:'',coverUrl:'',scope:'released',conclusionState:'unknown'});
const fromSeries=(row:Series):Form=>({id:row.id,revision:row.revision,title:row.title,kind:row.kind,description:row.description,coverUrl:row.cover_url??'',scope:row.scope,conclusionState:row.conclusion_state});
const memberForm=(row:SeriesMember):MemberForm=>({id:row.id,revision:row.revision,itemId:row.book_id??row.media_id??'',sequence:String(row.sequence),role:row.role,releaseState:row.release_state});

const plural=(n:number,one:string,many=`${one}s`)=>`${n} ${n===1?one:many}`;
const kindNoun:Record<string,[string,string]>={book:['book','books'],movie:['movie','movies'],tv:['show','shows'],game:['game','games'],mixed:['installment','installments']};
const itemHref=(item:{kind:string;id:string})=>`/collections?view=${item.kind==='book'?'books':item.kind==='movie'?'movies':item.kind==='tv'?'tv':item.kind==='album'?'music':'games'}&${item.kind==='book'?'book':'item'}=${item.id}`;
const roleOptions=[{id:'mainline',label:'Mainline'},{id:'optional',label:'Optional'},{id:'spin-off',label:'Spin-off'}];
const releaseOptions=[{id:'released',label:'Released'},{id:'announced',label:'Announced'},{id:'unknown',label:'Unknown'}];
const kindOptions=[{id:'book',label:'Books'},{id:'movie',label:'Movies'},{id:'tv',label:'TV Shows'},{id:'game',label:'Games'},{id:'mixed',label:'Mixed universe'}];
const scopeOptions=[{id:'released',label:'Released mainline installments'},{id:'announced',label:'Released and announced mainline installments'},{id:'selected',label:'Selected mainline installments'}];
const conclusionOptions=[{id:'unknown',label:'Unknown'},{id:'ongoing',label:'Ongoing'},{id:'concluded',label:'Concluded'}];
const label=(list:{id:string;label:string}[],id:string)=>list.find(o=>o.id===id)?.label??id;

/**
 * Series & franchises (#104 §2): a clear header (title, author, scope, progress), "Next up", and compact installment
 * rows. Books can be created right here through the normal Add Book flow and join the series on save, or an existing
 * saved item can be connected. Relationship-removing actions ask first.
 */
export function SeriesLibrary({initialAdd=false,initialSeriesId=null}:{initialAdd?:boolean;initialSeriesId?:string|null}={}){
 const {records,userId,loaded,error:loadError,retry}=useCollectionsData(),{records:whimsy}=useWhimsyData(),books=whimsy?.books??[],items=canonicalItems(books,records.media),client=useMemo(()=>createMuseBrowserClient(),[]);
 const [selected,setSelected]=useState<string|null>(initialSeriesId),[form,setForm]=useState<Form|null>(null),[member,setMember]=useState<MemberForm|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [addOpen,setAddOpen]=useState(false),[creating,setCreating]=useState(false),[detaching,setDetaching]=useState<string|null>(null),addAnchor=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!initialAdd)return;const timer=window.setTimeout(()=>setForm(blank()),0);return()=>window.clearTimeout(timer);},[initialAdd]);
 function selectSeries(id:string|null){setSelected(id);setMember(null);const params=new URLSearchParams(window.location.search);params.delete('add');if(id)params.set('series',id);else params.delete('series');window.history.pushState(null,'',`/collections?${params}`);}
 const series=records.series.find(row=>row.id===selected),members=records.seriesMembers.filter(row=>row.series_id===selected).sort((a,b)=>a.sequence-b.sequence),progress=series?seriesProgress(series,records.seriesMembers,books,records.media):null;
 const seriesAuthor=series?[...new Set(members.map(row=>items.find(i=>i.id===(row.book_id??row.media_id))?.creator).filter(Boolean))].join(', '):'';
 const nextSequence=members.length?Math.floor(Math.max(...members.map(m=>m.sequence)))+1:1;
 const [one,many]=kindNoun[series?.kind??'mixed']??kindNoun.mixed;
 async function persist(){if(!form||busy)return;setBusy(true);setError('');try{if(!form.title.trim())throw Error('Add a series title.');if(form.coverUrl&&!form.coverUrl.startsWith('https://'))throw Error('Use an HTTPS cover URL.');const saved=await saveSeries(client,{id:form.id,user_id:userId,title:form.title.trim(),kind:form.kind,description:form.description.trim(),cover_url:form.coverUrl||null,scope:form.scope,conclusion_state:form.conclusionState},form.revision);selectSeries(saved.id);setForm(null);setMessage('Series saved.');collectionsChanged();await retry();}catch(cause){setError(cause instanceof Error?cause.message:'Series could not be saved.');}finally{setBusy(false);}}
 async function remove(row:Series){if(!window.confirm(`Remove ${row.title} as a series? Its books and media stay in your library.`))return;setBusy(true);setError('');try{await deleteSeries(client,userId,row.id,row.revision);selectSeries(null);setMessage('Series removed. Its items remain saved.');collectionsChanged();await retry();}catch(cause){setError(cause instanceof Error?cause.message:'Series could not be removed.');}finally{setBusy(false);}}
 async function persistMember(){if(!series||!member||busy)return;setBusy(true);setError('');try{const item=items.find(item=>item.id===member.itemId);if(!item)throw Error('Choose a saved item.');if(!Number.isFinite(Number(member.sequence))||Number(member.sequence)<0)throw Error('Use a reading order of 0 or more.');await saveSeriesMember(client,{id:member.id,user_id:userId,series_id:series.id,book_id:item.kind==='book'?item.id:null,media_id:item.kind==='book'?null:item.id,sequence:Number(member.sequence),role:member.role,release_state:member.releaseState},member.revision);setMember(null);setMessage('Installment saved.');collectionsChanged();await retry();}catch(cause){setError(cause instanceof Error?cause.message:'Installment could not be saved.');}finally{setBusy(false);}}
 async function removeMember(row:SeriesMember){setBusy(true);setError('');try{await deleteSeriesMember(client,userId,row.id,row.revision);setDetaching(null);setMessage('Installment detached. The item remains saved.');collectionsChanged();await retry();}catch(cause){setError(cause instanceof Error?cause.message:'Installment could not be detached.');}finally{setBusy(false);}}
 const linked=new Set(members.map(m=>m.book_id??m.media_id));
 const eligible=series?items.filter(item=>(series.kind==='mixed'||item.kind===series.kind)&&(!linked.has(item.id)||item.id===member?.itemId)):[];
 const coverFor=(row:SeriesMember)=>items.find(i=>i.id===(row.book_id??row.media_id));
 const heroCover=series?.cover_url||members.map(coverFor).find(i=>i?.coverUrl)?.coverUrl||null;

 const memberEditor=member&&series&&<form className="muse-series-member-form" onSubmit={event=>{event.preventDefault();void persistMember();}}>
  <div className="muse-series-member-fields">
   <span className="editor-label">Saved item<MuseChoiceMenu label="Saved item" searchable valueLabel={items.find(i=>i.id===member.itemId)?.title??'Choose an item'} options={eligible.map(item=>({id:item.id,label:`${item.title}${item.creator?` · ${item.creator}`:''}`}))} selectedIds={[member.itemId]} onSelect={id=>setMember({...member,itemId:id})} emptyLabel="No other saved items of this type."/></span>
   <label className="editor-label">Order<input type="number" min="0" step="0.01" required value={member.sequence} onChange={event=>setMember({...member,sequence:event.target.value})}/></label>
   <span className="editor-label">Role<MuseChoiceMenu label="Role" valueLabel={label(roleOptions,member.role)} options={roleOptions} selectedIds={[member.role]} onSelect={id=>setMember({...member,role:id})}/></span>
   <span className="editor-label">Release<MuseChoiceMenu label="Release state" valueLabel={label(releaseOptions,member.releaseState)} options={releaseOptions} selectedIds={[member.releaseState]} onSelect={id=>setMember({...member,releaseState:id})}/></span>
  </div>
  <div className="muse-collections-actions"><button type="submit" className="muse-button button-primary" disabled={busy||!member.itemId}>{member.revision?'Save':'Connect'}</button><button type="button" className="muse-button button-ghost" onClick={()=>setMember(null)}>Cancel</button></div>
 </form>;

 return <section className="muse-collections-series" aria-label="Series and franchises">
  {!series&&<div className="muse-collections-toolbar"><div><h2>Series & franchises</h2><p>Order the installments that matter to you. Progress follows the saved items.</p></div><button type="button" className="muse-button button-primary" onClick={()=>setForm(blank())}>+ Create series</button></div>}
  {!loaded?<p role="status">{loadError||'Loading your series…'}</p>:series&&progress?<div className="muse-series-detail">
   <button type="button" className="text-button muse-series-back" onClick={()=>selectSeries(null)}>← All series</button>
   <header className="muse-series-hero">
    <div className="muse-series-hero-cover" aria-hidden="true">{heroCover?<img src={heroCover} alt=""/>:<span>✧</span>}</div>
    <div className="muse-series-hero-text">
     <p className="muse-series-eyebrow">{({book:'Book',movie:'Movie',tv:'TV',game:'Game',mixed:'Mixed'} as Record<string,string>)[series.kind]??series.kind} series · {series.conclusion_state==='unknown'?'status unknown':series.conclusion_state}</p>
     <h3>{series.title}</h3>
     {seriesAuthor&&<p className="muse-series-author">{seriesAuthor}</p>}
     {series.description&&<p className="muse-series-description">{series.description}</p>}
     <div className="muse-series-progress">
      <div className="muse-collections-progress" role="meter" aria-label="Series progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.percentage??0)}><span style={{width:`${progress.percentage??0}%`}}/></div>
      <p><strong>{progress.completed} of {plural(progress.availableTotal,one,many)}</strong> {series.kind==='book'?'read':'done'}{progress.total>progress.availableTotal?` · ${progress.total-progress.availableTotal} announced`:''} · <span className="muse-series-status" data-status={progress.status}>{progress.status.replace(/-/g,' ')}</span></p>
     </div>
    </div>
    <div className="muse-series-hero-actions"><MuseIconButton icon="edit" label="Edit series" onClick={()=>setForm(fromSeries(series))}/><MuseIconButton icon="trash" label="Remove series" disabled={busy} onClick={()=>void remove(series)}/></div>
   </header>
   {progress.next?<Link className="muse-series-next" href={itemHref(progress.next)}><span className="muse-series-next-label">Next up</span><strong>{progress.next.title}</strong>{(()=>{const at=members.find(m=>(m.book_id??m.media_id)===progress.next!.id)?.sequence??0;return progress.missing.some(n=>n<at)&&<small>An earlier number isn’t entered yet</small>;})()}<MuseIcon name="chevron" size={14}/></Link>
    :members.length>0&&progress.status!=='completed'&&<p className="muse-series-next" data-empty>{progress.availableTotal?'Every entered installment is done.':'No released installments entered yet.'}</p>}
   {progress.missing.length>0&&<p className="small-label muse-series-gaps">Not entered yet: #{progress.missing.slice(0,8).join(', #')}{progress.missing.length>8?'…':''}. Muse only counts what you’ve added.</p>}
   <div className="muse-series-installments-head"><h4>Installments <span className="small-label">{plural(members.length,'entry','entries')}</span></h4>
    <button ref={addAnchor} type="button" className="muse-button button-primary" aria-haspopup="menu" aria-expanded={addOpen} onClick={()=>setAddOpen(v=>!v)}>+ Add {series.kind==='book'?'Book':one}</button>
    <GlassPopover id="series-add-menu" label={`Add to ${series.title}`} open={addOpen} anchorRef={addAnchor} onClose={()=>setAddOpen(false)} width={260} bare>
     <div className="popover-choice-list">
      {series.kind==='book'&&<button type="button" className="popover-choice" onClick={()=>{setAddOpen(false);setCreating(true);}}><span><MuseIcon name="plus" size={14}/> Create new book</span></button>}
      <button type="button" className="popover-choice" onClick={()=>{setAddOpen(false);setMember({id:crypto.randomUUID(),revision:0,itemId:'',sequence:String(nextSequence),role:'mainline',releaseState:'released'});}}><span><MuseIcon name="link" size={14}/> Connect existing {series.kind==='book'?'book':'item'}</span></button>
     </div>
    </GlassPopover>
   </div>
   {member&&!member.revision&&memberEditor}
   {members.length?<ol className="muse-series-rows">{members.map(row=>{const item=coverFor(row);return <li key={row.id} className="muse-series-row" data-role={row.role}>
     <span className="muse-series-order">{row.sequence}</span>
     <span className="muse-series-thumb" aria-hidden="true">{item?.book?<BookCover book={item.book}/>:item?.coverUrl?<img src={item.coverUrl} alt=""/>:<span>✧</span>}</span>
     <span className="muse-series-row-text"><strong>{item?<Link href={itemHref(item)}>{item.title}</Link>:'Item unavailable'}</strong>
      <span className="muse-series-row-meta"><span className="muse-series-chip" data-status={item&&completed(item)?'done':item?.status}>{item?.status?.replace(/-/g,' ')??'unknown'}</span>{row.role!=='mainline'&&<span className="muse-series-chip">{row.role}</span>}{row.release_state!=='released'&&<span className="muse-series-chip" data-kind="release">{row.release_state}</span>}{item?.rating?<span>{'★'.repeat(item.rating)}</span>:null}</span></span>
     <span className="muse-series-row-actions">{detaching===row.id?<span className="muse-mark-confirm" role="group" aria-label="Confirm detaching">Detach?<button type="button" className="text-button" disabled={busy} onClick={()=>void removeMember(row)}>Detach</button><button type="button" className="text-button" onClick={()=>setDetaching(null)}>Keep</button></span>:<>
      <MuseIconButton icon="edit" label={`Edit ${item?.title??'installment'}`} onClick={()=>setMember(memberForm(row))}/><MuseIconButton icon="close" label={`Detach ${item?.title??'installment'} from the series`} onClick={()=>setDetaching(row.id)}/></>}</span>
     {member?.id===row.id&&<div className="muse-series-row-editor">{memberEditor}</div>}
    </li>;})}</ol>:<div className="muse-empty-state" data-variant="quiet"><p>No installments yet. Add a book or connect a saved item; nothing missing is invented.</p></div>}
   {creating&&whimsy&&<Bookshelf embedded initialAdd linkSeries={{id:series.id,userId,sequence:nextSequence,onCancel:()=>setCreating(false),onLinked:()=>{setCreating(false);setMessage('Book added and joined the series.');collectionsChanged();void retry();}}}/>}
  </div>:records.series.length?<div className="muse-collections-grid">{records.series.map(row=>{const summary=seriesProgress(row,records.seriesMembers,books,records.media);return <button type="button" className="muse-collections-card" key={row.id} onClick={()=>selectSeries(row.id)}><span className="muse-collections-series-symbol" aria-hidden="true">✧</span><span className="small-label">{row.kind} series</span><strong>{row.title}</strong><span>{summary.completed}/{summary.availableTotal} done · {summary.status.replace(/-/g,' ')}</span></button>;})}</div>:<div className="muse-empty-state muse-collections-empty" data-variant="editorial"><h3>No series yet.</h3><p>Create one from saved books, movies, shows, or games. You choose the order and scope.</p></div>}
  {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
  {form&&<MuseModal id="collection-series-editor" label="Series editor" title={form.revision?'Edit series':'Create series'} returnFocus={null} onClose={()=>setForm(null)}><form className="muse-collections-dialog" onSubmit={event=>{event.preventDefault();void persist();}}>
   <label>Series title<input required value={form.title} onChange={event=>setForm({...form,title:event.target.value})}/></label>
   <div className="muse-collections-form-grid"><span className="editor-label">Media type<MuseChoiceMenu label="Media type" valueLabel={label(kindOptions,form.kind)} options={kindOptions} selectedIds={[form.kind]} onSelect={id=>setForm({...form,kind:id})}/></span><span className="editor-label">Progress scope<MuseChoiceMenu label="Progress scope" valueLabel={label(scopeOptions,form.scope)} options={scopeOptions} selectedIds={[form.scope]} onSelect={id=>setForm({...form,scope:id})}/></span></div>
   <span className="editor-label">Series conclusion<MuseChoiceMenu label="Series conclusion" valueLabel={label(conclusionOptions,form.conclusionState)} options={conclusionOptions} selectedIds={[form.conclusionState]} onSelect={id=>setForm({...form,conclusionState:id})}/></span>
   <label>Description<textarea value={form.description} onChange={event=>setForm({...form,description:event.target.value})}/></label>
   <label>Representative cover HTTPS URL<input type="url" value={form.coverUrl} onChange={event=>setForm({...form,coverUrl:event.target.value})}/></label>
   {error&&<p role="alert">{error}</p>}
   <div className="muse-collections-actions"><button type="submit" className="muse-button button-primary" disabled={busy}>Save series</button><button type="button" className="muse-button button-ghost" onClick={()=>setForm(null)}>Cancel</button></div></form></MuseModal>}
 </section>;
}
