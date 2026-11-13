'use client';
import {useState,type CSSProperties} from 'react';
import {MuseModal} from '@/components/MuseModal';
import {MuseIcon} from '@/components/MuseIcon';
import {DAILY_PRESETS,type DailyGoal,type GoalStreakDetail} from '@/lib/whimsy/daily-goal';
import {StreakHeart} from './ReadingStreak';
import './DailyGoal.css';

const weekday=(date:string)=>new Intl.DateTimeFormat(undefined,{weekday:'narrow',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
const longDay=(date:string)=>new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));

/** Today's minutes against today's target, the goal streak, and the last seven days. All of it is read from saved sessions. */
export function DailyGoalCard({goal,detail,today,onSet}:{goal:DailyGoal|null;detail:GoalStreakDetail;today:string;onSet:()=>void}){
 if(!goal)return <div className="muse-daily" data-empty><div><strong>A daily rhythm, if you want one</strong><p>Pick a few minutes a day. Reading still counts without a goal, and a short day never erases it.</p></div><button type="button" className="muse-button button-primary" onClick={onSet}>Set a daily goal</button><ol className="muse-daily-preview" aria-hidden="true">{['M','T','W','T','F','S','S'].map((d,i)=><li key={i}><i/>{d}</li>)}</ol></div>;
 const target=detail.targetToday??goal.target,minutes=Math.floor(detail.minutesToday),percent=Math.min(100,Math.round(100*detail.minutesToday/target));
 return <div className="muse-daily" data-met={detail.metToday||undefined}>
  <div className="muse-daily-top"><p className="muse-daily-count"><strong className="type-numeric">{minutes}</strong><span> / {target} min today</span></p>
   <button type="button" className="muse-button button-ghost muse-daily-change" onClick={onSet} aria-label="Change daily goal"><MuseIcon name="edit" size={14}/>Change</button></div>
  <span className="muse-desk-pool" style={{'--fill':`${Math.max(percent,percent?3:0)}%`} as CSSProperties} role="meter" aria-label="Today's reading goal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span/></span>
  <p className="muse-daily-state" role="status">{detail.metToday?<><span aria-hidden="true">✦</span> Goal met today</>:detail.minutesToday>0?`${detail.toGo} more ${detail.toGo===1?'minute':'minutes'} to reach today’s goal`:`${target} minutes makes today count`}</p>
  <div className="muse-daily-streak"><span className="muse-daily-streak-num"><StreakHeart filled={detail.current>0} size={22}/><strong className="type-numeric">{detail.current}</strong></span>
   <span className="muse-daily-streak-copy"><strong>{detail.current===1?'1-day goal streak':`${detail.current}-day goal streak`}</strong><small>Best {detail.longest} {detail.longest===1?'day':'days'}{detail.current>0&&!detail.metToday?' · meet today’s goal to keep it':''}</small></span>
   <ol className="muse-daily-week" aria-label="Last seven days against your goal">{detail.week.map(d=><li key={d.date} data-state={d.met?'met':d.read?'read':'none'} data-today={d.date===today||undefined} title={`${longDay(d.date)}: ${Math.floor(d.minutes)} min${d.target?` of ${d.target}`:''}`}><span aria-hidden="true"/><small>{weekday(d.date)}</small><span className="sr-only">{d.met?'goal met':d.read?'read, goal not met':'no reading'}</span></li>)}</ol></div>
 </div>;
}

/** Pick a daily target: presets or any custom number of minutes. Changing it only affects today onward. */
export function DailyGoalModal({current,busy,onSave,onRemove,onClose}:{current:number|null;busy:boolean;onSave:(minutes:number)=>void;onRemove?:()=>void;onClose:()=>void}){
 const [value,setValue]=useState<number|null>(current??20),[custom,setCustom]=useState(current&&!(DAILY_PRESETS as readonly number[]).includes(current)?String(current):''),[problem,setProblem]=useState('');
 const customNumber=custom.trim()===''?null:Number(custom);
 function save(){const n=customNumber??value;if(!n||!Number.isFinite(n)||n<1||n>720||!Number.isInteger(n)){setProblem('Choose a whole number of minutes from 1 to 720.');return;}onSave(n);}
 return <MuseModal id="daily-goal-editor" label="Daily reading goal" title="Daily reading goal" returnFocus={null} onClose={onClose}>
  <form className="muse-daily-form" noValidate onSubmit={e=>{e.preventDefault();save();}}>
   <p className="muse-daily-hint">How many minutes would feel good most days? Time comes from your saved sessions. Past days keep the goal they had.</p>
   <div className="muse-daily-presets" role="group" aria-label="Minutes per day">{DAILY_PRESETS.map(n=><button key={n} type="button" className="muse-edge" aria-pressed={customNumber===null&&value===n} onClick={()=>{setValue(n);setCustom('');setProblem('');}}><strong className="type-numeric">{n}</strong><small>min</small></button>)}</div>
   <label className="muse-daily-custom"><span>Or a custom number</span><input type="number" inputMode="numeric" min={1} max={720} step={1} value={custom} placeholder="e.g. 25" onChange={e=>{setCustom(e.target.value);setProblem('');}}/></label>
   {problem&&<p role="alert" className="muse-books-error">{problem}</p>}
   <div className="muse-books-actions"><button type="submit" className="muse-button button-primary" disabled={busy}>{current?'Save goal':'Start this goal'}</button><button type="button" className="muse-button button-ghost" onClick={onClose}>Cancel</button>{onRemove&&<button type="button" className="text-button" disabled={busy} onClick={onRemove}>Remove daily goal</button>}</div>
  </form>
 </MuseModal>;
}
