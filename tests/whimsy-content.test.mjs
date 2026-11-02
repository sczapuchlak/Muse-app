import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {prepareDraftBatches} from '../scripts/prepare-whimsy-content.mjs';

const read=file=>JSON.parse(readFileSync(`content/whimsy/${file}`,'utf8'));
const drafts=readdirSync('content/whimsy/drafts').filter(f=>f.endsWith('.json')).flatMap(f=>read(`drafts/${f}`));
test('completed fictional libraries meet exact counts and category balance',()=>{
 const progress=read('CONTENT_PROGRESS.json');
 for(const [kind,count] of Object.entries({sideQuests:500,cookies:365,oracle:365,prophecies:365}))assert.equal(progress.collections[kind].published+progress.collections[kind].draft,count);
 for(const category of Object.values(progress.questCategories))assert.equal(category.published+category.draft,100);
 assert.deepEqual(progress.oracleDistribution,{yes:90,no:90,maybe:90,not_yet:50,cryptic:45});
 const actual=[...read('side-quests.json'),...read('fortunes.json'),...drafts];
 assert.equal(progress.currentTotal,actual.length);
 assert.equal(new Set(actual.map(x=>x.id)).size,actual.length);
});
test('research shortfall is explicit and cannot pass the full-target release gate',()=>{
 const queue=read('CURIOSITIES_RESEARCH_QUEUE.json'),progress=read('CONTENT_PROGRESS.json');
 assert.equal(queue.unfilledSlots,250-queue.currentEntries);
 assert.equal(progress.remaining,queue.unfilledSlots);
 assert.ok(queue.leads.every(x=>x.verification_status==='research_needed'));
 const validation=spawnSync(process.execPath,['scripts/validate-whimsy-content.mjs'],{encoding:'utf8'});
 assert.equal(validation.status,0,validation.stderr);
 if(progress.remaining){const final=spawnSync(process.execPath,['scripts/validate-whimsy-content.mjs','--final'],{encoding:'utf8'});assert.equal(final.status,1);assert.match(final.stderr,/Full target not reached/);}
});
test('researched curiosity drafts have traceable evidence and original explanation fields',()=>{
 const curiosities=drafts.filter(x=>x.metadata.kind==='curiosity');
 assert.equal(curiosities.length,read('CONTENT_PROGRESS.json').newlyFactCheckedCuriosities);
 for(const entry of curiosities){assert.equal(entry.state,'draft');assert.equal(entry.metadata.verification_status,'fact_checked');assert.ok(entry.metadata.tell_more.trim().split(/\s+/).length>=75);for(const source of entry.sources){assert.equal(new URL(source.url).protocol,'https:');assert.ok(source.title&&source.publisher&&source.verifiedAt&&source.license);}}
});
test('review packaging is deterministic, bounded, and excludes published IDs',()=>{
 const a=prepareDraftBatches(),b=prepareDraftBatches();assert.deepEqual(a,b);
 assert.equal(a.publicationAuthorized,false);assert.equal(a.count,drafts.length);
 const publishedIds=new Set([...read('side-quests.json'),...read('fortunes.json')].map(x=>x.id));
 for(const batch of a.batches){assert.ok(batch.length<=1000);assert.ok(Buffer.byteLength(JSON.stringify(batch))<=8388608);for(const entry of batch){assert.equal(entry.state,'draft');assert.ok(!publishedIds.has(entry.id));}}
});
test('packager refuses publication states and duplicate identities',()=>{
 const root=mkdtempSync(join(tmpdir(),'muse-content-'));
 try{mkdirSync(join(root,'drafts'));for(const file of ['side-quests.json','fortunes.json'])writeFileSync(join(root,file),'[]');
  const entry=drafts[0];const save=items=>writeFileSync(join(root,'drafts','test.json'),JSON.stringify(items));
  save([{...entry,state:'published'}]);assert.throws(()=>prepareDraftBatches(root),/unpublished/);
  save([entry,entry]);assert.throws(()=>prepareDraftBatches(root),/Duplicate/);
  save([entry]);writeFileSync(join(root,'side-quests.json'),JSON.stringify([entry]));assert.throws(()=>prepareDraftBatches(root),/existing/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
