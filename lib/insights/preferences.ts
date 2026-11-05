import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';

/** Optional Insights sections (Overview always shows). Order follows the page; hiding never deletes data. */
export const insightSections=['plans','mood','money','nourish','astrology','collections'] as const;
export type InsightSection=typeof insightSections[number];
export const insightRanges=['7','30','90','year'] as const;
export type InsightsPreferences={hidden:InsightSection[];defaultView:'overview'|InsightSection;defaultRange:typeof insightRanges[number];dailyGoals:boolean};
export const defaultInsightsPreferences:InsightsPreferences={hidden:[],defaultView:'overview',defaultRange:'30',dailyGoals:true};
const metadataKey='muse_insights_preferences';

export function parseInsightsPreferences(value:unknown):InsightsPreferences{
 const source=value&&typeof value==='object'?value as Record<string,unknown>:{};
 const hidden=Array.isArray(source.hidden)?[...new Set(source.hidden.filter((v):v is InsightSection=>insightSections.includes(v as InsightSection)))]:[];
 const view=source.defaultView==='overview'||insightSections.includes(source.defaultView as InsightSection)?source.defaultView as InsightsPreferences['defaultView']:'overview';
 return {hidden,defaultView:view!=='overview'&&hidden.includes(view)?'overview':view,defaultRange:insightRanges.includes(source.defaultRange as InsightsPreferences['defaultRange'])?source.defaultRange as InsightsPreferences['defaultRange']:'30',dailyGoals:typeof source.dailyGoals==='boolean'?source.dailyGoals:true};
}
export async function readInsightsPreferences(client:SupabaseClient<Database>,userId:string){
 const {data,error}=await client.auth.getUser();if(error)throw error;if(data.user?.id!==userId)throw Error('Insights preferences require the signed-in account.');
 return parseInsightsPreferences(data.user.user_metadata?.[metadataKey]);
}
export async function saveInsightsPreferences(client:SupabaseClient<Database>,userId:string,next:InsightsPreferences){
 const parsed=parseInsightsPreferences(next);
 const {data,error}=await client.auth.getUser();if(error)throw error;if(data.user?.id!==userId)throw Error('Insights preferences require the signed-in account.');
 const {error:saveError}=await client.auth.updateUser({data:{[metadataKey]:parsed}});if(saveError)throw saveError;
 const confirmed=await readInsightsPreferences(client,userId);
 if(JSON.stringify(confirmed)!==JSON.stringify(parsed))throw Error('Insights preferences could not be confirmed saved.');
 return confirmed;
}
