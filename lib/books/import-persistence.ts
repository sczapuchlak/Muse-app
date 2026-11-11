import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Tables} from '@/lib/database.types';

export async function allPages<T>(read:(from:number,to:number)=>PromiseLike<{data:T[]|null;error:unknown}>):Promise<T[]>{
 const rows:T[]=[];for(let from=0;from<1000000;from+=1000){const result=await read(from,from+999);if(result.error)throw result.error;rows.push(...result.data??[]);if((result.data?.length??0)<1000)return rows;}throw Error('This export is too large. Contact support for a complete export.');
}
export function readImportSources(client:SupabaseClient<Database>,userId:string){return allPages<Tables<'book_import_sources'>>((from,to)=>client.from('book_import_sources').select('*').eq('user_id',userId).order('source').order('source_id').range(from,to));}
export function readImportObservations(client:SupabaseClient<Database>,userId:string){return allPages<Tables<'book_import_observations'>>((from,to)=>client.from('book_import_observations').select('*').eq('user_id',userId).order('id').range(from,to));}
export function readImportBatches(client:SupabaseClient<Database>,userId:string){return allPages<Tables<'book_import_batches'>>((from,to)=>client.from('book_import_batches').select('*').eq('user_id',userId).order('created_at',{ascending:false}).order('id').range(from,to));}
export function readImportCollectionLinks(client:SupabaseClient<Database>,userId:string){return allPages<Tables<'book_import_collection_links'>>((from,to)=>client.from('book_import_collection_links').select('*').eq('user_id',userId).order('source').order('shelf_key').range(from,to));}
export async function readImportSeries(client:SupabaseClient<Database>,userId:string){
 const [series,members]=await Promise.all([allPages<Tables<'collection_series'>>((a,b)=>client.from('collection_series').select('*').eq('user_id',userId).order('id').range(a,b)),allPages<Tables<'collection_series_members'>>((a,b)=>client.from('collection_series_members').select('*').eq('user_id',userId).order('id').range(a,b))]);return {series,members};
}
