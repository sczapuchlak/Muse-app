'use client';
import {useState} from 'react';
import Link from 'next/link';
import type {DreamEntry} from '@/lib/whimsy/models';
import type {DreamMeaning} from '@/lib/whimsy/dream-persistence';
import {dreamDisplayTitle,type DreamSymbol} from '@/lib/whimsy/dreams';
import {dateLabel} from '@/lib/dates';
import {categoryGlyph,symbolGlyph} from './DreamDiary';
import {DreamTypeBadge,emotionName} from './parts';

type Props={dream:DreamEntry|undefined;dreams:DreamEntry[];symbols:DreamSymbol[];meanings:DreamMeaning[];symbolCounts:Map<string,number>;symbolHref:(id:string,dreamId:string)=>string;onChoose:()=>void;onEdit:(dream:DreamEntry)=>void;onOpen:(dream:DreamEntry)=>void;reflection:string;setReflection:(value:string)=>void;onSaveReflection:()=>void;busy:boolean};

/**
 * Dream Decoder, the Interpretation Studio: a guided reading from the dream, to its atmosphere, to the symbols found
 * in it, to their meanings and your own reflection. Meanings are possibilities, never predictions.
 */
export function DreamDecoder(p:Props){
 const [chosen,setChosen]=useState<{dream:string;symbol:string}|null>(null);
 if(!p.dream)return <section className="muse-dream-section" aria-label="Dream Decoder"><div className="muse-dream-empty-state"><span className="muse-dream-moon" aria-hidden="true">☾</span><h3>{p.dreams.length?'Choose a dream. Let’s see what followed you out of sleep.':'Capture a dream in the Diary first, then bring it here to explore.'}</h3><p>The Decoder sets your own details beside each symbol’s possible meanings. It offers reflection, never prediction.</p>{p.dreams.length>0&&<button type="button" className="muse-button button-primary" onClick={p.onChoose}>Choose a dream</button>}</div></section>;
 const dream=p.dream,types=dream.classifications?.length?dream.classifications:dream.lucid?['Lucid']:[];
 const active=chosen?.dream===dream.id&&dream.symbolIds.includes(chosen.symbol)?chosen.symbol:dream.symbolIds[0]??'';
 const symbol=p.symbols.find(s=>s.id===active),meaning=p.meanings.find(m=>m.symbol_id===active)?.meaning;
 const alsoIn=p.dreams.filter(d=>d.id!==dream.id&&d.symbolIds.includes(active)).sort((a,b)=>b.date.localeCompare(a.date));
 const sharedSymbols=p.dreams.filter(d=>d.id!==dream.id&&d.symbolIds.some(id=>dream.symbolIds.includes(id))).length,sharedFeelings=p.dreams.filter(d=>d.id!==dream.id&&d.emotions.some(id=>dream.emotions.includes(id))).length;
 return <section className="muse-dream-section muse-dream-studio" aria-label="Dream Decoder">
  <div className="muse-dream-studio-bar"><p className="small-label">Prompts for reflection, never fixed predictions.</p><div><button type="button" className="muse-button button-ghost" onClick={p.onChoose}>Choose another dream</button><button type="button" className="text-button" onClick={()=>p.onEdit(dream)}>Edit dream</button></div></div>
  <article className="muse-dream-manuscript muse-dream-reveal" key={dream.id}>
   <p className="muse-dream-manuscript-meta"><time dateTime={dream.date}>{dateLabel(dream.date)}, {dream.date.slice(0,4)}</time>{types.map(t=><DreamTypeBadge key={t} type={t}/>)}</p>
   <h3>{dreamDisplayTitle(dream)}</h3>
   <blockquote>{dream.text}</blockquote>
   <button type="button" className="text-button" onClick={()=>p.onOpen(dream)}>Read the full entry</button>
  </article>
  <div className="muse-dream-studio-grid">
   <div className="muse-dream-studio-main">
    <section className="muse-dream-atmosphere" aria-label="Emotional atmosphere"><h4>Atmosphere</h4>{dream.emotions.length||dream.intensity!=null||dream.overallFeeling?<div>{dream.emotions.map(id=><span className="muse-dream-chip" key={id}>{emotionName(id)}</span>)}{dream.overallFeeling&&<span className="small-label">Woke feeling {dream.overallFeeling.toLowerCase()}</span>}{dream.intensity!=null&&<span className="muse-dream-meter" aria-label={`Intensity ${dream.intensity} of 5`}><span style={{width:`${dream.intensity*20}%`}}/></span>}</div>:<p className="muse-dream-quiet">No feelings were recorded for this dream.</p>}</section>
    <section aria-label="Symbols in this dream"><h4>Symbols in this dream</h4>
     {dream.symbolIds.length?<><div className="muse-dream-symbol-tray" role="group" aria-label="Choose a symbol to examine">{dream.symbolIds.map(id=>{const s=p.symbols.find(x=>x.id===id),n=p.symbolCounts.get(id)??0;return <button type="button" key={id} className="muse-dream-tile" aria-pressed={id===active} onClick={()=>setChosen({dream:dream.id,symbol:id})}><span className="muse-dream-tile-glyph" aria-hidden="true">{symbolGlyph(s)}</span><strong>{s?.name??'Unavailable symbol'}</strong><small>{n>1?`in ${n} of your dreams`:'first appearance'}</small></button>;})}</div>
      {symbol?<article className="muse-dream-lens muse-dream-reveal" key={active} aria-live="polite">
       <header><span className="muse-dream-lens-icon" aria-hidden="true">{symbolGlyph(symbol)}</span><span className="small-label">{categoryGlyph[symbol.category]??'✧'} {symbol.category} · {symbol.provider==='muse'?'Muse':symbol.provider==='personal'?'Your symbol':'HeartYearning'}</span><h5>{symbol.name}</h5></header>
       {symbol.description&&<p className="muse-dream-lens-lead">{symbol.description}</p>}
       {symbol.associations.length>0&&<ul className="muse-dream-associations">{symbol.associations.map(a=><li key={a}>{a}</li>)}</ul>}
       {symbol.context&&<p>{symbol.context}</p>}
       {symbol.interpretations.filter(i=>i.text!==symbol.description).map(i=><figure className="muse-dream-sourced" key={i.url}><blockquote>{i.text}</blockquote><figcaption className="small-label">{i.title} · <a href={i.url} target="_blank" rel="noopener noreferrer">{i.source}</a></figcaption></figure>)}
       {symbol.provider==='heartyearning'&&<p className="small-label">Interpretation from the <a href={symbol.sourceUrl} target="_blank" rel="noopener noreferrer">{symbol.source}</a>.</p>}
       {symbol.question&&<p className="muse-dream-question">{symbol.question}</p>}
       {meaning&&<div className="muse-dream-your-meaning"><span className="small-label">Your meaning</span><p>{meaning}</p></div>}
       <footer>{alsoIn.length>0?<span className="small-label">Also in {alsoIn.length} {alsoIn.length===1?'dream':'dreams'}: {alsoIn.slice(0,3).map((d,i)=><span key={d.id}>{i?', ':''}<button type="button" className="text-button" onClick={()=>p.onOpen(d)}>{dateLabel(d.date)}</button></span>)}{alsoIn.length>3?'…':''}</span>:<span className="small-label">This is the only dream with {symbol.name.toLowerCase()} so far.</span>}<Link className="text-button" href={p.symbolHref(active,dream.id)}>Open in the Encyclopedia →</Link></footer>
      </article>:<p className="muse-dream-quiet">This symbol is no longer in your encyclopedia.</p>}</>
     :<p className="muse-dream-quiet">Every dream has its own language. <button type="button" className="text-button" onClick={()=>p.onEdit(dream)}>Add a symbol</button> to begin exploring yours.</p>}
    </section>
   </div>
   <aside className="muse-dream-studio-side">
    <section aria-label="Your reflection"><h4>Your reflection</h4>
     <label className="muse-dream-reflection"><span className="sr-only">Your reflection on this dream</span><textarea value={p.reflection} maxLength={10000} onChange={e=>p.setReflection(e.target.value)} placeholder="What feels meaningful to you?"/></label>
     <button type="button" className="muse-button button-primary" disabled={p.busy||p.reflection.trim()===dream.interpretation.trim()} onClick={p.onSaveReflection}>Save reflection</button>
    </section>
    <section aria-label="Questions to sit with"><h4>Questions to sit with</h4><ul className="muse-dream-questions"><li>What part of this dream stayed with you?</li><li>Did anything feel familiar?</li><li>What might these symbols mean to you?</li><li>What feeling followed you into the day?</li></ul></section>
    <section aria-label="Connections in your diary"><h4>In your diary</h4><p className="small-label">{sharedSymbols} other {sharedSymbols===1?'dream shares':'dreams share'} a symbol · {sharedFeelings} {sharedFeelings===1?'shares':'share'} a feeling. Counts from your own entries only.</p></section>
   </aside>
  </div>
 </section>;
}
