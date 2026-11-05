// Milestone celebration state against LOCAL Supabase only (disposable users removed afterwards): stored on the
// account's Bookshelf preference through the real save function, read back on a second signed-in device, and kept
// when the Daily Edit widget toggle or featured-book writers save the same preference.
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {createClient} from '@supabase/supabase-js';
import {load} from '../tests/helpers.mjs';
loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local Supabase only');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options);
const {readWhimsy,saveWhimsyRecord,bookshelfWidgetExtras}=load('lib/whimsy/persistence');
const {setWhimsyWidget}=load('lib/whimsy/connected');
const {milestoneCelebration}=load('lib/whimsy/reading-dna');
const uuid=()=>crypto.randomUUID(),users=[],must=r=>{if(r.error)throw r.error;return r.data;};
const signIn=async(email,type)=>{const link=must(await admin.auth.admin.generateLink({type,email}));const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:type==='invite'?'invite':'magiclink',token_hash:link.properties.hashed_token}));return {client,userId:link.user.id};};
try{
 const email=`milestones-${uuid()}@example.test`,phone=await signIn(email,'invite');users.push(phone.userId);const laptop=await signIn(email,'magiclink');
 // First visit on the phone: no state yet, so everything already reached is a silent baseline.
 const first=milestoneCelebration(['books-1','pages-100'],undefined);assert.deepEqual(first.celebrate,[]);
 await saveWhimsyRecord(phone.client,'widgets',{record:{id:uuid(),experience:'bookshelf',enabled:false,readingMilestones:{seen:first.nextSeen,since:'2026-11-05T00:00:00.000Z'}},expectedRevision:0,commandId:uuid()});
 // The laptop sees the same state: a newly reached milestone celebrates there once, then is recorded.
 let seen=(await readWhimsy(laptop.client)).widgets.find(w=>w.experience==='bookshelf');
 const next=milestoneCelebration(['books-1','pages-100','pages-1000'],seen.readingMilestones);assert.deepEqual(next.celebrate,['pages-1000']);
 await saveWhimsyRecord(laptop.client,'widgets',{record:{id:seen.id,experience:'bookshelf',enabled:seen.enabled,...bookshelfWidgetExtras(seen),readingMilestones:{seen:next.nextSeen,since:seen.readingMilestones.since}},expectedRevision:seen.revision,commandId:uuid()});
 seen=(await readWhimsy(phone.client)).widgets.find(w=>w.experience==='bookshelf');
 assert.deepEqual(milestoneCelebration(['books-1','pages-100','pages-1000'],seen.readingMilestones).celebrate,[],'the phone does not celebrate it again');
 // Turning the Daily Edit widget on, then choosing a featured book, keeps the milestone state.
 await setWhimsyWidget(phone.client,'bookshelf',true,uuid(),seen.id);
 seen=(await readWhimsy(laptop.client)).widgets.find(w=>w.experience==='bookshelf');
 assert.equal(seen.enabled,true);assert.deepEqual(seen.readingMilestones.seen,['books-1','pages-100','pages-1000']);
 await saveWhimsyRecord(laptop.client,'widgets',{record:{id:seen.id,experience:'bookshelf',enabled:true,...bookshelfWidgetExtras(seen),featuredBookId:uuid()},expectedRevision:seen.revision,commandId:uuid()});
 seen=(await readWhimsy(phone.client)).widgets.find(w=>w.experience==='bookshelf');
 assert.ok(seen.featuredBookId);assert.deepEqual(seen.readingMilestones.seen,['books-1','pages-100','pages-1000'],'featured-book saves keep it too');
 assert.equal((await readWhimsy(phone.client)).widgets.filter(w=>w.experience==='bookshelf').length,1,'still one Bookshelf preference');
 console.log('PASS local reading milestones: silent baseline, celebrated once across two devices, kept by widget toggle and featured-book writes');
}finally{for(const userId of users)must(await admin.auth.admin.deleteUser(userId));console.log('Disposable milestone users removed.');}
