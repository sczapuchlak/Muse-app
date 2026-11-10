/** Bounded, on-demand series references. No edition or cover lookup happens here. */
import {isbnDigits,plainText} from './metadata';

export type CatalogSource='hardcover'|'wikidata'|'open-library';
export type CatalogMember={source:CatalogSource;id:string;title:string;author:string;position:number|null;positionLabel:string;workKey?:string;role?:'mainline'|'optional';releaseDate?:string;releaseState?:'released'|'announced'|'unknown'};
export type SeriesCatalog={source:CatalogSource;id:string;title:string;members:CatalogMember[];complete:false;author?:string;description?:string;primaryCount?:number;totalCount?:number};
export type SeriesHit={source:'hardcover';id:string;title:string;author:string;primaryCount:number|null;totalCount:number|null};
export type SeriesSeed={title:string;author?:string;isbn?:string;workKey?:string;source?:CatalogSource;sourceId?:string};
type Fetcher=typeof fetch;
const OL='https://openlibrary.org',WD='https://query.wikidata.org/sparql',HC='https://api.hardcover.app/v1/graphql';
const text=(x:unknown,max=500)=>typeof x==='string'?plainText(x,max):'';
const olWork=(x:unknown)=>typeof x==='string'&&/^\/?(?:works\/)?OL\d+W$/.test(x)?x.match(/OL\d+W/)?.[0]:undefined;
const qid=(x:unknown)=>typeof x==='string'&&/^Q\d+$/.test(x)?x:undefined;
const position=(x:unknown)=>{const n=typeof x==='number'?x:typeof x==='string'&&/^\d+(?:\.\d{1,2})?$/.test(x)?Number(x):NaN;return Number.isFinite(n)&&n>=0&&n<9000?n:null;};
const tail=(x:unknown)=>typeof x==='string'?x.split('/').at(-1)??'':'';
const norm=(x:string)=>x.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

export function createSeriesResolver({fetcher=fetch,hardcoverKey=()=>process.env.HARDCOVER_API_KEY,timeoutMs=9000,now=()=>Date.now()}:{fetcher?:Fetcher;hardcoverKey?:()=>string|undefined;timeoutMs?:number;now?:()=>number}={}){
 const cache=new Map<string,{at:number;value:SeriesCatalog|null}>();
 async function json(url:string,init:RequestInit={}){const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeoutMs);try{const r=await fetcher(url,{...init,signal:c.signal});if(!r.ok)throw Error(`Series source ${r.status}`);return await r.json() as Record<string,unknown>;}finally{clearTimeout(timer);}}
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
  const members=rows.map(row=>{const bookId=qid(tail(row.book?.value)),name=text(row.title?.value),pos=position(row.ordinal?.value);return bookId&&name?{source:'wikidata' as const,id:bookId,title:name,author:'',position:pos,positionLabel:pos===null?'':text(row.ordinal?.value,24),...(olWork(row.ol?.value)?{workKey:`/works/${olWork(row.ol?.value)}`}:{} )}:null;}).filter((m):m is NonNullable<typeof m>=>!!m);
  return members.length&&title?{source:'wikidata',id,title,members,complete:false}:null;
 }
 async function openLibrary(seed:SeriesSeed,work?:string):Promise<SeriesCatalog|null>{
  let tag=seed.source==='open-library'?seed.sourceId:undefined;
  if(!tag&&work){const data=await json(`${OL}/works/${work}.json`,{headers:{'User-Agent':'Muse series discovery (contact: project owner)'}}),subjects=Array.isArray(data.subjects)?data.subjects:[];tag=subjects.map(s=>text(s)).find(s=>/^series:/i.test(s))?.slice(7);}
  if(!tag||tag.length>120)return null;
  const u=new URL(`${OL}/search.json`);u.searchParams.set('q',`subject:series:${tag}`);u.searchParams.set('fields','key,title,author_name');u.searchParams.set('limit','60');
  const data=await json(u.toString(),{headers:{'User-Agent':'Muse series discovery (contact: project owner)'}}),docs=Array.isArray(data.docs)?data.docs as {key?:unknown;title?:unknown;author_name?:unknown}[]:[];
  const members=docs.map(d=>{const key=olWork(d.key),name=text(d.title);return key&&name?{source:'open-library' as const,id:key,title:name,author:text(Array.isArray(d.author_name)?d.author_name[0]:''),position:null,positionLabel:'',workKey:`/works/${key}`}:null;}).filter((m):m is NonNullable<typeof m>=>!!m);
  return members.length?{source:'open-library',id:tag,title:tag.replace(/_/g,' '),members,complete:false}:null;
 }
 async function hardcover(seed:SeriesSeed):Promise<SeriesCatalog|null>{
  const key=hardcoverKey()?.trim();if(!key)return null;
  let seriesId=seed.source==='hardcover'&&/^\d+$/.test(seed.sourceId??'')?Number(seed.sourceId):0;
  if(!seriesId){
   const isbn=isbnDigits(seed.isbn??'');
   let bookIds:number[]=[];
   if(/^97[89]\d{10}$/.test(isbn)){
    const found=await gql('query($isbn:String!){editions(where:{isbn_13:{_eq:$isbn}},limit:3){book_id}}',{isbn});
    bookIds=((found?.editions as {book_id?:number}[]|undefined)??[]).map(e=>e.book_id).filter((id):id is number=>typeof id==='number');
   }
   if(!bookIds.length&&seed.title){
    const found=await gql('query($query:String!){search(query:$query,query_type:"book",per_page:8){ids}}',{query:seed.title.slice(0,120)});
    bookIds=((found?.search as {ids?:number[]}|undefined)?.ids??[]).filter(id=>Number.isInteger(id));
   }
   if(!bookIds.length)return null;
   const found=await gql('query($ids:[Int!]!){books(where:{id:{_in:$ids}},limit:8){id title contributions{author{name}} book_series{series_id featured}}}',{ids:bookIds});
   const books=(found?.books as {title?:string;contributions?:{author?:{name?:string}}[];book_series?:{series_id:number;featured:boolean}[]}[]|undefined)??[];
   const author=seed.author;
   const matches=books.filter(b=>norm(text(b.title))===norm(seed.title)&&(!author||b.contributions?.some(c=>norm(text(c.author?.name))===norm(author))));
   const memberships=matches.flatMap(b=>b.book_series??[]),featured=[...new Set(memberships.filter(m=>m.featured).map(m=>m.series_id))],all=[...new Set(memberships.map(m=>m.series_id))];
   const ids=featured.length===1?featured:featured.length===0&&all.length===1?all:[];
   if(ids.length!==1)return null;seriesId=ids[0];
  }
  const result=await gql('query($id:Int!){series_by_pk(id:$id){id name description books_count primary_books_count is_completed author{name} book_series(order_by:{position:asc},limit:100){position featured compilation book{id title release_date contributions{author{name}}}}}}',{id:seriesId});
  const series=result?.series_by_pk as {id?:number;name?:string;description?:string;books_count?:number;primary_books_count?:number;author?:{name?:string};book_series?:{position?:unknown;featured?:boolean;compilation?:boolean;book?:{id?:number;title?:string;release_date?:string;contributions?:{author?:{name?:string}}[]}}[]} | null;
  if(!series?.id||!series.name)return null;
  const members=(series.book_series??[]).map(row=>{const id=row.book?.id,name=text(row.book?.title),pos=position(row.position);if(typeof id!=='number'||!name)return null;const releaseDate=text(row.book?.release_date,20);return {source:'hardcover' as const,id:String(id),title:name,author:text(row.book?.contributions?.[0]?.author?.name)||text(series.author?.name),position:pos,positionLabel:pos===null?'':String(row.position),role:row.featured&&!row.compilation?'mainline' as const:'optional' as const,releaseDate,releaseState:releaseDate?(releaseDate>new Date(now()).toISOString().slice(0,10)?'announced' as const:'released' as const):'unknown' as const};}).filter((m):m is NonNullable<typeof m>=>!!m);
  return members.length?{source:'hardcover',id:String(series.id),title:text(series.name),author:text(series.author?.name),description:text(series.description,600),primaryCount:typeof series.primary_books_count==='number'?series.primary_books_count:undefined,totalCount:typeof series.books_count==='number'?series.books_count:undefined,members,complete:false}:null;
 }
 async function gql(query:string,variables:Record<string,unknown>){const key=hardcoverKey()?.trim();if(!key)throw Error('Hardcover is not configured');const data=await json(HC,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','User-Agent':'Muse Series Discovery'},body:JSON.stringify({query,variables})});if(Array.isArray(data.errors)&&data.errors.length)throw Error('Hardcover query unavailable');return data.data as Record<string,unknown>|undefined;}
 async function searchSeries(query:string):Promise<SeriesHit[]>{if(!hardcoverKey()?.trim())return [];const found=await gql('query($query:String!){search(query:$query,query_type:"series",per_page:10){ids}}',{query:query.slice(0,120)});const ids=((found?.search as {ids?:number[]}|undefined)?.ids??[]).filter(id=>Number.isInteger(id));if(!ids.length)return [];const data=await gql('query($ids:[Int!]!){series(where:{id:{_in:$ids}},limit:10){id name books_count primary_books_count author{name}}}',{ids});return ((data?.series as {id?:number;name?:string;books_count?:number;primary_books_count?:number;author?:{name?:string}}[]|undefined)??[]).filter(s=>typeof s.id==='number'&&!!s.name).map(s=>({source:'hardcover' as const,id:String(s.id),title:text(s.name),author:text(s.author?.name),primaryCount:typeof s.primary_books_count==='number'?s.primary_books_count:null,totalCount:typeof s.books_count==='number'?s.books_count:null}));}
 async function resolve(seed:SeriesSeed,{refresh=false}:{refresh?:boolean}={}):Promise<SeriesCatalog|null>{
  const cacheKey=JSON.stringify(seed),hit=cache.get(cacheKey);if(!refresh&&hit&&now()-hit.at<12*60*60_000)return hit.value;
  const sources=['hardcover','wikidata','open-library'] as const;let work:string|undefined;
  for(const source of sources){try{if(source!=='hardcover'&&!work)work=await openLibraryWork(seed);const result=source==='hardcover'?await hardcover(seed):source==='wikidata'?await wikidata(seed,work):await openLibrary(seed,work);if(result){cache.set(cacheKey,{at:now(),value:result});if(cache.size>100)cache.delete(cache.keys().next().value as string);return result;}}catch{/* next source */}}
  cache.set(cacheKey,{at:now(),value:null});return null;
 }
 return {resolve,searchSeries};
}
