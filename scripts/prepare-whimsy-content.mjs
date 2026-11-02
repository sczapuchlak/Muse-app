// Offline review packaging only. No credentials, network, database writes, or publication.
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

export function prepareDraftBatches(root=resolve('content/whimsy')) {
 const read=file=>JSON.parse(readFileSync(resolve(root,file),'utf8'));
 const published=[...read('side-quests.json'),...read('fortunes.json')];
 const existing=new Set(published.map(x=>x.id));
 const drafts=readdirSync(resolve(root,'drafts')).filter(f=>f.endsWith('.json')).sort().flatMap(f=>read(`drafts/${f}`)).sort((a,b)=>a.id.localeCompare(b.id));
 const seen=new Set();
 for(const item of drafts){
  if(existing.has(item.id)||seen.has(item.id))throw Error(`Duplicate or existing content identity: ${item.id}`);
  seen.add(item.id);
  if(item.state!=='draft'||item.metadata?.editorial_status!=='draft'||item.version!==1)throw Error(`Expected unpublished version-one draft: ${item.id}`);
 }
 const batches=[];
 for(let start=0;start<drafts.length;start+=500){
  const batch=drafts.slice(start,start+500);
  if(Buffer.byteLength(JSON.stringify(batch))>8*1024*1024)throw Error('Content batch exceeds the existing RPC payload limit.');
  batches.push(batch);
 }
 return {purpose:'editorial-review-only',publicationAuthorized:false,notice:'Do not import drafts into the immutable catalog. After review, prepare separately approved published documents and update the runtime catalog to the same IDs/versions. Import through the existing service-role-only import_whimsy_content RPC; repeated identical versions are idempotent. No user data is included.',count:drafts.length,batches};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const outputIndex=process.argv.indexOf('--output');
 if(outputIndex<0||!process.argv[outputIndex+1])throw Error('Use --output <review-package.json>. This command never imports or publishes.');
 const validation=spawnSync(process.execPath,['scripts/validate-whimsy-content.mjs'],{encoding:'utf8'});
 if(validation.status!==0){process.stderr.write(validation.stderr);process.exitCode=1;}
 else{const packageData=prepareDraftBatches();writeFileSync(resolve(process.argv[outputIndex+1]),JSON.stringify(packageData,null,2)+'\n');console.log(`Prepared ${packageData.count} drafts in ${packageData.batches.length} bounded review batches. Nothing imported or published.`);}
}
