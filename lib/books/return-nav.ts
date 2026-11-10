/**
 * Contextual return for Book and Series pages (#136). An in-app open records where the reader came from; Back
 * then uses real browser history (restoring scroll, search and modal state) whenever the page was reached
 * that way, and otherwise goes to the page's natural parent.
 */
export type ReturnContext={href:string;label:string};
const KEY='muse.books.return';
type Entry={to:string;from:string;label:string};
const here=()=>`${window.location.pathname}${window.location.search}`;
function read():Entry[]{try{const value=JSON.parse(sessionStorage.getItem(KEY)??'[]');return Array.isArray(value)?value.filter(e=>e&&typeof e.to==='string'&&typeof e.from==='string'&&typeof e.label==='string').slice(-20):[];}catch{return [];}}
function write(entries:Entry[]){try{sessionStorage.setItem(KEY,JSON.stringify(entries.slice(-20)));}catch{/* Back falls back to the natural parent. */}}

/** Records the current page as the return point before an in-app navigation to `to`. */
export function rememberReturn(to:string,label:string){if(typeof window==='undefined')return;write([...read(),{to,from:here(),label}]);}
/** Where Back goes from the current page, if it was opened in-app. */
export function currentReturn():ReturnContext|null{
 if(typeof window==='undefined')return null;
 const top=read().at(-1);return top&&top.to===here()?{href:top.from,label:top.label}:null;
}
/** Leaves the page: browser Back when it was opened in-app, otherwise a replace to the parent. */
export function goBack(router:{back:()=>void;replace:(href:string)=>void},fallback:string){
 const entries=read(),top=entries.at(-1);
 if(top&&top.to===here()){write(entries.slice(0,-1));router.back();return;}
 router.replace(fallback);
}
export const bookHref=(id:string,from?:string)=>`/collections/books/${encodeURIComponent(id)}${from?`?from=${encodeURIComponent(from)}`:''}`;
export const seriesHref=(key:string,from?:string)=>`/collections/series/${encodeURIComponent(key)}${from?`?from=${encodeURIComponent(from)}`:''}`;
/** A series route key: a saved series id, or `<source>-<catalog id>` for an unsaved catalog series. */
export const catalogSeriesKey=(source:string,id:string)=>`${source}-${id}`;
export function parseSeriesKey(key:string):{savedId:string}|{source:'hardcover'|'wikidata'|'open-library';id:string}{
 const match=key.match(/^(hardcover|wikidata|open-library)-(.+)$/);
 return match?{source:match[1] as 'hardcover'|'wikidata'|'open-library',id:match[2]}:{savedId:key};
}
