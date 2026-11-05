// LOCAL: invited-account provisioning, first-run onboarding persistence and profile isolation (#29).
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {loadEnvFile} from 'node:process';
import {load} from '../tests/helpers.mjs';
loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local only');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options),anon=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options),users=[];
const must=r=>{if(r.error)throw r.error;return r.data;},message=pattern=>error=>pattern.test(error?.message??'');
const {readAccount,writePreferences}=load('lib/data/account'),{needsOnboarding}=load('lib/onboarding');
async function invite(){const email=`onboarding-${crypto.randomUUID()}@example.test`,x=must(await admin.auth.admin.generateLink({type:'invite',email}));users.push(x.user.id);const c=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await c.auth.verifyOtp({type:'invite',token_hash:x.properties.hashed_token}));return {c,id:x.user.id,email};}
try{
 const a=await invite(),b=await invite();
 // Provisioning: the existing trigger creates a private profile that needs setup; no sample data is imported.
 let account=await readAccount(a.c);
 assert.equal(account.profile.id,a.id);assert.equal(account.profile.first_name,'');assert.equal(account.profile.time_zone,'UTC');
 assert.equal(account.profile.onboarded_at,null);assert.equal(needsOnboarding(account.profile),true);
 for(const rpc of ['read_wellness','read_rituals','read_money','read_planner']){const data=must(await a.c.rpc(rpc));const state=data.state??data;const sizes=Object.values(state).filter(Array.isArray).map(v=>v.length);assert.ok(sizes.every(n=>n===0)||rpc==='read_wellness'&&sizes.every(n=>n===0||n===state.grocerySections?.length),`${rpc} starts empty`);}
 // Invalid onboarding input is rejected without changing anything.
 const save=async(patch,revision,id=crypto.randomUUID())=>writePreferences(a.c,revision??(await readAccount(a.c)).profile.revision,id,patch);
 await assert.rejects(()=>save({first_name:'   '}),message(/name between 1 and 80/));
 await assert.rejects(()=>save({first_name:'x'.repeat(81)}),message(/name between 1 and 80/));
 await assert.rejects(()=>save({onboarded:false}),message(/only be completed/));
 await assert.rejects(()=>save({time_zone:'Mars/Olympus'}),message(/timezone/));
 assert.equal((await readAccount(a.c)).profile.onboarded_at,null,'failed saves leave setup unfinished');
 // Finishing setup is one idempotent command: a retried command cannot apply twice or conflict.
 const command=crypto.randomUUID(),patch={first_name:'  Ana  ',time_zone:'Europe/London',onboarded:true};
 const revision=await save(patch,account.profile.revision,command);assert.equal(await save(patch,account.profile.revision,command),revision,'retry returns the same receipt');
 account=await readAccount(a.c);
 assert.equal(account.profile.first_name,'Ana');assert.equal(account.profile.time_zone,'Europe/London');assert.ok(account.profile.time_zone_confirmed_at);
 const finished=account.profile.onboarded_at;assert.ok(finished);assert.equal(needsOnboarding(account.profile),false);
 await save({onboarded:true});assert.equal((await readAccount(a.c)).profile.onboarded_at,finished,'completing again keeps the original time');
 await save({first_name:'Ana Maria'});account=await readAccount(a.c);assert.equal(account.profile.first_name,'Ana Maria');assert.equal(account.profile.onboarded_at,finished,'renaming later in Settings keeps setup finished');
 // A fresh session (another device) sees the same finished state.
 const link=must(await admin.auth.admin.generateLink({type:'magiclink',email:a.email})),other=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await other.auth.verifyOtp({type:'magiclink',token_hash:link.properties.hashed_token}));
 assert.equal(needsOnboarding((await readAccount(other)).profile),false,'onboarding state follows the account across devices');
 // Isolation: B's onboarding is independent, and B can neither read nor change A's profile.
 const bAccount=await readAccount(b.c);assert.equal(needsOnboarding(bAccount.profile),true);assert.equal(bAccount.profile.first_name,'');
 assert.deepEqual(must(await b.c.from('profiles').select('id').eq('id',a.id)),[],'B cannot read A’s profile');
 const direct=await b.c.from('profiles').update({first_name:'Intruder'}).eq('id',a.id).select('id');assert.ok(direct.error||!direct.data?.length,'B cannot update A’s profile');
 await writePreferences(b.c,bAccount.profile.revision,crypto.randomUUID(),{first_name:'Bea',onboarded:true});
 assert.equal((await readAccount(a.c)).profile.first_name,'Ana Maria','B finishing setup never touches A');
 assert.ok((await anon.rpc('save_account_preferences',{p_expected_revision:1,p_command_id:crypto.randomUUID(),p_patch:{onboarded:true}})).error,'anonymous saves are denied');
 {const r=await anon.from('profiles').select('id');assert.ok(r.error||!r.data.length,'anonymous visitors see no profiles');}
 console.log('PASS invited-account provisioning (private empty profile, no sample data), onboarding validation, idempotent finish, persistence across devices, later rename, and profile isolation between two users and anonymous visitors');
}finally{for(const id of users)must(await admin.auth.admin.deleteUser(id));console.log('Disposable onboarding accounts removed.');}
