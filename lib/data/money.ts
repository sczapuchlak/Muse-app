import type {SupabaseClient} from '@supabase/supabase-js';import type {Database,Json} from '@/lib/database.types';import type {CreditCard,MoneyState} from '@/lib/money';
export const emptyMoney=():MoneyState=>({paychecks:[],allocations:[],templates:[],transactions:[],cards:[],payments:[],bills:[],categories:[],tags:[],groups:[],recurring:[],paymentMethods:[]});
export type MoneySnapshot={revision:number;state:MoneyState};
/** Card colors (#12) live beside the Money snapshot (appearance only, outside its revision). */
const savedAccents=new Map<string,string|null>();
export async function readMoney(client:SupabaseClient<Database>):Promise<MoneySnapshot>{
 const [money,accents]=await Promise.all([client.rpc('read_money'),client.from('cards').select('id,accent')]);
 if(money.error)throw money.error;const snapshot=money.data as unknown as MoneySnapshot;
 // Before the card-colors migration the select fails; cards then simply use their automatic colors.
 if(!accents.error){savedAccents.clear();for(const row of accents.data)savedAccents.set(row.id,row.accent);snapshot.state.cards=snapshot.state.cards.map(card=>{const accent=savedAccents.get(card.id);return accent?{...card,accent:accent as CreditCard['accent']}:card;});}
 return snapshot;
}
async function saveAccents(client:SupabaseClient<Database>,state:MoneyState){
 const changed=state.cards.filter(card=>(card.accent??null)!==(savedAccents.get(card.id)??null)).map(card=>({id:card.id,accent:card.accent??''}));
 if(!changed.length)return;
 const {error}=await client.rpc('set_card_accents',{p_accents:changed as unknown as Json});
 if(error){console.warn('Card colors were not saved',error.message);return;}
 for(const item of changed)savedAccents.set(item.id,item.accent||null);
}
export async function writeMoney(client:SupabaseClient<Database>,revision:number,id:string,state:MoneyState){const {data,error}=await client.rpc('save_money',{p_expected_revision:revision,p_command_id:id,p_state:state as unknown as Json});if(error)throw error;if(data===null)throw Error('Money save was not acknowledged');await saveAccents(client,state);return data;}
