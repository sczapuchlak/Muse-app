/** Owner-side storage for Profiles & Showcases (owner-only RLS), plus the friend-facing view (profile_view). */
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from '@/lib/database.types';
import {isThemeId,type ThemeId} from '@/lib/themes';
import {normalizeSections,type ProfileDetails,type ShowcaseLayout,type ShowcaseVisibility,type SourceKind} from './model';
import type {ShowcaseDisplay} from './adapters';
import type {IdentityCard} from '@/lib/social/identity';

type Client=SupabaseClient<Database>;
export type ShowcaseItem={id:string;kind:SourceKind;sourceId:string|null;display:ShowcaseDisplay;approved:string[];note:string;position:number;sourceState:'ok'|'missing';snapshotAt:string};
export type Showcase={id:string;title:string;description:string;icon:string;gradient:string;layout:ShowcaseLayout;visibility:ShowcaseVisibility;position:number;publishedAt:string|null;items:ShowcaseItem[]};
const fail=(error:{message:string}|null)=>{if(error)throw new Error(error.message);};

export async function readProfileDetails(client:Client,userId:string):Promise<ProfileDetails|null>{
 const {data,error}=await client.from('muse_profiles').select('*').eq('user_id',userId).maybeSingle();fail(error);if(!data)return null;
 return {tagline:data.tagline,bio:data.bio,bannerGradient:data.banner_gradient,theme:(isThemeId(data.profile_theme)?data.profile_theme:'iridescent') as ThemeId,sections:normalizeSections(data.sections),badges:data.badges,visibility:data.visibility==='friends'?'friends':'private'};
}
export async function saveProfileDetails(client:Client,userId:string,details:ProfileDetails){
 const {error}=await client.from('muse_profiles').upsert({user_id:userId,tagline:details.tagline.slice(0,120),bio:details.bio.slice(0,600),banner_gradient:details.bannerGradient,profile_theme:details.theme,sections:details.sections as unknown as NonNullable<Json>,badges:details.badges.slice(0,6),visibility:details.visibility},{onConflict:'user_id'});fail(error);
}
export async function readShowcases(client:Client,userId:string):Promise<Showcase[]>{
 const [showcases,items]=await Promise.all([client.from('showcases').select('*').eq('user_id',userId).order('position').order('created_at'),client.from('showcase_items').select('*').eq('user_id',userId).order('position').order('created_at')]);
 fail(showcases.error);fail(items.error);
 return (showcases.data??[]).map(s=>({id:s.id,title:s.title,description:s.description,icon:s.icon,gradient:s.gradient,layout:s.layout as ShowcaseLayout,visibility:s.visibility as ShowcaseVisibility,position:s.position,publishedAt:s.published_at,
  items:(items.data??[]).filter(i=>i.showcase_id===s.id).map(i=>({id:i.id,kind:i.source_kind as SourceKind,sourceId:i.source_id,display:i.display as unknown as ShowcaseDisplay,approved:i.approved,note:i.note,position:i.position,sourceState:i.source_state==='missing'?'missing':'ok',snapshotAt:i.snapshot_at}))}));
}
/** Saves a Showcase and its items exactly as given (positions follow array order). */
export async function saveShowcase(client:Client,userId:string,showcase:Showcase,removedItemIds:string[]=[]){
 const published=showcase.visibility==='friends'?(showcase.publishedAt??new Date().toISOString()):null;
 const {error}=await client.from('showcases').upsert({id:showcase.id,user_id:userId,title:showcase.title.trim().slice(0,80)||'Untitled Showcase',description:showcase.description.slice(0,280),icon:showcase.icon,gradient:showcase.gradient,layout:showcase.layout,visibility:showcase.visibility,position:showcase.position,published_at:published},{onConflict:'id'});fail(error);
 if(removedItemIds.length){const {error:removeError}=await client.from('showcase_items').delete().eq('user_id',userId).in('id',removedItemIds);fail(removeError);}
 if(showcase.items.length){const {error:itemError}=await client.from('showcase_items').upsert(showcase.items.map((item,index)=>({id:item.id,user_id:userId,showcase_id:showcase.id,source_kind:item.kind,source_id:item.sourceId,display:item.display as unknown as NonNullable<Json>,approved:item.approved,note:item.note.slice(0,280),position:index,source_state:item.sourceState,snapshot_at:item.snapshotAt})),{onConflict:'id'});fail(itemError);}
 return published;
}
export async function deleteShowcase(client:Client,userId:string,id:string){const {error}=await client.from('showcases').delete().eq('user_id',userId).eq('id',id);fail(error);}
export async function reorderShowcases(client:Client,userId:string,ids:string[]){
 await Promise.all(ids.map((id,position)=>client.from('showcases').update({position}).eq('user_id',userId).eq('id',id).then(({error})=>fail(error))));
}
/** Marks items whose source no longer exists; friends stop seeing them at once (profile_view skips them). */
export async function markMissing(client:Client,userId:string,ids:string[],state:'ok'|'missing'){
 if(!ids.length)return;const {error}=await client.from('showcase_items').update({source_state:state}).eq('user_id',userId).in('id',ids);fail(error);
}

export type FriendView={identity:IdentityCard;visibility:'private'|'friends';profile:{tagline:string;bio:string;bannerGradient:string;theme:string;sections:unknown;badges:string[]};showcases:{id:string;title:string;description:string;icon:string;gradient:string;layout:ShowcaseLayout;items:{id:string;kind:SourceKind;display:ShowcaseDisplay;note:string}[]}[]};
/** What a friend sees. Also the owner's "Preview as a friend". Null when not allowed (or not shared). */
export async function readFriendView(client:Client,publicId:string):Promise<FriendView|null>{const {data,error}=await client.rpc('profile_view',{p_profile:publicId});fail(error);return (data as FriendView|null)??null;}
export async function lookupProfile(client:Client,username:string):Promise<string|null>{const {data,error}=await client.rpc('profile_lookup',{p_username:username});fail(error);return (data as string|null)??null;}
