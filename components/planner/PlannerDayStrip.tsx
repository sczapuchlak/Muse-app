"use client";
import {useEffect,useState,type CSSProperties} from "react";
import {projectEvents,projectTasks} from "@/lib/planner-occurrences";
import {usePlanner} from "../PlannerStore";
import "./PlannerDayStrip.css";

/**
 * Planner glow-up (Nov 2026): one compact, equal-height strip above the board for the focused day. An editorial
 * masthead with the day's task progress, the schedule as an hour ribbon (events as pins, a live "now" line on today),
 * and what comes next. It reads existing tasks and events only; the board below keeps its structural height.
 */
const fmt=(d:string,o:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat("en-US",{...o,timeZone:"UTC"}).format(new Date(`${d}T12:00:00Z`));
const ordinal=(n:number)=>`${n}${n%100>=11&&n%100<=13?"th":({1:"st",2:"nd",3:"rd"} as Record<number,string>)[n%10]??"th"}`;
const minutes=(hhmm?:string|null)=>{const m=/^(\d{1,2}):(\d{2})/.exec(hhmm??"");return m?Number(m[1])*60+Number(m[2]):null;};

export function PlannerDayStrip({date,today}:{date:string;today:string}){
 const {state}=usePlanner();
 const [now,setNow]=useState<number|null>(null);
 useEffect(()=>{const tick=()=>{const d=new Date();setNow(d.getHours()*60+d.getMinutes());};tick();const id=window.setInterval(tick,60000);return()=>window.clearInterval(id);},[]);
 const tasks=projectTasks(state.tasks,state.occurrences,date,date).filter(task=>task.plannedDate===date),done=tasks.filter(task=>task.complete).length;
 const events=projectEvents(state.events,state.eventExceptions,date,date).filter(event=>event.date===date&&event.status!=="canceled").map(event=>({event,start:event.allDay?null:minutes(event.dateTime.slice(11)),end:event.allDay?null:minutes(event.endTime)})).sort((a,b)=>(a.start??-1)-(b.start??-1));
 const timed=events.filter(e=>e.start!==null),from=Math.min(7*60,...timed.map(e=>Math.floor(e.start!/60)*60)),to=Math.max(22*60,...timed.map(e=>Math.ceil(((e.end??e.start!+60))/60)*60)),span=to-from;
 const isToday=date===today,nowIn=isToday&&now!==null&&now>=from&&now<=to;
 const next=timed.find(e=>!isToday||now===null||(e.end??e.start!+60)>now)??events.find(e=>e.start===null);
 const headline=!tasks.length?"A clear day":done===tasks.length?"Every task done":done===0?"Fresh page":"In motion";
 const hours=Array.from({length:Math.floor(span/180)+1},(_,i)=>from+i*180);
 return <section className="muse-planner-daystrip" aria-label={`${isToday?"Today":fmt(date,{weekday:"long",month:"long",day:"numeric"})}: ${done} of ${tasks.length} tasks done, ${events.length} scheduled`}>
  <div className="muse-daystrip-masthead">
   <p className="muse-kicker">{isToday?"Today":fmt(date,{weekday:"long"})}</p>
   <h2><span>{fmt(date,{weekday:"long"})},</span> the {ordinal(Number(date.slice(8)))}</h2>
   <p className="muse-daystrip-progress"><b>{done}</b><small>/{tasks.length}</small><span>{headline}</span></p>
   <span className="muse-daystrip-bar" style={{"--f":tasks.length?done/tasks.length:0} as CSSProperties} aria-hidden="true"/>
  </div>
  <div className="muse-daystrip-ribbon" aria-label="Schedule">
   <div className="muse-daystrip-track">
    {hours.map(h=><span key={h} className="muse-daystrip-hour" style={{"--x":(h-from)/span} as CSSProperties}>{new Intl.DateTimeFormat("en-US",{hour:"numeric",timeZone:"UTC"}).format(new Date(Date.UTC(2026,0,1,h/60)))}</span>)}
    {timed.map(({event,start,end},i)=><span key={event.id} className="muse-daystrip-event" data-past={isToday&&now!==null&&(end??start!+60)<=now||undefined} style={{"--x":(start!-from)/span,"--w":Math.max(.025,((end??start!+60)-start!)/span),"--row":i%2} as CSSProperties} title={`${event.time} · ${event.title}`}><i/><span>{event.title}</span></span>)}
    {nowIn&&<span className="muse-daystrip-now" style={{"--x":(now!-from)/span} as CSSProperties} aria-label="Now"/>}
   </div>
   {!events.length&&<p className="muse-daystrip-empty">Nothing on the calendar. The day is yours to shape.</p>}
   {events.some(e=>e.start===null)&&<p className="muse-daystrip-allday">{events.filter(e=>e.start===null).map(e=>e.event.title).join(" · ")} <small>all day</small></p>}
  </div>
  <div className="muse-daystrip-next">
   <p className="muse-kicker">{next?"Next up":"Schedule"}</p>
   {next?<><strong>{next.event.title}</strong><span className="muse-daystrip-time">{next.start===null?"All day":next.event.time}{next.event.location&&<> · {next.event.location}</>}</span>{isToday&&now!==null&&next.start!==null&&next.start>now&&<small>in {next.start-now>=60?`${Math.floor((next.start-now)/60)} h ${(next.start-now)%60} min`:`${next.start-now} min`}</small>}</>:<><strong>All clear</strong><small>{events.length?"Everything on the calendar has passed.":"No events today."}</small></>}
  </div>
 </section>;
}
