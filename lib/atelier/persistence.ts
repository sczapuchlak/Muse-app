/** Owner-only Theme Atelier storage (RLS: every row is scoped to auth.uid()). Values are re-validated on read. */
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from '@/lib/database.types';
import {validateDefinition,type AtelierTheme,type AtelierDefinition} from './model';
import type {AppliedAtelier} from './applied';

type Client=SupabaseClient<Database>;
export async function listAtelierThemes(client:Client,userId:string):Promise<AtelierTheme[]>{
 const {data,error}=await client.from('atelier_themes').select('id,name,status,definition,updated_at').eq('user_id',userId).order('updated_at',{ascending:false});
 if(error)throw error;
 return (data??[]).flatMap(row=>{const result=validateDefinition(row.definition);return result.ok?[{id:row.id,name:row.name,status:row.status==='saved'?'saved' as const:'draft' as const,definition:result.definition,updatedAt:row.updated_at}]:[];});
}
export async function saveAtelierTheme(client:Client,userId:string,theme:{id:string;name:string;status:'draft'|'saved';definition:AtelierDefinition}){
 const {data,error}=await client.from('atelier_themes').upsert({id:theme.id,user_id:userId,name:theme.name.trim().slice(0,60)||'Untitled theme',status:theme.status,base_theme:theme.definition.base,schema_version:1,definition:theme.definition as unknown as NonNullable<Json>},{onConflict:'id'}).select('updated_at').single();
 if(error)throw error;return data.updated_at;
}
export async function deleteAtelierTheme(client:Client,userId:string,id:string){const {error}=await client.from('atelier_themes').delete().eq('user_id',userId).eq('id',id);if(error)throw error;}
export async function renameAtelierTheme(client:Client,userId:string,id:string,name:string){const {error}=await client.from('atelier_themes').update({name:name.trim().slice(0,60)}).eq('user_id',userId).eq('id',id);if(error)throw error;}

export type RemoteAppearance={theme:string;material:'crystal'|'frosted';atelier:AppliedAtelier|null;updatedAt:string};
export async function readRemoteAppearance(client:Client,userId:string):Promise<RemoteAppearance|null>{
 const {data,error}=await client.from('appearance_preferences').select('theme,material,atelier_theme_id,atelier_theme,updated_at').eq('user_id',userId).maybeSingle();
 if(error)throw error;if(!data)return null;
 const raw=data.atelier_theme as {name?:unknown;definition?:unknown}|null;const result=raw?validateDefinition(raw.definition):null;
 const atelier=data.atelier_theme_id&&result?.ok?{id:data.atelier_theme_id,name:typeof raw?.name==='string'?raw.name.slice(0,60):'Custom theme',definition:result.definition}:null;
 return {theme:data.theme,material:data.material==='frosted'?'frosted':'crystal',atelier,updatedAt:data.updated_at};
}
export async function writeRemoteAppearance(client:Client,userId:string,value:RemoteAppearance){
 const {error}=await client.from('appearance_preferences').upsert({user_id:userId,theme:value.theme,material:value.material,atelier_theme_id:value.atelier?.id??null,atelier_theme:value.atelier?{name:value.atelier.name,definition:value.atelier.definition} as unknown as Json:null,updated_at:value.updatedAt},{onConflict:'user_id'});
 if(error)throw error;
}
