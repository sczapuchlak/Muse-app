'use client';
import type {CSSProperties,ReactNode} from 'react';
import {MuseIcon} from '@/components/MuseIcon';
import {AchievementBadge} from '@/components/AchievementStar';
import './ReadingSessionCard.css';

export type SessionPhase='running'|'paused'|'finishing'|'saving';
const phaseLabel:Record<SessionPhase,string>={running:'Reading now',paused:'Paused',finishing:'Session check-in',saving:'Saving your session'};

/**
 * The reading timer (#135). One presentation for the Reading Desk and Book Detail, in the same liquid language as
 * the Daily Edit water bar: a big serif clock over a glassy pill that fills toward the sitting's target (or flows
 * gently for an open sitting), a ripple at the fill edge, and a finish star when the target is met. It only presents
 * the shared timer; every action goes through the existing write paths.
 */
export function ReadingSessionCard({phase,label,overtime,elapsed,targetMinutes,title,cover,busy,unsynced,onToggle,onFinish,onDiscard,onOpenBook,children,variant='panel'}:{phase:SessionPhase;label:string;overtime:boolean;elapsed:number;targetMinutes?:number;title?:string;cover?:ReactNode;busy:boolean;unsynced?:ReactNode;onToggle:()=>void;onFinish:()=>void;onDiscard:()=>void;onOpenBook?:()=>void;children?:ReactNode;variant?:'panel'|'desk'}){
 const target=targetMinutes?targetMinutes*60:0,fill=target?Math.min(1,Math.max(0,elapsed/target)):0,percent=Math.round(fill*100),controls=phase==='running'||phase==='paused';
 const minutes=Math.floor(elapsed/60),spoken=`${minutes} ${minutes===1?'minute':'minutes'} of active reading${targetMinutes?`, ${overtime?'past':'toward'} a ${targetMinutes}-minute sitting`:''}`;
 return <section className="muse-session" data-phase={phase} data-variant={variant} data-overtime={overtime||undefined} data-target={target?'yes':'open'} aria-label="Reading session">
  <span className="muse-session-glow" aria-hidden="true"/>
  {(cover||title)&&<header className="muse-session-book">{cover&&<span className="muse-session-cover" aria-hidden="true">{cover}</span>}{title&&<div><span className="small-label">Reading</span>{onOpenBook?<button type="button" className="muse-session-title" onClick={onOpenBook}>{title}</button>:<strong className="muse-session-title">{title}</strong>}</div>}</header>}
  <div className="muse-session-stage">
   <span className="muse-session-state"><span className="muse-session-dot" aria-hidden="true"/>{unsynced?'Not synced yet':phaseLabel[phase]}</span>
   <strong className="muse-session-clock type-numeric" role="timer" aria-label={spoken}>{label}</strong>
   <span className="muse-session-note">{targetMinutes?`${overtime?'Past':'Toward'} your ${targetMinutes}-minute sitting`:'Open sitting · no timer to beat'}</span>
   <div className="muse-session-pool" style={{'--session-fill':`${target?Math.max(percent,5):100}%`} as CSSProperties} {...(target?{role:'progressbar','aria-label':'Progress toward your sitting','aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':percent,'aria-valuetext':`${percent}% of ${targetMinutes} minutes${overtime?', target reached':''}`}:{'aria-hidden':true})}>
    <div className="muse-session-bar"><span className="muse-session-liquid"/></div>
    {target?<span className="muse-session-edge" aria-hidden="true"><i/><i/><i/></span>:null}
    {target?<span className="muse-session-finish" aria-hidden="true"><AchievementBadge achieved={overtime} label="Sitting target reached" size={26} replayOnReentry delay={120}/></span>:null}
   </div>
   <div className="muse-session-scale" aria-hidden="true"><span>0</span><span>{targetMinutes?`${targetMinutes} min`:''}</span></div>
  </div>
  <p className="muse-session-fine">Pauses don’t count toward your time.</p>
  {unsynced}
  {controls&&<div className="muse-session-actions">
   <button type="button" className="muse-button button-primary muse-session-toggle" disabled={busy} onClick={onToggle} aria-label={phase==='paused'?'Resume reading':'Pause reading'}><MuseIcon name={phase==='paused'?'play':'pause'} size={22}/><span>{phase==='paused'?'Resume':'Pause'}</span></button>
   <button type="button" className="muse-button button-ghost muse-session-finish-button" disabled={busy} onClick={onFinish}>Finish session</button>
  </div>}
  {phase!=='saving'&&<button type="button" className="text-button muse-session-discard" disabled={busy} onClick={onDiscard}>Discard session</button>}
  {children&&<div className="muse-session-checkin">{children}</div>}
 </section>;
}
