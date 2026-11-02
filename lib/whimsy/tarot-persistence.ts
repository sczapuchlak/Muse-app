import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';
import {assertWhimsyTimeZone} from './persistence';
import {tarotById,tarotDeck,type TarotOrientation} from './tarot';
export type TarotDailyDraw={user_id:string;activity_date:string;time_zone:string;deck_id:string;card_id:string;card_version:number;orientation:TarotOrientation;drawn_at:string};
export type TarotFollowup={id:string;user_id:string;reading_id:string;text:string;created_at:string};
export async function readTarotExtras(client:SupabaseClient<Database>,userId:string){
 const [daily,prefs,followups]=await Promise.all([
  client.from('whimsy_tarot_daily_draws').select('*').eq('user_id',userId).order('activity_date',{ascending:false}),
  client.from('whimsy_tarot_preferences').select('*').eq('user_id',userId).maybeSingle(),
  client.from('whimsy_tarot_followups').select('*').eq('user_id',userId).order('created_at',{ascending:true}),
 ]);
 if(daily.error)throw daily.error;if(prefs.error)throw prefs.error;if(followups.error)throw followups.error;
 return {daily:daily.data as TarotDailyDraw[],includeReversed:prefs.data?.include_reversed??false,followups:followups.data as TarotFollowup[]};
}
export async function saveReversals(client:SupabaseClient<Database>,userId:string,value:boolean){const {data,error}=await client.from('whimsy_tarot_preferences').upsert({user_id:userId,include_reversed:value,updated_at:new Date().toISOString()}).select().single();if(error)throw error;if(data.include_reversed!==value)throw Error('Your Tarot preference was not saved.');return value;}
/** The unique owner/date key is first-writer-wins. On a race, load the already persisted card. */
export async function saveDailyDraw(client:SupabaseClient<Database>,userId:string,date:string,timeZone:string,cardId:string,orientation:TarotOrientation):Promise<TarotDailyDraw>{
 assertWhimsyTimeZone(timeZone);if(!tarotById(cardId)||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Invalid daily card.');
 const {error}=await client.from('whimsy_tarot_daily_draws').insert({user_id:userId,activity_date:date,time_zone:timeZone,deck_id:tarotDeck.id,card_id:cardId,card_version:1,orientation});if(error&&error.code!=='23505')throw error;
 const result=await client.from('whimsy_tarot_daily_draws').select('*').eq('user_id',userId).eq('activity_date',date).single();if(result.error)throw result.error;return result.data as TarotDailyDraw;
}
/** Follow-ups append; a stable ID makes retries idempotent. */
export async function appendTarotFollowup(client:SupabaseClient<Database>,userId:string,readingId:string,text:string,id:string):Promise<TarotFollowup>{
 const body=text.trim();if(!body||body.length>10000)throw Error('Write a follow-up of up to 10,000 characters.');
 const {error}=await client.from('whimsy_tarot_followups').insert({id,user_id:userId,reading_id:readingId,text:body});if(error&&error.code!=='23505')throw error;
 const result=await client.from('whimsy_tarot_followups').select('*').eq('user_id',userId).eq('id',id).single();if(result.error)throw result.error;if(result.data.text!==body||result.data.reading_id!==readingId)throw Error('Follow-up ID was already used.');return result.data as TarotFollowup;
}
