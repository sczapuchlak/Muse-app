'use client';
/* eslint-disable @next/next/no-img-element -- covers come from book services; next/image would proxy them. */
import {useState,type CSSProperties} from 'react';
import './ReadingChallengeCompact.css';
import type {Book,ReadingGoal} from '@/lib/whimsy/models';
import {challengeFor,challengeProgress,challengeYears,type ChallengeProgress} from '@/lib/whimsy/reading-challenge';
import {MuseIcon} from '../../MuseIcon';
import {MuseStar} from '../../MuseStar';

const plural=(n:number,one:string,many=`${one}s`)=>`${n} ${n===1?one:many}`;
/** Encouraging, never judgmental. */
function paceLine(p:ChallengeProgress){
 if(p.reached)return p.done>p.target?`Goal reached, and ${plural(p.done-p.target,'bonus read')} on top.`:'Goal reached. Every one of them counted.';
 if(!p.pace)return p.done?`${plural(p.remaining,'book')} to go.`:'Your first finish will start the shelf.';
 const gap=Math.round(Math.abs(p.pace.difference));
 return p.pace.status==='on-pace'?'Right on pace for the year.':p.pace.status==='ahead'?`About ${plural(Math.max(1,gap),'book')} ahead of an even pace.`:`An even pace would be about ${plural(Math.max(1,gap),'book')} further, plenty of year left to wander.`;
}

function Ring({percent,reached}:{percent:number;reached:boolean}){
 const r=34,c=2*Math.PI*r;
 return <svg className="muse-challenge-ring" viewBox="0 0 80 80" aria-hidden="true" data-reached={reached||undefined}><circle cx="40" cy="40" r={r} className="track"/><circle cx="40" cy="40" r={r} className="fill" style={{strokeDasharray:c,strokeDashoffset:c*(1-percent/100)} as CSSProperties}/></svg>;
}

export function ChallengeEditor({year,goal,onSave,onRemove,onCancel,busy}:{year:string;goal:ReadingGoal|null;onSave:(year:string,target:number)=>void;onRemove?:()=>void;onCancel:()=>void;busy:boolean}){
 const [target,setTarget]=useState(String(goal?.target??12));const n=Number(target);
 return <form className="muse-challenge-editor" onSubmit={e=>{e.preventDefault();if(n>=1&&n<=1000)onSave(year,Math.round(n));}}>
  <label>Books to finish in {year}<input type="number" min={1} max={1000} required value={target} onChange={e=>setTarget(e.target.value)}/></label>
  <p className="small-label">Every finished read counts, rereads included, in the year you finish it.</p>
  <div className="muse-books-actions"><button className="muse-button button-primary" type="submit" disabled={busy||!(n>=1)}>{goal?'Save challenge':'Start the challenge'}</button>
   {goal&&onRemove&&<button type="button" className="text-button" onClick={onRemove} disabled={busy}>Remove challenge</button>}<button type="button" className="text-button" onClick={onCancel}>Cancel</button></div>
 </form>;
}

/**
 * The Reading Challenge, compact (Bookshelf) or full (Reading Atlas). Both read the same goal record and the same
 * finished reads, so they always agree.
 */
export function ReadingChallenge({books,goals,today,variant,onSave,onRemove,onOpenAtlas,onOpenBook,busy=false}:{books:Book[];goals:ReadingGoal[];today:string;variant:'compact'|'full';
 onSave:(year:string,target:number,existing:ReadingGoal|null)=>void;onRemove:(goal:ReadingGoal)=>void;onOpenAtlas?:()=>void;onOpenBook?:(bookId:string)=>void;busy?:boolean}){
 const [year,setYear]=useState(today.slice(0,4));const [editing,setEditing]=useState(false);
 const goal=challengeFor(goals,year);const p=goal?challengeProgress(goal,books,year,today):null;
 const years=challengeYears(goals,books,today);
 const head=<div className="muse-books-panel-head"><div className="muse-challenge-title"><strong className="muse-rainbow-year" data-big>{year}</strong><span className="small-label">READING CHALLENGE</span></div>
  {variant==='full'&&<div className="muse-books-actions">{years.length>1&&<label className="sr-only" htmlFor="challenge-year">Year</label>}
   <select id="challenge-year" className="muse-challenge-year" value={year} onChange={e=>{setYear(e.target.value);setEditing(false);}}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
   {!editing&&<button type="button" className="muse-button button-ghost" onClick={()=>setEditing(true)}>{goal?'Edit':'+ Set a challenge'}</button>}</div>}</div>;
 const editor=editing&&<ChallengeEditor year={year} goal={goal&&!goal.recurs?goal:null} busy={busy} onCancel={()=>setEditing(false)}
  onSave={(y,t)=>{onSave(y,t,goal&&!goal.recurs?goal:null);setEditing(false);}} onRemove={goal&&!goal.recurs?()=>{onRemove(goal);setEditing(false);}:undefined}/>;
 if(variant==='compact')return <ChallengeCompact year={year} progress={p} editing={editing} setEditing={setEditing} editor={editor} onOpenAtlas={onOpenAtlas} onOpenBook={onOpenBook}/>;
 if(!p)return <article className={`muse-books-panel muse-challenge muse-challenge-${variant}`}>{head}
  {editor||<p className="muse-challenge-empty">{year<today.slice(0,4)?'No challenge was set for this year. Your finished reads still live in the Atlas.':'Choose how many books you’d like to finish this year. It’s an invitation, not an obligation.'}</p>}</article>;
 const slots=Math.min(Math.max(p.target,p.done),60);
 return <article className={`muse-books-panel muse-challenge muse-challenge-${variant}`} data-reached={p.reached||undefined}>{head}
  <div className="muse-challenge-summary">
   <div className="muse-challenge-dial"><Ring percent={p.percent} reached={p.reached}/><span><strong>{p.done}</strong><small>of {p.target}</small></span></div>
   <div className="muse-challenge-words"><p className="muse-challenge-headline">{p.reached?<><MuseStar size={14}/> Challenge complete</>:`${p.percent}% of your goal`}</p>
    <p>{paceLine(p)}</p>
    {!p.reached&&<p className="small-label">{plural(p.remaining,'book')} remaining{goal?.recurs?' · from your yearly goal':''}</p>}</div>
  </div>
  {editor}
  {variant==='full'&&<ol className="muse-challenge-shelf" aria-label={`${p.done} finished reads of ${p.target}`}>
   {Array.from({length:slots},(_,i)=>{const r=p.reads[i];
    return <li key={r?r.readId:`slot-${i}`} data-empty={!r||undefined}>{r?<button type="button" onClick={()=>onOpenBook?.(r.bookId)} title={`${r.title}${r.reread?' (reread)':''} · finished ${r.finishedOn}`} aria-label={`${i+1}. ${r.title}${r.reread?', reread':''}, finished ${r.finishedOn}`}>
     {r.coverUrl?<img src={r.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<span className="muse-challenge-blank">{r.title}</span>}{r.reread&&<span className="muse-challenge-reread" aria-hidden="true"><MuseIcon name="undo" size={11}/></span>}</button>
     :<span aria-label={`Book ${i+1}, still to come`}>{i+1}</span>}</li>;})}
   {p.done>60&&<li className="muse-challenge-more">+{p.done-60}</li>}
  </ol>}
 </article>;
}

const PER_VIEW=6;
/** The Books page's challenge: your count, and the shelf six books at a time. Everything else lives in the Atlas. */
function ChallengeCompact({year,progress:p,editing,setEditing,editor,onOpenAtlas,onOpenBook}:{year:string;progress:ChallengeProgress|null;editing:boolean;setEditing:(v:boolean)=>void;editor:React.ReactNode;onOpenAtlas?:()=>void;onOpenBook?:(id:string)=>void}){
 const [view,setView]=useState(0);
 if(!p)return <article className="muse-books-panel muse-challenge muse-challenge-compact muse-desk-goal">
  <div className="muse-desk-goal-head"><div className="muse-challenge-title"><strong className="muse-rainbow-year" data-big>{year}</strong><span className="small-label">READING CHALLENGE</span></div>{!editing&&<button type="button" className="muse-button button-primary" onClick={()=>setEditing(true)}>Set a goal</button>}</div>
  {editor||<p className="muse-desk-goal-empty">How many books would you like to finish this year? Your finished books will line up here.</p>}</article>;
 const slots=Math.max(p.target,p.done),pages=Math.ceil(slots/PER_VIEW),current=Math.min(view,pages-1),first=current*PER_VIEW;
 return <article className="muse-books-panel muse-challenge muse-challenge-compact muse-desk-goal" data-reached={p.reached||undefined}>
  <div className="muse-desk-goal-head"><div><span className="small-label">READING CHALLENGE · <b className="muse-rainbow-year">{year}</b></span><h4><strong className="type-numeric">{p.done}</strong> <span>of {p.target} books</span></h4></div>
   <div className="muse-desk-goal-actions">{pages>1&&<><span className="small-label type-numeric">{first+1}–{Math.min(slots,first+PER_VIEW)}</span><button type="button" className="muse-button button-ghost" aria-label="Earlier books" disabled={current===0} onClick={()=>setView(current-1)}><MuseIcon name="chevron" size={15}/></button><button type="button" className="muse-button button-ghost" aria-label="Later books" disabled={current>=pages-1} onClick={()=>setView(current+1)}><MuseIcon name="chevron" size={15}/></button></>}
    <button type="button" className="muse-button button-ghost muse-desk-goal-edit" aria-label="Edit challenge" onClick={()=>setEditing(true)}><MuseIcon name="edit" size={15}/></button></div></div>
  <span className="muse-desk-goal-bar" style={{'--fill':`${Math.max(p.percent,p.percent?3:0)}%`} as CSSProperties} role="meter" aria-label={`${p.done} of ${p.target} books`} aria-valuemin={0} aria-valuemax={p.target} aria-valuenow={p.done}><span/></span>
  {editor}
  <ol className="muse-desk-goal-shelf" aria-label={`Books ${first+1} to ${Math.min(slots,first+PER_VIEW)} of ${slots}`}>
   {Array.from({length:Math.min(PER_VIEW,slots-first)},(_,k)=>{const i=first+k,r=p.reads[i];return <li key={r?r.readId:`slot-${i}`} data-empty={!r||undefined}>{r?<button type="button" onClick={()=>onOpenBook?.(r.bookId)} title={`${r.title} · finished ${r.finishedOn}`} aria-label={`${i+1}. ${r.title}, finished ${r.finishedOn}`}>{r.coverUrl?<img src={r.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer"/>:<span className="muse-challenge-blank">{r.title}</span>}</button>:<span aria-label={`Book ${i+1}, still to come`}>{i+1}</span>}</li>;})}
  </ol>
  {onOpenAtlas&&<button type="button" className="text-button muse-desk-goal-more" onClick={onOpenAtlas}>{p.reached?'Goal reached ✦ ':''}All finished books in the Atlas ›</button>}
 </article>;
}
