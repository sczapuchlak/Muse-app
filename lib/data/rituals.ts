import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from '@/lib/database.types';
import type {RitualAction,RitualState} from '@/lib/rituals';
export const emptyRituals=():RitualState=>({groups:[],rituals:[],entries:[],celebratedMilestones:[]});
export type RitualsSnapshot={revision:number;state:RitualState};
export async function readRituals(client:SupabaseClient<Database>):Promise<RitualsSnapshot>{const {data,error}=await client.rpc('read_rituals');if(error)throw error;return data as unknown as RitualsSnapshot;}
export async function writeRituals(client:SupabaseClient<Database>,revision:number,id:string,state:RitualState,action?:Extract<RitualAction,{type:'ritual/lifecycle'}>){if(action){const {data,error}=await client.rpc('ritual_lifecycle',{p_expected_revision:revision,p_command_id:id,p_ritual_id:action.id,p_operation:action.operation,p_confirm_delete:action.operation==='delete'});if(error)throw error;if(data===null)throw Error('Lifecycle save was not acknowledged');return data;}const {data,error}=await client.rpc('save_rituals',{p_expected_revision:revision,p_command_id:id,p_state:state as unknown as Json});if(error)throw error;if(data===null)throw Error('Rituals save was not acknowledged');return data;}
