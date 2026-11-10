import type {Book} from '@/lib/whimsy/models';
import type {Series,SeriesMember} from '@/lib/collections/models';
import {bookCompletions} from '@/lib/whimsy/reading-stats';
import type {SeriesCatalog} from './series-discovery';
import {planSeriesCatalog} from './series-catalog';

/** A catalog can be read before the reader decides to save or change it. Nothing here is persisted. */
export function catalogSeriesView(catalog:SeriesCatalog,books:Book[],userId:string){
 const id=`catalog:${catalog.source}:${catalog.id}`,now=new Date().toISOString();
 const series:Series={id,user_id:userId,kind:'book',title:catalog.title,description:catalog.description??'',cover_url:null,scope:'released',conclusion_state:catalog.completed===true?'concluded':catalog.completed===false?'ongoing':'unknown',catalog_source:catalog.source,catalog_id:catalog.id,catalog_author:catalog.author??'',catalog_primary_count:catalog.primaryCount??null,catalog_total_count:catalog.totalCount??null,catalog_completed:catalog.completed??null,catalog_refreshed_at:null,revision:0,created_at:now,updated_at:now};
 const members:SeriesMember[]=planSeriesCatalog(catalog,[],books).map(({fields},index)=>({id:`${id}:${index}`,series_id:id,user_id:userId,revision:0,created_at:now,updated_at:now,...fields}));
 return {series,members};
}

export type ShelfState='read'|'reading'|'paused'|'planned'|'missing'|'upcoming';
export type ShelfEntry={key:string;member:SeriesMember;position:number|null;positionLabel:string;title:string;author:string;year:number|null;releaseDate:string|null;pages:number|null;coverUrl:string|null;coverColor:string|null;role:string;book:Book|null;state:ShelfState;starred:boolean};
export type SeriesShelf={main:ShelfEntry[];companions:ShelfEntry[];collections:ShelfEntry[];primaryCount:number;releasedCount:number;totalCount:number;readCount:number;ownedCount:number;readingCount:number;upcomingCount:number;next:ShelfEntry|null;nextRelease:ShelfEntry|null;firstYear:number|null;percent:number;authors:string};

const label=(n:number)=>`#${Number.isInteger(n)?n:Math.round(n*100)/100}`;
export function shelfState(book:Book|null,releaseState:string):ShelfState{
 if(book){if(book.status==='finished'||bookCompletions(book).length>0&&book.status!=='reading')return 'read';return book.status==='reading'?'reading':book.status==='paused'?'paused':'planned';}
 return releaseState==='announced'?'upcoming':'missing';
}
export const shelfStateLabel:Record<ShelfState,string>={read:'Read',reading:'Reading now',paused:'Paused',planned:'Want to read',missing:'Not on your shelf',upcoming:'Upcoming'};

/**
 * One ordered, grouped reading of a series for display. Positions keep the catalog's reading order
 * (prequels 0.x, novellas x.5); unpositioned companions and omnibus editions are kept apart and never
 * counted toward progress.
 */
export function seriesShelf(series:Series,members:SeriesMember[],books:Book[],today=new Date().toISOString().slice(0,10)):SeriesShelf{
 const byId=new Map(books.map(book=>[book.id,book]));
 const entries=members.filter(m=>!m.hidden).map((member):ShelfEntry=>{
  const book=member.book_id?byId.get(member.book_id)??null:null,position=member.position_known?Number(member.sequence):null;
  const releaseDate=member.catalog_release_date??null,year=member.catalog_release_year??(releaseDate?Number(releaseDate.slice(0,4)):null);
  const releaseState=member.release_state==='unknown'&&releaseDate?(releaseDate>today?'announced':'released'):member.release_state;
  return {key:member.id,member,position,positionLabel:position===null?'':label(position),title:book?.title??member.catalog_title??'Untitled installment',author:book?.author||member.catalog_author||series.catalog_author,year,releaseDate,pages:book?.totalPages??member.catalog_pages??null,coverUrl:book?.coverUrl||member.catalog_cover_url||null,coverColor:member.catalog_cover_color??null,role:member.role,book,state:shelfState(book,releaseState),starred:member.starred};
 }).sort((a,b)=>(a.position===null?1:0)-(b.position===null?1:0)||(a.position??0)-(b.position??0)||(a.year??9999)-(b.year??9999));
 const collections=entries.filter(e=>e.role==='collection');
 const main=entries.filter(e=>e.role!=='collection'&&e.position!==null&&e.role!=='optional');
 const companions=entries.filter(e=>e.role!=='collection'&&(e.position===null||e.role==='optional'));
 const primary=main.filter(e=>Number.isInteger(e.position));
 const counted=primary.length?primary:main;
 const released=counted.filter(e=>e.state!=='upcoming');
 const readCount=counted.filter(e=>e.state==='read').length;
 // Next: the first unread primary book in order; prequels and novellas only when no primary book remains.
 const unread=(e:ShelfEntry)=>e.state!=='read'&&e.state!=='upcoming';
 const next=main.find(e=>Number.isInteger(e.position)&&unread(e))??main.find(unread)??null;
 const nextRelease=[...main,...companions].filter(e=>e.state==='upcoming').sort((a,b)=>(a.releaseDate??'9999').localeCompare(b.releaseDate??'9999'))[0]??null;
 const years=[...main,...companions].map(e=>e.year).filter((y):y is number=>!!y&&y<=Number(today.slice(0,4)));
 const authors=series.catalog_author||[...new Set(main.map(e=>e.author).filter(Boolean))].slice(0,2).join(', ');
 return {main,companions,collections,primaryCount:series.catalog_primary_count??primary.length,releasedCount:released.length,totalCount:series.catalog_total_count??entries.length,readCount,ownedCount:entries.filter(e=>e.book&&e.role!=='collection').length,readingCount:counted.filter(e=>e.state==='reading').length,upcomingCount:[...main,...companions].filter(e=>e.state==='upcoming').length,next,nextRelease,firstYear:years.length?Math.min(...years):null,percent:released.length?Math.round(readCount/released.length*100):0,authors};
}
const plural=(n:number,one:string,many=`${one}s`)=>`${n} ${n===1?one:many}`;
const longDate=(iso:string)=>{const d=new Date(`${iso}T12:00:00Z`);return Number.isNaN(d.getTime())?iso:d.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'});};
/** A factual one-paragraph summary assembled only from catalog values that exist. */
export function seriesSummary(series:Series,shelf:SeriesShelf){
 const parts:string[]=[];
 const size=series.catalog_total_count?`a ${series.catalog_total_count}-book series`:'a series';
 const primary=series.catalog_primary_count?` with ${plural(series.catalog_primary_count,'primary work')}`:'';
 const first=shelf.firstYear?`, first released in ${shelf.firstYear}`:'';
 const by=shelf.authors?`, by ${shelf.authors}`:'';
 parts.push(`${series.title} is ${size}${primary}${first}${by}.`);
 if(shelf.upcomingCount)parts.push(`${plural(shelf.upcomingCount,'book is','books are')} still to come${shelf.nextRelease?.releaseDate?`; the next is expected ${longDate(shelf.nextRelease.releaseDate)}`:''}.`);
 else if(series.catalog_completed)parts.push('Every book has been published.');
 return parts.join(' ');
}
