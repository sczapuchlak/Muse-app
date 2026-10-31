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
import {useWellness,WellnessSaveStatus} from '../WellnessStore';
import {useMuseToday} from '../useMuseToday';
import {Dayprint} from './Dayprint';
import {dayExpression,dayPulse,hasDailyData} from '@/lib/data/daily-projections';
import {useDailyData,useDailyRange,DailyCapture,DailySaveStatus} from '../daily/DailyData';
import { MuseModal } from '../MuseModal';
import { useMuseDate,useMuseState } from '../MuseSession';
import {ReflectionEditor} from './ReflectionEditor';
import { useMood } from './useMood';
import './Mood.css';
const prompts=['What stayed with you today?','What gave you energy?','What felt heavier than expected?','What would you like to carry into tomorrow?'];
export function Mood() {
 const [date,setDate]=useMuseDate(dailyEditSample.date.iso),{state,store,record,setPeriod}=useMood(date),[prompt,setPrompt]=useState(0),[historyAnchor,setHistoryAnchor]=useState<{selected:string;date:string}|null>(null),[allHistory,setAllHistory]=useState(false),[deleteId,setDeleteId]=useState<string|null>(null),[deleteAnchor,setDeleteAnchor]=useState<HTMLElement|null>(null);
 const [,setReflectionDrafts]=useMuseState<Record<string,string>>('reflection-drafts',{},true);
 const {state:wellness,status:wellnessStatus}=useWellness();
 const {snapshot,profile}=useDailyData(),[earlier,setEarlier]=useState<{anchor:string;start:string}|null>(null);
 const historyDate=historyAnchor?.selected===date?historyAnchor.date:date,historyStart=earlier?.anchor===historyDate?earlier.start:shiftDate(historyDate,-89);
 function setHistoryDate(value:string){setHistoryAnchor({selected:date,date:value});}
 const week=weekDates(historyDate),start=allHistory?historyStart:week[0],end=week[6],range=useDailyRange(start,end);
 const history=state.records.filter(item=>item.date>=start&&item.date<=end).sort((a,b)=>b.date.localeCompare(a.date)||(a.period==='evening'?-1:1));
 const summary=moodSummary(state.records,emotionCatalog,Object.entries(snapshot.days).map(([date,day])=>dayPulse(date,day))),familyTotal=Object.values(summary.families).reduce((sum,value)=>sum+value,0);
 const today=useMuseToday(profile.timeZone);
 const [daySelection,setDaySelection]=useState<{week:string;date:string}|null>(null);
 const historyDates=Object.keys(snapshot.days).filter(day=>day>=start&&day<=end&&hasDailyData(snapshot.days[day])).sort().reverse();
 const recordedDates=[...new Set([...historyDates,...wellness.activities.map(item=>item.date),...wellness.water.map(item=>item.date)])];
 const selectedDay=daySelection?.week===week[0]?daySelection.date:week.includes(today)?today:week.slice().reverse().find(day=>recordedDates.includes(day))??week[0];
 function selectDay(day:string){setDaySelection({week:weekDates(day)[0],date:day});}
 function open(item:EmotionalCheckIn){setDate(item.date);setPeriod(item.period,item.date);document.getElementById('mood-title')?.scrollIntoView({block:'start'});}
 return <main className="muse-page muse-mood-page"><MusePageHeader title="Mood"><DateNavigator date={date} onChange={setDate}/></MusePageHeader>

 <DailyCapture date={date}><MoodCheckInLayout date={date} emotions={emotionCatalog}/></DailyCapture>
 <div className="muse-mood-grid">
 <MuseCard id="mood-reflection" className="muse-mood-reflection"><CardHeading id="mood-reflection" title="A little reflection" icon="notes"><button className="muse-button button-ghost" type="button" onClick={()=>setPrompt((value)=>(value+1)%prompts.length)}>Another prompt</button></CardHeading><DailyCapture date={date}><ReflectionEditor date={date} prompt={prompts[prompt]}/></DailyCapture></MuseCard>
 <MuseCard id="mood-meter"><CardHeading id="mood-meter" title="Emotional Landscape" icon="mood"/><p className="card-description">Different families of feeling. More than one can belong.</p><div className="muse-mood-meter">{(['red','yellow','blue','green'] as EmotionQuadrant[]).map((key)=><div key={key} data-quadrant={key}><strong><i className="quadrant-dot"/>{moodQuadrants[key].label}</strong><small>{moodQuadrants[key].energy} energy · {moodQuadrants[key].pleasantness}</small><p>{emotionCatalog.filter((emotion)=>emotion.quadrant===key&&record.emotionIds.includes(emotion.id)).map((emotion)=>emotion.name).join(' · ')||'—'}</p></div>)}</div><p className="small-label">These are emotional families, separate from your Day Pulse Energy score.</p></MuseCard></div>
 <section className="muse-mood-history" aria-labelledby="mood-history-title"><div className="muse-mood-history-header"><div><h2 id="mood-history-title">Your emotional history</h2><p className="card-description">Only the moments you’ve recorded.</p></div><div className="muse-mood-history-navigation"><button className="muse-button" type="button" aria-label="Previous history week" onClick={()=>{setAllHistory(false);setHistoryDate(shiftDate(historyDate,-7));}}>‹</button><span>{shortDate(week[0])} – {shortDate(week[6])}, {week[0].slice(0,4)}</span><button className="muse-button" type="button" aria-label="Next history week" onClick={()=>{setAllHistory(false);setHistoryDate(shiftDate(historyDate,7));}}>›</button><button className="muse-button" type="button" aria-expanded={allHistory} onClick={()=>setAllHistory(value=>!value)}>Browse History</button></div></div>
 {allHistory&&<nav className="muse-history-browse" aria-label="Recorded history dates">{recordedDates.filter(day=>day>=start&&day<=end).sort().reverse().map(day=><button type="button" className="muse-button button-ghost" key={day} onClick={()=>{setHistoryDate(day);selectDay(day);setAllHistory(false);}}>{shortDate(day)}</button>)}<button className="muse-button button-ghost" type="button" onClick={()=>setEarlier({anchor:historyDate,start:shiftDate(historyStart,-90)})}>Load earlier days</button></nav>}
 {range.error?<p role="alert">History could not load. <button className="muse-button" onClick={()=>void range.retry()}>Retry history</button></p>:!range.loaded?<p role="status">Loading history…</p>:<Dayprint busy={snapshot.statuses[selectedDay]?.pending||!!snapshot.statuses[selectedDay]?.error} date={selectedDay} today={today} expression={dayExpression(snapshot.days[selectedDay])} pulse={dayPulse(selectedDay,snapshot.days[selectedDay])} records={history.filter(item=>item.date===selectedDay)} influences={state.influences} onDate={selectDay} recordedDates={recordedDates} water={wellnessStatus.loaded?wellness.water.find(item=>item.date===selectedDay):undefined} activities={wellnessStatus.loaded?wellness.activities.filter(item=>item.date===selectedDay).map(item=>wellness.types.find(type=>type.id===item.typeId)?.name??'Recorded activity'):[]} onOpen={open} onDelete={(record,anchor)=>{setDeleteAnchor(anchor);setDeleteId(record.id);}}/>}
 {snapshot.statuses[selectedDay]?.pending&&<DailySaveStatus date={selectedDay}/>}</section>
 <MuseCard id="mood-patterns"><CardHeading id="mood-patterns" title="A few things you’ve noticed" icon="insights"/>{summary.count===0&&Object.values(summary.signals).every(signal=>signal.count===0)?<p className="card-description">Your own patterns will appear as you log. No conclusions to rush into.</p>:<div className="muse-mood-insights"><div><p className="editor-label">Frequently Felt</p>{summary.frequent.length?summary.frequent.map(([id,count])=>{const emotion=emotionCatalog.find((item)=>item.id===id);return <p key={id}><span className="muse-mood-history-feeling" data-quadrant={emotion?.quadrant}>{emotion?.emoji} {emotion?.name}</span> <span className="small-label">{count} {count===1?'selection':'selections'}</span></p>;}):<p className="small-label">No feelings recorded yet.</p>}</div><div><p className="editor-label">Feeling families</p>{(Object.keys(summary.families) as EmotionQuadrant[]).map((key)=><div key={key} className="muse-mood-family-bar" data-quadrant={key}><span>{moodQuadrants[key].label} · {moodQuadrants[key].energy} energy · {moodQuadrants[key].pleasantness}</span><span><i style={{width:`${familyTotal?summary.families[key]/familyTotal*100:0}%`}}/></span><small>{summary.families[key]}</small></div>)}</div><div className="muse-mood-signal-averages"><p className="editor-label">Day Pulse</p>{(['energy','stress','overallDay'] as const).map(key=><div key={key}><p className="editor-label">Average {key==='overallDay'?'Overall Day':key==='energy'?'Energy':'Stress'}</p><strong className="muse-mood-average">{summary.signals[key].average===null?'—':summary.signals[key].average!.toFixed(1)}{summary.signals[key].average!==null&&<small> / 10</small>}</strong><span className="small-label">Based on {summary.signals[key].count} recorded {summary.signals[key].count===1?'day':'days'}</span></div>)}<p className="small-label">Independent observations. Missing values excluded.</p></div></div>}<p className="small-label">{summary.count} recorded check-ins in loaded history. {summary.count>0&&summary.count<7?'A small sample, a little context — not a conclusion.':''} Influences are context, not proof of cause.</p></MuseCard>
 {deleteId&&<MuseModal id="delete-mood-check-in" label="Delete check-in?" returnFocus={deleteAnchor} onClose={()=>setDeleteId(null)}><h2>Delete this check-in?</h2><p>Its feelings, influences and reflection will be deleted. Daily intention, priorities, Day in Three and Day Pulse are preserved.</p><div className="editor-actions"><button className="muse-button" type="button" onClick={()=>setDeleteId(null)}>Keep it</button><button className="muse-button" type="button" onClick={()=>{const removed=state.records.find(item=>item.id===deleteId);if(removed)setReflectionDrafts(current=>{const next={...current};delete next[`${removed.date}/${removed.period}`];return next;});if(removed)store?.edit(removed.date,{kind:'delete',id:removed.id});setDeleteId(null);}}>Delete check-in</button></div></MuseModal>}
 <footer className="muse-footer"><DailySaveStatus date={date}/><WellnessSaveStatus/></footer></main>;
}
