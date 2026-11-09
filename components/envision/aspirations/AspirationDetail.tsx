'use client';
import {AspirationLists} from '../../lists/ListsSurfaces';
import Link from 'next/link';
import {useState} from 'react';
import {MuseModal} from '@/components/MuseModal';
import {dateLabel} from '@/lib/dates';
import type {PlannedTask} from '@/lib/models';
import type {RitualState} from '@/lib/rituals';
import {statusLabels,type Aspiration,type AspirationUpdate,type Milestone} from '@/lib/aspirations/models';
import {habitConsistency,milestoneProgress,progressHistory,type Progress} from '@/lib/aspirations/progress';
import {ProgressRing,periodLabel,progressText} from './parts';
import {ShareToStream} from '../../stream/ShareToStream';

type Actions={save:(a:Aspiration)=>Promise<Aspiration|null>;addUpdate:(u:Omit<AspirationUpdate,'createdAt'>)=>Promise<AspirationUpdate|null>;removeUpdate:(id:string)=>Promise<boolean|null>;remove:(a:Aspiration)=>Promise<boolean|null>};

/** One aspiration, opened: progress, milestones, journal, supporting habits, linked tasks and finishing. */
export function AspirationDetail({a,progress,updates,ritualState,tasks,today,busy,error,actions,onEdit,onClose,onMilestoneDone,onCompleted,periods=[a],renewLabel,onRenew,onOpenPeriod}:{periods?:Aspiration[];renewLabel?:string|null;onRenew?:()=>void;onOpenPeriod?:(id:string)=>void;a:Aspiration;progress:Progress;updates:AspirationUpdate[];ritualState:RitualState;tasks:PlannedTask[];today:string;busy:boolean;error:string;
 actions:Actions;onEdit:()=>void;onClose:()=>void;onMilestoneDone:(m:Milestone)=>void;onCompleted:(a:Aspiration)=>void}){
 const [value,setValue]=useState(''),[note,setNote]=useState(''),[on,setOn]=useState(today),[newMilestone,setNewMilestone]=useState(''),[finishing,setFinishing]=useState(false),[reflection,setReflection]=useState(a.reflection??'');
 const [editingMilestone,setEditingMilestone]=useState<string|null>(null);
 const [confirmDelete,setConfirmDelete]=useState(false),[habitPick,setHabitPick]=useState(''),[taskSearch,setTaskSearch]=useState('');
 const journal=updates.filter(u=>u.aspirationId===a.id).sort((x,y)=>y.recordedOn.localeCompare(x.recordedOn)||y.createdAt.localeCompare(x.createdAt));
 const history=progressHistory(a,updates),m=milestoneProgress(a),valued=a.progressKind==='numeric'||a.progressKind==='manual';
 const save=(patch:Partial<Aspiration>)=>actions.save({...a,...patch});
 async function record(){const v=value===''?null:Number(value);if(v===null&&!note.trim())return;if(v!==null&&(!Number.isFinite(v)||v<0||(a.progressKind==='manual'&&v>100)))return;
  if(await actions.addUpdate({id:crypto.randomUUID(),aspirationId:a.id,recordedOn:on,value:v,note:note.trim()||null,milestoneId:null})){setValue('');setNote('');}}
 async function toggleMilestone(ms:Milestone){const done=!ms.completedOn,next=a.milestones.map(x=>x.id===ms.id?{...x,completedOn:done?today:undefined}:x);
  const saved=await save({milestones:next});if(saved&&done){onMilestoneDone(ms);void actions.addUpdate({id:crypto.randomUUID(),aspirationId:a.id,recordedOn:today,value:null,note:null,milestoneId:ms.id});}}
 const move=(i:number,d:-1|1)=>{const next=[...a.milestones],j=i+d;if(j<0||j>=next.length)return;[next[i],next[j]]=[next[j],next[i]];void save({milestones:next});};
 const linkedTasks=a.taskIds.map(id=>tasks.find(t=>t.id===id)).filter((t):t is PlannedTask=>!!t);
 const candidates=taskSearch.trim().length>=2?tasks.filter(t=>!a.taskIds.includes(t.id)&&t.title.toLowerCase().includes(taskSearch.trim().toLowerCase())).slice(0,8):[];
 const habits=a.ritualIds.map(id=>habitConsistency(ritualState,id,today)).filter((h):h is NonNullable<typeof h>=>!!h);
 const open=a.status!=='completed'&&a.status!=='archived';
 return <MuseModal id="aspiration-detail" label={a.title} title={`${a.icon?`${a.icon} `:''}${a.title}`} returnFocus={null} onClose={onClose} size="tall">
  <div className="muse-aspiration-detail" data-accent={a.accent??'primary'}>
   <p className="muse-aspiration-meta"><span className="muse-aspiration-chip" data-status={a.status}>{statusLabels[a.status]}</span>{a.category}{a.targetDate?` · by ${dateLabel(a.targetDate)}`:' · someday'}{a.completedOn?` · finished ${dateLabel(a.completedOn)}`:''}</p>
   {periods.length>1&&<nav className="muse-aspiration-periods" aria-label="Periods of this aspiration"><span className="small-label">Periods</span>{periods.map(p=><button key={p.id} type="button" className="muse-aspiration-period" aria-current={p.id===a.id||undefined} disabled={p.id===a.id} onClick={()=>onOpenPeriod?.(p.id)}>{periodLabel(p)}{p.completedOn?' ✓':''}</button>)}</nav>}
   {a.motivation&&<blockquote className="muse-aspiration-why">{a.motivation}</blockquote>}
   {a.description&&<p className="muse-aspiration-notes">{a.description}</p>}
   <section className="muse-aspiration-progress" aria-label="Progress"><ProgressRing percent={progress.percent} accent={a.accent}/><div>
    <strong>{progressText(a,progress)}</strong>
    <small className="small-label">{progress.automatic?`Counted automatically from ${progress.source}`:'Updated by you'}{progress.note?` · ${progress.note}`:''}</small>
    {a.connection?.kind==='reading-challenge'&&<Link className="text-button" href="/whimsy/bookshelf?view=atlas">Edit the challenge in Reading Atlas</Link>}
   </div></section>
   {history.length>1&&<ol className="muse-aspiration-spark" aria-label="Progress over time">{history.slice(-12).map((p,i)=>{const max=a.progressKind==='manual'?100:Math.max(a.target??0,...history.map(h=>h.value));return <li key={i} title={`${dateLabel(p.date)}: ${p.value}`} style={{'--h':`${max?Math.max(4,p.value/max*100):4}%`} as React.CSSProperties}><span className="sr-only">{dateLabel(p.date)}: {p.value}</span></li>;})}</ol>}

   {valued&&open&&<form className="muse-aspiration-record" onSubmit={e=>{e.preventDefault();void record();}}><h3>Record progress</h3>
    <div className="muse-aspiration-row"><label>{a.progressKind==='manual'?'Percent done':`Where you are${a.unit?` (${a.unit})`:''}`}<input id="aspiration-value" type="number" min={0} max={a.progressKind==='manual'?100:undefined} step="any" value={value} onChange={e=>setValue(e.target.value)}/></label>
     <label>On<input id="aspiration-update-date" type="date" value={on} max={today} onChange={e=>setOn(e.target.value)}/></label></div>
    <label>Note <small className="small-label">· optional</small><input id="aspiration-update-note" maxLength={1000} value={note} placeholder="What changed?" onChange={e=>setNote(e.target.value)}/></label>
    <button type="submit" className="muse-button" disabled={busy||(value===''&&!note.trim())}>Add to the journal</button></form>}
   {!valued&&open&&<form className="muse-aspiration-record" onSubmit={e=>{e.preventDefault();void record();}}><h3>Add a note</h3><div className="muse-aspiration-row"><label>Note<input id="aspiration-update-note" maxLength={1000} value={note} placeholder="A small win, a snag, a thought" onChange={e=>setNote(e.target.value)}/></label><button type="submit" className="muse-button" disabled={busy||!note.trim()}>Add</button></div></form>}

   <AspirationLists aspirationId={a.id}/>
   <section aria-label="Milestones"><h3>Milestones {m.total?<small className="small-label">· {m.done} of {m.total}</small>:null}</h3>
    {a.milestones.length?<ol className="muse-aspiration-milestones">{a.milestones.map((ms,i)=><li key={ms.id} data-done={!!ms.completedOn||undefined} data-editing={editingMilestone===ms.id||undefined}>
     <div className="muse-aspiration-milestone-row"><label><input type="checkbox" checked={!!ms.completedOn} disabled={busy} onChange={()=>void toggleMilestone(ms)}/><span>{ms.title}{ms.completedOn?<small> · {dateLabel(ms.completedOn)}</small>:ms.targetDate?<small> · by {dateLabel(ms.targetDate)}</small>:null}{ms.weight&&ms.weight!==1?<small> · counts ×{ms.weight}</small>:null}</span></label>
     <span className="muse-aspiration-milestone-tools"><button type="button" className="text-button" aria-expanded={editingMilestone===ms.id} aria-label={`Edit ${ms.title}`} disabled={busy} onClick={()=>setEditingMilestone(editingMilestone===ms.id?null:ms.id)}>Edit</button><button type="button" className="text-button" aria-label={`Move ${ms.title} up`} disabled={busy||i===0} onClick={()=>move(i,-1)}>↑</button><button type="button" className="text-button" aria-label={`Move ${ms.title} down`} disabled={busy||i===a.milestones.length-1} onClick={()=>move(i,1)}>↓</button><button type="button" className="text-button" aria-label={`Remove ${ms.title}`} disabled={busy} onClick={()=>void save({milestones:a.milestones.filter(x=>x.id!==ms.id)})}>×</button></span></div>
     {editingMilestone!==ms.id&&(ms.description||ms.notes||ms.taskId)&&<div className="muse-aspiration-milestone-extra">{ms.description&&<p>{ms.description}</p>}{ms.notes&&<p className="small-label">{ms.notes}</p>}{ms.taskId&&(()=>{const t=tasks.find(x=>x.id===ms.taskId);return <p className="small-label">Task: {t?`${t.complete?'✓ ':''}${t.title}`:'no longer in the Planner'}</p>;})()}</div>}
     {editingMilestone===ms.id&&<MilestoneForm milestone={ms} tasks={linkedTasks} busy={busy} onCancel={()=>setEditingMilestone(null)} onSave={next=>void save({milestones:a.milestones.map(x=>x.id===ms.id?next:x)}).then(s=>{if(s)setEditingMilestone(null);})}/>}</li>)}</ol>
     :<p className="small-label">{a.progressKind==='milestones'?'Break it into a few steps. Progress follows them.':'Optional: a few steps along the way.'}</p>}
    {open&&<form className="muse-aspiration-row" onSubmit={e=>{e.preventDefault();if(newMilestone.trim())void save({milestones:[...a.milestones,{id:crypto.randomUUID(),title:newMilestone.trim().slice(0,120)}]}).then(s=>{if(s)setNewMilestone('');});}}>
     <label className="sr-only" htmlFor="aspiration-new-milestone">New milestone</label><input id="aspiration-new-milestone" maxLength={120} value={newMilestone} placeholder="Add a milestone" onChange={e=>setNewMilestone(e.target.value)}/><button type="submit" className="muse-button" disabled={busy||!newMilestone.trim()}>Add</button></form>}
   </section>

   <section aria-label="Supporting habits"><h3>Supporting habits</h3>
    <p className="small-label">Habits show their own consistency here. They don’t move this aspiration’s progress.</p>
    {habits.length>0&&<ul className="muse-aspiration-links">{habits.map(h=><li key={h.ritual.id}><span><strong>{h.ritual.name}</strong><small>{h.opportunities?`Met ${h.complete} of ${h.opportunities} ${h.unit} in the last 30 days`:'No scheduled days in the last 30'}{h.streak.count?` · ${h.streak.count} in a row`:''}</small></span>
     <button type="button" className="text-button" disabled={busy} onClick={()=>void save({ritualIds:a.ritualIds.filter(id=>id!==h.ritual.id)})}>Unlink</button></li>)}</ul>}
    {ritualState.rituals.some(r=>!a.ritualIds.includes(r.id)&&r.status!=='archived')&&<div className="muse-aspiration-row"><label className="sr-only" htmlFor="aspiration-habit">Link a habit</label>
     <select id="aspiration-habit" value={habitPick} onChange={e=>setHabitPick(e.target.value)}><option value="">Link a habit…</option>{ritualState.rituals.filter(r=>!a.ritualIds.includes(r.id)&&r.status!=='archived').map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
     <button type="button" className="muse-button" disabled={busy||!habitPick} onClick={()=>void save({ritualIds:[...a.ritualIds,habitPick]}).then(s=>{if(s)setHabitPick('');})}>Link</button></div>}
   </section>

   <section aria-label="Linked tasks"><h3>Planner tasks {linkedTasks.length?<small className="small-label">· {linkedTasks.filter(t=>t.complete).length} of {linkedTasks.length} done</small>:null}</h3>
    {linkedTasks.length>0&&<ul className="muse-aspiration-links">{linkedTasks.map(t=><li key={t.id} data-done={t.complete||undefined}><span><strong>{t.complete?'✓ ':''}{t.title}</strong><small>{t.complete?'Done':t.plannedDate?`Planned ${dateLabel(t.plannedDate)}`:'Not scheduled'}</small></span>
     <button type="button" className="text-button" disabled={busy} onClick={()=>void save({taskIds:a.taskIds.filter(id=>id!==t.id)})}>Unlink</button></li>)}</ul>}
    {a.taskIds.length>linkedTasks.length&&<p className="small-label">{a.taskIds.length-linkedTasks.length} linked task{a.taskIds.length-linkedTasks.length===1?' is':'s are'} no longer in the Planner.</p>}
    <label className="sr-only" htmlFor="aspiration-task-search">Find a Planner task</label><input id="aspiration-task-search" value={taskSearch} placeholder="Link a Planner task…" onChange={e=>setTaskSearch(e.target.value)}/>
    {candidates.length>0&&<ul className="muse-aspiration-candidates">{candidates.map(t=><li key={t.id}><button type="button" className="text-button" disabled={busy} onClick={()=>void save({taskIds:[...a.taskIds,t.id]}).then(s=>{if(s)setTaskSearch('');})}>{t.title}</button></li>)}</ul>}
    <p className="small-label">Linking never changes or moves the task; unlinking never deletes it.</p>
   </section>

   {journal.length>0&&<section aria-label="Journal"><h3>Journal</h3><ol className="muse-aspiration-journal">{journal.map(u=>{const ms=u.milestoneId?a.milestones.find(x=>x.id===u.milestoneId):null;return <li key={u.id}><time>{dateLabel(u.recordedOn)}</time>
     <span>{ms?`Milestone: ${ms.title}`:u.milestoneId?'Milestone completed':''}{u.value!==null?`${a.progressKind==='manual'?`${u.value}%`:`${u.value}${a.unit?` ${a.unit}`:''}`}`:''}{u.note?`${u.value!==null||ms?' · ':''}${u.note}`:''}</span>
     <button type="button" className="text-button" aria-label="Remove this entry" disabled={busy} onClick={()=>void actions.removeUpdate(u.id)}>×</button></li>;})}</ol></section>}

   {a.status==='completed'&&a.reflection&&<section aria-label="Reflection"><h3>Looking back</h3><p>{a.reflection}</p></section>}
   {finishing&&<form className="muse-aspiration-record" onSubmit={e=>{e.preventDefault();void save({status:'completed',completedOn:today,reflection:reflection.trim()||null}).then(s=>{if(s){setFinishing(false);onCompleted(s);}});}}>
    <h3>You did it</h3><label>A few words to remember it by <small className="small-label">· optional</small><textarea id="aspiration-reflection" rows={3} maxLength={4000} value={reflection} onChange={e=>setReflection(e.target.value)}/></label>
    <div className="muse-aspiration-actions"><button type="submit" className="muse-button button-primary" disabled={busy}>Mark complete</button><button type="button" className="text-button" onClick={()=>setFinishing(false)}>Not yet</button></div></form>}
   {error&&<p role="alert" className="muse-aspiration-error">{error}</p>}
   <div className="muse-aspiration-actions">
    {open&&!finishing&&<button type="button" className="muse-button button-primary" disabled={busy} onClick={()=>setFinishing(true)}>Mark complete…</button>}
    {renewLabel&&onRenew&&<button type="button" className="muse-button" disabled={busy} onClick={onRenew}>Renew for {renewLabel}</button>}
    <button type="button" className="muse-button" onClick={onEdit}>Edit</button>
    {a.status!=='archived'&&<ShareToStream kind="aspiration" id={a.id} category="celebrating" className="text-button"/>}
    {a.status==='active'&&<button type="button" className="text-button" disabled={busy} onClick={()=>void save({status:'paused'})}>Pause</button>}
    {(a.status==='paused'||a.status==='planned')&&<button type="button" className="text-button" disabled={busy} onClick={()=>void save({status:'active'})}>{a.status==='paused'?'Resume':'Start'}</button>}
    {a.status==='completed'&&<button type="button" className="text-button" disabled={busy} onClick={()=>void save({status:'active',completedOn:null})}>Reopen</button>}
    {a.status!=='archived'?<button type="button" className="text-button" disabled={busy} onClick={()=>void save({status:'archived'})}>Archive</button>:<button type="button" className="text-button" disabled={busy} onClick={()=>void save({status:a.completedOn?'completed':'active'})}>Restore</button>}
    {confirmDelete?<span className="muse-aspiration-confirm">Delete this aspiration and its journal? Linked habits, tasks and books are kept.<button type="button" className="muse-button" disabled={busy} onClick={()=>void actions.remove(a).then(ok=>{if(ok)onClose();})}>Delete</button><button type="button" className="text-button" onClick={()=>setConfirmDelete(false)}>Cancel</button></span>
     :<button type="button" className="text-button muse-aspiration-delete" onClick={()=>setConfirmDelete(true)}>Delete…</button>}
   </div>
  </div>
 </MuseModal>;
}

/** Details for one milestone: target date (feeds "Coming up"), description, notes, weight and a linked task. */
function MilestoneForm({milestone,tasks,busy,onSave,onCancel}:{milestone:Milestone;tasks:PlannedTask[];busy:boolean;onSave:(m:Milestone)=>void;onCancel:()=>void}){
 const [m,setM]=useState<Milestone>(milestone);const set=(p:Partial<Milestone>)=>setM(x=>({...x,...p}));const id=`milestone-${milestone.id}`;
 const weightOk=m.weight===undefined||(m.weight>0&&m.weight<=100);
 return <form className="muse-aspiration-milestone-form" onSubmit={e=>{e.preventDefault();if(!m.title.trim()||!weightOk)return;
  const clean:Milestone={id:m.id,title:m.title.trim().slice(0,120),...(m.completedOn?{completedOn:m.completedOn}:{}),...(m.targetDate?{targetDate:m.targetDate}:{}),...(m.description?.trim()?{description:m.description.trim().slice(0,500)}:{}),...(m.notes?.trim()?{notes:m.notes.trim().slice(0,1000)}:{}),...(m.weight&&m.weight!==1?{weight:m.weight}:{}),...(m.taskId?{taskId:m.taskId}:{})};onSave(clean);}}>
  <label>Milestone<input id={`${id}-title`} required maxLength={120} value={m.title} onChange={e=>set({title:e.target.value})}/></label>
  <div className="muse-aspiration-row"><label>Target date<input id={`${id}-date`} type="date" value={m.targetDate??''} onChange={e=>set({targetDate:e.target.value||undefined})}/></label>
   <label>Counts as <small className="small-label">· steps of progress</small><input id={`${id}-weight`} type="number" min={0.5} max={100} step={0.5} value={m.weight??1} onChange={e=>set({weight:e.target.value===''?undefined:Number(e.target.value)})}/></label></div>
  <label>Description <small className="small-label">· optional</small><input id={`${id}-description`} maxLength={500} value={m.description??''} onChange={e=>set({description:e.target.value})}/></label>
  <label>Notes <small className="small-label">· optional</small><textarea id={`${id}-notes`} rows={2} maxLength={1000} value={m.notes??''} onChange={e=>set({notes:e.target.value})}/></label>
  <label>Linked task <small className="small-label">· from this aspiration’s Planner tasks</small><select id={`${id}-task`} value={m.taskId??''} onChange={e=>set({taskId:e.target.value||undefined})}><option value="">None</option>{tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
  {!weightOk&&<p role="alert" className="muse-aspiration-error">A milestone counts as between 0.5 and 100 steps.</p>}
  <div className="muse-aspiration-actions"><button type="submit" className="muse-button" disabled={busy||!m.title.trim()||!weightOk}>Save milestone</button><button type="button" className="text-button" onClick={onCancel}>Cancel</button></div>
 </form>;
}
