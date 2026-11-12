'use client';
import Link from 'next/link';
import {useMemo,useState,type CSSProperties} from 'react';
import {MuseIcon,type MuseIconName} from '@/components/MuseIcon';
import type {Book,ReadingSession} from '@/lib/whimsy/models';
import {formatTrend,movement,movementBadge,movementLine,readingTrends,TREND_DESTINATIONS,type Trend,type TrendKey} from '@/lib/whimsy/reading-trends';
import './ReadingTrends.css';

const META:Record<TrendKey,{label:string;icon:MuseIconName;word:string}>={pages:{label:'Pages read',icon:'book',word:'pages'},time:{label:'Time reading',icon:'timer',word:'time'},finished:{label:'Books finished',icon:'check',word:'books'},days:{label:'Reading days',icon:'calendar',word:'days'}};
const shortDate=(d:string)=>new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));

/** Thirty tiny bars, one per day, today on the right. Decorative: the numbers carry the meaning. */
function Spark({trend}:{trend:Trend}){
 const max=Math.max(1,...trend.daily);
 return <span className="muse-trend-spark" aria-hidden="true">{trend.daily.map((v,i)=><i key={i} data-on={v>0||undefined} data-today={i===29||undefined} style={{'--h':`${v>0?Math.max(14,Math.round(100*v/max)):6}%`} as CSSProperties}/>)}</span>;
}

/**
 * Your last 30 days: four quiet numbers compared with the 30 days before. Always the rolling window ending today
 * (not the calendar month); every card opens the matching Reading Atlas view.
 */
export function ReadingTrends({books,sessions,today}:{books:Book[];sessions:ReadingSession[];today:string}){
 const trends=useMemo(()=>readingTrends(books,sessions,today),[books,sessions,today]);
 const keys:TrendKey[]=['pages','time','finished','days'],[at,setAt]=useState(0),key=keys[at],t=trends[key],m=movement(t),meta=META[key];
 return <section className="muse-trends" aria-labelledby="trends-heading" aria-roledescription="carousel">
  <header className="muse-trends-head"><div><span className="small-label">A glimpse of your reading</span><h3 id="trends-heading">Your last 30 days</h3></div>
   <span className="muse-trends-range type-numeric" title="A rolling 30 days ending today, not the calendar month">{shortDate(trends.current.start)} – {shortDate(trends.current.end)}</span></header>
  {trends.empty?<div className="muse-trends-empty"><span className="muse-trends-empty-art" aria-hidden="true"><i/><i/><i/><i/><i/></span><div><strong>Your next chapter starts the story</strong><p>Your reading patterns will appear here as you log your chapters, compared with the 30 days before.</p></div></div>
  :<div className="muse-trends-stage" aria-live="polite">
    <Link href={TREND_DESTINATIONS[key]} className="muse-trend-card" data-key={key} data-tone={m.tone} aria-label={`${meta.label}: ${formatTrend(key,t.current)} in the last 30 days. ${movementLine(key,m)}. Open in Reading Atlas.`}>
     <span className="muse-trend-top"><span className="muse-trend-icon" aria-hidden="true"><MuseIcon name={meta.icon} size={15}/></span><span className="small-label">{meta.label}</span></span>
     <strong className="muse-trend-value type-numeric">{key==='time'?formatTrend('time',t.current):Math.round(t.current).toLocaleString('en-US')}{key!=='time'&&<small> {formatTrend(key,t.current).replace(/^[\d,]+\s/,'')}</small>}</strong>
     <Spark trend={t}/>
     <span className="muse-trend-move">{movementBadge(m)&&<em className="muse-trend-badge">{movementBadge(m)}</em>}<span>{movementLine(key,m)}</span></span>
    </Link>
    <div className="muse-trends-nav"><div className="muse-trends-dots" role="tablist" aria-label="Metric">{keys.map((k,i)=><button key={k} type="button" role="tab" aria-selected={i===at} aria-label={META[k].label} onClick={()=>setAt(i)}/>)}</div>
     <button type="button" className="muse-button button-ghost" aria-label="Previous metric" onClick={()=>setAt((at+3)%4)}><MuseIcon name="chevron" size={14}/></button><button type="button" className="muse-button button-ghost" aria-label="Next metric" onClick={()=>setAt((at+1)%4)}><MuseIcon name="chevron" size={14}/></button></div>
   </div>}
  <Link href="/collections/reading-atlas" className="muse-trends-explore">Explore in Reading Atlas <MuseIcon name="arrow" size={13}/></Link>
 </section>;
}
