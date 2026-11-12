import type {Book} from '@/lib/whimsy/models';
import type {Series,SeriesMember} from '@/lib/collections/models';
import {bookCompletions} from '@/lib/whimsy/reading-stats';
import {bookSeriesPrimary} from '@/lib/collections/models';
import type {SeriesCatalog} from './series-discovery';
import {planSeriesCatalog} from './series-catalog';

/** A catalog can be read before the reader decides to save or change it. Nothing here is persisted. */
export function catalogSeriesView(catalog:SeriesCatalog,books:Book[],userId:string){
 const id=`catalog:${catalog.source}:${catalog.id}`,now=new Date().toISOString();
 const series:Series={id,user_id:userId,kind:'book',title:catalog.title,description:catalog.description??'',cover_url:null,scope:'released',conclusion_state:catalog.completed===true?'concluded':catalog.completed===false?'ongoing':'unknown',catalog_source:catalog.source,catalog_id:catalog.id,catalog_author:catalog.author??'',catalog_primary_count:catalog.primaryCount??null,catalog_total_count:catalog.totalCount??null,catalog_completed:catalog.completed??null,catalog_refreshed_at:null,revision:0,created_at:now,updated_at:now};
 const members:SeriesMember[]=planSeriesCatalog(catalog,[],books).map(({fields},index)=>({id:`${id}:${index}`,series_id:id,user_id:userId,revision:0,created_at:now,updated_at:now,...fields}));
 return {series,members};
}

export type ShelfState='read'|'reading'|'paused'|'dnf'|'planned'|'missing'|'upcoming';
export type ShelfEntry={key:string;member:SeriesMember;position:number|null;positionLabel:string;title:string;author:string;year:number|null;releaseDate:string|null;pages:number|null;coverUrl:string|null;coverColor:string|null;role:string;book:Book|null;state:ShelfState;starred:boolean};
/**
 * How the primary books were identified. `catalog`: whole-number installments match the catalog's own primary
 * count. `mismatch` / `numbering`: they don't, or the catalog gives no count, so the numbering is used and the page
 * says so. `unordered`: no reading order at all, so every work counts. `yours`: a series the reader assembled.
 */
export type PrimaryBasis='catalog'|'mismatch'|'numbering'|'unordered'|'yours';
export type SeriesShelf={primary:ShelfEntry[];additional:ShelfEntry[];collections:ShelfEntry[];primaryCount:number;catalogPrimaryCount:number|null;basis:PrimaryBasis;releasedCount:number;readCount:number;additionalReadCount:number;ownedCount:number;readingCount:number;upcomingCount:number;next:ShelfEntry|null;nextRelease:ShelfEntry|null;firstYear:number|null;percent:number;primaryUpcoming:number;authors:string};

const label=(n:number)=>`#${Number.isInteger(n)?n:Math.round(n*100)/100}`;
export function shelfState(book:Book|null,releaseState:string):ShelfState{
 if(book){if(book.status==='finished'||bookCompletions(book).length>0&&book.status!=='reading')return 'read';if(book.status==='dnf')return 'dnf';return book.status==='reading'?'reading':book.status==='paused'?'paused':'planned';}
 return releaseState==='announced'?'upcoming':'missing';
}
export const shelfStateLabel:Record<ShelfState,string>={read:'Read',reading:'Currently Reading',paused:'Paused',dnf:'Did Not Finish',planned:'To Be Read',missing:'Not on your shelf',upcoming:'Upcoming'};

/**
 * One ordered, grouped reading of a series for display (#136). Primary books (whole-number positions; see
 * `bookSeriesPrimary`) form the main shelf and the only completion denominator. Additional works keep their real
 * positions and are tracked on their own; collections and box sets are separate and never counted.
 */
export function seriesShelf(series:Series,members:SeriesMember[],books:Book[],today=new Date().toISOString().slice(0,10)):SeriesShelf{
 const byId=new Map(books.map(book=>[book.id,book]));
 const visible=members.filter(m=>!m.hidden);
 const entries=visible.map((member):ShelfEntry=>{
  const book=member.book_id?byId.get(member.book_id)??null:null,position=member.position_known?Number(member.sequence):null;
  const releaseDate=member.catalog_release_date??null,year=member.catalog_release_year??(releaseDate?Number(releaseDate.slice(0,4)):null);
  const releaseState=member.release_state==='unknown'&&releaseDate?(releaseDate>today?'announced':'released'):member.release_state;
  return {key:member.id,member,position,positionLabel:position===null?'':label(position),title:book?.title??member.catalog_title??'Untitled installment',author:book?.author||member.catalog_author||series.catalog_author,year,releaseDate,pages:book?.totalPages??member.catalog_pages??null,coverUrl:book?.coverUrl||member.catalog_cover_url||null,coverColor:member.catalog_cover_color??null,role:member.role,book,state:shelfState(book,releaseState),starred:member.starred};
 }).sort((a,b)=>(a.position===null?1:0)-(b.position===null?1:0)||(a.position??0)-(b.position??0)||(a.year??9999)-(b.year??9999));
 const {primary:primaryRows,basis:rule}=bookSeriesPrimary(visible),primaryIds=new Set(primaryRows.map(m=>m.id));
 const collections=entries.filter(e=>e.role==='collection');
 const primary=entries.filter(e=>primaryIds.has(e.member.id));
 const additional=entries.filter(e=>e.role!=='collection'&&!primaryIds.has(e.member.id));
 const catalogPrimaryCount=series.catalog_primary_count??null;
 const basis:PrimaryBasis=!series.catalog_source?'yours':rule==='unordered'?'unordered':catalogPrimaryCount===null?'numbering':catalogPrimaryCount===primary.length?'catalog':'mismatch';
 const released=primary.filter(e=>e.state!=='upcoming');
 const readCount=primary.filter(e=>e.state==='read').length;
 const unread=(e:ShelfEntry)=>e.state!=='read'&&e.state!=='upcoming';
 const next=primary.find(unread)??additional.find(e=>e.position!==null&&unread(e))??null;
 const works=[...primary,...additional];
 const nextRelease=works.filter(e=>e.state==='upcoming').sort((a,b)=>(a.releaseDate??'9999').localeCompare(b.releaseDate??'9999'))[0]??null;
 const years=works.map(e=>e.year).filter((y):y is number=>!!y&&y<=Number(today.slice(0,4)));
 const authors=series.catalog_author||[...new Set(primary.map(e=>e.author).filter(Boolean))].slice(0,2).join(', ');
 return {primary,additional,collections,primaryCount:primary.length,catalogPrimaryCount,basis,releasedCount:released.length,readCount,additionalReadCount:additional.filter(e=>e.state==='read').length,ownedCount:works.filter(e=>e.book).length,readingCount:primary.filter(e=>e.state==='reading').length,upcomingCount:works.filter(e=>e.state==='upcoming').length,next,nextRelease,firstYear:years.length?Math.min(...years):null,percent:primary.length?Math.round(readCount/primary.length*100):0,primaryUpcoming:primary.length-released.length,authors};
}
/**
 * Completion (#136): finishing the core story is finishing the series. `complete` = every primary book read;
 * `caughtUp` = every released primary book read with more announced; `all` = every primary and additional work
 * read (an optional extra). Collections never count.
 */
export function seriesCompletion(shelf:Pick<SeriesShelf,'primaryCount'|'readCount'|'releasedCount'|'primaryUpcoming'|'additional'|'additionalReadCount'>){
 const complete=shelf.primaryCount>0&&shelf.readCount>=shelf.primaryCount;
 const caughtUp=!complete&&shelf.primaryUpcoming>0&&shelf.releasedCount>0&&shelf.readCount>=shelf.releasedCount;
 const all=complete&&shelf.additional.length>0&&shelf.additionalReadCount>=shelf.additional.length;
 return {complete,caughtUp,all,badge:all?'All works complete':complete?'Core complete':caughtUp?'Caught up':null};
}
/** When primary books could not be confirmed from the catalog, a short honest note; otherwise null. */
export function primaryBasisNote(shelf:Pick<SeriesShelf,'basis'|'primaryCount'|'catalogPrimaryCount'>){
 if(shelf.basis==='mismatch')return `The catalog lists ${shelf.catalogPrimaryCount} primary books; ${shelf.primaryCount} are numbered as main installments here, and progress follows those ${shelf.primaryCount}.`;
 if(shelf.basis==='numbering')return 'This catalog doesn’t mark primary books, so whole-numbered installments are treated as the main series.';
 if(shelf.basis==='unordered')return 'This catalog doesn’t give a reading order, so every book counts toward progress.';
 return null;
}
const plural=(n:number,one:string,many=`${one}s`)=>`${n} ${n===1?one:many}`;
const longDate=(iso:string)=>{const d=new Date(`${iso}T12:00:00Z`);return Number.isNaN(d.getTime())?iso:d.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'});};
/** A factual one-paragraph summary assembled only from values that exist; primary books lead. */
export function seriesSummary(series:Series,shelf:SeriesShelf){
 const parts:string[]=[];
 const size=shelf.primaryCount?`a ${shelf.primaryCount}-book series`:'a series';
 const by=shelf.authors?` by ${shelf.authors}`:'';
 const first=shelf.firstYear?`, first released in ${shelf.firstYear}`:'';
 const extra=shelf.additional.length?`, with ${plural(shelf.additional.length,'additional work')}`:'';
 parts.push(`${series.title} is ${size}${by}${first}${extra}.`);
 if(shelf.upcomingCount)parts.push(`${plural(shelf.upcomingCount,'book is','books are')} still to come${shelf.nextRelease?.releaseDate?`; the next is expected ${longDate(shelf.nextRelease.releaseDate)}`:''}.`);
 else if(series.catalog_completed)parts.push('Every book has been published.');
 return parts.join(' ');
}
