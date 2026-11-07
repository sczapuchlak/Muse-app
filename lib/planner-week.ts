/** The Weekly Agenda planning column (#79): content per week in `planner_week_sections`, its title/type on the account. */
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from './database.types';
import {parsePlanningConfig,parsePlanningItems,type PlanningConfig,type PlanningItem} from './agenda';

type Client=SupabaseClient<Database>;
export type WeekSection={weekStart:string;notes:string;items:PlanningItem[];revision:number};
const metadataKey='muse_agenda_planning';

export async function readPlanningConfig(client:Client){const {data}=await client.auth.getUser();return parsePlanningConfig(data.user?.user_metadata?.[metadataKey]);}
export async function savePlanningConfig(client:Client,config:PlanningConfig){const parsed=parsePlanningConfig(config);const {error}=await client.auth.updateUser({data:{[metadataKey]:parsed}});if(error)throw error;return parsed;}

export async function readWeekSection(client:Client,userId:string,weekStart:string):Promise<WeekSection>{
 const {data,error}=await client.from('planner_week_sections').select('week_start,notes,items,revision').eq('user_id',userId).eq('week_start',weekStart).maybeSingle();
 if(error)throw error;
 return data?{weekStart,notes:data.notes,items:parsePlanningItems(data.items),revision:data.revision}:{weekStart,notes:'',items:[],revision:0};
}
/** Insert the first time, then update only if nobody changed it since (revision check). */
export async function saveWeekSection(client:Client,userId:string,s:WeekSection):Promise<WeekSection>{
 const row={notes:s.notes.slice(0,5000),items:s.items.slice(0,40)};
 const result=s.revision===0
  ?await client.from('planner_week_sections').insert({user_id:userId,week_start:s.weekStart,...row}).select('week_start,notes,items,revision').single()
  :await client.from('planner_week_sections').update(row).eq('user_id',userId).eq('week_start',s.weekStart).eq('revision',s.revision).select('week_start,notes,items,revision').maybeSingle();
 if(result.error)throw result.error;
 if(!result.data)throw Error('This week changed on another device. Reload to see the latest.');
 return {weekStart:s.weekStart,notes:result.data.notes,items:parsePlanningItems(result.data.items),revision:result.data.revision};
}
