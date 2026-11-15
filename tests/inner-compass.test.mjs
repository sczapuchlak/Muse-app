import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const C=load('lib/inner-compass/categories'),M=load('lib/inner-compass/model'),F=load('lib/inner-compass/manifesto'),L=load('lib/inner-compass/library');
const V=load('lib/almanac/voice-rules'),I=load('lib/intentions/model'),B=load('lib/vision-boards/model');
const read=f=>readFileSync(resolve(root,f),'utf8');
let n=0;
const d=(o={})=>({...M.blankDiscovery('values','2026-11-01T00:00:00Z'),id:`d${++n}`,title:`Discovery ${n}`,revision:1,createdAt:`2026-11-${String(n).padStart(2,'0')}T10:00:00Z`,updatedAt:'2026-11-01T00:00:00Z',...o});

test('six collections, each with its own ink and nothing that grades the person',()=>{
 assert.deepEqual(C.categories,['values','character','beliefs','philosophy','boundaries','patterns']);
 assert.equal(new Set(C.categories.map(c=>C.categoryInfo[c].tone)).size,6,'neighbouring collections never share a tone');
 const words=JSON.stringify(C.categoryInfo).toLowerCase();
 for(const bad of ['score','percent','rank','grade:','level up','progress bar'])assert.ok(!words.includes(bad),`no ${bad}`);
 assert.deepEqual(C.categoryInfo.character.stances.map(s=>s.id),['recognize','cultivating','exploring','rediscovered']);
 assert.ok(C.categoryInfo.beliefs.stances.some(s=>s.id==='retired'),'beliefs can be retired');
});

test('only the statement is required; details are kept per collection',()=>{
 assert.deepEqual(M.detailsFor('values',{stance:'core',attribution:'x',area:'time'}),{stance:'core'});
 assert.deepEqual(M.detailsFor('boundaries',{area:'time',stance:'core'}),{area:'time'},'a value stance is not a boundary field');
 assert.deepEqual(M.detailsFor('philosophy',{kind:'quote',attribution:' Mary Oliver ',theme:''}),{kind:'quote',attribution:'Mary Oliver'});
 assert.deepEqual(M.detailsFor('character',{stance:'not-a-stance'}),{},'unknown choices are dropped');
 assert.deepEqual(M.cleanTags(['#Growth','growth',' Mind  map ','',...Array(30).fill('x')]),['Growth','Mind map','x']);
 const row=M.discoveryToRow({...d({category:'patterns',title:'  Crowded weeks make me quiet  ',details:{kind:'drains',why:'dropped'}})});
 assert.equal(row.title,'Crowded weeks make me quiet');assert.deepEqual(row.details,{kind:'drains'});
});

test('ordinary edits are told apart from changes in understanding (a hint, never automatic)',()=>{
 const a=d({title:'Rest is productive.'});
 assert.equal(M.wordsChanged(a,{...a,tags:['x'],favorite:true}),false);
 assert.equal(M.wordsChanged(a,{...a,title:'Rest is part of the work.'}),true);
});

test('search, filters, archive and sorting',()=>{
 const list=[d({title:'Curiosity',meaning:'Wanting to know',tags:['mind'],favorite:true,details:{stance:'core'}}),d({title:'Freedom',category:'values',details:{stance:'exploring'}}),
  d({title:'Courage',category:'character',meaning:'Acting while afraid',evolvedAt:'2026-11-20T00:00:00Z'}),d({title:'Old belief',category:'beliefs',archivedAt:'2026-11-10T00:00:00Z'})];
 assert.deepEqual(list.filter(x=>M.matches(x,{query:'afraid'})).map(x=>x.title),['Courage'],'meanings are searched');
 assert.deepEqual(list.filter(x=>M.matches(x,{query:'CURIOSITY'})).map(x=>x.title),['Curiosity']);
 assert.deepEqual(list.filter(x=>M.matches(x,{tag:'MIND'})).map(x=>x.title),['Curiosity']);
 assert.deepEqual(list.filter(x=>M.matches(x,{favorites:true})).map(x=>x.title),['Curiosity']);
 assert.deepEqual(list.filter(x=>M.matches(x,{stance:'exploring'})).map(x=>x.title),['Freedom']);
 assert.equal(list.filter(x=>M.matches(x,{})).length,3,'archived are hidden by default');
 assert.deepEqual(list.filter(x=>M.matches(x,{archived:'only'})).map(x=>x.title),['Old belief']);
 assert.deepEqual(list.filter(x=>M.matches(x,{areaId:'a1'},id=>id===list[1].id?['a1']:[])).map(x=>x.title),['Freedom']);
 assert.equal(M.sortDiscoveries(list,'evolved')[0].title,'Courage');
 assert.deepEqual(M.sortDiscoveries(list,'alpha').map(x=>x.title),['Courage','Curiosity','Freedom','Old belief']);
 assert.deepEqual(M.counts(list),{values:2,character:1,beliefs:0,philosophy:0,boundaries:0,patterns:0},'counts leave the archive out');
 assert.deepEqual(M.allTags(list),[{tag:'mind',count:1}]);
});

test('connections are undirected pairs; star placement is stable',()=>{
 assert.deepEqual(M.pair('b','a'),['a','b']);assert.deepEqual(M.pair('a','b'),['a','b']);
 assert.deepEqual(M.relatedIds([{a:'a',b:'b'},{a:'b',b:'c'}],'b').sort(),['a','c']);
 assert.equal(M.seeded('x',1),M.seeded('x',1));assert.notEqual(M.seeded('x',1),M.seeded('x',2));
 for(const s of ['a','bb','ccc'])assert.ok(M.seeded(s)>=0&&M.seeded(s)<1);
});

test('the manifesto keeps the person’s wording and only references discoveries',()=>{
 const line=F.lineFrom({id:'d-1',category:'values',title:' Curiosity '},'l1');
 assert.deepEqual(line,{id:'l1',kind:'line',text:'Curiosity',ref:{id:'d-1',category:'values',label:'Curiosity'}});
 const parsed=F.parseBlocks([{id:'h1',kind:'heading',text:'What I value'},line,{id:'l1',kind:'line',text:'dupe'},{id:'bad id!',kind:'line',text:'x'},{id:'x',kind:'image'},{id:'l2',kind:'line',text:'Mine',ref:{id:'d2',category:'nope'}}]);
 assert.deepEqual(parsed.map(b=>b.id),['h1','l1','l2'],'unknown kinds, bad ids and duplicates are dropped');
 assert.equal(parsed[2].ref,undefined,'a malformed reference is dropped, the words are kept');
 assert.deepEqual(F.move(parsed,'l2',-1).map(b=>b.id),['h1','l2','l1']);
 assert.equal(F.hasWords([{id:'a',kind:'line',text:'  '}]),false);
 assert.ok(F.suggestedHeadings.length>=3);
});

test('at least 30 distinct explorations, 3–5 prompts each, in the Muse voice',()=>{
 assert.ok(L.explorations.length>=30,`${L.explorations.length} explorations`);
 assert.equal(new Set(L.explorations.map(e=>e.key)).size,L.explorations.length,'keys are unique');
 for(const t of L.themeOrder)assert.ok(L.explorations.filter(e=>e.category===t).length>=4,`${t} has several explorations`);
 const prompts=new Set();
 for(const e of L.explorations){
  assert.match(e.key,/^[a-z0-9-]{1,64}$/);assert.ok(C.isCategory(e.saveAs),`${e.key} saves into a collection`);
  assert.ok(e.prompts.length>=3&&e.prompts.length<=5,`${e.key}: 3–5 prompts`);
  assert.equal(new Set(e.prompts.map(p=>p.key)).size,e.prompts.length,`${e.key}: prompt keys unique`);
  for(const p of e.prompts){assert.ok(!prompts.has(p.text),`no repeated prompt: ${p.text}`);prompts.add(p.text);}
  for(const text of [e.title,e.intro,...e.prompts.map(p=>p.text)]){assert.deepEqual(V.voiceProblems(text),[],`${e.key}: ${text}`);assert.ok(!/\b(journey|best self|you should|manifest)/i.test(text),`${e.key}: cliché in “${text}”`);}
 }
 assert.ok(L.featured('2026-11-14').key);assert.equal(L.featured('2026-11-14').key,L.featured('2026-11-14').key,'stable for the day');
 const today=L.featured('2026-11-14');assert.notEqual(L.featured('2026-11-14',new Set([today.key])).key,today.key,'never the one just done');
});

test('the word gardens are curated, unique and free of rankings',()=>{
 for(const k of ['values','character']){
  const words=L.wordLibrary[k];assert.ok(words.length>=45,`${k}: ${words.length}`);
  assert.equal(new Set(words.map(w=>`${w.family}/${w.word}`)).size,words.length);
  assert.equal(new Set(words.map(w=>w.word)).size,words.length,`${k}: each word appears once`);
  for(const w of words)assert.ok(w.gloss.length>4&&w.gloss.length<60,`${w.word} gloss`);
 }
});

test('Intentions can reference values and qualities; Vision Boards can link a discovery',()=>{
 assert.ok(I.sectionKinds.some(k=>k.key==='compass'&&k.type==='compass'));
 const s=I.newSection('compass','s1');assert.deepEqual(s.content,{items:[]});
 const [p]=I.parseSections([{id:'s1',type:'compass',title:'Values to honor',content:{items:[{id:'i1',ref:{kind:'discovery',id:'d-1',label:'Curiosity'},note:'Ask more'},{id:'i2',ref:{kind:'aspiration',id:'a',label:'x'},note:''}]}}]);
 assert.deepEqual(p.content.items,[{id:'i1',ref:{kind:'discovery',id:'d-1',label:'Curiosity'},note:'Ask more'}],'only discovery references belong in it');
 assert.equal(I.MAX_ITEMS.compass,8);
 assert.equal(I.refStatus({kind:'discovery',id:'d-1',label:'Curiosity'},{label:'Curiosity, even about…'}).note,'now “Curiosity, even about…”','renames show, never rewrite');
 const [el]=B.parseElements?B.parseElements([{id:'t',kind:'text',x:0,y:0,w:10,h:10,rotation:0,text:'Be curious',font:'editorial',size:40,color:'#000000',align:'center',link:{kind:'discovery',id:'d-1',label:'Curiosity'}}]):[null];
 if(el)assert.deepEqual(el.link,{kind:'discovery',id:'d-1',label:'Curiosity'});
 assert.match(read('lib/vision-boards/model.ts'),/o\.kind !== "discovery"/);
});

test('the migration is owner-only and keeps history on archive, references on delete',()=>{
 const sql=read('supabase/migrations/20261222000100_inner_compass.sql');
 for(const t of ['inner_discoveries','inner_discovery_versions','inner_discovery_links','inner_discovery_areas','inner_exploration_responses','inner_reflections','inner_manifestos','inner_manifesto_versions'])assert.ok(sql.includes(`'${t}'`),`${t} gets RLS`);
 assert.match(sql,/revoke all on public\.%I from public,anon,authenticated/);
 assert.match(sql,/on delete set null \(discovery_id\)/,'reflections keep their words when a discovery is deleted');
 assert.match(sql,/check \(a_id < b_id\)/,'one row per connection');
 assert.match(sql,/select \* into old from public\.inner_discoveries where id = p_id and user_id = \(select auth\.uid\(\)\) for update/,'evolution copies the earlier words from the row itself');
 assert.doesNotMatch(sql,/to anon/);
});
