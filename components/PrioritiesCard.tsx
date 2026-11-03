'use client';
import {useEffect,useRef,useState} from 'react';
import {useMuseDate} from './MuseSession';
import {useDailyDay,DailyCapture} from './daily/DailyData';
import type {DailyPriority,PriorityInput} from '@/lib/data/daily';
import {dailyTextDisplay,priorityCompletion} from '@/lib/data/daily-projections';
import {MuseCard} from './MuseCard';import {CardHeading} from './CardHeading';import {MuseIcon} from './MuseIcon';import {EditableText} from './EditableText';import {useMuseSpark} from './MuseSpark';import {EmojiButton} from './EmojiPicker';import {MuseMilestone} from './MuseMilestone';
import {usePlanner} from './PlannerStore';import './PrioritiesCard.css';import {PriorityTaskLink} from './PriorityTaskLink';
import {useMuseToday} from './useMuseToday';
function PriorityItem({priority,complete,historical,disabled,onToggle,onEdit,children}:{priority:DailyPriority;complete:boolean|null;historical:boolean;disabled:boolean;onToggle:()=>void;onEdit:(title:string)=>void;children:React.ReactNode}){
 const unavailable=priority.task_unavailable===true||!priority.task_id;
 const {trigger,spark}=useMuseSpark(),check=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(check.current)check.current.indeterminate=complete===null;},[complete]);
 return <li><div className={`priority-item${complete===true?' is-complete':''}`}><label className="priority-completion" title={historical&&priority.task_id?'Day-end history. Current task actions are in the link menu.':complete===null?'Completion is not known for this day.':undefined}>
 <input ref={check} type="checkbox" className="check-input" checked={complete===true} aria-checked={complete===null?'mixed':complete} aria-label={`${historical&&priority.task_id?'Historical priority':'Complete priority'}: ${priority.text}`} disabled={disabled||unavailable||!!priority.task_id&&historical} onChange={event=>{if(event.target.checked)trigger();onToggle();}}/>
 <span className="priority-check" aria-hidden="true">{complete===true&&<MuseIcon name="check" size={15}/>} {complete===null?'?':null}{spark}</span></label>
 <span className="priority-text">{unavailable?<span>{priority.text}</span>:<EditableText disabled={disabled} value={priority.text} label="Edit priority" maxLength={160} onSave={onEdit}/>}{unavailable&&<small className="small-label">Kept for history</small>}{historical&&priority.task_id&&<small className="small-label">Day-end status{complete===null?' · not known':''}</small>}</span>
 <span className="priority-number" aria-hidden="true">0{priority.position+1}</span>{children}</div></li>;
}
export function PrioritiesCard(){
 const [date]=useMuseDate(''),{day,store,patch,status,profile}=useDailyDay(date),planner=usePlanner(),[title,setTitle]=useState(''),capture=useRef<{id:string;date:string;text:string}|null>(null);
 useEffect(()=>store?.subscribe(()=>{const pending=capture.current;if(pending&&store.getSnapshot().days[pending.date]?.priorities.some(item=>item.id===pending.id)){capture.current=null;if(pending.date===date)setTitle(value=>value===pending.text?'':value);}}),[store,date]);
 useEffect(()=>{if(!planner.store||!store)return;const plannerStore=planner.store;let last=plannerStore.getSnapshot().discarded;return plannerStore.subscribe(()=>{const discarded=plannerStore.getSnapshot().discarded;if(discarded===last)return;last=discarded;const pending=capture.current;if(pending)void store.load(pending.date,true).then(()=>{if(capture.current!==pending)return;if(pending.date===date&&store.getSnapshot().days[pending.date]?.priorities.some(item=>item.id===pending.id))setTitle(value=>value===pending.text?'':value);capture.current=null;});});},[planner.store,store,date]);
 const today=useMuseToday(day.record?.time_zone??profile.timeZone);
 useEffect(()=>{if(today)void store?.load(date,true);},[today,date,store]);
 const priorities=day.priorities.map(item=>{const task=planner.state.tasks.find(task=>task.id===item.task_id);return task?{...item,text:task.title}:item;});
 const inputs:PriorityInput[]=priorities.map(item=>({id:item.id,text:item.text,complete:item.task_id?null:item.standalone_complete,taskId:item.task_id}));
 const save=(items:PriorityInput[])=>store?.edit(date,{kind:'priorities',items,plannerRevision:planner.status?.revision});
 const historical=today?date<today:day.priorities.some(item=>item.historical_day);
 const values=priorities.map(item=>item.task_id&&!historical?planner.state.tasks.find(task=>task.id===item.task_id)?.complete??priorityCompletion(item):priorityCompletion(item));
 const completed=values.filter(value=>value===true).length,unknown=values.filter(value=>value===null).length;
 function complete(priority:DailyPriority,value:boolean){if(priority.task_id){const task=planner.state.tasks.find(item=>item.id===priority.task_id);if(task&&task.complete!==value)planner.dispatch({type:'task/toggle',id:task.id,now:new Date().toISOString()});}else save(inputs.map(item=>item.id===priority.id?{...item,complete:value}:item));}
 return <MuseCard id="priorities" className="card-full priorities-card"><DailyCapture date={date} group>
 <MuseMilestone achieved={day.priorities.length===3&&completed===3} kind="shooting"/>
 <CardHeading id="priorities" title="Today’s priorities"><span className="priority-count" role="status" aria-label={`${completed} of ${day.priorities.length} priorities complete${unknown?`, ${unknown} not known`:''}`}><strong>{completed}</strong> / {day.priorities.length}<span className="count-label">complete{unknown?` · ${unknown} not known`:''}</span></span></CardHeading>
 <div className="daily-intention"><span className="editor-label">Today’s intention</span><EmojiButton value={day.record?.intention_emoji??null} label="Intention emoji" onChange={value=>patch({intention_emoji:value})}/><IntentionInput key={`${date}/${status?.discarded??0}`} value={day.record?.intention_text??''} onChange={value=>patch({intention_text:value||null})}/></div>
 <ul className="priority-list">{priorities.map((priority,index)=><PriorityItem key={priority.id} priority={priority} complete={values[index]} historical={historical} disabled={!!priority.task_id&&(!planner.canEdit||!!status?.pending)} onToggle={()=>complete(priority,values[index]!==true)} onEdit={text=>{if(priority.task_id)planner.dispatch({type:'priority/title',id:priority.id,taskId:priority.task_id,priorityRevision:priority.revision,title:text});}}>
 <span className="priority-actions"><PriorityTaskLink priority={priority} linkedIds={day.priorities.flatMap(item=>item.task_id?[item.task_id]:[])} busy={!!status?.pending} onLink={taskId=>{if(taskId)save(inputs.map(item=>item.id===priority.id?{...item,taskId,complete:null}:item));}} onComplete={value=>complete(priority,value)}/>
 <button type="button" className="text-button" aria-label={`Move priority ${index+1} earlier`} disabled={index===0} onClick={()=>{const next=[...inputs];[next[index-1],next[index]]=[next[index],next[index-1]];save(next);}}>↑</button>
 <button type="button" className="text-button" aria-label={`Move priority ${index+1} later`} disabled={index===inputs.length-1} onClick={()=>{const next=[...inputs];[next[index+1],next[index]]=[next[index],next[index+1]];save(next);}}>↓</button>
 <button type="button" className="text-button" aria-label={`Remove priority: ${priority.text}`} onClick={()=>save(inputs.filter(item=>item.id!==priority.id))}><MuseIcon name="close" size={14}/></button></span>
 </PriorityItem>)}</ul>
 {!inputs.length&&<p className="card-description">No priorities for this day.</p>}
 {inputs.length<3&&<form className="priority-add" onSubmit={event=>{event.preventDefault();if(!title.trim()||!planner.canEdit||planner.status?.pending||capture.current)return;const id=crypto.randomUUID();capture.current={id,date,text:title};planner.dispatch({type:'priority/create',id,date,title:title.trim()});}}><input aria-label="New priority" placeholder="Add a priority…" maxLength={160} value={title} onChange={event=>setTitle(event.target.value)}/><button className="muse-button" type="submit" disabled={!title.trim()||!planner.canEdit||!!planner.status?.pending}>Add priority</button></form>}
 </DailyCapture></MuseCard>;
}
function IntentionInput({value,onChange}:{value:string;onChange:(value:string)=>void}){const [draft,setDraft]=useState<string|null>(null);return <input aria-label="Today’s intention" type="text" value={dailyTextDisplay(value,draft)} maxLength={1000} onBlur={()=>setDraft(null)} onChange={event=>{setDraft(event.target.value);onChange(event.target.value);}} placeholder="What matters today?"/>;}
