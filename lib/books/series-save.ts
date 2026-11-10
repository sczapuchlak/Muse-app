import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';
import type {Book} from '@/lib/whimsy/models';
import type {CollectionsSnapshot,Series,SeriesMember} from '@/lib/collections/models';
import {saveSeries,saveSeriesMember} from '@/lib/collections/persistence';
import type {SeriesCatalog} from './series-discovery';
import {planSeriesCatalog} from './series-catalog';

const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
/** The saved series a catalog corresponds to: same source id first, then an unambiguous saved title. */
export function savedSeriesFor(catalog:Pick<SeriesCatalog,'source'|'id'|'title'>,series:Series[]){
 const exact=series.find(s=>s.catalog_source===catalog.source&&s.catalog_id===catalog.id);if(exact)return exact;
 const titleMatches=series.filter(s=>s.kind==='book'&&norm(s.title)===norm(catalog.title));
 return titleMatches.length===1?titleMatches[0]:null;
}
/**
 * Catalog references live in the existing series tables. Manual rows, corrections, stars and hidden
 * installments are retained; the series' own title, description and conclusion are kept once chosen.
 */
export async function saveDiscoveredSeries(client:SupabaseClient<Database>,userId:string,catalog:SeriesCatalog,records:CollectionsSnapshot,books:Book[],preferred?:Series|null):Promise<Series>{
 const existing=preferred??savedSeriesFor(catalog,records.series);
 // A weaker fallback must not replace stronger saved catalog evidence.
 const rank:Record<string,number>={hardcover:3,wikidata:2,'open-library':1};
 if(existing?.catalog_source&&(rank[existing.catalog_source]??0)>(rank[catalog.source]??0))return existing;
 const conclusion=existing&&existing.conclusion_state!=='unknown'?existing.conclusion_state:catalog.completed===true?'concluded':catalog.completed===false?'ongoing':'unknown';
 const series=await saveSeries(client,{id:existing?.id??crypto.randomUUID(),user_id:userId,kind:'book',title:existing?.title??catalog.title,description:existing?.description||catalog.description||'',cover_url:existing?.cover_url??null,scope:existing?.scope??'released',conclusion_state:conclusion,catalog_source:catalog.source,catalog_id:catalog.id,catalog_author:catalog.author??existing?.catalog_author??'',catalog_primary_count:catalog.primaryCount??null,catalog_total_count:catalog.totalCount??null,catalog_completed:catalog.completed??null,catalog_refreshed_at:new Date().toISOString()},existing?.revision??0);
 const members=records.seriesMembers.filter(m=>m.series_id===series.id);
 const results=await Promise.allSettled(planSeriesCatalog(catalog,members,books).map(plan=>{
  const old=plan.existing;
  return saveSeriesMember(client,{id:old?.id??crypto.randomUUID(),user_id:userId,series_id:series.id,...plan.fields},old?.revision??0);
 }));
 const failed=results.find((r):r is PromiseRejectedResult=>r.status==='rejected');
 if(failed)throw failed.reason instanceof Error?failed.reason:Error(typeof failed.reason?.message==='string'?failed.reason.message:'Some installments could not be saved. Refresh the series to retry.');
 return series;
}
/** The saved member row for one catalog installment, after a save. */
export function memberFor(members:SeriesMember[],seriesId:string,source:string,id:string){return members.find(m=>m.series_id===seriesId&&m.catalog_source===source&&m.catalog_id===id)??null;}
