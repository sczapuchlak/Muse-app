'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {useSearchParams} from 'next/navigation';
import {useRitualView} from '../../rituals/ConnectedRituals';
import {usePlanner} from '../../PlannerStore';
import {useWhimsyData} from '../../whimsy/WhimsyData';
import {MuseStar} from '../../MuseStar';
import {dateLabel} from '@/lib/dates';
import {celebrate} from '@/lib/celebrate';
import {pickLine} from '@/lib/celebration-copy';
import {challengeFor,challengeProgress} from '@/lib/whimsy/reading-challenge';
import type {Aspiration} from '@/lib/aspirations/models';
import {aspirationProgress,aspirationStats,attention,canRenew,inTimeFilter,isOpen,newThresholds,nextMilestone,nextPeriod,renewalChain,renewedAspiration,reorder,sortAspirations,type Progress,type SortKey,type TimeFilter} from '@/lib/aspirations/progress';
import {aspirationSignals} from '@/lib/almanac/signals';
import {surfaces} from '@/lib/almanac/select';
import {AlmanacWhisper} from '../../almanac/AlmanacWhisper';
import {MuseHeading,MuseMark,MuseStatRow,MuseStatTile} from '@/components/design/MuseHeading';
import {useAspirations} from './useAspirations';
import {AspirationEditor,blankAspiration} from './AspirationEditor';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
const sortLabels:Record<SortKey,string>={target:'Target date',progress:'Progress',updated:'Recently updated',category:'Category',custom:'Your order'};
import {AspirationDetail} from './AspirationDetail';
import {ProgressRing,periodLabel,progressText} from './parts';
import {LifeAtlas} from './LifeAtlas';
import {DesignYear} from './DesignYear';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {readLifeAreas} from '@/lib/reflections/persistence';
import type {LifeArea} from '@/lib/reflections/model';
import './Aspirations.css';

const filters:{id:TimeFilter;label:string}[]=[{id:'month',label:'This month'},{id:'quarter',label:'This quarter'},{id:'year',label:'This year'},{id:'someday',label:'Someday'},{id:'all',label:'All'}];
type Group='none'|'category'|'status'|'life-area';
const viewKey='muse.aspirations.view';
function readView():{filter:TimeFilter;group:Group;sort:SortKey}{try{const v=JSON.parse(window.localStorage.getItem(viewKey)??'{}');return {filter:filters.some(f=>f.id===v.filter)?v.filter:'all',group:['none','category','status','life-area'].includes(v.group)?v.group:'none',sort:['target','progress','updated','category','custom'].includes(v.sort)?v.sort:'target'};}catch{return {filter:'all',group:'none',sort:'target'};}}

/** Aspirations (#54): the bigger things, beside Habits. Private to the account; connected progress is read, never copied. */
export function Aspirations(){
 const {state:ritualState,sources,today}=useRitualView(),{state:planner}=usePlanner(),whimsy=useWhimsyData();
 const {aspirations,updates,status,save,remove,addUpdate,removeUpdate}=useAspirations();
 const [view,setView]=useState<{filter:TimeFilter;group:Group;sort:SortKey}>({filter:'all',group:'none',sort:'target'});
 useEffect(()=>{const t=window.setTimeout(()=>setView(readView()),0);return ()=>window.clearTimeout(t);},[]);
 const changeView=(patch:Partial<typeof view>)=>setView(v=>{const next={...v,...patch};try{window.localStorage.setItem(viewKey,JSON.stringify(next));}catch{/* per device only */}return next;});
 const [editing,setEditing]=useState<Aspiration|null>(null),[openId,setOpenId]=useState<string|null>(null);
 const [search,setSearch]=useState('');
 const [statusFilter,setStatusFilter]=useState('open'),[styleFilter,setStyleFilter]=useState('all'),[compact,setCompact]=useState(false);
 const [atlas,setAtlas]=useState(true);
 useEffect(()=>{const t=window.setTimeout(()=>{try{setAtlas(window.localStorage.getItem('muse.aspirations.primary-view')!=='all');}catch{/* device preference is optional */}},0);return()=>window.clearTimeout(t);},[]);
 function chooseAtlas(value:boolean){setAtlas(value);try{window.localStorage.setItem('muse.aspirations.primary-view',value?'areas':'all');}catch{/* device preference is optional */}}
 const [designYear,setDesignYear]=useState(false);
 const client=useMemo(()=>createMuseBrowserClient(),[]),[newArea,setNewArea]=useState<string|null>(null),[atlasVersion,setAtlasVersion]=useState(0),[linkError,setLinkError]=useState('');
 const [lifeAreas,setLifeAreas]=useState<LifeArea[]>([]),[areaLinks,setAreaLinks]=useState<{aspiration_id:string;area_id:string;is_primary:boolean}[]>([]),[areaFilter,setAreaFilter]=useState('all');
 useEffect(()=>{if((atlas||designYear)&&!editing&&!openId)return;let live=true;void Promise.all([readLifeAreas(client),client.from('aspiration_life_areas').select('aspiration_id,area_id,is_primary')]).then(([areas,links])=>{if(!live)return;if(links.error){setLinkError('Life area filters could not load.');return;}setLifeAreas(areas);setAreaLinks(links.data);}).catch(()=>{if(live)setLinkError('Life area filters could not load.');});return()=>{live=false;};},[client,atlas,designYear,atlasVersion,editing,openId]);
 const areaLabel=(id:string)=>{const link=areaLinks.find(l=>l.aspiration_id===id&&l.is_primary);return lifeAreas.find(a=>a.id===link?.area_id)?.label;};
 // #117: `?open=<id>` (from Intentions and other modules) opens that aspiration once, when it's loaded.
 const requestedOpen=useSearchParams()?.get('open')??null,openedRequest=useRef<string|null>(null);
 useEffect(()=>{if(!requestedOpen||openedRequest.current===requestedOpen||!aspirations.some(a=>a.id===requestedOpen))return;openedRequest.current=requestedOpen;const t=window.setTimeout(()=>setOpenId(requestedOpen),0);return ()=>window.clearTimeout(t);},[requestedOpen,aspirations]);
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
  for(const a of aspirations){if(!isOpen(a)||a.planningStyle==='practice'||a.planningStyle==='exploration')continue;const p=progressOf(a);if(!p.available)continue;const fresh=newThresholds(a,p.percent);
   if(!fresh.length||celebratedNow.current.has(a.id))continue;celebratedNow.current.add(a.id);
   const top=Number(fresh.at(-1)!.slice(1));
   celebrate({kind:top===100?'constellation':'starburst',stars:top===100?10:4,tier:top===100?'large':'small',message:pickLine(top===100?'aspiration':'aspirationProgress'),detail:`${a.title} · ${top}%`,sound:top===100?'celebrate':'confirm',key:`aspiration:${a.id}:p${top}`});
   void save({...a,celebrated:[...new Set([...a.celebrated,...fresh])]});break;}
 },[aspirations,status.loaded,status.saving,today,progressOf,save]);

 const signals=useMemo(()=>today&&status.loaded?aspirationSignals(aspirations,updates,progressOf,today):[],[aspirations,updates,progressOf,today,status.loaded]);
 const [dragging,setDragging]=useState<string|null>(null);
 async function moveTo(list:Aspiration[],id:string,index:number){for(const changed of reorder(list,id,index)){if(!await save(changed))break;}}
 async function renew(a:Aspiration){const next=renewedAspiration(a,crypto.randomUUID(),new Date().toISOString());await create(next);}
 async function create(a:Aspiration){const p=aspirationProgress(a,ctx);const saved=await save({...a,celebrated:newThresholds({...a,celebrated:[]},p.percent)});if(saved){if(newArea){const result=await client.rpc('set_aspiration_primary_area',{p_aspiration_id:saved.id,p_area_id:newArea});if(result.error)setLinkError('Your aspiration was saved, but its life area could not be linked. Open the area to connect it.');else setAtlasVersion(v=>v+1);}setNewArea(null);setEditing(null);setOpenId(saved.id);}}
 if(!today)return <p className="small-label" role="status">Loading…</p>;
 const query=search.trim().toLocaleLowerCase();
 const matchesSearch=(a:Aspiration)=>!query||[a.title,a.description,a.motivation,a.category].some(value=>value?.toLocaleLowerCase().includes(query));
 const showChallenge=!!challengeView&&(!query||`${year} reading challenge`.includes(query))&&(view.filter==='all'||view.filter==='year')&&(statusFilter==='open'||statusFilter==='all')&&styleFilter==='all'&&(areaFilter==='all'||areaFilter==='unassigned');
 const matchesStyle=(a:Aspiration)=>(styleFilter==='all'||(a.planningStyle??'unspecified')===styleFilter)&&(areaFilter==='all'||(areaFilter==='unassigned'?!areaLinks.some(l=>l.aspiration_id===a.id):areaLinks.some(l=>l.aspiration_id===a.id&&l.area_id===areaFilter)));
 const visible=sortAspirations(aspirations.filter(a=>(statusFilter==='all'||(statusFilter==='open'?isOpen(a):a.status===statusFilter))&&inTimeFilter(a,view.filter,today)&&matchesSearch(a)&&matchesStyle(a)),view.sort,a=>progressOf(a).percent);
 const groupName=(a:Aspiration)=>view.group==='category'?a.category:view.group==='life-area'?areaLabel(a.id)??'Uncategorized':a.status;
 const groups=view.group==='none'?[{name:'',items:visible}]:[...new Set(visible.map(groupName))].sort().map(name=>({name:view.group==='status'?name[0].toUpperCase()+name.slice(1):name,items:visible.filter(a=>groupName(a)===name)}));
 const completed=statusFilter==='open'?sortAspirations(aspirations.filter(a=>a.status==='completed'&&matchesSearch(a)&&matchesStyle(a)),'updated',()=>null):[],archived=statusFilter==='open'?aspirations.filter(a=>a.status==='archived'&&matchesSearch(a)&&matchesStyle(a)):[];
 const stats=aspirationStats(aspirations,today),soon=attention(aspirations,today),open=aspirations.find(a=>a.id===openId)??null;
 const maxMonth=Math.max(1,...stats.completedByMonth.map(m=>m.completed+m.milestones));
 return <section className="muse-aspirations" aria-label="Aspirations">
  <div className="muse-aspirations-head"><MuseHeading icon="summit" tone={1} size="lg" level={2} title="Aspirations" description="A personal atlas for what you want to explore, nurture and become." aside={<button type="button" className="muse-button button-primary" onClick={()=>setEditing(blankAspiration(today))}>+ Add aspiration</button>}/></div>
  <AlmanacWhisper surface={surfaces.aspirations} signals={signals} today={today}/>
  {status.error&&!editing&&!open&&<p role="alert" className="muse-aspiration-error">{status.error}</p>}
  {linkError&&<p role="alert" className="muse-aspiration-error">{linkError}</p>}
  {!status.loaded?<p className="small-label" role="status">Loading your aspirations…</p>:<>
   {!designYear&&<div className="muse-segmented" role="group" aria-label="Aspiration views"><button type="button" aria-pressed={atlas} onClick={()=>chooseAtlas(true)}>Life Areas</button><button type="button" aria-pressed={!atlas} onClick={()=>chooseAtlas(false)}>All Aspirations</button><button type="button" onClick={()=>setDesignYear(true)}>Design my year</button></div>}
   {designYear?<DesignYear aspirations={aspirations} initialYear={Number(year)} onBack={()=>setDesignYear(false)} onOpen={setOpenId} onAdd={id=>{setNewArea(id);setEditing(blankAspiration(today));}}/>:atlas?<LifeAtlas key={atlasVersion} aspirations={aspirations} today={today} onOpen={setOpenId} onAdd={id=>{setNewArea(id);setEditing(blankAspiration(today));}}/>:<>
   {(aspirations.length>0||challengeView)&&<MuseStatRow label="Aspirations at a glance" className="muse-aspirations-statrow"><MuseStatTile icon="target" tone={1} value={stats.active} label="Active" note={stats.active===1?'in motion':'in motion'}/><MuseStatTile icon="trophy" tone={4} value={stats.completedThisYear} label={`Completed in ${year}`} note={stats.completedThisYear?'and counting':'the first is the sweetest'}/><MuseStatTile icon="milestone" tone={6} value={stats.milestonesThisYear} label={`Milestones in ${year}`} note="steps you checked off"/></MuseStatRow>}
   {(soon.approaching.length>0||soon.upcomingMilestones.length>0||soon.recentMilestones.length>0)&&<div className="muse-aspirations-attention">
    {(soon.approaching.length>0||soon.upcomingMilestones.length>0)&&<div><MuseHeading icon="hourglass" tone={2} size="sm" level={3} face="practical" title="Coming up"/><ul>{soon.approaching.map(a=><li key={a.id}><button type="button" className="text-button" onClick={()=>setOpenId(a.id)}>{a.title}</button><small>target {dateLabel(a.targetDate!)}</small></li>)}
     {soon.upcomingMilestones.slice(0,5).map(({aspiration,milestone})=><li key={milestone.id}><button type="button" className="text-button" onClick={()=>setOpenId(aspiration.id)}>{milestone.title}</button><small>{aspiration.title} · by {dateLabel(milestone.targetDate!)}</small></li>)}</ul></div>}
    {soon.recentMilestones.length>0&&<div><MuseHeading icon="checkmark" tone={7} size="sm" level={3} face="practical" title="Recently done"/><ul>{soon.recentMilestones.slice(0,5).map(({aspiration,milestone})=><li key={milestone.id}><MuseStar size={10}/><span>{milestone.title}</span><small>{aspiration.title} · {dateLabel(milestone.completedOn!)}</small></li>)}</ul></div>}
   </div>}
   <div className="muse-aspirations-controls">
    <label className="muse-aspiration-search"><span className="sr-only">Search aspirations</span><input type="search" placeholder="Search aspirations" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    {[{label:'Status',value:statusFilter,set:setStatusFilter,options:[{id:'open',label:'In progress'},{id:'all',label:'All statuses'},{id:'active',label:'Active'},{id:'planned',label:'Planned'},{id:'paused',label:'Paused'},{id:'completed',label:'Completed'},{id:'discontinued',label:'No longer pursuing'},{id:'archived',label:'Archived'}]},
      {label:'Life area',value:areaFilter,set:setAreaFilter,options:[{id:'all',label:'All areas'},{id:'unassigned',label:'Uncategorized'},...lifeAreas.map(area=>({id:area.id,label:area.label+(area.archived?' (archived)':'')}))]},
      {label:'Style',value:styleFilter,set:setStyleFilter,options:[{id:'all',label:'All styles'},{id:'achievement',label:'Achievement'},{id:'target',label:'Measurable target'},{id:'practice',label:'Ongoing practice'},{id:'exploration',label:'Exploration'},{id:'unspecified',label:'Not specified'}]}].map(filter=><div className="muse-aspiration-choice" data-inline key={filter.label}><span>{filter.label}</span><MuseChoiceMenu label={filter.label} valueLabel={filter.options.find(o=>o.id===filter.value)?.label??filter.label} selectedIds={[filter.value]} options={filter.options} onSelect={filter.set}/></div>)}
    <button type="button" className="text-button" aria-pressed={compact} onClick={()=>setCompact(v=>!v)}>{compact?'Card view':'Compact list'}</button>
    <div role="group" aria-label="Timeframe" className="muse-segmented muse-aspiration-filter" data-scroll>{filters.map(f=><button key={f.id} type="button" aria-pressed={view.filter===f.id} onClick={()=>changeView({filter:f.id})}>{f.label}</button>)}</div>
    <div className="muse-aspiration-choice" data-inline><span>Group</span><MuseChoiceMenu label="Group" valueLabel={{none:'None',category:'Legacy category',status:'Status','life-area':'Life area'}[view.group]} selectedIds={[view.group]} options={[{id:'none',label:'None'},{id:'life-area',label:'Life area'},{id:'category',label:'Legacy category'},{id:'status',label:'Status'}]} onSelect={id=>changeView({group:id as Group})}/></div>
    <div className="muse-aspiration-choice" data-inline><span>Sort</span><MuseChoiceMenu label="Sort" valueLabel={sortLabels[view.sort]} selectedIds={[view.sort]} options={(Object.keys(sortLabels) as SortKey[]).map(id=>({id,label:sortLabels[id]}))} onSelect={id=>changeView({sort:id as SortKey})}/></div>
   </div>
   {challengeView&&showChallenge&&<article className="muse-aspiration-card muse-aspiration-connected" data-accent="secondary">
    <ProgressRing percent={challengeView.percent} accent="secondary" size={56}/><div><span className="muse-aspiration-source"><MuseMark icon="openbook" tone={3} size="sm" variant="soft"/>From Books · updates automatically</span><h3>{year} Reading Challenge</h3><p>{challengeView.done} of {challengeView.target} books{challengeView.reached?' · complete':''}</p>
     <div className="muse-aspiration-card-actions"><Link className="text-button" href="/collections/reading-atlas">Open in Reading Atlas</Link><button type="button" className="text-button" onClick={()=>setEditing({...blankAspiration(today),title:`Read ${challengeView.target} books in ${year}`,category:'Learning',icon:'📚',progressKind:'connected',connection:{kind:'reading-challenge',year},targetDate:`${year}-12-31`})}>Add milestones and a why</button></div></div></article>}
   {!visible.length&&!showChallenge?<div className="muse-aspirations-empty">{query?<p>No matching active aspirations. Try another search.</p>:aspirations.some(isOpen)?<p>Nothing in this timeframe. Try “All”.</p>:<><MuseStar size={20}/><h3>Small rituals. Grand ambitions.</h3><p>What would you like to have done a few months from now? Start with a name; the rest can wait.</p><button type="button" className="muse-button button-primary" onClick={()=>setEditing(blankAspiration(today))}>Add your first aspiration</button></>}</div>
    :groups.map(g=><div key={g.name||'all'} className="muse-aspirations-group">{g.name&&<h3>{g.name}</h3>}
     {view.sort==='custom'&&(view.filter!=='all'||view.group!=='none')&&<p className="small-label">Choose “All” with no grouping to arrange your order.</p>}
     {view.sort==='custom'&&view.filter==='all'&&view.group==='none'&&<p className="small-label">Drag cards to arrange them, or use Earlier and Later.</p>}
     <div className="muse-aspirations-grid" data-compact={compact||undefined}>{g.items.map((a,i)=>{const arranging=view.sort==='custom'&&view.filter==='all'&&view.group==='none'&&!query&&styleFilter==='all'&&areaFilter==='all'&&statusFilter==='open';
      return <AspirationCard key={a.id} a={a} areaLabel={areaLabel(a.id)} progress={progressOf(a)} today={today} onOpen={()=>setOpenId(a.id)}
       arrange={arranging?{first:i===0,last:i===g.items.length-1,busy:status.saving,dragging:dragging===a.id,onEarlier:()=>void moveTo(g.items,a.id,i-1),onLater:()=>void moveTo(g.items,a.id,i+1),
        onDragStart:()=>setDragging(a.id),onDragEnd:()=>setDragging(null),onDrop:dragged=>{const id=dragged||dragging;if(id&&id!==a.id)void moveTo(g.items,id,i);setDragging(null);}}:undefined}/>;})}</div></div>)}
   {stats.completedByMonth.some(m=>m.completed||m.milestones)&&<section className="muse-aspirations-year" aria-label={`Your ${year} in aspirations`}><h3>Your {year}, step by step</h3>
    <ol>{stats.completedByMonth.map(m=><li key={m.month} title={`${m.completed} aspirations, ${m.milestones} milestones`} style={{'--h':`${Math.round((m.completed+m.milestones)/maxMonth*100)}%`} as CSSProperties}><span className="sr-only">{m.month}: {m.completed} aspirations and {m.milestones} milestones completed</span><small aria-hidden="true">{new Date(`${m.month}-15T12:00:00Z`).toLocaleString('en-US',{month:'narrow',timeZone:'UTC'})}</small></li>)}</ol>
    <p className="small-label">Milestones and aspirations completed each month, from what you checked off.{(()=>{const [a,b]=stats.byCategory,total=(c?:{active:number;completed:number})=>c?c.active+c.completed:0;return a&&total(a)>total(b)&&total(a)>1?` Most of your aspirations are ${a.category}.`:'';})()}</p></section>}
   {completed.length>0&&<details className="muse-aspirations-done"><summary>Completed ({completed.length})</summary><div className="muse-aspirations-grid">{completed.map(a=><AspirationCard key={a.id} a={a} progress={progressOf(a)} today={today} onOpen={()=>setOpenId(a.id)}/>)}</div></details>}
   {archived.length>0&&<details className="muse-aspirations-done"><summary>Archived ({archived.length})</summary><div className="muse-aspirations-grid">{archived.map(a=><AspirationCard key={a.id} a={a} progress={progressOf(a)} today={today} onOpen={()=>setOpenId(a.id)}/>)}</div></details>}
   </>}
  </>}
  {editing&&<AspirationEditor initial={editing} today={today} busy={status.saving} error={status.error} areas={lifeAreas} primaryArea={newArea} onPrimaryAreaChange={setNewArea} onClose={()=>{setNewArea(null);setEditing(null);}} onSave={a=>void (a.revision===0?create(a):save(a).then(s=>{if(s)setEditing(null);}))}/>}
  {open&&!editing&&<AspirationDetail a={open} areaLabel={areaLabel(open.id)} books={books??[]} progress={progressOf(open)} updates={updates} ritualState={ritualState} tasks={planner.tasks} today={today} busy={status.saving} error={status.error}
   actions={{save,addUpdate,removeUpdate,remove}} onEdit={()=>setEditing(open)} onClose={()=>setOpenId(null)}
   periods={renewalChain(open,aspirations)} renewLabel={canRenew(open,aspirations)?periodLabel({...open,...(()=>{const p=nextPeriod(open)!;return {startDate:p.start,targetDate:p.target};})()}):null} onRenew={()=>void renew(open)} onOpenPeriod={id=>setOpenId(id)}
   onMilestoneDone={m=>celebrate({kind:'starburst',stars:5,tier:'small',message:pickLine('aspirationMilestone'),detail:m.title,sound:'complete',key:`aspiration:${open.id}:m:${m.id}`})}
   onCompleted={a=>celebrate({kind:'constellation',stars:12,tier:'large',message:pickLine('aspiration'),detail:a.title,sound:'celebrate',key:`aspiration:${a.id}:complete`})}/>}
 </section>;
}

type Arrange={first:boolean;last:boolean;busy:boolean;dragging:boolean;onEarlier:()=>void;onLater:()=>void;onDragStart:()=>void;onDragEnd:()=>void;onDrop:(draggedId:string)=>void};
function AspirationCard({a,areaLabel,progress,today,onOpen,arrange}:{a:Aspiration;areaLabel?:string;progress:Progress;today:string;onOpen:()=>void;arrange?:Arrange}){
 const next=nextMilestone(a),late=a.targetDate&&a.targetDate<today&&isOpen(a);
 return <article className="muse-aspiration-card" data-accent={a.accent??'primary'} data-status={a.status} data-dragging={arrange?.dragging||undefined}
  draggable={!!arrange&&!arrange.busy} onDragStart={arrange?e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',a.id);arrange.onDragStart();}:undefined} onDragEnd={arrange?.onDragEnd}
  onDragOver={arrange?e=>{e.preventDefault();e.dataTransfer.dropEffect='move';}:undefined} onDrop={arrange?e=>{e.preventDefault();arrange.onDrop(e.dataTransfer.getData('text/plain'));}:undefined}>
  {a.planningStyle==='practice'||a.planningStyle==='exploration'?<span className="muse-aspiration-style" aria-hidden="true">◌</span>:<ProgressRing percent={progress.percent} accent={a.accent} size={56}/>}
  <div><span className="small-label">{a.icon?`${a.icon} `:''}{areaLabel??`Uncategorized · ${a.category}`}{a.targetDate?` · ${late?'was due':'by'} ${dateLabel(a.targetDate)}`:a.targetPeriod?` · target ${a.targetPeriod}`:a.timeframe==='someday'?' · someday':a.timeframe==='ongoing'?' · ongoing':' · no deadline'}{a.status==='paused'?' · paused':a.status==='planned'?' · planned':''}</span>
   <h3><button type="button" className="muse-aspiration-open" onClick={onOpen}>{a.title}</button></h3>
   <p>{a.planningStyle==='practice'?'Ongoing practice':a.planningStyle==='exploration'?'Exploration':progressText(a,progress)}{progress.automatic&&progress.available?<small> · from {progress.source}</small>:null}</p>
   {progress.percent===100&&isOpen(a)&&a.planningStyle!=='practice'&&a.planningStyle!=='exploration'?<p className="muse-aspiration-ready">Ready to mark complete</p>:next?<p className="small-label">Next: {next.title}</p>:null}
   {a.renewedFrom&&<p className="small-label">Renewed for {periodLabel(a)}</p>}
   {arrange&&<div className="muse-aspiration-card-actions"><button type="button" className="text-button" disabled={arrange.first||arrange.busy} onClick={arrange.onEarlier} aria-label={`Move ${a.title} earlier`}>← Earlier</button><button type="button" className="text-button" disabled={arrange.last||arrange.busy} onClick={arrange.onLater} aria-label={`Move ${a.title} later`}>Later →</button></div>}</div>
 </article>;
}
