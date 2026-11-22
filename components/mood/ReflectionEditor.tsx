"use client";
import {useEffect} from 'react';
import {useMuseState} from '../MuseSession';
import {useMuseSpark} from '../MuseSpark';
import {useDailyDay} from '../daily/DailyData';
import {useMood} from './useMood';
/** Drafts survive date/route changes in-session without entering emotional history. */
export function ReflectionEditor({date,prompt,id="mood-reflection-text"}:{date:string;prompt:string;id?:string}){const {record,period,setPeriod,update}=useMood(date),[drafts,setDrafts]=useMuseState<Record<string,string>>('reflection-drafts',{},true),{trigger,spark}=useMuseSpark(),key=`${date}/${period}`,value=drafts[key]??record.reflection,dirty=value!==record.reflection;
 const {status}=useDailyDay(date);
 function clearDraft(){setDrafts(current=>{const next={...current};delete next[key];return next;});}
 useEffect(()=>{if(!dirty)return;const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[dirty]);
 const saved=!!record.reflection&&!dirty;
 // The prompt is the lead-in; Save shows only once there's something new to keep, and quietly confirms afterwards.
 return <div className="muse-reflection-editor" data-dirty={dirty||undefined}><label htmlFor={id} className="editor-label muse-reflection-prompt">{prompt}</label><textarea id={id} rows={3} maxLength={5000} placeholder="A line or two is plenty…" value={value} onChange={event=>{setPeriod(period);setDrafts(current=>({...current,[key]:event.target.value}));}} onKeyDown={event=>{if(event.key==='Escape'&&dirty){event.preventDefault();event.stopPropagation();clearDraft();}}}/>{(dirty||saved||status?.error||status?.pending)&&<div className="editor-actions muse-feedback-anchor">{dirty&&<button type="button" className="muse-button button-primary" onClick={()=>{update({reflection:value.trim()?value:''});clearDraft();trigger();}}>Save</button>}{dirty&&<button type="button" className="muse-button button-ghost" onClick={clearDraft}>Discard</button>}{spark}<span className="small-label" role="status">{status?.error?'Not saved · your words are kept here':status?.pending?'Saving…':dirty?'Not saved yet':`Saved ✓ · ${period}`}</span></div>}</div>;}
