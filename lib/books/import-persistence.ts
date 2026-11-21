import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Tables} from '@/lib/database.types';

import {allPages as pages} from '@/lib/supabase/pages';
/** The Books export keeps its own message when an archive is too large. */
export const allPages=<T,>(read:(from:number,to:number)=>PromiseLike<{data:T[]|null;error:unknown}>)=>pages<T>(read,'This export is too large. Contact support for a complete export.');
export function readImportSources(client:SupabaseClient<Database>,userId:string){return allPages<Tables<'book_import_sources'>>((from,to)=>client.from('book_import_sources').select('*').eq('user_id',userId).order('source').order('source_id').range(from,to));}
export function readImportObservations(client:SupabaseClient<Database>,userId:string){return allPages<Tables<'book_import_observations'>>((from,to)=>client.from('book_import_observations').select('*').eq('user_id',userId).order('id').range(from,to));}
export function readImportBatches(client:SupabaseClient<Database>,userId:string){return allPages<Tables<'book_import_batches'>>((from,to)=>client.from('book_import_batches').select('*').eq('user_id',userId).order('created_at',{ascending:false}).order('id').range(from,to));}
export function readImportCollectionLinks(client:SupabaseClient<Database>,userId:string){return allPages<Tables<'book_import_collection_links'>>((from,to)=>client.from('book_import_collection_links').select('*').eq('user_id',userId).order('source').order('shelf_key').range(from,to));}
export async function readImportSeries(client:SupabaseClient<Database>,userId:string){
 const [series,members]=await Promise.all([allPages<Tables<'collection_series'>>((a,b)=>client.from('collection_series').select('*').eq('user_id',userId).order('id').range(a,b)),allPages<Tables<'collection_series_members'>>((a,b)=>client.from('collection_series_members').select('*').eq('user_id',userId).order('id').range(a,b))]);return {series,members};
}
