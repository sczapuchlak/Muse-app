import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';

export type DreamCustomSymbol={id:string;user_id:string;name:string;created_at:string};
export type DreamMeaning={user_id:string;symbol_id:string;meaning:string;revision:number;updated_at:string};
export type DreamSeries={id:string;user_id:string;name:string;revision:number;created_at:string;updated_at:string};
export type DreamSeriesEntry={user_id:string;dream_id:string;series_id:string;linked_at:string};
export type DreamExtras={custom:DreamCustomSymbol[];meanings:DreamMeaning[];series:DreamSeries[];links:DreamSeriesEntry[]};
export const emptyDreamExtras:DreamExtras={custom:[],meanings:[],series:[],links:[]};
export async function readDreamExtras(client:SupabaseClient<Database>,userId:string):Promise<DreamExtras>{
 const [custom,meanings,series,links]=await Promise.all([
  client.from('whimsy_dream_custom_symbols').select('*').eq('user_id',userId).order('name'),
  client.from('whimsy_dream_symbol_meanings').select('*').eq('user_id',userId),
  client.from('whimsy_dream_series').select('*').eq('user_id',userId).order('name'),
  client.from('whimsy_dream_series_entries').select('*').eq('user_id',userId),
 ]);
 for(const response of [custom,meanings,series,links])if(response.error)throw response.error;
 return {custom:custom.data??[],meanings:meanings.data??[],series:series.data??[],links:links.data??[]};
}
export async function createDreamSymbol(client:SupabaseClient<Database>,userId:string,id:string,name:string){const clean=name.trim();if(!clean||clean.length>100)throw Error('Name a symbol with up to 100 characters.');const {error}=await client.from('whimsy_dream_custom_symbols').insert({id,user_id:userId,name:clean});if(error&&error.code!=='23505')throw error;const result=await client.from('whimsy_dream_custom_symbols').select('*').eq('user_id',userId).eq('id',id).single();if(result.error)throw result.error;if(result.data.name!==clean)throw Error('This symbol ID was already used.');return result.data;}
export async function saveDreamMeaning(client:SupabaseClient<Database>,userId:string,symbolId:string,meaning:string,expectedRevision:number){if(meaning.length>10000)throw Error('Keep your meaning under 10,000 characters.');if(expectedRevision===0){const result=await client.from('whimsy_dream_symbol_meanings').insert({user_id:userId,symbol_id:symbolId,meaning}).select('*').single();if(result.error)throw result.error;return result.data;}const result=await client.from('whimsy_dream_symbol_meanings').update({meaning}).eq('user_id',userId).eq('symbol_id',symbolId).eq('revision',expectedRevision).select('*').maybeSingle();if(result.error)throw result.error;if(!result.data)throw Error('This meaning changed elsewhere. Keep your draft and reload before saving.');return result.data;}
export async function createDreamSeries(client:SupabaseClient<Database>,userId:string,id:string,name:string){const clean=name.trim();if(!clean||clean.length>120)throw Error('Name this dream series with up to 120 characters.');const {error}=await client.from('whimsy_dream_series').insert({id,user_id:userId,name:clean});if(error&&error.code!=='23505')throw error;const result=await client.from('whimsy_dream_series').select('*').eq('user_id',userId).eq('id',id).single();if(result.error)throw result.error;if(result.data.name!==clean)throw Error('This series ID was already used.');return result.data;}
export async function renameDreamSeries(client:SupabaseClient<Database>,userId:string,id:string,name:string,expectedRevision:number){const clean=name.trim();if(!clean||clean.length>120)throw Error('Name this dream series with up to 120 characters.');const result=await client.from('whimsy_dream_series').update({name:clean}).eq('user_id',userId).eq('id',id).eq('revision',expectedRevision).select('*').maybeSingle();if(result.error)throw result.error;if(!result.data)throw Error('This series changed elsewhere. Reload before saving.');return result.data;}
export async function assignDreamSeries(client:SupabaseClient<Database>,userId:string,dreamId:string,seriesId:string|null){if(!seriesId){const result=await client.from('whimsy_dream_series_entries').delete().eq('user_id',userId).eq('dream_id',dreamId);if(result.error)throw result.error;return;}const result=await client.from('whimsy_dream_series_entries').upsert({user_id:userId,dream_id:dreamId,series_id:seriesId},{onConflict:'user_id,dream_id'}).select('*').single();if(result.error)throw result.error;if(result.data.series_id!==seriesId)throw Error('Series assignment was not saved.');}
export async function removeDreamSeries(client:SupabaseClient<Database>,userId:string,id:string){const result=await client.from('whimsy_dream_series').delete().eq('user_id',userId).eq('id',id);if(result.error)throw result.error;}
