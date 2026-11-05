import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from '@/lib/database.types';
import {defaultGrocerySections} from '@/lib/grocery-sections';
import type {WellnessState} from '@/lib/wellness';
export type WellnessSnapshot={revision:number;state:WellnessState};
export async function readWellness(client:SupabaseClient<Database>):Promise<WellnessSnapshot>{const {data,error}=await client.rpc('read_wellness');if(error)throw error;const snapshot=data as unknown as WellnessSnapshot;return {...snapshot,state:{...snapshot.state,grocerySections:snapshot.state.grocerySections.length?snapshot.state.grocerySections:defaultGrocerySections.map(section=>({...section})),assignments:snapshot.state.assignments.map(meal=>({...meal,recipeId:null})),goals:Array.isArray(snapshot.state.goals)?snapshot.state.goals:undefined}};}
export async function writeWellness(client:SupabaseClient<Database>,revision:number,id:string,state:WellnessState){const {data,error}=await client.rpc('save_wellness',{p_expected_revision:revision,p_command_id:id,p_state:state as unknown as Json});if(error)throw error;if(data===null)throw Error('Wellness save was not acknowledged');return data;}
