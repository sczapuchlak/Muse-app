'use client';
import {useEffect,useRef,useState} from 'react';
import {queryIsbn,type BookCandidate} from '@/lib/books/metadata';

/** Importer-owned search over the same authenticated catalog endpoints as Add Book. No writes before confirmation. */
export function ImportEditionReview({title,isbn,onIsbn,onChoose}:{title:string;isbn?:string;onIsbn:(isbn:string)=>void;onChoose:(candidate:BookCandidate)=>void}){
 const [query,setQuery]=useState(title),[isbnDraft,setIsbnDraft]=useState(isbn??''),[results,setResults]=useState<BookCandidate[]>([]),[selected,setSelected]=useState<BookCandidate|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=useRef<AbortController|null>(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 async function search(editions?:BookCandidate){
  request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setError('');setSelected(null);
  try{const response=await fetch(editions?'/api/books/editions':'/api/books/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(editions?{workKey:editions.workKey,isbn:editions.isbn13??editions.isbn10,title:editions.title,authors:editions.authors}:{query}),signal:controller.signal});const data=await response.json();if(!response.ok)throw Error(data.error??'Catalog unavailable. Keep imported information or try again.');setResults(data.results??data.editions??[]);}catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Catalog unavailable.');}finally{if(request.current===controller)setBusy(false);}
 }
 return <details className="muse-import-edition"><summary>Fix ISBN / Find edition</summary><div className="muse-book-transfer-review">
 <label>Correct ISBN<input value={isbnDraft} onChange={e=>setIsbnDraft(e.target.value)} maxLength={80}/></label><button type="button" className="muse-button button-ghost" disabled={!queryIsbn(isbnDraft)} onClick={()=>{const value=queryIsbn(isbnDraft);if(value){onIsbn(value);setError('');}}}>Use verified ISBN</button>
 <p className="muse-book-transfer-muted">ISBN checksum verification confirms the identifier format. Catalog results let you confirm the book and edition. Rounded spreadsheet numbers cannot be recovered safely.</p>
 <label>Search title, author or ISBN<input value={query} onChange={e=>setQuery(e.target.value)} maxLength={120}/></label><button type="button" className="muse-button" disabled={busy||query.trim().length<2} onClick={()=>void search()}>{busy?'Searching…':'Search catalog'}</button>
 {error&&<p role="alert">{error}</p>}<ul className="muse-import-edition-results">{results.slice(0,20).map(c=><li key={c.key}><button type="button" className="muse-button button-ghost" onClick={()=>setSelected(c)}>{c.title} · {c.authors.join(', ')} · {c.publisher??'Publisher unknown'} · {c.isbn13??c.isbn10??'No ISBN'}</button><button type="button" className="text-button" disabled={busy} onClick={()=>void search(c)}>Other editions</button></li>)}</ul>
 {selected&&<div className="muse-book-transfer-note"><strong>{selected.title}</strong><p>{selected.authors.join(', ')} · {selected.publisher} · {selected.publishedDate} · {selected.pageCount?`${selected.pageCount} pages`:''}</p><p>{selected.description??'No description supplied.'}</p><p>Existing Muse fields remain protected. This selection supplies metadata for your final preview; nothing is saved yet.</p><button type="button" className="muse-button" onClick={()=>{onChoose(selected);setSelected(null);}}>Accept edition for preview</button></div>}
 </div></details>;
}
