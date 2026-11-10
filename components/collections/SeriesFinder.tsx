'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {MuseModal} from '@/components/MuseModal';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import type {SeriesHit,SeriesCatalog} from '@/lib/books/series-discovery';
import {saveDiscoveredSeries} from '@/lib/books/series-save';
import {collectionsChanged,useCollectionsData} from './CollectionsData';
import {useWhimsyData} from '@/components/whimsy/WhimsyData';
import {SeriesLibrary} from './SeriesLibrary';

/** A contextual Series Detail opened from a book badge or series search result. */
export function SeriesFinder({onClose,initialHit,initialSeriesId}:{onClose:()=>void;initialHit?:SeriesHit|null;initialSeriesId?:string|null}){
 const {records,userId,retry,loaded}=useCollectionsData(),{records:whimsy,status:whimsyStatus}=useWhimsyData(),client=useMemo(()=>createMuseBrowserClient(),[]),opened=useRef(false);
 const [selected,setSelected]=useState<string|null>(initialSeriesId??null),[error,setError]=useState('');
 useEffect(()=>{
  if(initialSeriesId||!initialHit||!loaded||!whimsyStatus.loaded||opened.current)return;
  opened.current=true;let cancelled=false;
  (async()=>{try{
   const existing=records.series.find(series=>series.catalog_source==='hardcover'&&series.catalog_id===initialHit.id);
   if(existing){if(!cancelled)setSelected(existing.id);return;}
   const response=await fetch('/api/books/series',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:initialHit.title,author:initialHit.author,source:initialHit.source,sourceId:initialHit.id})});
   if(!response.ok)throw Error('This series could not be opened.');
   const data=await response.json() as {catalog:SeriesCatalog|null};
   if(!data.catalog)throw Error('No installments are available for this series yet.');
   const saved=await saveDiscoveredSeries(client,userId,data.catalog,records,whimsy?.books??[]);
   collectionsChanged();await retry();if(!cancelled)setSelected(saved.id);
  }catch(cause){if(!cancelled)setError(cause instanceof Error?cause.message:'Could not open series.');}})();
  return()=>{cancelled=true;};
 // Initial selection belongs to this modal mount.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[initialHit,initialSeriesId,loaded,whimsyStatus.loaded]);
 return <MuseModal id="books-series-detail" label="Series detail" title={selected?'Series':initialHit?.title??'Series'} returnFocus={null} onClose={onClose} size="tall">
  {selected?<SeriesLibrary key={selected} initialSeriesId={selected} embedded onBack={onClose} backLabel="Back to Books"/>:error?<div role="alert"><p>{error}</p><button type="button" className="muse-button button-ghost" onClick={onClose}>Back to Books</button></div>:<p role="status">Opening series…</p>}
 </MuseModal>;
}
