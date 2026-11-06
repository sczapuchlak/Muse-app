'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {useRitualView} from '../ConnectedRituals';
import {usePlanner} from '../../PlannerStore';
import {useWhimsyData} from '../../whimsy/WhimsyData';
import {MuseStar} from '../../MuseStar';
import {dateLabel} from '@/lib/dates';
import {celebrate} from '@/lib/celebrate';
import {pickLine} from '@/lib/celebration-copy';
import {challengeFor,challengeProgress} from '@/lib/whimsy/reading-challenge';
import type {Aspiration} from '@/lib/aspirations/models';
import {aspirationProgress,aspirationStats,attention,inTimeFilter,isOpen,newThresholds,nextMilestone,sortAspirations,type Progress,type SortKey,type TimeFilter} from '@/lib/aspirations/progress';
import {aspirationSignals} from '@/lib/almanac/signals';
import {surfaces} from '@/lib/almanac/select';
import {AlmanacWhisper} from '../../almanac/AlmanacWhisper';
import {useAspirations} from './useAspirations';
import {AspirationEditor,blankAspiration} from './AspirationEditor';
import {AspirationDetail} from './AspirationDetail';
import {ProgressRing,progressText} from './parts';
import './Aspirations.css';

const filters:{id:TimeFilter;label:string}[]=[{id:'month',label:'This month'},{id:'quarter',label:'This quarter'},{id:'year',label:'This year'},{id:'someday',label:'Someday'},{id:'all',label:'All'}];
type Group='none'|'category'|'status';
const viewKey='muse.aspirations.view';
function readView():{filter:TimeFilter;group:Group;sort:SortKey}{try{const v=JSON.parse(window.localStorage.getItem(viewKey)??'{}');return {filter:filters.some(f=>f.id===v.filter)?v.filter:'all',group:['none','category','status'].includes(v.group)?v.group:'none',sort:['target','progress','updated','category','custom'].includes(v.sort)?v.sort:'target'};}catch{return {filter:'all',group:'none',sort:'target'};}}

/** Aspirations (#54): the bigger things, beside Habits. Private to the account; connected progress is read, never copied. */
export function Aspirations(){
 const {state:ritualState,sources,today}=useRitualView(),{state:planner}=usePlanner(),whimsy=useWhimsyData();
 const {aspirations,updates,status,save,remove,addUpdate,removeUpdate}=useAspirations();
 const [view,setView]=useState<{filter:TimeFilter;group:Group;sort:SortKey}>({filter:'all',group:'none',sort:'target'});
 useEffect(()=>{const t=window.setTimeout(()=>setView(readView()),0);return ()=>window.clearTimeout(t);},[]);
 const changeView=(patch:Partial<typeof view>)=>setView(v=>{const next={...v,...patch};try{window.localStorage.setItem(viewKey,JSON.stringify(next));}catch{/* per device only */}return next;});
 const [editing,setEditing]=useState<Aspiration|null>(null),[openId,setOpenId]=useState<string|null>(null);
 const books=whimsy.records?.books,goals=whimsy.records?.goals;
 const ctx=useMemo(()=>({updates,sources,books,readingGoals:goals,today:today||''}),[updates,sources,books,goals,today]);
 const progressMap=useMemo(()=>new Map<string,Progress>(aspirations.map(a=>[a.id,aspirationProgress(a,ctx)])),[aspirations,ctx]);
 const progressOf=useCallback((a:Aspiration)=>progressMap.get(a.id)??aspirationProgress(a,ctx),[progressMap,ctx]);
 const year=(today||'').slice(0,4),challenge=goals&&year?challengeFor(goals,year):null;
 const challengeLinked=aspirations.some(a=>a.connection?.kind==='reading-challenge'&&a.connection.year===year);
 const challengeView=challenge&&books&&!challengeLinked?challengeProgress(challenge,books,year,today):null;

 // Quarter thresholds celebrate once per aspiration, on any device (stored on the aspiration).
 const celebratedNow=useRef(new Set<string>());
 useEffect(()=>{if(!status.loaded||!today||status.saving)return;
  for(const a of aspirations){if(!isOpen(a))continue;const p=progressOf(a);if(!p.available)continue;const fresh=newThresholds(a,p.percent);
   if(!fresh.length||celebratedNow.current.has(a.id))continue;celebratedNow.current.add(a.id);
   const top=Number(fresh.at(-1)!.slice(1));
   celebrate({kind:top===100?'constellation':'starburst',stars:top===100?10:4,tier:top===100?'large':'small',message:pickLine(top===100?'aspiration':'aspirationProgress'),detail:`${a.title} · ${top}%`,sound:top===100?'celebrate':'confirm',key:`aspiration:${a.id}:p${top}`});
   void save({...a,celebrated:[...new Set([...a.celebrated,...fresh])]});break;}
 },[aspirations,status.loaded,status.saving,today,progressOf,save]);

 const signals=useMemo(()=>today&&status.loaded?aspirationSignals(aspirations,updates,progressOf,today):[],[aspirations,updates,progressOf,today,status.loaded]);
 async function create(a:Aspiration){const p=aspirationProgress(a,ctx);const saved=await save({...a,celebrated:newThresholds({...a,celebrated:[]},p.percent)});if(saved){setEditing(null);setOpenId(saved.id);}}
 if(!today)return <p className="small-label" role="status">Loading…</p>;
 const visible=sortAspirations(aspirations.filter(a=>isOpen(a)&&inTimeFilter(a,view.filter,today)),view.sort,a=>progressOf(a).percent);
 const groups=view.group==='none'?[{name:'',items:visible}]:[...new Set(visible.map(a=>view.group==='category'?a.category:a.status))].sort().map(name=>({name:view.group==='status'?name[0].toUpperCase()+name.slice(1):name,items:visible.filter(a=>(view.group==='category'?a.category:a.status)===name)}));
 const completed=sortAspirations(aspirations.filter(a=>a.status==='completed'),'updated',()=>null),archived=aspirations.filter(a=>a.status==='archived');
 const stats=aspirationStats(aspirations,today),soon=attention(aspirations,today),open=aspirations.find(a=>a.id===openId)??null;
 const maxMonth=Math.max(1,...stats.completedByMonth.map(m=>m.completed+m.milestones));
 return <section className="muse-aspirations" aria-label="Aspirations">
  <div className="muse-aspirations-head"><div><h2>Aspirations</h2><p>The bigger things you’re working toward. Habits are what you practice; these are where they lead.</p></div>
   <button type="button" className="muse-button button-primary" onClick={()=>setEditing(blankAspiration(today))}>+ Add aspiration</button></div>
  <AlmanacWhisper surface={surfaces.aspirations} signals={signals} today={today}/>
  {status.error&&!editing&&!open&&<p role="alert" className="muse-aspiration-error">{status.error}</p>}
  {!status.loaded?<p className="small-label" role="status">Loading your aspirations…</p>:<>
   {(aspirations.length>0||challengeView)&&<dl className="muse-aspirations-stats"><div><dt>Active</dt><dd>{stats.active}</dd></div><div><dt>Completed in {year}</dt><dd>{stats.completedThisYear}</dd></div><div><dt>Milestones in {year}</dt><dd>{stats.milestonesThisYear}</dd></div></dl>}
   {(soon.approaching.length>0||soon.upcomingMilestones.length>0||soon.recentMilestones.length>0)&&<div className="muse-aspirations-attention">
    {(soon.approaching.length>0||soon.upcomingMilestones.length>0)&&<div><h3>Coming up</h3><ul>{soon.approaching.map(a=><li key={a.id}><button type="button" className="text-button" onClick={()=>setOpenId(a.id)}>{a.title}</button><small>target {dateLabel(a.targetDate!)}</small></li>)}
     {soon.upcomingMilestones.slice(0,5).map(({aspiration,milestone})=><li key={milestone.id}><button type="button" className="text-button" onClick={()=>setOpenId(aspiration.id)}>{milestone.title}</button><small>{aspiration.title} · by {dateLabel(milestone.targetDate!)}</small></li>)}</ul></div>}
    {soon.recentMilestones.length>0&&<div><h3>Recently done</h3><ul>{soon.recentMilestones.slice(0,5).map(({aspiration,milestone})=><li key={milestone.id}><MuseStar size={10}/><span>{milestone.title}</span><small>{aspiration.title} · {dateLabel(milestone.completedOn!)}</small></li>)}</ul></div>}
   </div>}
   <div className="muse-aspirations-controls">
    <div role="group" aria-label="Timeframe" className="muse-aspiration-filter">{filters.map(f=><button key={f.id} type="button" aria-pressed={view.filter===f.id} onClick={()=>changeView({filter:f.id})}>{f.label}</button>)}</div>
    <label>Group<select id="aspirations-group" value={view.group} onChange={e=>changeView({group:e.target.value as Group})}><option value="none">None</option><option value="category">Category</option><option value="status">Status</option></select></label>
    <label>Sort<select id="aspirations-sort" value={view.sort} onChange={e=>changeView({sort:e.target.value as SortKey})}><option value="target">Target date</option><option value="progress">Progress</option><option value="updated">Recently updated</option><option value="category">Category</option><option value="custom">Order added</option></select></label>
   </div>
   {challengeView&&(view.filter==='all'||view.filter==='year')&&<article className="muse-aspiration-card muse-aspiration-connected" data-accent="secondary">
    <ProgressRing percent={challengeView.percent} accent="secondary" size={56}/><div><span className="small-label">From Bookshelf · automatic</span><h3>{year} Reading Challenge</h3><p>{challengeView.done} of {challengeView.target} books{challengeView.reached?' · complete':''}</p>
     <div className="muse-aspiration-card-actions"><Link className="text-button" href="/whimsy/bookshelf?view=atlas">Open in Reading Atlas</Link><button type="button" className="text-button" onClick={()=>setEditing({...blankAspiration(today),title:`Read ${challengeView.target} books in ${year}`,category:'Learning',icon:'📚',progressKind:'connected',connection:{kind:'reading-challenge',year},targetDate:`${year}-12-31`})}>Add milestones and a why</button></div></div></article>}
   {!visible.length&&!challengeView?<div className="muse-aspirations-empty">{aspirations.some(isOpen)?<p>Nothing in this timeframe. Try “All”.</p>:<><MuseStar size={20}/><h3>Small rituals. Grand ambitions.</h3><p>What would you like to have done a few months from now? Start with a name; the rest can wait.</p><button type="button" className="muse-button button-primary" onClick={()=>setEditing(blankAspiration(today))}>Add your first aspiration</button></>}</div>
    :groups.map(g=><div key={g.name||'all'} className="muse-aspirations-group">{g.name&&<h3>{g.name}</h3>}<div className="muse-aspirations-grid">{g.items.map(a=><AspirationCard key={a.id} a={a} progress={progressOf(a)} today={today} onOpen={()=>setOpenId(a.id)}/>)}</div></div>)}
   {stats.completedByMonth.some(m=>m.completed||m.milestones)&&<section className="muse-aspirations-year" aria-label={`Your ${year} in aspirations`}><h3>Your {year}, step by step</h3>
    <ol>{stats.completedByMonth.map(m=><li key={m.month} title={`${m.completed} aspirations, ${m.milestones} milestones`} style={{'--h':`${Math.round((m.completed+m.milestones)/maxMonth*100)}%`} as CSSProperties}><span className="sr-only">{m.month}: {m.completed} aspirations and {m.milestones} milestones completed</span><small aria-hidden="true">{new Date(`${m.month}-15T12:00:00Z`).toLocaleString('en-US',{month:'narrow',timeZone:'UTC'})}</small></li>)}</ol>
    <p className="small-label">Milestones and aspirations completed each month, from what you checked off.{stats.byCategory.length?` Most of your aspirations are ${stats.byCategory[0].category}.`:''}</p></section>}
   {completed.length>0&&<details className="muse-aspirations-done"><summary>Completed ({completed.length})</summary><div className="muse-aspirations-grid">{completed.map(a=><AspirationCard key={a.id} a={a} progress={progressOf(a)} today={today} onOpen={()=>setOpenId(a.id)}/>)}</div></details>}
   {archived.length>0&&<details className="muse-aspirations-done"><summary>Archived ({archived.length})</summary><div className="muse-aspirations-grid">{archived.map(a=><AspirationCard key={a.id} a={a} progress={progressOf(a)} today={today} onOpen={()=>setOpenId(a.id)}/>)}</div></details>}
  </>}
  {editing&&<AspirationEditor initial={editing} today={today} busy={status.saving} error={status.error} onClose={()=>setEditing(null)} onSave={a=>void (a.revision===0?create(a):save(a).then(s=>{if(s)setEditing(null);}))}/>}
  {open&&!editing&&<AspirationDetail a={open} progress={progressOf(open)} updates={updates} ritualState={ritualState} tasks={planner.tasks} today={today} busy={status.saving} error={status.error}
   actions={{save,addUpdate,removeUpdate,remove}} onEdit={()=>setEditing(open)} onClose={()=>setOpenId(null)}
   onMilestoneDone={m=>celebrate({kind:'starburst',stars:5,tier:'small',message:pickLine('aspirationMilestone'),detail:m.title,sound:'complete',key:`aspiration:${open.id}:m:${m.id}`})}
   onCompleted={a=>celebrate({kind:'constellation',stars:12,tier:'large',message:pickLine('aspiration'),detail:a.title,sound:'celebrate',key:`aspiration:${a.id}:complete`})}/>}
 </section>;
}

function AspirationCard({a,progress,today,onOpen}:{a:Aspiration;progress:Progress;today:string;onOpen:()=>void}){
 const next=nextMilestone(a),late=a.targetDate&&a.targetDate<today&&isOpen(a);
 return <article className="muse-aspiration-card" data-accent={a.accent??'primary'} data-status={a.status}>
  <ProgressRing percent={progress.percent} accent={a.accent} size={56}/>
  <div><span className="small-label">{a.icon?`${a.icon} `:''}{a.category}{a.targetDate?` · ${late?'was due':'by'} ${dateLabel(a.targetDate)}`:' · someday'}{a.status==='paused'?' · paused':a.status==='planned'?' · planned':''}</span>
   <h3><button type="button" className="muse-aspiration-open" onClick={onOpen}>{a.title}</button></h3>
   <p>{progressText(a,progress)}{progress.automatic&&progress.available?<small> · from {progress.source}</small>:null}</p>
   {progress.percent===100&&isOpen(a)?<p className="muse-aspiration-ready">Ready to mark complete</p>:next?<p className="small-label">Next: {next.title}</p>:null}</div>
 </article>;
}
