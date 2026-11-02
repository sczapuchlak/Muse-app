import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';
import {importContent, type CuratedContent} from './content';

/** Service-role caller only. Validate editorial content before the immutable database import. */
export async function importWhimsyContent(client:SupabaseClient<Database>,batch:CuratedContent[]){
  importContent([],batch);
  const {data,error}=await client.rpc('import_whimsy_content',{p_batch:batch});
  if(error)throw error;
  return data;
}
