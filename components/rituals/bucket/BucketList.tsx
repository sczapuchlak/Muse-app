'use client';
import {useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {MuseIcon} from '../../MuseIcon';
import {MuseChoiceMenu} from '../../MuseChoiceMenu';
import {GlassPopover} from '../../GlassPopover';
import {celebrate} from '@/lib/celebrate';
import {pickLine} from '@/lib/celebration-copy';
import type {Aspiration} from '@/lib/aspirations/models';
import {statusLabels,type BucketEntry,type BucketStatus} from '@/lib/bucket-list/models';
import {activeFilterCount,allCategories,allTags,bucketSorts,bucketStats,byPosition,emptyFilter,legendYears,matches,moveEntry,nextNumber,nextPosition,reopenEntry,shortYear,sortEntries,timeline,type BucketFilter,type BucketSort} from '@/lib/bucket-list/logic';
import {useAspirations} from '../aspirations/useAspirations';
import {blankAspiration} from '../aspirations/AspirationEditor';
import {useBucketList} from './useBucketList';
import {BucketEditor,BucketSettings,CompleteSheet,blankEntry} from './BucketEditor';
import {CardsView,ClassicList,Heart,TimelineView,YearSwatch,type RowActions} from './BucketViews';
import './BucketList.css';

type View='classic'|'cards'|'timeline';
const views:{id:View;label:string}[]=[{id:'classic',label:'Classic list'},{id:'cards',label:'Collectible cards'},{id:'timeline',label:'Timeline'}];
const prefsKey='muse.bucket.view';
type Prefs={view:View;sort:BucketSort};
function readPrefs():Prefs{try{const v=JSON.parse(window.localStorage.getItem(prefsKey)??'{}');return {view:views.some(x=>x.id===v.view)?v.view:'classic',sort:bucketSorts.some(s=>s.id===v.sort)?v.sort:'custom'};}catch{return {view:'classic',sort:'custom'};}}
type Modal={kind:'edit';entry:BucketEntry}|{kind:'complete';entry:BucketEntry}|{kind:'settings'}|null;

/** Rituals → Bucket List (#84): one long-running list of dreams, colored by the year each came true. */
export function BucketList({today}:{today:string}){
 const {list,entries,status,save,saveMany,saveList,remove,upload}=useBucketList(today);
 const asp=useAspirations();
 const [prefs,setPrefs]=useState<Prefs>({view:'classic',sort:'custom'});
 useEffect(()=>{const t=window.setTimeout(()=>setPrefs(readPrefs()),0);return ()=>window.clearTimeout(t);},[]);
 const changePrefs=(p:Partial<Prefs>)=>setPrefs(v=>{const next={...v,...p};try{window.localStorage.setItem(prefsKey,JSON.stringify(next));}catch{/* per device only */}return next;});
 const [filter,setFilter]=useState<BucketFilter>(emptyFilter),[modal,setModal]=useState<Modal>(null),[dragging,setDragging]=useState<string|null>(null);
 const [filtersOpen,setFiltersOpen]=useState(false),filtersRef=useRef<HTMLButtonElement>(null),[draft,setDraft]=useState('');
 const [notice,setNotice]=useState('');

 const ordered=useMemo(()=>[...entries].sort(byPosition),[entries]);
 const visible=useMemo(()=>sortEntries(entries.filter(e=>matches(e,filter)),prefs.sort),[entries,filter,prefs.sort]);
 const years=useMemo(()=>list?legendYears(list,entries):[],[list,entries]);
 const stats=useMemo(()=>bucketStats(entries),[entries]);
 const line=useMemo(()=>timeline(entries.filter(e=>matches(e,{...filter,archived:false})),years),[entries,filter,years]);
 const categories=allCategories(entries),tags=allTags(entries);
 if(!list)return <p className="small-label" role="status">Loading…</p>;

 const arranging=prefs.view==='classic'&&prefs.sort==='custom'&&!filter.archived&&!filter.query.trim()&&!activeFilterCount(filter);
 const live=ordered.filter(e=>!e.archivedAt);
 async function move(id:string,toIndex:number){const changed=moveEntry(live,id,toIndex);if(changed.length)await saveMany(changed);}
 async function finish(e:BucketEntry){const saved=await save(e);if(!saved)return;setModal(null);
  celebrate({kind:'constellation',stars:10,tier:'large',message:pickLine('bucket'),detail:e.title,sound:'celebrate',key:`bucket:${e.id}:${e.completedOn}`});}
 async function reopen(e:BucketEntry){const saved=await save(reopenEntry(e,today));if(saved)setNotice(`“${e.title}” is back on the list. Its story is kept.`);}
 async function promote(e:BucketEntry){
  const base=blankAspiration(today),cat=['Creative','Learning','Career','Health & Fitness','Financial','Personal','Adventure','Home','Other'].includes(e.category??'')?e.category!:e.category==='Travel'?'Adventure':'Personal';
  const a:Aspiration={...base,title:e.title.slice(0,120),category:cat,icon:e.icon,description:e.notes?.slice(0,2000)??null,timeframe:e.targetYear?'custom':'someday',targetDate:e.targetYear?`${e.targetYear}-12-31`:null,status:e.status==='in_progress'?'active':'planned'};
  if(a.targetDate&&a.targetDate<a.startDate)a.startDate=a.targetDate.slice(0,4)+'-01-01';
  const created=await asp.save(a);if(!created)return;
  const saved=await save({...e,aspirationId:created.id,status:e.status==='dreaming'?'planned':e.status});
  if(saved){setModal({kind:'edit',entry:saved});setNotice(`Created the aspiration “${created.title}”. Add milestones in Aspirations.`);}
 }
 async function add(ev:FormEvent){ev.preventDefault();const title=draft.trim();if(!title)return;
  const e={...blankEntry(nextNumber(entries),nextPosition(entries)),title:title.slice(0,200)};if(await save(e))setDraft('');}
 const actions:RowActions={
  onToggle:e=>{if(e.status==='completed')void reopen(e);else setModal({kind:'complete',entry:e});},
  onOpen:e=>setModal({kind:'edit',entry:e}),
  menu:e=>[
   {id:'edit',label:'Edit',onSelect:()=>setModal({kind:'edit',entry:e})},
   ...(e.status==='completed'?[{id:'reopen',label:'Reopen',onSelect:()=>void reopen(e)}]:[{id:'done',label:'Mark done…',onSelect:()=>setModal({kind:'complete',entry:e})}]),
   ...(arranging&&!e.archivedAt?[{id:'up',label:'Move up',onSelect:()=>{const i=live.findIndex(x=>x.id===e.id);if(i>0)void move(e.id,i-1);}},{id:'down',label:'Move down',onSelect:()=>{const i=live.findIndex(x=>x.id===e.id);if(i<live.length-1)void move(e.id,i+1);}}]:[]),
   e.archivedAt?{id:'restore',label:'Restore to the list',onSelect:()=>void save({...e,archivedAt:null})}:{id:'archive',label:'Archive',onSelect:()=>void save({...e,archivedAt:new Date().toISOString()})},
   {id:'delete',label:'Delete permanently',destructive:true,onSelect:()=>void remove(e)},
  ],
 };
 const toggle=<T,>(arr:T[],v:T)=>arr.includes(v)?arr.filter(x=>x!==v):[...arr,v];
 const filters=activeFilterCount(filter),archivedCount=entries.filter(e=>e.archivedAt).length;
 const linkedAspiration=(e:BucketEntry)=>asp.aspirations.find(a=>a.id===e.aspirationId);
 const ready=entries.filter(e=>e.status!=='completed'&&!e.archivedAt&&linkedAspiration(e)?.status==='completed');

 // The next numbered line, like the blank numbered lines in a notebook. In Classic it's the last row of the columns.
 const quickAdd=filter.archived?null:<form className="muse-bucket-quickadd" onSubmit={add}>
  {list.showNumbers&&<span className="muse-bucket-num">{nextNumber(entries)}.</span>}
  <span className="muse-bucket-addmark" aria-hidden="true"><Heart/></span>
  <input aria-label="Add a dream" maxLength={200} value={draft} placeholder="Add a dream…" onChange={e=>setDraft(e.target.value)}/>
  <button type="submit" className="muse-button" disabled={!draft.trim()||status.saving} aria-label="Add dream"><MuseIcon name="plus" size={14}/></button></form>;

 return <section className="muse-bucket muse-planner-surface" aria-labelledby="bucket-title">
  <header className="muse-bucket-head">
   <div className="muse-bucket-titlebar"><h2 id="bucket-title">{list.title}</h2>
    <p className="muse-bucket-summary" aria-live="polite">{stats.total} {stats.total===1?'dream':'dreams'} · {stats.completed} done{stats.inProgress?` · ${stats.inProgress} in progress`:''} · {list.horizonStart}–{list.horizonEnd}</p></div>
   <div className="muse-bucket-key" role="group" aria-label="Year color key. Choose a year to show what was done that year">
    <span className="muse-bucket-key-label">Key</span>
    {years.map(y=><button key={y} type="button" className={`muse-bucket-keyitem${filter.years.includes(y)?' muse-today-ring':''}`} aria-pressed={filter.years.includes(y)} onClick={()=>setFilter(f=>({...f,years:toggle(f.years,y)}))}
     title={`${y}: ${stats.byYear.get(y)??0} done`}><YearSwatch list={list} year={y}/><span>{y}</span>{(stats.byYear.get(y)??0)>0&&<small>{stats.byYear.get(y)}</small>}<span className="sr-only">, {stats.byYear.get(y)??0} done</span></button>)}
    <button type="button" className="muse-button muse-bucket-settings" aria-label="List settings and year colors" onClick={()=>setModal({kind:'settings'})}><MuseIcon name="settings" size={16}/></button>
   </div>
   <div className="muse-bucket-tools">
    <label className="muse-bucket-search"><MuseIcon name="search" size={16}/><input type="search" aria-label="Search your bucket list" placeholder="Search dreams, #tags, places…" value={filter.query} onChange={e=>setFilter(f=>({...f,query:e.target.value}))}/></label>
    <button type="button" className="muse-button button-primary" onClick={()=>setModal({kind:'edit',entry:blankEntry(nextNumber(entries),nextPosition(entries))})}><MuseIcon name="plus" size={14}/> Add dream</button>
    <div className="muse-bucket-filters">
     <button ref={filtersRef} type="button" className="muse-button" aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(o=>!o)}><MuseIcon name="filter" size={14}/> Filters{filters?` · ${filters}`:''}</button>
     <MuseChoiceMenu label="Sort" valueLabel={bucketSorts.find(s=>s.id===prefs.sort)!.label} options={bucketSorts.map(s=>({id:s.id,label:s.label}))} selectedIds={[prefs.sort]} onSelect={id=>changePrefs({sort:id as BucketSort})}/>
     <MuseChoiceMenu label="View" valueLabel={views.find(v=>v.id===prefs.view)!.label} options={views} selectedIds={[prefs.view]} onSelect={id=>changePrefs({view:id as View})}/>
    </div>
   </div>
  </header>
  <GlassPopover id="bucket-filters" label="Bucket List filters" open={filtersOpen} anchorRef={filtersRef} onClose={()=>setFiltersOpen(false)} width={320} align="end">
   <div className="muse-bucket-filterpanel">
    <p className="editor-label">Status</p><div className="muse-chip-row">{(Object.keys(statusLabels) as BucketStatus[]).map(s=><button key={s} type="button" className="muse-chip" aria-pressed={filter.statuses.includes(s)} onClick={()=>setFilter(f=>({...f,statuses:toggle(f.statuses,s)}))}>{statusLabels[s]}</button>)}</div>
    {categories.length>0&&<><p className="editor-label">Category</p><div className="muse-chip-row">{categories.map(c=><button key={c} type="button" className="muse-chip" aria-pressed={filter.categories.includes(c)} onClick={()=>setFilter(f=>({...f,categories:toggle(f.categories,c)}))}>{c}</button>)}</div></>}
    {tags.length>0&&<><p className="editor-label">Tags</p><div className="muse-chip-row">{tags.map(t=><button key={t} type="button" className="muse-chip" aria-pressed={filter.tags.includes(t)} onClick={()=>setFilter(f=>({...f,tags:toggle(f.tags,t)}))}>#{t}</button>)}</div></>}
    {filter.years.length>0&&<><p className="editor-label">Completed in</p><div className="muse-chip-row">{filter.years.map(y=><button key={y} type="button" className="muse-chip" aria-pressed onClick={()=>setFilter(f=>({...f,years:toggle(f.years,y)}))}>{shortYear(y)}</button>)}</div></>}
    <label className="muse-bucket-inline"><input type="checkbox" checked={filter.archived} onChange={e=>setFilter(f=>({...f,archived:e.target.checked}))}/> Show archived instead ({archivedCount})</label>
    {(filters>0||filter.archived)&&<button type="button" className="text-button" onClick={()=>setFilter(f=>({...emptyFilter(),query:f.query}))}>Clear filters</button>}
   </div>
  </GlassPopover>
  {status.error&&!modal&&<p role="alert" className="muse-aspiration-error">{status.error}</p>}
  {notice&&<p role="status" className="muse-bucket-notice">{notice} <button type="button" className="text-button" onClick={()=>setNotice('')}>Dismiss</button></p>}
  {ready.map(e=><p key={e.id} className="muse-bucket-notice">Your aspiration “{linkedAspiration(e)!.title}” is complete. <button type="button" className="text-button" onClick={()=>setModal({kind:'complete',entry:e})}>Cross off “{e.title}”?</button></p>)}
  {!status.loaded?<p className="small-label" role="status">Loading your bucket list…</p>:<>
   {filter.archived&&<p className="small-label">Archived dreams keep their numbers and history. Restore one from its menu.</p>}
   {arranging&&live.length>1&&<p className="small-label muse-bucket-hint">Drag the handle to reorder, or focus it and use ↑ ↓.</p>}
   {prefs.view==='timeline'&&!filter.archived?<TimelineView list={list} years={line.years} someday={line.someday} today={today} actions={actions}/>
    :<>{!visible.length&&<div className="muse-bucket-empty">{entries.length?<p>Nothing matches your search and filters.</p>:<><span aria-hidden="true">✦</span><h3>Big, small, and delightfully ridiculous.</h3><p>Write the first dream below. It doesn’t need a year, a plan or a reason.</p></>}</div>}
     {prefs.view==='cards'?<>{visible.length>0&&<CardsView list={list} entries={visible} actions={actions}/>}{quickAdd&&<div className="muse-bucket-addline">{quickAdd}</div>}</>
      :(visible.length>0||quickAdd)&&<ClassicList list={list} entries={visible} actions={actions} addRow={quickAdd} arrange={arranging?{busy:status.saving,dragging,setDragging,onMove:(id,i)=>void move(id,i)}:undefined}/>}</>}
  </>}
  {modal?.kind==='edit'&&<BucketEditor key={modal.entry.id} initial={modal.entry} list={list} today={today} categories={categories} aspirations={asp.aspirations} busy={status.saving||asp.status.saving} error={status.error||asp.status.error}
   upload={f=>upload(modal.entry.id,f)} onPromote={e=>void promote(e)} onClose={()=>setModal(null)}
   onSave={e=>void (async()=>{const before=entries.find(x=>x.id===e.id);const saved=await save(e);if(!saved)return;setModal(null);
    if(e.status==='completed'&&before&&before.status!=='completed')celebrate({kind:'constellation',stars:10,tier:'large',message:pickLine('bucket'),detail:e.title,sound:'celebrate',key:`bucket:${e.id}:${e.completedOn}`});})()}/>}
  {modal?.kind==='complete'&&<CompleteSheet entry={modal.entry} list={list} today={today} busy={status.saving} error={status.error} upload={f=>upload(modal.entry.id,f)} onClose={()=>setModal(null)} onDone={e=>void finish(e)}/>}
  {modal?.kind==='settings'&&<BucketSettings list={list} entries={entries} busy={status.saving} error={status.error} onClose={()=>setModal(null)} onSave={l=>void saveList(l).then(s=>{if(s)setModal(null);})}/>}
 </section>;
}
