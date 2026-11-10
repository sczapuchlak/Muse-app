'use client';
import {useEffect,useId,useRef,useState,type KeyboardEvent} from 'react';
import {sameEdition,withEdition,type BookCandidate} from '@/lib/books/metadata';
import type {SeriesHit} from '@/lib/books/series-discovery';
import {SeriesBadge,SeriesSearchResults,useSeriesSearch} from '@/components/collections/SeriesSearchResults';
import {savedSeriesBadgesForResult,seriesBadgesForResult,type SavedSeriesBadge} from '@/lib/books/series-search';
import {MuseIcon} from '../MuseIcon';
import './BookSearch.css';

type SearchState={status:'idle'|'loading'|'done'|'error';results:BookCandidate[];message?:string;attribution:string[]};
type EditionState={status:'idle'|'loading'|'done'|'error';editions:BookCandidate[]};
const MIN_QUERY=3,DEBOUNCE_MS=350;

async function post<T>(url:string,body:unknown,signal:AbortSignal):Promise<T>{
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body),signal,cache:'no-store'});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(typeof data?.error==='string'?data.error:'Book search is unavailable right now.');return data as T;
}
/** Thumbnails are untrusted remote images: lazy, no referrer, and a quiet fallback when they fail. */
function Thumb({src,title,size}:{src?:string;title:string;size:'result'|'edition'}){
 const [failed,setFailed]=useState(false);
 return <span className={`muse-book-search-thumb muse-book-search-thumb-${size}`} aria-hidden="true">{src&&!failed?
  // Remote covers stay plain images, matching BookCover: any HTTPS host, with a safe fallback.
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<span>{title.slice(0,1)||'✦'}</span>}</span>;
}
/** A small edition cover for the editor's cover choices. */
export function CoverThumb({src}:{src:string}){
 // eslint-disable-next-line @next/next/no-img-element
 return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer"/>;
}
const metaLine=(c:BookCandidate)=>[c.authors.join(', ')||'Author not listed',c.year,c.formatLabel,c.publisher].filter(Boolean).join(' · ');
const editionLine=(e:BookCandidate)=>[e.formatLabel??'Format not listed',e.year,e.pageCount?`${e.pageCount} pages`:undefined,e.language].filter(Boolean).join(' · ');

/**
 * Finds a book by title, author or ISBN and hands the chosen book (and edition) to the editor.
 * It never saves: the editor stays fully editable and manual entry is always available.
 */
export function BookSearch({onImport,onEditions,onManual,onOpenSeries,savedSeries,onOpenSavedSeries}:{onImport:(book:BookCandidate)=>void;onEditions:(editions:BookCandidate[])=>void;onManual:()=>void;onOpenSeries:(hit:SeriesHit)=>void;savedSeries:SavedSeriesBadge[];onOpenSavedSeries:(id:string)=>void}){
 const id=useId(),listId=`${id}-results`,[query,setQuery]=useState(''),[search,setSearch]=useState<SearchState>({status:'idle',results:[],attribution:[]});
 const [open,setOpen]=useState(false),[active,setActive]=useState(-1),[chosen,setChosen]=useState<BookCandidate|null>(null),[edition,setEdition]=useState<string|null>(null),[editions,setEditions]=useState<EditionState>({status:'idle',editions:[]});
 const catalog=useSeriesSearch(query);
 const searchAbort=useRef<AbortController|null>(null),editionAbort=useRef<AbortController|null>(null),debounce=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(debounce.current)clearTimeout(debounce.current);searchAbort.current?.abort();editionAbort.current?.abort();},[]);
 /** Debounced from typing; a newer query cancels the older request so stale results never replace fresh ones. */
 function changeQuery(value:string){
  setQuery(value);setOpen(true);if(debounce.current)clearTimeout(debounce.current);searchAbort.current?.abort();
  const term=value.trim();if(term.length<MIN_QUERY){setSearch({status:'idle',results:[],attribution:[]});return;}
  debounce.current=setTimeout(()=>{
   const controller=new AbortController();searchAbort.current=controller;setSearch(current=>({...current,status:'loading'}));
   post<{results:BookCandidate[];attribution:string[]}>('/api/books/search',{query:term},controller.signal)
    .then(data=>{if(!controller.signal.aborted){setSearch({status:'done',results:Array.isArray(data.results)?data.results:[],attribution:Array.isArray(data.attribution)?data.attribution:[]});setActive(-1);setOpen(true);}})
    .catch(error=>{if(!controller.signal.aborted){setSearch({status:'error',results:[],attribution:[],message:error instanceof Error?error.message:'Book search is unavailable right now.'});setOpen(true);}});
  },DEBOUNCE_MS);
 }

 function choose(book:BookCandidate){
  setChosen(book);setEdition(book.editionKey??book.key);setOpen(false);setActive(-1);onImport(book);
  editionAbort.current?.abort();const controller=new AbortController();editionAbort.current=controller;
  if(!book.workKey&&!book.isbn13){setEditions({status:'done',editions:[]});onEditions([]);return;}
  setEditions({status:'loading',editions:[]});
  post<{editions:BookCandidate[];description?:string}>('/api/books/editions',{workKey:book.workKey,isbn:book.isbn13,title:book.title,authors:book.authors},controller.signal)
   .then(data=>{if(controller.signal.aborted)return;const raw=Array.isArray(data.editions)?data.editions:[],match=raw.find(e=>sameEdition(book,e)),list=match?[match,...raw.filter(e=>e!==match)]:raw;setEditions({status:'done',editions:list});onEditions(list);
    // A work description only fills a missing one; it is book-level, so it stays across edition changes.
    const described=!book.description&&typeof data.description==='string'&&data.description?{...book,description:data.description}:book;if(described!==book)setChosen(described);
    // The same edition's record can only fill gaps (often format or page count); it never changes the book.
    if(match){setEdition(match.key);onImport(withEdition(described,match));}else if(described!==book)onImport(described);})
   .catch(()=>{if(!controller.signal.aborted){setEditions({status:'error',editions:[]});onEditions([]);}});
 }
 function chooseEdition(next:BookCandidate){if(!chosen)return;setEdition(next.key);onImport(withEdition(chosen,next));}
 function onKey(event:KeyboardEvent<HTMLInputElement>){
  const count=search.results.length;
  if(event.key==='ArrowDown'&&count){event.preventDefault();setOpen(true);setActive(i=>(i+1)%count);}
  else if(event.key==='ArrowUp'&&count){event.preventDefault();setOpen(true);setActive(i=>(i<=0?count:i)-1);}
  else if(event.key==='Enter'&&open&&active>=0&&search.results[active]){event.preventDefault();choose(search.results[active]);}
  else if(event.key==='Escape'&&open){event.preventDefault();setOpen(false);setActive(-1);}
 }
 const status=search.status==='loading'?'Searching…':search.status==='error'?search.message??'Book search is unavailable right now.':search.status==='done'?(search.results.length?`${search.results.length} ${search.results.length===1?'match':'matches'}`:'No matches yet. Try another title, the author, or an ISBN.'):query.trim()&&query.trim().length<MIN_QUERY?'Keep typing…':'';
 const showList=open&&search.status!=='idle';
 const savedSeriesResults=[...new Map(savedSeries.filter(row=>query.trim().length>=MIN_QUERY&&row.title.toLowerCase().includes(query.trim().toLowerCase())).map(row=>[row.seriesId,{id:row.seriesId,title:row.title,author:row.bookAuthor,primaryCount:row.primaryCount,totalCount:row.totalCount}])).values()];
 return <section className="muse-book-search" aria-label="Find your book">
  <label className="muse-book-search-field" htmlFor={`${id}-input`}><span>Find your book <small>title, author, or ISBN</small></span>
   <span className="muse-book-search-input"><MuseIcon name="search" size={16}/><input id={`${id}-input`} type="search" role="combobox" aria-autocomplete="list" aria-expanded={showList} aria-controls={listId} aria-activedescendant={showList&&active>=0?`${listId}-${active}`:undefined} autoComplete="off" placeholder="Half City, Kate Golden, or 978…" value={query} onChange={e=>changeQuery(e.target.value)} onKeyDown={onKey} onFocus={()=>search.results.length&&setOpen(true)}/></span>
  </label>
  <p className="small-label muse-book-search-status" role="status" aria-live="polite">{status}</p>
  {showList&&search.results.length>0&&<ul className="muse-book-search-results" id={listId} role="listbox" aria-label="Matching books">{search.results.map((book,index)=><li key={book.key} id={`${listId}-${index}`} role="option" aria-selected={index===active} className="muse-book-search-result" onMouseDown={e=>{if(!(e.target as HTMLElement).closest('button'))e.preventDefault();}} onClick={()=>choose(book)} onMouseEnter={()=>setActive(index)}>
   <Thumb src={book.thumbnailUrl??book.coverUrl} title={book.title} size="result"/><span className="muse-book-search-copy"><strong>{book.title}</strong><span>{metaLine(book)}</span>{(()=>{const saved=savedSeriesBadgesForResult(book.title,book.authors,savedSeries);return saved.length?saved.map(badge=><SeriesBadge key={badge.seriesId} position={badge.position} series={badge} onOpen={()=>onOpenSavedSeries(badge.seriesId)}/>):seriesBadgesForResult(book.title,book.authors,catalog.bookSeries).map(match=><SeriesBadge key={`${match.bookId}:${match.series.id}`} position={match.position} series={match.series} onOpen={()=>onOpenSeries(match.series)}/>);})()}{book.editionCount&&book.editionCount>1?<small>{book.editionCount} editions</small>:null}</span></li>)}</ul>}
  {open&&<SeriesSearchResults hits={catalog.results} saved={savedSeriesResults} loading={catalog.loading} onOpen={onOpenSeries} onOpenSaved={onOpenSavedSeries}/>}
  {search.attribution.length>0&&showList&&<p className="small-label muse-book-search-credit">Book data from {search.attribution.join(' and ')}</p>}
  {chosen&&editions.status==='loading'&&<p className="small-label" role="status">Looking for other editions…</p>}
  {chosen&&editions.editions.length>1&&<div className="muse-book-editions" role="group" aria-label="Choose an edition"><p className="small-label">Choose an edition <span>· covers, pages and ISBN follow your choice</span></p>
   <div className="muse-book-editions-row">{editions.editions.map(e=><button key={e.key} type="button" className="muse-book-edition muse-edge" aria-pressed={edition===e.key} aria-label={`${e.title}, ${editionLine(e)}`} onClick={()=>chooseEdition(e)}><Thumb src={e.thumbnailUrl} title={e.title} size="edition"/><span>{e.formatLabel??'Edition'}</span><small>{[e.year,e.pageCount?`${e.pageCount} pp`:undefined].filter(Boolean).join(' · ')||'Details not listed'}</small></button>)}</div></div>}
  {chosen&&editions.status==='error'&&<p className="small-label">Other editions couldn’t load. The details below are still yours to edit.</p>}
  <button type="button" className="text-button muse-book-search-manual" onClick={()=>{setOpen(false);onManual();}}>Can’t find your book? Add manually →</button>
 </section>;
}
