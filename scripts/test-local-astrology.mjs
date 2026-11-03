import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {createClient} from '@supabase/supabase-js';
import {load} from '../tests/helpers.mjs';
loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local Supabase only');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options),anon=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options),users=[];
const must=r=>{if(r.error)throw r.error;return r.data;},uuid=()=>crypto.randomUUID();
const {calculateNatal}=load('lib/astrology/calculations');
const profile={date:'2000-01-01',time:'12:00',accuracy:'exact',uncertaintyMinutes:0,place:{id:'synthetic',name:'Synthetic Greenwich test location',latitude:51.4779,longitude:0,timeZone:'UTC'},zodiac:'tropical',houseSystem:'whole-sign'};
async function owner(){const link=must(await admin.auth.admin.generateLink({type:'invite',email:`astro-test-${uuid()}@example.test`}));users.push(link.user.id);const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options),session=must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token})).session;return {client,id:link.user.id,session};}
try{
 const a=await owner(),b=await owner(),commandId=uuid(),profileId=uuid(),chartId=uuid(),record={id:profileId,chartId,profile,chart:calculateNatal(profile)};
 const write=(owner,operation,p_record,expected=0,id=uuid(),userId=owner.id)=>owner.client.rpc('write_astrology',{p_user_id:userId,p_operation:operation,p_record,p_expected_revision:expected,p_command_id:id});
 assert.ok((await anon.rpc('read_astrology')).error);assert.ok((await b.client.from('astrology_birth_profiles').insert({user_id:a.id,id:uuid(),payload:profile})).error);
 assert.ok((await write(b,'profile-save',record,0,uuid(),a.id)).error);
 const saved=must(await write(a,'profile-save',record,0,commandId));assert.equal(saved.revision,1);
 assert.deepEqual(must(await write(a,'profile-save',{...record,chart:{...record.chart,calculatedAt:new Date().toISOString()}},0,commandId)),saved);
 assert.ok((await write(a,'profile-save',{...record,profile:{...profile,time:'12:01'}},0,commandId)).error);
 assert.equal(must(await a.client.rpc('read_astrology')).profile.revision,1);assert.equal(must(await b.client.rpc('read_astrology')).profile,null);
 assert.equal(must(await b.client.from('astrology_birth_profiles').select('*')).length,0);
 const updated=must(await write(a,'profile-save',{...record,chartId:uuid(),profile:{...profile,time:'12:01'}},1));assert.equal(updated.revision,2);
 assert.ok((await write(a,'profile-save',record,1)).error);
 const journal={id:uuid(),date:'2026-11-01',time_zone:'America/Los_Angeles',title:'An explicit reflection',text:'A retained private reflection.',reference:{type:'placement',id:chartId+'/Sun',title:'Sun'}};
 const journalCommand=uuid(),j=must(await write(a,'journal-save',journal,0,journalCommand));assert.equal(j.revision,1);assert.deepEqual(must(await write(a,'journal-save',journal,0,journalCommand)),j);
 const edited=must(await write(a,'journal-save',{...journal,text:'Updated private note'},1));assert.equal(edited.revision,2);assert.ok((await write(a,'journal-save',journal,1)).error);
 for(let i=0;i<2;i++)must(await write(a,'activity',{kind:'library-viewed',reference_id:'sign-aries'}));
 assert.equal(must(await a.client.rpc('read_astrology')).activity.filter(row=>row.kind==='library-viewed').length,1);
 const own=must(await a.client.from('profiles').select('revision').eq('id',a.id).single());
 must(await a.client.rpc('save_account_preferences',{p_expected_revision:own.revision,p_command_id:uuid(),p_patch:{zodiac_sign:'taurus',default_forecast_category:'career',default_forecast_period:'weekly',daily_forecast_category:'overview'}}));
 const preferences=must(await a.client.from('profiles').select('*').eq('id',a.id).single());assert.equal(preferences.zodiac_sign,'taurus');assert.equal(preferences.default_forecast_category,'career');assert.equal(preferences.default_forecast_period,'weekly');
 const fresh=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await fresh.auth.setSession(a.session));assert.equal(must(await fresh.rpc('read_astrology')).journal[0].text,'Updated private note');
 must(await write(a,'chart-delete',{confirmation:'DELETE'},2));let snapshot=must(await a.client.rpc('read_astrology'));assert.equal(snapshot.chart,null);assert.ok(snapshot.profile);assert.equal(snapshot.journal.length,1);
 must(await write(a,'profile-delete',{confirmation:'DELETE'},2));snapshot=must(await a.client.rpc('read_astrology'));assert.equal(snapshot.profile,null);assert.equal(snapshot.chart,null);assert.equal(snapshot.journal.length,1);assert.equal(snapshot.activity.filter(row=>row.kind.startsWith('chart-')).length,0);
 must(await write(a,'journal-delete',{id:journal.id},2));assert.equal(must(await a.client.rpc('read_astrology')).journal.length,0);
 must(await write(a,'history-clear',{confirmation:'DELETE'}));assert.equal(must(await a.client.rpc('read_astrology')).activity.length,0);
 const cascadeId=uuid();must(await write(b,'profile-save',{id:uuid(),chartId:uuid(),profile,chart:calculateNatal(profile)}));must(await write(b,'journal-save',{...journal,id:cascadeId}));must(await write(b,'activity',{kind:'library-viewed',reference_id:'sign-aries'}));must(await admin.auth.admin.deleteUser(b.id));users.splice(users.indexOf(b.id),1);for(const table of ['astrology_birth_profiles','astrology_natal_charts','astrology_journal_entries','astrology_activity'])assert.equal(must(await admin.from(table).select('user_id').eq('user_id',b.id)).length,0);
 console.log('PASS local Observatory profile/chart/journal CRUD, revisions, idempotency, restart persistence, preferences, deduplicated activity, owner isolation, anonymous/direct-write denial, scoped deletion, populated account-deletion cascades and history clearing.');
}finally{for(const id of users)must(await admin.auth.admin.deleteUser(id));console.log('Disposable astrology test accounts removed.');}
