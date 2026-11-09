import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import {load,root} from './helpers.mjs';
const read=p=>readFileSync(resolve(root,p),'utf8');
const S=load('lib/lists/schedule'),M=load('lib/lists/model');
const weekly=(mode='flexible',anchor='2026-11-02')=>({rule:{freq:'weekly',interval:1},anchor,mode,since:'2026-11-02'});
const ev=(kind,periodStart,periodEnd,extra={})=>({id:kind+periodStart,itemId:'i',listId:'l',kind,periodStart,periodEnd,recordedAt:'',source:'list',...extra});

test('flexible weekly periods run Monday to Sunday and the anchor snaps to Monday',()=>{
 assert.equal(S.anchorFor({freq:'weekly',interval:1},'flexible','2026-11-08'),'2026-11-02');
 assert.equal(S.anchorFor({freq:'monthly',interval:3},'flexible','2026-11-08'),'2026-11-01');
 assert.equal(S.anchorFor({freq:'weekly',interval:1},'preferred','2026-11-08'),'2026-11-08');
 assert.deepEqual(S.periodFor(weekly(),'2026-11-08'),{start:'2026-11-02',end:'2026-11-08'});
 assert.deepEqual(S.periodFor(weekly(),'2026-11-09'),{start:'2026-11-09',end:'2026-11-15'});
 assert.equal(S.scheduleLabel(weekly()),'Weekly · any day');
});
test('the checkbox resets each period while completions stay in history (no future records)',()=>{
 const s=weekly(),events=[ev('completed','2026-11-02','2026-11-08',{occurredOn:'2026-11-05'})];
 assert.equal(S.scheduleState(s,events,'2026-11-07').status,'completed');
 const next=S.scheduleState(s,events,'2026-11-10');
 assert.equal(next.status,'open');assert.equal(next.lastCompleted,'2026-11-05');assert.equal(next.completions,1);
 const item={id:'i',listId:'l',schedule:s,completedAt:null};
 assert.equal(M.isDone(item,events,'2026-11-07'),true);assert.equal(M.isDone(item,events,'2026-11-10'),false);
});
test('missed periods are derived, never stored, and counted only from when the schedule began',()=>{
 const s={...weekly(),since:'2026-10-05',anchor:'2026-10-05'},events=[ev('completed','2026-10-05','2026-10-11',{occurredOn:'2026-10-06'})];
 const st=S.scheduleState(s,events,'2026-10-28');
 assert.equal(st.missedSinceLast,2);assert.equal(st.overdue,true);
 const hist=S.itemHistory(s,events,'2026-10-28');
 assert.deepEqual(hist.map(h=>h.kind),['missed','missed','completed']);
 // A schedule changed today counts nothing missed before today.
 assert.equal(S.scheduleState({...s,since:'2026-10-28'},events,'2026-10-28').missedSinceLast,0);
});
test('preferred day: moving this week’s day keeps the series; skipping is its own state',()=>{
 const s=weekly('preferred','2026-11-04'),moved=[ev('rescheduled','2026-11-04','2026-11-10',{movedTo:'2026-11-07'})];
 const st=S.scheduleState(s,moved,'2026-11-05');
 assert.equal(st.status,'rescheduled');assert.equal(st.planned,'2026-11-07');assert.equal(st.due,false);
 assert.equal(S.scheduleState(s,moved,'2026-11-07').due,true);
 assert.equal(S.plannedOn(s,moved,'2026-11-07'),true);assert.equal(S.plannedOn(s,moved,'2026-11-04'),false);
 assert.equal(S.scheduleState(s,[ev('skipped','2026-11-04','2026-11-10')],'2026-11-05').status,'skipped');
 assert.equal(S.plannedOn(weekly(),[], '2026-11-04'),false,'flexible items never land on a single day');
});
test('quarterly, twice a year and custom intervals share one model',()=>{
 const q={rule:{freq:'monthly',interval:3},anchor:'2026-01-01',mode:'flexible',since:'2026-01-01'};
 assert.deepEqual(S.periodFor(q,'2026-05-20'),{start:'2026-04-01',end:'2026-06-30'});
 assert.equal(S.scheduleLabel(q),'Quarterly · any day');
 const every3={rule:{freq:'daily',interval:3},anchor:'2026-11-01',mode:'date',since:'2026-11-01'};
 assert.deepEqual(S.periodFor(every3,'2026-11-05'),{start:'2026-11-04',end:'2026-11-06'});
});
test('templates and duplicates are independent copies without completion, history or links',()=>{
 const b={list:{id:'L',title:'Travel',isTemplate:true,pinned:true,archivedAt:null,aspirationId:'A',showInDaily:true,showInAgenda:true,fields:[]},sections:[{id:'S',listId:'L',title:'Clothing',position:0}],
  items:[{id:'I',listId:'L',sectionId:'S',title:'Socks',completedAt:'x',completedOn:'2026-11-01',linkKind:'task',linkId:'T',schedule:{...weekly(),anchor:'2026-01-05',since:'2026-01-05'}}]};
 let n=0;const c=M.copyBundle(b,{title:'London 2027',isTemplate:false,today:'2026-11-08',id:()=>'id'+(++n)});
 assert.notEqual(c.list.id,'L');assert.equal(c.list.title,'London 2027');assert.equal(c.list.isTemplate,false);assert.equal(c.list.aspirationId,null);assert.equal(c.list.showInDaily,false);
 assert.equal(c.items[0].sectionId,c.sections[0].id);assert.notEqual(c.sections[0].id,'S');
 assert.equal(c.items[0].completedAt,null);assert.equal(c.items[0].linkId,null);assert.equal(c.items[0].schedule.since,'2026-11-08');
 assert.equal(b.items[0].completedAt,'x','the source is untouched');
});
test('starters: blank plus Travel Essentials, Home Reset and Project Plan',()=>{
 assert.deepEqual(M.starters.map(s=>s.id),['blank','travel','home','project']);
 assert.equal(M.starters.find(s=>s.id==='blank').sections.length,0);
 assert.ok(M.starters.find(s=>s.id==='home').sections.every(s=>s.items.every(i=>typeof i!=='string'&&i.repeat)));
});
test('a linked recurring task completes one period at a time (Planner is the source of truth)',()=>{
 const T=load('components/lists/taskLink');
 const item={id:'i',listId:'l',schedule:weekly('date','2026-11-02'),linkKind:'task',linkId:'T',completedAt:null};
 const planner={tasks:[{id:'T',complete:false}],occurrences:[{taskId:'T',date:'2026-11-02',status:'completed',completedOn:'2026-11-03'},{taskId:'X',date:'2026-11-09',status:'completed'}]};
 const evs=T.plannerEvents(item,planner);assert.equal(evs.length,1);assert.equal(evs[0].periodStart,'2026-11-02');assert.equal(evs[0].source,'task');
 const shown=T.effectiveEvents(item,[{...evs[0],id:'copy',recordedAt:'',source:'task',periodStart:'2026-10-26',periodEnd:'2026-11-01',kind:'completed',occurredOn:'2026-10-27'}],planner);
 assert.ok(shown.some(e=>e.periodStart==='2026-11-02'));assert.ok(!shown.some(e=>e.periodStart==='2026-10-26'),'stale task copies are not shown while the task exists');
 assert.equal(S.scheduleState(item.schedule,shown,'2026-11-10').status,'open','next week is not completed');
 // Task deleted: the saved copies are what remain.
 const copies=[{id:'c',itemId:'i',listId:'l',kind:'completed',periodStart:'2026-11-02',periodEnd:'2026-11-08',occurredOn:'2026-11-03',recordedAt:'',source:'task'}];
 assert.equal(T.effectiveEvents(item,copies,{tasks:[],occurrences:[]}).length,1);
});
test('database: owner-only tables, one completion and one skip per period, validators callable for direct writes',()=>{
 const sql=read('supabase/migrations/20261129000100_lists.sql');
 for(const t of ['lists','list_sections','list_items','list_item_events']){assert.match(sql,new RegExp(`alter table public\\.${t} enable row level security`));assert.match(sql,new RegExp(`create policy owner_all on public\\.${t}`));}
 assert.match(sql,/unique \(item_id, period_start, kind\)/);assert.match(sql,/revoke all on public\.lists[^;]*from public, anon/);
 assert.match(sql,/grant execute on function muse_private\.valid_list_schedule\(jsonb\), muse_private\.valid_list_fields\(jsonb\), muse_private\.valid_recurrence_rule\(jsonb\) to authenticated/);
 assert.match(sql,/check \(schedule is null or completed_at is null\)/);
 assert.match(read('app/api/account/export/route.ts'),/from\('list_item_events'\)/);
});
test('Mindspace: Sticky Board | Lists tabs, Checklists filter, hidden Notes view kept',()=>{
 const {mindspaceView}=load('lib/mindspace');assert.equal(mindspaceView(null),'constellations');assert.equal(mindspaceView('lists'),'lists');assert.equal(mindspaceView('notes'),'notes');
 const notes=read('components/notes/Notes.tsx');assert.match(notes,/label:"Sticky Board",href:"\/notes"/);assert.match(notes,/label:"Lists",href:"\/notes\?view=lists"/);assert.doesNotMatch(notes,/label:"Notes"/);
 const board=read('components/notes/Constellations.tsx');assert.match(board,/>Checklists<\/button>/);assert.doesNotMatch(board,/>Lists<\/button>/);assert.match(board,/aria-label="Sticky Board"/);
});
test('opt-in summaries leave out linked items so nothing appears twice',()=>{
 const src=read('components/lists/ListsSurfaces.tsx');assert.match(src,/l\[flag\] && !l\.archivedAt/);assert.match(src,/i\.linkKind !== "task"/);
});
