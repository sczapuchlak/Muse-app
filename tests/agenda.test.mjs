import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const A=load('lib/agenda');
const read=f=>readFileSync(resolve(root,f),'utf8');
const task=(id,plannedDate,complete=false)=>({id,kind:'task',title:id,complete,workspaceId:'w',tagIds:[],plannedDate,actualMinutes:0,subtasks:[],createdAt:'2026-11-01T00:00:00Z'});
const event=(id,date,time)=>({id,kind:'event',title:id,date,dateTime:`${date}T${time}:00`,time});

test('Planner has exactly Tasks, Agenda and Reflections; Agenda has Day, Week, Month and Future Log',()=>{
 assert.deepEqual(A.plannerTabs.map(t=>t.label),['Tasks','Agenda','Reflections']);
 assert.deepEqual(A.agendaViews.map(v=>v.label),['Day','Week','Month','Future Log']);
 assert.equal(A.parsePlannerTab('calendar'),'tasks','old or unknown tabs fall back to Tasks');
 assert.equal(A.parsePlannerTab('agenda'),'agenda');
 assert.deepEqual(A.parseAgendaPreferences({view:'year',showCompleted:false,junk:1}),{view:'year',showCompleted:false,showSidebar:true});
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
 const agenda=read('components/planner/Agenda.tsx');
 for(const piece of ['AgendaTaskCard','PlanningDropZone','TaskQuickAdd','PlanEntryForm','dispatch({ type: "event/add"'])assert.ok(agenda.includes(piece),piece);
});

test('Weekly Agenda shows about three readable days in one continuous, scrollable week',()=>{
 const css=read('components/planner/Agenda.css');
 assert.match(css,/grid-auto-columns:clamp\(250px,calc\(\(100% - 20px\) \/ 3\),340px\)/,'three comfortable columns on desktop');
 assert.match(css,/scroll-snap-type:x mandatory/);assert.match(css,/max-width:1100px\)\{\.muse-agenda-week\{grid-auto-columns:clamp\(240px/,'two on tablet');
 const card=read('components/planner/AgendaTaskCard.tsx');
 assert.match(card,/TASK_DRAG_TYPE/);assert.match(card,/useTaskPlacement/);assert.match(card,/MuseOverflowMenu/);assert.doesNotMatch(card,/TaskTimer/,'no reserved timer column');
});
