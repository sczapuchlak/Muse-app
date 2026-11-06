// #26 Profiles & Showcases: owner-only storage, the friend-facing view and revocation, tested
// with disposable local accounts. Local Supabase only. Run: node scripts/test-local-profiles.mjs
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {createClient} from '@supabase/supabase-js';
loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.ok(url&&['localhost','127.0.0.1'].includes(new URL(url).hostname),'Local Supabase only');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options),users=[];
const must=result=>{if(result.error)throw result.error;return result.data;};
const tag=crypto.randomUUID().slice(0,6);
async function person(name){const link=must(await admin.auth.admin.generateLink({type:'invite',email:`profiles-${name}-${crypto.randomUUID()}@example.test`}));users.push(link.user.id);const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token}));const pid=must(await client.rpc('social_create_identity',{p_username:`${name}${tag}`,p_display_name:name}));must(await client.from('social_identities').update({discoverable:true}).eq('user_id',link.user.id));return {id:link.user.id,client,pid,username:`${name}${tag}`};}
let passed=0;const check=(cond,label)=>{assert.ok(cond,label);passed++;};
try{
 const [owner,friend,stranger]=await Promise.all(['olive','fern','sid'].map(person));
 must(await owner.client.from('muse_profiles').insert({user_id:owner.id,profile_theme:'disco-damage',tagline:'Collector of small wonders',bio:'Books, dreams and very strong opinions about tea.'}));
 const shown=crypto.randomUUID(),draft=crypto.randomUUID(),privateShowcase=crypto.randomUUID();
 must(await owner.client.from('showcases').insert([{id:shown,user_id:owner.id,title:'Books That Altered My Brain Chemistry',icon:'book',gradient:'emerald-city',layout:'shelf',visibility:'friends',position:0},{id:draft,user_id:owner.id,title:'Secret draft',icon:'moon',gradient:'pearl',layout:'cards',visibility:'draft',position:1},{id:privateShowcase,user_id:owner.id,title:'Only me',icon:'heart',gradient:'pearl',layout:'cards',visibility:'private',position:2}]));
 const kept=crypto.randomUUID(),gone=crypto.randomUUID();
 must(await owner.client.from('showcase_items').insert([{id:kept,user_id:owner.id,showcase_id:shown,source_kind:'book',source_id:'book-1',display:{kind:'book',title:'Piranesi',subtitle:'Susanna Clarke',image:'https://covers.example.test/piranesi.jpg',rating:5},approved:['title','author','cover','rating'],source_state:'ok',position:0},{id:gone,user_id:owner.id,showcase_id:shown,source_kind:'book',source_id:'book-2',display:{kind:'book',title:'Deleted book'},approved:['title'],source_state:'missing',position:1}]));
 // Display allow-list
 const bad=(display)=>owner.client.from('showcase_items').insert({id:crypto.randomUUID(),user_id:owner.id,showcase_id:shown,source_kind:'book',display});
 check(!!(await bad({title:'x',journal:'private dream text'})).error,'unknown display fields are refused by the database');
 check(!!(await bad({title:'x',image:'javascript:alert(1)'})).error,'only https or app image paths are accepted');
 check(!!(await bad({title:'x',meta:['a','b','c','d','e']})).error,'display metadata is bounded');
 check(!!(await bad({subtitle:'no title'})).error,'every item needs a title');
 // Direct table access
 for(const table of ['muse_profiles','showcases','showcase_items'])check(must(await friend.client.from(table).select('*')).length===0,`others cannot read ${table}`);
 check(!!(await stranger.client.from('showcases').insert({id:crypto.randomUUID(),user_id:owner.id,title:'Intrusion'})).error,'nobody can write into someone else\'s profile');
 // Friend view
 check(must(await stranger.client.rpc('profile_view',{p_profile:owner.pid}))===null,'strangers see nothing');
 must(await friend.client.rpc('social_send_request',{p_target:owner.pid}));must(await owner.client.rpc('social_accept',{p_target:friend.pid}));
 check(must(await friend.client.rpc('profile_view',{p_profile:owner.pid}))===null,'profiles stay private until the owner shares with friends');
 check(must(await friend.client.rpc('profile_lookup',{p_username:owner.username}))===null,'a private profile cannot even be looked up');
 const preview=must(await owner.client.rpc('profile_view',{p_profile:owner.pid}));
 check(preview&&preview.showcases.length===1,'the owner\'s "Preview as a friend" shows only friend-visible Showcases');
 must(await owner.client.from('muse_profiles').update({visibility:'friends'}).eq('user_id',owner.id));
 const view=must(await friend.client.rpc('profile_view',{p_profile:owner.pid}));
 check(view&&view.identity.username===owner.username&&view.profile.theme==='disco-damage','friends see the profile and its theme once shared');
 check(view.showcases.length===1&&view.showcases[0].title==='Books That Altered My Brain Chemistry','drafts and private Showcases are never shown to friends');
 check(view.showcases[0].items.length===1&&view.showcases[0].items[0].display.title==='Piranesi','items whose source is gone are hidden');
 const text=JSON.stringify(view);check(!text.includes(owner.id)&&!text.includes('book-1')&&!text.includes('approved'),'the friend view carries no auth ids or source references');
 check(must(await friend.client.rpc('profile_lookup',{p_username:owner.username}))===owner.pid,'friends can open a shared profile by username');
 check(must(await stranger.client.rpc('profile_lookup',{p_username:owner.username}))===null,'strangers cannot resolve the username');
 // Revocation
 must(await owner.client.rpc('social_remove_friend',{p_target:friend.pid}));
 check(must(await friend.client.rpc('profile_view',{p_profile:owner.pid}))===null,'removing a friend hides the profile immediately');
 must(await friend.client.rpc('social_send_request',{p_target:owner.pid}));must(await owner.client.rpc('social_accept',{p_target:friend.pid}));
 check(!!must(await friend.client.rpc('profile_view',{p_profile:owner.pid})),'re-friending restores the shared view');
 must(await owner.client.rpc('social_block',{p_target:friend.pid}));
 check(must(await friend.client.rpc('profile_view',{p_profile:owner.pid}))===null,'blocking hides the profile at once');
 // Deleting a Showcase leaves sources alone and removes its items
 must(await owner.client.from('showcases').delete().eq('id',shown));
 check(must(await owner.client.from('showcase_items').select('id')).length===0,'deleting a Showcase removes only its own items');
 console.log(`Profiles & Showcases: ${passed} checks passed.`);
}finally{for(const id of users)await admin.auth.admin.deleteUser(id).catch(()=>{});}
