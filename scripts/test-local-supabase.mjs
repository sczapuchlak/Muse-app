import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {loadEnvFile} from 'node:process';
loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,secret=process.env.SUPABASE_SECRET_KEY;
if(!url||!key||!secret||!['127.0.0.1','localhost','[::1]'].includes(new URL(url).hostname))throw new Error('This test requires configured LOCAL Supabase. Remote endpoints are refused.');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,secret,options),anon=createClient(url,key,options),ids=[];
const must=result=>{if(result.error)throw result.error;return result.data;};
const nonce=crypto.randomUUID();
async function invite(label){
 const email=`muse-local-${label}-${nonce}@example.test`;
 const created=must(await admin.auth.admin.generateLink({type:'invite',email,options:{data:{first_name:`Local test ${label}`,time_zone:'America/Los_Angeles'},redirectTo:'http://localhost:3000/auth/confirm'}}));
 ids.push(created.user.id);
 const client=createClient(url,key,options);
 const verified=must(await client.auth.verifyOtp({type:'invite',token_hash:created.properties.hashed_token}));
 assert.ok(verified.session);return {client,user:created.user,email,session:verified.session};
}
try{
 const signup=await anon.auth.signUp({email:`muse-uninvited-${nonce}@example.test`,password:crypto.randomUUID()});if(signup.data.user?.id)ids.push(signup.data.user.id);assert.ok(signup.error,'Public signup must fail');
 assert.ok((await anon.from('daily_records').select('*')).error,'Anonymous table access must fail');
 console.log('PASS public registration and anonymous data access denied');
 const a=await invite('a'),b=await invite('b');
 assert.equal(must(await a.client.from('profiles').select('*')).length,1);
 assert.equal(must(await a.client.from('profiles').select('*').eq('id',b.user.id)).length,0);
 const issued=await anon.auth.signInWithOtp({email:a.email,options:{shouldCreateUser:false,emailRedirectTo:'http://localhost:3000/auth/confirm'}});assert.equal(issued.error,null);
 console.log('PASS admin invitation, verification, local magic-link issuance and private profile');
 const day=must(await a.client.rpc('ensure_daily_record',{p_date:'2026-10-29'}));
 assert.equal(day.time_zone,'America/Los_Angeles');
 const saved=must(await a.client.rpc('save_daily_record',{p_date:'2026-10-29',p_patch:{energy:8,stress:3,overall_day:7,intention_text:'Local integration test',day_in_three:['🌱','✨']},p_expected_revision:day.revision}));
 assert.equal(saved.energy,8);
 const race=await Promise.all([4,6].map(stress=>a.client.rpc('save_daily_record',{p_date:'2026-10-29',p_patch:{stress},p_expected_revision:saved.revision})));
 assert.equal(race.filter(result=>!result.error).length,1);assert.equal(race.filter(result=>result.error?.code==='40001').length,1);
 console.log('PASS competing writes produce one commit and one explicit conflict');
 const stale=await a.client.rpc('save_daily_record',{p_date:'2026-10-29',p_patch:{energy:1},p_expected_revision:day.revision});assert.equal(stale.error?.code,'40001');
 assert.equal(must(await b.client.from('daily_records').select('*').eq('id',day.id)).length,0);
 const forged=await b.client.from('daily_priorities').insert({user_id:b.user.id,daily_record_id:day.id,text:'Forbidden',position:0});assert.equal(forged.error?.code,'42501');
 console.log('PASS durable daily values, revisions and cross-user isolation');
 const first=must(await a.client.rpc('save_mood_checkin',{p_date:'2026-10-29',p_period:'morning',p_reflection:'Local morning',p_emotion_ids:['emotion-calm'],p_influence_ids:[]}));
 must(await a.client.rpc('save_mood_checkin',{p_date:'2026-10-29',p_period:'evening',p_reflection:'Local evening',p_emotion_ids:['emotion-calm'],p_influence_ids:[]}));
 const fresh=createClient(url,key,options);must(await fresh.auth.setSession({access_token:a.session.access_token,refresh_token:a.session.refresh_token}));
 assert.equal(must(await fresh.from('daily_records').select('*').eq('id',day.id).single()).energy,8);
 assert.equal(must(await fresh.from('mood_checkins').select('*')).length,2);
 must(await fresh.rpc('delete_mood_checkin',{p_id:first.id,p_expected_revision:first.revision}));
 assert.equal(must(await fresh.from('daily_records').select('*').eq('id',day.id).single()).overall_day,7);
 console.log('PASS fresh authenticated client reads persisted data; sessions remain independent of daily Pulse');
 // Keep a token to verify deletion prevents it recreating owned records before JWT expiry.
 must(await admin.auth.admin.deleteUser(a.user.id));ids.splice(ids.indexOf(a.user.id),1);
 assert.equal(must(await fresh.from('daily_records').select('*')).length,0);
 assert.ok((await fresh.rpc('ensure_daily_record',{p_date:'2026-10-30'})).error);
 const signedOut=await fresh.auth.signOut({scope:'local'});assert.equal(signedOut.error,null);assert.equal((await fresh.auth.getSession()).data.session,null);
 console.log('PASS account cascade, stale-token private-write denial and local signout');
}finally{
 for(const id of ids){const result=await admin.auth.admin.deleteUser(id);if(result.error)throw result.error;}
 console.log('Synthetic integration users removed; no personal sample records retained.');
}
