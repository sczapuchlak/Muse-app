import type {SupabaseClient} from '@supabase/supabase-js';import type {Database,Json} from '@/lib/database.types';import type {MoneyState} from '@/lib/money';
export const emptyMoney=():MoneyState=>({paychecks:[],allocations:[],templates:[],transactions:[],cards:[],payments:[],bills:[],categories:[],tags:[],groups:[],recurring:[],paymentMethods:[]});
export type MoneySnapshot={revision:number;state:MoneyState};
export async function readMoney(client:SupabaseClient<Database>):Promise<MoneySnapshot>{const {data,error}=await client.rpc('read_money');if(error)throw error;return data as unknown as MoneySnapshot;}
export async function writeMoney(client:SupabaseClient<Database>,revision:number,id:string,state:MoneyState){const {data,error}=await client.rpc('save_money',{p_expected_revision:revision,p_command_id:id,p_state:state as unknown as Json});if(error)throw error;if(data===null)throw Error('Money save was not acknowledged');return data;}
