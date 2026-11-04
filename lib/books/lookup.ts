/**
 * Server-side book lookup. Google Books is primary (requires GOOGLE_BOOKS_API_KEY, read only on the server);
 * Open Library is the keyless fallback and the edition source. Never import this module from client code.
 */
import {plainText,fromGoogleVolume,fromOpenLibraryDoc,fromOpenLibraryEdition,mergeCandidates,queryIsbn,sortEditions,type BookCandidate,type BookProvider} from './metadata';

export type Fetcher=(url:string,init:{signal:AbortSignal;headers?:Record<string,string>})=>Promise<{ok:boolean;status:number;json():Promise<unknown>}>;
export type ProviderStatus='ok'|'empty'|'unavailable'|'not-configured';
export type SearchResult={results:BookCandidate[];providers:Partial<Record<BookProvider,ProviderStatus>>;attribution:string[]};
export type EditionsResult={editions:BookCandidate[];status:ProviderStatus;description?:string};

const OPEN_LIBRARY='https://openlibrary.org',GOOGLE='https://www.googleapis.com/books/v1/volumes';
const USER_AGENT='Muse personal reading journal (book lookup)';
const SEARCH_FIELDS='key,title,author_name,first_publish_year,cover_i,edition_count,subject,editions,editions.key,editions.title,editions.isbn,editions.publish_date,editions.publishers,editions.number_of_pages,editions.cover_i,editions.physical_format,editions.language';

export function createBookLookup({fetcher=fetch as unknown as Fetcher,googleKey=()=>process.env.GOOGLE_BOOKS_API_KEY,timeoutMs=6000,ttlMs=10*60_000,maxEntries=200,now=()=>Date.now()}:{fetcher?:Fetcher;googleKey?:()=>string|undefined;timeoutMs?:number;ttlMs?:number;maxEntries?:number;now?:()=>number}={}){
 const cache=new Map<string,{at:number;value:unknown}>();
 function cached<T>(key:string,load:()=>Promise<T>,keep:(value:T)=>boolean):Promise<T>{
  const hit=cache.get(key);if(hit&&now()-hit.at<ttlMs){cache.delete(key);cache.set(key,hit);return Promise.resolve(hit.value as T);}
  return load().then(value=>{if(keep(value)){cache.set(key,{at:now(),value});while(cache.size>maxEntries)cache.delete(cache.keys().next().value as string);}return value;});
 }
 async function getJson(url:string,headers?:Record<string,string>){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{const response=await fetcher(url,{signal:controller.signal,headers});if(response.status===404)return null;if(!response.ok)throw Error(`status ${response.status}`);return await response.json();}
  finally{clearTimeout(timer);}
 }
 async function google(query:string,isbn?:string):Promise<{status:ProviderStatus;results:BookCandidate[]}>{
  const key=googleKey()?.trim();if(!key)return {status:'not-configured',results:[]};
  try{
   const params=new URLSearchParams({q:isbn?`isbn:${isbn}`:query,maxResults:'12',printType:'books',key});
   const data=await getJson(`${GOOGLE}?${params}`),items=Array.isArray((data as {items?:unknown})?.items)?(data as {items:unknown[]}).items:[];
   const results=items.map(fromGoogleVolume).filter((c):c is BookCandidate=>!!c);return {status:results.length?'ok':'empty',results};
  }catch{return {status:'unavailable',results:[]};}
 }
 async function openLibrary(query:string,isbn?:string):Promise<{status:ProviderStatus;results:BookCandidate[]}>{
  try{
   const params=new URLSearchParams({fields:SEARCH_FIELDS,limit:'12'});params.set(isbn?'isbn':'q',isbn??query);
   const data=await getJson(`${OPEN_LIBRARY}/search.json?${params}`,{'User-Agent':USER_AGENT}),docs=Array.isArray((data as {docs?:unknown})?.docs)?(data as {docs:unknown[]}).docs:[];
   const results=docs.map(fromOpenLibraryDoc).filter((c):c is BookCandidate=>!!c);return {status:results.length?'ok':'empty',results};
  }catch{return {status:'unavailable',results:[]};}
 }
 /** Both providers run in parallel; Google's results lead and Open Library only adds books not already listed. */
 async function search(rawQuery:string):Promise<SearchResult>{
  const query=rawQuery.trim().replace(/\s+/g,' '),isbn=queryIsbn(query);
  return cached(`search:${(isbn??query).toLowerCase()}`,async()=>{
   const [g,o]=await Promise.all([google(query,isbn),openLibrary(query,isbn)]);
   const results=mergeCandidates([g.results,o.results]);
   const attribution=[...(results.some(r=>r.provider==='google-books')?['Google Books']:[]),...(results.some(r=>r.provider==='open-library')?['Open Library']:[])];
   return {results,providers:{'google-books':g.status,'open-library':o.status},attribution};
  },value=>value.results.length>0);
 }
 /** Editions for an Open Library work, found directly or through an ISBN. */
 async function editions({workKey,isbn,title,authors}:{workKey?:string;isbn?:string;title?:string;authors?:string[]}):Promise<EditionsResult>{
  const normalizedIsbn=isbn?queryIsbn(isbn):undefined;let work=workKey&&/^\/works\/OL\d+W$/.test(workKey)?workKey:undefined;
  if(!work&&!normalizedIsbn)return {editions:[],status:'empty'};
  return cached(`editions:${work??normalizedIsbn}`,async()=>{
   try{
    if(!work){const edition=await getJson(`${OPEN_LIBRARY}/isbn/${normalizedIsbn}.json`,{'User-Agent':USER_AGENT}) as {works?:{key?:unknown}[]}|null;const key=edition?.works?.[0]?.key;work=typeof key==='string'&&/^\/works\/OL\d+W$/.test(key)?key:undefined;}
    if(!work)return {editions:[],status:'empty' as ProviderStatus};
    // The work record often carries the description Open Library search omits; it is optional.
    const [data,workRecord]=await Promise.all([getJson(`${OPEN_LIBRARY}${work}/editions.json?limit=60`,{'User-Agent':USER_AGENT}) as Promise<{entries?:unknown[]}|null>,getJson(`${OPEN_LIBRARY}${work}.json`,{'User-Agent':USER_AGENT}).catch(()=>null) as Promise<{description?:unknown}|null>]);
    const list=(data?.entries??[]).map(entry=>fromOpenLibraryEdition(entry,{title,authors,workKey:work})).filter((c):c is BookCandidate=>!!c);
    const raw=workRecord?.description,text=typeof raw==='string'?raw:raw&&typeof raw==='object'&&typeof (raw as {value?:unknown}).value==='string'?(raw as {value:string}).value:undefined,description=text?plainText(text)||undefined:undefined;
    return {editions:sortEditions(list).slice(0,24),status:(list.length?'ok':'empty') as ProviderStatus,...(description?{description}:{})};
   }catch{return {editions:[],status:'unavailable' as ProviderStatus};}
  },value=>value.status==='ok');
 }
 return {search,editions};
}
