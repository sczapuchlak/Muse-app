import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Tables} from '@/lib/database.types';
import type {Book} from '@/lib/whimsy/models';
import {readWhimsy} from '@/lib/whimsy/persistence';
import {bookCompletions} from '@/lib/whimsy/reading-stats';
import {allPages,readImportSources,readImportObservations,readImportBatches,readImportSeries,readImportCollectionLinks} from './import-persistence';
import {libraryCsv} from './import-csv';

export function primaryLibraryCsv(books:readonly Book[],collections:Map<string,string[]> = new Map()){
 return libraryCsv([['Muse Book ID','Title','Author','ISBN','Status','Rating','Review','Started On','Finished On','Current Page','Total Pages','Format','Publisher','Published Date','Genre','Collections','Archived At','Description','Cover URL','Edition ID','Work ID','Google Books ID','Hardcover ID','Date Added'],...books.map(b=>[b.id,b.title,b.author,b.isbn,b.status,b.rating,b.finalThoughts,b.startedOn,b.finishedOn,b.currentPage,b.totalPages,b.format,b.publisher,b.publishedDate,b.genre,JSON.stringify(collections.get(b.id)??[]),b.archivedAt,b.description,b.coverUrl,b.metadataSource?.editionKey,b.metadataSource?.workKey,b.metadataSource?.volumeId,b.metadataSource?.hardcoverId,b.createdAt])]);
}
const tableCsv=(rows:readonly Record<string,unknown>[])=>{const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))];return libraryCsv([keys,...rows.map(r=>keys.map(k=>typeof r[k]==='object'?JSON.stringify(r[k]):r[k]))]);};
/** Small standards-compliant, uncompressed ZIP writer; no runtime dependency or server file storage. */
export function csvArchive(files:Record<string,string>):Uint8Array{
 const encoder=new TextEncoder(),parts:Uint8Array[]=[],directory:Uint8Array[]=[];let offset=0;
 const u16=(v:DataView,p:number,n:number)=>v.setUint16(p,n,true),u32=(v:DataView,p:number,n:number)=>v.setUint32(p,n,true);
 for(const [name,content]of Object.entries(files)){
  const filename=encoder.encode(name),data=encoder.encode(content);let crc=0xffffffff;for(const byte of data){crc^=byte;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
  const header=new Uint8Array(30+filename.length),v=new DataView(header.buffer);u32(v,0,0x04034b50);u16(v,4,20);u16(v,6,0x0800);u16(v,12,33);u32(v,14,crc);u32(v,18,data.length);u32(v,22,data.length);u16(v,26,filename.length);header.set(filename,30);parts.push(header,data);
  const central=new Uint8Array(46+filename.length),c=new DataView(central.buffer);u32(c,0,0x02014b50);u16(c,4,20);u16(c,6,20);u16(c,8,0x0800);u16(c,14,33);u32(c,16,crc);u32(c,20,data.length);u32(c,24,data.length);u16(c,28,filename.length);u32(c,42,offset);central.set(filename,46);directory.push(central);offset+=header.length+data.length;
 }
 const dirLength=directory.reduce((n,p)=>n+p.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);u32(e,0,0x06054b50);u16(e,8,directory.length);u16(e,10,directory.length);u32(e,12,dirLength);u32(e,16,offset);parts.push(...directory,end);const output=new Uint8Array(offset+dirLength+end.length);let at=0;for(const p of parts){output.set(p,at);at+=p.length;}return output;
}
export async function exportBookLibrary(client:SupabaseClient<Database>,userId:string,full:boolean){
 const records=await readWhimsy(client);
 const [curated,members]=await Promise.all([allPages<Tables<'collection_curated'>>((a,b)=>client.from('collection_curated').select('*').eq('user_id',userId).order('id').range(a,b)),allPages<Tables<'collection_curated_members'>>((a,b)=>client.from('collection_curated_members').select('*').eq('user_id',userId).order('id').range(a,b))]);
 const names=new Map(curated.map(c=>[c.id,c.title])),byBook=new Map<string,string[]>();for(const m of members)if(m.book_id){const list=byBook.get(m.book_id)??[];list.push(names.get(m.collection_id)??'');byBook.set(m.book_id,list);}
 const primary=primaryLibraryCsv(records.books,byBook);if(!full)return primary;
 const [sources,observations,batches,series,journal,sourceCollections]=await Promise.all([readImportSources(client,userId),readImportObservations(client,userId),readImportBatches(client,userId),readImportSeries(client,userId),allPages<Tables<'book_journal_entries'>>((a,b)=>client.from('book_journal_entries').select('*').eq('user_id',userId).order('id').range(a,b)),readImportCollectionLinks(client,userId)]);
 const strip=(r:Record<string,unknown>)=>Object.fromEntries(Object.entries(r).filter(([k])=>k!=='user_id'&&k!=='userId'&&k!=='observation_hash'));
 const bookIds=new Set(records.books.map(b=>b.id));
 return csvArchive({'library.csv':primary,'book-data.csv':tableCsv(records.books.map(strip)),'reads.csv':tableCsv(records.books.flatMap(book=>bookCompletions(book).map(c=>({book_id:book.id,book_title:book.title,...c})))),'sessions.csv':tableCsv(records.sessions.map(strip)),'journal.csv':tableCsv(journal.map(strip)),'series.csv':tableCsv(series.series.filter(s=>s.kind==='book'||s.kind==='mixed').map(strip)),'series-members.csv':tableCsv(series.members.filter(m=>!m.media_id&&series.series.some(s=>s.id===m.series_id&&(s.kind==='book'||s.kind==='mixed'))).map(strip)),'collections.csv':tableCsv(curated.map(strip)),'collection-members.csv':tableCsv(members.filter(m=>!!m.book_id&&bookIds.has(m.book_id)).map(strip)),'import-sources.csv':tableCsv(sources.map(strip)),'import-history.csv':tableCsv(observations.map(strip)),'import-batches.csv':tableCsv(batches.map(strip)),'import-collections.csv':tableCsv(sourceCollections.map(strip)),'README.txt':'Muse Books export, version 1. Library.csv is a current-book summary; reads, sessions and attributed opinions are separate files linked by book IDs. JSON inside cells preserves structured values. Formula-like text is prefixed with an apostrophe for spreadsheet safety. Only library.csv can currently be reimported through generic mapping; the ZIP is a portable reading archive, not a full account restore. Unsaved timers, goals, external artwork files and other media records are excluded. Export reads are paged; avoid simultaneous editing while preparing an archive.'});
}
export function saveLibraryDownload(name:string,data:string|Uint8Array,mime:string){const blob=new Blob([typeof data==='string'?data:new Uint8Array(data)],{type:mime}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
