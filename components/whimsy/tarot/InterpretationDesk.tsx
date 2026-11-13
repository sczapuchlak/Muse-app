'use client';
import {useId,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {MuseHeading,MuseMark} from '@/components/design/MuseHeading';
import {MuseIcon} from '@/components/MuseIcon';
import {grimoireEntryHref} from '@/lib/whimsy/grimoire';
import type {Spread,TarotOrientation} from '@/lib/whimsy/tarot';
import {TarotCardBack} from './TarotCardBack';
import {interpretCard,readSpread} from '@/lib/whimsy/tarot-interpretation';
import {TarotCardArt as CardArt} from '../TarotCardArt';
import './InterpretationDesk.css';

export type DeskCard={cardId:string;orientation:TarotOrientation;revealed:boolean};
type Props={
 spread:Spread;drawn:DeskCard[];question:string;active:number;onActive:(index:number)=>void;onReveal:(index:number)=>void;
 reflection:string;onReflection:(value:string)=>void;mood:string;onMood:(value:string)=>void;tags:string;onTags:(value:string)=>void;
 busy:boolean;onSave:()=>void;onDiscard:(trigger:HTMLElement)=>void;
};

/**
 * The Interpretation Desk: the reading on one side, the journal on the other, so nobody has to leave their
 * reflection to look a card up. Switching cards only changes the reference; the draft lives with the table.
 * On a phone the reference becomes a sticky strip above the writing area and can be folded away.
 */
export function InterpretationDesk({spread,drawn,question,active,onActive,onReveal,reflection,onReflection,mood,onMood,tags,onTags,busy,onSave,onDiscard}:Props){
 const id=useId(),field=useRef<HTMLTextAreaElement>(null);
 const [open,setOpen]=useState(()=>typeof window==='undefined'||!window.matchMedia('(max-width: 900px)').matches),[deeper,setDeeper]=useState(false),[whole,setWhole]=useState(false);
 const revealedCount=drawn.filter(item=>item.revealed).length,allRevealed=revealedCount===drawn.length;
 const current=drawn[active]?.revealed?active:drawn.findIndex(item=>item.revealed);
 const reading=useMemo(()=>current>=0?interpretCard(drawn[current].cardId,drawn[current].orientation,spread.positions[current]):null,[current,drawn,spread.positions]);
 const overall=useMemo(()=>readSpread(drawn.filter(item=>item.revealed),spread.positions.filter((_,index)=>drawn[index]?.revealed),question),[drawn,spread.positions,question]);
 function addPrompt(prompt:string){onReflection(reflection.trim()?`${reflection.replace(/\s+$/,'')}\n\n${prompt}\n`:`${prompt}\n`);requestAnimationFrame(()=>{const element=field.current;if(!element)return;element.focus();element.setSelectionRange(element.value.length,element.value.length);});}
 const showWhole=whole&&drawn.length>1&&revealedCount>1;
 return <div className="muse-idesk" data-count={drawn.length}>
  <section className="muse-idesk-reading" aria-labelledby={`${id}-reading`} data-open={open}>
   <MuseHeading icon="spread" tone={1} title="Your reading" id={`${id}-reading`} level={3} description={allRevealed?(drawn.length>1?'Choose a card to read it while you write.':'Read it while you write.'):`${revealedCount} of ${drawn.length} turned. Turn the rest when you are ready.`} aside={<button type="button" className="muse-idesk-fold" aria-expanded={open} aria-controls={`${id}-panel`} onClick={()=>setOpen(value=>!value)}>{open?'Hide meaning':'Show meaning'}<MuseIcon name="chevron" size={14}/></button>}/>
   <div className="muse-idesk-switcher" role="tablist" aria-label="Cards in this reading">
    {drawn.map((item,index)=>{const info=item.revealed?interpretCard(item.cardId,item.orientation,spread.positions[index]):null,selected=!showWhole&&index===current;
     return item.revealed&&info?<button key={`${item.cardId}-${index}`} type="button" role="tab" id={`${id}-tab-${index}`} aria-selected={selected} aria-controls={`${id}-panel`} className="muse-idesk-chip" data-orientation={item.orientation} onClick={()=>{setWhole(false);setOpen(true);onActive(index);}}>
       <span className="muse-idesk-chip-art"><CardArt card={info.card} orientation={item.orientation} small/></span>
       <span className="muse-idesk-chip-copy"><small>{spread.positions[index]}</small><strong>{info.card.name}</strong>{item.orientation==='reversed'&&<em>Reversed</em>}</span>
      </button>
      :<button key={`${item.cardId}-${index}`} type="button" className="muse-idesk-chip" data-facedown onClick={()=>onReveal(index)} aria-label={`${spread.positions[index]}: turn this card`}>
       <span className="muse-idesk-chip-art"><TarotCardBack/></span>
       <span className="muse-idesk-chip-copy"><small>{spread.positions[index]}</small><strong>Turn card</strong></span>
      </button>;})}
    {drawn.length>1&&revealedCount>1&&<button type="button" role="tab" aria-selected={showWhole} aria-controls={`${id}-panel`} className="muse-idesk-chip muse-idesk-chip-whole" onClick={()=>{setWhole(true);setOpen(true);}}><span className="muse-idesk-chip-art"><MuseMark icon="constellation" tone={4} size="sm"/></span><span className="muse-idesk-chip-copy"><small>Together</small><strong>The whole spread</strong></span></button>}
   </div>
   <div className="muse-idesk-panel" id={`${id}-panel`} role="tabpanel" aria-labelledby={showWhole?undefined:`${id}-tab-${current}`} hidden={!open} tabIndex={-1}>
    {showWhole?<div className="muse-idesk-whole">
      <p className="muse-idesk-sentence">{overall.sentence}</p>
      {overall.threads.length?<ul className="muse-idesk-threads">{overall.threads.map(thread=><li key={thread.title}><strong>{thread.title}</strong><p>{thread.body}</p></li>)}</ul>:<p className="muse-idesk-quiet">No suit, number or arcana repeats here, so each card stands on its own. Read them in order and notice where they agree.</p>}
      <p className="muse-idesk-caveat">Patterns are a way of looking, not a verdict. Keep what is useful.</p>
     </div>
    :reading?<article className="muse-idesk-card" key={`${reading.card.id}-${reading.orientation}-${current}`} data-orientation={reading.orientation}>
      <header>
       <span className="muse-idesk-card-art"><CardArt card={reading.card} orientation={reading.orientation} small/></span>
       <div>
        <p className="muse-idesk-seat">{reading.position}</p>
        <h4>{reading.card.name}</h4>
        <p className="muse-idesk-tags"><span data-orientation={reading.orientation}>{reading.orientation==='reversed'?<MuseMark icon="reversed" tone={6} size="sm" variant="soft"/>:null}{reading.orientation==='reversed'?'Reversed':'Upright'}</span><span>{reading.card.section}{reading.element?` · ${reading.element}`:''}</span></p>
        <ul className="muse-idesk-keywords" aria-label="Keywords">{reading.keywords.map(word=><li key={word}>{word}</li>)}</ul>
       </div>
      </header>
      <p className="muse-idesk-essence">{reading.essence}</p>
      {reading.summary&&<p className="muse-idesk-summary">{reading.summary}</p>}
      <dl className="muse-idesk-facts">
       <div data-kind="seat"><dt><MuseMark icon="compass" tone={2} size="sm" variant="soft"/>In this position</dt><dd><p>{reading.positionLine}</p><p className="muse-idesk-angle">{reading.positionAngle}</p></dd></div>
       <div data-kind="orientation"><dt><MuseMark icon={reading.orientation==='reversed'?'reversed':'card'} tone={6} size="sm" variant="soft"/>{reading.orientation==='reversed'?'Why reversed matters':'Upright'}</dt><dd><p>{reading.orientationNote}</p></dd></div>
      </dl>
      <div className="muse-idesk-deeper">
       <button type="button" className="muse-idesk-deeper-toggle" aria-expanded={deeper} aria-controls={`${id}-deeper`} onClick={()=>setDeeper(value=>!value)}><MuseMark icon="lightbulb" tone={3} size="sm"/><span>What might this mean for me?</span><MuseIcon name="chevron" size={15}/></button>
       {deeper&&<div className="muse-idesk-deeper-body" id={`${id}-deeper`}>
        {reading.everyday&&<section><h5>In everyday life</h5><p>{reading.everyday}</p></section>}
        <section><h5>Questions to consider</h5><ul>{reading.questions.map(question=><li key={question}><button type="button" onClick={()=>addPrompt(question)} title="Write about this">{question}<span aria-hidden="true">＋</span></button></li>)}</ul></section>
        <section><h5>In the artwork</h5><p>{reading.symbolism}</p></section>
        {reading.misconception&&<section data-kind="misconception"><h5>A common misreading</h5><p>{reading.misconception}</p></section>}
       </div>}
      </div>
      <footer><Link className="muse-idesk-grimoire" href={grimoireEntryHref(reading.card.id,{from:'reading',orientation:reading.orientation})}><MuseIcon name="bookshelf" size={14}/>Full history and study in the Grimoire →</Link></footer>
     </article>
    :<p className="muse-idesk-quiet">Turn a card to read it here.</p>}
   </div>
  </section>

  <section className="muse-idesk-journal" aria-labelledby={`${id}-journal`}>
   <MuseHeading icon="quill" tone={3} title="Your reflection" id={`${id}-journal`} level={3} description="Write while the cards are in front of you. Nothing is saved until you choose."/>
   <label className="sr-only" htmlFor={`${id}-text`}>Your reflection</label>
   <textarea id={`${id}-text`} ref={field} className="muse-idesk-page" value={reflection} maxLength={10000} rows={8} onChange={event=>onReflection(event.target.value)} placeholder="What does this bring up for you?"/>
   {!!overall.prompts.length&&<div className="muse-idesk-prompts"><p>From this reading</p><ul>{overall.prompts.map(prompt=><li key={prompt}><button type="button" onClick={()=>addPrompt(prompt)}>{prompt}</button></li>)}</ul></div>}
   <div className="muse-idesk-meta">
    <label><span>Mood <small>optional</small></span><input value={mood} maxLength={80} onChange={event=>onMood(event.target.value)} placeholder="curious, tender, restless…"/></label>
    <label><span>Tags <small>comma separated</small></span><input value={tags} maxLength={300} onChange={event=>onTags(event.target.value)} placeholder="work, new moon"/></label>
   </div>
   <div className="muse-idesk-actions">
    <button className="text-button" type="button" onClick={event=>onDiscard(event.currentTarget)}>Discard reading</button>
    <span className="muse-idesk-save">{!allRevealed&&<small>Turn every card to save this reading.</small>}<button className="muse-button button-primary" type="button" disabled={busy||!allRevealed} onClick={onSave}>{busy?'Saving…':'Save to Reading Journal'}</button></span>
   </div>
  </section>
 </div>;
}
