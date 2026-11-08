'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {paginate,type DreamSymbol} from '@/lib/whimsy/dreams';
import {categoryGlyph,symbolGlyph} from './DreamDiary';
import {DreamPager,DreamSearch} from './parts';

const PAGE=24;
/** #98: the encyclopedia shows one interpretation source (HeartYearning) plus your own symbols; no source picker.
 * Other symbols are not deleted: their pages and dream entries still resolve by id. */
const libraryProviders=new Set(['heartyearning','personal']);
const letterOf=(name:string)=>{const c=name.replace(/^(a|an|the)\s+/i,'').trim()[0]?.toUpperCase()??'#';return /[A-Z]/.test(c)?c:'#';};

/** Symbol Encyclopedia, the Library of Symbols: search, categories, A–Z, sources and paged compact results. */
export function DreamLibrary({symbols,categories,dreamCounts,search,setSearch,category,setCategory,symbolHref,addSymbol,credit}:{symbols:DreamSymbol[];categories:string[];dreamCounts:Map<string,number>;search:string;setSearch:(v:string)=>void;category:string;setCategory:(v:string)=>void;symbolHref:(id:string)=>string;addSymbol:ReactNode;credit:ReactNode}){
 const [letter,setLetter]=useState(''),[pageNo,setPageNo]=useState(0),field=useRef<HTMLDivElement>(null);
 useEffect(()=>{const onKey=(e:KeyboardEvent)=>{const t=e.target as HTMLElement;if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(t.tagName)&&!t.isContentEditable){e.preventDefault();field.current?.querySelector('input')?.focus();}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[]);
 const q=search.trim().toLowerCase();
 const bySource=symbols.filter(s=>libraryProviders.has(s.provider));
 const matchesText=(s:DreamSymbol)=>!q||[s.name,s.description,...s.aliases,...s.associations].join(' ').toLowerCase().includes(q);
 const inCategory=bySource.filter(s=>(!category||s.category===category)&&matchesText(s));
 const results=inCategory.filter(s=>!letter||letterOf(s.name)===letter);
 const page=paginate(results,pageNo,PAGE),letters=new Set(inCategory.map(s=>letterOf(s.name)));
 const reset=(fn:()=>void)=>{fn();setPageNo(0);};
 const yours=[...dreamCounts].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([id,n])=>({symbol:symbols.find(s=>s.id===id),n})).filter((x):x is {symbol:DreamSymbol;n:number}=>!!x.symbol);
 const browsing=!q&&!category&&!letter&&page.page===0;
 return <section className="muse-dream-section muse-dream-library" aria-label="Symbol Encyclopedia">
  <div className="muse-dream-library-hero">
   <p className="muse-kicker muse-dream-library-kicker">An enchanted field guide</p>
   <h3>{bySource.length.toLocaleString('en-US')} symbols to wander through</h3>
   <p className="small-label">HeartYearning’s interpretations are possibilities for curiosity, not fixed meanings. Your personal meanings stay private.</p>
   <div ref={field}><DreamSearch label="Search symbols" value={search} onChange={v=>reset(()=>setSearch(v))} placeholder="Search a symbol, a feeling, an association…  (press / )" count={results.length} noun={['symbol','symbols']}/></div>
  </div>
  <div className="muse-chip-row muse-dream-chip-row" data-scroll role="group" aria-label="Symbol category">
   <button type="button" aria-pressed={!category} onClick={()=>reset(()=>setCategory(''))}>All <small>{bySource.filter(matchesText).length}</small></button>
   {categories.map(c=>{const n=bySource.filter(s=>s.category===c&&matchesText(s)).length;return n||category===c?<button type="button" key={c} aria-pressed={category===c} onClick={()=>reset(()=>setCategory(category===c?'':c))}><span aria-hidden="true">{categoryGlyph[c]??'✧'}</span>{c} <small>{n}</small></button>:null;})}
  </div>
  <div className="muse-dream-library-tools">
   <div className="muse-dream-alphabet" role="group" aria-label="Filter by first letter">{'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l=><button type="button" key={l} disabled={!letters.has(l)} aria-pressed={letter===l} onClick={()=>reset(()=>setLetter(letter===l?'':l))}>{l}</button>)}</div>
  </div>
  {browsing&&yours.length>0&&<section className="muse-dream-shelf" aria-label="Symbols from your dreams"><h4>From your dreams</h4><div>{yours.map(({symbol,n})=><Link key={symbol.id} href={symbolHref(symbol.id)} className="muse-dream-artifact"><span aria-hidden="true">{symbolGlyph(symbol)}</span>{symbol.name}<small>{n}</small></Link>)}</div></section>}
  {addSymbol}
  {results.length?<ul className="muse-dream-results muse-dream-reveal" key={`${page.page}-${q}-${category}-${letter}`}>{page.items.map(s=>{const n=dreamCounts.get(s.id)??0;return <li key={s.id}><Link href={symbolHref(s.id)} className="muse-dream-result">
    <span className="muse-dream-result-glyph" aria-hidden="true">{symbolGlyph(s)}</span>
    <span className="muse-dream-result-body"><strong>{s.name}</strong><span className="muse-dream-result-desc">{s.description||'Your own dream symbol.'}</span><span className="muse-dream-result-meta"><span aria-hidden="true">{categoryGlyph[s.category]??'✧'}</span> {s.category} · {s.provider==='muse'?'Muse':s.provider==='personal'?'Yours':'HeartYearning'}{n>0&&<b> · ✦ in {n} {n===1?'dream':'dreams'}</b>}</span></span>
   </Link></li>;})}</ul>
   :<p className="muse-dream-quiet">No symbols match {q?`“${search.trim()}”`:'these filters'}. Try a broader word, or add it as your own symbol.</p>}
  <DreamPager page={page} onPage={n=>{setPageNo(n);document.querySelector('.muse-dream-library')?.scrollIntoView({block:'start',behavior:'smooth'});}} label="Symbol pages"/>
  {credit}
 </section>;
}
