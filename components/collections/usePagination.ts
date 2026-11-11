'use client';
import {useCallback,useEffect,useState} from 'react';
import {DEFAULT_PAGE_SIZE,pageAfterResize,pageWindow,parsePage,parsePageSize,type PageSize} from '@/lib/collections/pagination';

const readStored=(key?:string):PageSize=>{if(!key||typeof window==='undefined')return DEFAULT_PAGE_SIZE;try{return parsePageSize(localStorage.getItem(key));}catch{return DEFAULT_PAGE_SIZE;}};
const writeStored=(key:string|undefined,size:number)=>{if(!key)return;try{localStorage.setItem(key,String(size));}catch{/* the size is only a per-device convenience */}};

/**
 * Page and page size for a long list. The page belongs to the filters that produced it: when `resetKey`
 * changes (search, filters, sort) the list returns to page 1, and a result that shrinks never strands the reader
 * past its last page. With `url`, `?page=` and `?size=` follow the list (replaceState, so history is not
 * flooded) which is what lets Back from a Book restore exactly where the reader was. `ready` holds the URL
 * untouched until the records have loaded, so a refresh never overwrites a deep link with page 1.
 */
export function usePagination({total,resetKey,ready=true,url=false,sizeStorageKey}:{total:number;resetKey:string;ready?:boolean;url?:boolean;sizeStorageKey?:string}){
 const [firstKey]=useState(resetKey);
 const [state,setState]=useState(()=>{const params=typeof window==='undefined'||!url?null:new URLSearchParams(window.location.search);return {key:firstKey,page:parsePage(params?.get('page')),size:parsePageSize(params?.get('size'),readStored(sizeStorageKey))};});
 const requested=state.key===resetKey?state.page:1,window_=pageWindow(total,requested,state.size),current=window_.page;
 const setPage=useCallback((page:number)=>setState(s=>({...s,key:resetKey,page})),[resetKey]);
 const setSize=useCallback((size:PageSize)=>{writeStored(sizeStorageKey,size);setState(s=>({key:resetKey,page:pageAfterResize(current,s.size,size),size}));},[resetKey,current,sizeStorageKey]);
 useEffect(()=>{
  if(!url||!ready||typeof window==='undefined')return;
  const params=new URLSearchParams(window.location.search);
  if(current>1)params.set('page',String(current));else params.delete('page');
  if(state.size!==DEFAULT_PAGE_SIZE)params.set('size',String(state.size));else params.delete('size');
  const next=`${window.location.pathname}${params.size?`?${params}`:''}`;
  if(next!==`${window.location.pathname}${window.location.search}`)window.history.replaceState(null,'',next);
 },[url,ready,current,state.size]);
 return {window:window_,setPage,setSize};
}
