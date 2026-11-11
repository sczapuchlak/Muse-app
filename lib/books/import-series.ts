import {importTitleKey} from './import-metadata';
import type {Book} from '@/lib/whimsy/models';
import type {Series,SeriesMember} from '@/lib/collections/models';
import type {BookLookup} from './series-discovery';

export type ImportSeriesLink={seriesId:string;title:string;memberId?:string;revision?:number;catalogSource?:string;catalogId?:string;sequence?:number;positionKnown?:boolean;role?:string;releaseState?:'released'|'announced'|'unknown'};
const norm=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
/** Catalog and Library ownership remain separate from decorative placement. Only existing series are eligible. */
export function importSeriesMatch(book:Pick<Book,'id'|'title'|'author'|'metadataSource'>,series:readonly Series[],members:readonly SeriesMember[],lookup?:BookLookup):{link?:ImportSeriesLink;note:string}{
 if(members.some(m=>m.book_id===book.id))return {note:'Existing series membership preserved.'};
 const eligible=series.filter(s=>s.kind==='book'||s.kind==='mixed'),ids=new Set(eligible.map(s=>s.id));
 const saved=members.filter(m=>ids.has(m.series_id)&&!m.book_id&&!m.media_id&&!m.hidden&&!m.manual_override&&((book.metadataSource?.hardcoverId&&m.catalog_source==='hardcover'&&m.catalog_id===book.metadataSource.hardcoverId)||!!book.author&&!!m.catalog_author&&importTitleKey(m.catalog_title??'')===importTitleKey(book.title)&&norm(m.catalog_author)===norm(book.author)));
 if(saved.length===1){const m=saved[0];return {link:{seriesId:m.series_id,title:eligible.find(s=>s.id===m.series_id)!.title,memberId:m.id,revision:m.revision},note:'Connect to the existing series installment.'};}
 if(saved.length>1)return {note:'Multiple saved series installments match. Choose the correct existing installment in review.'};
 const catalog=lookup?.catalog;if(!catalog)return {note:'Series not identified; this may be a standalone book. Keep unassociated or choose an existing installment.'};
 const matchingSeries=eligible.filter(s=>s.catalog_source===catalog.source&&s.catalog_id===catalog.id);
 if(matchingSeries.length!==1)return {note:'Series identified in the catalog, but no unique existing Muse Series can be connected. Choose a saved installment or keep unassociated.'};
 const s=matchingSeries[0];
 const entries=catalog.members.filter(m=>lookup?.book&&m.source==='hardcover'&&m.id===lookup.book.id||!!book.author&&!!m.author&&importTitleKey(m.title)===importTitleKey(book.title)&&norm(m.author)===norm(book.author));
 if(entries.length!==1)return {note:'Series installment identity needs review.'};
 const entry=entries[0],existing=members.filter(m=>m.series_id===s.id&&m.catalog_source===entry.source&&m.catalog_id===entry.id);
 if(existing.length){const m=existing[0];if(existing.length!==1||m.hidden||m.manual_override||m.book_id||m.media_id)return {note:'Existing series corrections, ownership or hidden choices preserved.'};return {link:{seriesId:s.id,title:s.title,memberId:m.id,revision:m.revision},note:'Connect to the verified existing installment.'};}
 if(entry.position!==null&&(entry.position<0||entry.position>999999))return {note:'Series order needs review.'};
 return {link:{seriesId:s.id,title:s.title,catalogSource:entry.source,catalogId:entry.id,sequence:entry.position??9000,positionKnown:entry.position!==null,role:entry.role??'mainline',releaseState:entry.releaseState??'unknown'},note:'Add membership to the verified existing series.'};
}
