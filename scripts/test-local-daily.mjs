import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {createClient} from '@supabase/supabase-js';
import {load} from '../tests/helpers.mjs';
loadEnvFile('.env.local');
const {readDay,readDays,ensureDailyRecord,saveDailyRecord,savePriorities,saveMoodCheckin,deleteMoodCheckin}=load('lib/data/daily');
const {DailyStore}=load('lib/data/daily-store');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,secret=process.env.SUPABASE_SECRET_KEY;
if(!url||!key||!secret||!['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname))throw Error('Local services required.');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,secret,options),anonymous=createClient(url,key,options),ids=[],date='2026-10-29',older='2026-03-08';
const must=result=>{if(result.error)throw result.error;return result.data;};
async function invite(){const email=`muse-daily-${crypto.randomUUID()}@example.test`,created=must(await admin.auth.admin.generateLink({type:'invite',email,options:{data:{first_name:'Daily test',time_zone:'America/Los_Angeles'}}}));ids.push(created.user.id);const client=createClient(url,key,options);const session=must(await client.auth.verifyOtp({type:'invite',token_hash:created.properties.hashed_token})).session;return {client,user:created.user,session};}
async function settled(store){for(let i=0;i<200;i++){const status=store.getSnapshot().statuses[date];if(status&&!status.saving)return status;await new Promise(r=>setTimeout(r,20));}throw Error('Daily queue did not settle');}
try{
 const a=await invite(),b=await invite();
 assert.equal((await readDay(a.client,date)).record,null);assert.equal(must(await a.client.from('daily_records').select('*')).length,0);
 let record=await ensureDailyRecord(a.client,date);record=await saveDailyRecord(a.client,record,{intention_text:'Make a little room',intention_emoji:'🌱',day_in_three:['☕','👩‍💻','🌙'],energy:8,stress:2,overall_day:7});
 assert.equal(record.time_zone,'America/Los_Angeles');
 const first={id:crypto.randomUUID(),text:'Write the opening',complete:false},second={id:crypto.randomUUID(),text:'Leave room',complete:true};await savePriorities(a.client,date,[first,second],[]);
 let day=await readDay(a.client,date);const createdAt=day.priorities.find(item=>item.id===second.id).created_at,completedAt=day.priorities.find(item=>item.id===second.id).completed_at;
 const stale=structuredClone(day.priorities);await savePriorities(a.client,date,[second,{...first,text:'Write and revise',complete:true}],day.priorities);day=await readDay(a.client,date);
 assert.deepEqual(day.priorities.map(item=>item.id),[second.id,first.id]);assert.equal(day.priorities[0].created_at,createdAt);assert.equal(day.priorities[0].completed_at,completedAt);assert.ok(day.priorities.every(item=>item.standalone_complete));
 await assert.rejects(()=>savePriorities(a.client,date,[first],stale),error=>error.code==='40001');
 assert.equal((await readDay(a.client,date)).priorities.length,2);
 console.log('PASS daily expression/Pulse, ordered standalone priorities, stable IDs and conflict-safe reordering');
 const influence=must(await a.client.from('influence_tags').insert({label:'A new chapter'}).select('*').single());
 await saveMoodCheckin(a.client,{date,period:'morning',reflection:'A quieter start.',emotionIds:['emotion-calm','emotion-hopeful'],influenceIds:[influence.id],revision:null});
 await saveMoodCheckin(a.client,{date,period:'evening',reflection:'Room for both.',emotionIds:['emotion-anxious'],influenceIds:[],revision:null});
 day=await readDay(a.client,date);assert.equal(day.checkins.length,2);assert.equal(day.checkins[0].checkin_emotions.length,2);assert.equal(day.checkins[0].checkin_influences[0].influence_id,influence.id);
 const morning=day.checkins[0],evening=day.checkins[1];await saveMoodCheckin(a.client,{date,period:'morning',reflection:'An edited start.',emotionIds:['emotion-calm'],influenceIds:[],revision:morning.revision});
 await assert.rejects(()=>saveMoodCheckin(a.client,{date,period:'morning',reflection:'Stale',emotionIds:[],influenceIds:[],revision:morning.revision}),error=>error.code==='40001');
 day=await readDay(a.client,date);assert.equal(day.checkins[0].id,morning.id);assert.equal(day.checkins[0].created_at,morning.created_at);assert.equal(day.checkins[1].reflection,evening.reflection);assert.equal(day.record.energy,8);assert.ok(!('energy' in day.checkins[0]));
 console.log('PASS independent Morning/Evening, joins/reflection, identity and no session-level Pulse');
 const historical=await ensureDailyRecord(a.client,older);await saveDailyRecord(a.client,historical,{intention_text:'A day without a check-in',stress:3});await savePriorities(a.client,older,[{id:crypto.randomUUID(),text:'A historical commitment',complete:false}],[]);
 const history=await readDays(a.client,'2026-01-01','2026-12-31');assert.equal(history[older].checkins.length,0);assert.equal(history[older].priorities.length,1);assert.equal(history[older].record.stress,3);
 must(await a.client.rpc('save_account_preferences',{p_expected_revision:must(await a.client.from('profiles').select('revision').single()).revision,p_command_id:crypto.randomUUID(),p_patch:{time_zone:'Asia/Tokyo'}}));assert.equal((await readDay(a.client,date)).record.time_zone,'America/Los_Angeles');assert.equal((await readDay(a.client,older)).record.local_date,older);
 const fresh=createClient(url,key,options);must(await fresh.auth.setSession({access_token:a.session.access_token,refresh_token:a.session.refresh_token}));assert.equal((await readDay(fresh,date)).record.day_in_three[1],'👩‍💻');
 console.log('PASS fresh-client persistence, historical/partial/no-Mood days and stable local dates after timezone change');
 const store=new DailyStore(a.client,{id:a.user.id,firstName:'Daily test',timeZone:'Asia/Tokyo'});await store.load(date);store.edit(date,{kind:'daily',patch:{intention_text:'Saved through shared store'}});assert.equal((await settled(store)).error,'');assert.equal((await readDay(fresh,date)).record.intention_text,'Saved through shared store');
 const conflictBase=await readDay(fresh,date);await saveDailyRecord(fresh,conflictBase.record,{intention_text:'Another device'});store.edit(date,{kind:'daily',patch:{intention_text:'Local draft'}});assert.equal((await settled(store)).conflict,true);assert.equal(store.getSnapshot().days[date].record.intention_text,'Local draft');assert.equal((await readDay(fresh,date)).record.intention_text,'Another device');await store.discard(date);
 console.log('PASS real shared-store save, concurrent-edit rejection, draft retention and explicit reload');
 day=await readDay(a.client,date);await deleteMoodCheckin(a.client,day.checkins[0]);day=await readDay(a.client,date);await saveMoodCheckin(a.client,{date,period:'evening',reflection:null,emotionIds:[],influenceIds:[],revision:day.checkins[0].revision});day=await readDay(a.client,date);assert.equal(day.checkins.length,0);assert.equal(day.record.energy,8);assert.equal(day.priorities.length,2);
 await saveDailyRecord(a.client,day.record,{intention_text:null,intention_emoji:null,day_in_three:[],energy:null,stress:null,overall_day:null});await savePriorities(a.client,date,[],day.priorities);day=await readDay(a.client,date);assert.equal(day.record.energy,null);assert.equal(day.record.intention_text,null);assert.deepEqual(day.record.day_in_three,[]);assert.equal(day.priorities.length,0);
 assert.equal((await readDay(b.client,date)).record,null);assert.equal(must(await b.client.from('daily_priorities').select('*').eq('daily_record_id',day.record.id)).length,0);
 assert.ok((await b.client.from('daily_priorities').insert({daily_record_id:day.record.id,text:'Foreign',position:0})).error);assert.ok((await anonymous.from('daily_records').select('*')).error);assert.ok((await anonymous.rpc('save_daily_priorities',{p_date:date,p_items:[],p_expected:[]})).error);
 console.log('PASS clear/delete independence, cross-user FK/RLS and anonymous denial');
}finally{for(const id of ids)must(await admin.auth.admin.deleteUser(id));console.log('Synthetic daily-test accounts removed; no personal fixtures retained.');}
