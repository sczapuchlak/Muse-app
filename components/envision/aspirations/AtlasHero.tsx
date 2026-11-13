'use client';
import Link from 'next/link';
import type {ReactNode} from 'react';
import {MuseChoiceMenu} from '@/components/MuseChoiceMenu';
import {MuseIcon} from '@/components/MuseIcon';
import type {Lens,StatusFilter,YearPlan,AtlasCounts} from '@/lib/aspirations/atlas';
import {lensKey} from '@/lib/aspirations/atlas';
import {AtlasConstellation,type StarState} from './AtlasConstellation';

export type RitualCall={label:string;onClick:()=>void;kind:'design'|'resume'|'revisit'};

/** "Your 2027 · The Art of Becoming": the year's own words, a restrained count and the living constellation. */
export function AtlasHero({lens,plan,counts,stars,ritual,onAdd,boardHref,children}:{lens:Lens;plan?:YearPlan;counts:AtlasCounts;stars:StarState[];ritual:RitualCall|null;onAdd:()=>void;boardHref?:string;children?:ReactNode}){
 const title=lens.kind==='year'?<>Your <span className="type-numeric">{lens.year}</span></>:lens.kind==='all'?'Every aspiration':'Undated, for someday';
 const feelings=plan?.feelings?.filter(Boolean)??[];
 return <section className="muse-lifeatlas-hero" aria-labelledby="muse-lifeatlas-title">
  <div className="muse-lifeatlas-hero-copy">
   <p className="muse-kicker">The Art of Becoming</p>
   <h2 id="muse-lifeatlas-title" className="muse-lifeatlas-hero-title">{title}</h2>
   {lens.kind==='year'&&plan?.theme&&<p className="muse-lifeatlas-mantra"><q>{plan.theme}</q></p>}
   {lens.kind==='year'&&(feelings.length>0||plan?.focus)&&<div className="muse-lifeatlas-words">
    {feelings.length>0&&<ul className="muse-lifeatlas-feelings" aria-label="Feelings to welcome">{feelings.map(f=><li key={f}>{f}</li>)}</ul>}
    {plan?.focus&&<p><span className="small-label">Nurturing</span> {plan.focus}</p>}
   </div>}
   {lens.kind==='year'&&!plan?.theme&&!feelings.length&&<p className="muse-lifeatlas-hero-lede">Ten areas of life, and the aspirations you’re growing in each.</p>}
   {lens.kind!=='year'&&<p className="muse-lifeatlas-hero-lede">{lens.kind==='all'?'Every aspiration you’ve held, across every year, in its Life Area.':'Aspirations without a year yet: kept safe until their time comes.'}</p>}
   <div className="muse-lifeatlas-hero-actions">
    {ritual&&<button type="button" className="muse-button button-primary" data-kind={ritual.kind} onClick={ritual.onClick}><MuseIcon name="sparkle" size={16}/> {ritual.label}</button>}
    <button type="button" className="muse-button" onClick={onAdd}><MuseIcon name="plus" size={16}/> Aspiration</button>
    {boardHref&&plan?.vision_board_name&&<Link className="muse-lifeatlas-board-link" href={boardHref}><MuseIcon name="envision" size={15}/> {plan.vision_board_name}</Link>}
   </div>
  </div>
  <div className="muse-lifeatlas-hero-sky">
   <AtlasConstellation stars={stars} labelled web/>
   <dl className="muse-lifeatlas-counts">
    <div><dt>Aspirations</dt><dd className="type-numeric">{counts.total}</dd></div>
    <div><dt>Achieved</dt><dd className="type-numeric">{counts.achieved}</dd></div>
    <div><dt>Milestones</dt><dd className="type-numeric">{counts.milestonesDone}<small>/{counts.milestones}</small></dd></div>
   </dl>
  </div>
  {children}
 </section>;
}

const statusOptions:{id:StatusFilter;label:string}[]=[{id:'all',label:'Everything'},{id:'open',label:'In progress'},{id:'achieved',label:'Achieved'},{id:'resting',label:'Resting or set aside'},{id:'archived',label:'Archived'}];
/** One quiet row: the lens (years, all, undated), search and a single filter menu. Secondary to the aspirations. */
export function AtlasToolbar({lens,years,onLens,search,onSearch,status,onStatus,quarter,onQuarter}:{lens:Lens;years:number[];onLens:(l:Lens)=>void;search:string;onSearch:(s:string)=>void;status:StatusFilter;onStatus:(s:StatusFilter)=>void;quarter:number|null;onQuarter:(q:number|null)=>void}){
 const shown=years.slice(-4),earlier=years.slice(0,-4),key=lensKey(lens);
 const filterLabel=[status!=='all'?statusOptions.find(o=>o.id===status)?.label:'',quarter?`Q${quarter}`:''].filter(Boolean).join(' · ')||'Filter';
 return <div className="muse-lifeatlas-toolbar" role="group" aria-label="Life Atlas view">
  <div className="muse-lifeatlas-lens" role="group" aria-label="Which aspirations">
   {earlier.length>0&&<MuseChoiceMenu label="Earlier years" variant="chip" icon="calendar" valueLabel={earlier.includes(Number(key))?key:'Earlier'} selectedIds={[key]} options={earlier.map(y=>({id:String(y),label:String(y)}))} onSelect={id=>onLens({kind:'year',year:Number(id)})}/>}
   {shown.map(y=><button key={y} type="button" className="type-numeric" aria-pressed={key===String(y)} onClick={()=>onLens({kind:'year',year:y})}>{y}</button>)}
   <button type="button" aria-pressed={key==='all'} onClick={()=>onLens({kind:'all'})}>All</button>
   <button type="button" aria-pressed={key==='undated'} onClick={()=>onLens({kind:'undated'})}>Undated</button>
  </div>
  <label className="muse-lifeatlas-search"><span className="sr-only">Search aspirations</span><MuseIcon name="search" size={15}/><input type="search" value={search} placeholder="Search aspirations" onChange={e=>onSearch(e.target.value)}/></label>
  <MuseChoiceMenu label="Filter aspirations" variant="chip" icon="filter" valueLabel={filterLabel} selectedIds={[`s:${status}`,...(quarter?[`q:${quarter}`]:[])]} onClear={status!=='all'||quarter?()=>{onStatus('all');onQuarter(null);}:undefined}
   options={[...statusOptions.map(o=>({id:`s:${o.id}`,label:o.label})),...(lens.kind==='year'?[{id:'q:0',label:'Any quarter'},...[1,2,3,4].map(q=>({id:`q:${q}`,label:`Due in Q${q}`}))]:[])]}
   onSelect={id=>{const [k,v]=id.split(':');if(k==='s')onStatus(v as StatusFilter);else onQuarter(Number(v)||null);}}/>
 </div>;
}

/** First visit: an invitation, not ten empty boxes. */
export function AtlasWelcome({year,stars,existing,draft,onDesign,onBuild}:{year:number;stars:StarState[];existing:number;draft:boolean;onDesign:()=>void;onBuild:()=>void}){
 return <section className="muse-lifeatlas-welcome" aria-labelledby="muse-lifeatlas-welcome-title">
  <div className="muse-lifeatlas-welcome-sky" aria-hidden="true"><AtlasConstellation stars={stars.map((s,i)=>({...s,count:i%3===0?2:1,achieved:0}))} reveal/></div>
  <div className="muse-lifeatlas-welcome-copy">
   <p className="muse-kicker">Life Atlas · The Art of Becoming</p>
   <h2 id="muse-lifeatlas-welcome-title">This is your space to imagine a life.</h2>
   <p className="muse-lifeatlas-welcome-lede">Ten areas of life, and whatever you hope to experience, learn, nurture or become in each. You don’t need to have it figured out.</p>
   <ul className="muse-lifeatlas-welcome-notes">
    <li><b>Imagine boldly.</b> Start with one aspiration or fifty.</li>
    <li><b>Skip freely.</b> Not every area needs something this year.</li>
    <li><b>Return whenever.</b> Nothing is locked, and your Atlas changes as you do.</li>
   </ul>
   <div className="muse-lifeatlas-welcome-actions">
    <button type="button" className="muse-button button-primary" onClick={onDesign}><MuseIcon name="sparkle" size={16}/> {draft?`Resume designing ${year}`:`Design My ${year}`}</button>
    <button type="button" className="muse-button" onClick={onBuild}>Build My Atlas Myself</button>
   </div>
   {existing>0&&<p className="small-label">Your {existing} existing aspiration{existing===1?' is':'s are'} safe, and waiting in your Atlas.</p>}
  </div>
 </section>;
}
