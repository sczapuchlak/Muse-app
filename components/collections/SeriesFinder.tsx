'use client';
import {useEffect,useRef,useState} from 'react';
import {MuseModal} from '@/components/MuseModal';
import type {SeriesHit,SeriesCatalog} from '@/lib/books/series-discovery';
import {useCollectionsData} from './CollectionsData';
import {SeriesLibrary} from './SeriesLibrary';

/** A contextual Series Detail opened from a book badge or series search result. */
export function SeriesFinder({onClose,initialHit,initialSeriesId}:{onClose:()=>void;initialHit?:SeriesHit|null;initialSeriesId?:string|null}){
 const {records,loaded}=useCollectionsData(),opened=useRef(false);
 const [selected,setSelected]=useState<string|null>(initialSeriesId??null),[catalog,setCatalog]=useState<SeriesCatalog|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  if(initialSeriesId||!initialHit||!loaded||opened.current)return;
  opened.current=true;let cancelled=false;
  (async()=>{try{
   const exact=records.series.find(series=>series.catalog_source===initialHit.source&&series.catalog_id===initialHit.id);
   const titleMatches=records.series.filter(series=>series.kind==='book'&&series.title.trim().toLowerCase()===initialHit.title.trim().toLowerCase());
   const existing=exact??(titleMatches.length===1?titleMatches[0]:null);
   if(existing){if(!cancelled)setSelected(existing.id);return;}
   const response=await fetch('/api/books/series',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:initialHit.title,author:initialHit.author,source:initialHit.source,sourceId:initialHit.id})});
   if(!response.ok)throw Error('The series catalog is unavailable right now. Try again shortly.');
   const data=await response.json() as {catalog:SeriesCatalog|null};
   if(!data.catalog)throw Error('No installments are available for this series yet.');
   if(data.catalog.source!==initialHit.source||data.catalog.id!==initialHit.id)throw Error('The series catalog did not match the selected result.');
   if(!cancelled)setCatalog(data.catalog);
  }catch(cause){if(!cancelled)setError(cause instanceof Error?cause.message:'Could not open series.');}})();
  return()=>{cancelled=true;};
 // Initial selection belongs to this modal mount.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[initialHit,initialSeriesId,loaded]);
 return <MuseModal id="books-series-detail" label="Series detail" title={selected?'Series':initialHit?.title??'Series'} returnFocus={null} onClose={onClose} size="tall">
  {selected||catalog?<SeriesLibrary key={selected??`${catalog!.source}:${catalog!.id}`} initialSeriesId={selected} catalog={catalog} embedded onBack={onClose} backLabel="Back to search"/>:error?<div role="alert"><p>{error}</p><button type="button" className="muse-button button-ghost" onClick={onClose}>Back to search</button></div>:<p role="status">Opening series…</p>}
 </MuseModal>;
}
