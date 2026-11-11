import {NextResponse,type NextRequest} from 'next/server';
import {privateResponse,routeAuthClient,trustedOrigin} from '@/lib/auth/http';
import {allowLookup} from '@/lib/books/rate-limit';
import {seriesResolver} from '@/lib/books/series-service';
import {bookLookup} from '@/lib/books/service';
import {candidateFields,metadataSource,queryIsbn} from '@/lib/books/metadata';
import type {Book} from '@/lib/whimsy/models';

export const maxDuration=120;
const norm=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const field=(v:unknown,n:number)=>typeof v==='string'?v.trim().slice(0,n):'';
/** Bounded metadata batches; personal reviews, statuses and source account IDs never leave Muse. */
export async function POST(request:NextRequest){
 const base=privateResponse(NextResponse.json({}));
 const respond=(value:unknown,status=200)=>{const response=privateResponse(NextResponse.json(value,{status}));for(const cookie of base.cookies.getAll())response.cookies.set(cookie);return response;};
 if(!trustedOrigin(request))return respond({error:'Use Muse from its configured origin.'},403);
 const client=routeAuthClient(request,base),auth=await client.auth.getUser();
 if(auth.error||!auth.data.user)return respond({error:'Sign in to import books.'},401);
 if(!allowLookup(auth.data.user.id,Date.now(),30))return respond({error:'Metadata lookup is busy. Your books can still be imported without enrichment.'},429);
 const text=await request.text();if(text.length>12000)return respond({error:'Metadata batch is too large.'},413);
 let raw:unknown;try{raw=JSON.parse(text);}catch{return respond({error:'Invalid metadata request.'},400);}
 const rows=(raw as {books?:unknown})?.books;if(!Array.isArray(rows)||rows.length>4)return respond({error:'Choose up to four books per metadata batch.'},400);
 const results=[];
 // Two upstream operations per book run in parallel; books themselves are sequential to bound provider pressure.
 for(const input of rows){
  const r=(input??{}) as Record<string,unknown>,key=field(r.key,100),title=field(r.title,500),author=field(r.author,300),isbn=queryIsbn(field(r.isbn,30));
  if(!key||!title){results.push({key,warning:'A title is needed for enrichment.'});continue;}
  try{
   const [found,lookup]=await Promise.all([bookLookup.search(isbn??`${title} ${author}`).catch(()=>null),author||isbn||field(r.hardcoverId,12)?seriesResolver.lookupBook({title,author,isbn,hardcoverBookId:/^\d{1,12}$/.test(field(r.hardcoverId,12))?field(r.hardcoverId,12):undefined}).catch(()=>null):Promise.resolve(null)]);
   const candidates=(found?.results??[]).filter(c=>isbn?queryIsbn(c.isbn13??c.isbn10??'')===isbn:!!author&&norm(c.title)===norm(title)&&c.authors.some(a=>norm(a)===norm(author)));
   const metadata:Partial<Book>={};
   if(candidates.length===1){const c=candidates[0],fields=candidateFields(c);Object.assign(metadata,{coverUrl:fields.coverUrl,description:fields.description,genre:fields.genre,metadataSource:metadataSource(c)});if(isbn)Object.assign(metadata,{totalPages:fields.totalPages?Number(fields.totalPages):undefined,publisher:fields.publisher,publishedDate:fields.publishedDate,format:fields.format});}
   if(lookup?.book){metadata.description??=lookup.book.description;metadata.coverUrl??=lookup.book.coverUrl;metadata.genre??=lookup.book.genres.join(', ');metadata.metadataSource={...(metadata.metadataSource??{provider:'hardcover',importedAt:new Date().toISOString()}),hardcoverId:lookup.book.id};}
   // Return just the verified candidate installment, rather than repeatedly transporting whole catalogs.
   if(lookup?.catalog)lookup.catalog={...lookup.catalog,members:lookup.catalog.members.filter(m=>lookup.book&&m.source==='hardcover'&&m.id===lookup.book.id||!!author&&!!m.author&&norm(m.title)===norm(title)&&norm(m.author)===norm(author))};
   results.push({key,metadata,lookup,warning:!candidates.length&&!lookup?.book?'No verified metadata found; supplied book details will be kept.':undefined});
  }catch{results.push({key,warning:'Metadata providers are unavailable; supplied book details will be kept.'});}
 }
 return respond({results});
}
