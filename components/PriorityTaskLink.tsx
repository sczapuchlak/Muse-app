'use client';
import {useId,useRef,useState} from 'react';
import type {DailyPriority} from '@/lib/data/daily';
import {usePlanner} from './PlannerStore';
import {GlassPopover} from './GlassPopover';
import {MuseIconButton} from './MuseIconButton';
import {MuseIcon} from './MuseIcon';
export function PriorityTaskLink({priority,linkedIds,busy,onLink,onComplete}:{priority:DailyPriority;linkedIds:string[];busy:boolean;onLink:(id:string|null)=>void;onComplete:(complete:boolean)=>void}){
 const {state,status,canEdit}=usePlanner(),[open,setOpen]=useState(false),[query,setQuery]=useState(''),[limit,setLimit]=useState(20),anchor=useRef<HTMLElement|null>(null),id=useId();
 const task=state.tasks.find(item=>item.id===priority.task_id),results=state.tasks.filter(item=>item.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),disabled=busy||!canEdit||!!status?.pending;
 return <><MuseIconButton icon="link" label={`${priority.task_id?'Manage linked task':'Link Planner task'} for priority: ${priority.text}`} aria-pressed={!!priority.task_id} aria-expanded={open} aria-controls={id} disabled={disabled} onClick={event=>{anchor.current=event.currentTarget;setOpen(value=>!value);}}/>
 <GlassPopover id={id} label="Link a Planner task" open={open} anchorRef={anchor} onClose={()=>setOpen(false)} width={340} scrollMode="content">
 <p className="small-label">Planner keeps the details. This priority stays on its date.</p>
 {task&&<section><p className="small-label">Linked: {task.title} · {task.complete?'currently complete':'currently open'}</p><div className="editor-actions"><button type="button" className="muse-button" disabled={disabled} onClick={()=>onComplete(!task.complete)}>{task.complete?'Reopen linked task':'Complete linked task'}</button></div></section>}
 <label className="editor-label" htmlFor={`${id}-search`}>Find a task</label><input id={`${id}-search`} type="search" aria-label="Search Planner tasks to link" value={query} placeholder="Search your Planner tasks…" onChange={event=>{setQuery(event.target.value);setLimit(20);}}/>
 {!status?.loaded&&status&&<p role="status">Loading Planner tasks…</p>}
 <div className="popover-choice-list">{results.slice(0,limit).map(item=><button type="button" className="popover-choice" key={item.id} aria-pressed={item.id===priority.task_id} disabled={disabled||linkedIds.includes(item.id)&&item.id!==priority.task_id} onClick={()=>{onLink(item.id);setOpen(false);}}><span>{item.title}<small className="small-label"> · {state.workspaces.find(workspace=>workspace.id===item.workspaceId)?.name}</small></span>{item.id===priority.task_id&&<MuseIcon name="check" size={14}/>}</button>)}</div>
 {status?.loaded&&!results.length&&<p className="small-label">No matching saved tasks. You can keep this priority standalone.</p>}
 <footer className="popover-footer">{results.length>limit&&<button type="button" className="muse-button" onClick={()=>setLimit(value=>value+20)}>Show more tasks</button>}<button type="button" className="muse-button" onClick={()=>setOpen(false)}>Done</button></footer>
 </GlassPopover></>;
}
