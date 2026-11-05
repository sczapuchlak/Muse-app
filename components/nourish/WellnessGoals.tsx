"use client";
import {useState,type FormEvent} from "react";
import Link from "next/link";
import {useWellness} from "../WellnessStore";
import {MuseModal} from "../MuseModal";
import {MuseIcon} from "../MuseIcon";
import {weekDates} from "@/lib/dates";
import {goalStatusLabel,creatableGoalMetrics,currentVersion,goalHistory,goalMetricInfo,adherence,newGoal,withVersion,unsupportedGoalMetrics,type GoalMetric,type GoalPeriod,type GoalPeriodResult,type GoalPeriodStatus,type WellnessGoal,type GoalDirection} from "@/lib/wellness-goals";
import {hydrationHistory,wellnessPeriodSummary,wellnessSeries} from "@/lib/wellness-aggregates";
import {movementCategoryLabels} from "@/lib/progress/movement";
import type {ProgressSources} from "@/lib/progress/engine";
import "./WellnessGoals.css";

const statusLabels:Record<GoalPeriodStatus,string>={achieved:"Met","missed":"Below target",unknown:"No complete record","in-progress":"In progress",paused:"Paused",inactive:"Not tracking",upcoming:"Upcoming"};
const label=(status:GoalPeriodStatus,goal?:WellnessGoal)=>goal?goalStatusLabel(status,goalMetricInfo[goal.metric].basis):statusLabels[status];
const number=(value:number)=>new Intl.NumberFormat("en-US",{maximumFractionDigits:1}).format(value);
const periodWord=(period:GoalPeriod)=>period==="week"?"week":"day";
const currentLabel=(period:GoalPeriod)=>period==="week"?"This week":"Today";
const rangeLabel=(result:GoalPeriodResult,period:GoalPeriod)=>{const f=(d:string,o:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat("en-US",{...o,timeZone:"UTC"}).format(new Date(`${d}T12:00:00Z`));return period==="week"?`Week of ${f(result.start,{month:"short",day:"numeric"})}`:f(result.start,{weekday:"short",month:"short",day:"numeric"});};

/** Wellness goals: optional, versioned targets reported against the records Wellness already owns. */
export function WellnessGoals({today,timeZone}:{today:string;timeZone:string}){
 const {state,status,dispatch}=useWellness();
 const [editor,setEditor]=useState<{goal?:WellnessGoal;metric?:GoalMetric;anchor:HTMLElement|null}|null>(null);
 // "today" is unknown until the client clock resolves, so the year follows it until the person picks another.
 const [chosenYear,setYear]=useState<string|null>(null),year=chosenYear??today.slice(0,4);
 if(!status.loaded||!today)return <p role="status" className="small-label">Loading your Wellness records…</p>;
 const sources:ProgressSources={timeZone,wellness:state};
 const goals=state.goals;
 const live=(goals??[]).filter(goal=>currentVersion(goal)?.status!=="inactive"),retired=(goals??[]).filter(goal=>currentVersion(goal)?.status==="inactive");
 const week=wellnessPeriodSummary(state,weekDates(today)[0],"week",today);
 // Start at the first month with any record: earlier months were not tracked, which is not the same as zero.
 const allMonths=wellnessSeries(state,`${year}-01-01`,`${year}-12-31`,"month",today),first=allMonths.findIndex(m=>m.workouts||m.hydration.recordedDays),months=first<0?[]:allMonths.slice(first);
 const hasHistory=state.activities.length>0||state.water.length>0;
 const save=(goal:WellnessGoal)=>dispatch({kind:"goal/save",goal});
 const setStatus=(goal:WellnessGoal,next:"active"|"paused"|"inactive")=>save(withVersion(goal,today,{status:next},new Date().toISOString()));
 return <section className="muse-wellness-goals" aria-label="Wellness goals">
  <div className="muse-goals-head">
   <div><h2>Goals</h2><p className="small-label">Optional targets, measured from what you already log in Wellness and Daily Edit. Paused time never counts against you.</p></div>
   {goals&&<button type="button" className="muse-button button-primary" onClick={event=>setEditor({anchor:event.currentTarget})}><MuseIcon name="plus" size={16}/>Add a goal</button>}
  </div>
  {!goals&&<p className="muse-goals-notice" role="status">Goals, workout categories and durations need the latest database update. Your existing Wellness records are unaffected.</p>}

  <section className="muse-goals-week" aria-label="This week so far">
   <h3>This week so far</h3>
   <dl className="muse-goals-tiles">
    <div><dt>Workouts</dt><dd>{week.workouts}</dd><small>{week.workoutDays} {week.workoutDays===1?"day":"days"}</small></div>
    <div><dt>Strength · Cardio</dt><dd>{week.byCategory.strength} · {week.byCategory.cardio}</dd><small>{week.byCategory.mobility} mobility · {week.byCategory.other} other</small></div>
    <div><dt>Minutes</dt><dd>{number(week.minutes)}</dd><small>{week.sessionsWithoutDuration?`${week.sessionsWithoutDuration} without a time`:"All sessions timed"}</small></div>
    <div><dt>Hydration</dt><dd>{week.hydration.metDays} / {week.hydration.recordedDays}</dd><small>days at your water goal / logged</small></div>
   </dl>
  </section>

  {goals&&<div className="muse-goals-grid">
   <HydrationCard state={state} today={today}/>
   {live.map(goal=><GoalCard key={goal.id} goal={goal} sources={sources} today={today} onEdit={anchor=>setEditor({goal,anchor})} onStatus={next=>setStatus(goal,next)}/>)}
   {!live.length&&<div className="muse-goals-empty"><p>No goals yet. Start with one that fits this season.</p><div>{(["workouts","strength-workouts","workout-minutes","nutrition-protein"] as GoalMetric[]).map(metric=><button key={metric} type="button" className="muse-button button-ghost" onClick={event=>setEditor({metric,anchor:event.currentTarget})}>{goalMetricInfo[metric].label}</button>)}</div></div>}
  </div>}
  {retired.length>0&&<details className="muse-goals-retired"><summary>Retired goals ({retired.length})</summary><div className="muse-goals-grid">{retired.map(goal=><GoalCard key={goal.id} goal={goal} sources={sources} today={today} onEdit={anchor=>setEditor({goal,anchor})} onStatus={next=>setStatus(goal,next)}/>)}</div></details>}

  <section className="muse-goals-year" aria-label={`Wellness by month, ${year}`}>
   <div className="muse-goals-year-head"><h3>By month</h3><nav className="muse-week-jump" aria-label="Year"><button type="button" className="muse-button" aria-label="Previous year" onClick={()=>setYear(String(Number(year)-1))}>‹</button><span className="muse-goals-year-label">{year}</span><button type="button" className="muse-button" aria-label="Next year" disabled={year>=today.slice(0,4)} onClick={()=>setYear(String(Number(year)+1))}>›</button></nav></div>
   {!hasHistory||!months.length?<p className="small-label">{hasHistory?`No movement or water records in ${year}.`:"Once you mark movement done or log water, monthly totals appear here."}</p>:<div className="muse-goals-table-wrap" tabIndex={0} role="region" aria-label="Monthly Wellness totals"><table className="muse-goals-table"><thead><tr><th scope="col">Month</th><th scope="col">Workouts</th><th scope="col">Strength</th><th scope="col">Cardio</th><th scope="col">Minutes</th><th scope="col">Water goal days</th></tr></thead>
    <tbody>{months.map(month=>{const max=Math.max(1,...months.map(m=>m.workouts));const quiet=!month.workouts&&!month.hydration.recordedDays;return <tr key={month.start} data-quiet={quiet||undefined}><th scope="row">{new Intl.DateTimeFormat("en-US",{month:"short",timeZone:"UTC"}).format(new Date(`${month.start}T12:00:00Z`))}</th><td><span className="muse-goals-bar" style={{inlineSize:`${month.workouts/max*100}%`}} aria-hidden="true"/><span className="muse-goals-num">{month.workouts}</span></td><td>{month.byCategory.strength}</td><td>{month.byCategory.cardio}</td><td>{number(month.minutes)}{month.sessionsWithoutDuration>0&&<small> +{month.sessionsWithoutDuration} untimed</small>}</td><td>{month.hydration.recordedDays?`${month.hydration.metDays} of ${month.hydration.recordedDays}`:<span className="small-label">—</span>}</td></tr>;})}</tbody></table></div>}
   <p className="small-label">Weeks start on Monday. Categories: {Object.values(movementCategoryLabels).join(", ")} — set them under Movement → Manage in Daily Edit.</p>
  </section>
  <p className="small-label muse-goals-unsupported">Not tracked yet: {unsupportedGoalMetrics.map(item=>`${item.label} (${item.reason})`).join(" ")}</p>
  {editor&&goals&&<GoalEditor key={editor.goal?.id??editor.metric??"new"} goal={editor.goal} initialMetric={editor.metric} goals={goals} today={today} returnFocus={editor.anchor} onSave={goal=>{save(goal);setEditor(null);}} onClose={()=>setEditor(null)}/>}
 </section>;
}

function Strip({results,period,goal}:{results:GoalPeriodResult[];period:GoalPeriod;goal?:WellnessGoal}){
 return <ol className="muse-goal-strip" aria-label={`Last ${results.length} ${period==="week"?"weeks":"days"}`}>{results.map(result=><li key={result.start} data-status={result.status} title={`${rangeLabel(result,period)} · ${label(result.status,goal)}${result.target!==null?` · ${number(result.value)} of ${number(result.target)} ${result.unit}`:""}`}><span className="sr-only">{rangeLabel(result,period)}: {label(result.status,goal)}</span></li>)}</ol>;
}

function GoalCard({goal,sources,today,onEdit,onStatus}:{goal:WellnessGoal;sources:ProgressSources;today:string;onEdit:(anchor:HTMLElement)=>void;onStatus:(status:"active"|"paused"|"inactive")=>void}){
 const info=goalMetricInfo[goal.metric],version=currentVersion(goal),{results,issue}=goalHistory(goal,sources,today,goal.period==="week"?12:14);
 const current=results.at(-1),summary=adherence(results.slice(0,-1));
 const pct=current?.target?Math.min(100,current.value/current.target*100):0;
 return <article className="muse-goal-card" data-status={current?.status}>
  <header><div><p className="small-label">{info.label} · per {periodWord(goal.period)}</p><h3>{version?.direction==="atMost"?"At most":"At least"} {number(version?.target??0)} {version?.unit}</h3></div><span className="muse-goal-chip" data-status={current?.status}>{current?label(current.status,goal):""}</span></header>
  {current&&current.status!=="paused"&&current.status!=="inactive"&&<div className="muse-goal-progress"><div className="muse-goal-meter" role="meter" aria-valuemin={0} aria-valuemax={current.target??0} aria-valuenow={current.value} aria-label={`${currentLabel(goal.period)}: ${number(current.value)} of ${number(current.target??0)} ${current.unit}`}><span style={{inlineSize:`${pct}%`}}/></div><p className="small-label">{currentLabel(goal.period)}: {number(current.value)} of {number(current.target??0)} {current.unit}{current.incompleteDays>0?` · ${current.incompleteDays} ${current.incompleteDays===1?"day is":"days are"} missing details`:""}</p></div>}
  <Strip results={results} period={goal.period} goal={goal}/>
  <p className="small-label">{summary.rate===null?"Not enough finished periods to summarize yet.":info.basis==="planned"?`From planned meals, not confirmed intake. The plan met the target on ${summary.achieved} of ${summary.achieved+summary.missed} finished days`:`Met ${summary.achieved} of ${summary.achieved+summary.missed} finished ${goal.period==="week"?"weeks":"days"} with a record`}{summary.unknown?` · ${summary.unknown} without a complete record`:""}{summary.paused?` · ${summary.paused} paused`:""}.</p>
  {issue&&<p className="small-label" role="status">{issue}</p>}
  <footer><button type="button" className="text-button" onClick={event=>onEdit(event.currentTarget)}>Edit target</button>{version?.status==="active"&&<button type="button" className="text-button" onClick={()=>onStatus("paused")}>Pause</button>}{version?.status==="paused"&&<button type="button" className="text-button" onClick={()=>onStatus("active")}>Resume</button>}{version?.status!=="inactive"?<button type="button" className="text-button" onClick={()=>onStatus("inactive")}>Retire</button>:<button type="button" className="text-button" onClick={()=>onStatus("active")}>Restore</button>}</footer>
 </article>;
}

function HydrationCard({state,today}:{state:Parameters<typeof hydrationHistory>[0]&{waterSettings:{goal:number;unit:string}|null};today:string}){
 if(!state.waterSettings&&!state.water.length)return null;
 const results=hydrationHistory(state,today,14),current=results.at(-1)!,summary=adherence(results.slice(0,-1));
 const target=current.target??state.waterSettings?.goal??0,unit=current.target!==null?current.unit:state.waterSettings?.unit??"oz";
 return <article className="muse-goal-card muse-goal-card-hydration" data-status={current.status}>
  <header><div><p className="small-label">Hydration · per day · from your water tracker</p><h3>At least {number(target)} {unit}</h3></div><span className="muse-goal-chip" data-status={current.status}>{statusLabels[current.status]}</span></header>
  <div className="muse-goal-progress"><div className="muse-goal-meter" role="meter" aria-valuemin={0} aria-valuemax={target} aria-valuenow={current.value} aria-label={`Today: ${number(current.value)} of ${number(target)} ${unit}`}><span style={{inlineSize:`${target?Math.min(100,current.value/target*100):0}%`}}/></div><p className="small-label">Today: {number(current.value)} of {number(target)} {unit}</p></div>
  <Strip results={results} period="day"/>
  <p className="small-label">{summary.rate===null?"Log water on a few days to see your rhythm.":`Met ${summary.achieved} of ${summary.achieved+summary.missed} logged days`}{summary.unknown?` · ${summary.unknown} days not logged`:""}. Each day keeps the goal you had that day.</p>
  <footer><Link className="text-button" href={`/?date=${today}`}>Change in Daily Edit → Water</Link></footer>
 </article>;
}

function GoalEditor({goal,initialMetric,goals,today,returnFocus,onSave,onClose}:{goal?:WellnessGoal;initialMetric?:GoalMetric;goals:WellnessGoal[];today:string;returnFocus:HTMLElement|null;onSave:(goal:WellnessGoal)=>void;onClose:()=>void}){
 const version=goal?currentVersion(goal):undefined;
 const [metric,setMetric]=useState<GoalMetric>(goal?.metric??initialMetric??"workouts");
 const [period,setPeriod]=useState<GoalPeriod>(goal?.period??goalMetricInfo[initialMetric??"workouts"].periods[0]);
 const [target,setTarget]=useState(String(version?.target??goalMetricInfo[initialMetric??"workouts"].example));
 const [direction,setDirection]=useState<GoalDirection>(version?.direction??goalMetricInfo[metric].direction);
 const [error,setError]=useState("");
 const info=goalMetricInfo[metric],duplicate=!goal&&goals.some(item=>item.metric===metric&&item.period===period);
 const value=Number(target),valid=Number.isFinite(value)&&value>0&&value<=1000000&&(info.unit!=="sessions"||Number.isInteger(value));
 function submit(event:FormEvent){event.preventDefault();if(!valid||duplicate)return;const now=new Date().toISOString();try{onSave(goal?withVersion(goal,today,{target:value,direction},now):newGoal(metric,period,value,info.unit,today,now,crypto.randomUUID(),direction));}catch(e){setError(e instanceof Error?e.message:"That goal could not be saved.");}}
 const effective=period==="week"?`this week (from Monday, ${new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",timeZone:"UTC"}).format(new Date(`${weekDates(today)[0]}T12:00:00Z`))})`:"today";
 return <MuseModal id="wellness-goal-editor" label={goal?"Edit goal":"Add a goal"} title={goal?`Edit ${info.label.toLowerCase()} goal`:"Add a goal"} returnFocus={returnFocus} onClose={onClose}>
  <form className="muse-goal-form" onSubmit={submit}>
   <label className="editor-label">Measure<select value={metric} disabled={!!goal} onChange={event=>{const next=event.target.value as GoalMetric;setMetric(next);setPeriod(goalMetricInfo[next].periods[0]);setTarget(String(goalMetricInfo[next].example));setDirection(goalMetricInfo[next].direction);}}>{creatableGoalMetrics.map(item=><option key={item} value={item}>{goalMetricInfo[item].label}</option>)}</select></label>
   <p className="small-label">{info.describe}.</p>
   {info.periods.length>1&&<fieldset disabled={!!goal}><legend>Period</legend><div className="muse-form-choice-list">{info.periods.map(item=><button key={item} type="button" className="choice-button" aria-pressed={period===item} onClick={()=>setPeriod(item)}>Per {item}</button>)}</div></fieldset>}
   {metric.startsWith("nutrition-")&&<fieldset><legend>Direction</legend><div className="muse-form-choice-list"><button type="button" className="choice-button" aria-pressed={direction==="atLeast"} onClick={()=>setDirection("atLeast")}>At least</button><button type="button" className="choice-button" aria-pressed={direction==="atMost"} onClick={()=>setDirection("atMost")}>At most</button></div></fieldset>}
   <label className="editor-label">Target<span className="muse-goal-target"><input data-autofocus type="number" required min={info.unit==="sessions"?1:0.1} step={info.unit==="sessions"?1:"any"} value={target} onChange={event=>setTarget(event.target.value)}/><span>{info.unit} per {period}</span></span></label>
   {metric.startsWith("nutrition-")&&<p className="small-label">Measured from the nutrition on meals in your plan — planned, not confirmed intake. Results read as “Plan meets target”. A day with any meal missing this value stays unknown.</p>}
   {duplicate&&<p role="alert" className="small-label">You already have this goal. Edit it instead so its history stays together.</p>}
   {error&&<p role="alert" className="small-label">{error}</p>}
   <p className="small-label">{goal?`Changes apply from ${effective}. Earlier ${period==="week"?"weeks":"days"} keep the target they had.`:`Starts ${effective}.`}</p>
   <div className="editor-actions"><button type="submit" className="muse-button button-primary" disabled={!valid||duplicate}>{goal?"Save target":"Add goal"}</button><button type="button" className="text-button" onClick={onClose}>Cancel</button></div>
  </form>
 </MuseModal>;
}
