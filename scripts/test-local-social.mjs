// #16 Social foundation: identity, discovery, friendship lifecycle and blocking, tested with disposable local
// accounts. Local Supabase only. Run: node scripts/test-local-social.mjs
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {createClient} from '@supabase/supabase-js';
loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.ok(url&&['localhost','127.0.0.1'].includes(new URL(url).hostname),'Local Supabase only');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options),users=[];
const must=result=>{if(result.error)throw result.error;return result.data;};
const tag=crypto.randomUUID().slice(0,6);
async function person(name){const link=must(await admin.auth.admin.generateLink({type:'invite',email:`social-${name}-${crypto.randomUUID()}@example.test`}));users.push(link.user.id);const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token}));return {id:link.user.id,client,username:`${name}${tag}`};}
const rpc=(p,fn,args={})=>p.client.rpc(fn,args);
let passed=0;const check=(cond,label)=>{assert.ok(cond,label);passed++;};
try{
 const [a,b,c,d]=await Promise.all(['ava','bea','cal','dee'].map(person));
 // Identity
 check(must(await rpc(a,'social_username_status',{p_username:'admin'}))==='reserved','reserved names are refused');
 check(must(await rpc(a,'social_username_status',{p_username:'a'}))==='invalid','too-short names are invalid');
 check(must(await rpc(a,'social_username_status',{p_username:'Bad..Dots'}))==='invalid','double dots are invalid');
 check(!!(await a.client.from('social_identities').insert({user_id:a.id,username:'sneaky'+tag,display_name:'x'})).error,'identities cannot be inserted directly (username rules are enforced)');
 for(const p of [a,b,c,d]){const id=must(await rpc(p,'social_create_identity',{p_username:p.username.toUpperCase(),p_display_name:p.username}));p.pid=id;}
 check(must(await a.client.from('social_identities').select('username').single()).username===a.username,'usernames are stored case-insensitively (lowercase)');
 check(must(await rpc(b,'social_username_status',{p_username:a.username.toUpperCase()}))==='taken','usernames are unique regardless of case');
 check(!!(await a.client.from('social_identities').update({username:'other'+tag}).eq('user_id',a.id)).error,'usernames change only through the rename command');
 must(await a.client.from('social_identities').update({display_name:'Ava ✨',avatar_id:'reading-dragon'}).eq('user_id',a.id));
 check(!!(await a.client.from('social_identities').update({avatar_id:'https://example.test/me.jpg'}).eq('user_id',a.id)).error,'avatars are illustrated Muse characters only; no image URLs');
 check(must(await a.client.from('social_identities').select('display_name').single()).display_name==='Ava ✨','display names are editable');
 check(must(await b.client.from('social_identities').select('user_id')).length===1,'people only read their own identity row');
 // Discovery is opt-in
 check(must(await rpc(b,'social_search',{p_query:a.username})).length===0,'nobody is discoverable by default');
 check(!!(await rpc(b,'social_send_request',{p_target:a.pid})).error,'requests need the other person to be discoverable');
 must(await a.client.from('social_identities').update({discoverable:true}).eq('user_id',a.id));
 const found=must(await rpc(b,'social_search',{p_query:'@'+a.username.slice(0,4)}));
 check(found.length===1&&found[0].username===a.username,'discoverable people are found by username prefix');
 check(JSON.stringify(Object.keys(found[0]).sort())===JSON.stringify(['avatarId','creator','displayName','id','relationship','username']),'search results never include auth ids or emails');
 check(must(await rpc(b,'social_search',{p_query:'av'})).length===0,'searches need at least three characters');
 // Requests
 check(must(await rpc(b,'social_send_request',{p_target:a.pid}))==='outgoing','send a request');
 check(must(await rpc(b,'social_send_request',{p_target:a.pid}))==='outgoing','a second send does not duplicate');
 check(!!(await rpc(b,'social_send_request',{p_target:b.pid})).error,'no requests to yourself');
 const overA=must(await rpc(a,'social_overview'));check(overA.incoming.length===1&&overA.incoming[0].username===b.username,'incoming requests are listed');
 check(must(await rpc(b,'social_overview')).outgoing.length===1,'outgoing requests are listed');
 check(must(await a.client.rpc('can_view_as_friend',{owner:b.id}))===false,'a pending request grants nothing');
 must(await rpc(b,'social_cancel_request',{p_target:a.pid}));check(must(await rpc(a,'social_overview')).incoming.length===0,'a request can be cancelled');
 must(await rpc(b,'social_send_request',{p_target:a.pid}));must(await rpc(a,'social_decline',{p_target:b.pid}));check(must(await rpc(b,'social_overview')).outgoing.length===0,'a request can be declined');
 must(await rpc(b,'social_send_request',{p_target:a.pid}));check(must(await rpc(a,'social_accept',{p_target:b.pid}))==='friends','a request can be accepted');
 check(must(await a.client.rpc('can_view_as_friend',{owner:b.id}))&&must(await b.client.rpc('can_view_as_friend',{owner:a.id})),'friendship is mutual');
 check(must(await rpc(a,'social_overview')).friends.length===1&&must(await rpc(b,'social_overview')).friends.length===1,'both see the same friendship');
 check(!!(await b.client.from('friendships').select('*')).error,'friendship tables are not directly readable');
 // Crossing requests become a friendship
 must(await c.client.from('social_identities').update({discoverable:true}).eq('user_id',c.id));
 must(await a.client.from('social_identities').update({discoverable:true}).eq('user_id',a.id));
 must(await rpc(c,'social_send_request',{p_target:a.pid}));check(must(await rpc(a,'social_send_request',{p_target:c.pid}))==='friends','sending back to someone who asked you accepts their request');
 // Removal revokes immediately
 must(await rpc(a,'social_remove_friend',{p_target:c.pid}));check(must(await c.client.rpc('can_view_as_friend',{owner:a.id}))===false,'removing a friend revokes access immediately');
 // Blocking
 must(await rpc(b,'social_block',{p_target:a.pid}));
 check(must(await a.client.rpc('can_view_as_friend',{owner:b.id}))===false&&must(await b.client.rpc('can_view_as_friend',{owner:a.id}))===false,'blocking ends the friendship both ways at once');
 check(must(await rpc(b,'social_search',{p_query:a.username})).length===0&&must(await rpc(a,'social_search',{p_query:b.username})).length===0,'blocked people do not find each other');
 check(!!(await rpc(a,'social_send_request',{p_target:b.pid})).error,'blocked people cannot send requests');
 check(must(await rpc(b,'social_overview')).blocked.length===1,'blocks are listed for the blocker');
 must(await rpc(b,'social_unblock',{p_target:a.pid}));check(must(await rpc(a,'social_overview')).friends.length===0,'unblocking does not restore a friendship');
 // Pausing participation
 must(await rpc(d,'social_send_request',{p_target:a.pid}));must(await rpc(a,'social_accept',{p_target:d.pid}));
 must(await a.client.from('social_identities').update({participation:'paused'}).eq('user_id',a.id));
 check(must(await d.client.rpc('can_view_as_friend',{owner:a.id}))===false,'pausing social participation hides you from friends');
 check(must(await rpc(d,'social_search',{p_query:a.username})).length===0,'paused people are not discoverable');
 must(await a.client.from('social_identities').update({participation:'active'}).eq('user_id',a.id));
 check(must(await d.client.rpc('can_view_as_friend',{owner:a.id}))===true,'resuming keeps existing friendships');
 // Signed-out
 const anon=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
 check(!!(await anon.rpc('social_search',{p_query:a.username})).error,'signed-out visitors cannot search');
 console.log(`Social foundation: ${passed} checks passed.`);
}finally{for(const id of users)await admin.auth.admin.deleteUser(id).catch(()=>{});}
