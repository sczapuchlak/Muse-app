import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {load,root} from './helpers.mjs';
const read=p=>readFileSync(resolve(root,p),'utf8');
const B=load('lib/lists/blocks'),A=load('lib/lists/areas'),M=load('lib/lists/model');
const block=(id,extra={})=>({id,listId:'L',sectionId:'S',kind:'note',position:0,width:'full',data:{},createdAt:'2026-11-01',updatedAt:'',...extra});
const item=(id,extra={})=>({id,listId:'L',sectionId:'S',title:id,position:0,createdAt:'2026-11-01',completedAt:null,schedule:null,...extra});

test('Spaces layout: half blocks pair up and a lone half block fills its row (no holes)',()=>{
 const spans=B.placeBlocks([{width:'half'},{width:'half'},{width:'half'},{width:'full'},{width:'half'}]).map(b=>b.span);
 assert.deepEqual(spans,[1,1,2,2,2]);
 assert.deepEqual(B.placeBlocks([{width:'half'},{width:'half'}]).map(b=>b.span),[1,1]);
});
test('Spaces links: only http(s) ever becomes clickable; bare addresses become https',()=>{
 assert.equal(B.safeHref('javascript:alert(1)'),null);
 assert.equal(B.safeHref('data:text/html,hi'),null);
 assert.equal(B.safeHref('mailto:a@b.c'),null);
 assert.equal(B.safeHref('instagram.com/p/x'),'https://instagram.com/p/x');
 assert.equal(B.safeHref('http://example.com'),'http://example.com/');
 assert.equal(B.siteName('https://www.pinterest.com/pin/1'),'Pinterest');
 assert.equal(B.normalizeData('link',{url:'javascript:alert(1)'}).url,'');
});
test('Spaces cards: presets only choose starting fields; any stored shape reads safely',()=>{
 const c=B.newCard('flight');assert.ok(c.fields.some(f=>f.id==='from')&&c.fields.every(f=>f.value===''));assert.ok(B.cardIsEmpty(c));
 const odd=B.normalizeData('card',{preset:'nope',fields:[{id:'x',label:'',type:'weird',value:7},{nolabel:true}]});
 assert.equal(odd.preset,'info');assert.equal(odd.fields.length,1);assert.equal(odd.fields[0].type,'text');assert.equal(odd.fields[0].label,'Detail');
 assert.equal(B.clock('15:15'),'3:15 PM');assert.ok(B.nextDay('15:15','11:10'));assert.equal(B.nightsBetween('2027-10-11','2027-10-13'),2);
 const costs=B.cardCosts([block('a',{kind:'card',data:{preset:'flight',title:'',fields:[{id:'cost',type:'money',value:'612.40'}]}}),block('b',{kind:'card',data:{preset:'stay',title:'',fields:[{id:'cost',type:'money',value:'$88.50'}]}})]);
 assert.equal(Math.round(costs.total*100),70090);assert.equal(costs.count,2);
});
test('Spaces areas: older items without a checklist show in a virtual one, and join the first real checklist once it exists',()=>{
 let v=A.areaView('L','S',[],[item('a'),item('b',{position:1})]);
 assert.equal(v.blocks.length,1);assert.ok(v.blocks[0].virtual);assert.deepEqual(v.itemsOf.get(v.blocks[0].id).map(i=>i.id),['a','b']);
 v=A.areaView('L','S',[block('n',{position:0}),block('c1',{kind:'checklist',position:1}),block('c2',{kind:'checklist',position:2})],[item('a'),item('b',{blockId:'c2'})]);
 assert.deepEqual(v.blocks.map(b=>b.id),['n','c1','c2'],'no virtual checklist once a real one can hold the items');
 assert.deepEqual(v.itemsOf.get('c1').map(i=>i.id),['a']);assert.deepEqual(v.itemsOf.get('c2').map(i=>i.id),['b']);
 assert.equal(A.areaView('L',null,[],[],false).blocks.length,0,'an empty top area stays hidden when sections exist');
 assert.equal(A.blockOfItem(item('z',{blockId:'gone'}),[block('c1',{kind:'checklist'})]),'c1','an item pointing at a deleted checklist falls back to the first one');
});
test('Spaces copies carry blocks with new ids, remapped sections and checklists, and no ticks',()=>{
 const b={list:{id:'L',title:'Trip',isTemplate:false,fields:[]},sections:[{id:'S',listId:'L',title:'Flights',position:0}],
  blocks:[block('C',{kind:'checklist'}),block('F',{kind:'card',data:{preset:'flight',title:'Mine',fields:[{id:'from',label:'From',type:'text',value:'LAX'}]}}),block('V',{kind:'checklist',virtual:true})],
  items:[item('I',{blockId:'C',completedAt:'x',completedOn:'2026-11-01'})]};
 let n=0;const c=M.copyBundle(b,{title:'Trip template',isTemplate:true,today:'2026-11-25',id:()=>'n'+(++n)});
 assert.equal(c.blocks.length,2,'virtual checklists are never copied as records');
 assert.ok(c.blocks.every(x=>x.listId===c.list.id&&x.sectionId===c.sections[0].id&&!['C','F'].includes(x.id)));
 assert.equal(c.items[0].blockId,c.blocks.find(x=>x.kind==='checklist').id);assert.equal(c.items[0].completedAt,null);
 c.blocks[1].data.fields[0].value='CDG';assert.equal(b.blocks[1].data.fields[0].value,'LAX','the source card is untouched');
});
test('Spaces templates: the trip opens with useful sections and empty cards, not placeholder content',()=>{
 const trip=M.starters.find(s=>s.id==='trip');
 assert.deepEqual(trip.sections.map(s=>s.title),['Trip details','Flights','Stays','Getting around','Itinerary','Places & ideas','Packing','Inspiration']);
 const card=M.starterCard({kind:'card',preset:'info',title:'Good to know',labels:['Currency']});assert.equal(card.fields[0].label,'Currency');assert.equal(card.fields[0].value,'');
 assert.equal(M.starters.find(s=>s.id==='checklist').sections.length,0);assert.ok(M.starters.find(s=>s.id==='home').sections.every(s=>s.items.every(i=>typeof i!=='string'&&i.repeat)),'the cleaning routine keeps a schedule on every task');
});
test('Spaces migration is additive: new table with owner RLS, nullable item link, cover column; nothing dropped or renamed',()=>{
 const sql=read('supabase/migrations/20270115000100_spaces_blocks.sql');
 assert.doesNotMatch(sql,/\bdrop\b|\brename\b|\bdelete from\b|\bupdate public\./i);
 assert.match(sql,/create table public\.list_blocks/);assert.match(sql,/enable row level security/);assert.match(sql,/revoke all on public\.list_blocks from public, anon/);
 assert.match(sql,/grant execute on function muse_private\.valid_list_block\(text, jsonb\) to authenticated/);
 assert.match(sql,/add column block_id uuid;/);assert.match(sql,/on delete set null \(block_id\)/);assert.match(sql,/add column cover jsonb/);
});
test('Spaces notes store theme tones, never raw colours, and export includes blocks',()=>{
 const marks=read('components/lists/richMarks.ts');assert.match(marks,/tones = \["1", "2", "3", "4", "5", "6"\]/);assert.doesNotMatch(marks,/style=/);
 assert.match(read('app/api/account/export/route.ts'),/blocks:listBlocks\.data\?\?\[\]/);
 const css=read('components/lists/Spaces.css');for(const m of css.matchAll(/(-webkit-)?backdrop-filter:[^;}]+[;}]\s*(-webkit-)?backdrop-filter/g))assert.ok(m[0].startsWith('-webkit-'),'-webkit- blur comes first');
});
