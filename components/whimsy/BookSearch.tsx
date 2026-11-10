'use client';
import {Fragment,useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {sameEdition,withEdition,type BookCandidate} from '@/lib/books/metadata';
import type {BookSeriesHit,SeriesHit} from '@/lib/books/series-discovery';
import {useSeriesSearch,type CatalogSearch} from '@/components/collections/SeriesSearchResults';
import {seriesBadgesForResult} from '@/lib/books/series-search';
import {savedSeriesFor} from '@/lib/books/series-save';
import {catalogSeriesKey} from '@/lib/books/return-nav';
import {existingLibraryBook,type QuickStatus} from '@/lib/books/add-book';
import {useCollectionsData} from '@/components/collections/CollectionsData';
import {SeriesCover} from '@/components/collections/SeriesCover';
import {useWhimsyData} from './WhimsyData';
import {QuickAddButton} from './QuickAdd';
import {MuseIcon} from '../MuseIcon';
import './BookSearch.css';

type SearchState={status:'idle'|'loading'|'done'|'error';results:BookCandidate[];message?:string;attribution:string[]};
type EditionState={status:'idle'|'loading'|'done'|'error';editions:BookCandidate[]};
type Tab='books'|'series';
type Snapshot={at:number;query:string;tab:Tab;search:SearchState;catalog:CatalogSearch;expanded:string|null};
const MIN_QUERY=3,DEBOUNCE_MS=350,SNAPSHOT_KEY='muse.books.add-search',SNAPSHOT_TTL=45*60_000;
const readSnapshot=():Snapshot|null=>{try{const value=JSON.parse(sessionStorage.getItem(SNAPSHOT_KEY)??'null') as Snapshot|null;return value&&Date.now()-value.at<SNAPSHOT_TTL?value:null;}catch{return null;}};
/** Forget the Add Book search once the dialog is closed on purpose. */
export function clearBookSearch(){try{sessionStorage.removeItem(SNAPSHOT_KEY);}catch{/* nothing kept */}}

async function post<T>(url:string,body:unknown,signal:AbortSignal):Promise<T>{
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body),signal,cache:'no-store'});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(typeof data?.error==='string'?data.error:'Book search is unavailable right now.');return data as T;
}
/** Thumbnails are untrusted remote images: lazy, no referrer, and a quiet fallback when they fail. */
function Thumb({src,title,size}:{src?:string;title:string;size:'result'|'edition'}){
 const [failed,setFailed]=useState(false);
 return <span className={`muse-book-search-thumb muse-book-search-thumb-${size}`} aria-hidden="true">{src&&!failed?
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<span>{title.slice(0,1)||'✦'}</span>}</span>;
}
/** A small edition cover for the editor's cover choices. */
export function CoverThumb({src}:{src:string}){
 // eslint-disable-next-line @next/next/no-img-element
 return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer"/>;
}
/** The words the reader typed, gently lit inside a title. */
function Highlight({text,query}:{text:string;query:string}):ReactNode{
 const quiet=new Set(['the','and','for','with','from','into']);
 const words=[...new Set(query.toLowerCase().split(/\s+/).filter(w=>w.length>=3&&!quiet.has(w)).map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))];
 if(!words.length)return text;
 const parts=text.split(new RegExp(`(${words.join('|')})`,'gi'));
 return parts.map((part,index)=>index%2?<mark key={index}>{part}</mark>:<Fragment key={index}>{part}</Fragment>);
}
const facts=(c:BookCandidate)=>[c.year,c.pageCount?`${c.pageCount} pages`:null,c.formatLabel,c.publisher].filter(Boolean).join(' · ');
const editionLine=(e:BookCandidate)=>[e.formatLabel??'Format not listed',e.year,e.pageCount?`${e.pageCount} pages`:undefined,e.language].filter(Boolean).join(' · ');

/**
 * Books search for Add Book (#136): one field for books and series. Results carry their series, quick add and
 * a preview; choosing "Add with details" hands the book (and its editions) to the editor. It never saves by
 * itself: Quick Add and the editor do.
 */
export function BookSearch({stage,onImport,onEditions,onManual,onReview,onBackToSearch,onQuickAdd,quickPending,onOpenSeries,onOpenBook}:{stage:'search'|'review';onImport:(book:BookCandidate)=>void;onEditions:(editions:BookCandidate[])=>void;onManual:()=>void;onReview:()=>void;onBackToSearch:()=>void;onQuickAdd:(candidate:BookCandidate,status:QuickStatus,hit?:BookSeriesHit)=>void;quickPending:string|null;onOpenSeries:(key:string,title:string)=>void;onOpenBook:(id:string)=>void}){
 const id=useId(),inputRef=useRef<HTMLInputElement>(null);
 const [initial]=useState(()=>typeof window==='undefined'?null:readSnapshot());
 const [query,setQuery]=useState(initial?.query??''),[tab,setTab]=useState<Tab>(initial?.tab??'books'),[search,setSearch]=useState<SearchState>(initial?.search??{status:'idle',results:[],attribution:[]});
 const [expanded,setExpanded]=useState<string|null>(initial?.expanded??null),[chosen,setChosen]=useState<BookCandidate|null>(null),[edition,setEdition]=useState<string|null>(null),[editions,setEditions]=useState<EditionState>({status:'idle',editions:[]});
 const catalog=useSeriesSearch(query,initial?.catalog);
 const {records:whimsy}=useWhimsyData(),{records}=useCollectionsData(),books=(whimsy?.books??[]).filter(b=>!b.archivedAt);
 const searchAbort=useRef<AbortController|null>(null),editionAbort=useRef<AbortController|null>(null),debounce=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(debounce.current)clearTimeout(debounce.current);searchAbort.current?.abort();editionAbort.current?.abort();},[]);
 useEffect(()=>{if(stage==='search'&&!initial?.query)inputRef.current?.focus({preventScroll:true});},[stage,initial]);
 useEffect(()=>{try{sessionStorage.setItem(SNAPSHOT_KEY,JSON.stringify({at:Date.now(),query,tab,search:{...search,status:search.status==='loading'?'idle':search.status},catalog:catalog.data,expanded}));}catch{/* the search simply starts fresh */}},[query,tab,search,catalog.data,expanded]);
 /** Debounced from typing; a newer query cancels the older request so stale results never replace fresh ones. */
 function changeQuery(value:string){
  setQuery(value);setExpanded(null);if(debounce.current)clearTimeout(debounce.current);searchAbort.current?.abort();
  const term=value.trim();if(term.length<MIN_QUERY){setSearch({status:'idle',results:[],attribution:[]});return;}
  debounce.current=setTimeout(()=>{
   const controller=new AbortController();searchAbort.current=controller;setSearch(current=>({...current,status:'loading'}));
   post<{results:BookCandidate[];attribution:string[]}>('/api/books/search',{query:term},controller.signal)
    .then(data=>{if(!controller.signal.aborted)setSearch({status:'done',results:Array.isArray(data.results)?data.results:[],attribution:Array.isArray(data.attribution)?data.attribution:[]});})
    .catch(error=>{if(!controller.signal.aborted)setSearch({status:'error',results:[],attribution:[],message:error instanceof Error?error.message:'Book search is unavailable right now.'});});
  },DEBOUNCE_MS);
 }
 /** "Add with details": the editor receives this book; editions load so the reader can pick cover and pages. */
 function review(book:BookCandidate){
  setChosen(book);setEdition(book.editionKey??book.key);onImport(book);onReview();
  editionAbort.current?.abort();const controller=new AbortController();editionAbort.current=controller;
  if(!book.workKey&&!book.isbn13){setEditions({status:'done',editions:[]});onEditions([]);return;}
  setEditions({status:'loading',editions:[]});
  post<{editions:BookCandidate[];description?:string}>('/api/books/editions',{workKey:book.workKey,isbn:book.isbn13,title:book.title,authors:book.authors},controller.signal)
   .then(data=>{if(controller.signal.aborted)return;const raw=Array.isArray(data.editions)?data.editions:[],match=raw.find(e=>sameEdition(book,e)),list=match?[match,...raw.filter(e=>e!==match)]:raw;setEditions({status:'done',editions:list});onEditions(list);
    const described=!book.description&&typeof data.description==='string'&&data.description?{...book,description:data.description}:book;if(described!==book)setChosen(described);
    if(match){setEdition(match.key);onImport(withEdition(described,match));}else if(described!==book)onImport(described);})
   .catch(()=>{if(!controller.signal.aborted){setEditions({status:'error',editions:[]});onEditions([]);}});
 }
 function chooseEdition(next:BookCandidate){if(!chosen)return;setEdition(next.key);onImport(withEdition(chosen,next));}
 const term=query.trim(),ready=term.length>=MIN_QUERY;
 const ownedSeries=(book:{id:string})=>records.seriesMembers.filter(m=>m.book_id===book.id&&!m.hidden).map(m=>({member:m,series:records.series.find(s=>s.id===m.series_id)})).filter(x=>x.series&&x.series.kind==='book');
 const openHit=(hit:SeriesHit)=>{const saved=savedSeriesFor({source:hit.source,id:hit.id,title:hit.title},records.series);onOpenSeries(saved?.id??catalogSeriesKey(hit.source,hit.id),hit.title);};
 const savedSeriesRows=ready?records.series.filter(s=>s.kind==='book'&&s.title.toLowerCase().includes(term.toLowerCase())):[];
 const catalogRows=catalog.results.filter(hit=>!savedSeriesRows.some(s=>(s.catalog_source===hit.source&&s.catalog_id===hit.id)));
 const seriesCount=savedSeriesRows.length+catalogRows.length;
 const status=search.status==='loading'?'Searching…':search.status==='error'?search.message??'Book search is unavailable right now.':search.status==='done'?(search.results.length?'':'No books match yet. Try the author, a shorter title, or an ISBN.'):term&&!ready?'Keep typing…':'';

 if(stage==='review')return <section className="muse-book-search" data-stage="review" aria-label="Your chosen book">
  {chosen&&<div className="muse-book-search-chosen"><Thumb src={chosen.thumbnailUrl??chosen.coverUrl} title={chosen.title} size="result"/><span className="muse-book-search-copy"><strong>{chosen.title}</strong><span>{chosen.authors.join(', ')||'Author not listed'}</span></span><button type="button" className="text-button" onClick={()=>{setChosen(null);setEditions({status:'idle',editions:[]});onBackToSearch();}}>Back to results</button></div>}
  {chosen&&editions.status==='loading'&&<p className="small-label" role="status">Looking for other editions…</p>}
  {chosen&&editions.editions.length>1&&<div className="muse-book-editions" role="group" aria-label="Choose an edition"><p className="small-label">Choose an edition <span>· covers, pages and ISBN follow your choice</span></p>
   <div className="muse-book-editions-row">{editions.editions.map(e=><button key={e.key} type="button" className="muse-book-edition muse-edge" aria-pressed={edition===e.key} aria-label={`${e.title}, ${editionLine(e)}`} onClick={()=>chooseEdition(e)}><Thumb src={e.thumbnailUrl} title={e.title} size="edition"/><span>{e.formatLabel??'Edition'}</span><small>{[e.year,e.pageCount?`${e.pageCount} pp`:undefined].filter(Boolean).join(' · ')||'Details not listed'}</small></button>)}</div></div>}
  {chosen&&editions.status==='error'&&<p className="small-label">Other editions couldn’t load. The details below are still yours to edit.</p>}
 </section>;

 return <section className="muse-book-search" data-stage="search" aria-label="Find a book or series">
  <label className="muse-book-search-field" htmlFor={`${id}-input`}><span className="sr-only">Search books and series</span>
   <span className="muse-book-search-input"><MuseIcon name="search" size={18}/><input ref={inputRef} id={`${id}-input`} type="search" autoComplete="off" enterKeyHint="search" placeholder="Title, author, series, or ISBN" value={query} onChange={e=>changeQuery(e.target.value)}/>{query&&<button type="button" className="muse-book-search-clear" aria-label="Clear search" onClick={()=>{changeQuery('');inputRef.current?.focus();}}><MuseIcon name="close" size={15}/></button>}</span>
  </label>
  {ready&&<div className="muse-book-search-switch" role="tablist" aria-label="Show">
   {(['books','series'] as const).map(id=><button key={id} type="button" role="tab" aria-selected={tab===id} onClick={()=>setTab(id)}>{id==='books'?'Books':'Series'}<span className="type-numeric">{id==='books'?(search.status==='done'?search.results.length:search.status==='loading'?'…':''):(catalog.loading&&!seriesCount?'…':seriesCount||'')}</span></button>)}
  </div>}
  {!ready&&!term&&<div className="muse-book-search-intro"><MuseIcon name="book" size={22}/><p>Search for a book to add it, or a series to explore it.<span>Books show where they sit in their series.</span></p></div>}
  {tab==='books'&&<>
   {status&&<p className="small-label muse-book-search-status" role="status" aria-live="polite">{status}</p>}
   {search.status==='loading'&&!search.results.length&&<ul className="muse-book-results" aria-hidden="true">{[0,1,2].map(i=><li key={i} className="muse-book-result muse-book-result-skeleton"><span/><span><i/><i/><i/></span></li>)}</ul>}
   {ready&&search.results.length>0&&<ul className="muse-book-results" aria-label="Matching books" data-loading={search.status==='loading'||undefined}>{search.results.map(book=>{
    const owned=existingLibraryBook(books,book),saved=owned?ownedSeries(owned):[];
    const hits=saved.length?[]:seriesBadgesForResult(book.title,book.authors,catalog.bookSeries);
    const open=expanded===book.key;
    return <li key={book.key} className="muse-book-result" data-expanded={open||undefined}>
     <div className="muse-book-result-row">
      <button type="button" className="muse-book-result-main" aria-expanded={open} onClick={()=>setExpanded(open?null:book.key)}>
       <Thumb src={book.thumbnailUrl??book.coverUrl} title={book.title} size="result"/>
       <span className="muse-book-search-copy">
        <strong><Highlight text={book.title} query={term}/></strong>
        <span>{book.authors.length?`by ${book.authors.join(', ')}`:'Author not listed'}</span>
        {facts(book)&&<small>{facts(book)}</small>}
       </span>
      </button>
      <span className="muse-book-result-action">{owned?<button type="button" className="muse-book-result-owned" onClick={()=>onOpenBook(owned.id)}><MuseIcon name="check" size={14}/>On your shelf</button>:<QuickAddButton label={book.title} busy={quickPending===book.key} disabled={!!quickPending&&quickPending!==book.key} onAdd={status=>onQuickAdd(book,status,hits[0])}/>}</span>
     </div>
     {(saved.length>0||hits.length>0)&&<div className="muse-book-result-series">{saved.map(({member,series})=><button key={member.id} type="button" className="muse-search-series-badge" onClick={()=>onOpenSeries(series!.id,series!.title)}><MuseIcon name="series" size={13}/>{member.position_known?`#${Number(member.sequence)}${series!.catalog_primary_count?` of ${series!.catalog_primary_count}`:''} in `:''}{series!.title}</button>)}{hits.slice(0,1).map(hit=><button key={`${hit.bookId}:${hit.series.id}`} type="button" className="muse-search-series-badge" onClick={()=>openHit(hit.series)}><MuseIcon name="series" size={13}/>{hit.position!==null?`#${hit.position}${hit.series.primaryCount!==null?` of ${hit.series.primaryCount}`:''} in `:'Part of '}{hit.series.title}</button>)}</div>}
     {open&&<div className="muse-book-result-preview">
      {book.description?<p className="type-reading">{book.description.length>420?`${book.description.slice(0,420).replace(/\s+\S*$/,'')}…`:book.description}</p>:<p className="muse-book-result-preview-empty">No synopsis from this source. You can add one after saving.</p>}
      <div className="muse-book-result-preview-actions">{book.editionCount&&book.editionCount>1?<span className="small-label">{book.editionCount} editions</span>:null}{!owned&&<button type="button" className="muse-button button-ghost" onClick={()=>review(book)}>Add with details…</button>}</div>
     </div>}
    </li>;})}</ul>}
   {search.attribution.length>0&&search.results.length>0&&<p className="small-label muse-book-search-credit">Book data from {search.attribution.join(' and ')}{catalog.bookSeries.length?' · series from Hardcover':''}</p>}
  </>}
  {tab==='series'&&ready&&<>
   {!seriesCount&&!catalog.loading&&<p className="small-label muse-book-search-status" role="status">No series by that name yet. Try the series’ own name, like “Throne of Glass”.</p>}
   {catalog.loading&&!seriesCount&&<ul className="muse-series-results" aria-hidden="true">{[0,1].map(i=><li key={i} className="muse-book-result-skeleton"><span/><span><i/><i/></span></li>)}</ul>}
   {seriesCount>0&&<ul className="muse-series-results" aria-label="Matching series">
    {savedSeriesRows.map(series=>{const members=records.seriesMembers.filter(m=>m.series_id===series.id&&!m.hidden&&m.role!=='collection').sort((a,b)=>a.sequence-b.sequence),covers=members.map(m=>books.find(b=>b.id===m.book_id)?.coverUrl||m.catalog_cover_url).filter((c):c is string=>!!c).slice(0,3),owned=members.filter(m=>m.book_id).length;
     return <li key={series.id}><button type="button" onClick={()=>onOpenSeries(series.id,series.title)}><SeriesFan covers={covers} title={series.title}/><span className="muse-series-result-copy"><strong><Highlight text={series.title} query={term}/></strong><span>{series.catalog_author?`by ${series.catalog_author}`:'Your series'}</span><small>{series.catalog_primary_count??members.length} books · {owned} on your shelf</small></span><MuseIcon name="arrow" size={16}/></button></li>;})}
    {catalogRows.map(hit=><li key={`${hit.source}:${hit.id}`}><button type="button" onClick={()=>openHit(hit)}><SeriesFan covers={hit.covers??(hit.coverUrl?[hit.coverUrl]:[])} title={hit.title}/><span className="muse-series-result-copy"><strong><Highlight text={hit.title} query={term}/></strong><span>{hit.author?`by ${hit.author}`:'Author not listed'}</span><small>{[hit.primaryCount!==null?`${hit.primaryCount} books`:hit.totalCount!==null?`${hit.totalCount} entries`:null,hit.sampleTitles?.length?hit.sampleTitles.join(', '):null].filter(Boolean).join(' · ')}</small></span><MuseIcon name="arrow" size={16}/></button></li>)}
   </ul>}
  </>}
  <button type="button" className="text-button muse-book-search-manual" onClick={onManual}>Can’t find it? Add it by hand <MuseIcon name="arrow" size={14}/></button>
 </section>;
}
function SeriesFan({covers,title}:{covers:string[];title:string}){
 return <span className="muse-series-fan" aria-hidden="true">{covers.length?covers.slice(0,3).map((cover,index)=><span key={index} style={{['--i' as string]:index}}><SeriesCover title={title} coverUrl={cover} size="sm"/></span>):<span><SeriesCover title={title} coverUrl={null} size="sm"/></span>}</span>;
}
