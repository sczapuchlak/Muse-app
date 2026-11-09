import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';
const read=f=>readFileSync(resolve(root,f),'utf8');

test('#112 movement: Completed is the record; Skipped/Rest/Sick are outcomes; nothing is inferred',()=>{
 const W=load('lib/wellness'),S=load('lib/movement-status');
 let s={...W.emptyWellness(),movement:[{date:'2026-11-09',typeIds:['walk','strength']}]};
 assert.deepEqual(S.movementRows(s.movement[0],s.activities).map(r=>r.status),['planned','planned'],'unresolved plans stay Planned');
 s=W.wellnessReducer(s,{kind:'movement/status',date:'2026-11-09',typeId:'walk',status:'completed',id:'r1'});
 assert.equal(s.activities.length,1,'Completed creates the existing movement record');
 s=W.wellnessReducer(s,{kind:'movement/status',date:'2026-11-09',typeId:'strength',status:'skipped',id:'r2'});
 assert.deepEqual(s.movement[0].outcomes,{strength:'skipped'});assert.equal(s.activities.length,1,'Skipped never counts as done');
 s=W.wellnessReducer(s,{kind:'movement/status',date:'2026-11-09',typeId:'walk',status:'rest',id:'r3'});
 assert.equal(s.activities.length,0,'changing Completed to Rest removes the record');assert.equal(s.movement[0].outcomes.walk,'rest');
 s=W.wellnessReducer(s,{kind:'movement/status',date:'2026-11-09',typeId:'walk',status:'planned',id:'r4'});
 assert.equal(s.movement[0].outcomes.walk,undefined,'Planned clears the outcome');
 s=W.wellnessReducer(s,{kind:'movement',day:{date:'2026-11-09',typeIds:['walk'],outcomes:{strength:'skipped'}},types:[],quickIds:[],recentIds:[]});
 assert.deepEqual(s.movement[0].outcomes,{},'removing a plan drops its outcome');
 const sql=read('supabase/migrations/20261202000100_movement_outcomes.sql');
 assert.match(sql,/outcome text not null check \(outcome in \('skipped','rest','sick'\)\)/);
 assert.match(sql,/references public\.movement_days\(user_id,local_date\) on delete cascade/);
 assert.match(sql,/if not item \? 'outcomes' then continue/,'older clients cannot erase outcomes');
 assert.match(read('components/MovementCard.tsx'),/kind:'activity\/duration'/);
});

test('#112 spending: six sorts, payment covers cards and methods, filtered totals count a category share only',()=>{
 const M=load('lib/money-spending');
 const t=(id,merchant,amountCents,date,extra={})=>({id,merchant,amountCents,date,tagIds:[],paymentMethod:'',splits:[],...extra});
 const items=[t('a','Bakery',500,'2026-11-03',{cardId:'c1',categoryId:'food'}),t('b','apple',2000,'2026-11-01',{paymentMethodId:'m1'}),t('c','Zoo',1200,'2026-11-05',{splits:[{categoryId:'food',amountCents:200},{categoryId:'fun',amountCents:1000}]})];
 assert.deepEqual(M.sortSpending(items,'newest').map(x=>x.id),['c','a','b']);
 assert.deepEqual(M.sortSpending(items,'oldest').map(x=>x.id),['b','a','c']);
 assert.deepEqual(M.sortSpending(items,'amount-desc').map(x=>x.id),['b','c','a']);
 assert.deepEqual(M.sortSpending(items,'amount-asc').map(x=>x.id),['a','c','b']);
 assert.deepEqual(M.sortSpending(items,'name-asc').map(x=>x.id),['b','a','c'],'A–Z ignores case');
 assert.deepEqual(M.sortSpending(items,'name-desc').map(x=>x.id),['c','a','b']);
 assert.deepEqual(M.filterSpending(items,{...M.emptySpendingFilters,payment:'method:m1'}).map(x=>x.id),['b']);
 const food=M.filterSpending(items,{...M.emptySpendingFilters,category:'food'});
 assert.deepEqual(food.map(x=>x.id),['a','c']);assert.equal(M.filteredTotal(food,'food'),700,'only the food share of the split counts');
 assert.equal(M.parseSpendingSort('nope'),'newest');assert.equal(items[0].amountCents,500,'filtering never changes transactions');
});

test('#112 Future Log: references, not copies; one per record; nothing appears automatically',()=>{
 const F=load('lib/future-log');
 const ref={id:'e',month:'2026-12',date:'2026-12-02',title:'Old name',note:null,icon:null,color:'primary',done:false,position:0,revision:1,source:{kind:'task',id:'t1'}};
 const live=F.presentEntry(ref,new Map([['task:t1',{title:'New name',date:'2026-12-04',endDate:null,done:true,missing:false}]]));
 assert.equal(live.title,'New name');assert.equal(live.date,'2026-12-04');assert.equal(live.sourceDone,true);assert.equal(live.done,false,'no second done state');
 const gone=F.presentEntry(ref,new Map());assert.equal(gone.missing,true);assert.equal(gone.title,'Old name','keeps the name snapshot');
 const standalone={...ref,source:null};assert.equal(F.presentEntry(standalone,new Map()),standalone);
 const sql=read('supabase/migrations/20261202000200_future_log_links.sql');
 assert.match(sql,/unique index future_log_entries_one_reference on public\.future_log_entries\(user_id, source_kind, source_id\) where source_kind is not null/);
 assert.match(sql,/check \(source_kind is null or done = false\)/);
 const agenda=read('components/planner/Agenda.tsx');assert.doesNotMatch(agenda,/monthItems\(/);
 for(const f of ['components/planner/TaskDetails.tsx','components/planner/EventEditor.tsx','components/envision/aspirations/AspirationDetail.tsx'])assert.match(read(f),/<FutureLogToggle/,f);
 assert.match(read('components/envision/bucket/BucketList.tsx'),/Show in Future Log/);
});

test('#112 themes: Midnight Ballerina preview matches the theme; Money tiles and Whimsy collections use card surfaces',()=>{
 const T=load('lib/themes');const mb=T.themes.find(t=>t.id==='astral');
 assert.match(mb.preview,/#08122e 0%, #08122e 30%/);assert.doesNotMatch(mb.preview,/#ffb36b/);
 assert.match(read('app/surfaces.css'),/\.muse-money-tiles > div,/);
 assert.match(read('app/materials.css'),/\.muse-tarot-entry, \.muse-tarot-calendar-grid, \.muse-fortune-saved, \.muse-encyclopedia-hero/);
});
