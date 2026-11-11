import type {Book} from '@/lib/whimsy/models';
import {bookCompletions} from '@/lib/whimsy/reading-stats';
import {createBookMatcher,type SourceIdentity} from './import-matching';
import type {GoodreadsRow} from './import-goodreads';
import type {ImportSeriesLink} from './import-series';
import {queryIsbn} from './metadata';

export type ImportPlanRow={row:GoodreadsRow;sourceRow?:GoodreadsRow;resolvedIssues?:string[];kind:'new'|'matched'|'review';book?:Book;reason?:string;cycleId?:string;conflicts:string[];skip?:boolean;historyAction?:'preserve'|'add';useFields?:string[];metadata?:Partial<Book>;metadataAddition?:boolean;series?:ImportSeriesLink;seriesNote?:string;unchanged?:boolean;sourceChanged?:boolean};
export function sameImportedValues(a:unknown,b:unknown):boolean{
 const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):value;
 return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
}
/** Preview only. Existing Muse data is never modified by this planner. */
export function planGoodreads(rows:readonly GoodreadsRow[],books:readonly Book[],identities:readonly SourceIdentity[]):ImportPlanRow[]{
 const seen=new Set<string>(),seenBooks=new Set<string>(),matchBook=createBookMatcher(books,identities),booksById=new Map(books.map(book=>[book.id,book]));
 return rows.map(row=>{
  if(!row.title||row.title.length>500||!row.sourceId||row.sourceId.length>300||(row.review?.length??0)>50000)return {row,kind:'review',reason:'A title (up to 500 characters), source ID and review under 50,000 characters are needed.',conflicts:[]};
  if(seen.has(row.sourceId))return {row,kind:'review',reason:'This source ID appears more than once in the file.',conflicts:[]};
  seen.add(row.sourceId);
  const isbn=row.isbn?queryIsbn(row.isbn):undefined,name=JSON.stringify([row.title,row.author??''].map(s=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim())),keys=[`name:${name}`,...(isbn?[`isbn:${isbn}`]:[])];
  if(keys.some(k=>seenBooks.has(k)))return {row,kind:'review',reason:'Another row may represent this same book or a different edition. Skip it or choose a saved Muse book.',conflicts:[]};
  keys.forEach(k=>seenBooks.add(k));
  const match=matchBook({source:row.source??'goodreads',sourceId:row.sourceId,title:row.title,author:row.author,isbn:row.isbn});
  if(match.kind==='review')return {row,kind:'review',reason:match.reason,conflicts:[]};
  if(match.kind==='new')return {row,kind:'new',conflicts:row.warnings};
  const book=booksById.get(match.bookId)!;
  const conflicts=[...row.warnings];
  if(row.status&&row.status!==book.status)conflicts.push('Reading status differs; Muse keeps its current status.');
  if(row.rating!==undefined&&book.rating!==undefined&&row.rating!==book.rating)conflicts.push('Rating differs; Muse keeps its current rating.');
  if(row.review&&book.finalThoughts&&row.review!==book.finalThoughts)conflicts.push('Review differs; Muse keeps its current review.');
  const completions=bookCompletions(book),same=row.finishedOn?completions.filter(value=>value.finishedOn===row.finishedOn):[];
  const earliestStart=[...completions.map(c=>c.startedOn),book.startedOn].filter((d):d is string=>!!d).sort()[0];
  const separate=row.status!=='dnf'&&!!row.finishedOn&&!same.length&&!completions.some(c=>!!c.importSource)&&!!earliestStart&&row.finishedOn<earliestStart;
  if(row.finishedOn&&same.length!==1&&!separate)conflicts.push('The reading date needs review before it can count as another read.');
  // Legacy completions are synthesized and must not be linked until stored on the book.
  const cycleId=same.length===1?same[0].id:undefined;
  return {row,kind:'matched',book,cycleId,historyAction:separate?'add':'preserve',conflicts};
 });
}
