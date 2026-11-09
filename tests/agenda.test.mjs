import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const A=load('lib/agenda');
const read=f=>readFileSync(resolve(root,f),'utf8');
const task=(id,plannedDate,complete=false)=>({id,kind:'task',title:id,complete,workspaceId:'w',tagIds:[],plannedDate,actualMinutes:0,subtasks:[],createdAt:'2026-11-01T00:00:00Z'});
const event=(id,date,time)=>({id,kind:'event',title:id,date,dateTime:`${date}T${time}:00`,time});

test('Planner has exactly Tasks, Intentions, Agenda and Reflections (#117); Agenda has Day, Week, Month and Future Log',()=>{
 assert.deepEqual(A.plannerTabs.map(t=>t.label),['Tasks','Intentions','Agenda','Reflections']);
 assert.equal(A.parsePlannerTab('intentions'),'intentions');
 assert.deepEqual(A.agendaViews.map(v=>v.label),['Day','Week','Month','Future Log']);
 assert.equal(A.parsePlannerTab('calendar'),'tasks','old or unknown tabs fall back to Tasks');
 assert.equal(A.parsePlannerTab('agenda'),'agenda');
 assert.deepEqual(A.parseAgendaPreferences({view:'year',showCompleted:false,junk:1}),{view:'year',showCompleted:false,showCanceled:true,showMarks:true});
 assert.deepEqual(A.parseAgendaPreferences({view:'calendar'}),A.defaultAgendaPreferences);
});

test('ranges: weeks start Monday, months are exact, navigation moves by the view',()=>{
 const w=A.agendaRange('week','2026-11-06');assert.deepEqual([w.days[0],w.days[6],w.previous,w.next],['2026-11-02','2026-11-08','2026-10-30','2026-11-13']);
 const m=A.agendaRange('month','2026-02-15');assert.deepEqual([m.days.length,m.days[0],m.previous,m.next],[28,'2026-02-01','2026-01-01','2026-03-01']);
 assert.equal(A.agendaRange('month','2026-12-31').next,'2027-01-01');
 assert.deepEqual([A.agendaRange('year','2026-06-01').previous,A.agendaRange('year','2026-06-01').next],['2025-01-01','2027-01-01']);
 const grid=A.monthGrid('2026-11-06');assert.equal(grid[0].indexOf('2026-11-01'),6,'Nov 1 2026 is a Sunday');assert.ok(grid.every(r=>r.length===7));
 assert.equal(grid.flat().filter(Boolean).length,30,'no invented days');
 assert.deepEqual(A.futureLogMonths('2026-04-10').slice(0,2),['2026-01','2026-02']);
});

test('views read the same records; hiding completed never changes them',()=>{
 const tasks=[task('a','2026-11-06'),task('b','2026-11-06',true),task('c',undefined),task('d','2026-12-01')];
 const events=[event('late','2026-11-06','18:00'),event('early','2026-11-06','09:00')];
 const all=A.dayItems(tasks,events,'2026-11-06',true);assert.deepEqual([all.tasks.map(t=>t.id),all.events.map(e=>e.id)],[['a','b'],['early','late']]);
 const open=A.dayItems(tasks,events,'2026-11-06',false);assert.deepEqual([open.tasks.map(t=>t.id),open.hiddenComplete],[['a'],1]);
 assert.equal(tasks[1].complete,true,'the record itself is untouched');
 assert.deepEqual(A.monthItems(tasks,events,'2026-12',true).tasks.map(t=>t.id),['d']);
 assert.ok(!A.dayItems(tasks,events,'2026-11-06',true).tasks.some(t=>t.id==='c'),'unscheduled tasks stay in the task list');
});

test('Planner wires the tabs and Agenda reuses the existing task, drop and event components',()=>{
 const planner=read('components/planner/Planner.tsx');
 assert.match(planner,/<MuseSectionNav label="Planner views"/);assert.match(planner,/tab === "agenda" && <Agenda /);
 const agenda=read('components/planner/Agenda.tsx')+read('components/planner/AgendaSections.tsx')+read('components/planner/EventEditor.tsx');
 for(const piece of ['TaskListRow','PlanningDropZone','TaskQuickAdd','EventEditor','dispatch({ type: "event/save"'])assert.ok(agenda.includes(piece),piece);
});

test('Weekly Agenda: two spreads of four equal columns, the last one a customizable planning column',()=>{
 const slots=A.weekSlots('2026-11-06');
 assert.deepEqual(slots.map(x=>x.kind==='day'?x.date.slice(8):x.kind),['02','03','04','05','06','07','08','planning'],'Mon–Thu, then Fri–Sun + planning');
 assert.equal(A.SPREAD_SIZE,4);assert.deepEqual(['2026-11-02','2026-11-05','2026-11-06','2026-11-08'].map(A.spreadFor),[0,0,1,1]);
 assert.deepEqual(A.parsePlanningConfig({kind:'notes',title:'  '}),{kind:'notes',title:'Week notes'});
 assert.deepEqual(A.parsePlanningConfig({kind:'video',title:'x'.repeat(60)}).title.length,40);
 assert.deepEqual(A.parsePlanningItems([{id:'a',text:'Call Mom',done:1},{nope:1},'x']),[{id:'a',text:'Call Mom',done:true}]);
 const css=read('components/planner/Agenda.css');
 assert.match(css,/grid-auto-columns:calc\(\(100% - \(var\(--cols\) - 1\) \* var\(--gap\)\) \/ var\(--cols\)\)/,'equal columns');
 assert.match(css,/\.muse-agenda-week\{--cols:4;/);assert.match(css,/max-width:1050px\)\{\.muse-agenda-week\{--cols:2\}/,'fewer columns, never squeezed');
 assert.match(css,/nth-child\(4n\+1\)\{scroll-snap-align:start\}/,'snaps by spread on wide screens');
 const agenda=read('components/planner/Agenda.tsx');assert.doesNotMatch(agenda,/muse-agenda-sidebar|Task list<\/button>/,'no Tasks-board sidebar in Agenda');
 const card=read('components/planner/TaskListRow.tsx');assert.match(card,/TASK_DRAG_TYPE/);assert.match(card,/MuseOverflowMenu/);assert.match(card,/reorderWithinDate/,'Agenda uses the Task List row, reordering within its day');
 const sql=read('supabase/migrations/20261117000100_planner_week_sections.sql');
 assert.match(sql,/primary key \(user_id, week_start\)/);assert.match(sql,/extract\(isodow from week_start\) = 1/);assert.equal((sql.match(/create policy owner_/g)??[]).length,4);
});
