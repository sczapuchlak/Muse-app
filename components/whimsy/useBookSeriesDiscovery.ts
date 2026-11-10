'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import type {Book} from '@/lib/whimsy/models';
import type {SeriesCatalog} from '@/lib/books/series-discovery';
import {matchCatalogBook} from '@/lib/books/series-catalog';
import {saveDiscoveredSeries} from '@/lib/books/series-save';
import {collectionsChanged,useCollectionsData} from '@/components/collections/CollectionsData';

/** Only a book detail mount discovers. Saved catalogs and a short negative cache avoid repeat lookups. */
export function useBookSeriesDiscovery(book:Book,books:Book[]){
 const {records,userId,loaded,retry}=useCollectionsData(),client=useMemo(()=>createMuseBrowserClient(),[]),[state,setState]=useState<'idle'|'loading'|'missing'|'error'>('idle'),attempted=useRef('');
 const memberships=records.seriesMembers.filter(m=>m.book_id===book.id&&!m.hidden).map(member=>({member,series:records.series.find(s=>s.id===member.series_id)})).filter((x):x is typeof x&{series:NonNullable<typeof x.series>}=>!!x.series);
 useEffect(()=>{
  if(!loaded||attempted.current===book.id)return;
  const preferred=memberships.find(x=>x.series.kind==='book')?.series;
  const fresh=preferred?.catalog_refreshed_at&&Date.now()-Date.parse(preferred.catalog_refreshed_at)<30*24*60*60_000;
  if(fresh||records.seriesMembers.some(m=>m.book_id===book.id&&m.hidden)||sessionStorage.getItem(`muse-series-miss:${book.id}`)){attempted.current=book.id;return;}
  attempted.current=book.id;let cancelled=false;
  (async()=>{setState('loading');try{
   const response=await fetch('/api/books/series',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:book.title,author:book.author,isbn:book.isbn,workKey:book.metadataSource?.workKey,source:preferred?.catalog_source,sourceId:preferred?.catalog_id})});
   if(!response.ok)throw Error('Discovery unavailable');const data=await response.json() as {catalog:SeriesCatalog|null};
   if(cancelled)return;
   if(!data.catalog||!data.catalog.members.some(entry=>matchCatalogBook(entry,books)?.id===book.id)){sessionStorage.setItem(`muse-series-miss:${book.id}`,'1');setState('missing');return;}
   await saveDiscoveredSeries(client,userId,data.catalog,records,books,preferred);collectionsChanged();await retry();if(!cancelled)setState('idle');
  }catch{if(!cancelled)setState('error');}})();
  return()=>{cancelled=true;};
  // Intentionally once per open book; provider refreshes are handled by the Series Detail action.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[book.id,loaded]);
 return {memberships,state};
}
