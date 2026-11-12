'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {MuseModal} from '@/components/MuseModal';
import {MuseIcon} from '@/components/MuseIcon';
import {MuseSearch} from '@/components/design/MuseSearch';
import {MuseStar} from '@/components/MuseStar';
import type {Book} from '@/lib/whimsy/models';
import {buildPools,emptyReason,pickRandom,poolFor,reelFor,SOURCES,type Pools,type SourceId} from '@/lib/books/up-next';
import {periodLabel,periodOf} from '@/lib/books/reading-plans';
import {useReadingPlans} from '@/lib/books/use-reading-plans';
import {seriesHref} from '@/lib/books/return-nav';
import {BookSearch} from '../BookSearch';
import {useQuickAdd} from '../QuickAdd';
import {Cover} from '../atlas/CoverCalendar';
import {StatusChip} from '../plans/PlanStatus';
import './UpNext.css';

type Common={books:Book[];plans:ReturnType<typeof useReadingPlans>['entries'];today:string;/** books in the other slots, which are not offered again */taken:ReadonlySet<string>;slotNumber:number};

function SourceTabs({source,onPick,pools}:{source:SourceId|'new';onPick:(s:SourceId|'new')=>void;pools:Pools}){
 const count=(s:SourceId)=>poolFor(pools,s).length;
 return <div className="muse-upnext-sources" role="group" aria-label="Where books come from">{SOURCES.map(s=><button key={s.id} type="button" className="muse-edge" aria-pressed={source===s.id} onClick={()=>onPick(s.id)} title={s.hint}>{s.label}<small className="type-numeric">{count(s.id)}</small></button>)}<button type="button" className="muse-edge" aria-pressed={source==='new'} data-new onClick={()=>onPick('new')}><MuseIcon name="plus" size={13}/>Add a new book</button></div>;
}

/** Offered after a brand-new book joins Up Next. Never automatic: the reader chooses. */
function PlanOffer({book,today,onDone}:{book:Book;today:string;onDone:()=>void}){
 const plans=useReadingPlans(),month=periodOf('month',today),year=periodOf('year',today),[said,setSaid]=useState('');
 return <div className="muse-upnext-offer"><span className="muse-upnext-offer-cover"><Cover book={book}/></span>
  <div><strong>“{book.title}” is in your Library and Up Next.</strong><p>Want it in a Reading Plan too? That is up to you.</p>
   {said?<p role="status" className="muse-upnext-said">{said}</p>:<div className="muse-books-actions"><button type="button" className="muse-button button-primary" onClick={()=>{void plans.add('month',month,[book.id]).then(()=>setSaid(`Added to ${periodLabel('month',month)}.`));}}>{periodLabel('month',month)}</button><button type="button" className="muse-button button-ghost" onClick={()=>{void plans.add('year',year,[book.id]).then(()=>setSaid(`Added to the ${year} plan.`));}}>The {year} plan</button></div>}
   <button type="button" className="text-button" onClick={onDone}>{said?'Done':'Not now'}</button></div></div>;
}

/** Choose a book for a slot: a source, a searchable list filtered to it, or a brand-new book. */
export function SlotPicker({books,plans,today,taken,slotNumber,initialSource='month',onChoose,onSpin,onClose}:Common&{initialSource?:SourceId;onChoose:(id:string,keepOpen?:boolean)=>void;onSpin:(source:SourceId)=>void;onClose:()=>void}){
 const router=useRouter(),pools=useMemo(()=>buildPools(books,plans,today,taken),[books,plans,today,taken]);
 const [source,setSource]=useState<SourceId|'new'>(initialSource),[query,setQuery]=useState(''),[added,setAdded]=useState<Book|null>(null),[note,setNote]=useState('');
 const quick=useQuickAdd({onAdded:book=>{if(book.status==='planned'){onChoose(book.id,true);setAdded(book);}else setNote(`“${book.title}” was added as ${book.status==='reading'?'Currently Reading, so it is already on your desk':book.status}.`);}});
 const list=source==='new'?[]:poolFor(pools,source).filter(b=>{const q=query.trim().toLowerCase();return !q||b.title.toLowerCase().includes(q)||(b.author??'').toLowerCase().includes(q);});
 const reason=source!=='new'&&poolFor(pools,source).length===0?emptyReason(source,pools):null;
 return <MuseModal id="up-next-picker" label={`Choose a book for slot ${slotNumber}`} title={`Choose book ${slotNumber}`} returnFocus={null} onClose={onClose} size="tall">
  <div className="muse-upnext-flow">
   {added?<PlanOffer book={added} today={today} onDone={onClose}/>:<>
    <SourceTabs source={source} onPick={s=>{setSource(s);setNote('');}} pools={pools}/>
    {source==='new'?<section aria-label="Add a new book">
      <p className="muse-upnext-hint">Search for a book and it joins your Library as To Be Read (unless you choose otherwise), then lands in this slot.</p>
      <BookSearch stage="search" onImport={c=>void quick.start({candidate:c,title:c.title,author:c.authors[0]??'',status:'planned'},c.key)} onEditions={()=>{}} onReview={()=>{}} onBackToSearch={()=>{}} onManual={()=>router.push(`/collections?tab=library&add=book&upnext=${slotNumber-1}`)} quickPending={quick.pending} onQuickAdd={(candidate,status,hit)=>void quick.start({candidate,title:candidate.title,author:candidate.authors[0]??'',status,...(hit?{hardcoverBookId:hit.bookId}:{})},candidate.key)} onOpenSeries={key=>router.push(seriesHref(key))} onOpenBook={id=>{const b=books.find(x=>x.id===id);if(b&&(b.status==='reading'||b.status==='finished'))setNote(`“${b.title}” is already ${b.status==='reading'?'being read':'finished'}.`);else onChoose(id);}}/>
      {quick.error&&<p role="alert" className="muse-books-error">{quick.error}</p>}{note&&<p role="status" className="muse-upnext-hint">{note}</p>}</section>
    :reason?<div className="muse-upnext-empty"><strong>Nothing to choose from here</strong><p>{reason.why}</p><div className="muse-books-actions">{reason.try.map(s=><button key={s} type="button" className="muse-button button-ghost" onClick={()=>setSource(s)}>Try {SOURCES.find(x=>x.id===s)!.label.toLowerCase()} ({poolFor(pools,s).length})</button>)}<button type="button" className="muse-button button-primary" onClick={()=>setSource('new')}><MuseIcon name="plus" size={14}/>Add a new book</button></div></div>
    :<section aria-label="Books to choose from">
      <div className="muse-upnext-pickhead"><MuseSearch className="muse-upnext-search" label="Search these books" value={query} onChange={setQuery} placeholder="Search these books"/><button type="button" className="muse-button button-ghost" onClick={()=>onSpin(source as SourceId)}><MuseIcon name="sparkle" size={14}/>Spin instead</button></div>
      {list.length===0?<p className="muse-upnext-hint">No books match “{query}”.</p>:<ul className="muse-upnext-list">{list.map(b=><li key={b.id}><button type="button" onClick={()=>onChoose(b.id)}><span className="muse-upnext-list-cover"><Cover book={b}/></span><span className="muse-upnext-list-copy"><strong>{b.title}</strong><small>{b.author||'Author not recorded'}</small></span><StatusChip status={b.status} compact/></button></li>)}</ul>}</section>}
   </>}
  </div>
  {quick.sheet}
 </MuseModal>;
}

/** Reading Roulette: choose a source, spin, reveal. Nothing is saved until "Keep this book". */
export function Roulette({books,plans,today,taken,slotNumber,initialSource='month',onKeep,onClose}:Common&{initialSource?:SourceId;onKeep:(id:string)=>void;onClose:()=>void}){
 const pools=useMemo(()=>buildPools(books,plans,today,taken),[books,plans,today,taken]);
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
 const reason=pool.length===0?emptyReason(source,pools):null,shown=phase==='idle'?null:frame;
 return <MuseModal id="reading-roulette" label="Reading Roulette" title="Reading Roulette" returnFocus={null} onClose={onClose}>
  <div className="muse-roulette" data-phase={phase}>
   <p className="muse-upnext-hint">Spin for slot {slotNumber}. Nothing is saved until you keep the book.</p>
   <div className="muse-upnext-sources" role="group" aria-label="Where to spin from">{SOURCES.map(s=><button key={s.id} type="button" className="muse-edge" aria-pressed={source===s.id} disabled={phase==='spinning'} onClick={()=>{setSource(s.id);setPhase('idle');setWinner(null);setFrame(null);}}>{s.label}<small className="type-numeric">{poolFor(pools,s.id).length}</small></button>)}</div>
   {reason?<div className="muse-upnext-empty"><strong>Nothing to spin here</strong><p>{reason.why}</p><div className="muse-books-actions">{reason.try.map(s=><button key={s} type="button" className="muse-button button-ghost" onClick={()=>setSource(s)}>Spin {SOURCES.find(x=>x.id===s)!.label.toLowerCase()} ({poolFor(pools,s).length})</button>)}</div></div>
   :<>
    <div className="muse-roulette-stage" aria-live="polite">
     <span className="muse-roulette-glow" aria-hidden="true"/>
     {phase==='result'&&<span className="muse-roulette-sparks" aria-hidden="true" key={spins}><MuseStar size={18}/><MuseStar size={12} color="aqua"/><MuseStar size={14} color="pink"/><MuseStar size={10}/></span>}
     <div className="muse-roulette-cover" data-empty={!shown||undefined} data-landed={phase==='result'||undefined} key={phase==='result'?`w${spins}`:'reel'}>{shown?<Cover book={shown}/>:<span aria-hidden="true">?</span>}</div>
     {phase==='result'&&winner?<div className="muse-roulette-result"><strong>{winner.title}</strong><span>{winner.author||'Author not recorded'}</span><StatusChip status={winner.status}/></div>:<p className="muse-roulette-tease">{phase==='spinning'?'…':`${pool.length} ${pool.length===1?'book is':'books are'} in the wheel`}</p>}
    </div>
    <div className="muse-books-actions muse-roulette-actions">
     {phase==='result'&&winner?<><button type="button" className="muse-button button-primary" onClick={()=>onKeep(winner.id)}>Keep this book</button><button type="button" className="muse-button button-ghost" disabled={pool.length<2} title={pool.length<2?'That is the only book here':undefined} onClick={spin}>Spin again</button></>
      :phase==='spinning'?<button type="button" className="muse-button button-ghost" onClick={()=>skip.current?.()}>Skip</button>
      :<button type="button" className="muse-button button-primary muse-roulette-spin" onClick={spin}><MuseIcon name="sparkle" size={15}/>Spin</button>}
     <button type="button" className="muse-button button-ghost" onClick={onClose}>Cancel</button>
    </div></>}
  </div>
 </MuseModal>;
}
