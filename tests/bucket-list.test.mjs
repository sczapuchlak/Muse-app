import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const L=load('lib/bucket-list/logic');
const M=load('lib/bucket-list/models');
const read=f=>readFileSync(resolve(root,f),'utf8');
const today='2026-11-06';
let n=0;
const entry=(o={})=>({id:`e${++n}`,number:n,position:n,title:`Dream ${n}`,notes:null,category:null,tags:[],icon:null,status:'dreaming',targetYear:null,links:[],cover:null,aspirationId:null,
 completedOn:null,completion:{},history:[],archivedAt:null,revision:1,createdAt:`2026-01-0${(n%9)+1}T00:00:00Z`,updatedAt:'2026-01-01T00:00:00Z',...o});

test('year colors are stable, stored, and paired with a pattern',()=>{
 const list=L.defaultList(today);
 assert.equal(list.horizonStart,2026);assert.equal(list.horizonEnd,2035);
 assert.equal(Object.keys(list.yearColors).length,10);
 assert.equal(L.yearColor(list,2027),L.defaultYearColor(2027));
 assert.equal(L.defaultYearColor(2027),L.defaultYearColor(2027),'depends only on the year');
 assert.notEqual(L.defaultYearColor(2026),L.defaultYearColor(2027));
 assert.notEqual(L.yearPattern(2026),L.yearPattern(2027));
 const custom={...list,yearColors:{...list.yearColors,2027:'#123456'}};
 assert.equal(L.yearColor(custom,2027),'#123456');
 assert.equal(L.withYearColor(list,2026),null,'already stored');
 assert.equal(L.withYearColor(list,2019).yearColors['2019'],L.defaultYearColor(2019),'first use saves the year');
 assert.equal(L.shortYear(2026),'’26');
});

test('legend shows the horizon plus every year with a completion',()=>{
 const list=L.defaultList(today,3);
 assert.deepEqual(L.legendYears(list,[entry({status:'completed',completedOn:'2019-05-01'})]),[2019,2026,2027,2028]);
});

test('completing records the date; reopening keeps history and the story',()=>{
 const e=entry({targetYear:2027,completion:{story:'old'}});
 const done=L.completeEntry(e,'2026-07-04',{location:'Lisbon'});
 assert.equal(done.status,'completed');assert.equal(done.completedOn,'2026-07-04');
 assert.deepEqual(done.completion,{story:'old',location:'Lisbon'});
 const open=L.reopenEntry(done,today);
 assert.equal(open.status,'planned','a target year returns it to Planned');
 assert.equal(open.completedOn,null);
 assert.deepEqual(open.history,[{completedOn:'2026-07-04',reopenedOn:today}]);
 assert.equal(open.completion.location,'Lisbon','the story is not lost');
 assert.equal(L.reopenEntry(entry(),today).status,'dreaming');
});

test('row mapping keeps status and completion date consistent',()=>{
 const row=M.entryToRow(entry({status:'completed',completedOn:null}));
 assert.equal(row.status,'dreaming');assert.equal(row.completed_on,null);
 const ok=M.entryToRow(entry({status:'completed',completedOn:'2026-02-02',tags:['#beach',' beach','food']}));
 assert.equal(ok.status,'completed');assert.deepEqual(ok.tags,['beach','food']);
 const back=M.entryFromRow({...ok,user_id:'u',revision:2,created_at:'x',updated_at:'y',links:[{kind:'url',url:'https://x.test'},{kind:'nope'},{kind:'constellation',id:'c1'}],completion:{story:' ',photos:[{bad:1}]}});
 assert.deepEqual(back.links,[{kind:'url',url:'https://x.test'},{kind:'constellation',id:'c1'}]);
 assert.deepEqual(back.completion,{});
});

test('numbers are permanent and never reused; positions append',()=>{
 assert.equal(L.nextNumber([{number:3},{number:null},{number:9}]),10);
 assert.equal(L.nextNumber([]),1);
 assert.equal(L.nextPosition([{position:2},{position:7.5}]),8.5);
});

test('moving an entry writes one position between its neighbors',()=>{
 const list=[entry({id:'a',position:1}),entry({id:'b',position:2}),entry({id:'c',position:3})];
 const [moved,...rest]=L.moveEntry(list,'c',0);
 assert.equal(rest.length,0);assert.equal(moved.id,'c');assert.ok(moved.position<1);
 const mid=L.moveEntry(list,'a',1);assert.equal(mid[0].position,2.5);
 assert.deepEqual(L.moveEntry(list,'b',1),[]);
 const crowded=[entry({id:'x',position:1}),entry({id:'y',position:1+1e-9}),entry({id:'z',position:2})];
 const renumbered=L.moveEntry(crowded,'z',1);
 assert.ok(renumbered.length>=2,'renumbers when there is no room');
 assert.deepEqual(renumbered.find(e=>e.id==='z').position,2);
});

test('search, filters and sorts',()=>{
 const a=entry({id:'a',title:'See the northern lights',category:'Travel',tags:['iceland'],targetYear:2028}),b=entry({id:'b',title:'Learn to surf',status:'completed',completedOn:'2026-08-01',category:'Skills'}),c=entry({id:'c',title:'Archived',archivedAt:'2026-01-01'});
 const f=L.emptyFilter();
 assert.deepEqual([a,b,c].filter(e=>L.matches(e,f)).map(e=>e.id),['a','b']);
 assert.deepEqual([a,b,c].filter(e=>L.matches(e,{...f,archived:true})).map(e=>e.id),['c']);
 assert.deepEqual([a,b].filter(e=>L.matches(e,{...f,query:'#iceland'})).map(e=>e.id),['a']);
 assert.deepEqual([a,b].filter(e=>L.matches(e,{...f,years:[2026]})).map(e=>e.id),['b']);
 assert.deepEqual([a,b].filter(e=>L.matches(e,{...f,statuses:['dreaming']})).map(e=>e.id),['a']);
 assert.equal(L.activeFilterCount({...f,tags:['x'],years:[2026]}),2);
 assert.deepEqual(L.sortEntries([a,b],'title').map(e=>e.id),['b','a']);
 assert.deepEqual(L.sortEntries([b,a],'target').map(e=>e.id),['a','b'],'someday last');
 assert.deepEqual(L.allCategories([a,b]),['Skills','Travel']);
});

test('timeline groups completions and hopes by year, and keeps Someday unforced',()=>{
 const t=L.timeline([entry({id:'done',status:'completed',completedOn:'2026-03-01',targetYear:2030}),entry({id:'hope',targetYear:2028}),entry({id:'any'}),entry({id:'old',status:'completed',completedOn:'2021-01-01'})],[2026,2027,2028]);
 assert.deepEqual(t.years.map(y=>y.year),[2021,2026,2027,2028]);
 assert.deepEqual(t.years.find(y=>y.year===2026).completed.map(e=>e.id),['done']);
 assert.deepEqual(t.years.find(y=>y.year===2028).hoped.map(e=>e.id),['hope']);
 assert.deepEqual(t.someday.map(e=>e.id),['any']);
 assert.ok(!t.years.some(y=>y.year===2030),'a completed dream is shown where it happened, not where it was hoped');
});

test('stats and trends are counts, not a pressure score',()=>{
 const list=[entry({status:'completed',completedOn:'2026-03-01',category:'Travel'}),entry({status:'completed',completedOn:'2025-03-01'}),entry({status:'in_progress'})];
 const s=L.bucketStats(list);
 assert.equal(s.completed,2);assert.equal(s.inProgress,1);assert.equal(s.byYear.get(2026),1);
 assert.ok(!('percent' in s));
 const t=L.bucketTrends(list,'2026-01-01','2026-12-31');
 assert.equal(t.completed.length,1);assert.deepEqual(t.byCategory,[{category:'Travel',count:1}]);
});

test('migration is owner-only and keeps aspiration links independent',()=>{
 const sql=read('supabase/migrations/20261120000100_bucket_list.sql');
 for(const t of ['bucket_lists','bucket_entries']){
  assert.match(sql,new RegExp(`alter table public.${t} enable row level security`));
  for(const p of ['owner_read','owner_insert','owner_update','owner_delete'])assert.match(sql,new RegExp(`create policy ${p} on public.${t}`));
 }
 assert.match(sql,/aspiration_id uuid references public.aspirations on delete set null/);
 assert.match(sql,/revoke all on public.bucket_lists, public.bucket_entries from public, anon, authenticated/);
 assert.doesNotMatch(sql,/to anon/);
});

test('Rituals has Habits | Aspirations | Bucket List tabs; Insights and export include the list',()=>{
 const rituals=read('components/rituals/Rituals.tsx');
 assert.match(rituals,/\{ id: "bucket", label: "Bucket List", href: "\/rituals\?view=bucket" \}/);
 assert.match(read('components/insights/Insights.tsx'),/<BucketInsights range=\{range\} today=\{today\}\/>/);
 assert.match(read('app/api/account/export/route.ts'),/client\.from\('bucket_entries'\)\.select\('\*'\)/);
 assert.match(read('components/rituals/bucket/BucketList.tsx'),/muse-today-ring/,'the selected year uses the shared rainbow ring');
});
