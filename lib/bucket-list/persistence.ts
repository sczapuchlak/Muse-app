/** Bucket List persistence (#84): owner-only tables with revision checks, so two devices never overwrite each other. */
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';
import {entryFromRow,entryToRow,listFromRow,listToRow,type BucketEntry,type BucketList} from './models';

type Client=SupabaseClient<Database>;
const stale='This changed on another device. Reload to see the latest before saving again.';

export async function loadBucketList(client:Client,userId:string){
 const [l,e]=await Promise.all([client.from('bucket_lists').select('*').eq('user_id',userId).maybeSingle(),client.from('bucket_entries').select('*').eq('user_id',userId).order('position').limit(5000)]);
 if(l.error)throw l.error;if(e.error)throw e.error;
 return {list:l.data?listFromRow(l.data):null,entries:(e.data??[]).map(entryFromRow)};
}
/** Insert (revision 0) or update only if nobody else changed it since. */
export async function saveBucketList(client:Client,userId:string,list:BucketList):Promise<BucketList>{
 const row=listToRow(list);
 const result=list.revision===0
  ?await client.from('bucket_lists').insert({...row,user_id:userId}).select('*').single()
  :await client.from('bucket_lists').update(row).eq('user_id',userId).eq('revision',list.revision).select('*').maybeSingle();
 if(result.error)throw result.error;if(!result.data)throw Error(stale);
 return listFromRow(result.data);
}
export async function saveBucketEntry(client:Client,userId:string,e:BucketEntry):Promise<BucketEntry>{
 const row=entryToRow(e);
 const result=e.revision===0
  ?await client.from('bucket_entries').insert({...row,user_id:userId}).select('*').single()
  :await client.from('bucket_entries').update(row).eq('id',e.id).eq('user_id',userId).eq('revision',e.revision).select('*').maybeSingle();
 if(result.error){if(result.error.code==='23505')throw Error('Another dream already has that number.');throw result.error;}
 if(!result.data)throw Error(stale);
 return entryFromRow(result.data);
}
export async function deleteBucketEntry(client:Client,userId:string,e:Pick<BucketEntry,'id'|'revision'>){
 const result=await client.from('bucket_entries').delete().eq('id',e.id).eq('user_id',userId).eq('revision',e.revision).select('id').maybeSingle();
 if(result.error)throw result.error;if(!result.data)throw Error('This dream changed on another device. Reload before deleting.');
}
