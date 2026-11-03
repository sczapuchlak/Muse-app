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
 return <div className="muse-reflection-editor"><label htmlFor={id} className="editor-label">{prompt}</label><textarea id={id} rows={4} maxLength={5000} placeholder="Leave a few words, if you like…" value={value} onChange={event=>{setPeriod(period);setDrafts(current=>({...current,[key]:event.target.value}));}} onKeyDown={event=>{if(event.key==='Escape'&&dirty){event.preventDefault();event.stopPropagation();clearDraft();}}}/><div className="editor-actions muse-feedback-anchor"><button type="button" className="muse-button button-primary" disabled={!dirty} onClick={()=>{update({reflection:value.trim()?value:''});clearDraft();trigger();}}>Save reflection</button>{dirty&&<button type="button" className="muse-button" onClick={clearDraft}>Discard changes</button>}{spark}<span className="small-label" role="status">{dirty?'Unsaved draft · kept in this session when switching dates':status?.error?'Reflection not saved · draft retained':status?.pending?'Saving reflection…':record.reflection?'Reflection saved':'Optional reflection'} · {period}</span></div></div>;}
