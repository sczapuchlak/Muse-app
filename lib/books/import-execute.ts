import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';
import {preserveOpinions} from '@/lib/whimsy/reading-cycles';
import {bookCompletions} from '@/lib/whimsy/reading-stats';
import type {ImportPlanRow} from './import-plan';
import type {ImportSeriesLink} from './import-series';
import type {BookCompletion} from '@/lib/whimsy/models';

export type ImportCommand={title:string;rowIndex:number;historyAdded:number;command:{p_batch:string;p_source:string;p_source_id:string;p_book:Record<string,unknown>;p_revision:number;p_observed:Record<string,unknown>;p_observation:Record<string,unknown>;p_command_id:string;p_series:ImportSeriesLink|null;p_shelves:string[]}};
type Rpc=(name:string,args:ImportCommand['command'])=>PromiseLike<{data:unknown;error:{message:string;code?:string}|null}>;
export type ImportResult={saved:number;added:number;preserved:number;historyAdded:number;remaining:number;errors:{title:string;message:string;rowIndex:number}[];seriesAttention:number;collectionAttention:number;completedIds:string[];books:{id:string;title:string}[]};
/** Build stable commands once, after review; retain the same command across uncertain retries. */
export function prepareGoodreadsCommands(plan:readonly ImportPlanRow[],batchId:string,now:string,makeId:()=>string,includeShelves=true):ImportCommand[]{
 return plan.flatMap((item,rowIndex)=>{
  const row=item.row;if(item.kind==='review'||item.skip||!row.sourceId)return [];
  const source=row.source??'goodreads',id=item.book?.id??makeId(),kept=item.book?preserveOpinions(item.book):undefined;
  const book:Record<string,unknown>=kept?Object.fromEntries(Object.entries(kept).filter(([key,value])=>!['userId','revision','createdAt','updatedAt'].includes(key)&&value!==undefined)):{id,title:row.title,status:row.status??'planned',reviewEmojis:[]};
  const offered:Record<string,unknown>={...item.metadata,description:row.description??item.metadata?.description,coverUrl:row.coverUrl??item.metadata?.coverUrl,author:row.author??item.metadata?.author,isbn:row.isbn??item.metadata?.isbn,publisher:row.publisher??item.metadata?.publisher,publishedDate:row.publishedDate??item.metadata?.publishedDate,totalPages:row.pages??item.metadata?.totalPages,genre:row.genre??item.metadata?.genre,format:row.format??item.metadata?.format};
  for(const [field,value]of Object.entries(offered))if(value!==undefined&&value!==''&&(book[field]===undefined||book[field]===''))book[field]=value;
  if(kept?.metadataSource&&item.metadata?.metadataSource)book.metadataSource={...item.metadata.metadataSource,...kept.metadataSource};
  if(!kept){if(row.rating!==undefined)book.rating=row.rating;if(row.review)book.finalThoughts=row.review;if(row.startedOn&&(!row.finishedOn||row.status==='finished'))book.startedOn=row.startedOn;if(row.finishedOn&&row.status==='finished')book.finishedOn=row.finishedOn;if(row.currentPage!==undefined)book.currentPage=row.currentPage;}
  const replacements:Record<string,unknown>={rating:row.rating,finalThoughts:row.review,genre:row.genre,publisher:row.publisher,totalPages:row.pages};
  for(const field of item.useFields??[])if(replacements[field]!==undefined)book[field]=replacements[field];
  let cycleId=item.cycleId,historyAdded=0;
  if(kept&&cycleId)book.completions=bookCompletions(kept);
  if(row.finishedOn&&(!kept||item.historyAction==='add')&&!cycleId){
   const previous=kept?bookCompletions(kept):[];
   if(kept&&!previous.length){if(kept.rating!==undefined)book.unassignedRating=kept.rating;if(kept.finalThoughts)book.unassignedReview=kept.finalThoughts;if(kept.reviewEmojis.length)book.unassignedEmojis=kept.reviewEmojis;}
   const existing=previous.find(c=>c.importSource===source&&c.finishedOn===row.finishedOn);
   cycleId=existing?.id??`${id}:import:${makeId()}`;
   if(!existing){book.completions=[...previous,{id:cycleId,finishedOn:row.finishedOn,...(row.startedOn?{startedOn:row.startedOn}:{}),recordedAt:now,importSource:source,...(!kept&&row.rating!==undefined?{rating:row.rating}:{}),...(!kept&&row.review?{review:row.review}:{})}].sort((a,b)=>a.finishedOn.localeCompare(b.finishedOn));historyAdded=1;}
  }
  const museBefore:Record<string,unknown>={};
  if(kept){for(const [field,opinion]of [['rating','rating'],['finalThoughts','review']] as const){
   if(!item.useFields?.includes(field)||replacements[field]===undefined)continue;
   if(kept[field]!==undefined)museBefore[field]=kept[field];
   const reads=(book.completions as BookCompletion[]|undefined)??bookCompletions(kept),originalIds=new Set(bookCompletions(kept).map(c=>c.id)),originalReads=reads.filter(c=>originalIds.has(c.id)),target=originalReads.findLast(c=>!c.importSource&&c[opinion]!==undefined)??originalReads.findLast(c=>c[opinion]!==undefined)??originalReads.at(-1);
   if(target){book.completions=reads.map(c=>c.id===target.id?{...c,[opinion]:replacements[field]}:c);museBefore[`${field}ReadId`]=target.id;if(target[opinion]!==undefined)museBefore[`${field}ReadValue`]=target[opinion];}
   else if(field==='rating')book.unassignedRating=replacements[field];else book.unassignedReview=replacements[field];
  }}
  const observed=JSON.parse(JSON.stringify(row)) as Record<string,unknown>;
  return [{title:row.title,rowIndex,historyAdded,command:{p_batch:batchId,p_source:source,p_source_id:row.sourceId,p_book:book,p_revision:item.book?.revision??0,p_observed:observed,p_observation:{...observed,...(cycleId?{cycleId}:{}),...(Object.keys(museBefore).length?{museBefore}:{})},p_command_id:makeId(),p_series:item.series??null,p_shelves:includeShelves?row.shelves.filter(s=>!['read','currently-reading','to-read'].includes(s.toLowerCase())).slice(0,100):[]}}];
 });
}
/** Sequential bounded transactions; individual failures can be retried without undoing confirmed books. */
export async function executeImportCommands(client:SupabaseClient<Database>,commands:readonly ImportCommand[],progress:(done:number,total:number)=>void,signal?:AbortSignal,confirmed=new Set<string>()):Promise<ImportResult>{
 const call=client.rpc.bind(client) as unknown as Rpc,result:ImportResult={saved:0,added:0,preserved:0,historyAdded:0,remaining:commands.length,errors:[],seriesAttention:0,collectionAttention:0,completedIds:[],books:[]};
 for(let i=0;i<commands.length;i++){
  if(signal?.aborted||typeof navigator!=='undefined'&&navigator.onLine===false)break;
  const item=commands[i],id=item.command.p_command_id;
  const count=()=>{result.saved++;if(item.command.p_revision===0)result.added++;else result.preserved++;result.historyAdded+=item.historyAdded??0;result.remaining--;result.books.push({id:String(item.command.p_book.id),title:item.title});};
  if(confirmed.has(id)){count();result.completedIds.push(id);progress(i+1,commands.length);continue;}
  try{
   let response=await call('save_imported_book',item.command);
   if(response.error&&['PGRST000','PGRST001','08006'].includes(response.error.code??''))response=await call('save_imported_book',item.command);
   if(response.error)throw Error(response.error.message);
   const receipt=response.data as {sourceId?:string;seriesState?:string;collectionAttention?:number}|null;
   if(receipt?.sourceId!==item.command.p_book.id)throw Error('The import could not be confirmed. Retry this batch.');
   confirmed.add(id);count();result.completedIds.push(id);if(receipt?.seriesState==='review')result.seriesAttention++;result.collectionAttention+=receipt?.collectionAttention??0;
  }catch(error){result.remaining--;result.errors.push({title:item.title,rowIndex:item.rowIndex,message:error instanceof Error?error.message:'Could not confirm this book. Retry or prepare a fresh preview.'});}
  progress(i+1,commands.length);
 }
 return result;
}
