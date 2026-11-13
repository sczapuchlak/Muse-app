'use client';
import Link from 'next/link';
import {useId,useState,type CSSProperties,type ReactNode} from 'react';
import {MuseMark,type MuseMarkIcon,type MuseTone} from '@/components/design/MuseHeading';
import {MuseIcon} from '@/components/MuseIcon';
import {dateLabel} from '@/lib/dates';
import type {Aspiration,Milestone} from '@/lib/aspirations/models';
import {milestoneProgress,nextMilestone,isOpen,type Progress} from '@/lib/aspirations/progress';
import {whenLabel} from '@/lib/aspirations/atlas';
import {progressText} from './parts';
import {BucketPhoto} from '../bucket/BucketViews';

export type RowContext={secondary:string[];years:number[];related:{id:string;title:string}[];rituals:string[];tasks:{done:number;total:number};latestNote?:string;sourceHref?:string};
export type RowActions={toggleMilestone:(m:Milestone)=>void;addMilestone:(title:string)=>Promise<boolean>;addNote:(note:string)=>Promise<boolean>;record:(value:number)=>Promise<boolean>;achieve:()=>void;open:()=>void;openRelated:(id:string)=>void};
export type Arrange={first:boolean;last:boolean;busy:boolean;dragging:boolean;onEarlier:()=>void;onLater:()=>void;onDragStart:()=>void;onDragEnd:()=>void;onDrop:(draggedId:string)=>void};
export type RowItem={a:Aspiration;progress:Progress;context:RowContext;actions:RowActions;arrange?:Arrange;aside?:ReactNode};

const pageSize=6;
/** Whether a number belongs on this aspiration at all: never for open-ended growth, or when the person hid it. */
export const showsNumbers=(a:Aspiration)=>a.showProgress!==false&&a.planningStyle!=='practice'&&a.planningStyle!=='exploration'&&a.progressKind!=='binary';

/** One Life Area: its mark, numeral and voice, then its actual aspirations as compact rows that expand in place. */
export function AtlasArea({glyph,tone,numeral,label,whisper,vision,items,expanded,onToggle,onAdd,busy,today,emptyNote,kind='area'}:{
 id:string;glyph:MuseMarkIcon;tone:MuseTone;numeral:string;label:string;whisper:string;vision?:string;items:RowItem[];expanded:string|null;onToggle:(id:string)=>void;
 onAdd?:(title:string)=>Promise<boolean>;busy:boolean;today:string;emptyNote?:string;kind?:'area'|'awaiting';
}){
 const [page,setPage]=useState(0),headingId=useId();
 const pages=Math.max(1,Math.ceil(items.length/pageSize)),current=Math.min(page,pages-1),shown=items.slice(current*pageSize,current*pageSize+pageSize);
 const achieved=items.filter(i=>i.a.status==='completed').length;
 return <section className="muse-lifeatlas-area" data-kind={kind} aria-labelledby={headingId} style={{'--mark-a':`var(--chart-${tone})`,'--mark-b':`var(--chart-${tone%8+1})`} as CSSProperties}>
  <header className="muse-lifeatlas-area-head">
   <MuseMark icon={glyph} tone={tone} size="lg"/>
   <div className="muse-lifeatlas-area-title"><h3 id={headingId}><span className="muse-lifeatlas-numeral" aria-hidden="true">{numeral}</span>{label}</h3>
    <p className="muse-lifeatlas-area-whisper">{vision?<q>{vision}</q>:whisper}</p></div>
   <p className="muse-lifeatlas-area-count small-label type-numeric">{items.length?`${items.length} aspiration${items.length===1?'':'s'}${achieved?` · ${achieved} achieved`:''}`:emptyNote}</p>
  </header>
  <div className="muse-lifeatlas-area-body">
   <ul className="muse-lifeatlas-rows" aria-label={`${label} aspirations`}>
    {shown.map((item,i)=><AspirationRow key={item.a.id} item={item} index={i} expanded={expanded===item.a.id} onToggle={()=>onToggle(item.a.id)} busy={busy} today={today}/>)}
    {onAdd&&<QuickAdd label={label} onAdd={onAdd} busy={busy} span={shown.length%2===0} order={shown.length*2}/>}
   </ul>
   {pages>1&&<div className="muse-paged-nav muse-lifeatlas-pager"><span className="small-label type-numeric">{current*pageSize+1}–{Math.min(items.length,current*pageSize+pageSize)} of {items.length}</span>
    <button type="button" className="muse-button button-ghost" aria-label={`Previous ${label} aspirations`} disabled={current===0} onClick={()=>setPage(current-1)}><MuseIcon name="chevron" size={15}/></button>
    <button type="button" className="muse-button button-ghost" aria-label={`Next ${label} aspirations`} disabled={current>=pages-1} onClick={()=>setPage(current+1)}><MuseIcon name="chevron" size={15}/></button></div>}
  </div>
 </section>;
}

/** A small star that says where it stands: open, resting, or achieved (gold). */
export function StatusStar({status}:{status:Aspiration['status']}){
 return <span className="muse-lifeatlas-status-star" data-status={status} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 1.5c.9 5.6 4.9 9.6 10.5 10.5-5.6.9-9.6 4.9-10.5 10.5C11.1 16.9 7.1 12.9 1.5 12 7.1 11.1 11.1 7.1 12 1.5Z"/></svg></span>;
}
const statusWord:Record<Aspiration['status'],string>={planned:'Planned',active:'In progress',paused:'Resting',completed:'Achieved',archived:'Archived',discontinued:'Set aside'};

function Preview({a,progress}:{a:Aspiration;progress:Progress}){
 if(!showsNumbers(a)||!progress.available)return null;
 if(a.progressKind==='milestones'){const m=milestoneProgress(a);if(!m.total)return null;
  return <span className="muse-lifeatlas-preview" data-kind="milestones"><span className="muse-lifeatlas-dots" aria-hidden="true">{a.milestones.slice(0,8).map(ms=><i key={ms.id} data-done={!!ms.completedOn||undefined}/>)}</span><small className="type-numeric">{m.done}/{m.total}</small></span>;}
 return <span className="muse-lifeatlas-preview" data-kind="bar"><span className="muse-lifeatlas-bar" aria-hidden="true"><i style={{width:`${Math.max(3,progress.percent??0)}%`}}/></span><small className="type-numeric">{a.progressKind==='manual'?`${Math.round(progress.percent??0)}%`:`${progress.current??0}${progress.target?`/${progress.target}`:''}`}</small></span>;
}

function AspirationRow({item,index,expanded,onToggle,busy,today}:{item:RowItem;index:number;expanded:boolean;onToggle:()=>void;busy:boolean;today:string}){
 const {a,progress,arrange,aside}=item,bodyId=useId();
 const next=nextMilestone(a),when=whenLabel(a),late=a.targetDate&&a.targetDate<today&&isOpen(a);
 const meta=[a.status==='completed'&&a.completedOn?`Achieved ${dateLabel(a.completedOn)}`:a.status!=='active'?statusWord[a.status]:'',late?'Past its date':when,next&&a.status!=='completed'?`Next: ${next.title}`:''].filter(Boolean);
 const order={'--o':index*2,'--ob1':index*2+1,'--ob2':(index|1)*2+1} as CSSProperties;
 return <>
  <li className="muse-lifeatlas-row" data-status={a.status} data-expanded={expanded||undefined} data-dragging={arrange?.dragging||undefined} style={order}
   draggable={!!arrange&&!arrange.busy} onDragStart={arrange?e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',a.id);arrange.onDragStart();}:undefined} onDragEnd={arrange?.onDragEnd}
   onDragOver={arrange?e=>{e.preventDefault();e.dataTransfer.dropEffect='move';}:undefined} onDrop={arrange?e=>{e.preventDefault();arrange.onDrop(e.dataTransfer.getData('text/plain'));}:undefined}>
   <button type="button" className="muse-lifeatlas-row-toggle" aria-expanded={expanded} aria-controls={bodyId} onClick={onToggle}>
    <StatusStar status={a.status}/>
    <span className="muse-lifeatlas-row-copy"><strong>{a.icon?<span aria-hidden="true">{a.icon} </span>:null}{a.title}</strong>{meta.length>0&&<span className="muse-lifeatlas-row-meta">{meta.join(' · ')}</span>}</span>
    <Preview a={a} progress={progress}/>
    <span className="muse-lifeatlas-row-chevron" aria-hidden="true"><MuseIcon name="chevron" size={14}/></span>
   </button>
   {aside}
  </li>
  {expanded&&<li className="muse-lifeatlas-row-body" id={bodyId} role="region" aria-label={`${a.title}, expanded`} style={order}><RowBody item={item} busy={busy} today={today}/></li>}
 </>;
}

function RowBody({item,busy}:{item:RowItem;busy:boolean;today:string}){
 const {a,progress,context,actions,arrange}=item;
 const [milestone,setMilestone]=useState(''),[note,setNote]=useState(''),[value,setValue]=useState('');
 const open=isOpen(a),m=milestoneProgress(a),next=nextMilestone(a);
 const numbers=showsNumbers(a);
 return <div className="muse-lifeatlas-body">
  {(a.motivation||a.description)&&<div className="muse-lifeatlas-body-why">{a.motivation&&<blockquote>{a.motivation}</blockquote>}{a.description&&<p>{a.description}</p>}</div>}
  {a.status==='completed'&&<div className="muse-lifeatlas-keepsake">
   {a.keepsake&&<BucketPhoto image={a.keepsake} className="muse-lifeatlas-keepsake-photo"/>}
   <div><p className="muse-kicker">Achieved{a.completedOn?` · ${dateLabel(a.completedOn)}`:''}</p>
    {a.completion?.meaningful&&<p><q>{a.completion.meaningful}</q></p>}{a.completion?.learned&&<p><q>{a.completion.learned}</q></p>}{a.completion?.feels&&<p><q>{a.completion.feels}</q></p>}
    {!a.completion&&a.reflection&&<p><q>{a.reflection}</q></p>}</div></div>}
  <div className="muse-lifeatlas-body-grid">
   <div className="muse-lifeatlas-body-progress">
    {a.progressKind!=='milestones'&&<div className="muse-lifeatlas-body-measure">
     <p className="muse-lifeatlas-body-label">{progress.automatic?`From ${progress.source}`:a.progressKind==='binary'?'One finish line':'Progress'}</p>
     <p className="muse-lifeatlas-body-value">{a.progressKind==='binary'?(a.status==='completed'?'Done, and wonderfully so.':'You’ll know when you’ve done it.'):numbers?progressText(a,progress):'Not measured. Notes and milestones tell this story.'}</p>
     {progress.automatic&&<p className="small-label">Updates automatically{context.sourceHref?<> · <Link href={context.sourceHref}>Open {progress.source}</Link></>:null}</p>}
     {open&&(a.progressKind==='numeric'||a.progressKind==='manual')&&<form className="muse-lifeatlas-inline" onSubmit={e=>{e.preventDefault();const v=Number(value);if(value!==''&&Number.isFinite(v)&&v>=0&&(a.progressKind!=='manual'||v<=100))void actions.record(v).then(ok=>{if(ok)setValue('');});}}>
      <label className="sr-only" htmlFor={`${a.id}-val`}>{a.progressKind==='manual'?'Percent done':`Where you are${a.unit?` in ${a.unit}`:''}`}</label><input id={`${a.id}-val`} type="number" min={0} max={a.progressKind==='manual'?100:undefined} step="any" value={value} placeholder={a.progressKind==='manual'?'% done':`Now at…${a.unit?` (${a.unit})`:''}`} onChange={e=>setValue(e.target.value)}/><button type="submit" className="muse-button" disabled={busy||value===''}>Record</button></form>}
    </div>}
    {/* Milestones belong to every kind of aspiration; for a milestones aspiration they are also its measure. */}
    {(a.milestones.length>0||open)&&<p className="muse-lifeatlas-body-label">{a.progressKind==='milestones'?'Milestones':'Steps along the way'}{m.total&&numbers&&a.progressKind==='milestones'?<small className="type-numeric"> · {m.done} of {m.total}</small>:null}</p>}
    {a.milestones.length>0?<ul className="muse-lifeatlas-milestones">{a.milestones.map(ms=><li key={ms.id} data-done={!!ms.completedOn||undefined}><label><input type="checkbox" checked={!!ms.completedOn} disabled={busy} onChange={()=>actions.toggleMilestone(ms)}/><span>{ms.title}{ms.completedOn?<small> · {dateLabel(ms.completedOn)}</small>:ms.targetDate?<small> · by {dateLabel(ms.targetDate)}</small>:null}</span></label></li>)}</ul>
     :open&&<p className="small-label">{a.progressKind==='milestones'?'No steps yet. Add the first one whenever you know it.':'Optional: a few meaningful steps, whenever you know them.'}</p>}
    {open&&<form className="muse-lifeatlas-inline" onSubmit={e=>{e.preventDefault();const t=milestone.trim();if(t)void actions.addMilestone(t).then(ok=>{if(ok)setMilestone('');});}}><label className="sr-only" htmlFor={`${a.id}-ms`}>Add a milestone to {a.title}</label><input id={`${a.id}-ms`} data-milestone maxLength={120} value={milestone} placeholder="Add a milestone" onChange={e=>setMilestone(e.target.value)}/><button type="submit" className="muse-button" disabled={busy||!milestone.trim()}>Add</button></form>}
    {next&&a.progressKind!=='milestones'&&<p className="small-label">Next step: {next.title}</p>}
   </div>
   <div className="muse-lifeatlas-body-side">
    {(context.years.length>0||context.secondary.length>0||context.related.length>0||context.rituals.length>0||context.tasks.total>0)&&<ul className="muse-lifeatlas-connections" aria-label="Connections">
     {context.years.length>0&&<li><MuseIcon name="calendar" size={13}/>Chosen for {context.years.join(', ')}</li>}
     {context.secondary.length>0&&<li><MuseIcon name="sparkle" size={13}/>Also nurtures {context.secondary.join(', ')}</li>}
     {context.rituals.length>0&&<li><MuseIcon name="rituals" size={13}/>Supported by {context.rituals.join(', ')}</li>}
     {context.tasks.total>0&&<li><MuseIcon name="check" size={13}/>{context.tasks.done} of {context.tasks.total} Planner tasks done</li>}
     {context.related.map(r=><li key={r.id}><MuseIcon name="link" size={13}/><button type="button" className="text-button" onClick={()=>actions.openRelated(r.id)}>{r.title}</button></li>)}
    </ul>}
    {context.latestNote&&<p className="muse-lifeatlas-note"><span className="muse-lifeatlas-body-label">Latest note</span>{context.latestNote}</p>}
    {open&&<form className="muse-lifeatlas-inline" onSubmit={e=>{e.preventDefault();const t=note.trim();if(t)void actions.addNote(t).then(ok=>{if(ok)setNote('');});}}><label className="sr-only" htmlFor={`${a.id}-note`}>Add a note to {a.title}</label><input id={`${a.id}-note`} maxLength={1000} value={note} placeholder="A small win, a snag, a thought" onChange={e=>setNote(e.target.value)}/><button type="submit" className="muse-button" disabled={busy||!note.trim()}>Note</button></form>}
   </div>
  </div>
  <div className="muse-lifeatlas-body-actions">
   {open&&<button type="button" className="muse-button button-primary" disabled={busy} onClick={actions.achieve}><MuseIcon name="sparkle" size={15}/> Mark achieved</button>}
   <button type="button" className="muse-button" onClick={actions.open}>Open details</button>
   {arrange&&<span className="muse-lifeatlas-arrange"><button type="button" className="text-button" disabled={arrange.first||arrange.busy} onClick={arrange.onEarlier} aria-label={`Move ${a.title} earlier`}>← Earlier</button><button type="button" className="text-button" disabled={arrange.last||arrange.busy} onClick={arrange.onLater} aria-label={`Move ${a.title} later`}>Later →</button></span>}
  </div>
 </div>;
}

/** The ghost slot that closes a Life Area: type a name, press Enter, it's in. */
function QuickAdd({label,onAdd,busy,span,order}:{label:string;onAdd:(title:string)=>Promise<boolean>;busy:boolean;span:boolean;order:number}){
 const [title,setTitle]=useState(''),id=useId();
 return <li className="muse-lifeatlas-add" data-span={span||undefined} style={{'--o':order,'--ob1':order,'--ob2':order} as CSSProperties}>
  <form onSubmit={e=>{e.preventDefault();const t=title.trim();if(t)void onAdd(t).then(ok=>{if(ok)setTitle('');});}}>
   <label htmlFor={id} className="sr-only">Add an aspiration to {label}</label>
   <span className="muse-lifeatlas-add-plus" aria-hidden="true">+</span><input id={id} maxLength={120} value={title} placeholder={`Add to ${label}…`} onChange={e=>setTitle(e.target.value)}/>
   {title.trim()&&<button type="submit" className="muse-button" disabled={busy}>Add</button>}
  </form>
 </li>;
}
