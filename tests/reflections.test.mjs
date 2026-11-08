import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';
const R=load('lib/reflections/model'),read=f=>readFileSync(resolve(root,f),'utf8');
let n=0;const ids=()=>`id-${n++}`;

test('#99 six starter layouts: two per period, genuinely different compositions',()=>{
 for(const p of ['week','month','year']){const ls=R.layoutsFor(p);assert.equal(ls.length,2,p);
  const sig=l=>l.seeds.map(s=>`${s.type}:${s.size}`).join(',');assert.notEqual(sig(ls[0]),sig(ls[1]),`${p} layouts differ`);assert.notEqual(ls[0].mood,ls[1].mood);}
 assert.equal(new Set(R.layouts.map(l=>l.mood)).size,6,'six personalities');
 for(const l of R.layouts){assert.ok(l.seeds.some(s=>s.type==='level10'),`${l.id} offers Level 10 Life`);const mods=R.seedModules(l.id,ids);assert.equal(mods.length,l.seeds.length);assert.ok(mods.every(m=>!R.hasContent(m)));}
 const little=R.seedModules('little-moments',ids);assert.equal(little.find(m=>m.type==='guided'&&m.content.prompt==='intentions').title,'Next week’s intentions');
});

test('#99 parsing keeps content it understands, drops junk, bounds sizes and allows one Level 10 Life',()=>{
 const mods=R.parseModules([
  {id:'a',type:'music',title:'On repeat',size:'third',content:{items:[{id:'s1',title:'Midnight Sky',artist:'Miley Cyrus',note:'',link:'http://insecure',art:{id:'x',url:'https://example.com/a.jpg',alt:''}},{bad:true}]}},
  {id:'b',type:'level10',title:'L10',size:'full',content:{}},{id:'c',type:'level10',title:'Again',size:'full',content:{}},
  {id:'d',type:'nope'},{id:'a',type:'writing'},
  {id:'e',type:'books',size:'enormous',content:{items:[{id:'b1',title:'Piranesi',author:'Clarke',rating:9,note:''}]}},
  {id:'f',type:'guided',content:{prompt:'whatever',entries:[{id:'g1',text:'Sunshine'}]}},
 ]);
 assert.deepEqual(mods.map(m=>m.id),['a','b','e','f'],'duplicate ids, unknown types and a second Level 10 dropped');
 const song=mods[0].content.items[0];assert.equal(song.link,undefined,'only https links');assert.equal(song.art.url,'https://example.com/a.jpg');assert.equal(mods[0].content.items.length,1);
 assert.equal(mods[2].size,'half','unknown size falls back');assert.equal(mods[2].content.items[0].rating,5,'ratings capped at 5');
 assert.equal(mods[3].content.prompt,'gratitude');assert.ok(R.hasContent(mods[3]));
 assert.deepEqual(R.parseModules(JSON.parse(JSON.stringify(mods))),mods,'survives a save round-trip');
});

test('#99 switching layouts never drops content',()=>{
 const mods=R.seedModules('little-moments',ids);
 const memory=mods.find(m=>m.type==='memories');memory.content.items.push({id:'m1',title:'Beach day',text:'Salt and sun',caption:'',photos:[]});
 const lessons=mods.find(m=>m.type==='guided'&&m.content.prompt==='lessons');lessons.content.entries.push({id:'l1',text:'Rest is productive'});
 const writing=R.newModule('writing','w1');writing.content.text='A long note';mods.push(writing);
 const plan=R.switchLayout(mods,'weekly-favorites',ids);
 const all=JSON.stringify(plan.modules);
 for(const text of ['Beach day','Rest is productive','A long note'])assert.ok(all.includes(text),text);
 assert.ok(plan.carried.length>=2,'unmatched content is carried over after the new sections');
 assert.ok(plan.modules.some(m=>m.type==='level10'));
 const intoMatching=R.switchLayout(R.seedModules('weekly-favorites',ids).map(m=>m.type==='music'?{...m,content:{items:[{id:'s',title:'Song',artist:'',note:''}]}}:m),'monthly-edit',ids);
 assert.equal(intoMatching.merged,1,'music fills the new layout’s empty music section');assert.equal(intoMatching.carried.length,0);
});

test('#99 independence: media in a reflection never touches Collections or Bookshelf; images stay private',()=>{
 const ui=read('components/planner/reflections/Reflections.tsx');
 assert.doesNotMatch(ui,/collections\/persistence|saveMedia|whimsy\/persistence|saveWhimsyRecord|usePlanner|useWellness/,'Reflections writes nothing elsewhere');
 assert.match(ui,/uploadBoardImage\(userId, reviewId, file, \{ allowJpeg: true \}\)/,'existing private, owner-folder image storage');
 assert.match(ui,/Listen elsewhere ↗/);assert.doesNotMatch(ui,/aria-label="Play|>▶</,'no fake playback controls');
 const imgs=R.moduleImages({type:'memories',content:{items:[{photos:[{id:'p',path:'u/r/p.webp',thumbnailPath:'u/r/p.thumb.webp',alt:''},{id:'q',url:'https://x.test/q.jpg',alt:''}]}]}});
 assert.equal(R.storedImages(imgs).length,1,'only uploaded images are cleaned up from storage');
});

test('#99 Planner tab, export and migration: owner-only, structured, independent ratings with stable areas',()=>{
 assert.match(read('components/planner/Planner.tsx'),/tab === "reflections" && <Reflections /);
 assert.match(read('app/api/account/export/route.ts'),/reflections:\{reviews:reflectionReviews\.data,lifeAreas:lifeAreas\.data,lifeRatings:lifeRatings\.data\}/);
 const sql=read('supabase/migrations/20261125000100_reflections.sql');
 assert.doesNotMatch(sql,/drop |delete from|truncate/i);
 for(const t of ['reflection_reviews','life_areas','life_ratings'])assert.match(sql,new RegExp(`'${t}'`));
 assert.match(sql,/unique \(user_id, period, period_start\)/);assert.match(sql,/unique \(user_id, area_id, period, period_start\)/);
 assert.match(sql,/foreign key \(user_id, area_id\) references public\.life_areas \(user_id, id\) on delete restrict/,'areas keep their history');
 assert.match(sql,/rating smallint not null check \(rating between 1 and 10\)/);
 assert.equal(R.defaultLifeAreas.length,10);assert.equal(new Set(R.defaultLifeAreas.map(a=>a.color)).size,10);
});
