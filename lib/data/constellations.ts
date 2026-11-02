import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from '@/lib/database.types';
import type {BoardState} from '@/lib/constellation-board';
import type {BoardSnapshot} from './constellations-store';
export async function readConstellations(client:SupabaseClient<Database>):Promise<BoardSnapshot>{const {data,error}=await client.rpc('read_constellations');if(error)throw error;return data as unknown as BoardSnapshot;}
export async function writeConstellations(client:SupabaseClient<Database>,revision:number,id:string,state:BoardState){const {data,error}=await client.rpc('save_constellations',{p_expected_revision:revision,p_command_id:id,p_state:state as unknown as Json});if(error)throw error;if(typeof data!=='number')throw Error('Board save not acknowledged');return data;}
