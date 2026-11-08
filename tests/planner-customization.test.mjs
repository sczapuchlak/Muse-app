import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const C=load('lib/planner-customization'),L=load('lib/agenda-layout'),M=load('lib/muse-marks');
const read=f=>readFileSync(resolve(root,f),'utf8');

test('#87 paints: solid or gradient, validated; curated gradients are all valid',()=>{
 assert.deepEqual(C.parsePaint({kind:'solid',color:'pop'}),{kind:'solid',color:'pop'});
 assert.deepEqual(C.parsePaint({kind:'solid',color:'#AABBCC'}),{kind:'solid',color:'#AABBCC'});
 assert.equal(C.parsePaint({kind:'solid',color:'red'}),undefined);
 assert.equal(C.parsePaint({kind:'gradient',gradient:{colors:['#ffffff'],angle:90}}),undefined,'one stop is not a gradient');
 assert.deepEqual(C.parsePaint({kind:'gradient',gradient:{colors:['#111111','#222222','#333333','#444444'],angle:33}}),{kind:'gradient',gradient:{colors:['#111111','#222222','#333333'],angle:135}},'max three stops; unknown angle falls back');
 for(const g of C.curatedGradients)assert.ok(C.parseGradient(g.gradient),g.id);
 assert.equal(C.paintAccent({kind:'gradient',gradient:{colors:['#123456','#654321'],angle:90}}),'#123456');
 for(const c of C.markCollections)for(const m of c.marks)assert.ok(C.parseMarkStyle({...m,id:'x-1'}),`${c.id}/${m.name}`);
});

test('#87 Marks: gradient + meaning round-trip, color keeps a solid fallback, bad gradients are dropped',()=>{
 const row=M.markToRow({id:'m1',date:'2026-11-10',icon:'suitcase',color:'primary',gradient:{colors:['#ff7aa2','#ffd166'],angle:135},meaning:'  Vacation  ',label:'Trip'});
 assert.equal(row.color,'#ff7aa2','first stop is the fallback color');
 assert.deepEqual(row.gradient,{colors:['#ff7aa2','#ffd166'],angle:135});
 assert.equal(row.meaning,'Vacation');
 const back=M.markFromRow({...row,revision:1});
 assert.deepEqual(back.gradient,{colors:['#ff7aa2','#ffd166'],angle:135});assert.equal(back.meaning,'Vacation');
 const plain=M.markFromRow({id:'m2',local_date:'2026-11-10',end_date:null,icon:'star',color:'pop',gradient:{colors:['nope']},meaning:null,label:'',link_kind:null,link_id:null,revision:1});
 assert.equal(plain.gradient,undefined);assert.equal(plain.meaning,undefined);
 assert.equal(M.markToRow({id:'m3',date:'2026-11-10',icon:'star',color:'pop',label:''}).gradient,null);
});

test('#87 library: parse limits, saved Marks/palette/sections, duplicates are independent',()=>{
 let lib=C.emptyLibrary();
 lib=C.changeLibrary(lib,{type:'mark/save',style:{id:'mark-a',name:'Vacation',icon:'suitcase',paint:{kind:'solid',color:'#ff7aa2'},meaning:'Time off'}});
 lib=C.changeLibrary(lib,{type:'palette/color',color:'#ABCDEF'});lib=C.changeLibrary(lib,{type:'palette/color',color:'#abcdef'});
 assert.deepEqual(lib.palette.colors,['#abcdef'],'saved colors are unique');
 lib=C.changeLibrary(lib,{type:'palette/gradient',gradient:{colors:['#111111','#222222'],angle:90}});
 const saved={id:'saved-a',name:'Packing list',type:'checklist',title:'Packing',starter:['Passport','Charger'],style:{background:{kind:'gradient',gradient:C.curatedGradients[0].gradient},opacity:99,sticker:'sun'}};
 lib=C.changeLibrary(lib,{type:'section/save',section:saved});
 assert.equal(lib.savedSections[0].style.opacity,C.MAX_OPACITY,'opacity is capped for contrast');
 lib=C.changeLibrary(lib,{type:'section/duplicate',id:'saved-a',newId:'saved-b'});
 assert.deepEqual(lib.savedSections.map(s=>s.name),['Packing list','Packing list copy']);
 const reparsed=C.parseLibrary(JSON.parse(JSON.stringify(lib)));assert.deepEqual(reparsed,lib,'survives a save round-trip');
 assert.equal(C.parseLibrary({savedSections:[{id:'bad id!',name:'x',type:'checklist'},{id:'ok',name:'Tasks?',type:'tasks'}]}).savedSections.length,0,'only checklist, list and notes can be saved');
 assert.equal(C.filterSaved(lib.savedSections,'charger').length,2);
 lib=C.changeLibrary(lib,{type:'mark/remove',id:'mark-a'});assert.equal(lib.markStyles.length,0);
});

test('#87 layout: new section types, style, hide/show, duplicate and insert keep content separate and permanent sections safe',()=>{
 let layout=L.defaultLayout();
 for(const type of ['checklist','list','notes'])assert.ok(L.repeatable(type)&&L.hasContent(type),type);
 layout=L.changeLayout(layout,{type:'add',section:{id:'checklist-a',type:'checklist'}});
 layout=L.changeLayout(layout,{type:'update',id:'checklist-a',patch:{starter:['Passport','',' Charger '],style:{background:{kind:'solid',color:'warm'},opacity:2,header:'pill',divider:'flourish',sticker:'heart',bogus:1},title:'Packing'}});
 const c=layout.sections.find(s=>s.id==='checklist-a');
 assert.deepEqual(c.starter,['Passport','Charger']);
 assert.deepEqual(c.style,{background:{kind:'solid',color:'warm'},opacity:C.MIN_OPACITY,header:'pill',divider:'flourish',sticker:'heart'});
 // hide/show: only optional sections; hidden ones stay in the template
 layout=L.changeLayout(layout,{type:'update',id:'checklist-a',patch:{hidden:true}});
 layout=L.changeLayout(layout,{type:'update',id:'events',patch:{hidden:true}});
 assert.deepEqual(L.visibleSections(layout).map(s=>s.id),['events','tasks']);
 assert.equal(layout.sections.length,3);
 // duplicate: new id, visible, right after, "copy" title, same style
 layout=L.changeLayout(layout,{type:'duplicate',id:'checklist-a',newId:'checklist-b'});
 const dup=layout.sections[3];assert.equal(dup.id,'checklist-b');assert.equal(dup.title,'Packing copy');assert.equal(dup.hidden,undefined);assert.deepEqual(dup.style,c.style);
 assert.equal(L.changeLayout(layout,{type:'duplicate',id:'events',newId:'events-2'}),layout,'one Events section only');
 // insert (from a saved section) and removal of the template elsewhere never touches the layout
 layout=L.changeLayout(layout,{type:'insert',section:{id:'list-z',type:'list',title:'Places',size:'standard',starter:['Museum'],savedFrom:'saved-a'}});
 assert.equal(layout.sections.at(-1).savedFrom,'saved-a');
 // style reset
 layout=L.changeLayout(layout,{type:'update',id:'checklist-a',patch:{style:undefined}});assert.equal(layout.sections.find(s=>s.id==='checklist-a').style,undefined);
 assert.deepEqual(L.parseLayout(JSON.parse(JSON.stringify(layout))),layout,'survives a save round-trip');
 assert.equal(L.MAX_SECTIONS,24);
});

test('#87 checklist items: parsed, bounded, starter copies are fresh and unchecked, uncheck all',()=>{
 const items=C.parseItems([{id:'a',text:' Passport ',done:true},{id:'a',text:'dupe',done:false},{id:'b',text:'',done:false},{id:'c',text:'x'.repeat(500),done:'yes'}]);
 assert.deepEqual(items.map(i=>[i.id,i.text.length,i.done]),[['a',8,true],['c',C.MAX_ITEM_TEXT,false]]);
 let n=0;const fresh=C.starterItems(['Passport','Charger'],()=>`id-${n++}`);
 assert.deepEqual(fresh,[{id:'id-0',text:'Passport',done:false},{id:'id-1',text:'Charger',done:false}]);
 assert.ok(C.uncheckAll(items).every(i=>!i.done));
 assert.equal(C.parseItems(Array.from({length:99},(_,i)=>({id:`i${i}`,text:'x',done:false}))).length,C.MAX_ITEMS);
});

test('#87 custom sections stay Planner-only, deletion is confirmed, decoration stays separate from Marks',()=>{
 const sections=read('components/planner/AgendaSections.tsx'),items=sections.slice(sections.indexOf('function ItemsSection'));
 assert.doesNotMatch(items,/usePlanner|dispatch|useRituals|useWellness/,'checklist items never touch tasks, habits or wellness');
 assert.match(items,/setNote\(/);
 const editor=read('components/planner/LayoutEditor.tsx');
 assert.match(editor,/Remove, keep what I wrote/);assert.match(editor,/Delete section and its content/);
 assert.match(editor,/Delete this template\? Sections already in your Planner stay/);
 assert.match(editor,/Insert blank/);
 const lib=read('lib/planner-customization.ts');
 assert.doesNotMatch(lib.slice(lib.indexOf('export const stickers'),lib.indexOf('export type StickerId')),/markIcons|MuseIcon/,'stickers are ornaments, not Mark icons');
 const css=read('components/planner/Agenda.css');
 assert.match(css,/\.muse-agenda-section\[data-painted\]::before\{[^}]*opacity:var\(--section-paint-opacity/,'paint has its own layer so text keeps full contrast');
 assert.match(css,/\.muse-mark\[data-paint=gradient\]/);
});

test('#87 migration: additive, owner-only library, bounded content',()=>{
 const sql=read('supabase/migrations/20261123000100_planner_customization.sql');
 assert.match(sql,/add column gradient jsonb/);assert.match(sql,/add column meaning text check \(char_length\(meaning\) <= 200\)/);
 assert.match(sql,/add column items jsonb not null default '\[\]'/);
 assert.match(sql,/between 2 and 24/);
 assert.match(sql,/create table public\.planner_customizations/);
 assert.match(sql,/enable row level security/);assert.match(sql,/revoke all on public\.planner_customizations from public, anon, authenticated/);
 for(const p of ['owner_read','owner_insert','owner_update','owner_delete'])assert.match(sql,new RegExp(`create policy ${p} on public\\.planner_customizations`));
 assert.doesNotMatch(sql,/drop table|drop column|delete from/i,'nothing existing is removed');
});

test('#87 the customization library is in the personal data export',()=>{
 const route=read('app/api/account/export/route.ts');
 assert.match(route,/client\.from\('planner_customizations'\)\.select\('\*'\)/);assert.match(route,/customizationLibrary:plannerCustomizations\.data/);
 assert.match(route,/plannerCustomizations\.error(?:\|\|[A-Za-z.]+)*\)throw/);
});
