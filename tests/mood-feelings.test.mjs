import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';
const F=load('lib/feelings'),{emotionCatalog}=load('lib/emotions'),mood=load('lib/mood'),store=load('lib/feelings-store'),read=f=>readFileSync(resolve(root,f),'utf8');
const custom=(id,name,quadrant,favorite=false)=>({id,name,quadrant,emoji:null,favorite});

test('#130 pleasantness × energy choose the Mood Meter quadrant, and back again',()=>{
 assert.equal(F.quadrantFor(true,true),'yellow');assert.equal(F.quadrantFor(true,false),'green');
 assert.equal(F.quadrantFor(false,true),'red');assert.equal(F.quadrantFor(false,false),'blue');
 for(const q of ['red','yellow','blue','green'])assert.equal(F.quadrantFor(F.traitsOf(q).pleasant,F.traitsOf(q).highEnergy),q);
});

test('#130 names are tidied and duplicates are found case-, accent- and punctuation-insensitively',()=>{
 assert.equal(F.cleanFeelingName('  restless   and  wired '),'Restless and wired');
 assert.equal(F.cleanFeelingName('x'.repeat(80)).length,F.MAX_FEELING_NAME);assert.equal(F.cleanFeelingName('   '),'');
 assert.equal(F.normalizeFeelingName(' Rêstless! '),'restless');
 const lib=F.unifiedFeelings(emotionCatalog,[custom('a','Wistful-ish','blue')]);
 assert.equal(F.findFeelingByName('RESTLESS',lib)?.id,'emotion-restless','a shared word is found');
 assert.equal(F.findFeelingByName('wistful ish',lib)?.id,'custom:a','a personal feeling is found');
 assert.equal(F.findFeelingByName('Zesty',lib),undefined);
 // Creating is refused for either kind of duplicate; the person can select the existing word instead.
 const shared=store.draftProblem({name:'restless',quadrant:'red'},emotionCatalog,[]);assert.equal(shared.kind,'duplicate-shared');assert.equal(shared.existing.id,'emotion-restless');
 assert.equal(store.draftProblem({name:'WISTFUL ISH',quadrant:'blue'},emotionCatalog,[custom('a','Wistful-ish','blue')]).kind,'duplicate-custom');
 assert.equal(store.draftProblem({name:'Zesty',quadrant:'yellow'},emotionCatalog,[]),null);
 assert.equal(store.draftProblem({name:'  ',quadrant:'yellow'},emotionCatalog,[]).kind,'empty');
 assert.equal(store.draftProblem({name:'Wistful-ish',quadrant:'green'},emotionCatalog,[custom('a','Wistful-ish','blue')],'a'),null,'renaming to its own name is fine');
});

test('#130 one library: custom feelings sit in the shared list with no source marking',()=>{
 const lib=F.unifiedFeelings(emotionCatalog,[custom('a','Zesty','yellow')]);
 const zesty=lib.find(e=>e.id==='custom:a'),calm=lib.find(e=>e.id==='emotion-calm');
 assert.equal(zesty.quadrant,'yellow');assert.deepEqual(Object.keys(zesty).sort(),Object.keys({...calm,definition:undefined}).filter(k=>k!=='definition'&&k!=='ambiguous').sort().concat(Object.keys(zesty).filter(k=>!(k in calm))).sort());
 assert.ok(!('custom' in zesty)&&!('source' in zesty),'nothing labels where a word came from');
 assert.deepEqual([...lib].map(e=>e.name),[...lib].map(e=>e.name).sort((a,b)=>a.localeCompare(b,'en')),'one alphabetical list');
 assert.equal(lib.length,emotionCatalog.length+1);
 // Ambiguous words exist, so "Lazy" can mean different things to different people.
 assert.ok(emotionCatalog.find(e=>e.id==='emotion-lazy')?.ambiguous);
});

test('#130 an entry keeps its own interpretation and custom feelings, whatever the vocabulary does later',()=>{
 const lazy=emotionCatalog.find(e=>e.id==='emotion-lazy'),zesty={id:'custom:a',name:'Zesty',emoji:'😊',quadrant:'yellow'};
 let entry={emotionIds:[],feelings:[]};
 entry={...entry,...F.selectFeeling(entry,lazy,'green',emotionCatalog)};// relaxed, low-energy pleasant
 entry={...entry,...F.selectFeeling(entry,zesty,'yellow',emotionCatalog)};
 assert.deepEqual(entry.emotionIds,['emotion-lazy','custom:a']);
 assert.equal(F.recordedFeeling('emotion-lazy',entry.feelings,emotionCatalog).quadrant,'green','this entry reads Lazy as pleasant');
 assert.equal(emotionCatalog.find(e=>e.id==='emotion-lazy').quadrant,'blue','the shared word is not changed for everyone');
 assert.equal(F.isPersonalInterpretation(entry.feelings[0],emotionCatalog),true);assert.equal(F.isPersonalInterpretation(entry.feelings[1],emotionCatalog),false);
 // Another person (or entry) can read it the other way.
 const other=F.selectFeeling({emotionIds:[],feelings:[]},lazy,'blue',emotionCatalog);assert.equal(other.feelings[0].quadrant,'blue');
 // The custom feeling is deleted or renamed in the library: the recorded entry still shows what was recorded.
 const afterDelete=F.recordedFeeling('custom:a',entry.feelings,emotionCatalog);assert.equal(afterDelete.name,'Zesty');assert.equal(afterDelete.quadrant,'yellow');
 assert.equal(F.recordedFeeling('custom:a',[],emotionCatalog),null,'without a snapshot an unknown custom id resolves to nothing, never to another feeling');
 // Re-interpreting while selected changes only that entry's snapshot; removing drops its snapshot.
 const again=F.selectFeeling(entry,lazy,'blue',emotionCatalog);assert.deepEqual(again.emotionIds,entry.emotionIds);assert.equal(again.feelings.find(f=>f.id==='emotion-lazy').quadrant,'blue');
 assert.deepEqual(F.deselectFeeling(entry,'emotion-lazy'),{emotionIds:['custom:a'],feelings:[entry.feelings[1]]});
});

test('#130 older entries without snapshots read from the shared vocabulary, and editing one freezes how it reads',()=>{
 const legacy={emotionIds:['emotion-calm','emotion-sad'],feelings:[]};
 assert.deepEqual(F.recordedFeelings(legacy,emotionCatalog).map(e=>e.quadrant),['green','blue']);
 const next=F.selectFeeling(legacy,emotionCatalog.find(e=>e.id==='emotion-joyful'),'yellow',emotionCatalog);
 assert.deepEqual(next.feelings.map(f=>[f.id,f.quadrant]),[['emotion-calm','green'],['emotion-sad','blue'],['emotion-joyful','yellow']],'earlier feelings are frozen as they read');
});

test('#130 snapshots parse safely and split between the shared join table and the snapshot',()=>{
 const raw=[{id:'custom:a',name:'Zesty',quadrant:'yellow',custom:true},{id:'custom:a',name:'dup',quadrant:'red'},{id:'x',name:'',quadrant:'red'},{id:'y',name:'N',quadrant:'purple'},'junk',{id:'emotion-calm',name:'Calm',quadrant:'blue',emoji:'😌'}];
 const parsed=F.parseFeelings(raw);assert.deepEqual(parsed.map(f=>f.id),['custom:a','emotion-calm']);assert.equal(parsed[1].quadrant,'blue');assert.deepEqual(F.parseFeelings(null),[]);
 assert.deepEqual(F.catalogIdsOf(['emotion-calm','custom:a']),['emotion-calm']);
 assert.deepEqual(F.readBackIds(['emotion-calm'],parsed),['emotion-calm','custom:a']);
});

test('#130 summaries and Insights count each feeling in the quadrant the entry recorded',()=>{
 const base=mood.emptyCheckIn('2026-11-10','morning');
 const entry={...base,emotionIds:['emotion-lazy','custom:a'],feelings:[{id:'emotion-lazy',name:'Lazy',quadrant:'green'},{id:'custom:a',name:'Zesty',quadrant:'yellow',custom:true}]};
 const summary=mood.moodSummary([entry],emotionCatalog);
 assert.equal(summary.families.green,1);assert.equal(summary.families.blue,0,'not re-read as the default blue');assert.equal(summary.families.yellow,1);
 assert.deepEqual(summary.frequentFeelings.map(f=>f.name).sort(),['Lazy','Zesty']);
 const {moodMetrics}=load('lib/insights/feelings');
 const m=moodMetrics({mood:{records:[entry],influences:[]},dailyPulse:undefined},{start:'2026-11-01',end:'2026-11-30'});
 assert.deepEqual(m.emotions.map(e=>e.label).sort(),['Lazy','Zesty']);assert.equal(m.families.find(f=>f.id==='green').count,1);assert.equal(m.families.find(f=>f.id==='blue').count,0);
});

test('#130 the daily store reads back custom feelings and sends only shared ids to the join table',async()=>{
 const {emotionalRecords}=load('lib/data/daily-store'),{saveMoodCheckin}=load('lib/data/daily');
 const day={record:null,priorities:[],checkins:[{id:'c1',period:'morning',reflection:null,created_at:'t',updated_at:'t',captured_time_zone:'UTC',revision:1,
  checkin_emotions:[{emotion_id:'emotion-calm'}],checkin_influences:[],feelings:[{id:'custom:a',name:'Zesty',quadrant:'yellow',custom:true},{id:'emotion-calm',name:'Calm',quadrant:'blue'}]}]};
 const [record]=emotionalRecords({'2026-11-10':day});
 assert.deepEqual(record.emotionIds.sort(),['custom:a','emotion-calm']);assert.equal(record.feelings.find(f=>f.id==='emotion-calm').quadrant,'blue');
 let sent;const client={rpc:async(name,args)=>{sent={name,args};return {data:null,error:null};}};
 await saveMoodCheckin(client,{date:'2026-11-10',period:'morning',reflection:null,emotionIds:['emotion-calm','custom:a'],feelings:record.feelings,influenceIds:[],revision:null});
 assert.equal(sent.name,'save_mood_checkin');assert.deepEqual(sent.args.p_emotion_ids,['emotion-calm'],'custom ids never reach the catalog foreign key');
 assert.equal(sent.args.p_feelings.length,2);
});

test('#130 the selector shows one library, an About note, and no source labels',()=>{
 const {EmotionPicker}=load('components/EmotionPicker');
 const lib=F.unifiedFeelings(emotionCatalog,[custom('a','Zesty','yellow',true)]);
 const html=renderToStaticMarkup(React.createElement(EmotionPicker,{emotions:lib,selectedIds:['custom:a'],selectedQuadrants:{'custom:a':'yellow'},onToggle(){},onSelect(){},onClose(){},favoriteIds:['custom:a'],recentIds:['custom:a'],onCreate:async()=>lib[0],custom:[custom('a','Zesty','yellow',true)],onUpdateCustom:async()=>{},onDeleteCustom:async()=>{},libraryError:''}));
 assert.equal((html.match(/class="emotion-option"/g)??[]).length,lib.length,'custom and shared feelings are listed together');
 assert.match(html,/Zesty/);assert.match(html,/aria-label="About this feelings library"/);assert.match(html,/>Recent</);assert.match(html,/Your own feelings/);
 assert.doesNotMatch(html,/Yale|source|official/i,'the explanation is behind the info icon and nothing is labeled by source');
 const zesty=html.match(/<div class="muse-emotion-result"[^>]*data-quadrant="yellow"[^>]*><button[^>]*data-emotion-id="custom:a"/);assert.ok(zesty,'a custom feeling renders exactly like the others, in its quadrant');
});

test('#130 the About note says what was asked, without claiming Yale endorses the expanded words',()=>{
 const src=read('components/EmotionPicker.tsx');
 assert.match(src,/inspired by the Yale Center for Emotional Intelligence/);assert.match(src,/We’ve expanded the vocabulary, and you can add feelings of your own\. There’s no single right way to feel a word\./);
 assert.doesNotMatch(src,/official(ly)? (part|Yale)/i);
});

test('#130 storage is owner-only and additive; entries carry their own snapshot; deleting a feeling cannot touch history',()=>{
 const sql=read('supabase/migrations/20261212000100_custom_feelings.sql');
 assert.match(sql,/create table public\.custom_feelings/);assert.match(sql,/enable row level security/);assert.match(sql,/revoke all on public\.custom_feelings from public, anon, authenticated/);
 for(const p of ['owner_read','owner_insert','owner_update','owner_delete'])assert.match(sql,new RegExp(`create policy ${p} on public\\.custom_feelings`));
 assert.match(sql,/unique index custom_feelings_one_name on public\.custom_feelings\(user_id, lower\(btrim\(name\)\)\)/,'case-insensitive duplicate prevention in the database too');
 assert.match(sql,/alter table public\.mood_checkins add column feelings jsonb/);
 assert.doesNotMatch(sql,/references public\.custom_feelings/,'no foreign key from history to the editable library');
 assert.doesNotMatch(sql,/drop table|truncate|alter table public\.(?!mood_checkins|custom_feelings)/i);
 assert.deepEqual([...sql.matchAll(/drop function ([^;]+);/g)].map(m=>m[1]),['public.save_mood_checkin(date,text,text,text[],uuid[],bigint)'],'the only thing replaced is the save command, with the same contract plus the snapshot');
 assert.match(sql,/save_mood_checkin\(date,text,text,text\[\],uuid\[\],bigint,jsonb\)/);
 // Every seeded word exists in the TypeScript vocabulary with the same default quadrant.
 for(const m of sql.matchAll(/\('(emotion-[a-z-]+)','[^']+','[^']+','(red|blue|green|yellow)'/g))assert.equal(emotionCatalog.find(e=>e.id===m[1])?.quadrant,m[2],`${m[1]} matches the app vocabulary`);
 const storeSrc=read('lib/feelings-store.ts');assert.doesNotMatch(storeSrc,/\.from\("(?!custom_feelings|emotion_favorites)/);
 assert.match(read('app/api/account/export/route.ts'),/custom_feelings/,'custom feelings are part of Export your data');
});
