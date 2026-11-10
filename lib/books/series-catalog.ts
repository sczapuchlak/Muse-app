import type {Book} from '@/lib/whimsy/models';
import type {SeriesMember} from '@/lib/collections/models';
import type {CatalogMember,SeriesCatalog} from './series-discovery';

const normalize=(s:string)=>s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const work=(s?:string)=>s?.match(/OL\d+W/)?.[0];
/** Only an unambiguous work or title/author match may become an owned installment. */
export function matchCatalogBook(entry:CatalogMember,books:Book[]):Book|null{
 const byWork=entry.workKey?books.filter(b=>work(b.metadataSource?.workKey)===work(entry.workKey)):[];
 if(byWork.length===1)return byWork[0];if(byWork.length>1)return null;
 const byTitle=books.filter(b=>normalize(b.title)===normalize(entry.title)&&(!entry.author||normalize(b.author??'')===normalize(entry.author)));
 return byTitle.length===1?byTitle[0]:null;
}
export type CatalogPlan={existing:SeriesMember|null;fields:{catalog_source:string;catalog_id:string;catalog_title:string;catalog_author:string;catalog_release_date:string|null;sequence:number;position_known:boolean;book_id:string|null;media_id:null;role:string;release_state:string;manual_override:boolean;starred:boolean;hidden:boolean}};
/** Plans rows in the existing membership table; manual edits/tombstones win on refresh. */
export function planSeriesCatalog(catalog:SeriesCatalog,members:SeriesMember[],books:Book[]):CatalogPlan[]{
 const used=new Set<string>(),seenCatalog=new Set<string>(),plans:CatalogPlan[]=[];
 for(let index=0;index<catalog.members.length;index++){
  const entry=catalog.members[index];
  const catalogKey=`${entry.source}:${entry.id}`;if(seenCatalog.has(catalogKey))continue;seenCatalog.add(catalogKey);
  let existing=members.find(m=>m.catalog_source===entry.source&&m.catalog_id===entry.id)??null;
  const book=matchCatalogBook(entry,books);
  if(!existing&&book)existing=members.find(m=>m.book_id===book.id)??null;
  if(!existing){const byTitle=members.filter(m=>m.catalog_title&&normalize(m.catalog_title)===normalize(entry.title)&&(!entry.author||!m.catalog_author||normalize(m.catalog_author)===normalize(entry.author))&&!used.has(m.id));if(byTitle.length===1)existing=byTitle[0];}
  if(existing&&used.has(existing.id))continue;
  if(existing)used.add(existing.id);
  const manual=existing?.manual_override??false;
  plans.push({existing,fields:{catalog_source:entry.source,catalog_id:entry.id,catalog_title:manual?existing?.catalog_title??entry.title:entry.title,catalog_author:manual?existing?.catalog_author??entry.author:entry.author,catalog_release_date:entry.releaseDate??existing?.catalog_release_date??null,
   sequence:manual?existing?.sequence??entry.position??9000+index:entry.position??9000+index,position_known:manual?existing?.position_known??entry.position!==null:entry.position!==null,
   book_id:existing?.book_id??(existing?.hidden?null:book?.id??null),media_id:null,role:manual?existing?.role??'mainline':entry.role??existing?.role??'mainline',release_state:manual?existing?.release_state??'unknown':entry.releaseState??existing?.release_state??'unknown',manual_override:manual,starred:existing?.starred??false,hidden:existing?.hidden??false}});
 }
 return plans;
}
