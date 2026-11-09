import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';
const read=f=>readFileSync(resolve(root,f),'utf8');

test('#12 Bucket List: choosing a number moves the dream there; the dreams between shift by one',()=>{
 const {renumberShift,byPosition}=load('lib/bucket-list/logic');
 const e=(id,number,position)=>({id,number,position,createdAt:''});
 const entries=[e('a',1,1),e('b',2,2),e('c',3,3),e('d',4,4),e('x',null,5)];
 const up=renumberShift(entries,{id:'d',number:2});
 assert.deepEqual(up.shifts,[{id:'c',number:4},{id:'b',number:3}],'moving up pushes 2–3 down, highest first so numbers stay unique');
 assert.ok(up.position>1&&up.position<2,'and the card lands between No. 1 and the old No. 2');
 const down=renumberShift(entries,{id:'a',number:3});
 assert.deepEqual(down.shifts,[{id:'b',number:1},{id:'c',number:2}],'moving down pulls 2–3 up, lowest first');
 const after=entries.map(x=>({...x,...(down.shifts.find(s=>s.id===x.id)??{}),...(x.id==='a'?{number:3,position:down.position}:{})})).sort(byPosition);
 assert.deepEqual(after.filter(x=>x.number).map(x=>x.number),[1,2,3,4],'visual order and numbers agree');
 assert.equal(renumberShift(entries,{id:'b',number:2}),null,'unchanged');
 assert.equal(renumberShift(entries,{id:'b',number:null}),null);
 assert.deepEqual(renumberShift(entries,{id:'b',number:9}).shifts,[],'a free number moves the card without renumbering others');
 const gap=renumberShift([e('a',1,1),e('b',2,2),e('c',5,3),e('n',null,4)],{id:'n',number:2});
 assert.deepEqual(gap.shifts,[{id:'b',number:3}],'a gap in the numbers absorbs the shift');
 assert.match(read('components/rituals/bucket/useBucketList.ts'),/number:null\}\)[\s\S]*for\(const s of shift\?\.shifts[\s\S]*position:shift\.position/,'cleared first, then shifted, then placed');
});

test('#98 Mindspace board: arrangement, moves, sizes and independent duplicates',()=>{
 const B=load('lib/mindspace-board');
 const id=n=>`0000000${n}-0000-0000-0000-000000000000`;
 const cards=[{id:id(1),createdAt:'2026-11-01'},{id:id(2),createdAt:'2026-11-02'},{id:id(3),createdAt:'2026-11-03'}];
 assert.deepEqual(B.arrange(cards,[id(2),id(1)]).map(c=>c.id),[id(3),id(2),id(1)],'unplaced (new) cards first, then your order');
 assert.deepEqual(B.moveCard([id(3),id(2),id(1)],[id(2),id(1),id(9)],id(1),0),[id(1),id(3),id(2),id(9)],'hidden (filtered) cards keep their place');
 const parsed=B.parseBoardLayout({order:[id(1),id(1),'bad'],sizes:{[id(1)]:'wide',[id(2)]:'standard',[id(3)]:'huge'},tagPaints:{[id(1)]:{kind:'solid',color:'pop'},[id(2)]:{kind:'nope'}},settings:{showDates:false}});
 assert.deepEqual(parsed,{order:[id(1)],sizes:{[id(1)]:'wide'},tagPaints:{[id(1)]:{kind:'solid',color:'pop'}},settings:{showDates:false,compactText:false}});
 const card={id:id(1),title:'Ideas',text:'t',items:[{id:'i1',text:'x',complete:true}],images:[{id:'img'}],tagIds:['t1'],pinned:true,accent:'pop',createdAt:'a',updatedAt:'a'};
 let n=0;const copy=B.duplicateCard(card,id(7),'now',()=>`new-${n++}`);
 assert.equal(copy.id,id(7));assert.equal(copy.title,'Ideas (copy)');assert.deepEqual(copy.images,[],'images stay with the original');
 assert.equal(copy.items[0].id,'new-0');assert.equal(copy.items[0].complete,true);assert.equal(copy.pinned,false);
 copy.tagIds.push('t2');assert.deepEqual(card.tagIds,['t1'],'the original is untouched');
});

test('#98 Stream tags: posts keep a validated snapshot; Thriving fits on one line; Listening holds only albums',()=>{
 const T=load('lib/stream/tags'),M=load('lib/stream/model');
 assert.deepEqual(T.parseTagSnapshot({id:'x',name:'  Main character energy and then some ',icon:'✨',paint:{kind:'solid',color:'#e85d75'}}),{id:'x',name:'Main character energy an',icon:'✨',paint:{kind:'solid',color:'#e85d75'}});
 assert.equal(T.parseTagSnapshot({name:'   '}),null);assert.equal(T.parseTagSnapshot({name:'ok',paint:{kind:'bad'}}).paint,undefined);
 assert.equal(M.decorations.find(d=>d.id==='thriving').label,'Thriving');
 const watching=M.shortcuts.find(s=>s.id==='watching'),listening=M.shortcuts.find(s=>s.id==='listening');
 assert.ok(watching.only('Movies')&&!watching.only('Albums'));assert.ok(listening.only('Albums')&&!listening.only('Games'));
 assert.equal(M.activityVerb('listening',null),'is listening to');assert.equal(M.cardTone({kind:'activity',category:'listening'}),'literary');
 assert.match(read('components/stream/StreamComposer.tsx'),/setPostTag\(client,post\.id,customTag\)/);
});

test('#98 albums: a Collections kind with its own statuses, artist, favorite tracks and listening share',()=>{
 const C=load('lib/collections/models');
 assert.deepEqual(Object.keys(C.mediaStatusLabels.album),['planned','listening','listened']);
 assert.deepEqual(C.activeMediaItems([{kind:'album',status:'listening'},{kind:'album',status:'listened'},{kind:'movie',status:'watching'}],'album').length,1);
 const lib=read('components/collections/MediaLibrary.tsx');
 assert.match(lib,/album:'Artist'/);assert.match(lib,/favorite_tracks:form\.tracks/);assert.match(lib,/category=\{kind==='album'\?'listening':'watching'\}/);
 assert.match(read('lib/profile/adapters.ts'),/album:'Albums'/,'albums can be featured through the existing profile showcase');
});

test('#98 credits list only required attribution openly; software notices are collapsed; CosmyDay stays with forecasts',()=>{
 const {contentCredits,softwareCredits}=load('lib/credits');
 const names=contentCredits.map(c=>c.name);
 assert.ok(names.includes('HeartYearning Dream Symbols Dataset')&&names.includes('CosmyDay'));
 assert.ok(!names.some(n=>/Rider|Open Library/.test(n)),'courtesy-only mentions removed');
 assert.ok(softwareCredits.some(c=>c.name==='Lucide icons'));
 assert.match(read('components/Settings.tsx'),/<details className="muse-credits muse-credits-software">/);
 assert.match(read('components/astrology/ForecastReading.tsx'),/Forecast by <a href=\{forecast\.sourceUrl\}/,'CosmyDay terms: a visible link wherever the data appears');
 assert.match(read('components/CosmicForecast.tsx'),/className="muse-cosmic-pref-link"/);
});

test('#98 UI fixes: shared search, Muse dropdowns, Dream sources, saved meals, sign-in loading',()=>{
 assert.match(read('components/design/MuseSearch.tsx'),/muse-search muse-edge/);
 assert.match(read('app/design-language.css'),/\.muse-search\.muse-search input:is\(\[type=search\],\[type=text\]\)/);
 assert.doesNotMatch(read('components/whimsy/TarotExperience.tsx'),/noun=\{\["card","cards"\]\}/,'no duplicate count inside the Grimoire search');
 for(const f of ['components/rituals/aspirations/Aspirations.tsx','components/rituals/aspirations/AspirationEditor.tsx'])assert.doesNotMatch(read(f),/<select/,`${f} uses Muse dropdowns`);
 assert.doesNotMatch(read('components/whimsy/dreams/DreamLibrary.tsx'),/aria-label="Source"/);
 const nourish=read('components/nourish/Nourish.tsx');assert.match(nourish,/muse-saved-meals-drawer/);assert.doesNotMatch(nourish,/label:"Saved Meals"/);
 const signin=read('components/auth/SignInSettings.tsx');assert.match(signin,/passkey_disabled/);assert.match(signin,/Each source loads on its own/);
});

test('#98 migration: additive, owner-only new tables, tag snapshot set only by the author',()=>{
 const sql=read('supabase/migrations/20261124000100_ui_cleanup_1.sql');
 assert.doesNotMatch(sql,/drop table|drop column|delete from|truncate/i);
 for(const t of ['stream_tags','notes_board'])assert.match(sql,new RegExp(`'${t}'`));
 assert.match(sql,/revoke all on public\.%I from public, anon, authenticated/);
 assert.match(sql,/update public\.stream_posts set tag = clean where id = p_id and author = uid/);
 assert.match(sql,/kind = 'album' and status = any \(array\['planned','listening','listened'\]\)/);
 assert.match(sql,/\('listening','media'\)/);assert.match(sql,/'tag', p\.tag/);
});
