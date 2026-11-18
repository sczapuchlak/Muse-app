import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const Mo=load('lib/inner-compass/modules'),S=load('lib/inner-compass/stories'),L=load('lib/inner-compass/library');
const read=f=>readFileSync(resolve(root,f),'utf8');

test('chapter status comes only from the person’s dates and choices',()=>{
 const c=(o)=>({startsOn:null,endsOn:null,closedAt:null,archivedAt:null,...o}),t='2026-11-14';
 assert.equal(S.chapterStatus(c({}),t),'undated');
 assert.equal(S.chapterStatus(c({startsOn:'2026-12-01'}),t),'upcoming');
 assert.equal(S.chapterStatus(c({startsOn:'2026-01-01'}),t),'current','open-ended');
 assert.equal(S.chapterStatus(c({startsOn:'2026-01-01',endsOn:'2026-03-01'}),t),'completed','past its end date');
 assert.equal(S.chapterStatus(c({startsOn:'2026-01-01',closedAt:'2026-02-01T00:00:00Z'}),t),'completed');
 assert.equal(S.chapterStatus(c({closedAt:'x',archivedAt:'y'}),t),'archived');
 assert.equal(S.rangeLabel(null,null),'Undated');assert.equal(S.rangeLabel('2026-03-04',null),'Mar 2026 – open');assert.equal(S.rangeLabel('2026-03-04','2026-03-20'),'March 2026');
 const row=S.chapterToRow({...S.blankChapter('2026-01-01T00:00:00Z','c1'),title:'  Prosperity ',startsOn:'2026-05-01',endsOn:'2026-04-01',isPrimary:true,archivedAt:'2026-06-01'});
 assert.equal(row.title,'Prosperity');assert.equal(row.ends_on,'2026-05-01','an end before the start is clamped');assert.equal(row.is_primary,false,'an archived chapter is never primary');
});

test('covers: six curated presets, hex accents only, safe parsing',()=>{
 assert.equal(S.coverPresets.length,6);
 assert.deepEqual(S.parseCover({preset:'eclipse',accent:'#E85D75',board:{id:'not-a-uuid'}}),{preset:'eclipse',accent:'#E85D75'});
 assert.equal(S.parseCover({preset:'bogus',accent:'red'},'aurora').preset,'aurora');
 assert.equal(S.presetFor('abc'),S.presetFor('abc'),'stable per record');
});

test('tags are universal and case-insensitive',()=>{
 assert.deepEqual(S.cleanTags(['Pottery','pottery',' #First  time ','']),['Pottery','First time']);
 assert.equal(S.canonicalTag('pottery',['Pottery','Hiking']),'Pottery','reuses the existing spelling');
 assert.deepEqual(S.knownTags([{tags:['Art','Learning']},{tags:['art']}]),[{tag:'Art',count:2},{tag:'Learning',count:1}]);
});

test('module registry: typed, optional, and owned by Chapters, Experiences or both',()=>{
 const chapter=Mo.modulesFor('chapter').map(m=>m.type),experience=Mo.modulesFor('experience').map(m=>m.type);
 for(const t of ['words','intentions','mantras','embrace','symbols','discoveries','visions','experiences','reflections'])assert.ok(chapter.includes(t),`chapter offers ${t}`);
 for(const t of ['notes','photos','words','intentions','mantras','exploration','discussion','symbols','rituals','materials','tarot','visions','discoveries'])assert.ok(experience.includes(t),`experience offers ${t}`);
 assert.ok(!chapter.includes('rituals'),'ceremonies are Experiences, never a second record system inside Chapters');
 assert.ok(!chapter.includes('materials'));assert.ok(!experience.includes('experiences'));
 const sql=read('supabase/migrations/20261223000100_inner_chapters_experiences.sql');
 for(const t of Mo.moduleTypes)assert.ok(sql.includes(`'${t}'`),`${t} allowed by the database`);
 for(const d of Object.values(Mo.modules)){assert.ok(d.label&&d.hint,`${d.type} has words`);if(d.shape==='items')assert.ok(d.fields.length&&d.maxItems,`${d.type} fields`);}
});

test('module content parsing keeps what it understands and drops the rest',()=>{
 const c=Mo.parseContent('words',{items:[{id:'w1',word:'Prosperity',primary:true,bogus:1},{id:'w1',word:'dupe'},{id:'bad id!',word:'x'},{id:'w2',definition:'x'.repeat(9000)}]});
 assert.deepEqual(c.items.map(i=>i.id),['w1','w2']);assert.equal(c.items[0].bogus,undefined);assert.equal(c.items[1].definition.length,6000);
 const m=Mo.parseContent('materials',{items:[{id:'m1',name:'Tiger’s eye',refKey:'tigers-eye',category:'stone',quantity:'2'},{id:'m2',name:'A key',refKey:'NOT OK'}]});
 assert.equal(m.items[0].refKey,'tigers-eye');assert.equal(m.items[1].refKey,undefined);
 const r=Mo.parseContent('visions',{refs:[{id:'v1',label:'Board'},{id:'v1',label:'dupe'},{label:'no id'}]});
 assert.deepEqual(r.refs,[{id:'v1',label:'Board'}]);
 const p=Mo.parseContent('embrace',{embracing:[{id:'e1',text:'Yes'}],releasing:[{id:'r1',text:'Scarcity',description:'old story'}],reflection:'ok'});
 assert.equal(p.releasing[0].description,'old story');assert.equal(p.reflection,'ok');
 assert.deepEqual(Mo.parseContent('experiences',{anything:1}),{},'linked modules hold no copies');
 const i=Mo.parseContent('intentions',{items:[{id:'i1',text:'Stay open',planner:{period:'month',start:'2026-11-01',label:'November'}},{id:'i2',planner:{period:'decade',start:'2026-01-01'}}]});
 assert.equal(i.items[0].planner.period,'month');assert.equal(i.items[1].planner,undefined);
});

test('removing, duplicating and carrying forward modules',()=>{
 assert.equal(Mo.moduleHasContent('words',{items:[{id:'a'}]}),false,'an untouched entry is not content');
 assert.equal(Mo.moduleHasContent('words',{items:[{id:'a',word:'Joy'}]}),true);
 assert.equal(Mo.moduleHasContent('experiences',{}),false,'linked modules never hold content of their own');
 const src={items:[{id:'a',text:'There is enough',featured:true}]};
 const copy=Mo.copyContent('mantras',src,{id:'c1',label:'Prosperity'});
 assert.notEqual(copy.items[0].id,'a');assert.deepEqual(copy.items[0].from,[{id:'c1',label:'Prosperity'}]);assert.equal(src.items[0].from,undefined,'the original is untouched');
 assert.equal(Mo.itemHeadline('mantras',copy.items[0]),'There is enough');
 assert.deepEqual(Mo.featuredMantras([src,{items:[{id:'b',text:'Not featured'}]}]).map(i=>i.text),['There is enough'],'only mantras the person featured reach the Daily Edit');
 assert.deepEqual(S.reorder([{id:'a'},{id:'b'},{id:'c'}],'c',0).map(x=>x.id),['c','a','b']);
});

test('materials reference: 40–100 entries, factual, sourced, never claiming effects',()=>{
 assert.ok(L.materials.length>=40&&L.materials.length<=100,`${L.materials.length}`);
 assert.equal(new Set(L.materials.map(m=>m.key)).size,L.materials.length);
 for(const m of L.materials){
  assert.match(m.key,/^[a-z0-9-]{1,60}$/);assert.ok(m.description.length>20,m.key);assert.ok(m.sources.length&&m.sources.every(s=>/^https:\/\//.test(s)),`${m.key} cites a source`);
  assert.doesNotMatch(JSON.stringify(m),/\b(heals?|cures?|will (bring|attract)|guarantees?)\b/i,`${m.key} makes no claims of effect`);
 }
 assert.match(L.materialsDisclaimer,/not proven effects/);
 assert.equal(L.searchMaterials('tiger')[0].key,'tigers-eye');assert.equal(L.searchMaterials("tiger's")[0].key,'tigers-eye');
 assert.equal(L.searchMaterials('fool')[0].key,'pyrite','alternate names are searchable');
 assert.deepEqual(L.searchMaterials(''),[]);
});

test('the migration keeps one authoritative Experience and owner-only access',()=>{
 const sql=read('supabase/migrations/20261223000100_inner_chapters_experiences.sql');
 for(const t of ['inner_chapters','inner_experiences','inner_experience_collections','inner_collection_experiences','inner_chapter_experiences','inner_modules','inner_area_links'])assert.ok(sql.includes(`'${t}'`),`${t} gets RLS`);
 assert.match(sql,/num_nonnulls\(chapter_id, experience_id\) = 1/,'a module has exactly one owner');
 assert.match(sql,/inner_chapters_one_primary on public\.inner_chapters \(user_id\) where is_primary/,'one primary chapter');
 assert.match(sql,/on delete set null \(chapter_id\)/,'reflections keep their words');
 assert.doesNotMatch(sql,/to anon/);
 assert.doesNotMatch(sql,/create table public\.inner_(seasons|spells|rituals)/,'no separate Seasons or ritual record systems');
});
test('notes keep formatted writing, still read older plain text, and drop oversized documents',()=>{
 const doc={type:'doc',content:[{type:'heading',attrs:{level:2},content:[{type:'text',text:'Release'}]},{type:'bulletList',content:[{type:'listItem',content:[{type:'paragraph',content:[{type:'text',text:'habits'}]}]}]}]};
 assert.deepEqual(Mo.parseContent('notes',{text:doc}).text,doc);
 assert.equal(Mo.parseContent('notes',{text:'First line\nSecond line'}).text,'First line\nSecond line');
 assert.equal(Mo.parseContent('notes',{text:{type:'doc',content:[{type:'paragraph'}]}}).text,undefined);
 assert.equal(Mo.parseContent('notes',{text:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'x'.repeat(200000)}]}]}}).text,undefined);
 assert.equal(Mo.moduleHasContent('notes',{text:{type:'doc',content:[{type:'paragraph'}]}}),false);
 assert.match(Mo.richText(doc),/Release[\s\S]*habits/);
});
test('a symbol\'s "How it was made" holds a whole process',()=>{
 const c=Mo.parseContent('symbols',{items:[{id:'s1',method:'y'.repeat(12000)}]});
 assert.equal(c.items[0].method.length,10000);
});
