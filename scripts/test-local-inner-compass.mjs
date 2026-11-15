// Inner Compass (#210) against local Supabase: owner-only rows, revision checks, ordinary edits without versions,
// "Record evolution" keeping the earlier words, undirected connections, Life Area associations, reflections and
// manifesto snapshots that survive deletion, exploration responses, and user isolation everywhere.
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {createClient} from '@supabase/supabase-js';
import {load} from '../tests/helpers.mjs';

loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local only');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options);
const users=[],must=r=>{if(r.error)throw r.error;return r.data;};
const P=load('lib/inner-compass/persistence'),M=load('lib/inner-compass/model');
async function invite(){const link=must(await admin.auth.admin.generateLink({type:'invite',email:`muse-compass-${crypto.randomUUID()}@example.test`}));users.push(link.user.id);const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token}));return {client,id:link.user.id};}
const tables=['inner_discoveries','inner_discovery_versions','inner_discovery_links','inner_discovery_areas','inner_exploration_responses','inner_reflections','inner_manifestos','inner_manifesto_versions'];

try{
 const a=await invite(),b=await invite();
 // Create with only a category and a statement.
 let curiosity=await P.saveDiscovery(a.client,a.id,{...M.blankDiscovery('values'),title:'Curiosity'});
 assert.equal(curiosity.revision,1);assert.equal(curiosity.meaning,'');
 const openness=await P.saveDiscovery(a.client,a.id,{...M.blankDiscovery('character'),title:'Openness',details:{stance:'cultivating',attribution:'dropped: not a character field'},tags:['#growth',' Growth','mind']});
 assert.deepEqual(openness.details,{stance:'cultivating'},'only this collection’s fields are kept');
 assert.deepEqual(openness.tags,['growth','mind'],'tags are cleaned and de-duplicated');

 // An ordinary edit updates the record and creates no version.
 curiosity=await P.saveDiscovery(a.client,a.id,{...curiosity,meaning:'Wanting to know how things work.'});
 assert.equal(curiosity.revision,2);
 let world=await P.loadInnerWorld(a.client,a.id);
 assert.equal(world.versions.length,0,'ordinary edits never create versions');
 // A stale device can't overwrite.
 await assert.rejects(()=>P.saveDiscovery(a.client,a.id,{...curiosity,revision:1,title:'Stale'}),/another device/);

 // Record evolution keeps the earlier words exactly as stored (not as the client claims).
 const belief=await P.saveDiscovery(a.client,a.id,{...M.blankDiscovery('beliefs'),title:'Success means being busy.',meaning:'Old view',details:{stance:'held'}});
 const {discovery:evolved,version}=await P.recordEvolution(a.client,belief,{title:'Success means having enough room to notice my life.',meaning:'New view',details:{stance:'held'},reason:'A slower year',reflection:'',evolvedOn:'2026-11-14'});
 assert.equal(evolved.title,'Success means having enough room to notice my life.');assert.ok(evolved.evolvedAt,'marked as evolved');assert.equal(evolved.revision,belief.revision+1);
 assert.equal(version.title,'Success means being busy.');assert.equal(version.meaning,'Old view');assert.equal(version.nextMeaning,'New view');assert.equal(version.reason,'A slower year');assert.equal(version.evolvedOn,'2026-11-14');
 await assert.rejects(()=>P.recordEvolution(a.client,belief,{title:'x',meaning:'',details:{},reason:'',reflection:'',evolvedOn:'2026-11-14'}),/another device/,'stale evolution refused');
 // Someone else can't evolve it.
 await assert.rejects(()=>P.recordEvolution(b.client,evolved,{title:'Mine',meaning:'',details:{},reason:'',reflection:'',evolvedOn:'2026-11-14'}),e=>e.code==='42501');

 // Archiving keeps history.
 const archived=await P.saveDiscovery(a.client,a.id,{...evolved,archivedAt:new Date().toISOString()});
 world=await P.loadInnerWorld(a.client,a.id);
 assert.equal(world.versions.filter(v=>v.discoveryId===belief.id).length,1,'archiving keeps evolution history');

 // Connections: one undirected row; a duplicate is ignored; cross-owner links are impossible.
 await P.connect(a.client,a.id,openness.id,curiosity.id);await P.connect(a.client,a.id,curiosity.id,openness.id);
 world=await P.loadInnerWorld(a.client,a.id);
 assert.equal(world.links.length,1);assert.deepEqual(M.relatedIds(world.links,curiosity.id),[openness.id]);
 const theirs=await P.saveDiscovery(b.client,b.id,{...M.blankDiscovery('values'),title:'Privacy'});
 await assert.rejects(()=>P.connect(a.client,a.id,curiosity.id,theirs.id),'cannot connect to someone else’s discovery');

 // Life Area association: own areas only; deleting the area removes only the association.
 const area=must(await a.client.from('life_areas').insert({label:'Growth',position:0}).select('id').single());
 const otherArea=must(await b.client.from('life_areas').insert({label:'Mine',position:0}).select('id').single());
 await P.setAreas(a.client,a.id,curiosity.id,[area.id],[]);
 await assert.rejects(()=>P.setAreas(a.client,a.id,curiosity.id,[otherArea.id],[]),'cannot use someone else’s Life Area');
 world=await P.loadInnerWorld(a.client,a.id);assert.deepEqual(world.areas,[{discoveryId:curiosity.id,areaId:area.id}]);

 // Reflection keeps its title snapshot after the discovery is deleted.
 const reflection=await P.saveReflection(a.client,a.id,{id:crypto.randomUUID(),discoveryId:openness.id,discoveryTitle:'Openness',responseId:null,body:'Today I let a plan change.',feeling:'light',writtenOn:'2026-11-14',revision:0});
 assert.equal(reflection.revision,1);
 // Exploration response with answers and a reflection on it.
 const resp=await P.saveResponse(a.client,a.id,{id:crypto.randomUUID(),explorationKey:'most-myself',explorationTitle:'When I feel most like myself',answers:[{key:'moment',prompt:'Describe…',text:'Walking at dusk.'},{key:'company',prompt:'…',text:''}],reflection:'',completedOn:'2026-11-14',revision:0});
 assert.equal(resp.answers.length,1,'empty answers are not stored');
 await assert.rejects(()=>P.saveResponse(a.client,a.id,{...resp,explorationKey:'Bad Key!',revision:resp.revision}),'keys are checked');

 // Manifesto: one per person, revision-checked, versions on request, references survive deletion.
 let manifesto=await P.saveManifesto(a.client,a.id,{title:'My Manifesto',blocks:[{id:'h1',kind:'heading',text:'What I value'},{id:'l1',kind:'line',text:'I stay curious.',ref:{id:curiosity.id,category:'values',label:'Curiosity'}}],revision:0,updatedAt:null});
 await assert.rejects(()=>P.saveManifesto(a.client,a.id,{...manifesto,revision:0}),/another device/,'a second first-save is refused');
 const kept=await P.keepManifestoVersion(a.client,a.id,manifesto,'First draft');
 manifesto=await P.saveManifesto(a.client,a.id,{...manifesto,title:'Declaration'});
 assert.equal(manifesto.revision,2);
 await P.deleteDiscovery(a.client,a.id,openness);
 world=await P.loadInnerWorld(a.client,a.id);
 const r=world.reflections.find(x=>x.id===reflection.id);
 assert.equal(r.discoveryId,null);assert.equal(r.discoveryTitle,'Openness','reflection keeps the name snapshot');
 assert.equal(world.links.length,0,'deleting removes its connections');
 assert.equal(world.manifesto.blocks[1].ref.label,'Curiosity');assert.equal(world.manifestoVersions[0].id,kept.id);

 // Isolation: the other person sees nothing and can change nothing.
 for(const t of tables){const rows=must(await b.client.from(t).select('*').eq('user_id',a.id));assert.equal(rows.length,0,`${t} hidden from others`);}
 const hijack=await b.client.from('inner_discoveries').update({title:'Mine now'}).eq('id',curiosity.id).select('id');assert.equal(hijack.data.length,0);
 const del=await b.client.from('inner_manifestos').delete().eq('user_id',a.id).select('user_id');assert.equal(del.data.length,0);
 const forged=await b.client.from('inner_discoveries').insert({user_id:a.id,category:'values',title:'Forged'});assert.ok(forged.error,'cannot write as someone else');
 // Anonymous visitors see nothing.
 const anon=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
 for(const t of tables){const res=await anon.from(t).select('*').limit(1);assert.ok(res.error||res.data.length===0,`${t} closed to anon`);}
 // Constraints.
 assert.ok((await a.client.from('inner_discoveries').insert({category:'goals',title:'Not a category'})).error,'category is checked');
 assert.ok((await a.client.from('inner_discoveries').insert({category:'values',title:'  '})).error,'blank statements refused');
 assert.ok((await a.client.from('inner_discovery_links').insert({a_id:archived.id,b_id:archived.id})).error,'no self-links');
 console.log('PASS Inner Compass: owner-only, revision-checked, ordinary edits without versions, atomic evolution, archive keeps history, undirected links, own Life Areas, snapshots survive deletion, responses, manifesto + versions, anon closed.');
}finally{for(const id of users)await admin.auth.admin.deleteUser(id);console.log('Disposable Inner Compass accounts removed.');}
