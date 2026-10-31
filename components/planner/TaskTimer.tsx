"use client";
import { useEffect,useId,useRef,useState } from "react";
import type { PlannedTask } from "@/lib/models";
import { runningMinutes } from "@/lib/planner";
import { usePlanner } from "../PlannerStore";
import { MuseIcon } from "../MuseIcon";
/** Inline disclosure only; the existing Planner store owns the one running timer. */
export function TaskTimer({task}:{task:PlannedTask}) {
 const {state,dispatch}=usePlanner(),[open,setOpen]=useState(false),[now,setNow]=useState(()=>new Date().toISOString()),anchor=useRef<HTMLButtonElement>(null),id=useId(),running=state.activeTimer?.taskId===task.id;
 useEffect(()=>{if(!running)return;const timer=setInterval(()=>setNow(new Date().toISOString()),1000);return()=>clearInterval(timer);},[running]);
 const seconds=Math.floor((task.actualMinutes+runningMinutes(state,task.id,now))*60),time=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
 return <><button ref={anchor} type="button" className="muse-task-inline-timer muse-edge" data-running={running} aria-label={`Timer for ${task.title}, ${time} elapsed${running?', running':''}`} aria-expanded={open} aria-controls={id} onClick={()=>setOpen((value)=>!value)}><MuseIcon name="timer" size={14}/><span>{time}</span></button>{open&&<section id={id} className="muse-task-timer-panel" aria-label={`Timing for ${task.title}`} data-no-drag><dl><div><dt>Tracked time</dt><dd><output>{time}</output></dd></div><div><dt>Estimated duration</dt><dd>{task.estimatedMinutes===undefined?'Not set':`${task.estimatedMinutes}m`}</dd></div></dl><div className="muse-task-timer-actions"><button type="button" className="muse-button" disabled={task.complete} onClick={()=>dispatch(running?{type:'timer/pause',now:new Date().toISOString()}:{type:'timer/start',id:task.id,now:new Date().toISOString()})}>{running?'Pause':seconds?'Resume':'Start'}</button>{running&&<button type="button" className="text-button" onClick={()=>dispatch({type:'timer/pause',now:new Date().toISOString()})}>Stop</button>}<button type="button" className="text-button" onClick={()=>{setOpen(false);anchor.current?.focus();}}>Close timer</button></div></section>}</>;
}
