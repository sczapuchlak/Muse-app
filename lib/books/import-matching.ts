import {queryIsbn} from './metadata';

export type IdentityBook={id:string;title:string;author?:string;isbn?:string};
export type SourceIdentity={source:string;sourceId:string;bookId:string};
export type IncomingIdentity={source:string;sourceId?:string;title:string;author?:string;isbn?:string};
export type IdentityMatch={kind:'match';bookId:string;basis:'source'|'isbn'|'title-author'}|{kind:'review';bookIds:string[];reason:string}|{kind:'new'};
const norm=(s:string)=>s.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');

/** A unique exact identity is required; contradictory or multiple candidates are never merged automatically. */
export function matchImportedBook(incoming:IncomingIdentity,books:readonly IdentityBook[],identities:readonly SourceIdentity[]):IdentityMatch{
 return createBookMatcher(books,identities)(incoming);
}
/** Index the current Library once for large imports. */
export function createBookMatcher(books:readonly IdentityBook[],identities:readonly SourceIdentity[]){
 const existing=new Set(books.map(book=>book.id));
 const isbnIndex=new Map<string,string[]>(),nameIndex=new Map<string,string[]>(),titleIndex=new Map<string,string[]>(),sourceIndex=new Map<string,string[]>(),byId=new Map(books.map(book=>[book.id,book]));
 const add=(map:Map<string,string[]>,key:string,id:string)=>{const list=map.get(key)??[];list.push(id);map.set(key,list);};
 for(const book of books){const isbn=book.isbn&&queryIsbn(book.isbn),title=norm(book.title),author=norm(book.author??'');if(isbn)add(isbnIndex,isbn,book.id);if(title)add(titleIndex,title,book.id);if(title&&author)add(nameIndex,JSON.stringify([title,author]),book.id);}
 for(const i of identities)if(existing.has(i.bookId))add(sourceIndex,JSON.stringify([i.source,i.sourceId]),i.bookId);
 return (incoming:IncomingIdentity):IdentityMatch=>{
 const source=incoming.sourceId?sourceIndex.get(JSON.stringify([incoming.source,incoming.sourceId]))??[]:[];
 const isbn=incoming.isbn?queryIsbn(incoming.isbn):undefined;
 const byIsbn=isbn?isbnIndex.get(isbn)??[]:[];
 const title=norm(incoming.title),author=norm(incoming.author??'');
 const byName=title&&author?nameIndex.get(JSON.stringify([title,author]))??[]:[];
 for(const [basis,ids] of [['source',source],['isbn',byIsbn],['title-author',byName]] as const){
  const unique=[...new Set(ids)];if(unique.length>1)return {kind:'review',bookIds:unique,reason:`Multiple books match ${basis}.`};
  if(unique.length===1){
   // A source or ISBN hit that contradicts another strong identifier deserves review.
   const other=basis==='source'?byIsbn:[];
   if(other.some(id=>id!==unique[0]))return {kind:'review',bookIds:[...new Set([...unique,...other])],reason:'Source ID and ISBN point to different books.'};
   if(basis==='title-author'&&isbn){const found=byId.get(unique[0]),savedIsbn=found?.isbn?queryIsbn(found.isbn):undefined;if(savedIsbn&&savedIsbn!==isbn)return {kind:'review',bookIds:unique,reason:'Title and author match, but the editions have different ISBNs.'};}
   return {kind:'match',bookId:unique[0],basis};
  }
 }
 const uncertain=(titleIndex.get(title)??[]).filter(id=>!author||!byId.get(id)?.author);
 if(uncertain.length)return {kind:'review',bookIds:uncertain,reason:'Title matches, but an author or identifier is missing. Choose a book to confirm.'};
 return {kind:'new'};
 };
}
