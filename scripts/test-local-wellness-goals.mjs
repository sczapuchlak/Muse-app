import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {loadEnvFile} from 'node:process';
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {load} from '../tests/helpers.mjs';
loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local only');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options),anon=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options),users=[],must=r=>{if(r.error)throw r.error;return r.data;};
const {readWellness,writeWellness}=load('lib/data/wellness'),{wellnessReducer}=load('lib/wellness'),goals=load('lib/wellness-goals'),{todayInTimeZone,shiftDate,weekDates}=load('lib/dates');
const {readRituals,writeRituals}=load('lib/data/rituals'),{ritualReducer}=load('lib/rituals'),connections=load('lib/ritual-connections');
const docker=process.env.MUSE_DOCKER_PATH||(existsSync(homedir()+'/.docker/bin/docker')?homedir()+'/.docker/bin/docker':'docker');
/** Local superuser SQL for seeding history and checking cascades; values are UUIDs/dates generated here. */
const sql=text=>{const r=spawnSync(docker,['exec','-i','supabase_db_muse-local','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],{input:text,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();};
const omit=(value,key)=>{const copy={...value};delete copy[key];return copy;};
const m=pattern=>error=>pattern.test(error?.message??'');
const zone='America/Los_Angeles',today=todayInTimeZone(zone),now=()=>new Date().toISOString();
async function invite(){const x=must(await admin.auth.admin.generateLink({type:'invite',email:`goals-${crypto.randomUUID()}@example.test`}));users.push(x.user.id);const c=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);const session=must(await c.auth.verifyOtp({type:'invite',token_hash:x.properties.hashed_token})).session;const profile=must(await c.from('profiles').select('revision').single());must(await c.rpc('save_account_preferences',{p_expected_revision:profile.revision,p_command_id:crypto.randomUUID(),p_patch:{time_zone:zone}}));return {c,session,id:x.user.id};}
const types=[{id:'movement-upper',name:'Upper',source:'starter',archived:false},{id:'custom-climb',name:'Climb',source:'custom',archived:false}];
try{
 const a=await invite(),b=await invite();
 let snap=await readWellness(a.c);assert.deepEqual(snap.state.goals,[],'a migrated server reports goal support with an empty list');
 const save=async state=>{const revision=await writeWellness(a.c,snap.revision,crypto.randomUUID(),state);snap=await readWellness(a.c);assert.equal(snap.revision,revision);return snap;};

 // Classification and durations persist on the same authoritative records; unknown stays unknown.
 const activity={id:crypto.randomUUID(),date:today,typeId:'custom-climb'};
 await save({...snap.state,types,activities:[activity]});
 await save(wellnessReducer(wellnessReducer(snap.state,{kind:'type/category',id:'custom-climb',category:'strength'}),{kind:'activity/duration',id:activity.id,durationMinutes:45}));
 assert.equal(snap.state.types.find(t=>t.id==='custom-climb').category,'strength');
 assert.equal(snap.state.types.find(t=>t.id==='movement-upper').category,undefined,'starter defaults are not written into stored data');
 assert.equal(snap.state.activities[0].durationMinutes,45);
 const legacyActivities=snap.state.activities.map(a=>omit(a,'durationMinutes')),legacyTypes=snap.state.types.map(t=>omit(t,'category'));
 const legacy=omit(snap.state,'goals');
 await save({...legacy,activities:legacyActivities,types:legacyTypes});
 assert.equal(snap.state.activities[0].durationMinutes,45,'an older client that omits durations does not erase them');
 assert.equal(snap.state.types.find(t=>t.id==='custom-climb').category,'strength');
 await assert.rejects(()=>writeWellness(a.c,snap.revision,crypto.randomUUID(),{...snap.state,activities:[{...snap.state.activities[0],durationMinutes:2000}]}),m(/minutes/));
 await save(wellnessReducer(snap.state,{kind:'activity/duration',id:activity.id,durationMinutes:null}));
 assert.equal(snap.state.activities[0].durationMinutes,undefined,'clearing a duration returns it to unknown');

 // Goals: create, change within the period, and keep history.
 const goal=goals.newGoal('strength-workouts','week',3,'sessions',today,now(),crypto.randomUUID());
 await save(wellnessReducer(snap.state,{kind:'goal/save',goal}));
 assert.equal(snap.state.goals.length,1);assert.equal(snap.state.goals[0].versions[0].effectiveFrom,weekDates(today)[0]);
 await save(wellnessReducer(snap.state,{kind:'goal/save',goal:goals.withVersion(snap.state.goals[0],today,{target:4},now())}));
 assert.deepEqual(snap.state.goals[0].versions.map(v=>v.target),[4],'a change in the same period replaces that period’s version');
 // Seed a past version as history (service role), then prove clients cannot rewrite, backdate or delete it.
 const past=shiftDate(weekDates(today)[0],-14);
 sql(`insert into public.wellness_goal_versions(user_id,goal_id,effective_from,target,unit,direction,status) values('${a.id}','${goal.id}','${past}',2,'sessions','atLeast','active')`);
 snap=await readWellness(a.c);assert.deepEqual(snap.state.goals[0].versions.map(v=>[v.effectiveFrom,v.target]),[[past,2],[weekDates(today)[0],4]]);
 const rewrite=g=>({...snap.state,goals:[g]});
 await assert.rejects(()=>writeWellness(a.c,snap.revision,crypto.randomUUID(),rewrite({...snap.state.goals[0],versions:snap.state.goals[0].versions.map(v=>v.effectiveFrom===past?{...v,target:9}:v)})),m(/Past goal versions/));
 await assert.rejects(()=>writeWellness(a.c,snap.revision,crypto.randomUUID(),rewrite({...snap.state.goals[0],versions:snap.state.goals[0].versions.filter(v=>v.effectiveFrom!==past)})),m(/Past goal versions/));
 await assert.rejects(()=>writeWellness(a.c,snap.revision,crypto.randomUUID(),rewrite({...snap.state.goals[0],versions:[...snap.state.goals[0].versions,{effectiveFrom:shiftDate(past,7),target:5,unit:'sessions',direction:'atLeast',status:'active',recordedAt:now()}]})),m(/current period/));
 await assert.rejects(()=>writeWellness(a.c,snap.revision,crypto.randomUUID(),{...snap.state,goals:[]}),m(/Retire goals/));
 await assert.rejects(()=>writeWellness(a.c,snap.revision,crypto.randomUUID(),rewrite({...snap.state.goals[0],metric:'cardio-workouts'})),m(/keeps its measure/));
 await assert.rejects(()=>writeWellness(a.c,snap.revision,crypto.randomUUID(),{...snap.state,goals:[...snap.state.goals,{...goals.newGoal('water','day',80,'oz',today,now(),crypto.randomUUID()),period:'week'}]}),e=>!!e);
 await save(wellnessReducer(snap.state,{kind:'goal/save',goal:goals.withVersion(snap.state.goals[0],today,{status:'paused'},now())}));
 assert.equal(goals.currentVersion(snap.state.goals[0]).status,'paused');assert.equal(snap.state.goals[0].versions[0].target,2,'history kept through pause');
 await save({...snap.state,goals:undefined});
 assert.equal(snap.state.goals.length,1,'an older client that omits goals does not erase them');

 // Isolation: another account and anonymous visitors see and change nothing.
 const other=await readWellness(b.c);assert.deepEqual(other.state.goals,[]);
 assert.deepEqual(must(await b.c.from('wellness_goals').select('id')),[]);assert.deepEqual(must(await b.c.from('wellness_goal_versions').select('goal_id')),[]);
 await assert.rejects(()=>writeWellness(b.c,other.revision,crypto.randomUUID(),{...other.state,goals:[snap.state.goals[0]]}),e=>e.code==='42501');
 assert.ok((await anon.rpc('read_wellness')).error);
 assert.ok((await a.c.from('wellness_goals').insert({id:crypto.randomUUID(),user_id:a.id,metric:'workouts',period:'week'})).error,'direct writes are denied');

 // Connected Rituals: persist, validate against the Ritual type, materialize on disconnect, survive older clients.
 let rit=await readRituals(a.c);assert.equal(rit.state.connectionsEnabled,true);
 const saveR=async state=>{await writeRituals(a.c,rit.revision,crypto.randomUUID(),state);rit=await readRituals(a.c);return rit;};
 const group={id:crypto.randomUUID(),name:'Body',accent:'primary',icon:'rituals',collapsed:false},water={id:crypto.randomUUID(),name:'Hydrate',groupId:group.id,type:'numeric',goal:80,unit:'oz',recurrence:{kind:'daily'},startDate:shiftDate(today,-10),createdAt:now(),connection:{metric:'water',unit:'oz',since:shiftDate(today,-3)}};
 await saveR(ritualReducer(ritualReducer(rit.state,{type:'group/save',group}),{type:'ritual/save',ritual:water}));
 assert.deepEqual(rit.state.rituals[0].connection,water.connection);
 await assert.rejects(()=>writeRituals(a.c,rit.revision,crypto.randomUUID(),{...rit.state,rituals:[{...rit.state.rituals[0],type:'duration',connection:{metric:'water',since:today}}]}),m(/connection/));
 await assert.rejects(()=>writeRituals(a.c,rit.revision,crypto.randomUUID(),{...rit.state,rituals:[{...rit.state.rituals[0],connection:{metric:'water',since:today,extra:1}}]}),m(/connection/));
 const legacyRituals=omit(rit.state,'connectionsEnabled');
 await saveR({...legacyRituals,rituals:rit.state.rituals.map(r=>omit(r,'connection'))});
 assert.deepEqual(rit.state.rituals[0].connection,water.connection,'an older client that omits connections does not disconnect');
 const waterDays=[{date:shiftDate(today,-2),total:85,unit:'oz'},{date:shiftDate(today,-1),total:30,unit:'oz'}];
 const sources={timeZone:zone,wellness:{water:waterDays,activities:[],types,assignments:[]}};
 const shown=connections.withConnections(rit.state,sources,today).state.entries.map(e=>[e.date,e.value]).sort();
 const materialize=connections.materializeConnection(rit.state.rituals[0],sources,today);
 await saveR(ritualReducer(rit.state,{type:'ritual/connect',id:water.id,connection:null,materialize,today,now:now()}));
 assert.equal(rit.state.rituals[0].connection,null);
 assert.deepEqual(rit.state.entries.map(e=>[e.date,Number(e.value)]).sort(),shown,'disconnecting stores exactly what was shown');
 assert.deepEqual(must(await b.c.from('rituals').select('id')),[]);

 const fresh=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await fresh.auth.setSession(a.session));
 assert.deepEqual(await readWellness(fresh),snap);assert.deepEqual(await readRituals(fresh),rit);
 must(await admin.auth.admin.deleteUser(a.id));users.splice(users.indexOf(a.id),1);
 assert.equal(sql(`select (select count(*) from public.wellness_goals where user_id='${a.id}')+(select count(*) from public.wellness_goal_versions where user_id='${a.id}')`),'0');
 console.log('PASS movement classification and durations persist; older clients cannot erase durations, categories, goals or connections');
 console.log('PASS goal versions: same-period edits, preserved history, no backdating/rewrites/deletion, identity lock, pause without loss');
 console.log('PASS connected Ritual validation, disconnect materialization, owner isolation, anonymous/direct-write denial, fresh-client persistence and account-deletion cascade');
}finally{for(const id of users)must(await admin.auth.admin.deleteUser(id));console.log('Disposable goal accounts removed.');}
