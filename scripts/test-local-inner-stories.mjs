// Inner Compass Phase 2 (#211) against local Supabase: Chapters, Experiences, Collections, links, modules and Life
// Atlas associations. Experiences are one authoritative record: linking, unlinking, closing or deleting a Chapter or
// Collection never deletes them; deleting an Experience removes only its links; reflections keep name snapshots; one
// primary Chapter; owner-only everywhere.
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {createClient} from '@supabase/supabase-js';
import {load} from '../tests/helpers.mjs';

loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local only');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options);
const users=[],must=r=>{if(r.error)throw r.error;return r.data;};
const S=load('lib/inner-compass/stories-persistence'),M=load('lib/inner-compass/stories'),P=load('lib/inner-compass/persistence'),IM=load('lib/inner-compass/model');
async function invite(){const link=must(await admin.auth.admin.generateLink({type:'invite',email:`muse-stories-${crypto.randomUUID()}@example.test`}));users.push(link.user.id);const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token}));return {client,id:link.user.id};}
const tables=['inner_chapters','inner_experiences','inner_experience_collections','inner_collection_experiences','inner_chapter_experiences','inner_modules','inner_area_links'];

try{
 const a=await invite(),b=await invite();
 // A Chapter needs only a name; a word can be the name.
 let prosperity=await S.saveChapter(a.client,a.id,{...M.blankChapter(),title:'Prosperity',word:'Prosperity'});
 let becoming=await S.saveChapter(a.client,a.id,{...M.blankChapter(),title:'The Year of Becoming',startsOn:'2026-01-01',endsOn:'2026-12-31'});
 assert.equal(prosperity.revision,1);assert.equal(M.chapterStatus(prosperity,'2026-11-14'),'undated');assert.equal(M.chapterStatus(becoming,'2026-11-14'),'current');
 // Overlapping Chapters are fine; only one is primary.
 [becoming]=await S.setPrimary(a.client,a.id,becoming,[prosperity,becoming]);assert.ok(becoming.isPrimary);
 await assert.rejects(()=>S.saveChapter(a.client,a.id,{...prosperity,isPrimary:true}),/primary/);
 const moved=await S.setPrimary(a.client,a.id,prosperity,[prosperity,becoming]);
 assert.deepEqual(moved.map(c=>[c.title,c.isPrimary]),[['The Year of Becoming',false],['Prosperity',true]]);
 prosperity=moved[1];becoming=moved[0];
 await assert.rejects(()=>S.saveChapter(a.client,a.id,{...becoming,revision:1,title:'Stale'}),/another device/);

 // An Experience stands alone, then joins two Chapters and a Collection: one record, three references.
 const evening=await S.saveExperience(a.client,a.id,{...M.blankExperience(),title:'Prosperity Manifestation Evening',happenedOn:'2026-11-13',tags:['Prosperity','prosperity','Friends']});
 assert.deepEqual(evening.tags,['Prosperity','Friends'],'tags de-duplicate regardless of capitalisation');
 const coven=await S.saveCollection(a.client,a.id,{...M.blankCollection(),name:'Coven Chronicles'});
 await S.linkChapterExperience(a.client,a.id,prosperity.id,evening.id,0);await S.linkChapterExperience(a.client,a.id,becoming.id,evening.id,0);
 await S.linkCollectionExperience(a.client,a.id,coven.id,evening.id,0);await S.linkCollectionExperience(a.client,a.id,coven.id,evening.id,0);
 let world=await S.loadStories(a.client,a.id);
 assert.equal(world.experiences.length,1,'one record');assert.equal(world.chapterExperiences.length,2);assert.equal(world.collectionExperiences.length,1,'linking twice is one link');
 // Editing the Experience edits the one record every view reads.
 await S.saveExperience(a.client,a.id,{...evening,location:'Our kitchen'});
 world=await S.loadStories(a.client,a.id);assert.equal(world.experiences[0].location,'Our kitchen');

 // Modules: typed, ordered, owned by exactly one record.
 const words=await S.saveModule(a.client,a.id,{id:crypto.randomUUID(),owner:{kind:'chapter',id:prosperity.id},type:'words',position:0,title:'',collapsed:false,content:{items:[{id:'w1',word:'Prosperity',definition:'Abundance, defined by me',primary:true,bogus:'dropped'}]},revision:0,updatedAt:''});
 assert.deepEqual(words.content.items[0],{id:'w1',word:'Prosperity',definition:'Abundance, defined by me',primary:true});
 const mats=await S.saveModule(a.client,a.id,{id:crypto.randomUUID(),owner:{kind:'experience',id:evening.id},type:'materials',position:0,title:'',collapsed:false,content:{items:[{id:'m1',name:'Tiger’s eye',refKey:'tigers-eye',meaning:'Taking opportunities'},{id:'m2',name:'A key from my grandmother'}]},revision:0,updatedAt:''});
 assert.equal(mats.content.items[0].refKey,'tigers-eye');assert.equal(mats.content.items[1].refKey,undefined,'custom materials need no library match');
 assert.ok((await a.client.from('inner_modules').insert({type:'words',chapter_id:prosperity.id,experience_id:evening.id})).error,'a module has exactly one owner');
 assert.ok((await a.client.from('inner_modules').insert({type:'spells',chapter_id:prosperity.id})).error,'module types are checked');
 await assert.rejects(()=>S.saveModule(a.client,a.id,{...words,revision:words.revision+5}),/another device/);

 // Life Atlas associations: several, own areas only, descriptive (no rating is touched).
 const [growth,spirit]=must(await a.client.from('life_areas').insert([{label:'Personal Growth',position:7},{label:'Spirituality',position:9}]).select('id'));
 const theirs=must(await b.client.from('life_areas').insert({label:'Theirs',position:0}).select('id').single());
 await S.setAreaLinks(a.client,a.id,{experienceId:evening.id},[growth.id,spirit.id],[]);
 await S.setAreaLinks(a.client,a.id,{chapterId:prosperity.id},[spirit.id],[]);
 await assert.rejects(()=>S.setAreaLinks(a.client,a.id,{experienceId:evening.id},[theirs.id],[]),'cannot use someone else’s area');
 world=await S.loadStories(a.client,a.id);assert.equal(world.areas.length,3);
 assert.equal((await a.client.from('life_ratings').select('*',{count:'exact',head:true})).count,0,'no ratings are created');

 // Reflections over time on an Experience keep their words and the title snapshot.
 const r1=await P.saveReflection(a.client,a.id,{id:crypto.randomUUID(),discoveryId:null,discoveryTitle:null,responseId:null,experienceId:evening.id,experienceTitle:evening.title,body:'What prosperity meant that night.',feeling:null,writtenOn:'2026-11-13',revision:0});
 await P.saveReflection(a.client,a.id,{id:crypto.randomUUID(),discoveryId:null,discoveryTitle:null,responseId:null,experienceId:evening.id,experienceTitle:evening.title,body:'Three months later.',feeling:null,writtenOn:'2027-02-13',revision:0});
 // A discovery saved from an Experience keeps its origin.
 const disc=await P.saveDiscovery(a.client,a.id,{...IM.blankDiscovery('beliefs'),title:'Abundance is something I can notice.',source:{kind:'experience',id:evening.id,label:evening.title}});
 assert.equal(disc.source.kind,'experience');

 // Closing a Chapter or deleting it never touches its Experiences; removing from a Collection keeps the Experience.
 prosperity=await S.saveChapter(a.client,a.id,{...prosperity,closedAt:new Date().toISOString(),closing:{defined:'Saying yes'}});
 assert.equal(M.chapterStatus(prosperity,'2026-11-14'),'completed');
 await S.unlinkCollectionExperience(a.client,a.id,coven.id,evening.id);
 await S.deleteChapter(a.client,a.id,becoming);
 world=await S.loadStories(a.client,a.id);
 assert.equal(world.experiences.length,1,'the Experience survives');assert.equal(world.collections.length,1,'the Collection survives');
 assert.deepEqual(world.chapterExperiences.map(j=>j.a),[prosperity.id]);
 // Deleting the Experience removes its links and modules; reflections keep their words and the name snapshot.
 const latest=world.experiences[0];await S.deleteExperience(a.client,a.id,latest);
 world=await S.loadStories(a.client,a.id);
 assert.equal(world.chapterExperiences.length,0);assert.equal(world.modules.filter(m=>m.owner.kind==='experience').length,0);assert.equal(world.areas.filter(x=>x.experienceId).length,0);
 assert.equal(world.chapters.length,1,'the Chapter survives');
 const kept=must(await a.client.from('inner_reflections').select('experience_id,experience_title,body').eq('id',r1.id).single());
 assert.deepEqual(kept,{experience_id:null,experience_title:'Prosperity Manifestation Evening',body:'What prosperity meant that night.'});

 // Isolation and anonymous access.
 for(const t of tables){assert.equal(must(await b.client.from(t).select('*').eq('user_id',a.id)).length,0,`${t} hidden from others`);}
 assert.equal((await b.client.from('inner_chapters').update({title:'Mine'}).eq('id',prosperity.id).select('id')).data.length,0);
 assert.ok((await b.client.from('inner_chapter_experiences').insert({chapter_id:prosperity.id,experience_id:crypto.randomUUID()})).error,'cannot link into someone else’s Chapter');
 const anon=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
 for(const t of tables){const r=await anon.from(t).select('*').limit(1);assert.ok(r.error||r.data.length===0,`${t} closed to anon`);}
 assert.ok((await a.client.from('inner_chapters').insert({title:'Backwards',starts_on:'2026-05-01',ends_on:'2026-04-01'})).error,'an end before the start is refused');
 console.log('PASS Inner Compass stories: name-or-word Chapters, overlap + one primary, one Experience in many places, typed modules, Life Atlas links, dated reflections, discovery origin, safe close/unlink/delete, owner-only.');
}finally{for(const id of users)await admin.auth.admin.deleteUser(id);console.log('Disposable accounts removed.');}
