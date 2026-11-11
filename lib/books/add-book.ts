/**
 * Client-side Library writes for discovered books (#136): Quick Add from Books search and Add from a
 * series. One path so a book is always saved with its chosen edition, gap-only catalog enrichment and its
 * confident series membership. Personal fields are never overwritten; nothing is fabricated.
 */
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';
import type {Book} from '@/lib/whimsy/models';
import type {CollectionsSnapshot,SeriesMember} from '@/lib/collections/models';
import {saveSeriesMember} from '@/lib/collections/persistence';
import {saveWhimsyRecord} from '@/lib/whimsy/persistence';
import {bookCarryFields} from '@/lib/whimsy/books';
import {editorReadFields} from '@/lib/whimsy/reading-cycles';
import {candidateFields,metadataSource,sameEdition,type BookCandidate} from './metadata';
import type {BookLookup,CatalogBook,SeriesCatalog,SeriesSeed} from './series-discovery';
import {saveDiscoveredSeries} from './series-save';

export type QuickStatus='planned'|'reading';
const norm=(s:string)=>s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

export async function postJson<T>(url:string,body:unknown,signal?:AbortSignal):Promise<T>{
 const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body),signal,cache:'no-store'});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(typeof (data as {error?:unknown})?.error==='string'?(data as {error:string}).error:'Book catalog is unavailable right now.');
 return data as T;
}
export const lookupCatalogBook=(seed:SeriesSeed&{refresh?:boolean},signal?:AbortSignal)=>postJson<BookLookup>('/api/books/series',{action:'book',...seed},signal);
export const fetchSeriesCatalog=(source:string,id:string,title='',refresh=false,signal?:AbortSignal)=>postJson<{catalog:SeriesCatalog|null}>('/api/books/series',{source,sourceId:id,title,refresh},signal).then(r=>r.catalog);
export const fetchEditions=(book:Pick<BookCandidate,'workKey'|'isbn13'|'title'|'authors'>,signal?:AbortSignal)=>postJson<{editions:BookCandidate[];description?:string}>('/api/books/editions',{workKey:book.workKey,isbn:book.isbn13,title:book.title,authors:book.authors},signal);

/**
 * Editions that differ in a way a reader would notice (format, length, publisher, year or language).
 * One remaining choice means there is nothing to ask.
 */
export function distinctEditions(chosen:BookCandidate|null,editions:BookCandidate[]){
 const all=chosen&&!editions.some(e=>sameEdition(chosen,e))?[chosen,...editions]:editions;
 const seen=new Set<string>();
 return all.filter(e=>{const key=[e.format??e.formatLabel??'',e.pageCount??'',norm(e.publisher??''),e.year??'',e.language??''].join('|');if(seen.has(key))return false;seen.add(key);return true;});
}
export function existingLibraryBook(books:Book[],candidate:{title:string;authors:string[];isbn13?:string},hardcoverId?:string){
 const live=books.filter(b=>!b.archivedAt);
 return (hardcoverId&&live.find(b=>b.metadataSource?.hardcoverId===hardcoverId))
  ||(candidate.isbn13&&live.find(b=>b.isbn===candidate.isbn13))
  ||live.find(b=>norm(b.title)===norm(candidate.title)&&(!candidate.authors.length||!b.author||candidate.authors.some(a=>norm(b.author??'').includes(norm(a)))))
  ||null;
}
/**
 * Book-level catalog facts fill only what the chosen edition and the reader left empty. Page counts are
 * edition-specific and change progress, so a saved book is never given one after the fact.
 */
export function enrichFields(book:Pick<Book,'description'|'publishedDate'|'totalPages'|'coverUrl'|'genre'>,catalog:CatalogBook|null,{pages=true}:{pages?:boolean}={}){
 if(!catalog)return {};
 return {...(!book.description&&catalog.description?{description:catalog.description}:{}),...(!book.publishedDate&&catalog.releaseDate?{publishedDate:catalog.releaseDate}:{}),...(pages&&!book.totalPages&&catalog.pages?{totalPages:catalog.pages}:{}),...(!book.coverUrl&&catalog.coverUrl?{coverUrl:catalog.coverUrl}:{}),...(!book.genre&&catalog.genres.length?{genre:catalog.genres.join(', ')}:{})};
}

type Context={client:SupabaseClient<Database>;userId:string;today:string;books:Book[];records:CollectionsSnapshot};
/**
 * Saves one discovered edition to the Library, then records its series membership: either the specific
 * saved installment it was added from, or the series the catalog confidently places it in.
 * Returns the existing book instead when it is already on the shelf.
 */
export async function addDiscoveredBook(ctx:Context,{candidate:chosen,catalogOnly,status,lookup,member}:{candidate:BookCandidate|null;catalogOnly?:{title:string;author:string;coverUrl?:string|null;pages?:number|null};status:QuickStatus;lookup:BookLookup|null;member?:SeriesMember|null}):Promise<{book:Book;seriesId:string|null;existing:boolean}>{
 const hardcoverId=lookup?.book?.id;
 if(!chosen&&!catalogOnly)throw Error('Choose an edition to add.');
 // Without a Google Books or Open Library edition, the catalog's own record is the edition (source: Hardcover).
 const candidate:BookCandidate=chosen??{key:`hardcover:${hardcoverId??crypto.randomUUID()}`,provider:'open-library',title:catalogOnly!.title,authors:catalogOnly!.author?[catalogOnly!.author]:[],genres:[],...(catalogOnly!.coverUrl?{coverUrl:catalogOnly!.coverUrl}:{}),...(catalogOnly!.pages?{pageCount:catalogOnly!.pages}:{})};
 const duplicate=existingLibraryBook(ctx.books,candidate,hardcoverId);
 if(duplicate){
  if(member&&!member.book_id)await saveSeriesMember(ctx.client,{...member,book_id:duplicate.id,media_id:null},member.revision);
  return {book:duplicate,seriesId:member?.series_id??null,existing:true};
 }
 const fields=candidateFields(candidate),id=crypto.randomUUID(),now=new Date().toISOString();
 const base={title:fields.title??candidate.title,author:fields.author??'',genre:fields.genre??'',coverUrl:fields.coverUrl??'',description:fields.description??'',publishedDate:fields.publishedDate??'',totalPages:fields.totalPages?Number(fields.totalPages):undefined};
 const enriched={...base,...enrichFields(base,lookup?.book??null)};
 const cycle=editorReadFields(undefined,{status,startedOn:status==='reading'?ctx.today:'',finishedOn:'',reads:[],review:'',unassigned:{}},{id,revision:0},ctx.today);
 // A book not yet started has no start date: empty strings would be rejected as dates, so they are omitted.
 const reads=Object.fromEntries(Object.entries(cycle).filter(([,value])=>value!==''&&value!==undefined)) as typeof cycle;
 const source=chosen?{...metadataSource(chosen),...(hardcoverId?{hardcoverId,enrichedAt:now}:{})}:{provider:'hardcover' as const,importedAt:now,...(hardcoverId?{hardcoverId,enrichedAt:now}:{})};
 const saved=await saveWhimsyRecord(ctx.client,'books',{record:{id,title:enriched.title,author:enriched.author,genre:enriched.genre,coverUrl:enriched.coverUrl,format:fields.format||'physical',...(enriched.totalPages?{totalPages:enriched.totalPages}:{}),startingPage:0,currentPage:0,positionUpdatedAt:now,positionDate:ctx.today,...reads,reviewEmojis:reads.reviewEmojis??[],...bookCarryFields({isbn:fields.isbn,publisher:fields.publisher,publishedDate:enriched.publishedDate||undefined,description:enriched.description||undefined,metadataSource:source})},expectedRevision:0,commandId:crypto.randomUUID()});
 const book=saved as Book;
 let seriesId:string|null=null;
 try{
  if(member){
   if(!member.book_id)await saveSeriesMember(ctx.client,{...member,book_id:book.id,media_id:null,hidden:false},member.revision);
   seriesId=member.series_id;
  }else if(lookup?.catalog){
   seriesId=(await saveDiscoveredSeries(ctx.client,ctx.userId,lookup.catalog,ctx.records,[...ctx.books,book])).id;
  }
 }catch{/* The book is saved; Book detail retries the series link on open. */}
 return {book,seriesId,existing:false};
}

/**
 * Fills gaps in an existing Library book from its catalog work and records its series, without touching any
 * value the reader set. Returns the fields changed (empty when nothing was missing).
 */
export function enrichmentChanges(book:Book,lookup:BookLookup){
 const fill=enrichFields(book,lookup.book,{pages:false});
 const source=lookup.book&&book.metadataSource?.hardcoverId!==lookup.book.id&&!book.metadataSource?.hardcoverId?{metadataSource:{...(book.metadataSource??{provider:'hardcover' as const,importedAt:new Date().toISOString()}),hardcoverId:lookup.book.id,enrichedAt:new Date().toISOString()}}:{};
 return {...fill,...source};
}
