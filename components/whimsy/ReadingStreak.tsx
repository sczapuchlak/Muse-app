'use client';
import {useId,type ReactNode} from 'react';
import Link from 'next/link';
import type {StreakDetail} from '@/lib/whimsy/reading-streak';
import './ReadingStreak.css';

const HEART='M12 20.6s-7.3-4.5-9.4-9.1C1.1 8.1 3.2 4.6 6.7 4.6c2 0 3.5 1.1 4.3 2.5.8-1.4 2.3-2.5 4.3-2.5 3.5 0 5.6 3.5 4.1 6.9-2.1 4.6-9.4 9.1-9.4 9.1z';
const weekday=(date:string)=>new Intl.DateTimeFormat(undefined,{weekday:'narrow',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
const longDay=(date:string)=>new Intl.DateTimeFormat(undefined,{weekday:'long',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));

export function StreakHeart({filled,today=false,size=26}:{filled:boolean;today?:boolean;size?:number}){
 const id=useId().replace(/:/g,'');
 return <svg className="muse-streak-heart" data-filled={filled||undefined} data-today={today||undefined} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <defs><linearGradient id={`h${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--accent-pop,var(--accent-primary))"/><stop offset="55%" stopColor="var(--accent-primary)"/><stop offset="100%" stopColor="var(--accent-secondary)"/></linearGradient></defs>
  <path d={HEART} fill={filled?`url(#h${id})`:'none'} stroke={filled?'none':'currentColor'} strokeWidth="1.5"/>
  {filled&&<path d="M7.2 7.4c-.9.4-1.5 1.3-1.6 2.4" fill="none" stroke="rgba(255,255,255,.75)" strokeWidth="1.3" strokeLinecap="round"/>}
 </svg>;
}

/** Seven days of reading as hearts, with the current streak and personal best. Opens the Atlas streak view. */
export function ReadingStreak({detail,celebrate,href='/collections/reading-atlas?section=streak',children}:{detail:StreakDetail;celebrate:number|null;href?:string;children?:ReactNode}){
 const label=`Reading streak: ${detail.current} ${detail.current===1?'day':'days'}${detail.readToday?'':', read today to keep it going'}. Personal best ${detail.longest} days. Open streak details.`;
 return <section className="muse-streak-panel" aria-label="Reading streak" data-celebrating={celebrate?true:undefined}><Link href={href} className="muse-streak" aria-label={label} data-celebrating={celebrate?true:undefined}>
  <span className="muse-streak-count"><strong className="type-numeric">{detail.current}</strong><span>{detail.current===1?'day':'day streak'}</span></span>
  <ol className="muse-streak-week" aria-hidden="true">{detail.week.map(day=><li key={day.date} title={`${longDay(day.date)}${day.read?' · read':''}`}><StreakHeart filled={day.read} today={day.today}/><span data-today={day.today||undefined}>{weekday(day.date)}</span></li>)}</ol>
  <span className="muse-streak-meta">{celebrate?<em className="muse-streak-milestone">✦ {celebrate}-day streak!</em>:detail.current>0&&!detail.readToday?<em>Read today to keep it</em>:<span>Best <strong className="type-numeric">{detail.longest}</strong></span>}<span className="muse-streak-chevron" aria-hidden="true">›</span></span>
 </Link>{children&&<div className="muse-streak-note">{children}</div>}</section>;
}
