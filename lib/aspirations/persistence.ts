/** Aspirations persistence (#54): owner-only tables with revision checks, so two devices never overwrite each other. */
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';
import {fromRow,toRow,type Aspiration,type AspirationUpdate} from './models';

type Client=SupabaseClient<Database>;
type UpdateRow=Database['public']['Tables']['aspiration_updates']['Row'];
const updateFromRow=(r:UpdateRow):AspirationUpdate=>({id:r.id,aspirationId:r.aspiration_id,recordedOn:r.recorded_on,value:r.value,note:r.note,milestoneId:r.milestone_id,createdAt:r.created_at});

export async function loadAspirations(client:Client,userId:string){
 const [a,u]=await Promise.all([client.from('aspirations').select('*').eq('user_id',userId).order('position').order('created_at'),client.from('aspiration_updates').select('*').eq('user_id',userId).order('recorded_on').order('created_at')]);
 if(a.error)throw a.error;if(u.error)throw u.error;
 return {aspirations:(a.data??[]).map(fromRow),updates:(u.data??[]).map(updateFromRow)};
}

/** Insert (revision 0) or update only if nobody else changed it since `expectedRevision`. */
export async function saveAspiration(client:Client,userId:string,a:Aspiration,expectedRevision:number):Promise<Aspiration>{
 const row=toRow(a);
 const result=expectedRevision===0
  ?await client.from('aspirations').insert({...row,user_id:userId}).select('*').single()
  :await client.from('aspirations').update(row).eq('id',a.id).eq('user_id',userId).eq('revision',expectedRevision).select('*').maybeSingle();
 if(result.error)throw result.error;
 if(!result.data)throw Error('This aspiration changed on another device. Reload to see the latest before saving again.');
 return fromRow(result.data);
}
export async function deleteAspiration(client:Client,userId:string,a:Pick<Aspiration,'id'|'revision'>){
 const result=await client.from('aspirations').delete().eq('id',a.id).eq('user_id',userId).eq('revision',a.revision).select('id').maybeSingle();
 if(result.error)throw result.error;if(!result.data)throw Error('This aspiration changed on another device. Reload before deleting.');
}
export async function addAspirationUpdate(client:Client,userId:string,u:Omit<AspirationUpdate,'createdAt'>){
 const result=await client.from('aspiration_updates').insert({id:u.id,user_id:userId,aspiration_id:u.aspirationId,recorded_on:u.recordedOn,value:u.value,note:u.note?.trim()||null,milestone_id:u.milestoneId}).select('*').single();
 if(result.error)throw result.error;return updateFromRow(result.data);
}
export async function deleteAspirationUpdate(client:Client,userId:string,id:string){
 const result=await client.from('aspiration_updates').delete().eq('id',id).eq('user_id',userId);if(result.error)throw result.error;
}
