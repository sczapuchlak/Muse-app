'use client';
import {useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {MuseModal} from '@/components/MuseModal';
import {MuseIcon} from '@/components/MuseIcon';
import {MuseStar} from '@/components/MuseStar';
import type {Book} from '@/lib/whimsy/models';
import {buildPools,emptyReason,pickRandom,poolFor,reelFor,SOURCES,type SourceId} from '@/lib/books/up-next';
import type {PlanEntry} from '@/lib/books/reading-plans';
import {Cover} from '../atlas/CoverCalendar';
import {StatusChip} from './PlanStatus';
import {TarotCardBack} from '../tarot/TarotCardBack';
import '../tarot/TarotCardBack.css';
import './Roulette.css';

/**
 * Reading Roulette, the one book wheel (Spin to Add on a Reading Plan): choose a source, spin, reveal. Nothing is
 * saved until the reader keeps the book, and keeping it only adds it to the plan; it never starts reading.
 */
export function Roulette({books,plans,today,taken,at,sources=SOURCES.map(s=>s.id),initialSource='tbr',hint,keepLabel,onKeep,onClose}:{books:Book[];plans:readonly PlanEntry[];today:string;
 /** Books already in the plan: never offered. */ taken:ReadonlySet<string>;
 /** The month and year the plan sources read from (defaults to today's). */ at?:{month:string;year:string};
 sources?:SourceId[];initialSource?:SourceId;hint:string;keepLabel:string;onKeep:(id:string)=>void;onClose:()=>void}){
 const pools=useMemo(()=>buildPools(books,plans,today,taken,at),[books,plans,today,taken,at]),offered=SOURCES.filter(s=>sources.includes(s.id));
 const [source,setSource]=useState<SourceId>(initialSource),[phase,setPhase]=useState<'idle'|'spinning'|'result'>('idle'),[winner,setWinner]=useState<Book|null>(null),[frame,setFrame]=useState<Book|null>(null),[spins,setSpins]=useState(0);
 const pool=poolFor(pools,source),timer=useRef<number|null>(null),skip=useRef<(()=>void)|null>(null);
 useEffect(()=>()=>{if(timer.current)window.clearTimeout(timer.current);},[]);
 const reduced=()=>typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function spin(){
  if(!pool.length||phase==='spinning')return;
  const chosen=pickRandom(pool,winner?.id)!,reveal=()=>{if(timer.current)window.clearTimeout(timer.current);skip.current=null;setFrame(chosen);setWinner(chosen);setPhase('result');setSpins(n=>n+1);};
  setWinner(null);if(reduced()||pool.length===1){reveal();return;}
  const reel=reelFor(pool,chosen,16);let i=0;setPhase('spinning');skip.current=reveal;
  const step=()=>{setFrame(reel[i]);if(i>=reel.length-1){reveal();return;}i++;timer.current=window.setTimeout(step,55+i*i*2.4);};step();
 }
 const reason=pool.length===0?emptyReason(source,pools):null;void frame;
 return <MuseModal id="reading-roulette" label="Reading Roulette" title="Spin for a book" returnFocus={null} onClose={onClose}>
  <div className="muse-roulette" data-phase={phase}>
   <p className="muse-upnext-hint">{hint}</p>
   <div className="muse-upnext-sources" role="group" aria-label="Where to spin from">{offered.map(s=><button key={s.id} type="button" className="muse-edge" aria-pressed={source===s.id} disabled={phase==='spinning'} onClick={()=>{setSource(s.id);setPhase('idle');setWinner(null);setFrame(null);}}>{s.label}<small className="type-numeric">{poolFor(pools,s.id).length}</small></button>)}</div>
   {reason?<div className="muse-upnext-empty"><strong>Nothing to spin here</strong><p>{reason.why}</p><div className="muse-books-actions">{reason.try.filter(s=>sources.includes(s)).map(s=><button key={s} type="button" className="muse-button button-ghost" onClick={()=>setSource(s)}>Spin {SOURCES.find(x=>x.id===s)!.label.toLowerCase()} ({poolFor(pools,s).length})</button>)}</div></div>
   :<>
    <div className="muse-roulette-stage" aria-live="polite">
     <span className="muse-roulette-glow" aria-hidden="true"/>
     {/* The deck: your Tarot card back, fanned. It shuffles while the deck chooses; then the chosen card turns over. */}
     <div className="muse-roulette-deck" aria-hidden="true">{[-2,-1,1,2].map(i=><span key={i} className="muse-roulette-fan" style={{'--i':i,'--d':Math.abs(i)} as CSSProperties}><TarotCardBack/></span>)}</div>
     <div className="muse-roulette-card" data-flipped={phase==='result'||undefined} key={phase==='result'?`w${spins}`:'deck'}>
      <span className="muse-roulette-face muse-roulette-back" aria-hidden="true"><TarotCardBack/></span>
      <span className="muse-roulette-face muse-roulette-front muse-roulette-cover" data-landed={phase==='result'||undefined}>{phase==='result'&&winner?<Cover book={winner}/>:null}</span>
     </div>
     {phase==='result'&&<span className="muse-roulette-sparks" aria-hidden="true" key={spins}><MuseStar size={18}/><MuseStar size={12} color="aqua"/><MuseStar size={14} color="pink"/><MuseStar size={10}/></span>}
     {phase==='result'&&winner?<div className="muse-roulette-result"><strong>{winner.title}</strong><span>{winner.author||'Author not recorded'}</span><StatusChip status={winner.status}/></div>:<p className="muse-roulette-tease">{phase==='spinning'?'Shuffling the deck…':`${pool.length} ${pool.length===1?'book is':'books are'} in the deck`}</p>}
    </div>
    <div className="muse-books-actions muse-roulette-actions">
     {phase==='result'&&winner?<><button type="button" className="muse-button button-primary" onClick={()=>onKeep(winner.id)}>{keepLabel}</button><button type="button" className="muse-button button-ghost" disabled={pool.length<2} title={pool.length<2?'That is the only book here':undefined} onClick={spin}>Draw again</button></>
      :phase==='spinning'?<button type="button" className="muse-button button-ghost" onClick={()=>skip.current?.()}>Skip</button>
      :<button type="button" className="muse-button button-primary muse-roulette-spin" onClick={spin}><MuseIcon name="sparkle" size={15}/>Draw a book</button>}
     <button type="button" className="muse-button button-ghost" onClick={onClose}>Cancel</button>
    </div></>}
  </div>
 </MuseModal>;
}
