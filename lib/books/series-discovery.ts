/**
 * Bounded, on-demand series references (#136). Server-only.
 * Hardcover is the primary catalog; Wikidata and Open Library are keyless fallbacks for ordering only.
 * Values from every source are untrusted: each is type-checked, and a missing value stays missing.
 */
import {isbnDigits,mapGenres,normalizePublishedDate,plainText,safeCoverUrl} from './metadata';

export type CatalogSource='hardcover'|'wikidata'|'open-library';
/** `collection` marks an omnibus/box set; `optional` is a book whose primary series is another one. */
export type CatalogRole='mainline'|'optional'|'collection';
export type CatalogMember={source:CatalogSource;id:string;title:string;author:string;position:number|null;positionLabel:string;workKey?:string;role?:CatalogRole;releaseDate?:string;releaseYear?:number;releaseState?:'released'|'announced'|'unknown';coverUrl?:string;coverColor?:string;pages?:number;description?:string};
export type SeriesCatalog={source:CatalogSource;id:string;title:string;members:CatalogMember[];complete:false;author?:string;description?:string;primaryCount?:number;totalCount?:number;completed?:boolean};
export type SeriesHit={source:'hardcover';id:string;title:string;author:string;primaryCount:number|null;totalCount:number|null;sampleTitles?:string[];coverUrl?:string;covers?:string[]};
export type BookSeriesHit={bookId:string;title:string;author:string;position:number|null;featured:boolean;series:SeriesHit};
export type SeriesSeed={title:string;author?:string;isbn?:string;workKey?:string;source?:CatalogSource;sourceId?:string;hardcoverBookId?:string};
/** Book-level catalog facts used to fill gaps in a saved book. Never edition-specific. */
export type CatalogBook={source:'hardcover';id:string;title:string;author:string;description?:string;releaseDate?:string;pages?:number;coverUrl?:string;genres:string[]};
export type BookLookup={book:CatalogBook|null;catalog:SeriesCatalog|null;position:number|null};
type Fetcher=typeof fetch;
const OL='https://openlibrary.org',WD='https://query.wikidata.org/sparql';
/** Local QA may point at a fixture server; production builds always use Hardcover itself. */
const HC=process.env.NODE_ENV!=='production'&&process.env.HARDCOVER_API_URL?.startsWith('http://127.0.0.1:')?process.env.HARDCOVER_API_URL:'https://api.hardcover.app/v1/graphql';
const text=(x:unknown,max=500)=>typeof x==='string'?plainText(x,max):'';
const optional=(x:unknown,max=500)=>text(x,max)||undefined;
const olWork=(x:unknown)=>typeof x==='string'&&/^\/?(?:works\/)?OL\d+W$/.test(x)?x.match(/OL\d+W/)?.[0]:undefined;
const qid=(x:unknown)=>typeof x==='string'&&/^Q\d+$/.test(x)?x:undefined;
const position=(x:unknown)=>{const n=typeof x==='number'?x:typeof x==='string'&&/^\d+(?:\.\d{1,2})?$/.test(x)?Number(x):NaN;return Number.isFinite(n)&&n>=0&&n<9000?n:null;};
const positiveInt=(x:unknown)=>typeof x==='number'&&Number.isInteger(x)&&x>0&&x<100000?x:undefined;
/** Only a strict calendar date is accepted; it is stored in a `date` column. */
const isoDate=(x:unknown)=>{const value=normalizePublishedDate(x);return value&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))?value:undefined;};
const hexColor=(x:unknown)=>typeof x==='string'&&/^#[0-9a-f]{6}$/i.test(x)?x.toLowerCase():undefined;
const label=(n:number)=>Number.isInteger(n)?String(n):String(Math.round(n*100)/100);
const tail=(x:unknown)=>typeof x==='string'?x.split('/').at(-1)??'':'';
const norm=(x:string)=>x.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

type RawImage={url?:unknown;color?:unknown}|null;
type RawSeries={id?:number;name?:string;books_count?:number;primary_books_count?:number|null;author?:{name?:string}|null;book_series?:{position?:unknown;book?:{title?:string;image?:RawImage}|null}[]};
type RawBook={id?:number;title?:string;compilation?:boolean|null;users_count?:number|null;description?:string|null;release_date?:string|null;release_year?:number|null;pages?:number|null;canonical_id?:number|null;image?:RawImage;cached_tags?:unknown;contributions?:{author?:{name?:string}|null}[];book_series?:{series_id?:number;position?:unknown;featured?:boolean;compilation?:boolean}[]};
const SERIES_HIT='id name books_count primary_books_count author{name} book_series(where:{compilation:{_eq:false},position:{_is_null:false},book:{canonical_id:{_is_null:true}}},order_by:{position:asc},limit:10){position book{title image{url}}}';
const BOOK_FIELDS='id title description release_date release_year pages canonical_id image{url color} cached_tags contributions(limit:3){author{name}} book_series{series_id position featured compilation}';

/** Genre names from Hardcover's cached tag summary, mapped onto Muse's own presets only. */
function catalogGenres(tags:unknown){
 const genre=tags&&typeof tags==='object'?(tags as Record<string,unknown>).Genre:undefined;
 const names=Array.isArray(genre)?genre.map(row=>row&&typeof row==='object'?text((row as {tag?:unknown}).tag,80):'').filter(Boolean):[];
 return mapGenres(names.slice(0,20));
}
export function seriesHit(series:RawSeries):SeriesHit{
 // Primary books (whole positions) represent a series best; prequels fill in only when needed.
 const rows=(series.book_series??[]).filter(row=>row.book?.title),primary=rows.filter(row=>Number.isInteger(position(row.position)));
 const sample=(primary.length?primary:rows).slice(0,3);
 const covers=[...primary,...rows].map(row=>safeCoverUrl(row.book?.image?.url)).filter((c,i,all):c is string=>!!c&&all.indexOf(c)===i).slice(0,3);
 return {source:'hardcover',id:String(series.id),title:text(series.name),author:text(series.author?.name),primaryCount:typeof series.primary_books_count==='number'?series.primary_books_count:null,totalCount:typeof series.books_count==='number'?series.books_count:null,sampleTitles:sample.map(row=>text(row.book?.title,200)).filter(Boolean),...(covers[0]?{coverUrl:covers[0],covers}:{})};
}
/**
 * Canonical reading order: known positions ascending (prequels at 0.x and novellas at x.5 stay where the
 * catalog puts them), then unpositioned companions. Duplicate catalog records of one position keep the first.
 */
export function orderCatalogMembers(members:CatalogMember[]){
 const rank=(m:CatalogMember)=>(m.role==='collection'?2:m.role==='optional'?1:0);
 const sorted=[...members].sort((a,b)=>rank(a)-rank(b)||(a.position===null?1:0)-(b.position===null?1:0)||(a.position??0)-(b.position??0)||a.title.localeCompare(b.title));
 const seen=new Set<string>();
 return sorted.filter(m=>{const key=`${m.role==='collection'?'c':'m'}:${m.position??'x'}:${norm(m.title)}`;if(seen.has(key))return false;seen.add(key);return true;});
}

/** Omnibus, box set and multi-volume bundle titles, for catalogs that do not flag them as compilations. */
export function bundleTitle(title:string){
 return /\b(box(ed)?\s*set|boxset|omnibus|bundle|collection|complete (series|saga|set)|books?\s*\d+\s*(-|–|to|&|and)\s*\d+|series\s*:?\s*\d+\s*(-|–)\s*\d+|volumes?\s*\d+\s*(-|–)\s*\d+)\b/i.test(title);
}
/**
 * Another format of a work already in the series rather than a work of its own: audio dramatizations, split or
 * partial editions and similar. These are editions, so they never appear in a reading order.
 */
export function editionTitle(title:string){
 return /\b(dramati[sz]ed adaptation|audio ?drama|full[- ]cast|split edition|abridged|movie tie-?in)\b/i.test(title)||/\bpart\s+\d+\s+of\s+\d+\b/i.test(title);
}
/** Series that only repackage another series as an edition (dramatizations, split editions). */
const editionSeries=(name:string)=>/\((dramati[sz]ed adaptation|split edition|audio ?drama|full[- ]cast)[^)]*\)/i.test(name)||/\b(dramati[sz]ed adaptation|split edition)\b/i.test(name);
export type CatalogEntry={member:CatalogMember;readers:number;featured:boolean};
/**
 * One work per reading position (#136). Catalogs list translations and other editions of the same installment
 * as separate records at the same position; the record most readers have (then the featured one) represents
 * the work. A distinct work with its own position is kept whatever its language. Unpositioned entries need
 * a readership of their own, and bundles stay in Collections & box sets.
 */
export function normalizeSeriesEntries(entries:CatalogEntry[]):CatalogMember[]{
 const works=entries.filter(e=>e.member.role!=='collection'&&!editionTitle(e.member.title)),bundles=entries.filter(e=>e.member.role==='collection'&&!editionTitle(e.member.title));
 const best=(a:CatalogEntry,b:CatalogEntry)=>b.readers-a.readers||Number(b.featured)-Number(a.featured)||(a.member.releaseDate??'9999').localeCompare(b.member.releaseDate??'9999');
 const byPosition=new Map<number,CatalogEntry[]>();
 for(const e of works)if(e.member.position!==null)byPosition.set(e.member.position,[...(byPosition.get(e.member.position)??[]),e]);
 const positioned=[...byPosition.values()].map(group=>[...group].sort(best)[0]);
 const top=Math.max(0,...positioned.map(e=>e.readers)),floor=Math.max(3,Math.round(top*.02));
 const kept=new Set(positioned.map(e=>norm(e.member.title)));
 const unpositioned=works.filter(e=>e.member.position===null&&e.readers>=floor&&!kept.has(norm(e.member.title)));
 const seenBundles=new Set<string>(),uniqueBundles=bundles.sort(best).filter(e=>{const key=norm(e.member.title);if(seenBundles.has(key))return false;seenBundles.add(key);return true;});
 return orderCatalogMembers([...positioned,...unpositioned,...uniqueBundles].map(e=>e.member));
}

export function createSeriesResolver({fetcher=fetch,hardcoverKey=()=>process.env.HARDCOVER_API_KEY,timeoutMs=9000,now=()=>Date.now()}:{fetcher?:Fetcher;hardcoverKey?:()=>string|undefined;timeoutMs?:number;now?:()=>number}={}){
 const cache=new Map<string,{at:number;value:unknown}>();
 function cached<T>(key:string,refresh:boolean,load:()=>Promise<T>):Promise<T>{
  const hit=cache.get(key);if(!refresh&&hit&&now()-hit.at<12*60*60_000)return Promise.resolve(hit.value as T);
  return load().then(value=>{cache.set(key,{at:now(),value});if(cache.size>200)cache.delete(cache.keys().next().value as string);return value;});
 }
 async function json(url:string,init:RequestInit={}){const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeoutMs);try{const r=await fetcher(url,{...init,signal:c.signal});if(!r.ok)throw Error(`Series source ${r.status}`);return await r.json() as Record<string,unknown>;}finally{clearTimeout(timer);}}
 async function gql(query:string,variables:Record<string,unknown>){const key=hardcoverKey()?.trim();if(!key)throw Error('Hardcover is not configured');const data=await json(HC,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','User-Agent':'Muse Series Discovery'},body:JSON.stringify({query,variables})});if(Array.isArray(data.errors)&&data.errors.length)throw Error('Hardcover query unavailable');return data.data as Record<string,unknown>|undefined;}
 async function openLibraryWork(seed:SeriesSeed){
  if(olWork(seed.workKey))return olWork(seed.workKey);
  const isbn=isbnDigits(seed.isbn??'');
  if(/^97[89]\d{10}$/.test(isbn)||/^\d{9}[\dX]$/.test(isbn)){
   try{const data=await json(`${OL}/isbn/${isbn}.json`,{headers:{'User-Agent':'Muse series discovery (contact: project owner)'}});const found=olWork((data.works as {key?:unknown}[]|undefined)?.[0]?.key);if(found)return found;}catch{/* try title/author */}
  }
  if(!seed.title||!seed.author)return undefined;
  const u=new URL(`${OL}/search.json`);u.searchParams.set('title',seed.title.slice(0,120));u.searchParams.set('author',seed.author.slice(0,100));u.searchParams.set('fields','key,title,author_name');u.searchParams.set('limit','5');
  try{const data=await json(u.toString(),{headers:{'User-Agent':'Muse series discovery (contact: project owner)'}}),docs=Array.isArray(data.docs)?data.docs as {key?:unknown;title?:unknown;author_name?:unknown}[]:[];
   const same=docs.filter(d=>norm(text(d.title))===norm(seed.title)&&Array.isArray(d.author_name)&&d.author_name.some(a=>norm(text(a)).includes(norm(seed.author!))||norm(seed.author!).includes(norm(text(a)))));
   return same.length===1?olWork(same[0].key):undefined;
  }catch{return undefined;}
 }
 async function wikidata(seed:SeriesSeed,work?:string):Promise<SeriesCatalog|null>{
  let id=seed.source==='wikidata'?qid(seed.sourceId):undefined,title='';
  const query=async(q:string)=>{const u=new URL(WD);u.searchParams.set('query',q);u.searchParams.set('format','json');const data=await json(u.toString(),{headers:{'User-Agent':'MuseSeriesDiscovery/1.0 (contact: project owner)',Accept:'application/sparql-results+json'}});return ((data.results as {bindings?:Record<string,{value:string}>[]}|undefined)?.bindings??[]);};
  if(!id&&work){const rows=await query(`SELECT ?series ?title WHERE { ?book wdt:P648 "${work}"; wdt:P179 ?series . ?series rdfs:label ?title . FILTER(LANG(?title)="en") } LIMIT 4`);if(rows.length!==1)return null;id=qid(tail(rows[0].series?.value));title=text(rows[0].title?.value);}
  if(!id)return null;
  if(!title){const rows=await query(`SELECT ?title WHERE { wd:${id} rdfs:label ?title . FILTER(LANG(?title)="en") } LIMIT 1`);title=text(rows[0]?.title?.value);}
  const rows=await query(`SELECT ?book ?title ?ordinal ?ol WHERE { ?book p:P179 ?membership . ?membership ps:P179 wd:${id} . OPTIONAL { ?membership pq:P1545 ?ordinal } ?book rdfs:label ?title . FILTER(LANG(?title)="en") OPTIONAL { ?book wdt:P648 ?ol } } LIMIT 80`);
  const members=rows.map(row=>{const bookId=qid(tail(row.book?.value)),name=text(row.title?.value),pos=position(row.ordinal?.value);return bookId&&name?{source:'wikidata' as const,id:bookId,title:name,author:'',position:pos,positionLabel:pos===null?'':label(pos),role:'mainline' as const,...(olWork(row.ol?.value)?{workKey:`/works/${olWork(row.ol?.value)}`}:{})}:null;}).filter((m):m is NonNullable<typeof m>=>!!m);
  return members.length&&title?{source:'wikidata',id,title,members:orderCatalogMembers(members),complete:false}:null;
 }
 async function openLibrary(seed:SeriesSeed,work?:string):Promise<SeriesCatalog|null>{
  let tag=seed.source==='open-library'?seed.sourceId:undefined;
  if(!tag&&work){const data=await json(`${OL}/works/${work}.json`,{headers:{'User-Agent':'Muse series discovery (contact: project owner)'}}),subjects=Array.isArray(data.subjects)?data.subjects:[];tag=subjects.map(s=>text(s)).find(s=>/^series:/i.test(s))?.slice(7);}
  if(!tag||tag.length>120)return null;
  const u=new URL(`${OL}/search.json`);u.searchParams.set('q',`subject:series:${tag}`);u.searchParams.set('fields','key,title,author_name');u.searchParams.set('limit','60');
  const data=await json(u.toString(),{headers:{'User-Agent':'Muse series discovery (contact: project owner)'}}),docs=Array.isArray(data.docs)?data.docs as {key?:unknown;title?:unknown;author_name?:unknown}[]:[];
  const members=docs.map(d=>{const key=olWork(d.key),name=text(d.title);return key&&name?{source:'open-library' as const,id:key,title:name,author:text(Array.isArray(d.author_name)?d.author_name[0]:''),position:null,positionLabel:'',role:'mainline' as const,workKey:`/works/${key}`}:null;}).filter((m):m is NonNullable<typeof m>=>!!m);
  return members.length?{source:'open-library',id:tag,title:tag.replace(/_/g,' '),members,complete:false}:null;
 }
 /** The one Hardcover work matching a seed's ISBN or exact title (+ author when given). */
 async function hardcoverBook(seed:SeriesSeed):Promise<RawBook|null>{
  let bookIds:number[]=[];
  if(/^\d+$/.test(seed.hardcoverBookId??''))bookIds=[Number(seed.hardcoverBookId)];
  const isbn=isbnDigits(seed.isbn??'');
  if(!bookIds.length&&/^97[89]\d{10}$/.test(isbn)){
   const found=await gql('query($isbn:String!){editions(where:{isbn_13:{_eq:$isbn}},limit:3){book_id}}',{isbn});
   bookIds=((found?.editions as {book_id?:number}[]|undefined)??[]).map(e=>e.book_id).filter((id):id is number=>typeof id==='number');
  }
  if(!bookIds.length&&seed.title){
   const found=await gql('query($query:String!){search(query:$query,query_type:"book",per_page:8){ids}}',{query:seed.title.slice(0,120)});
   bookIds=((found?.search as {ids?:number[]}|undefined)?.ids??[]).filter(id=>Number.isInteger(id));
  }
  if(!bookIds.length)return null;
  const found=await gql(`query($ids:[Int!]!){books(where:{id:{_in:$ids}},limit:8){${BOOK_FIELDS}}}`,{ids:[...new Set(bookIds)].slice(0,8)});
  const books=((found?.books as RawBook[]|undefined)??[]).filter(b=>typeof b.id==='number');
  if(seed.hardcoverBookId)return books.find(b=>String(b.id)===seed.hardcoverBookId)??null;
  const author=seed.author;
  const byIsbn=books.length===1&&/^97[89]\d{10}$/.test(isbn)?books:[];
  const matches=byIsbn.length?byIsbn:books.filter(b=>norm(text(b.title))===norm(seed.title)&&(!author||b.contributions?.some(c=>author.split(',').some(name=>norm(text(c.author?.name))===norm(name)))));
  const canonical=matches.filter(b=>!b.canonical_id);
  const pool=canonical.length?canonical:matches;
  return pool.length===1?pool[0]:null;
 }
 function featuredSeriesOf(book:RawBook){
  const rows=(book.book_series??[]).filter(row=>typeof row.series_id==='number'&&!row.compilation);
  const featured=[...new Set(rows.filter(m=>m.featured).map(m=>m.series_id!))],all=[...new Set(rows.map(m=>m.series_id!))];
  const id=featured.length===1?featured[0]:featured.length===0&&all.length===1?all[0]:null;
  return id===null?null:{id,position:position(rows.find(row=>row.series_id===id)?.position)};
 }
 async function hardcoverSeries(seriesId:number):Promise<SeriesCatalog|null>{
  const result=await gql('query($id:Int!){series_by_pk(id:$id){id name description books_count primary_books_count is_completed author{name} book_series(order_by:{position:asc},limit:100){position featured compilation book{id title description release_date release_year pages canonical_id compilation users_count image{url color} contributions(limit:1){author{name}}}}}}',{id:seriesId});
  const series=result?.series_by_pk as {id?:number;name?:string;description?:string|null;books_count?:number;primary_books_count?:number|null;is_completed?:boolean|null;author?:{name?:string}|null;book_series?:{position?:unknown;featured?:boolean;compilation?:boolean;book?:RawBook|null}[]}|null;
  if(!series?.id||!series.name)return null;
  const today=new Date(now()).toISOString().slice(0,10);
  const entries=(series.book_series??[]).map((row):CatalogEntry|null=>{
   const book=row.book,id=book?.id,name=text(book?.title,300),pos=position(row.position);
   if(typeof id!=='number'||!name||book?.canonical_id)return null;
   const releaseDate=isoDate(book?.release_date),releaseYear=positiveInt(book?.release_year)??(releaseDate?Number(releaseDate.slice(0,4)):undefined),cover=safeCoverUrl(book?.image?.url),color=hexColor(book?.image?.color),pages=positiveInt(book?.pages);
   const member:CatalogMember={source:'hardcover',id:String(id),title:name,author:text(book?.contributions?.[0]?.author?.name)||text(series.author?.name),position:pos,positionLabel:pos===null?'':label(pos),role:row.compilation||book?.compilation||bundleTitle(name)?'collection':row.featured?'mainline':'optional',
    ...(releaseDate?{releaseDate}:{}),...(releaseYear?{releaseYear}:{}),releaseState:releaseDate?(releaseDate>today?'announced':'released'):releaseYear?(releaseYear>Number(today.slice(0,4))?'announced':'released'):'unknown',
    ...(cover?{coverUrl:cover}:{}),...(color?{coverColor:color}:{}),...(pages?{pages}:{}),...(book?.description?{description:plainText(book.description,420)}:{})};
   return {member,readers:typeof book?.users_count==='number'?book.users_count:0,featured:!!row.featured};
  }).filter((e):e is CatalogEntry=>!!e);
  const members=normalizeSeriesEntries(entries);
  if(!members.length)return null;
  return {source:'hardcover',id:String(series.id),title:text(series.name),author:text(series.author?.name),description:optional(series.description,2000),primaryCount:typeof series.primary_books_count==='number'?series.primary_books_count:undefined,totalCount:members.filter(m=>m.role!=='collection').length,...(typeof series.is_completed==='boolean'?{completed:series.is_completed}:{}),members:orderCatalogMembers(members),complete:false};
 }
 async function hardcover(seed:SeriesSeed):Promise<SeriesCatalog|null>{
  if(!hardcoverKey()?.trim())return null;
  if(seed.source==='hardcover'&&/^\d+$/.test(seed.sourceId??''))return hardcoverSeries(Number(seed.sourceId));
  const book=await hardcoverBook(seed);if(!book)return null;
  const featured=featuredSeriesOf(book);
  return featured?hardcoverSeries(featured.id):null;
 }
 async function searchSeries(query:string):Promise<SeriesHit[]>{if(!hardcoverKey()?.trim())return [];const found=await gql('query($query:String!){search(query:$query,query_type:"series",per_page:10){ids}}',{query:query.slice(0,120)});const ids=((found?.search as {ids?:number[]}|undefined)?.ids??[]).filter(id=>Number.isInteger(id));if(!ids.length)return [];const data=await gql(`query($ids:[Int!]!){series(where:{id:{_in:$ids}},limit:10){${SERIES_HIT}}}`,{ids});const rows=((data?.series as RawSeries[]|undefined)??[]).filter(s=>typeof s.id==='number'&&!!s.name);return ids.map(id=>rows.find(row=>row.id===id)).filter((s):s is RawSeries=>!!s&&!editionSeries(text(s.name))).map(seriesHit);}
 /** Two bounded Hardcover queries enrich a typed search, never one request per book result. */
 async function searchCatalog(query:string):Promise<{results:SeriesHit[];bookSeries:BookSeriesHit[]}>{
  if(!hardcoverKey()?.trim())return {results:[],bookSeries:[]};
  return cached(`search:${norm(query)}`,false,async()=>{
   const found=await gql('query($query:String!){bookHits:search(query:$query,query_type:"book",per_page:12){ids} seriesHits:search(query:$query,query_type:"series",per_page:6){ids}}',{query:query.slice(0,120)});
   const ids=(value:unknown)=>Array.isArray(value)?value.filter((id):id is number=>Number.isInteger(id)).slice(0,12):[];
   const bookIds=ids((found?.bookHits as {ids?:unknown}|undefined)?.ids),seriesIds=ids((found?.seriesHits as {ids?:unknown}|undefined)?.ids).slice(0,6);
   if(!bookIds.length&&!seriesIds.length)return {results:[],bookSeries:[]};
   const data=await gql(`query($bookIds:[Int!]!,$seriesIds:[Int!]!){books(where:{id:{_in:$bookIds}},limit:12){id title contributions(limit:3){author{name}} book_series{position featured compilation series{${SERIES_HIT}}}} series(where:{id:{_in:$seriesIds}},limit:6){${SERIES_HIT}}}`,{bookIds,seriesIds});
   const rows=((data?.series as RawSeries[]|undefined)??[]).filter(s=>typeof s.id==='number'&&!!s.name);
   const results=seriesIds.map(id=>rows.find(row=>row.id===id)).filter((s):s is RawSeries=>!!s&&!editionSeries(text(s.name))).map(seriesHit);
   const books=(data?.books as {id?:number;title?:string;contributions?:{author?:{name?:string}}[];book_series?:{position?:unknown;featured?:boolean;compilation?:boolean;series?:RawSeries|null}[]}[]|undefined)??[];
   const bookSeries=books.flatMap(book=>{if(typeof book.id!=='number'||!book.title)return [];return (book.book_series??[]).filter(row=>row.series?.id&&row.series.name&&!row.compilation&&!editionSeries(text(row.series.name))).sort((a,b)=>Number(!!b.featured)-Number(!!a.featured)).slice(0,3).map(row=>({bookId:String(book.id),title:text(book.title),author:text(book.contributions?.[0]?.author?.name),position:position(row.position),featured:!!row.featured,series:seriesHit(row.series!)}));});
   return {results,bookSeries};
  });
 }
 /**
  * Series chips for the books a search actually shows (#136): one bounded batch by ISBN, then exact title,
  * independent of how the catalog's own search ranks a partial query. Keyed by the caller's book keys.
  */
 async function seriesForBooks(list:{key:string;title:string;authors:string[];isbn13?:string}[]):Promise<Record<string,BookSeriesHit[]>>{
  if(!hardcoverKey()?.trim()||!list.length)return {};
  const items=list.slice(0,12),isbns=[...new Set(items.map(b=>isbnDigits(b.isbn13??'')).filter(i=>/^97[89]\d{10}$/.test(i)))],titles=[...new Set(items.map(b=>text(b.title,300)).filter(Boolean))];
  return cached(`chips:${JSON.stringify(items.map(b=>[b.title,b.authors[0]??'',b.isbn13??'']))}`,false,async()=>{
   const editions=isbns.length?await gql('query($isbns:[String!]!){editions(where:{isbn_13:{_in:$isbns}},limit:40){isbn_13 book_id}}',{isbns}):null;
   const byIsbn=new Map(((editions?.editions as {isbn_13?:string;book_id?:number}[]|undefined)??[]).filter(e=>e.isbn_13&&typeof e.book_id==='number').map(e=>[e.isbn_13!,e.book_id!]));
   const data=await gql(`query($ids:[Int!]!,$titles:[String!]!){books(where:{_or:[{id:{_in:$ids}},{title:{_in:$titles}}]},limit:60,order_by:{users_count:desc}){id title canonical_id users_count contributions(limit:3){author{name}} book_series{position featured compilation series{${SERIES_HIT}}}}}`,{ids:[...new Set(byIsbn.values())],titles});
   const books=((data?.books as (Omit<RawBook,"book_series">&{book_series?:{position?:unknown;featured?:boolean;compilation?:boolean;series?:RawSeries|null}[]})[]|undefined)??[]).filter(b=>typeof b.id==='number');
   const out:Record<string,BookSeriesHit[]>={};
   for(const item of items){
    const isbn=isbnDigits(item.isbn13??''),viaIsbn=byIsbn.has(isbn)?books.find(b=>b.id===byIsbn.get(isbn)):undefined;
    const sameTitle=books.filter(b=>norm(text(b.title))===norm(item.title)&&!b.canonical_id&&(!item.authors.length||b.contributions?.some(c=>item.authors.some(a=>norm(text(c.author?.name))===norm(a)))));
    const book=viaIsbn??sameTitle[0];if(!book)continue;
    const rows=(book.book_series??[]).filter(row=>row.series?.id&&row.series.name&&!row.compilation&&!editionSeries(text(row.series.name))).sort((a,b)=>Number(!!b.featured)-Number(!!a.featured));
    if(rows.length)out[item.key]=rows.slice(0,2).map(row=>({bookId:String(book.id),title:text(book.title),author:text(book.contributions?.[0]?.author?.name),position:position(row.position),featured:!!row.featured,series:seriesHit(row.series!)}));
   }
   return out;
  });
 }
 async function resolve(seed:SeriesSeed,{refresh=false}:{refresh?:boolean}={}):Promise<SeriesCatalog|null>{
  return cached(`resolve:${JSON.stringify(seed)}`,refresh,async()=>{
   const sources=['hardcover','wikidata','open-library'] as const;let work:string|undefined;
   for(const source of sources){
    if(seed.source&&seed.sourceId&&seed.source!==source)continue;
    try{if(source!=='hardcover'&&!work)work=await openLibraryWork(seed);const result=source==='hardcover'?await hardcover(seed):source==='wikidata'?await wikidata(seed,work):await openLibrary(seed,work);if(result)return result;}catch{/* next source */}
   }
   return null;
  });
 }
 /**
  * One saved or about-to-be-saved book: its Hardcover work (synopsis, release date, length, artwork, genres)
  * and the series it confidently belongs to. Keyless sources only supply ordering when Hardcover has no record.
  */
 async function lookupBook(seed:SeriesSeed,{refresh=false}:{refresh?:boolean}={}):Promise<BookLookup>{
  return cached(`book:${JSON.stringify(seed)}`,refresh,async()=>{
   let raw:RawBook|null=null;
   if(hardcoverKey()?.trim()){try{raw=await hardcoverBook(seed);}catch{raw=null;}}
   const book:CatalogBook|null=raw&&typeof raw.id==='number'?(()=>{const releaseDate=normalizePublishedDate(raw.release_date??undefined),pages=positiveInt(raw.pages),cover=safeCoverUrl(raw.image?.url),description=optional(raw.description,4000);return {source:'hardcover' as const,id:String(raw.id),title:text(raw.title,300),author:text(raw.contributions?.[0]?.author?.name),...(description?{description}:{}),...(releaseDate?{releaseDate}:{}),...(pages?{pages}:{}),...(cover?{coverUrl:cover}:{}),genres:catalogGenres(raw.cached_tags)};})():null;
   let catalog:SeriesCatalog|null=null,at:number|null=null;
   const featured=raw?featuredSeriesOf(raw):null;
   if(featured){try{catalog=await hardcoverSeries(featured.id);at=featured.position;}catch{catalog=null;}}
   if(!catalog&&!raw){
    catalog=await resolve({title:seed.title,author:seed.author,isbn:seed.isbn,workKey:seed.workKey}).catch(()=>null);
    const entry=catalog?.members.find(m=>norm(m.title)===norm(seed.title));at=entry?.position??null;
    if(catalog&&!entry)catalog=null;
   }
   return {book,catalog,position:at};
  });
 }
 return {resolve,searchSeries,searchCatalog,lookupBook,seriesForBooks};
}
