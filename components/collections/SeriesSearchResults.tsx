'use client';
import {useEffect,useState} from 'react';
import type {BookSeriesHit,SeriesHit} from '@/lib/books/series-discovery';
import './Series.css';

export type CatalogSearch={term:string;results:SeriesHit[];bookSeries:BookSeriesHit[]};
/** One debounced request supplies both series-name results and book-result badges. */
export function useSeriesSearch(query:string,initial?:CatalogSearch){
 const term=query.trim(),[data,setData]=useState<CatalogSearch>(initial??{term:'',results:[],bookSeries:[]}),[pending,setPending]=useState('');
 useEffect(()=>{
  if(term.length<3)return;
  const controller=new AbortController();
  const timer=window.setTimeout(async()=>{
   setPending(term);
   try{
    const response=await fetch('/api/books/series',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'search',query:term}),signal:controller.signal});
    if(!response.ok)throw Error('Series search unavailable');
    const result=await response.json() as {results?:SeriesHit[];bookSeries?:BookSeriesHit[]};
    if(!controller.signal.aborted)setData({term,results:Array.isArray(result.results)?result.results:[],bookSeries:Array.isArray(result.bookSeries)?result.bookSeries:[]});
   }catch{if(!controller.signal.aborted)setData({term,results:[],bookSeries:[]});}
   finally{if(!controller.signal.aborted)setPending('');}
  },350);
  return()=>{window.clearTimeout(timer);controller.abort();};
 },[term]);
 return {results:data.term===term?data.results:[],bookSeries:data.term===term?data.bookSeries:[],loading:pending===term&&term.length>=3,data};
}

export function SeriesBadge({position,series,onOpen}:{position:number|null;series:Pick<SeriesHit,'title'|'primaryCount'|'totalCount'>;onOpen:()=>void}){
 const count=series.primaryCount??series.totalCount;
 return <button type="button" className="muse-search-series-badge" onClick={event=>{event.stopPropagation();onOpen();}} aria-label={`Open ${series.title} series${position===null?'':`, book ${position}`}`}>
  {position===null?'Series':`#${position}${count!==null?` of ${count}`:''}`} · {series.title}
 </button>;
}

export type SavedSeriesResult={id:string;title:string;author:string;primaryCount:number|null;totalCount:number|null};
export function SeriesSearchResults({hits,saved=[],loading,onOpen,onOpenSaved}:{hits:SeriesHit[];saved?:SavedSeriesResult[];loading:boolean;onOpen:(hit:SeriesHit)=>void;onOpenSaved?:(id:string)=>void}){
 const owned=onOpenSaved?saved:[],names=new Set(owned.map(row=>row.title.toLowerCase().trim())),external=hits.filter(row=>!names.has(row.title.toLowerCase().trim()));
 if(!owned.length&&!external.length&&!loading)return null;
 const detail=(author:string,primaryCount:number|null,totalCount:number|null)=>[author,primaryCount!==null?`${primaryCount} primary books`:totalCount!==null?`${totalCount} known entries`:null].filter(Boolean).join(' · ');
 return <section className="muse-series-search-results" aria-label="Matching series"><div className="muse-series-search-heading"><span className="small-label">SERIES</span>{loading&&<span className="small-label" role="status">Searching series…</span>}</div><ul>{owned.map(row=><li key={`saved:${row.id}`}><button type="button" onClick={()=>onOpenSaved?.(row.id)}><strong>{row.title}</strong><span>{detail(row.author,row.primaryCount,row.totalCount)}</span><span className="muse-series-search-open">Open series →</span></button></li>)}{external.map(hit=><li key={`${hit.source}:${hit.id}`}><button type="button" onClick={()=>onOpen(hit)}><strong>{hit.title}</strong><span>{detail(hit.author,hit.primaryCount,hit.totalCount)}</span><span className="muse-series-search-open">Open series →</span></button></li>)}</ul></section>;
}
