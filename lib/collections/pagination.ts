/**
 * Library pagination. Pure helpers: the Library keeps every record in memory so search, sort and filters
 * always run over the whole collection, and only the current page of cards is ever mounted.
 */
export const PAGE_SIZES=[12,24,48,96] as const;
export type PageSize=(typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE:PageSize=24;

export const isPageSize=(value:unknown):value is PageSize=>PAGE_SIZES.includes(value as PageSize);
/** A saved or URL page size, or the default when it is missing or not one of the supported sizes. */
export function parsePageSize(value:string|null|undefined,fallback:PageSize=DEFAULT_PAGE_SIZE):PageSize{const n=Number(value);return isPageSize(n)?n:fallback;}
/** A 1-based page number from a URL; anything that is not a positive whole number is page 1. */
export function parsePage(value:string|null|undefined):number{const n=Number(value);return Number.isInteger(n)&&n>=1?n:1;}

export const pageCount=(total:number,size:number)=>Math.max(1,Math.ceil(Math.max(0,total)/size));
/** Keeps a page inside 1…last, so a shrinking result never leaves the reader on an empty page. */
export const clampPage=(page:number,total:number,size:number)=>Math.min(Math.max(1,Math.floor(page)||1),pageCount(total,size));

export type PageWindow={page:number;pages:number;size:number;total:number;start:number;end:number;from:number;to:number};
/** `start`/`end` slice the full list; `from`/`to` are the 1-based numbers shown to the reader (0–0 when empty). */
export function pageWindow(total:number,page:number,size:number):PageWindow{
 const pages=pageCount(total,size),current=clampPage(page,total,size),start=total?(current-1)*size:0,end=Math.min(total,start+size);
 return {page:current,pages,size,total,start,end,from:total?start+1:0,to:end};
}
export function pageItems<T>(items:readonly T[],window:Pick<PageWindow,'start'|'end'>):T[]{return items.slice(window.start,window.end);}

/** Page size change keeps the first card the reader was looking at on screen. */
export const pageAfterResize=(page:number,oldSize:number,newSize:number)=>Math.floor(((Math.max(1,page)-1)*oldSize)/newSize)+1;

/** Page numbers to show: first, last, and a window around the current page, with `null` marking a gap. */
export function pageButtons(page:number,pages:number,around=1):(number|null)[]{
 const keep=new Set<number>([1,pages]);for(let i=page-around;i<=page+around;i++)if(i>=1&&i<=pages)keep.add(i);
 const sorted=[...keep].sort((a,b)=>a-b),out:(number|null)[]=[];
 sorted.forEach((n,i)=>{const previous=sorted[i-1];if(previous!==undefined&&n-previous===2)out.push(previous+1);else if(previous!==undefined&&n-previous>2)out.push(null);out.push(n);});
 return out;
}
