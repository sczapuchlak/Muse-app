"use client";
import { useId,useRef,useState } from 'react';
import { GlassPopover } from '../GlassPopover';
import { MuseIcon } from '../MuseIcon';
import { updateMood } from '@/lib/mood';
import { useMood } from './useMood';
export function MoodInfluences({date}:{date:string}) {
 const {state,setState,record,period,update}=useMood(date),[open,setOpen]=useState(false),[query,setQuery]=useState(''),ref=useRef<HTMLButtonElement>(null),id=useId();
 const results=state.influences.filter((tag)=>tag.name.toLowerCase().includes(query.trim().toLowerCase()));
 function toggle(tagId:string){update({causeTagIds:record.causeTagIds.includes(tagId)?record.causeTagIds.filter((value)=>value!==tagId):[...record.causeTagIds,tagId].slice(0,3)});}
 return <div className="muse-mood-influences"><div className="muse-mood-label-row"><p className="editor-label">What might be shaping it?</p><span className="small-label">{record.causeTagIds.length}/3</span></div>
 <div className="feeling-chips">{record.causeTagIds.map((tagId)=><button className="choice-button tag-chip" type="button" key={tagId} aria-label={`Remove influence ${state.influences.find((tag)=>tag.id===tagId)?.name}`} onClick={()=>toggle(tagId)}>{state.influences.find((tag)=>tag.id===tagId)?.name}<MuseIcon name="close" size={12}/></button>)}<button className="choice-button add-control" type="button" ref={ref} aria-expanded={open} aria-controls={id} onClick={()=>setOpen((value)=>!value)}><MuseIcon name="plus" size={14}/>Influence</button></div>
 <GlassPopover id={id} label="Explore influences" open={open} anchorRef={ref} onClose={()=>setOpen(false)} width={320} scrollMode="content"><p className="editor-label">What might be shaping it? · up to 3</p><input type="search" maxLength={50} aria-label="Search influences" placeholder="Find or create an influence…" value={query} onChange={(event)=>setQuery(event.target.value)}/><div className="popover-choice-list muse-choice-options">{results.map((tag)=><button className="popover-choice" type="button" key={tag.id} disabled={record.causeTagIds.length>=3&&!record.causeTagIds.includes(tag.id)} aria-pressed={record.causeTagIds.includes(tag.id)} onClick={()=>toggle(tag.id)}>{tag.name}{record.causeTagIds.includes(tag.id)&&<MuseIcon name="check" size={14}/>}</button>)}</div><footer className="popover-footer">{query.trim()&&!state.influences.some((tag)=>tag.name.toLowerCase()===query.trim().toLowerCase())&&<button className="text-button" type="button" disabled={record.causeTagIds.length>=3} onClick={()=>{const tagId=crypto.randomUUID(),name=query.trim().slice(0,50);setState((current)=>{const tags=[...current.influences,{id:tagId,name}];return updateMood({...current,influences:tags},date,period,{causeTagIds:[...record.causeTagIds,tagId]},new Date().toISOString());});setQuery('');}}>+ Create “{query.trim().slice(0,50)}”</button>}<button className="muse-button" type="button" onClick={()=>setOpen(false)}>Done</button></footer></GlassPopover>
 </div>;
}
