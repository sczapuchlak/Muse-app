'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import type {Book} from '@/lib/whimsy/models';
import type {Series,SeriesMember} from '@/lib/collections/models';
import {enrichmentChanges,lookupCatalogBook} from '@/lib/books/add-book';
import {saveDiscoveredSeries} from '@/lib/books/series-save';
import {collectionsChanged,useCollectionsData} from '@/components/collections/CollectionsData';

const MONTH=30*24*60*60_000;
const missKey=(id:string)=>`muse-series-miss:${id}`;
const missed=(id:string)=>{try{return !!sessionStorage.getItem(missKey(id));}catch{return false;}};
const markMissed=(id:string)=>{try{sessionStorage.setItem(missKey(id),'1');}catch{/* retried next visit */}};

export type BookMembership={member:SeriesMember;series:Series};
/**
 * Connects one Library book to the catalog when it opens (#136): it fills empty book-level details
 * (synopsis, first publication, genres, missing artwork) through `onEnrich`, and records the series the
 * catalog confidently places it in. Saved series that predate catalog artwork are refreshed quietly.
 * Nothing the reader set is overwritten, and a book with a removed series association is left alone.
 */
export function useBookCatalog(book:Book,books:Book[],onEnrich:(changes:Partial<Book>)=>Promise<Book|null>){
 const {records,userId,loaded,retry}=useCollectionsData(),client=useMemo(()=>createMuseBrowserClient(),[]);
 const [state,setState]=useState<'idle'|'checking'|'none'|'error'>('idle'),attempted=useRef('');
 const memberships=useMemo(()=>records.seriesMembers.filter(m=>m.book_id===book.id&&!m.hidden).map(member=>({member,series:records.series.find(s=>s.id===member.series_id)})).filter((x):x is BookMembership=>!!x.series).sort((a,b)=>Number(b.series.kind==='book')-Number(a.series.kind==='book')||Number(b.member.role==='mainline')-Number(a.member.role==='mainline')),[records,book.id]);
 useEffect(()=>{
  if(!loaded||attempted.current===book.id)return;
  attempted.current=book.id;
  const primary=memberships.find(x=>x.series.kind==='book')?.series??null;
  const removed=records.seriesMembers.some(m=>m.book_id===book.id&&m.hidden);
  const primaryMembers=primary?records.seriesMembers.filter(m=>m.series_id===primary.id):[];
  const stale=!!primary&&primary.catalog_source==='hardcover'&&(!primary.catalog_refreshed_at||Date.now()-Date.parse(primary.catalog_refreshed_at)>MONTH||!primaryMembers.some(m=>m.catalog_cover_url||m.catalog_cover_color));
  const needsSeries=!primary&&!removed;
  const needsDetails=!book.metadataSource?.enrichedAt&&(!book.description||!book.publishedDate||!book.genre||!book.coverUrl);
  if((!needsSeries&&!stale&&!needsDetails)||missed(book.id))return;
  let cancelled=false;
  (async()=>{
   setState('checking');
   try{
    const lookup=await lookupCatalogBook({title:book.title,author:book.author,isbn:book.isbn,workKey:book.metadataSource?.workKey,...(book.metadataSource?.hardcoverId?{hardcoverBookId:book.metadataSource.hardcoverId}:{})});
    // Writes finish even if the page closes meanwhile; only local state updates are skipped.
    let current=book;
    const changes=enrichmentChanges(book,lookup);
    if(Object.keys(changes).length){const saved=await onEnrich(changes);if(saved)current=saved;}
    const catalog=lookup.catalog;
    if(catalog&&(needsSeries||(stale&&primary?.catalog_id===catalog.id))){
     await saveDiscoveredSeries(client,userId,catalog,records,books.map(b=>b.id===current.id?current:b),stale?primary:null);
     collectionsChanged();await retry();
    }
    if(!cancelled)setState(catalog||lookup.book?'idle':'none');
    if(!catalog&&!lookup.book)markMissed(book.id);
   }catch{if(!cancelled)setState('error');}
  })();
  return()=>{cancelled=true;};
  // Once per opened book: later refreshes are explicit (Series › Refresh).
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[book.id,loaded]);
 return {memberships,state,records};
}
