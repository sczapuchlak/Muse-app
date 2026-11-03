"use client";
import {useEffect,useId,useRef,useState} from 'react';
import type {PlannedTask} from '@/lib/models';
import {usePlanner} from '../PlannerStore';
import {GlassPopover} from '../GlassPopover';
import {MuseIcon} from '../MuseIcon';
import {ColorLabel} from '../ColorLabel';

export function TaskClassification({task}:{task:PlannedTask}){
 const {state,dispatch,holdDraft}=usePlanner();
 const [open,setOpen]=useState(false),[query,setQuery]=useState('');
 const anchor=useRef<HTMLButtonElement>(null),id=useId();
 const workspace=state.workspaces.find(item=>item.id===task.workspaceId);
 const legacyTag=state.groups.find(item=>item.id===task.groupId);
 const tags=task.tagIds.flatMap(tagId=>state.tags.find(item=>item.id===tagId)??[]);
 useEffect(()=>{const key=`classification/${task.id}`;holdDraft(key,open);return()=>holdDraft(key,false);},[holdDraft,open,task.id]);
 function close(){setOpen(false);anchor.current?.focus();}
 function toggleTag(tagId:string){dispatch({type:'task/update',id:task.id,patch:{tagIds:task.tagIds.includes(tagId)?task.tagIds.filter(item=>item!==tagId):[...task.tagIds,tagId]}});}
 return <><button ref={anchor} type="button" className="muse-task-context muse-task-workspace-icon muse-edge" data-accent={workspace?.accent??'primary'} title={`${workspace?.name??'Workspace'}${legacyTag?` · ${legacyTag.name}`:''}${tags.length?` · ${tags.map(tag=>tag.name).join(', ')}`:''}`} aria-label={`Workspace and tags for ${task.title}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={()=>{setQuery('');setOpen(value=>!value);}}><MuseIcon name={workspace?.icon??'home'} size={16}/></button>
 <GlassPopover id={id} label={`Workspace and tags for ${task.title}`} open={open} anchorRef={anchor} onClose={close} width={300} scrollMode="content"><input type="search" aria-label="Search workspaces and tags" placeholder="Search workspaces or tags…" value={query} onChange={event=>setQuery(event.target.value)}/><div className="muse-classification-options"><p className="editor-label">Workspace</p><div className="popover-choice-list">{state.workspaces.filter(item=>item.name.toLowerCase().includes(query.toLowerCase())).map(item=><button type="button" className="popover-choice" key={item.id} aria-pressed={item.id===task.workspaceId} onClick={()=>{dispatch({type:'task/update',id:task.id,patch:{workspaceId:item.id,groupId:item.id===task.workspaceId?task.groupId:undefined}});close();}}><ColorLabel icon={item.icon} color={item.accent}>{item.name}</ColorLabel></button>)}</div><p className="editor-label">Tags</p><div className="popover-choice-list">{state.tags.filter(item=>item.name.toLowerCase().includes(query.toLowerCase())).map(item=><button type="button" className="popover-choice" key={item.id} aria-pressed={task.tagIds.includes(item.id)} onClick={()=>toggleTag(item.id)}><ColorLabel icon={item.icon} color={item.accent}>#{item.name}</ColorLabel></button>)}</div>{legacyTag&&<p className="small-label">Legacy tag: {legacyTag.name} · manage in Board Settings</p>}</div><div className="popover-footer"><button className="muse-button" type="button" onClick={close}>Done</button></div></GlassPopover></>;
}
