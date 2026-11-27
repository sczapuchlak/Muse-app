'use client';
import {useState} from 'react';
import {MuseModal} from '@/components/MuseModal';
import {MuseIcon} from '@/components/MuseIcon';
import {shiftPeriod,periodLabel,planCount as countPlan} from '@/lib/books/reading-plans';
import {useReadingPlans} from '@/lib/books/use-reading-plans';
import {goalIdeas,type GoalIdea} from '@/lib/whimsy/reading-goals';
import type {GoalView} from './BooksHome';
import {monthLong} from './BooksHome';
import './Goals.css';

export type GoalDraft={timeframe:GoalView;period:string;target:number;every:boolean};
const LIMITS:Record<GoalView,[number,number]>={year:[1,1000],month:[1,100],daily:[1,720]};
const UNIT:Record<GoalView,[string,string]>={year:['book','books'],month:['book','books'],daily:['minute','minutes']};

/**
 * New goal (and Edit): start from an idea ("you can edit these") or build your own: a timeframe, then one number.
 * Year → the annual Reading Challenge, Month → a monthly books goal (this month or every month), Today → the daily
 * minutes goal. All three are the existing goal records; nothing here is a copy.
 */
export function NewGoalSheet({today,initial,busy,onSave,onRemove,onClose}:{today:string;
 /** Editing (or a chosen timeframe): skips the ideas. */ initial?:Partial<GoalDraft>&{timeframe:GoalView};busy:boolean;
 onSave:(draft:GoalDraft)=>void;onRemove?:()=>void;onClose:()=>void}){
 const year=today.slice(0,4),month=today.slice(0,7),plans=useReadingPlans(),planCount=countPlan(plans.entries,'month',month);
 const start=(timeframe:GoalView,idea?:GoalIdea):GoalDraft=>({timeframe,period:timeframe==='year'?year:timeframe==='month'?month:today,target:idea?.target??(timeframe==='year'?24:timeframe==='month'?Math.max(planCount,2):20),every:idea?.every??false});
 const [draft,setDraft]=useState<GoalDraft|null>(initial?{...start(initial.timeframe),...initial}:null),[problem,setProblem]=useState('');
 const editing=!!initial?.target;
 function save(){if(!draft)return;const [lo,hi]=LIMITS[draft.timeframe];if(!Number.isInteger(draft.target)||draft.target<lo||draft.target>hi){setProblem(`Choose a whole number from ${lo} to ${hi}.`);return;}onSave(draft);}
 const ideas=goalIdeas(today,planCount);
 return <MuseModal id="books-new-goal" label={editing?'Edit goal':'New goal'} title={editing?'Edit goal':'New goal'} returnFocus={null} onClose={onClose}>
  <div className="muse-goal-sheet">
   {!draft?<>
    <section aria-labelledby="goal-ideas"><h4 id="goal-ideas" className="muse-goal-sheet-h">Start from an idea</h4><p className="muse-goal-sheet-sub">You can edit these</p>
     <ul className="muse-goal-ideas">{ideas.map(idea=><li key={idea.id}><button type="button" onClick={()=>setDraft(start(idea.timeframe,idea))}><strong>{idea.title}</strong><span>{idea.detail}</span></button></li>)}</ul></section>
    <p className="muse-goal-sheet-or">Or…</p>
    <section aria-labelledby="goal-own"><h4 id="goal-own" className="muse-goal-sheet-h">Build your own goal</h4><p className="muse-goal-sheet-sub">What timeframe?</p>
     <div className="muse-goal-timeframes">{(['year','month','daily'] as GoalView[]).map(t=><button key={t} type="button" className="muse-edge" onClick={()=>setDraft(start(t))}>{t==='year'?'Year':t==='month'?'Month':'Every day'}</button>)}</div></section>
   </>:<form className="muse-goal-form" noValidate onSubmit={e=>{e.preventDefault();save();}}>
    {!editing&&<div className="muse-segmented" role="group" aria-label="Timeframe">{(['year','month','daily'] as GoalView[]).map(t=><button key={t} type="button" className="muse-edge" aria-pressed={draft.timeframe===t} onClick={()=>{setDraft({...start(t),target:draft.timeframe===t?draft.target:start(t).target});setProblem('');}}>{t==='year'?'Year':t==='month'?'Month':'Every day'}</button>)}</div>}
    {draft.timeframe!=='daily'&&<div className="muse-goal-period"><button type="button" className="muse-button button-ghost" aria-label={`Previous ${draft.timeframe}`} disabled={editing||(draft.timeframe==='year'?draft.period<=year:draft.period<=month)} onClick={()=>setDraft({...draft,period:shiftPeriod(draft.timeframe as 'year'|'month',draft.period,-1)})}>‹</button>
     <strong className="muse-rainbow-year">{draft.timeframe==='year'?draft.period:periodLabel('month',draft.period)}</strong>
     <button type="button" className="muse-button button-ghost" aria-label={`Next ${draft.timeframe}`} disabled={editing} onClick={()=>setDraft({...draft,period:shiftPeriod(draft.timeframe as 'year'|'month',draft.period,1)})}>›</button></div>}
    <div className="muse-goal-number"><button type="button" className="muse-button button-ghost" aria-label="Fewer" onClick={()=>{setDraft({...draft,target:Math.max(LIMITS[draft.timeframe][0],draft.target-(draft.timeframe==='daily'?5:1))});setProblem('');}}><MuseIcon name="minus" size={16}/></button>
     <label><span className="sr-only">Target</span><input type="number" inputMode="numeric" min={LIMITS[draft.timeframe][0]} max={LIMITS[draft.timeframe][1]} value={Number.isNaN(draft.target)?'':draft.target} onChange={e=>{setDraft({...draft,target:e.target.value===''?Number.NaN:Number(e.target.value)});setProblem('');}}/></label>
     <button type="button" className="muse-button button-ghost" aria-label="More" onClick={()=>{setDraft({...draft,target:Math.min(LIMITS[draft.timeframe][1],(Number.isNaN(draft.target)?0:draft.target)+(draft.timeframe==='daily'?5:1))});setProblem('');}}><MuseIcon name="plus" size={16}/></button>
     <span className="muse-goal-unit">{draft.target===1?UNIT[draft.timeframe][0]:UNIT[draft.timeframe][1]}{draft.timeframe==='daily'?' a day':draft.timeframe==='year'?` in ${draft.period}`:draft.every?' every month':` in ${monthLong(draft.period)}`}</span></div>
    {draft.timeframe==='month'&&<div className="muse-goal-every" role="group" aria-label="Which months"><button type="button" className="muse-edge" aria-pressed={!draft.every} onClick={()=>setDraft({...draft,every:false})}>Just {monthLong(draft.period)}</button><button type="button" className="muse-edge" aria-pressed={draft.every} onClick={()=>setDraft({...draft,every:true})}>Every month from {monthLong(draft.period)}</button></div>}
    <p className="muse-goal-hint">{draft.timeframe==='year'?'Every finished read counts, rereads included, in the year you finish it.':draft.timeframe==='month'?'Every read you finish that month counts. A month without a goal uses its Reading Plan as the goal.':'Time comes from your saved reading sessions. Past days keep the goal they had.'}</p>
    {problem&&<p role="alert" className="muse-books-error">{problem}</p>}
    <div className="muse-books-actions"><button type="submit" className="muse-button button-primary" disabled={busy}>{editing?'Save goal':'Start this goal'}</button>
     {!initial&&<button type="button" className="muse-button button-ghost" onClick={()=>{setDraft(null);setProblem('');}}>Back to ideas</button>}
     {onRemove&&<button type="button" className="text-button" disabled={busy} onClick={onRemove}>Remove goal</button>}</div>
   </form>}
  </div>
 </MuseModal>;
}
