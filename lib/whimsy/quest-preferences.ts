import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';
import {defaultQuestPreference,questVibes,type DrawExperience,type QuestPreference} from './side-quests';

export type SavedQuestPreference=QuestPreference&{revision:number};
function parse(value:unknown):SavedQuestPreference{
 if(!value||typeof value!=='object')return {...defaultQuestPreference,revision:0};
 const row=value as Record<string,unknown>;
 if(!['surprise','balance','vibe'].includes(String(row.experience))||!questVibes.includes(row.vibe as typeof questVibes[number])||!Number.isSafeInteger(row.revision)||Number(row.revision)<1)throw Error('Draw preference response was invalid.');
 return {experience:row.experience as DrawExperience,vibe:row.vibe as QuestPreference['vibe'],revision:row.revision as number};
}
export async function readQuestPreference(client:SupabaseClient<Database>):Promise<SavedQuestPreference>{const {data,error}=await client.rpc('read_quest_preference');if(error)throw error;return parse(data);}
/** Retain commandId across uncertain retries; the database confirms one revision. */
export async function saveQuestPreference(client:SupabaseClient<Database>,value:QuestPreference,expectedRevision:number,commandId:string):Promise<SavedQuestPreference>{const {data,error}=await client.rpc('save_quest_preference',{p_experience:value.experience,p_vibe:value.vibe,p_expected_revision:expectedRevision,p_command_id:commandId});if(error)throw error;const saved=parse(data);if(saved.revision!==expectedRevision+1)throw Error('Draw preference was not confirmed. Reload before editing.');return saved;}
