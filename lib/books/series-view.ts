import type {Book} from '@/lib/whimsy/models';
import type {Series,SeriesMember} from '@/lib/collections/models';
import type {SeriesCatalog} from './series-discovery';
import {planSeriesCatalog} from './series-catalog';

/** A catalog can be read before the reader decides to save or change it. */
export function catalogSeriesView(catalog:SeriesCatalog,books:Book[],userId:string){
 const id=`catalog:${catalog.source}:${catalog.id}`,now=new Date().toISOString();
 const series:Series={id,user_id:userId,kind:'book',title:catalog.title,description:catalog.description??'',cover_url:null,scope:'released',conclusion_state:'unknown',catalog_source:catalog.source,catalog_id:catalog.id,catalog_author:catalog.author??'',catalog_primary_count:catalog.primaryCount??null,catalog_total_count:catalog.totalCount??null,catalog_refreshed_at:null,revision:0,created_at:now,updated_at:now};
 const members:SeriesMember[]=planSeriesCatalog(catalog,[],books).map(({fields},index)=>({id:`${id}:${index}`,series_id:id,user_id:userId,revision:0,created_at:now,updated_at:now,...fields}));
 return {series,members};
}
