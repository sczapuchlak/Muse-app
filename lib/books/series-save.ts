import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';
import type {Book} from '@/lib/whimsy/models';
import type {CollectionsSnapshot,Series} from '@/lib/collections/models';
import {saveSeries,saveSeriesMember} from '@/lib/collections/persistence';
import type {SeriesCatalog} from './series-discovery';
import {planSeriesCatalog} from './series-catalog';

const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
/** Catalog references live in the existing series tables. Manual rows and edits are retained. */
export async function saveDiscoveredSeries(client:SupabaseClient<Database>,userId:string,catalog:SeriesCatalog,records:CollectionsSnapshot,books:Book[],preferred?:Series|null){
 const titleMatches=records.series.filter(s=>s.kind==='book'&&norm(s.title)===norm(catalog.title));
 const existing=preferred??records.series.find(s=>s.catalog_source===catalog.source&&s.catalog_id===catalog.id)??(titleMatches.length===1?titleMatches[0]:null);
 // A weaker fallback must not replace stronger saved catalog evidence.
 const rank:Record<string,number>={hardcover:3,wikidata:2,'open-library':1};
 if(existing?.catalog_source&&(rank[existing.catalog_source]??0)>(rank[catalog.source]??0))return existing;
 const series=await saveSeries(client,{id:existing?.id??crypto.randomUUID(),user_id:userId,kind:'book',title:existing?.title??catalog.title,description:existing?.description||catalog.description||'',cover_url:existing?.cover_url??null,scope:existing?.scope??'released',conclusion_state:existing?.conclusion_state??'unknown',catalog_source:catalog.source,catalog_id:catalog.id,catalog_author:catalog.author??existing?.catalog_author??'',catalog_primary_count:catalog.primaryCount??null,catalog_total_count:catalog.totalCount??null,catalog_refreshed_at:new Date().toISOString()},existing?.revision??0);
 const members=records.seriesMembers.filter(m=>m.series_id===series.id);
 for(const plan of planSeriesCatalog(catalog,members,books)){
  const old=plan.existing;
  await saveSeriesMember(client,{id:old?.id??crypto.randomUUID(),user_id:userId,series_id:series.id,...plan.fields},old?.revision??0);
 }
 return series;
}
