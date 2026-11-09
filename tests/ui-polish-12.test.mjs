import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';
const read=f=>readFileSync(resolve(root,f),'utf8');
const connections=load('lib/ritual-connections'),rituals=load('lib/rituals');
const wellnessSource=(w={})=>({water:[],activities:[],types:[],assignments:[],waterSettings:{goal:100,unit:'oz'},...w});
const sources=(w)=>({timeZone:'UTC',wellness:wellnessSource(w)});
const group={id:'grp',name:'Body',accent:'primary'},group2={id:'g2',name:'Mind',accent:'pop'};
const ritual=(over)=>({id:'r1',name:'Water',groupId:'grp',type:'numeric',goal:100,unit:'oz',recurrence:{kind:'daily'},startDate:'2026-10-01',createdAt:'2026-10-01T00:00:00Z',...over});

test('#12 water ritual: saved intake before the connection date shows (evidence only); manual history wins',()=>{
 const r=ritual({connection:{metric:'water',unit:'oz',since:'2026-11-03',followGoal:true}});
 const state={groups:[group],rituals:[r],entries:[{id:'r1/2026-11-01',ritualId:'r1',date:'2026-11-01',value:40,updatedAt:'x'}],celebratedMilestones:[],connectionsEnabled:true};
 const water=[{date:'2026-11-01',total:120,goal:100,unit:'oz'},{date:'2026-11-02',total:100,goal:100,unit:'oz'},{date:'2026-11-04',total:60,goal:80,unit:'oz'}];
 const view=connections.withConnections(state,sources({water}),'2026-11-05');
 const at=d=>view.state.entries.find(e=>e.date===d);
 assert.equal(at('2026-11-01').value,40,'a manual entry before the connection is kept, never overwritten');
 assert.equal(at('2026-11-02').value,100,'earlier saved intake fills a day with no entry');
 assert.equal(rituals.ritualCell(view.state,r,'2026-11-02','2026-11-05').status,'complete','reaching that day’s goal completes it');
 assert.equal(at('2026-11-04').goal,80,'each day uses the goal it had in Daily Edit');
 assert.equal(rituals.ritualCell(view.state,r,'2026-11-04','2026-11-05').status,'partial','partial progress stays partial');
 assert.equal(rituals.ritualCell(view.state,r,'2026-11-03','2026-11-05').status,'unknown','no intake is never marked done or missed');
 const kept=connections.materializeConnection(r,sources({water}),'2026-11-05',state);
 assert.ok(!kept.some(x=>x.date==='2026-11-01'),'disconnecting never rewrites manual history');
 assert.equal(connections.firstWaterDay(sources({water})),'2026-11-01');
 const other=ritual({id:'r2',type:'checkbox',goal:1,unit:'check-in',connection:{metric:'workouts',since:'2026-11-03'}});
 const v2=connections.withConnections({...state,rituals:[other],entries:[]},sources({activities:[{id:'a',date:'2026-11-01',typeId:'t'}]}),'2026-11-05');
 assert.equal(v2.state.entries.length,0,'other trackers still start at their connection date');
 const editor=read('components/rituals/RitualEditor.tsx');
 assert.match(editor,/Connect to water/);assert.match(editor,/Include earlier water logs/);
});

test('#12 rituals reorder within a group and move between groups, keeping identity and history',()=>{
 const a=ritual({id:'a',name:'A'}),b=ritual({id:'b',name:'B'}),c=ritual({id:'c',name:'C'}),d=ritual({id:'d',name:'D',groupId:'g2'});
 const state={groups:[group,group2],rituals:[a,b,c,d],entries:[{id:'c/x',ritualId:'c',date:'2026-11-01',value:1,updatedAt:'x'}],celebratedMilestones:[]};
 const up=rituals.ritualReducer(state,{type:'ritual/move',id:'c',groupId:'grp',before:'a'});
 assert.deepEqual(up.rituals.map(r=>r.id),['c','a','b','d']);
 const moved=rituals.ritualReducer(state,{type:'ritual/move',id:'c',groupId:'g2',before:null});
 assert.deepEqual(moved.rituals.map(r=>`${r.id}:${r.groupId}`),['a:grp','b:grp','d:g2','c:g2']);
 assert.equal(moved.entries,state.entries,'history untouched');assert.equal(moved.rituals.find(r=>r.id==='c').connection,c.connection);
 assert.equal(rituals.ritualReducer(state,{type:'ritual/move',id:'c',groupId:'nope',before:null}),state);
 assert.equal(rituals.ritualReducer(state,{type:'ritual/move',id:'a',groupId:'grp',before:'b'}),state,'no-op moves keep the same state');
 assert.match(read('components/rituals/RitualLifecycle.tsx'),/Move up[\s\S]*Move down[\s\S]*Move to \$\{g\.name\}/);
 assert.match(read('components/rituals/RitualGroup.tsx'),/draggable=/);
});

test('#12 Google sync: automatic refresh after ~3 minutes, never overlapping; manual sync still forces',()=>{
 assert.match(read('lib/google/sync.ts'),/THROTTLE_MS = 3 \* 60 \* 1000/);
 const store=read('components/google/GoogleCalendarStore.ts');
 assert.match(store,/AUTO_SYNC_MS = 3 \* 60 \* 1000/);assert.match(store,/if \(!snap\.connections\.length \|\| snap\.syncing\) return false/);
 assert.match(store,/accountLoad \?\?= loadAccount\(\)/,'one shared account read across components');
 assert.match(store,/visibilitychange/);
 assert.match(read('components/google/GoogleCalendarSettings.tsx'),/syncGoogle\(true\)/);
 assert.doesNotMatch(read('components/planner/FutureLog.tsx'),/useGoogleEvents/,'Future Log stays curated');
});

test('#12 payment card colors: stable defaults, saved choice wins, rows carry the card color',()=>{
 const {cardAccent}=load('lib/money');
 const state={cards:[{id:'a',name:'A'},{id:'b',name:'B',accent:'#123456'},{id:'c',name:'C'}]};
 assert.equal(cardAccent(state,'a'),'secondary');assert.equal(cardAccent(state,'b'),'#123456');assert.notEqual(cardAccent(state,'c'),cardAccent(state,'a'));
 assert.equal(cardAccent(state,undefined),undefined);assert.equal(cardAccent(state,'gone'),undefined);
 const sql=read('supabase/migrations/20261130000200_card_accents.sql');
 assert.match(sql,/add column accent text/);assert.match(sql,/where user_id = uid/);assert.match(sql,/revoke all on function public\.set_card_accents\(jsonb\) from public, anon/);
 assert.match(read('components/money/MoneyViews.tsx'),/muse-money-card-dot/);
});

test('#12 Future Log: ranges highlight every covered day; only Future Log entries highlight',()=>{
 const {entriesOn,entryEnd,validEntry}=load('lib/future-log');
 const trip={id:'t',month:'2026-12',date:'2026-12-29',endDate:'2027-01-03',title:'Ski'},day={id:'d',month:'2026-12',date:'2026-12-05',endDate:null,title:'Gig'},loose={id:'m',month:'2026-12',date:null,title:'Sometime'};
 assert.equal(entryEnd(trip),'2027-01-03');
 assert.deepEqual(entriesOn([trip,day,loose],'2027-01-02').map(e=>e.id),['t'],'a range crosses into the next month');
 assert.deepEqual(entriesOn([trip,day,loose],'2026-12-05').map(e=>e.id),['d']);
 assert.equal(validEntry({...trip,endDate:'2026-12-20'}),'The last day comes after the first.');
 assert.equal(validEntry(trip),'');
 const sql=read('supabase/migrations/20261130000100_future_log_ranges.sql');assert.match(sql,/add column end_date date/);assert.match(sql,/end_date > local_date/);
 const agenda=read('components/planner/Agenda.tsx');assert.match(agenda,/<FutureMiniMonth month=\{m\} entries=\{future\.entries\}/,'the mini calendar reads Future Log entries only');
});

test('#12 small pieces: list columns, Allocation label, Crystal hidden, shared toolbar',()=>{
 assert.match(read('supabase/migrations/20261130000300_list_columns.sql'),/section_columns smallint not null default 0 check \(section_columns between 0 and 3\)/);
 assert.match(read('components/lists/ListView.tsx'),/data-columns=\{list\.columns\}/);
 assert.doesNotMatch(read('components/money/MoneyPaychecks.tsx'),/Add allocation|Allocation \/ category/);
 assert.match(read('components/money/MoneyPaychecks.tsx'),/Planned from this paycheck/);
 assert.match(read('lib/material-preference.ts'),/offeredMaterials: readonly Material\[\] = \["frosted"\]/);
 assert.match(read('app/globals.css'),/\.muse-filter-toolbar \{ display:flex/);
 assert.match(read('components/whimsy/TarotExperience.tsx'),/muse-filter-toolbar/);
});

test('#12 Lists: group and sort are display-only, by real intervals, persisted per list',()=>{
 const O=load('lib/lists/order');
 const rule=(freq,interval)=>({rule:{freq,interval},anchor:'2026-11-02',mode:'flexible',since:'2026-11-02'});
 const it=(id,pos,schedule,title=id)=>({id,title,position:pos,createdAt:'',schedule,completedAt:null,dueDate:null});
 const items=[it('yearly',1,rule('yearly',1)),it('once',2,null),it('daily',3,rule('daily',1)),it('custom',4,rule('weekly',5)),it('biweek',5,rule('weekly',2)),it('quarter',6,rule('monthly',3))];
 assert.deepEqual(O.sortItems(items,'frequency',()=>[],'2026-11-08').map(i=>i.id),['daily','biweek','custom','quarter','yearly','once'],'real intervals, one-time last');
 assert.deepEqual(O.sortItems(items,'manual',()=>[],'2026-11-08').map(i=>i.id),items.map(i=>i.id));
 assert.deepEqual(items.map(i=>i.position),[1,2,3,4,5,6],'sorting never rewrites positions');
 assert.deepEqual(O.frequencyGroups(items).map(g=>g.label),['Daily','Every 2 weeks','Quarterly','Yearly','Custom','One-time']);
 assert.match(read('supabase/migrations/20261130000300_list_columns.sql'),/item_group[\s\S]*item_sort/);
 assert.match(read('components/lists/ListView.tsx'),/draggable=\{ctx\.manual\}/);
});
