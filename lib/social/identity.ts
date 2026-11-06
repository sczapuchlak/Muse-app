/**
 * Muse Social identity and friendships (#16), shared by Profiles (#26) and, later, Stream (#27).
 * People are addressed by a public id, never by auth ids or emails. Every cross-person read is a database
 * function that checks friendship and blocking on each call.
 */
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database} from '@/lib/database.types';

type Client=SupabaseClient<Database>;
export type Relationship='none'|'outgoing'|'incoming'|'friends'|'blocked';
export type IdentityCard={id:string;username:string;displayName:string;avatarId:string;creator?:boolean;relationship?:Relationship;since?:string};
export type MyIdentity={publicId:string;username:string;displayName:string;avatarId:string;discoverable:boolean;participation:'active'|'paused';usernameChangedAt:string;creator:boolean};
export type SocialOverview={friends:IdentityCard[];incoming:IdentityCard[];outgoing:IdentityCard[];blocked:IdentityCard[]};
export type UsernameStatus='available'|'taken'|'reserved'|'invalid';

export const USERNAME_PATTERN=/^[a-z0-9](?:[a-z0-9_.]{1,28})[a-z0-9]$/;
/** Mirrors muse_private.reserved_username for instant feedback; the database decides. */
export const reservedUsernames=new Set(['admin','administrator','muse','musehq','official','support','help','helpdesk','staff','team','moderator','mod','system','root','security','privacy','terms','about','settings','profile','profiles','friends','friend','stream','api','auth','login','logout','signin','signup','register','invite','invites','welcome','me','you','user','users','null','undefined','anonymous','everyone','nobody','www','mail','email','appearance','atelier','showcase','showcases','people','search','home','daily','planner','rituals','wellness','insights','money','notes','mindspace','collections','tarot','dreams','astrology','whimsy']);
export const normalizeUsername=(value:string)=>value.trim().replace(/^@/,'').toLowerCase();
export function localUsernameStatus(value:string):UsernameStatus|null{
 const name=normalizeUsername(value);
 if(!USERNAME_PATTERN.test(name)||name.includes('..'))return 'invalid';
 if(reservedUsernames.has(name))return 'reserved';
 return null;
}
export const usernameHint:Record<UsernameStatus,string>={available:'That one is yours if you want it.',taken:'Someone already has that username.',reserved:'That name is reserved by Muse.',invalid:'3–30 letters, numbers, dots or underscores; start and end with a letter or number.'};
/** A friendly starting suggestion from a first name, e.g. "Stephanie" → "stephanie". */
export const suggestUsername=(name:string)=>normalizeUsername(name).normalize('NFKD').replace(/[^a-z0-9_.]/g,'').replace(/\.{2,}/g,'.').replace(/^[._]+|[._]+$/g,'').slice(0,30)||'';

const fail=(error:{message:string}|null)=>{if(error)throw new Error(error.message);};
export async function readMyIdentity(client:Client,userId:string):Promise<MyIdentity|null>{
 const {data,error}=await client.from('social_identities').select('public_id,username,display_name,avatar_id,discoverable,participation,username_changed_at,creator').eq('user_id',userId).maybeSingle();
 fail(error);if(!data)return null;
 return {publicId:data.public_id,username:data.username,displayName:data.display_name,avatarId:data.avatar_id,discoverable:data.discoverable,participation:data.participation==='paused'?'paused':'active',usernameChangedAt:data.username_changed_at,creator:data.creator===true};
}
export async function usernameStatus(client:Client,value:string):Promise<UsernameStatus>{
 const local=localUsernameStatus(value);if(local)return local;
 const {data,error}=await client.rpc('social_username_status',{p_username:normalizeUsername(value)});fail(error);return data as UsernameStatus;
}
export async function createIdentity(client:Client,username:string,displayName:string){const {data,error}=await client.rpc('social_create_identity',{p_username:normalizeUsername(username),p_display_name:displayName.trim()});fail(error);return data as string;}
export async function changeUsername(client:Client,username:string){const {error}=await client.rpc('social_set_username',{p_username:normalizeUsername(username)});fail(error);}
export async function updateIdentity(client:Client,userId:string,patch:Partial<{displayName:string;avatarId:string;discoverable:boolean;participation:'active'|'paused'}>){
 const row:Database['public']['Tables']['social_identities']['Update']={};
 if(patch.displayName!==undefined)row.display_name=patch.displayName.trim();
 if(patch.avatarId!==undefined)row.avatar_id=patch.avatarId;
 if(patch.discoverable!==undefined)row.discoverable=patch.discoverable;
 if(patch.participation!==undefined)row.participation=patch.participation;
 const {error}=await client.from('social_identities').update(row).eq('user_id',userId);fail(error);
}
export async function searchPeople(client:Client,query:string):Promise<IdentityCard[]>{const {data,error}=await client.rpc('social_search',{p_query:query});fail(error);return (data as IdentityCard[]|null)??[];}
export async function socialOverview(client:Client):Promise<SocialOverview>{const {data,error}=await client.rpc('social_overview');fail(error);const value=(data??{}) as Partial<SocialOverview>;return {friends:value.friends??[],incoming:value.incoming??[],outgoing:value.outgoing??[],blocked:value.blocked??[]};}
const command=(fn:'social_send_request'|'social_accept'|'social_decline'|'social_cancel_request'|'social_remove_friend'|'social_block'|'social_unblock')=>async(client:Client,target:string)=>{const {error}=await client.rpc(fn,{p_target:target});fail(error);};
export const sendRequest=command('social_send_request'),acceptRequest=command('social_accept'),declineRequest=command('social_decline'),cancelRequest=command('social_cancel_request'),removeFriend=command('social_remove_friend'),blockPerson=command('social_block'),unblockPerson=command('social_unblock');
