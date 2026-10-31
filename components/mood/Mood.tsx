"use client";
import { useState } from 'react';
import { emotionCatalog } from '@/lib/emotions';
import { dailyEditSample } from '@/lib/daily-edit-data';

import { shiftDate,weekDates } from '@/lib/dates';
import { shortDate } from '@/lib/display-date';
import { moodSummary,type EmotionalCheckIn } from '@/lib/mood';
import { moodQuadrants,type EmotionQuadrant } from '@/lib/models';
import { MusePageHeader } from '../MusePageHeader';
import { DateNavigator } from '../DateNavigator';
import { MuseCard } from '../MuseCard';
import { CardHeading } from '../CardHeading';
import { MoodCheckInLayout } from './MoodCheckInLayout';
import {Dayprint} from './Dayprint';
import {dailyExpression} from '@/lib/daily-expression';
import { MuseModal } from '../MuseModal';
import { useMuseDate,useMuseState,useMuseRecords } from '../MuseSession';
import {ReflectionEditor} from './ReflectionEditor';
import { useMood } from './useMood';
import './Mood.css';
const prompts=['What stayed with you today?','What gave you energy?','What felt heavier than expected?','What would you like to carry into tomorrow?'];
export function Mood() {
 const [date,setDate]=useMuseDate(dailyEditSample.date.iso),{state,setState,record,setPeriod}=useMood(date),[prompt,setPrompt]=useState(0),[historyDate,setHistoryDate]=useState(date),[allHistory,setAllHistory]=useState(false),[deleteId,setDeleteId]=useState<string|null>(null),[deleteAnchor,setDeleteAnchor]=useState<HTMLElement|null>(null);
 const [,setReflectionDrafts]=useMuseState<Record<string,string>>('reflection-drafts',{},true);
 const dailyRecords=useMuseRecords();
 const week=weekDates(historyDate),history=state.records.filter((item)=>allHistory||week.includes(item.date)).sort((a,b)=>b.date.localeCompare(a.date)||(a.period==='evening'?-1:1)),summary=moodSummary(state.records,emotionCatalog),familyTotal=Object.values(summary.families).reduce((sum,value)=>sum+value,0);
 const historyDates=[...new Set([...history.map(item=>item.date),...Object.keys(dailyRecords).filter(key=>/^\d{4}-\d{2}-\d{2}\/(intention|intention-emoji|day-in-three)$/.test(key)).map(key=>key.slice(0,10)).filter(day=>{const value=dailyExpression(dailyRecords,day);return (allHistory||week.includes(day))&&!!(value.intention||value.intentionEmoji||value.dayInThree.length);})])].sort().reverse();
 function open(item:EmotionalCheckIn){setDate(item.date);setPeriod(item.period,item.date);document.getElementById('mood-title')?.scrollIntoView({block:'start'});}
 return <main className="muse-page muse-mood-page"><MusePageHeader title="Mood"><DateNavigator date={date} onChange={setDate}/></MusePageHeader>
 <p className="muse-mood-save-state" role="status">{record.updatedAt?'Updated in this session.':'A check-in can start anywhere.'}</p>
 <MoodCheckInLayout date={date} emotions={emotionCatalog}/>
 <div className="muse-mood-grid">
 <MuseCard id="mood-reflection" className="muse-mood-reflection"><CardHeading id="mood-reflection" title="A little reflection" icon="notes"><button className="text-button" type="button" onClick={()=>setPrompt((value)=>(value+1)%prompts.length)}>Another prompt</button></CardHeading><ReflectionEditor date={date} prompt={prompts[prompt]}/></MuseCard>
 <MuseCard id="mood-meter"><CardHeading id="mood-meter" title="An emotional landscape" icon="mood"/><p className="card-description">Different families of feeling. More than one can belong.</p><div className="muse-mood-meter">{(['red','yellow','blue','green'] as EmotionQuadrant[]).map((key)=><div key={key} data-quadrant={key}><strong><i className="quadrant-dot"/>{moodQuadrants[key].label}</strong><small>{moodQuadrants[key].energy} energy · {moodQuadrants[key].pleasantness}</small><p>{emotionCatalog.filter((emotion)=>emotion.quadrant===key&&record.emotionIds.includes(emotion.id)).map((emotion)=>emotion.name).join(' · ')||'—'}</p></div>)}</div><p className="small-label">These are emotional families, separate from your Day Pulse Energy score.</p></MuseCard></div>
 <section className="muse-mood-history" aria-labelledby="mood-history-title"><div className="muse-mood-label-row"><div><h2 id="mood-history-title">Your emotional history</h2><p className="card-description">Only the moments you’ve recorded.</p></div><button className="text-button" type="button" aria-pressed={allHistory} onClick={()=>setAllHistory((value)=>!value)}>{allHistory?'Show a week':'All check-ins'}</button></div><div className="muse-mood-history-navigation"><button className="muse-button" type="button" aria-label="Previous history week" onClick={()=>{setAllHistory(false);setHistoryDate(shiftDate(historyDate,-7));}}>‹</button><span>{shortDate(week[0])} – {shortDate(week[6])}, {week[0].slice(0,4)}</span><button className="muse-button" type="button" aria-label="Next history week" onClick={()=>{setAllHistory(false);setHistoryDate(shiftDate(historyDate,7));}}>›</button></div>
 {!historyDates.length?<p className="muse-mood-empty">Nothing logged {allHistory?'yet':'this week'}. Missing days stay blank, never a low score.</p>:<ul className="muse-mood-history-list">{historyDates.map(day=><li key={day}><Dayprint date={day} expression={dailyExpression(dailyRecords,day)} records={history.filter(item=>item.date===day)} influences={state.influences} onDate={setDate} onOpen={open} onDelete={(record,anchor)=>{setDeleteAnchor(anchor);setDeleteId(record.id);}}/></li>)}</ul>}</section>
 <MuseCard id="mood-patterns"><CardHeading id="mood-patterns" title="A few things you’ve noticed" icon="insights"/>{summary.count===0?<p className="card-description">Your own patterns will appear as you log. No conclusions to rush into.</p>:<div className="muse-mood-insights"><div><p className="editor-label">Often felt</p>{summary.frequent.length?summary.frequent.map(([id,count])=>{const emotion=emotionCatalog.find((item)=>item.id===id);return <p key={id}>{emotion?.emoji} {emotion?.name} <span className="small-label">{count} {count===1?'selection':'selections'}</span></p>;}):<p className="small-label">No feelings recorded yet.</p>}</div><div><p className="editor-label">Feeling families</p>{(Object.keys(summary.families) as EmotionQuadrant[]).map((key)=><div key={key} className="muse-mood-family-bar" data-quadrant={key}><span>{moodQuadrants[key].label} · {moodQuadrants[key].energy} energy · {moodQuadrants[key].pleasantness}</span><span><i style={{width:`${familyTotal?summary.families[key]/familyTotal*100:0}%`}}/></span><small>{summary.families[key]}</small></div>)}</div><div className="muse-mood-signal-averages">{(['energy','stress','overallDay'] as const).map(key=><div key={key}><p className="editor-label">Average {key==='overallDay'?'Overall Day':key==='energy'?'Energy':'Stress'}</p><strong className="muse-mood-average">{summary.signals[key].average===null?'—':summary.signals[key].average!.toFixed(1)}{summary.signals[key].average!==null&&<small> / 10</small>}</strong><span className="small-label">n = {summary.signals[key].count}</span></div>)}<p className="small-label">Independent observations. Missing values excluded.</p></div></div>}<p className="small-label">{summary.count} recorded check-ins in this session. {summary.count>0&&summary.count<7?'A small sample, a little context — not a conclusion.':''} Influences are context, not proof of cause.</p></MuseCard>
 {deleteId&&<MuseModal id="delete-mood-check-in" label="Delete check-in?" returnFocus={deleteAnchor} onClose={()=>setDeleteId(null)}><h2>Delete this check-in?</h2><p>Its feelings, Day Pulse and reflection will be removed from this session.</p><div className="editor-actions"><button className="muse-button" type="button" onClick={()=>setDeleteId(null)}>Keep it</button><button className="muse-button" type="button" onClick={()=>{const removed=state.records.find(item=>item.id===deleteId);if(removed)setReflectionDrafts(current=>{const next={...current};delete next[`${removed.date}/${removed.period}`];return next;});setState((current)=>({...current,records:current.records.filter((item)=>item.id!==deleteId)}));setDeleteId(null);}}>Delete check-in</button></div></MuseModal>}
 </main>;
}
