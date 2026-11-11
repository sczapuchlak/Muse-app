import type {CanonicalItem} from './models';

/**
 * The Library's search, filters and sorting, extracted so they always run over the whole collection and
 * can be tested without a browser. Pagination slices the result; it never decides what matches.
 */
export type LibraryFilters={kind:string;status:string;genre:string;rating:string;tag:string;seriesIds:ReadonlySet<string|null>|null;favoriteOnly:boolean;addedAfter:string;completedAfter:string;search:string};
export const collectionSortIds=['recent','oldest','completed','rating','title','author'] as const;

const completedOn=(item:CanonicalItem)=>item.book?.finishedOn??item.media?.completed_on??'';
/** Lower-cased searchable text, built once per item and series-name set rather than once per keystroke. */
function searchText(item:CanonicalItem,seriesNames:ReadonlyMap<string,string[]>){return `${item.title} ${item.creator} ${item.genre} ${(item.media?.tags??[]).join(' ')} ${seriesNames.get(item.id)?.join(' ')??''} ${item.status}`.toLowerCase();}

export function browseLibrary(items:readonly CanonicalItem[],filters:LibraryFilters,sort:string,seriesNames:ReadonlyMap<string,string[]>):CanonicalItem[]{
 const needle=filters.search.trim().toLowerCase(),genre=filters.genre,tag=filters.tag.toLowerCase();
 const rows=items.filter(item=>{
  if(filters.kind!=='all'&&item.kind!==filters.kind)return false;
  if(filters.status&&filters.status!=='archived'&&item.status!==filters.status)return false;
  if(genre&&!item.genre.split(',').some(value=>value.trim()===genre))return false;
  if(filters.rating&&item.rating!==Number(filters.rating))return false;
  if(tag&&!(item.media?.tags??[]).some(value=>value.toLowerCase().includes(tag)))return false;
  if(filters.seriesIds&&!filters.seriesIds.has(item.id))return false;
  if(filters.favoriteOnly&&!item.favorite)return false;
  if(filters.addedAfter&&item.createdAt.slice(0,10)<filters.addedAfter)return false;
  if(filters.completedAfter&&completedOn(item)<filters.completedAfter)return false;
  return !needle||searchText(item,seriesNames).includes(needle);
 });
 // A stable final tie-break (title, then id) keeps every card on the same page between renders and visits.
 const tie=(a:CanonicalItem,b:CanonicalItem)=>a.title.localeCompare(b.title)||a.id.localeCompare(b.id);
 const compare=(a:CanonicalItem,b:CanonicalItem)=>{
  switch(sort){
   case 'title':return a.title.localeCompare(b.title);
   case 'author':return (a.creator||'￿').localeCompare(b.creator||'￿')||a.title.localeCompare(b.title);
   case 'oldest':return a.createdAt.localeCompare(b.createdAt);
   case 'rating':return (b.rating??0)-(a.rating??0)||a.title.localeCompare(b.title);
   case 'completed':return completedOn(b).localeCompare(completedOn(a));
   default:return b.updatedAt.localeCompare(a.updatedAt);
  }
 };
 return rows.sort((a,b)=>compare(a,b)||tie(a,b));
}
