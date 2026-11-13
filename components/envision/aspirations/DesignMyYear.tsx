'use client';
import {useEffect,useId,useMemo,useRef,useState,type CSSProperties} from 'react';
import {useMuseDialog} from '@/components/useMuseDialog';
import {MuseMark} from '@/components/design/MuseHeading';
import {MuseIcon} from '@/components/MuseIcon';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import type {Aspiration} from '@/lib/aspirations/models';
import {areaTone,areaVoice,carryCandidates,focusNudge,inLens,primaryAreaOf,resumeIndex,ritualSteps,roman,stepKey,trackingLabels,trackingOf,trackingPatch,type Tracking} from '@/lib/aspirations/atlas';
import type {LifeArea} from '@/lib/reflections/model';
import {loadBoards} from '@/lib/vision-boards/persistence';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {AtlasConstellation} from './AtlasConstellation';
import {blankAspiration,connectable,connectionId} from './AspirationEditor';
import type {LifeAtlasStore} from './useLifeAtlas';
import './DesignMyYear.css';

type AspirationStore={aspirations:Aspiration[];save:(a:Aspiration)=>Promise<Aspiration|null>;remove:(a:Aspiration)=>Promise<boolean|null>;updates:{aspirationId:string}[]};

/**
 * Design My Year (#190): a ceremony in three movements (Imagine, Become, Declare) and a reveal. It is an editor for
 * the same records the Atlas shows: every aspiration is saved the moment it's written, the ritual only remembers
 * where you were, and revisiting a year loads what's already there, so nothing is ever duplicated.
 */
export function DesignMyYear({year,years,onYear,areas,atlas,store,today,onClose,onRevealed}:{year:number;years:number[];onYear:(y:number)=>void;areas:LifeArea[];atlas:LifeAtlasStore;store:AspirationStore;today:string;onClose:()=>void;onRevealed:()=>void}){
 const ref=useMuseDialog(null);
 const plan=atlas.plans.find(p=>p.year===year);
 const activeAreas=useMemo(()=>areas.filter(a=>!a.archived),[areas]);
 const [hasCarry]=useState(()=>carryCandidates(year,store.aspirations,atlas.priorities).length>0);
 const steps=useMemo(()=>ritualSteps(activeAreas.map(a=>a.id),hasCarry),[activeAreas,hasCarry]);
 const [index,setIndex]=useState(()=>plan?.ritual_completed_at?0:resumeIndex(steps,plan?.ritual_step));
 const [revealing,setRevealing]=useState(false);
 // Aspirations written in this sitting: removing one of those undoes it; anything older is only taken out of the year.
 const [created]=useState(()=>new Set<string>());
 const step=steps[Math.min(index,steps.length-1)];
 const inYear=(a:Aspiration)=>inLens(a,{kind:'year',year},atlas.priorities);
 const areaCount=(id:string)=>store.aspirations.filter(a=>primaryAreaOf(a.id,atlas.links)===id&&inYear(a)).length;
 const stars=activeAreas.map(a=>({id:a.id,label:a.label,count:areaCount(a.id),achieved:0,tone:areaTone(a.position)}));

 async function go(to:number){
  const next=Math.max(0,Math.min(steps.length-1,to));setIndex(next);
  ref.current?.querySelector('.muse-ritual-stage')?.scrollTo({top:0});
  await atlas.updatePlan(year,{ritual_step:stepKey(steps[next]),...(plan?.ritual_started_at?{}:{ritual_started_at:new Date().toISOString()})});
 }
 // Opening the ritual marks it started (so the Atlas can offer "Resume") without creating anything else.
 const started=useRef(false);
 useEffect(()=>{if(started.current||plan?.ritual_started_at)return;started.current=true;void atlas.updatePlan(year,{ritual_started_at:new Date().toISOString(),ritual_step:stepKey(steps[index])});},[atlas,plan,year,steps,index]);

 const position=typeof step==='object'?activeAreas.findIndex(a=>a.id===step.area):-1;
 const movement=step==='imagine'||step==='carry'?'Imagine':step==='declare'?'Declare':'Become';
 return <dialog ref={ref} className="muse-ritual" aria-label={`Design my ${year}`} data-movement={movement.toLowerCase()} onCancel={e=>{e.preventDefault();onClose();}}>
  {revealing?<RitualReveal year={year} stars={stars} mantra={atlas.plans.find(p=>p.year===year)?.theme??''} feelings={atlas.plans.find(p=>p.year===year)?.feelings??[]} onDone={onRevealed}/>:<>
  <header className="muse-ritual-top">
   <p className="muse-ritual-brand"><MuseIcon name="sparkle" size={15}/> <span>Design My <span className="type-numeric">{year}</span></span><small>{movement}</small></p>
   <nav className="muse-ritual-progress" aria-label="Your path through the ritual">
    <ol>{steps.map((st,i)=>{const area=typeof st==='object'?activeAreas.find(a=>a.id===st.area):undefined,label=area?area.label:st==='imagine'?'Prologue':st==='carry'?'Carry forward':'The Year in Your Own Words',count=area?areaCount(area.id):0;
     return <li key={stepKey(st)} data-state={i<index?'done':i===index?'current':'ahead'} data-kind={area?'area':st} data-filled={count>0||undefined} style={area?{'--star':`var(--chart-${areaTone(area.position)})`} as CSSProperties:undefined}>
      <button type="button" aria-current={i===index?'step':undefined} aria-label={`${area?`${roman(activeAreas.indexOf(area))}. `:''}${label}${count?`, ${count} aspiration${count===1?'':'s'}`:''}${i<index?', visited':''}`} title={label} onClick={()=>void go(i)}><span aria-hidden="true"/></button></li>;})}
    </ol>
   </nav>
   <button type="button" className="muse-button button-ghost muse-ritual-leave" onClick={onClose}>Save &amp; close</button>
  </header>
  <div className="muse-ritual-stage" aria-live="polite">
   {step==='imagine'&&<Imagine year={year} years={years} onYear={onYear} revisit={!!plan?.ritual_completed_at} count={store.aspirations.filter(inYear).length} stars={stars}/>}
   {step==='carry'&&<Carry year={year} atlas={atlas} store={store}/>}
   {typeof step==='object'&&<Chapter key={step.area} area={activeAreas[position]} index={position} year={year} today={today} atlas={atlas} store={store} created={created}/>}
   {step==='declare'&&<Declare year={year} atlas={atlas}/>}
  </div>
  {atlas.error&&<p role="alert" className="muse-ritual-error">{atlas.error}</p>}
  <footer className="muse-ritual-bottom">
   <button type="button" className="muse-button button-ghost" disabled={index===0} onClick={()=>void go(index-1)}><span className="muse-ritual-back" aria-hidden="true"><MuseIcon name="chevron" size={15}/></span> Back</button>
   <span className="muse-ritual-where small-label type-numeric">{typeof step==='object'?`Chapter ${position+1} of ${activeAreas.length}`:step==='declare'?'The final chapter':step==='carry'?'Before we begin':'Prologue'}</span>
   {typeof step==='object'&&<button type="button" className="text-button muse-ritual-skip" onClick={()=>void go(index+1)}>Skip this area</button>}
   {step==='declare'?<button type="button" className="muse-button button-primary muse-ritual-finale" disabled={atlas.busy} onClick={()=>void atlas.updatePlan(year,{ritual_completed_at:new Date().toISOString(),established_at:plan?.established_at??new Date().toISOString(),ritual_step:'declare'}).then(p=>{if(p)setRevealing(true);})}><MuseIcon name="sparkle" size={16}/> Bring My Year to Life</button>
    :<button type="button" className="muse-button button-primary" data-dialog-autofocus={step==='imagine'||undefined} onClick={()=>void go(index+1)}>{step==='imagine'?(plan?.ritual_completed_at?'Revisit my chapters':'Begin'):'Next'} <span className="muse-ritual-next" aria-hidden="true"><MuseIcon name="chevron" size={15}/></span></button>}
  </footer></>}
 </dialog>;
}

function Imagine({year,years,onYear,revisit,count,stars}:{year:number;years:number[];onYear:(y:number)=>void;revisit:boolean;count:number;stars:{id:string;label:string;count:number;achieved:number;tone:number}[]}){
 return <section className="muse-ritual-imagine">
  <AtlasConstellation stars={stars.map(s=>({...s,count:Math.max(1,s.count)}))} reveal className="muse-ritual-imagine-sky"/>
  <p className="muse-kicker">Movement I · Imagine</p>
  <h2 className="muse-ritual-year type-numeric">{year}</h2>
  {revisit?<><p className="muse-ritual-lede">Welcome back to your {year}.</p><p>{count?`${count} aspiration${count===1?' is':'s are'} already here.`:'Your chapters are waiting.'} Change anything: add, rethink, set something down. It all updates the same Atlas, with nothing doubled.</p></>
   :<><p className="muse-ritual-lede">Who would you love to become this year?</p>
    <div className="muse-ritual-verses"><p>Picture the end of {year}. What did you try for the first time? What grew? Who did you become a little more of?</p>
     <p>This isn’t a contract. Life changes, and your Atlas changes with it. Write one aspiration or fifty, skip any chapter, and leave whenever you like: everything saves as you go.</p></div></>}
  <div className="muse-ritual-yearpick" role="radiogroup" aria-label="Year to design"><span className="small-label">Designing</span>{years.map(y=><button key={y} type="button" role="radio" aria-checked={y===year} className="type-numeric" onClick={()=>onYear(y)}>{y}</button>)}</div>
 </section>;
}

function Carry({year,atlas,store}:{year:number;atlas:LifeAtlasStore;store:AspirationStore}){
 const list=carryCandidates(year,store.aspirations,atlas.priorities);
 const [picked,setPicked]=useState<string[]>([]),[done,setDone]=useState<string[]>([]);
 async function carry(){for(const id of picked){const a=store.aspirations.find(x=>x.id===id);if(!a)continue;if(await atlas.chooseForYear(a,year,primaryAreaOf(a.id,atlas.links)))setDone(d=>[...d,id]);}setPicked([]);}
 return <section className="muse-ritual-carry">
  <p className="muse-kicker">Before we begin</p><h2>Carry anything forward?</h2>
  <p className="muse-ritual-lede">These were still unfolding when last year closed. Choose any you want to keep nurturing in {year}. The rest stay where they are, with their history.</p>
  <ul className="muse-ritual-carry-list">{list.map(({a,from})=><li key={a.id}><label><input type="checkbox" checked={picked.includes(a.id)} onChange={e=>setPicked(p=>e.target.checked?[...p,a.id]:p.filter(x=>x!==a.id))}/><span><strong>{a.title}</strong><small>From {from}</small></span></label></li>)}
   {done.map(id=>{const a=store.aspirations.find(x=>x.id===id);return a?<li key={id} data-done><span><strong>{a.title}</strong><small>Carried into {year}</small></span></li>:null;})}</ul>
  {list.length===0&&done.length===0&&<p className="small-label">Nothing left to carry.</p>}
  {picked.length>0&&<button type="button" className="muse-button button-primary" disabled={atlas.busy} onClick={()=>void carry()}>Carry {picked.length} into {year}</button>}
 </section>;
}

function Chapter({area,index,year,today,atlas,store,created}:{area:LifeArea;index:number;year:number;today:string;atlas:LifeAtlasStore;store:AspirationStore;created:Set<string>}){
 const voice=areaVoice(area.label),tone=areaTone(area.position),inputId=useId();
 const [title,setTitle]=useState(''),[note,setNote]=useState('');
 const here=store.aspirations.filter(a=>primaryAreaOf(a.id,atlas.links)===area.id&&inLens(a,{kind:'year',year},atlas.priorities)).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
 const elsewhere=store.aspirations.filter(a=>a.status!=='archived'&&a.status!=='completed'&&!here.includes(a)&&(primaryAreaOf(a.id,atlas.links)===area.id||!primaryAreaOf(a.id,atlas.links)));
 const vision=atlas.visions.find(v=>v.year===year&&v.area_id===area.id);
 const [visionText,setVisionText]=useState(vision?.vision??'');
 async function add(){
  const t=title.trim();if(!t)return;setNote('');
  const base=blankAspiration(today);
  const saved=await store.save({...base,title:t,...trackingPatch('later',base),startDate:today<`${year}-01-01`?`${year}-01-01`:today});
  if(!saved)return;created.add(saved.id);setTitle('');
  if(!await atlas.setArea(saved.id,area.id,year)){setNote('Saved, but its Life Area didn’t attach. It’s waiting in your Atlas.');return;}
  if(!await atlas.chooseForYear(saved,year,area.id))setNote(`Saved, but it wasn’t added to ${year}. Try once more from the Atlas.`);
 }
 async function include(a:Aspiration){if(!primaryAreaOf(a.id,atlas.links))await atlas.setArea(a.id,area.id,year);await atlas.chooseForYear(a,year,area.id);}
 async function takeOut(a:Aspiration){
  const fresh=created.has(a.id)&&!a.milestones.length&&!store.updates.some(u=>u.aspirationId===a.id);
  if(fresh){if(await store.remove(a)){created.delete(a.id);atlas.forget(a.id);}return;}
  if(await atlas.unchooseForYear(a.id,year))setNote(`“${a.title}” is out of ${year}, and still safe in your Atlas.`);
 }
 return <section className="muse-ritual-chapter" style={{'--mark-a':`var(--chart-${tone})`,'--mark-b':`var(--chart-${tone%8+1})`} as CSSProperties}>
  <div className="muse-ritual-chapter-intro">
   <p className="muse-kicker">Movement II · Become</p>
   <h2 className="muse-ritual-chapter-title"><MuseMark icon={voice.glyph} tone={tone} size="lg"/><span className="muse-ritual-numeral" aria-hidden="true">{roman(index)}</span><span>{area.label}</span></h2>
   <p className="muse-ritual-prompt">{voice.prompt}</p>
   <label className="muse-ritual-vision"><span>In a sentence, what would you love this part of life to feel like? <small>Optional</small></span>
    <textarea rows={2} maxLength={2000} value={visionText} onChange={e=>setVisionText(e.target.value)} onBlur={()=>{if(visionText!==(vision?.vision??''))void atlas.writeVision(year,area.id,visionText);}}/></label>
  </div>
  <div className="muse-ritual-chapter-page">
   <form className="muse-ritual-add" onSubmit={e=>{e.preventDefault();void add();}}>
    <label htmlFor={inputId}>An aspiration for {area.label}</label>
    <div><input id={inputId} maxLength={120} value={title} placeholder={here.length?'And another…':`${voice.example}…`} onChange={e=>setTitle(e.target.value)} data-dialog-autofocus/>
     <button type="submit" className="muse-button button-primary" disabled={!title.trim()}>Add</button></div>
    <p className="small-label">Press Enter to add, then keep going. Milestones, notes and dates can come later.</p>
   </form>
   {note&&<p className="muse-ritual-note" role="status">{note}</p>}
   {here.length>0&&<ol className="muse-ritual-list">{here.map(a=><RitualItem key={a.id} a={a} year={year} store={store} onTakeOut={()=>void takeOut(a)} fresh={created.has(a.id)}/>)}</ol>}
   {here.length===0&&<p className="muse-ritual-empty">An open page. Write something, choose from your Atlas, or skip this chapter. Every one is optional.</p>}
   {focusNudge(here.length)&&<p className="muse-ritual-nudge"><MuseIcon name="sparkle" size={14}/> That’s a full chapter. Which of these feel most important to nurture this year? Anything can wait for another year; it stays in your Atlas.</p>}
   {elsewhere.length>0&&<details className="muse-ritual-existing"><summary>Choose from your Atlas ({elsewhere.length})</summary><ul>{elsewhere.map(a=><li key={a.id}><span>{a.title}{!primaryAreaOf(a.id,atlas.links)&&<small> · no Life Area yet</small>}</span><button type="button" className="text-button" disabled={atlas.busy} onClick={()=>void include(a)}>Add to {year}</button></li>)}</ul></details>}
  </div>
 </section>;
}

function RitualItem({a,year,store,onTakeOut,fresh}:{a:Aspiration;year:number;store:AspirationStore;onTakeOut:()=>void;fresh:boolean}){
 const [open,setOpen]=useState(false),[target,setTarget]=useState(a.target?String(a.target):''),[unit,setUnit]=useState(a.unit??''),[steps,setSteps]=useState('');
 const t=trackingOf(a),panel=useId();
 async function choose(next:Tracking){await store.save({...a,...trackingPatch(next,a)});}
 async function saveTarget(){const n=Number(target);if(!(n>0))return;await store.save({...a,progressKind:a.progressKind==='connected'?'connected':'numeric',target:n,unit:unit.trim()||null});}
 async function addSteps(){const lines=steps.split('\n').map(l=>l.trim()).filter(Boolean).slice(0,20);if(!lines.length)return;if(await store.save({...a,progressKind:'milestones',milestones:[...a.milestones,...lines.map(title=>({id:crypto.randomUUID(),title:title.slice(0,120)}))]}))setSteps('');}
 return <li className="muse-ritual-item">
  <div className="muse-ritual-item-row"><span className="muse-ritual-item-star" aria-hidden="true"/><strong>{a.title}</strong>
   <button type="button" className="muse-ritual-track" aria-expanded={open} aria-controls={panel} onClick={()=>setOpen(!open)}>{trackingLabels[t].label}</button>
   <button type="button" className="muse-ritual-remove" aria-label={fresh?`Remove ${a.title}`:`Take ${a.title} out of ${year}`} title={fresh?'Remove':`Take out of ${year}`} onClick={onTakeOut}><MuseIcon name="close" size={14}/></button></div>
  {open&&<div className="muse-ritual-track-panel" id={panel}>
   <p className="small-label">How would you like to recognize your progress? Entirely optional, and easy to change later.</p>
   <div className="muse-ritual-track-options" role="radiogroup" aria-label={`Tracking for ${a.title}`}>{(Object.keys(trackingLabels) as Tracking[]).map(k=><button key={k} type="button" role="radio" aria-checked={t===k} onClick={()=>void choose(k)}><strong>{trackingLabels[k].label}</strong><small>{trackingLabels[k].detail}</small></button>)}</div>
   {t==='milestones'&&<div className="muse-ritual-track-extra"><label>Steps along the way <small className="small-label">· one per line</small><textarea rows={3} value={steps} placeholder={'Learn the machine\nA small first project\nSomething wearable'} onChange={e=>setSteps(e.target.value)}/></label>{a.milestones.length>0&&<p className="small-label">{a.milestones.length} milestone{a.milestones.length===1?'':'s'} so far.</p>}<button type="button" className="muse-button" disabled={!steps.trim()} onClick={()=>void addSteps()}>Add steps</button></div>}
   {t==='target'&&<div className="muse-ritual-track-extra muse-ritual-track-target"><label>Target<input type="number" min={0} step="any" value={target} onChange={e=>setTarget(e.target.value)}/></label><label>Unit<input maxLength={24} value={unit} placeholder="pull-ups, dollars…" onChange={e=>setUnit(e.target.value)}/></label><button type="button" className="muse-button" disabled={!(Number(target)>0)} onClick={()=>void saveTarget()}>Save target</button></div>}
   {t==='connected'&&<div className="muse-ritual-track-extra"><div className="muse-aspiration-choice"><span>Count from</span><MuseChoiceMenu label="Count from" valueLabel={connectable.find(c=>c.id===connectionId(a.connection))?.label??'Choose…'} selectedIds={[connectionId(a.connection)]} options={connectable.map(c=>({id:c.id,label:c.label}))} onSelect={id=>{const c=connectable.find(x=>x.id===id);if(c)void store.save({...a,progressKind:'connected',connection:c.connection(String(year)),targetDate:a.targetDate??`${year}-12-31`});}}/></div>
    {a.connection?.kind==='reading-challenge'?<p className="small-label">Progress and the goal come from your {year} Reading Challenge in Books. Nothing is copied.</p>:a.connection&&<div className="muse-ritual-track-target"><label>Target<input type="number" min={0} step="any" value={target} onChange={e=>setTarget(e.target.value)}/></label><button type="button" className="muse-button" disabled={!(Number(target)>0)} onClick={()=>void saveTarget()}>Save target</button></div>}</div>}
  </div>}
 </li>;
}

function Declare({year,atlas}:{year:number;atlas:LifeAtlasStore}){
 const plan=atlas.plans.find(p=>p.year===year);
 const [theme,setTheme]=useState(plan?.theme??''),[feelings,setFeelings]=useState<string[]>(()=>[0,1,2].map(i=>plan?.feelings?.[i]??'')),[focus,setFocus]=useState(plan?.focus??''),[extra,setExtra]=useState(plan?.extraordinary??'');
 const [boards,setBoards]=useState<{id:string;title:string}[]|null>(null),client=useMemo(()=>createMuseBrowserClient(),[]);
 useEffect(()=>{let live=true;loadBoards(client).then(list=>{if(live)setBoards(list.map(({id,title})=>({id,title})));}).catch(()=>{if(live)setBoards([]);});return()=>{live=false;};},[client]);
 const persist=(patch:Parameters<LifeAtlasStore['updatePlan']>[1])=>void atlas.updatePlan(year,patch);
 const cleanFeelings=(list:string[])=>list.map(f=>f.trim().slice(0,60)).filter(Boolean);
 return <section className="muse-ritual-declare">
  <span className="muse-ritual-declare-year type-numeric" aria-hidden="true">{year}</span>
  <header className="muse-ritual-declare-head">
   <p className="muse-kicker">Movement III · Declare</p>
   <h2>The Year in Your Own Words</h2>
   <p className="muse-ritual-lede">The character of {year}, in a few words that are entirely yours.</p>
  </header>
  <label className="muse-ritual-mantra"><span>My word or mantra for {year}</span>
   <input maxLength={500} value={theme} placeholder="Courage. Say yes. Softly, steadily." onChange={e=>setTheme(e.target.value)} onBlur={()=>{if(theme!==(plan?.theme??''))persist({theme});}}/></label>
  <fieldset className="muse-ritual-feelings"><legend>Three feelings I want more of</legend>
   <ol>{feelings.map((f,i)=><li key={i} data-lit={f.trim()?true:undefined}><span className="muse-ritual-feeling-star" aria-hidden="true"/>
    <input aria-label={`Feeling ${i+1}`} maxLength={60} value={f} placeholder={['wonder','courage','peace'][i]} onChange={e=>setFeelings(list=>list.map((x,j)=>j===i?e.target.value:x))} onBlur={()=>{const next=cleanFeelings(feelings);if(next.join('|')!==(plan?.feelings??[]).join('|'))persist({feelings:next});}}/></li>)}</ol>
  </fieldset>
  <div className="muse-ritual-letters">
   <label className="muse-ritual-letter"><span>The one thing I most want to nurture</span><textarea rows={3} maxLength={500} value={focus} placeholder="My health, my marriage, my art…" onChange={e=>setFocus(e.target.value)} onBlur={()=>{if(focus!==(plan?.focus??''))persist({focus});}}/></label>
   <label className="muse-ritual-letter"><span>What would make {year} feel extraordinary?</span><textarea rows={3} maxLength={2000} value={extra} placeholder="If I look back in December and…" onChange={e=>setExtra(e.target.value)} onBlur={()=>{if(extra!==(plan?.extraordinary??''))persist({extraordinary:extra});}}/></label>
  </div>
  <div className="muse-ritual-boardpick"><p><span>A vision board for {year}</span><small>optional</small></p>
   {boards===null?<p className="small-label">Looking for your boards…</p>:boards.length===0&&!plan?.vision_board_name?<p className="small-label">No vision boards yet. You can make one in Envision → Vision Boards and link it here any time.</p>:
   <div className="muse-ritual-boards" role="radiogroup" aria-label="Vision board">{boards.map(b=><button key={b.id} type="button" role="radio" aria-checked={plan?.vision_board_id===b.id} onClick={()=>persist(plan?.vision_board_id===b.id?{vision_board_id:null,vision_board_name:null}:{vision_board_id:b.id,vision_board_name:b.title.slice(0,120)})}><MuseMark icon="envision" tone={6} size="sm"/><span>{b.title}</span></button>)}
    {plan?.vision_board_name&&!plan.vision_board_id&&<p className="small-label">{plan.vision_board_name} is no longer available.</p>}</div>}</div>
 </section>;
}

/** The reveal: points of light, threads between them, then the year and its words. Skippable; still when motion is reduced. */
function RitualReveal({year,stars,mantra,feelings,onDone}:{year:number;stars:{id:string;label:string;count:number;achieved:number;tone:number}[];mantra:string;feelings:string[];onDone:()=>void}){
 useEffect(()=>{const b=document.querySelector<HTMLButtonElement>('.muse-ritual-reveal [data-enter]');b?.focus();},[]);
 return <section className="muse-ritual-reveal" aria-labelledby="muse-ritual-reveal-title">
  <AtlasConstellation stars={stars} labelled reveal className="muse-ritual-reveal-sky"/>
  <div className="muse-ritual-reveal-words">
   <p className="muse-kicker">Your Life Atlas</p>
   <h2 id="muse-ritual-reveal-title" className="type-numeric">{year}</h2>
   {mantra&&<p className="muse-ritual-reveal-mantra"><q>{mantra}</q></p>}
   {feelings.length>0&&<ul className="muse-lifeatlas-feelings">{feelings.map(f=><li key={f}>{f}</li>)}</ul>}
   <p className="muse-ritual-reveal-line">{stars.filter(s=>s.count).length?`${stars.reduce((n,s)=>n+s.count,0)} aspirations across ${stars.filter(s=>s.count).length} Life Areas. Here’s to the year ahead.`:'A year with room for anything. Here’s to it.'}</p>
   <button type="button" className="muse-button button-primary" data-enter onClick={onDone}>Enter my Atlas</button>
  </div>
  <button type="button" className="text-button muse-ritual-reveal-skip" onClick={onDone}>Skip</button>
 </section>;
}
