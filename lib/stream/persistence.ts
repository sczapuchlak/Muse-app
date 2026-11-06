"use client";
/** Stream RPC wrappers. Every call is authorized by the database at call time; nothing here trusts the client. */
import type {createMuseBrowserClient} from '@/lib/supabase/client';
import type {StreamPreferences,StreamAudience,StreamCategory,StreamComment,StreamNotification,StreamPost,StreamSourceKind,ReactionId} from './model';
import type {ShowcaseDisplay} from '@/lib/profile/adapters';

type Client=ReturnType<typeof createMuseBrowserClient>;
// The generated types do not know these functions until `npm run db:types` runs against a migrated database.
async function call<T>(client:Client,fn:string,args:Record<string,unknown>={}):Promise<T>{
 const {data,error}=await (client.rpc as unknown as (f:string,a:Record<string,unknown>)=>Promise<{data:unknown;error:{message:string;code?:string}|null}>)(fn,args);
 if(error)throw Object.assign(new Error(error.message),{code:error.code});
 return data as T;
}

export const readFeed=(client:Client,{before,category,author,limit=20}:{before?:StreamPost|null;category?:string|null;author?:string|null;limit?:number}={})=>
 call<StreamPost[]>(client,'stream_feed',{p_before:before?.createdAt??null,p_before_id:before?.id??null,p_category:category??null,p_limit:limit,p_author:author??null});
export const readPost=(client:Client,id:string)=>call<StreamPost|null>(client,'stream_post',{p_id:id});

export type PublishInput={id:string;body:string;decoration?:string|null;category?:StreamCategory|null;sourceKind?:StreamSourceKind|null;sourceId?:string|null;
 display?:(ShowcaseDisplay&{excerpt?:string})|null;spoiler?:boolean;audience:StreamAudience;members?:string[];primaryReaction:ReactionId;commentsEnabled:boolean};
export const publishPost=(client:Client,p:PublishInput)=>call<StreamPost>(client,'stream_publish',{p_id:p.id,p_body:p.body,p_decoration:p.decoration??null,p_category:p.category??null,
 p_source_kind:p.sourceKind??null,p_source_id:p.sourceId??null,p_display:p.display??null,p_spoiler:!!p.spoiler,p_audience:p.audience,p_members:p.members??[],
 p_primary_reaction:p.primaryReaction,p_comments_enabled:p.commentsEnabled});
export const editPost=(client:Client,id:string,patch:{body:string;decoration:string|null;spoiler:boolean;audience?:StreamAudience;members?:string[]|null;commentsEnabled?:boolean})=>
 call<StreamPost>(client,'stream_edit',{p_id:id,p_body:patch.body,p_decoration:patch.decoration,p_spoiler:patch.spoiler,p_audience:patch.audience??null,p_members:patch.members??null,p_comments_enabled:patch.commentsEnabled??null});
export const deletePost=(client:Client,id:string)=>call<void>(client,'stream_delete',{p_id:id});
export const reactTo=(client:Client,post:string,on:boolean)=>call<StreamPost>(client,'stream_react',{p_post:post,p_on:on});
export const reportPost=(client:Client,post:string,reason:string,note='',comment:string|null=null)=>call<void>(client,'stream_report',{p_post:post,p_comment:comment,p_reason:reason,p_note:note});

export const readComments=(client:Client,post:string)=>call<StreamComment[]>(client,'stream_comments',{p_post:post});
export const addComment=(client:Client,post:string,id:string,body:string)=>call<StreamComment>(client,'stream_comment',{p_post:post,p_id:id,p_body:body});
export const editComment=(client:Client,id:string,body:string)=>call<StreamComment>(client,'stream_edit_comment',{p_id:id,p_body:body});
export const deleteComment=(client:Client,id:string)=>call<void>(client,'stream_delete_comment',{p_id:id});

export const readNotifications=(client:Client)=>call<StreamNotification[]>(client,'stream_notifications',{p_limit:30});
export const markNotificationsRead=(client:Client)=>call<void>(client,'stream_mark_notifications_read');
export const readStreamPreferences=(client:Client)=>call<StreamPreferences>(client,'stream_preferences');
export const saveStreamPreferences=(client:Client,p:StreamPreferences)=>call<StreamPreferences>(client,'set_stream_preferences',{p_show_in_navigation:p.showInNavigation,p_reactions:p.reactions,p_comments:p.comments,p_friend_requests:p.friendRequests,p_friend_accepted:p.friendAccepted});

/** Database messages that are safe and useful to show; anything else becomes a gentle generic line. */
export function friendlyError(cause:unknown,fallback:string){
 const message=cause instanceof Error?cause.message:'';
 return /^(Choose|Only current friends|Too many|A status needs|That post|That comment|Comments are off|Social features are paused|Create your profile first)/.test(message)?message.replace(/\.?$/,'.'):fallback;
}
