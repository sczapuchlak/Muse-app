import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';

export type CollectionsPreferences={mode:'board'|'library';kind:'all'|'book'|'movie'|'tv'|'game';showInProgress:boolean};
export const defaultCollectionsPreferences:CollectionsPreferences={mode:'board',kind:'all',showInProgress:true};
const metadataKey='muse_collections_preferences';

export function parseCollectionsPreferences(value:unknown):CollectionsPreferences{
 const source=value&&typeof value==='object'?value as Record<string,unknown>:{};
 return {mode:source.mode==='library'?'library':'board',kind:['all','book','movie','tv','game'].includes(String(source.kind))?source.kind as CollectionsPreferences['kind']:'all',showInProgress:typeof source.showInProgress==='boolean'?source.showInProgress:true};
}

export async function readCollectionsPreferences(client:SupabaseClient<Database>,userId:string){
 const {data,error}=await client.auth.getUser();if(error)throw error;if(data.user?.id!==userId)throw Error('Collections preferences require the signed-in account.');
 return parseCollectionsPreferences(data.user.user_metadata?.[metadataKey]);
}

export async function saveCollectionsPreferences(client:SupabaseClient<Database>,userId:string,next:CollectionsPreferences){
 const {data,error}=await client.auth.getUser();if(error)throw error;if(data.user?.id!==userId)throw Error('Collections preferences require the signed-in account.');
 const {error:saveError}=await client.auth.updateUser({data:{[metadataKey]:next}});if(saveError)throw saveError;
 const confirmed=await readCollectionsPreferences(client,userId);
 if(JSON.stringify(confirmed)!==JSON.stringify(next))throw Error('Collections preferences could not be confirmed saved.');
 return confirmed;
}
