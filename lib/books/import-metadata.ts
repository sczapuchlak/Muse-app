import {queryIsbn,type BookCandidate} from './metadata';
/** Goodreads appends a series label to many work titles; keep actual subtitles and arbitrary parentheses. */
export const importTitleKey=(value:string)=>value.replace(/\s*\([^()]*,\s*#\d+(?:\.\d+)?\s*\)\s*$/u,'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const authorKey=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
/** ISBN remains edition authority; title/author may fill work-level gaps only. */
export function verifiedImportCandidates(candidates:readonly BookCandidate[],title:string,author:string,isbn?:string){
 const normalized=isbn?queryIsbn(isbn):undefined;
 return candidates.filter(c=>normalized?queryIsbn(c.isbn13??c.isbn10??'')===normalized:!!author&&importTitleKey(c.title)===importTitleKey(title)&&c.authors.some(a=>authorKey(a)===authorKey(author)));
}
