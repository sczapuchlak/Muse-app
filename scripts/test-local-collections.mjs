// Owner-isolation and relational checks against disposable users in local Supabase only.
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {createClient} from '@supabase/supabase-js';
loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.ok(url&&['localhost','127.0.0.1'].includes(new URL(url).hostname),'Local Supabase only');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options),users=[];
const must=result=>{if(result.error)throw result.error;return result.data;};
async function owner(){const link=must(await admin.auth.admin.generateLink({type:'invite',email:`collections-test-${crypto.randomUUID()}@example.test`}));users.push(link.user.id);const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token}));return {id:link.user.id,client};}
try{
 const a=await owner(),b=await owner(),film=crypto.randomUUID(),show=crypto.randomUUID(),game=crypto.randomUUID(),episode=crypto.randomUUID(),series=crypto.randomUUID(),curated=crypto.randomUUID();
 must(await a.client.from('collection_media_items').insert([{id:film,user_id:a.id,kind:'movie',title:'Private Film',status:'watched'},{id:show,user_id:a.id,kind:'tv',title:'Private Show',status:'watching'},{id:game,user_id:a.id,kind:'game',title:'Private Game',status:'playing'}]));
 assert.equal(must(await b.client.from('collection_media_items').select('id')).length,0);
 assert.ok((await b.client.from('collection_media_items').insert({id:crypto.randomUUID(),user_id:a.id,kind:'movie',title:'Intrusion',status:'planned'})).error);
 assert.ok((await b.client.from('collection_tv_episodes').insert({id:crypto.randomUUID(),user_id:b.id,show_id:show,season_number:1,episode_number:1})).error);
 assert.ok((await a.client.from('collection_tv_episodes').insert({id:crypto.randomUUID(),user_id:a.id,show_id:film,season_number:1,episode_number:1})).error);
 must(await a.client.from('collection_tv_episodes').insert({id:episode,user_id:a.id,show_id:show,season_number:1,episode_number:1,release_state:'released'}));
 assert.ok((await a.client.from('collection_activity').insert({id:crypto.randomUUID(),user_id:a.id,media_id:film,episode_id:episode,kind:'episode-watch',activity_date:'2026-11-03'})).error);
 must(await a.client.from('collection_activity').insert({id:crypto.randomUUID(),user_id:a.id,media_id:show,episode_id:episode,kind:'episode-watch',activity_date:'2026-11-03'}));
 assert.equal(must(await b.client.from('collection_activity').select('id')).length,0);
 must(await a.client.from('collection_series').insert({id:series,user_id:a.id,title:'Private series',kind:'movie'}));
 assert.ok((await a.client.from('collection_series_members').insert({id:crypto.randomUUID(),user_id:a.id,series_id:series,media_id:game,sequence:1})).error);
 must(await a.client.from('collection_series_members').insert({id:crypto.randomUUID(),user_id:a.id,series_id:series,media_id:film,sequence:1}));
 must(await a.client.from('collection_curated').insert({id:curated,user_id:a.id,title:'Private collection'}));
 const first=must(await a.client.from('collection_curated_members').insert({id:crypto.randomUUID(),user_id:a.id,collection_id:curated,media_id:film,position:100}).select().single());
 const second=must(await a.client.from('collection_curated_members').insert({id:crypto.randomUUID(),user_id:a.id,collection_id:curated,media_id:game,position:200}).select().single());
 assert.ok((await b.client.rpc('swap_collection_members',{p_first:first.id,p_second:second.id,p_first_revision:first.revision,p_second_revision:second.revision})).error);
 must(await a.client.rpc('swap_collection_members',{p_first:first.id,p_second:second.id,p_first_revision:first.revision,p_second_revision:second.revision}));
 const swapped=must(await a.client.from('collection_curated_members').select('id,position').eq('collection_id',curated));assert.equal(swapped.find(row=>row.id===first.id).position,200);assert.equal(swapped.find(row=>row.id===second.id).position,100);
 assert.ok((await a.client.rpc('swap_collection_members',{p_first:first.id,p_second:second.id,p_first_revision:first.revision,p_second_revision:second.revision})).error);
 const bItem=crypto.randomUUID();must(await b.client.from('collection_media_items').insert({id:bItem,user_id:b.id,kind:'game',title:'Delete cascade',status:'backlog'}));
 must(await admin.auth.admin.deleteUser(b.id));users.splice(users.indexOf(b.id),1);assert.equal(must(await admin.from('collection_media_items').select('id').eq('user_id',b.id)).length,0);
 console.log('PASS local Collections owner isolation, media/episode/series integrity, atomic ordering, conflict detection and account deletion cascade.');
}finally{for(const id of users)must(await admin.auth.admin.deleteUser(id));console.log('Disposable Collections test accounts removed.');}
