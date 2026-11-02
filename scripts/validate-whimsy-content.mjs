import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve('content/whimsy'),read=path=>JSON.parse(readFileSync(resolve(root,path),'utf8'));
const draftFiles=readdirSync(resolve(root,'drafts')).filter(name=>name.endsWith('.json')).sort(),draftEntries=draftFiles.flatMap(name=>read(`drafts/${name}`));
const publishedQuests=read('side-quests.json'),publishedFortunes=read('fortunes.json'),draftQuests=draftEntries.filter(x=>x.experience==='side-quests'),draftFortunes=draftEntries.filter(x=>x.experience==='fortunes');
const all=[...publishedQuests,...publishedFortunes,...draftQuests,...draftFortunes],errors=[],review=[];
const baseline=read('PUBLISHED_BASELINE.json');
for(const [file,expected] of Object.entries(baseline))if(createHash('sha256').update(readFileSync(resolve(root,file))).digest('hex')!==expected.sha256)errors.push(`Published baseline changed without editorial version review: ${file}`);
const words=value=>value.trim().split(/\s+/).length;
const curiosityCategories=['History Was Unhinged','Nature Is Showing Off',"That's Incredible","That Can't Be Real",'I Need to Tell Someone This'];
const lengthReview=[],relatedCuriosities=[],wordingReview=[];
const index=[];const slotCounters={};for(const item of all){const prefix=item.experience==='side-quests'?({'Cozy':'SQ-COZ','Adventurous':'SQ-ADV','Creative':'SQ-CRE','Social':'SQ-SOC','Chaos Goblin':'SQ-CHA'}[item.category]):({cookie:'FC',oracle:'OR',prophecy:'TP',curiosity:'CUR'}[item.metadata.kind]);slotCounters[prefix]=(slotCounters[prefix]??0)+1;const collectionId=/^(SQ-(COZ|ADV|CRE|SOC|CHA)|FC|OR|TP|CUR)-\d{3}$/.test(item.id)?item.id:`${prefix}-${String(slotCounters[prefix]).padStart(3,'0')}`;index.push({collectionId,contentId:item.id,version:item.version,state:item.state});}
if(new Set(index.map(x=>x.collectionId)).size!==index.length)errors.push('Duplicate editorial collection ID');
if(existsSync(resolve(root,'GRAND_COLLECTION_INDEX.json')))for(const prior of read('GRAND_COLLECTION_INDEX.json')){const current=index.find(x=>x.contentId===prior.contentId&&x.version===prior.version);if(!current||current.collectionId!==prior.collectionId)errors.push(`Editorial alias changed: ${prior.contentId}`);}
const counts={sideQuests:{target:500,published:publishedQuests.length,draft:draftQuests.length},cookies:{target:365,published:publishedFortunes.filter(x=>x.metadata.kind==='cookie').length,draft:draftFortunes.filter(x=>x.metadata.kind==='cookie').length},oracle:{target:365,published:publishedFortunes.filter(x=>x.metadata.kind==='oracle').length,draft:draftFortunes.filter(x=>x.metadata.kind==='oracle').length},prophecies:{target:365,published:publishedFortunes.filter(x=>x.metadata.kind==='prophecy').length,draft:draftFortunes.filter(x=>x.metadata.kind==='prophecy').length},curiosities:{target:250,published:publishedFortunes.filter(x=>x.metadata.kind==='curiosity').length,draft:draftFortunes.filter(x=>x.metadata.kind==='curiosity').length}};
const categoryCounts=Object.fromEntries(['Cozy','Adventurous','Creative','Social','Chaos Goblin'].map(c=>[c,{published:publishedQuests.filter(x=>x.category===c).length,draft:draftQuests.filter(x=>x.category===c).length,target:100}]));
const seenIds=new Set(),seenBodies=new Map(),seenQuestTitles=new Map();
const norm=s=>s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
for(const item of all){if(!item.id||!item.title?.trim()||!item.body?.trim()||!Array.isArray(item.tags)||!item.tags.length||!Number.isInteger(item.version)||item.version<1||!['draft','reviewed','verified','published'].includes(item.state))errors.push(`Invalid common fields: ${item.id}`);if(/\b(?:TODO|TBD|lorem ipsum)\b/i.test(item.title+' '+item.body))errors.push(`Placeholder text: ${item.id}`);if(seenIds.has(item.id))errors.push(`Duplicate ID: ${item.id}`);seenIds.add(item.id);const body=norm(item.body);if(seenBodies.has(body))errors.push(`Duplicate wording: ${item.id} and ${seenBodies.get(body)}`);seenBodies.set(body,item.id);if(item.experience==='side-quests'){const title=norm(item.title);if(seenQuestTitles.has(title))errors.push(`Duplicate quest title: ${item.id} and ${seenQuestTitles.get(title)}`);seenQuestTitles.set(title,item.id);}}
const questCodes={'Cozy':'COZ','Adventurous':'ADV','Creative':'CRE','Social':'SOC','Chaos Goblin':'CHA'},enumValues={setting:['home','outdoors','anywhere','online','local_outing'],participation_mode:['solo','with_others','either'],cost_level:['free','optional_spend'],energy_level:['low','medium','high'],skill_level:['none','beginner','intermediate']};
for(const item of draftQuests){if(!/^SQ-(COZ|ADV|CRE|SOC|CHA)-\d{3}$/.test(item.id)||item.id.slice(3,6)!==questCodes[item.category])errors.push(`Invalid draft quest ID/category: ${item.id}`);if(item.state!=='draft')errors.push(`Unreviewed quest is not draft: ${item.id}`);for(const [field,values] of Object.entries(enumValues))if(!values.includes(item.metadata?.[field]))errors.push(`Invalid ${field}: ${item.id}`);if(!Number.isInteger(item.metadata?.minutes)||item.metadata.minutes<5||item.metadata.minutes>180)errors.push(`Invalid duration: ${item.id}`);if(!item.metadata?.materials||item.metadata?.editorial_status!=='draft')errors.push(`Missing quest metadata: ${item.id}`);}
const fortunePrefixes={cookie:'FC',oracle:'OR',prophecy:'TP',curiosity:'CUR'};for(const item of draftFortunes){const kind=item.metadata?.kind;if(!new RegExp(`^${fortunePrefixes[kind]}-\\d{3}$`).test(item.id)||item.state!=='draft'||item.metadata?.editorial_status!=='draft')errors.push(`Invalid draft fortune: ${item.id}`);if(kind==='oracle'&&!['yes','no','maybe','not_yet','cryptic'].includes(item.metadata?.response_category))errors.push(`Invalid Oracle category: ${item.id}`);}
const curiosityTitles=new Set(),sourceWordCounts=new Map();
for(const item of draftEntries){
 if(item.metadata?.content_version!==item.version)errors.push(`Metadata version mismatch: ${item.id}`);
 if(item.experience==='side-quests')continue;
 const kind=item.metadata.kind;
 if(kind==='curiosity'){
  if(curiosityTitles.has(norm(item.title)))errors.push(`Duplicate curiosity title: ${item.id}`);
  curiosityTitles.add(norm(item.title));
  if(!curiosityCategories.includes(item.metadata.category)||item.metadata.verification_status!=='fact_checked'||!item.metadata.tell_more?.trim())errors.push(`Incomplete researched curiosity: ${item.id}`);
  const length=words(item.metadata.tell_more??'');
  if(length<75||length>180)errors.push(`Curiosity explanation outside editorial bounds: ${item.id}`);
  else if(length<80)lengthReview.push({id:item.id,words:length,reason:'Slightly below approximate 80-word aim; review for depth rather than padding.'});
  if(!item.sources?.length)errors.push(`Missing curiosity sources: ${item.id}`);
  for(const source of item.sources??[]){
   try{const url=new URL(source.url);if(url.protocol!=='https:'||!source.title||!source.publisher||!source.license||!/^\d{4}-\d{2}-\d{2}$/.test(source.verifiedAt))throw Error();}catch{errors.push(`Incomplete curiosity source: ${item.id}`);}
   sourceWordCounts.set(source.url,(sourceWordCounts.get(source.url)??0)+words(item.title+' '+item.body+' '+item.metadata.tell_more));
  }
 }else{
  if(!['witty','encouraging','mysterious','absurd','reflective','poetic','warm'].includes(item.metadata.tone))errors.push(`Missing/invalid tone: ${item.id}`);
  if(kind==='prophecy'&&!item.metadata.theme)errors.push(`Missing prophecy theme: ${item.id}`);
  const [min,max]=kind==='oracle'?[5,25]:kind==='prophecy'?[12,45]:[10,35];
  if(words(item.body)<min||words(item.body)>max)lengthReview.push({id:item.id,words:words(item.body),reason:`Outside preferred ${min}–${max}-word range; not a hard publication rule.`});
 }
}
for(const [url,count] of sourceWordCounts)if(count>200)errors.push(`Source-summary budget exceeded (${count} words): ${url}`);
const legacyOracleCategories={Affirmative:'yes',Negative:'no',Uncertain:'maybe',Chaotic:'cryptic'};
const oracleDistribution=Object.fromEntries(['yes','no','maybe','not_yet','cryptic'].map(category=>[category,all.filter(x=>x.metadata.kind==='oracle'&&(x.metadata.response_category??legacyOracleCategories[x.metadata.category])===category).length]));
const oracleTargets={yes:90,no:90,maybe:90,not_yet:50,cryptic:45};
if(counts.oracle.published+counts.oracle.draft===365)for(const [category,target] of Object.entries(oracleTargets))if(oracleDistribution[category]!==target)errors.push(`Oracle distribution mismatch: ${category}`);
const curiosities=all.filter(x=>x.metadata.kind==='curiosity');
for(let i=0;i<curiosities.length;i++)for(let j=i+1;j<curiosities.length;j++){
 const a=curiosities[i],b=curiosities[j];
 if(a.sources?.some(s=>b.sources?.some(t=>s.url===t.url)))relatedCuriosities.push({a:a.id,b:b.id,reason:'Shared source; confirm distinct claims. Shared sources alone are not duplicates.'});
}
const prose=draftFortunes.filter(x=>x.metadata.kind!=='curiosity').map(x=>({id:x.id,tokens:new Set(norm(x.body).split(' ').filter(w=>w.length>3))}));
for(let i=0;i<prose.length;i++)for(let j=i+1;j<prose.length;j++){const a=prose[i],b=prose[j],common=[...a.tokens].filter(w=>b.tokens.has(w)).length,similarity=common/(a.tokens.size+b.tokens.size-common);if(similarity>=.7)wordingReview.push({a:a.id,b:b.id,similarity:Number(similarity.toFixed(3))});}
for(const item of publishedFortunes.filter(x=>x.metadata.kind==='curiosity'))if(!item.sources?.length||item.sources.some(s=>!s.url?.startsWith('https://')||!s.verifiedAt))errors.push(`Published curiosity lacks traceable source: ${item.id}`);
for(const [name,value] of Object.entries(counts))if(value.published+value.draft>value.target)errors.push(`Over target: ${name}`);for(const [name,value] of Object.entries(categoryCounts))if(value.published+value.draft>value.target)errors.push(`Over target quest category: ${name}`);
const questBodies=[...publishedQuests,...draftQuests].map(x=>({id:x.id,tokens:new Set(norm(x.title+' '+x.body).split(' ').filter(w=>w.length>3))}));for(let i=0;i<questBodies.length;i++)for(let j=i+1;j<questBodies.length;j++){const a=questBodies[i],b=questBodies[j],common=[...a.tokens].filter(w=>b.tokens.has(w)).length,similarity=common/(a.tokens.size+b.tokens.size-common);if(similarity>=.64)review.push({a:a.id,b:b.id,similarity:Number(similarity.toFixed(3))});}
const manifest={
 target:1845,existingPublished:publishedQuests.length+publishedFortunes.length,newDraft:draftQuests.length+draftFortunes.length,
 currentTotal:all.length,remaining:1845-all.length,collections:counts,questCategories:categoryCounts,oracleDistribution,
 sourceLinkedPublishedCuriosities:counts.curiosities.published,
 newlyFactCheckedCuriosities:draftFortunes.filter(x=>x.metadata.kind==='curiosity'&&x.metadata.verification_status==='fact_checked').length,
 editorialStatus:'New batches are draft, unavailable to runtime selection, and require human review before import.',
 completionStatus:all.length===1845?'Target counts reached; editorial approval still required.':'Four fictional collections complete. Curiosities target remains incomplete; see research queue.',
 lastBatch:draftFiles.join(', '),
 creativeDraftDomains:Object.fromEntries(['fiber','painting','diy','new_craft','coding','ux'].map(domain=>[domain,draftQuests.filter(x=>x.category==='Creative'&&x.metadata.creative_domain===domain).length])),
 legacyCreativeExceptions:40,
 legacyMetadataReview:{quests:publishedQuests.length,fortunes:publishedFortunes.length,reason:'Published records retain original metadata and immutable versions. Expanded editorial metadata must be reviewed as explicit versioned enrichment, not silently overwritten.'},
 legacyIdPolicy:'GRAND_COLLECTION_INDEX.json maps requested editorial collection IDs to immutable canonical content IDs. Existing IDs and saved history are never renamed.',
 validation:{structuralErrors:errors.length,possibleQuestOverlaps:review.length,possibleWordingOverlaps:wordingReview.length,relatedCuriosityPairs:relatedCuriosities.length,lengthReview:lengthReview.length},
 next:'Human editorial review of drafts; research the remaining Curiosities without inventing facts. No draft is automatically published. Runtime publication and any hosted import require separate approval.'
};
if(process.argv.includes('--write-report')){
 writeFileSync(resolve(root,'GRAND_COLLECTION_INDEX.json'),JSON.stringify(index,null,2)+'\n');
 writeFileSync(resolve(root,'CONTENT_PROGRESS.json'),JSON.stringify(manifest,null,2)+'\n');
 writeFileSync(resolve(root,'CONTENT_REVIEW.json'),JSON.stringify({possibleQuestOverlaps:review,possibleWordingOverlaps:wordingReview,relatedCuriosities,lengthReview,structuralErrors:errors,limitations:'Similarity checks identify wording overlap, not semantic identity, literary quality, or source truth. Every draft needs editorial approval. Fact-check flags record research performed; this script cannot prove source support.'},null,2)+'\n');
}
console.log(JSON.stringify(manifest,null,2));
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
if(process.argv.includes('--final')){
 const incomplete=Object.values(counts).some(x=>x.published+x.draft!==x.target)||Object.values(categoryCounts).some(x=>x.published+x.draft!==x.target);
 if(incomplete){console.error('Full target not reached. Curiosities research shortfall is documented; do not claim 1,845 completed entries.');process.exitCode=1;}
}
