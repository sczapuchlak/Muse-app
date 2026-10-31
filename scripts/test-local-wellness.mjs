import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {loadEnvFile} from 'node:process';
import {load} from '../tests/helpers.mjs';
loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local only');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options),anon=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options),users=[],must=r=>{if(r.error)throw r.error;return r.data;};
const {readWellness,writeWellness}=load('lib/data/wellness'),{wellnessReducer}=load('lib/wellness');
async function invite(){const x=must(await admin.auth.admin.generateLink({type:'invite',email:`wellness-${crypto.randomUUID()}@example.test`}));users.push(x.user.id);const c=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);const session=must(await c.auth.verifyOtp({type:'invite',token_hash:x.properties.hashed_token})).session;return {c,session,id:x.user.id};}
try{
 const a=await invite(),b=await invite();let snap=await readWellness(a.c);assert.equal(snap.revision,0);assert.equal(snap.state.assignments.length,0);assert.equal(snap.state.water.length,0);assert.equal(snap.state.movement.length,0);
 {const profile=must(await a.c.from('profiles').select('revision').single());must(await a.c.rpc('save_account_preferences',{p_expected_revision:profile.revision,p_command_id:crypto.randomUUID(),p_patch:{time_zone:'America/Los_Angeles'}}));}
 const save=async(state,id=crypto.randomUUID())=>{const revision=await writeWellness(a.c,snap.revision,id,state);snap=await readWellness(a.c);assert.equal(snap.revision,revision);return revision;};
 const meal=crypto.randomUUID(),template=crypto.randomUUID(),date='2026-03-08';
 let state=wellnessReducer(snap.state,{kind:'meal',action:{type:'saved/save',meal:{id:template,name:'Eggs',mealTypes:['breakfast','lunch'],note:'Soft',link:'https://example.test',nutrition:{calories:0,protein:12.5},createdAt:'ignored'}}});
 state=wellnessReducer(state,{kind:'meal',action:{type:'assignment/save',assignment:{id:meal,date,slot:'breakfast',title:'Eggs',savedMealId:template,note:'Occurrence',nutrition:{calories:0,protein:12.5},order:0,recipeId:null}}});
 const id=crypto.randomUUID(),before=snap.revision,revision=await save(state,id);assert.equal(await writeWellness(a.c,before,id,state),revision);assert.equal(snap.state.assignments.length,1);assert.equal(snap.state.assignments[0].date,date);assert.equal(snap.state.assignments[0].timeZone,'America/Los_Angeles');assert.equal(snap.state.assignments[0].nutrition.calories,0);
 await save(wellnessReducer(snap.state,{kind:'meal',action:{type:'saved/save',meal:{...snap.state.savedMeals[0],name:'Changed template',nutrition:{protein:100}}}}));assert.equal(snap.state.assignments[0].title,'Eggs');assert.equal(snap.state.assignments[0].nutrition.protein,12.5);
 await save(wellnessReducer(snap.state,{kind:'meal',action:{type:'assignment/copy',id:meal,targets:[{id:crypto.randomUUID(),date:'2026-03-09',slot:'dinner'}],now:'ignored'}}));
 await save(wellnessReducer(snap.state,{kind:'meal',action:{type:'assignment/move',id:meal,date:'2026-03-07',slot:'lunch'}}));
 await save(wellnessReducer(snap.state,{kind:'meal',action:{type:'saved/remove',id:template}}));assert.equal(snap.state.assignments.length,2);assert.ok(snap.state.assignments.every(m=>!m.savedMealId));
 console.log('PASS empty account; stable meal capture/retry, move/copy, template snapshot immutability, library deletion detaches safely');
 const settings={goal:100,unit:'oz',quickAdds:[12,24]};
 await save(wellnessReducer(snap.state,{kind:'water/settings',settings}));assert.equal(snap.state.water.length,0);
 state=wellnessReducer(snap.state,{kind:'water',date,mode:'add',amount:12,settings});state=wellnessReducer(state,{kind:'water',date,mode:'add',amount:24,settings});
 const waterId=crypto.randomUUID(),waterVersion=snap.revision;await save(state,waterId);assert.equal(await writeWellness(a.c,waterVersion,waterId,state),snap.revision);assert.equal(snap.state.water[0].total,36);
 await save(wellnessReducer(snap.state,{kind:'water/settings',settings:{...settings,goal:120}}));assert.equal(snap.state.water[0].goal,100);
 await save(wellnessReducer(snap.state,{kind:'water',date:'2026-03-09',mode:'set',amount:0,settings:{...settings,goal:120}}));assert.equal(snap.state.water.find(w=>w.date==='2026-03-09').total,0);
 await save(wellnessReducer(snap.state,{kind:'water',date,mode:'set',amount:18,settings}));assert.equal(snap.state.water.find(w=>w.date===date).total,18);
 let invalid=structuredClone(snap.state);invalid.water[0].unit='mL';await assert.rejects(()=>writeWellness(a.c,snap.revision,crypto.randomUUID(),invalid),e=>e.code==='22023');
 console.log('PASS hydration accurate increments, idempotent receipt, known zero vs absent, historical goal snapshots, no unit relabeling');
 const types=[{id:'movement-walk',name:'Walk',source:'starter',archived:false},{id:crypto.randomUUID(),name:'Rowing',source:'custom',archived:false}];
 await save(wellnessReducer(snap.state,{kind:'movement',day:{date,typeIds:[types[1].id]},types,quickIds:[types[0].id],recentIds:[types[1].id]}));assert.equal(snap.state.activities.length,0);
 const activity=crypto.randomUUID();await save(wellnessReducer(snap.state,{kind:'activity/save',record:{id:activity,date,typeId:types[1].id}}));assert.equal(snap.state.activities.length,1);
 await save(wellnessReducer(snap.state,{kind:'activity/save',record:{...snap.state.activities[0],date:'2026-03-09',typeId:types[0].id}}));assert.equal(snap.state.activities.length,1);
 await save(wellnessReducer(snap.state,{kind:'movement',day:{date,typeIds:[]},types:types.map(t=>t.id===types[1].id?{...t,name:'Row',archived:true}:t),quickIds:[types[0].id],recentIds:[]}));assert.equal(snap.state.movement[0].typeIds.length,0);assert.equal(snap.state.activities.length,1);
 await save(wellnessReducer(snap.state,{kind:'activity/remove',id:activity}));assert.equal(snap.state.activities.length,0);
 console.log('PASS intention never records activity, activity create/edit/remove, archived stable types, explicit empty intention');
 // Travel changes capture timezone prospectively, never rewrites existing dates/zones.
 {const profile=must(await a.c.from('profiles').select('revision').single());must(await a.c.rpc('save_account_preferences',{p_expected_revision:profile.revision,p_command_id:crypto.randomUUID(),p_patch:{time_zone:'Pacific/Auckland'}}));}
 await save(wellnessReducer(snap.state,{kind:'water',date,mode:'add',amount:1,settings}));assert.equal(snap.state.water.find(w=>w.date===date).timeZone,'America/Los_Angeles');
 await save(wellnessReducer(snap.state,{kind:'water',date:'2026-11-01',mode:'add',amount:1,settings}));assert.equal(snap.state.water.find(w=>w.date==='2026-11-01').timeZone,'Pacific/Auckland');
 const outcomes=await Promise.allSettled([writeWellness(a.c,snap.revision,crypto.randomUUID(),wellnessReducer(snap.state,{kind:'water',date,mode:'add',amount:1,settings})),writeWellness(a.c,snap.revision,crypto.randomUUID(),wellnessReducer(snap.state,{kind:'water',date,mode:'add',amount:2,settings}))]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(outcomes.filter(x=>x.status==='rejected'&&x.reason.code==='40001').length,1);snap=await readWellness(a.c);
 assert.equal((await readWellness(b.c)).state.assignments.length,0);assert.equal(must(await b.c.from('meal_assignments').select('*')).length,0);
 await assert.rejects(()=>writeWellness(b.c,0,crypto.randomUUID(),snap.state),e=>e.code==='42501');assert.ok((await anon.rpc('read_wellness')).error);assert.ok((await a.c.from('hydration_days').insert({user_id:a.id,local_date:date,quantity:99,goal:100,unit:'oz',captured_time_zone:'UTC'})).error);
 invalid=structuredClone(snap.state);invalid.assignments[0].nutrition={protein:-1};await assert.rejects(()=>writeWellness(a.c,snap.revision,crypto.randomUUID(),invalid));assert.equal((await readWellness(a.c)).revision,snap.revision);
 const exported=must(await a.c.rpc('export_personal_data'));assert.equal(exported.wellness.water.length,snap.state.water.length);assert.equal(exported.wellness.activities.length,snap.state.activities.length);assert.equal(must(await b.c.rpc('export_personal_data')).wellness.water.length,0);
 const malformed=structuredClone(snap.state);malformed.water[0].date='today';await assert.rejects(()=>writeWellness(a.c,snap.revision,crypto.randomUUID(),malformed),e=>e.code==='22023');
 const fresh=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await fresh.auth.setSession(a.session));assert.deepEqual(await readWellness(fresh),snap);
 await save(wellnessReducer(snap.state,{kind:'water/remove',date}));assert.ok(!snap.state.water.some(w=>w.date===date));for(const m of snap.state.assignments)await save(wellnessReducer(snap.state,{kind:'meal',action:{type:'assignment/remove',id:m.id}}));assert.equal(snap.state.assignments.length,0);
 await save(wellnessReducer(snap.state,{kind:'movement',day:{date,typeIds:[types[0].id]},types:snap.state.types,quickIds:[types[0].id],recentIds:[]}));
 await save(wellnessReducer(snap.state,{kind:'activity/save',record:{id:crypto.randomUUID(),date,typeId:types[0].id}}));
 // MVP: explicit completion never changes intention or another date.
 const completedDate='2026-11-02';
 await save(wellnessReducer(snap.state,{kind:'movement',day:{date:completedDate,typeIds:[types[0].id]},types:snap.state.types,quickIds:[types[0].id],recentIds:[]}));
 assert.equal(snap.state.activities.filter(r=>r.date===completedDate).length,0);
 let done=wellnessReducer(snap.state,{kind:'movement/complete',date:completedDate,typeId:types[0].id,complete:true,id:crypto.randomUUID()});
 done=wellnessReducer(done,{kind:'movement/complete',date:completedDate,typeId:types[0].id,complete:true,id:crypto.randomUUID()});
 const completionReceipt=crypto.randomUUID(),completionRevision=snap.revision;await save(done,completionReceipt);
 assert.equal(await writeWellness(a.c,completionRevision,completionReceipt,done),snap.revision);
 assert.equal(snap.state.activities.filter(r=>r.date===completedDate).length,1);
 const duplicated=structuredClone(snap.state);duplicated.activities.push({...duplicated.activities.find(r=>r.date===completedDate),id:crypto.randomUUID()});
 await assert.rejects(()=>writeWellness(a.c,snap.revision,crypto.randomUUID(),duplicated),e=>e.code==='23505');
 await save(wellnessReducer(snap.state,{kind:'movement/complete',date:completedDate,typeId:types[0].id,complete:false,id:crypto.randomUUID()}));
 assert.equal(snap.state.activities.filter(r=>r.date===completedDate).length,0);assert.deepEqual(snap.state.movement.find(r=>r.date===completedDate).typeIds,[types[0].id]);
 const groceryId=crypto.randomUUID(),otherId=crypto.randomUUID(),createdAt=new Date().toISOString(),grocery={id:groceryId,name:'Milk',quantity:'2 cartons',note:'Oat',sectionId:'dairy',complete:false,createdAt};
 let groceries=wellnessReducer(snap.state,{kind:'meal',action:{type:'grocery/save',item:grocery}}),groceryReceipt=crypto.randomUUID(),groceryRevision=snap.revision;await save(groceries,groceryReceipt);
 assert.equal(await writeWellness(a.c,groceryRevision,groceryReceipt,groceries),snap.revision);assert.equal(snap.state.groceryItems.length,1);
 await save(wellnessReducer(snap.state,{kind:'meal',action:{type:'grocery/save',item:{...grocery,name:'Oat milk',quantity:'1 L',note:'Unsweetened',sectionId:'drinks',complete:true}}}));
 await save(wellnessReducer(snap.state,{kind:'meal',action:{type:'grocery/save',item:{id:otherId,name:'Apples',sectionId:'produce',complete:false,createdAt}}}));
 const restored=snap.state.groceryItems.find(i=>i.id===groceryId);assert.equal(restored.quantity,'1 L');assert.equal(restored.note,'Unsweetened');assert.equal(restored.sectionId,'drinks');assert.equal(restored.complete,true);
 // Retrying an old acknowledged snapshot after later commands must not replay it.
 await writeWellness(a.c,groceryRevision,groceryReceipt,groceries);assert.deepEqual((await readWellness(a.c)).state.groceryItems,snap.state.groceryItems);
 await save(wellnessReducer(snap.state,{kind:'meal',action:{type:'grocery/remove',id:groceryId}}));assert.equal(snap.state.groceryItems.length,1);
 await save(wellnessReducer(snap.state,{kind:'meal',action:{type:'grocery/restore',items:[restored]}}));assert.deepEqual(snap.state.groceryItems.find(i=>i.id===groceryId),restored);
 await save(wellnessReducer(snap.state,{kind:'meal',action:{type:'grocery/clear-completed'}}));assert.deepEqual(snap.state.groceryItems.map(i=>i.id),[otherId]);
 await save(wellnessReducer(snap.state,{kind:'meal',action:{type:'grocery/restore',items:[restored]}}));
 const groceryConflict=await Promise.allSettled([writeWellness(a.c,snap.revision,crypto.randomUUID(),wellnessReducer(snap.state,{kind:'meal',action:{type:'grocery/complete',id:groceryId,complete:false}})),writeWellness(a.c,snap.revision,crypto.randomUUID(),wellnessReducer(snap.state,{kind:'meal',action:{type:'grocery/save',item:{...restored,note:'Other window'}}}))]);assert.equal(groceryConflict.filter(x=>x.status==='fulfilled').length,1);assert.equal(groceryConflict.filter(x=>x.status==='rejected'&&x.reason.code==='40001').length,1);snap=await readWellness(a.c);
 assert.equal((await readWellness(b.c)).state.groceryItems.length,0);assert.equal(must(await b.c.from('grocery_items').select('*')).length,0);
 const otherOwner=await readWellness(b.c);await assert.rejects(()=>writeWellness(b.c,0,crypto.randomUUID(),{...otherOwner.state,groceryItems:snap.state.groceryItems}),e=>e.code==='42501');
 assert.ok((await a.c.from('grocery_items').update({complete:false}).eq('id',groceryId)).error);
 assert.ok((await anon.rpc('save_wellness',{p_expected_revision:0,p_command_id:crypto.randomUUID(),p_state:snap.state})).error);
 const invalidSection=structuredClone(snap.state);invalidSection.groceryItems[0].sectionId='unknown-owner-section';await assert.rejects(()=>writeWellness(a.c,snap.revision,crypto.randomUUID(),invalidSection),e=>e.code==='23503');assert.equal((await readWellness(a.c)).revision,snap.revision);
 assert.deepEqual(must(await a.c.rpc('export_personal_data')).wellness.groceryItems,snap.state.groceryItems);
 const restarted=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await restarted.auth.setSession(a.session));assert.deepEqual(await readWellness(restarted),snap);
 for(const item of snap.state.groceryItems)await save(wellnessReducer(snap.state,{kind:'meal',action:{type:'grocery/remove',id:item.id}}));assert.equal(snap.state.groceryItems.length,0);assert.ok(snap.state.grocerySections.length>0);
 console.log('PASS MVP explicit completion/undo, repeated-click/receipt uniqueness, historical intentions preserved; grocery CRUD/check/clear/Undo, metadata/order, old receipts, real conflicts, RLS, rollback, export and fresh-client persistence');
 console.log('PASS travel/DST original calendar dates, real conflicting writes, owner/anon/direct-write denial, invalid write rollback, fresh authenticated client persistence and explicit deletion');
}finally{for(const id of users)must(await admin.auth.admin.deleteUser(id));console.log('Disposable Wellness accounts removed.');}
