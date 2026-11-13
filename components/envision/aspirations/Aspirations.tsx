'use client';
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {useRitualView} from '../../rituals/ConnectedRituals';
import {usePlanner} from '../../PlannerStore';
import {useWhimsyData} from '../../whimsy/WhimsyData';
import {celebrate} from '@/lib/celebrate';
import {pickLine} from '@/lib/celebration-copy';
import {challengeFor,challengeProgress} from '@/lib/whimsy/reading-challenge';
import type {Aspiration,Milestone} from '@/lib/aspirations/models';
import {aspirationProgress,canRenew,isOpen,newThresholds,nextPeriod,renewalChain,renewedAspiration,reorder,type Progress} from '@/lib/aspirations/progress';
import {areaTone,areaVoice,atlasCounts,defaultLens,inLens,isEstablished,knownYears,lensKey,matchesSearch,matchesStatus,planningYear,primaryAreaOf,quarterIn,relatedOf,roman,secondaryAreasOf,trackingPatch,yearsOf,type Lens,type StatusFilter} from '@/lib/aspirations/atlas';
import {aspirationSignals} from '@/lib/almanac/signals';
import {surfaces} from '@/lib/almanac/select';
import {AlmanacWhisper} from '../../almanac/AlmanacWhisper';
import {MuseMark} from '@/components/design/MuseHeading';
import {MuseIcon} from '@/components/MuseIcon';
import {EntryCarousel} from '@/components/design/EntryCarousel';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {useAspirations} from './useAspirations';
import {useLifeAtlas} from './useLifeAtlas';
import {AspirationEditor,blankAspiration} from './AspirationEditor';
import {AspirationDetail} from './AspirationDetail';
import {AtlasDetailPanel} from './AtlasDetailPanel';
import {AtlasArea,StatusStar,type RowItem} from './AtlasArea';
import {AtlasHero,AtlasToolbar,AtlasWelcome,type RitualCall} from './AtlasHero';
import {DesignMyYear} from './DesignMyYear';
import {CompletionSheet} from './CompletionSheet';
import {periodLabel} from './parts';
import './Aspirations.css';
import './LifeAtlas.css';

const lensStore='muse.atlas.lens';
const sourceHref=(a:Aspiration)=>a.connection?.kind==='reading-challenge'?'/collections/reading-atlas':undefined;
const longDate=(d:string)=>new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));

/**
 * Life Atlas (#190): the one home for aspirations. A year (or All, or Undated) is a lens over the same records; the
 * ten Life Areas hold the actual aspirations, each expandable in place; Design My Year is a guided editor for the same
 * Atlas. Connected progress is read from its owner (Books, the progress engine), never copied.
 */
export function Aspirations(){
 const {state:ritualState,sources,today}=useRitualView(),{state:planner}=usePlanner(),whimsy=useWhimsyData();
 const {aspirations,updates,status,save,remove,addUpdate,removeUpdate}=useAspirations();
 const atlas=useLifeAtlas();
 const [lens,setLensState]=useState<Lens|null>(null),[search,setSearch]=useState(''),[statusFilter,setStatusFilter]=useState<StatusFilter>('all'),[quarter,setQuarter]=useState<number|null>(null);
 const [expanded,setExpanded]=useState<string|null>(null),[openId,setOpenId]=useState<string|null>(null),[editing,setEditing]=useState<Aspiration|null>(null),[newArea,setNewArea]=useState<string|null>(null);
 const [ritualYear,setRitualYear]=useState<number|null>(null),[keepsakeId,setKeepsakeId]=useState<string|null>(null),[openedEmpty,setOpenedEmpty]=useState<string[]>([]),[built,setBuilt]=useState(false);
 const [dragging,setDragging]=useState<string|null>(null),[notice,setNotice]=useState('');
 const books=whimsy.records?.books,goals=whimsy.records?.goals;
 const ctx=useMemo(()=>({updates,sources,books,readingGoals:goals,today:today||''}),[updates,sources,books,goals,today]);
 const progressMap=useMemo(()=>new Map<string,Progress>(aspirations.map(a=>[a.id,aspirationProgress(a,ctx)])),[aspirations,ctx]);
 const progressOf=useCallback((a:Aspiration)=>progressMap.get(a.id)??aspirationProgress(a,ctx),[progressMap,ctx]);

 // The lens: an explicit choice on this device wins; otherwise a sensible planning year.
 useEffect(()=>{if(lens||!today||!atlas.loaded)return;let saved:string|null=null;try{saved=window.localStorage.getItem(lensStore);}catch{/* optional */}
  const t=window.setTimeout(()=>setLensState(defaultLens(today,atlas.plans,saved)),0);return ()=>window.clearTimeout(t);},[lens,today,atlas.loaded,atlas.plans]);
 const setLens=(l:Lens)=>{setLensState(l);setQuarter(null);try{window.localStorage.setItem(lensStore,lensKey(l));}catch{/* optional */}};

 // #117: `?open=<id>` (from Intentions and other modules) opens that aspiration once, when it's loaded.
 const requestedOpen=useSearchParams()?.get('open')??null,openedRequest=useRef<string|null>(null);
 useEffect(()=>{if(!requestedOpen||openedRequest.current===requestedOpen||!aspirations.some(a=>a.id===requestedOpen))return;openedRequest.current=requestedOpen;const t=window.setTimeout(()=>setOpenId(requestedOpen),0);return ()=>window.clearTimeout(t);},[requestedOpen,aspirations]);

 // Quarter thresholds celebrate once per aspiration, on any device (stored on the aspiration).
 const celebratedNow=useRef(new Set<string>());
 useEffect(()=>{if(!status.loaded||!today||status.saving)return;
  for(const a of aspirations){if(!isOpen(a)||a.planningStyle==='practice'||a.planningStyle==='exploration'||a.showProgress===false)continue;const p=progressOf(a);if(!p.available)continue;const fresh=newThresholds(a,p.percent);
   if(!fresh.length||celebratedNow.current.has(a.id))continue;celebratedNow.current.add(a.id);
   const top=Number(fresh.at(-1)!.slice(1));
   celebrate({kind:top===100?'constellation':'starburst',stars:top===100?10:4,tier:top===100?'large':'small',message:pickLine(top===100?'aspiration':'aspirationProgress'),detail:`${a.title} · ${top}%`,sound:top===100?'celebrate':'confirm',key:`aspiration:${a.id}:p${top}`});
   void save({...a,celebrated:[...new Set([...a.celebrated,...fresh])]});break;}
 },[aspirations,status.loaded,status.saving,today,progressOf,save]);
 const signals=useMemo(()=>today&&status.loaded?aspirationSignals(aspirations,updates,progressOf,today):[],[aspirations,updates,progressOf,today,status.loaded]);

 if(!today)return <p className="small-label" role="status">Loading…</p>;
 const year=Number(today.slice(0,4)),planYear=planningYear(today);
 const areas=atlas.areas,activeAreas=areas.filter(a=>!a.archived);
 // Once a year has been brought to life, the next one is ready to design.
 const designed=atlas.plans.filter(p=>p.ritual_completed_at).map(p=>p.year);
 const years=[...new Set([...knownYears(aspirations,atlas.priorities,atlas.plans,today),...(designed.length?[Math.max(...designed)+1]:[])])].sort((a,b)=>a-b);
 const ritualYears=[...new Set([...years,Math.max(...years)+1])].filter(y=>y>=year-1).sort((a,b)=>a-b);
 const established=built||isEstablished(atlas.plans,atlas.links,atlas.priorities);

 // ---------- Writes ----------
 async function createInArea(title:string,areaId:string|null,inYear:number|null){
  const base=blankAspiration(today!);
  const saved=await save({...base,title,...trackingPatch('later',base)});if(!saved)return null;
  if(areaId&&!await atlas.setArea(saved.id,areaId,year))setNotice('Saved, but its Life Area didn’t attach. It’s waiting at the top of your Atlas.');
  if(inYear&&!await atlas.chooseForYear(saved,inYear,areaId))setNotice(`Saved, but it wasn’t added to ${inYear}. Choose the year from its details.`);
  return saved;
 }
 async function createFromEditor(a:Aspiration){
  const p=aspirationProgress(a,ctx);const saved=await save({...a,celebrated:newThresholds({...a,celebrated:[]},p.percent)});if(!saved)return;
  if(newArea)await atlas.setArea(saved.id,newArea,year);
  if(lens?.kind==='year')await atlas.chooseForYear(saved,lens.year,newArea);
  setNewArea(null);setEditing(null);setExpanded(saved.id);
 }
 async function toggleMilestone(a:Aspiration,ms:Milestone){const done=!ms.completedOn,next=a.milestones.map(x=>x.id===ms.id?{...x,completedOn:done?today!:undefined}:x);
  const saved=await save({...a,milestones:next});if(saved&&done){celebrate({kind:'starburst',stars:5,tier:'small',message:pickLine('aspirationMilestone'),detail:ms.title,sound:'complete',key:`aspiration:${a.id}:m:${ms.id}`});void addUpdate({id:crypto.randomUUID(),aspirationId:a.id,recordedOn:today!,value:null,note:null,milestoneId:ms.id});}}
 async function achieve(a:Aspiration){const saved=await save({...a,status:'completed',completedOn:today!});if(!saved)return;
  celebrate({kind:'constellation',stars:12,tier:'large',message:pickLine('aspiration'),detail:a.title,sound:'celebrate',key:`aspiration:${a.id}:complete`});
  setOpenId(null);setKeepsakeId(a.id);}
 async function renew(a:Aspiration){const next=renewedAspiration(a,crypto.randomUUID(),new Date().toISOString());const saved=await save({...next,celebrated:[]});if(saved){const area=primaryAreaOf(a.id,atlas.links);if(area)await atlas.setArea(saved.id,area,year);setOpenId(saved.id);}}
 async function moveTo(list:Aspiration[],id:string,index:number){for(const changed of reorder(list,id,index)){if(!await save(changed))break;}}
 async function buildMyself(){if(await atlas.updatePlan(planYear,{established_at:new Date().toISOString()})){setBuilt(true);setLens({kind:'year',year:planYear});}}

 const open=aspirations.find(a=>a.id===openId)??null,keepsake=aspirations.find(a=>a.id===keepsakeId)??null;
 const overlays=<>
  {ritualYear&&<DesignMyYear key={ritualYear} year={ritualYear} years={ritualYears} onYear={setRitualYear} areas={areas} atlas={atlas} store={{aspirations,save,remove,updates}} today={today}
   onClose={()=>setRitualYear(null)} onRevealed={()=>{const y=ritualYear;setRitualYear(null);setBuilt(true);setLens({kind:'year',year:y});window.scrollTo({top:0});}}/>}
  {editing&&<AspirationEditor initial={editing} today={today} busy={status.saving} error={status.error} areas={areas} primaryArea={newArea} onPrimaryAreaChange={setNewArea} onClose={()=>{setNewArea(null);setEditing(null);}} onSave={a=>void (a.revision===0?createFromEditor(a):save(a).then(s=>{if(s)setEditing(null);}))}/>}
  {open&&!editing&&<AspirationDetail a={open} areaLabel={areas.find(x=>x.id===primaryAreaOf(open.id,atlas.links))?.label} books={books??[]} progress={progressOf(open)} updates={updates} ritualState={ritualState} tasks={planner.tasks} today={today} busy={status.saving} error={status.error}
   atlasPanel={<AtlasDetailPanel a={open} all={aspirations} atlas={atlas} today={today} years={ritualYears} busy={status.saving} onSave={save} onOpen={setOpenId}/>}
   onAchieve={()=>void achieve(open)} onKeepsake={()=>{setKeepsakeId(open.id);setOpenId(null);}}
   actions={{save,addUpdate,removeUpdate,remove:async a=>{const ok=await remove(a);if(ok)atlas.forget(a.id);return ok;}}} onEdit={()=>setEditing(open)} onClose={()=>setOpenId(null)}
   periods={renewalChain(open,aspirations)} renewLabel={canRenew(open,aspirations)?periodLabel({...open,...(()=>{const p=nextPeriod(open)!;return {startDate:p.start,targetDate:p.target};})()}):null} onRenew={()=>void renew(open)} onOpenPeriod={id=>setOpenId(id)}
   onMilestoneDone={m=>celebrate({kind:'starburst',stars:5,tier:'small',message:pickLine('aspirationMilestone'),detail:m.title,sound:'complete',key:`aspiration:${open.id}:m:${m.id}`})}
   onCompleted={a=>celebrate({kind:'constellation',stars:12,tier:'large',message:pickLine('aspiration'),detail:a.title,sound:'celebrate',key:`aspiration:${a.id}:complete`})}/>}
  {keepsake&&<CompletionSheet a={keepsake} today={today} busy={status.saving} error={status.error} onSave={save} onClose={()=>setKeepsakeId(null)}/>}
 </>;

 if(!status.loaded||!atlas.loaded||!lens)return <section className="muse-aspirations muse-life-atlas" aria-label="Life Atlas">
  {(status.error||atlas.error)&&<p role="alert" className="muse-aspiration-error">{status.error||atlas.error}</p>}
  <div className="muse-lifeatlas-loading" role="status"><span className="muse-lifeatlas-loading-star" aria-hidden="true"/>Opening your Life Atlas…</div></section>;

 // ---------- What the lens shows ----------
 const visible=aspirations.filter(a=>inLens(a,lens,atlas.priorities)&&matchesStatus(a,statusFilter)&&matchesSearch(a,search)&&(!quarter||(lens.kind==='year'&&quarterIn(a,lens.year)===quarter)));
 const filtering=!!search.trim()||statusFilter!=='all'||!!quarter;
 const byOrder=(x:Aspiration,y:Aspiration)=>Number(x.status==='completed')-Number(y.status==='completed')||x.position-y.position||x.createdAt.localeCompare(y.createdAt);
 const titleOf=(id:string)=>aspirations.find(x=>x.id===id)?.title;
 const rowItem=(a:Aspiration,list:Aspiration[],i:number):RowItem=>{
  const linkedTasks=a.taskIds.map(id=>planner.tasks.find(t=>t.id===id)).filter((t):t is NonNullable<typeof t>=>!!t);
  const latest=updates.filter(u=>u.aspirationId===a.id&&u.note).sort((x,y)=>y.recordedOn.localeCompare(x.recordedOn)||y.createdAt.localeCompare(x.createdAt))[0]?.note??undefined;
  const arranging=!filtering&&list.length>1;
  return {a,progress:progressOf(a),
   context:{secondary:secondaryAreasOf(a.id,atlas.links).map(id=>areas.find(x=>x.id===id)?.label).filter((x):x is string=>!!x),years:yearsOf(a.id,atlas.priorities),
    related:relatedOf(a.id,atlas.related).map(id=>({id,title:titleOf(id)??''})).filter(r=>r.title),rituals:a.ritualIds.map(id=>ritualState.rituals.find(r=>r.id===id)?.name).filter((x):x is string=>!!x),
    tasks:{done:linkedTasks.filter(t=>t.complete).length,total:linkedTasks.length},latestNote:latest,sourceHref:sourceHref(a)},
   actions:{toggleMilestone:ms=>void toggleMilestone(a,ms),addMilestone:async t=>!!await save({...a,...(a.progressKind==='binary'&&a.planningStyle!=='achievement'?{progressKind:'milestones' as const}:{}),milestones:[...a.milestones,{id:crypto.randomUUID(),title:t.slice(0,120)}]}),
    addNote:async note=>!!await addUpdate({id:crypto.randomUUID(),aspirationId:a.id,recordedOn:today,value:null,note,milestoneId:null}),
    record:async value=>!!await addUpdate({id:crypto.randomUUID(),aspirationId:a.id,recordedOn:today,value,note:null,milestoneId:null}),
    achieve:()=>void achieve(a),open:()=>setOpenId(a.id),openRelated:id=>setOpenId(id)},
   arrange:arranging?{first:i===0,last:i===list.length-1,busy:status.saving,dragging:dragging===a.id,onEarlier:()=>void moveTo(list,a.id,i-1),onLater:()=>void moveTo(list,a.id,i+1),
    onDragStart:()=>setDragging(a.id),onDragEnd:()=>setDragging(null),onDrop:dragged=>{const id=dragged||dragging;if(id&&id!==a.id)void moveTo(list,id,i);setDragging(null);}}:undefined};
 };
 const known=(id:string|null)=>!!id&&areas.some(x=>x.id===id);
 const sections=areas.map(area=>({area,list:visible.filter(a=>primaryAreaOf(a.id,atlas.links)===area.id).sort(byOrder)})).filter(s=>s.list.length||(!s.area.archived&&!filtering&&openedEmpty.includes(s.area.id)));
 const awaiting=visible.filter(a=>!known(primaryAreaOf(a.id,atlas.links))).sort(byOrder);
 const emptyAreas=activeAreas.filter(area=>!sections.some(s=>s.area.id===area.id));
 const inLensAll=aspirations.filter(a=>inLens(a,lens,atlas.priorities)&&a.status!=='archived');
 const stars=activeAreas.map(area=>{const list=inLensAll.filter(a=>primaryAreaOf(a.id,atlas.links)===area.id);return {id:area.id,label:area.label,count:list.length,achieved:list.filter(a=>a.status==='completed').length,tone:areaTone(area.position)};});
 const achieved=inLensAll.filter(a=>a.status==='completed').sort((x,y)=>(y.completedOn??'').localeCompare(x.completedOn??''));
 const lensYear=lens.kind==='year'?lens.year:null,plan=atlas.plans.find(p=>p.year===(lensYear??planYear));
 // The ritual offered from a year that's nearly over (or past) is next year's, unless that year was already designed.
 const heroYear=lensYear&&(lensYear>=planYear||plan?.ritual_started_at)?lensYear:planYear,heroPlan=atlas.plans.find(p=>p.year===heroYear);
 const ritual:RitualCall={kind:heroPlan?.ritual_completed_at?'revisit':heroPlan?.ritual_started_at?'resume':'design',label:heroPlan?.ritual_completed_at?`Revisit My ${heroYear}`:heroPlan?.ritual_started_at?`Resume designing ${heroYear}`:`Design My ${heroYear}`,onClick:()=>setRitualYear(heroYear)};
 const challenge=goals&&lensYear?challengeFor(goals,String(lensYear)):null;
 const challengeLinked=!!lensYear&&aspirations.some(a=>a.connection?.kind==='reading-challenge'&&a.connection.year===String(lensYear));
 const challengeView=challenge&&books&&!challengeLinked&&lensYear?challengeProgress(challenge,books,String(lensYear),today):null;
 const otherCount=aspirations.filter(a=>a.status!=='archived').length-inLensAll.length;
 const busy=status.saving||atlas.busy;
 const trophy=(a:Aspiration)=><button type="button" className="muse-lifeatlas-trophy" onClick={()=>setOpenId(a.id)}><StatusStar status="completed"/><strong>{a.title}</strong><small>{a.completedOn?longDate(a.completedOn):'Achieved'}</small>{a.completion?.meaningful&&<q>{a.completion.meaningful}</q>}</button>;
 const toggle=(id:string)=>setExpanded(e=>e===id?null:id);
 const openPage=(label:string,id:string)=>{setOpenedEmpty(o=>[...o,id]);window.setTimeout(()=>document.querySelector<HTMLInputElement>(`input[placeholder="Add to ${CSS.escape(label)}…"]`)?.focus(),80);};

 return <section className="muse-aspirations muse-life-atlas" aria-label="Life Atlas">
  <AlmanacWhisper surface={surfaces.aspirations} signals={signals} today={today}/>
  {(status.error||atlas.error)&&!editing&&!open&&!ritualYear&&<p role="alert" className="muse-aspiration-error">{status.error||atlas.error}</p>}
  {notice&&<p role="status" className="muse-lifeatlas-notice">{notice} <button type="button" className="text-button" onClick={()=>setNotice('')}>Dismiss</button></p>}
  {!established?<AtlasWelcome year={planYear} stars={stars} existing={aspirations.length} draft={!!atlas.plans.find(p=>p.year===planYear)?.ritual_started_at} onDesign={()=>setRitualYear(planYear)} onBuild={()=>void buildMyself()}/>
  :<>
   <AtlasHero lens={lens} plan={lensYear?plan:undefined} counts={atlasCounts(inLensAll)} stars={stars} ritual={ritual} onAdd={()=>setEditing(blankAspiration(today))} boardHref={plan?.vision_board_id?`/envision?view=vision-boards&board=${plan.vision_board_id}`:undefined}/>
   <AtlasToolbar lens={lens} years={years} onLens={setLens} search={search} onSearch={setSearch} status={statusFilter} onStatus={setStatusFilter} quarter={quarter} onQuarter={setQuarter}/>
   {challengeView&&<article className="muse-lifeatlas-suggest"><MuseMark icon="openbook" tone={3}/><div><p className="muse-kicker">From Books · updates automatically</p><h3>{lensYear} Reading Challenge</h3><p className="type-numeric">{challengeView.done} of {challengeView.target} books{challengeView.reached?' · complete':''}</p></div>
    <button type="button" className="muse-button" onClick={()=>setEditing({...blankAspiration(today),title:`Read ${challengeView.target} books in ${lensYear}`,icon:'📚',progressKind:'connected',connection:{kind:'reading-challenge',year:String(lensYear)},targetDate:`${lensYear}-12-31`})}>Make it an aspiration</button></article>}
   {awaiting.length>0&&<AtlasArea id="awaiting" kind="awaiting" glyph="map" tone={7} numeral="✦" label="Waiting for a Life Area" whisper="Choose where each of these belongs. You decide; nothing is sorted for you."
    items={awaiting.map((a,i)=>({...rowItem(a,awaiting,i),arrange:undefined,aside:<MuseChoiceMenu label={`Life Area for ${a.title}`} variant="chip" icon="envision" valueLabel="Choose area" selectedIds={[]} options={activeAreas.map(x=>({id:x.id,label:x.label}))} onSelect={id=>void atlas.setArea(a.id,id,year)}/>}))}
    expanded={expanded} onToggle={toggle} busy={busy} today={today}/>}
   {sections.map(({area,list})=>{const voice=areaVoice(area.label);return <AtlasArea key={area.id} id={area.id} glyph={voice.glyph} tone={areaTone(area.position)} numeral={roman(area.position)} label={area.label+(area.archived?' (archived)':'')} whisper={voice.whisper}
    vision={lensYear?atlas.visions.find(v=>v.year===lensYear&&v.area_id===area.id)?.vision||undefined:undefined} items={list.map((a,i)=>rowItem(a,list,i))} expanded={expanded} onToggle={toggle}
    onAdd={area.archived?undefined:async title=>!!await createInArea(title,area.id,lensYear)} busy={busy} today={today} emptyNote="An open page"/>;})}
   {!visible.length&&<div className="muse-lifeatlas-empty">{filtering?<p>Nothing matches. <button type="button" className="text-button" onClick={()=>{setSearch('');setStatusFilter('all');setQuarter(null);}}>Clear the filters</button></p>
    :<><p className="muse-lifeatlas-empty-title">{lens.kind==='year'?`${lens.year} is an open book.`:lens.kind==='undated'?'Every aspiration has a year.':'Your Atlas is ready for its first aspiration.'}</p>
     <p>{lens.kind==='year'?'Design your year with the guided ritual, or write straight into any Life Area below.':'Choose any Life Area below to begin.'}{otherCount>0&&<> {otherCount} more live in other years: <button type="button" className="text-button" onClick={()=>setLens({kind:'all'})}>see them all</button>.</>}</p></>}</div>}
   {!filtering&&emptyAreas.length>0&&<section className="muse-lifeatlas-shelf" aria-labelledby="muse-lifeatlas-open-title"><div className="muse-lifeatlas-shelf-head"><h3 id="muse-lifeatlas-open-title">Open pages</h3><p className="small-label">{lens.kind==='year'?`Life Areas with nothing in ${lens.year} yet. That’s allowed.`:'Life Areas with nothing here yet.'}</p></div>
    <EntryCarousel items={emptyAreas} label="Open Life Areas" minWidth={200} itemKey={a=>a.id} describe={a=>a.label} render={area=>{const voice=areaVoice(area.label);return <button type="button" className="muse-lifeatlas-open-tile" onClick={()=>openPage(area.label,area.id)}>
     <MuseMark icon={voice.glyph} tone={areaTone(area.position)}/><span><strong>{area.label}</strong><small>{voice.whisper}</small></span><span className="muse-lifeatlas-open-plus" aria-hidden="true">+</span><span className="sr-only">Add an aspiration</span></button>;}}/></section>}
   {achieved.length>0&&statusFilter!=='archived'&&<section className="muse-lifeatlas-shelf" data-kind="achieved" aria-labelledby="muse-lifeatlas-achieved-title"><div className="muse-lifeatlas-shelf-head"><h3 id="muse-lifeatlas-achieved-title">{lens.kind==='year'?`Achieved in your ${lens.year}`:'Achieved'}</h3><p className="small-label">Kept here for good: the record of what you did.</p></div>
    {achieved.length<=4?<div className="muse-lifeatlas-trophies" role="list" aria-label="Achieved aspirations">{achieved.map(a=><div role="listitem" key={a.id}>{trophy(a)}</div>)}</div>:<EntryCarousel items={achieved} label="Achieved aspirations" minWidth={220} itemKey={a=>a.id} describe={a=>a.title} render={a=>trophy(a)}/>}</section>}
   <p className="muse-lifeatlas-footnote small-label"><MuseIcon name="info" size={13}/> Life Areas are shared with <Link href="/planner?view=reflections">Reflections</Link>. Your Level 10 ratings there stay separate from what you achieve here.</p>
  </>}
  {overlays}
 </section>;
}
