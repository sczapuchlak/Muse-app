/**
 * Custom Stream tags (#98): the person's own named tags beside the five classic flourishes. Tags live in
 * `stream_tags` (owner-only). A post keeps a snapshot of its tag (`stream_posts.tag`), so renaming or deleting a tag
 * later never silently changes or strips earlier posts.
 */
import type {createMuseBrowserClient} from '@/lib/supabase/client';
import type {Json} from '@/lib/database.types';
import {paintCss,parsePaint,type Paint} from '@/lib/planner-customization';

type Client=ReturnType<typeof createMuseBrowserClient>;
export type StreamTag={id:string;name:string;icon:string|null;paint:Paint|null;position:number;revision:number};
/** What a post carries: a frozen copy of the tag at the time it was chosen. */
export type StreamTagSnapshot={id?:string;name:string;icon?:string;paint?:Paint};
export const TAG_NAME_MAX=24;
/** A small curated set of tag icons (emoji, so they read the same for friends on any device). */
export const tagIcons=['✨','🌙','🔥','☁️','💖','🌿','🎧','📚','☕','🌊','🌸','🦋','🍓','🎨','🧘','🏃','✈️','🎮','🐾','⭐'];

const cleanName=(v:unknown)=>typeof v==='string'?v.trim().slice(0,TAG_NAME_MAX):'';
const cleanIcon=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim().slice(0,16):null;
export function parseTagSnapshot(v:unknown):StreamTagSnapshot|null{
 if(!v||typeof v!=='object')return null;const o=v as Record<string,unknown>,name=cleanName(o.name);if(!name)return null;
 const icon=cleanIcon(o.icon),paint=parsePaint(o.paint);
 return {...(typeof o.id==='string'?{id:o.id}:{}),name,...(icon?{icon}:{}),...(paint?{paint}:{})};
}
export const snapshotOf=(t:StreamTag):StreamTagSnapshot=>({id:t.id,name:t.name,...(t.icon?{icon:t.icon}:{}),...(t.paint?{paint:t.paint}:{})});
/** CSS for a tag chip's border: solid or gradient, from the shared paint system. */
export const tagBorder=(paint?:Paint|null)=>paint?paintCss(paint):undefined;

type Row={id:string;name:string;icon:string|null;paint:unknown;position:number;revision:number};
const fromRow=(r:Row):StreamTag=>({id:r.id,name:r.name,icon:r.icon,paint:parsePaint(r.paint)??null,position:r.position,revision:r.revision});
export async function readTags(client:Client):Promise<StreamTag[]>{
 const {data,error}=await client.from('stream_tags').select('id,name,icon,paint,position,revision').order('position').order('created_at');
 if(error)throw error;return (data as Row[]).map(fromRow);
}
export async function saveTag(client:Client,t:Omit<StreamTag,'revision'>&{revision?:number}):Promise<StreamTag>{
 const name=cleanName(t.name);if(!name)throw Error('Give your tag a name.');
 const row={name,icon:cleanIcon(t.icon),paint:(t.paint??null) as unknown as Json,position:t.position};
 const r=!t.revision
  ?await client.from('stream_tags').insert({id:t.id,...row}).select('id,name,icon,paint,position,revision').single()
  :await client.from('stream_tags').update(row).eq('id',t.id).eq('revision',t.revision).select('id,name,icon,paint,position,revision').maybeSingle();
 if(r.error)throw r.error;if(!r.data)throw Error('This tag changed on another device. Reload to see it.');
 return fromRow(r.data as Row);
}
/** Deleting a tag removes it from your list only; posts that used it keep their snapshot. */
export async function deleteTag(client:Client,id:string){const {error}=await client.from('stream_tags').delete().eq('id',id);if(error)throw error;}
export async function setPostTag(client:Client,postId:string,tag:StreamTagSnapshot|null){
 const {error}=await (client.rpc as unknown as (f:string,a:Record<string,unknown>)=>Promise<{error:{message:string}|null}>)('stream_set_tag',{p_id:postId,p_tag:tag});
 if(error)throw Error(error.message);
}
