"use client";
import {uniqueMoodRecords,type EmotionalCheckIn} from '@/lib/mood';
import {type DailyExpression} from '@/lib/daily-expression';
import {emotionCatalog} from '@/lib/emotions';
import {dateLabel} from '@/lib/dates';
import {shortDate} from '@/lib/display-date';
import type {ContextTag} from '@/lib/models';
import {priorityCompletion} from '@/lib/data/daily-projections';
import type {DailyPulseObservation} from '@/lib/data/daily-projections';
import type {DailyPriority} from '@/lib/data/daily';
import {MuseIconButton} from '../MuseIconButton';
const signals=['energy','stress','overallDay'] as const;
/** Historical presentation of canonical daily values and independent emotional sessions. */
export function Dayprint({date,expression,records,influences,onOpen,onDelete,onDate,pulse,priorities=[],busy=false}:{busy?:boolean;pulse?:DailyPulseObservation;priorities?:DailyPriority[];date:string;expression:DailyExpression;records:EmotionalCheckIn[];influences:ContextTag[];onOpen:(record:EmotionalCheckIn)=>void;onDelete:(record:EmotionalCheckIn,anchor:HTMLElement)=>void;onDate:(date:string)=>void}){
 const sessions=uniqueMoodRecords(records.filter(record=>record.date===date)).sort((a,b)=>a.period===b.period?0:a.period==='morning'?-1:1);
 const rated=pulse&&signals.some(key=>pulse[key]!==null)?[pulse]:[];
 return <article className="muse-dayprint" aria-label={`Dayprint for ${dateLabel(date)}`}>
  <header className="muse-dayprint-header"><div className="muse-dayprint-identity"><button className="muse-ledger-name" type="button" onClick={()=>onDate(date)}>Dayprint · {shortDate(date)}</button>{(expression.intention||expression.intentionEmoji)&&<p className="muse-dayprint-intention"><span className="small-label">Intention</span> {expression.intentionEmoji} {expression.intention}</p>}</div>
   {(expression.dayInThree.length>0||rated.length>0)&&<div className="muse-dayprint-daily-summary">{expression.dayInThree.length>0&&<div><p className="editor-label">DAY IN THREE</p><span className="muse-dayprint-vibe" aria-label={`Day in Three: ${expression.dayInThree.join(' ')}`}>{expression.dayInThree.join(' ')}</span></div>}<div className="muse-dayprint-session-ratings">{rated.map(record=><div className="muse-dayprint-pulse" key={record.date}><p className="muse-dayprint-pulse-label">Day Pulse</p><dl aria-label="Daily ratings">{signals.map(key=>record[key]!==null&&<div key={key}><dt>{key==='overallDay'?'Overall Day':key==='energy'?'Energy':'Stress'}</dt><dd>{record[key]}<small>/10</small></dd></div>)}</dl></div>)}</div></div>}
  </header>
  {priorities.length>0&&<section className="muse-dayprint-session"><p className="editor-label">Priorities · {priorities.filter(item=>priorityCompletion(item,'historical')===true).length}/{priorities.length} complete{priorities.some(item=>priorityCompletion(item,'historical')===null)?' · some completion not known':''}</p><ol>{priorities.map(item=><li key={item.id}><span aria-label={priorityCompletion(item,'historical')===null?'Completion not known':priorityCompletion(item,'historical')?'Complete':'Incomplete'}>{priorityCompletion(item,'historical')===null?'?':priorityCompletion(item,'historical')?'✓':'○'}</span> {item.text}</li>)}</ol></section>}
  {sessions.map(record=><section className="muse-dayprint-session" key={record.id}><div className="muse-dayprint-session-heading"><button className="text-button" type="button" onClick={()=>onOpen(record)}>{record.period==='morning'?'Morning':'Evening'}</button><div><MuseIconButton icon="edit" label={`Edit ${record.period} check-in on ${dateLabel(date)}`} onClick={()=>onOpen(record)}/><MuseIconButton disabled={busy} icon="trash" label={`Delete ${record.period} check-in on ${dateLabel(date)}`} onClick={event=>onDelete(record,event.currentTarget)}/></div></div>{record.emotionIds.length>0&&<div className="feeling-chips">{record.emotionIds.map(id=>{const emotion=emotionCatalog.find(item=>item.id===id);return emotion&&<span className="muse-mood-history-feeling" data-quadrant={emotion.quadrant} key={id}>{emotion.emoji} {emotion.name}</span>;})}</div>}{record.causeTagIds.length>0&&<p className="small-label">Alongside {record.causeTagIds.map(id=>influences.find(tag=>tag.id===id)?.name).filter(Boolean).join(' · ')}</p>}{record.reflection&&<p className="muse-mood-reflection-preview">{record.reflection.slice(0,180)}{record.reflection.length>180?'…':''}</p>}</section>)}
 </article>;
}
