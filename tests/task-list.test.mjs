import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const L=load('lib/task-list'),P=load('lib/planner');
const read=f=>readFileSync(resolve(root,f),'utf8');
const task=(id,plannedDate,extra={})=>({id,kind:'task',title:id,complete:false,workspaceId:'w1',tagIds:[],plannedDate,actualMinutes:0,subtasks:[],createdAt:'2026-11-01T00:00:00Z',...extra});
const today='2026-11-06';
const tasks=[task('inbox-a',undefined),task('late',  '2026-11-02'),task('soon','2026-11-09'),task('now',today),task('inbox-b',undefined),task('done','2026-11-01',{complete:true,completedAt:'2026-11-01T10:00:00Z'}),task('older-late','2026-10-30')];

test('Task List scopes: To plan gathers overdue then unscheduled; nothing is moved or copied',()=>{
 const ids=gs=>gs.map(g=>[g.id,g.tasks.map(t=>t.id)]);
 assert.deepEqual(ids(L.taskListGroups(tasks,'plan',today)),[['overdue',['older-late','late']],['unscheduled',['inbox-a','inbox-b']]],'overdue oldest first; unscheduled keep their saved (drag) order');
 assert.deepEqual(ids(L.taskListGroups(tasks,'overdue',today)),[['overdue',['older-late','late']]]);
 assert.deepEqual(ids(L.taskListGroups(tasks,'scheduled',today)),[['scheduled',['now','soon']]]);
 assert.deepEqual(L.taskListGroups(tasks,'all',today).map(g=>g.id),['overdue','unscheduled','scheduled','complete']);
 assert.equal(L.taskListCount(L.taskListGroups(tasks,'all',today)),tasks.length,'every task once in All');
 assert.equal(tasks.find(t=>t.id==='late').plannedDate,'2026-11-02','an overdue task keeps its date until you move it');
 assert.equal(L.parseTaskListScope('weird'),'plan');assert.equal(L.parseTaskListScope('scheduled'),'scheduled');
});

test('Schedule choices: today, tomorrow, the board days ahead, next Monday; never the current day',()=>{
 const c=L.scheduleChoices(today,['2026-11-06','2026-11-07','2026-11-08']);
 assert.deepEqual(c.map(x=>[x.date,x.label]),[['2026-11-06','Today'],['2026-11-07','Tomorrow'],['2026-11-08',''],['2026-11-09','Next Monday']]);
 assert.ok(!L.scheduleChoices(today,[],'2026-11-07').some(x=>x.date==='2026-11-07'),'the day it is already on is not offered');
});

test('scheduling from the list is the same placement as dragging: only the planned date changes',()=>{
 const state={tasks:[task('a',undefined,{dueDate:'2026-11-20',subtasks:[{id:'s',title:'s',complete:true}],recurrence:{frequency:'weekly',interval:1}})],events:[],workspaces:[{id:'w1',name:'W',accent:'primary'}],groups:[],tags:[],activeTimer:null};
 const placed=P.plannerReducer(state,{type:'task/place',id:'a',date:'2026-11-09'}).tasks[0];
 assert.deepEqual({...placed,plannedDate:undefined},{...state.tasks[0],plannedDate:undefined},'id, due date, subtasks, recurrence, completion all kept');
 assert.equal(placed.plannedDate,'2026-11-09');
 assert.equal(P.plannerReducer({...state,tasks:[placed]},{type:'task/place',id:'a',date:undefined}).tasks[0].plannedDate,undefined,'back to the Task List');
});

test('Scheduled Board wiring: list is a distinct source, days are labeled destinations, markers match Agenda',()=>{
 const rail=read('components/planner/PlannerRail.tsx'),row=read('components/planner/TaskListRow.tsx'),menu=read('components/planner/ScheduleMenu.tsx'),planner=read('components/planner/Planner.tsx'),card=read('components/planner/PlannerTaskCard.tsx'),css=read('components/planner/Planner.css');
 assert.match(rail,/<PlannerFilters /);assert.match(rail,/Search tasks \(list and days\)/);assert.match(rail,/<TaskQuickAdd /);assert.match(rail,/<PlanningDropZone className="muse-inbox-drop/,'drop back on the list to unschedule');
 assert.match(row,/TASK_DRAG_TYPE/);assert.match(row,/<ScheduleMenu /);assert.match(row,/<TaskTimer /);assert.match(row,/Overdue/);assert.match(row,/Priority/);
 assert.match(menu,/Migrate to today/);assert.match(menu,/Back to the Task List/);assert.match(menu,/type="date"/);
 assert.match(planner,/data-dragging=\{dragging \|\| undefined\}/);assert.match(planner,/Drop to plan for/);assert.match(planner,/priorityOnly/);
 assert.match(card,/taskStateLabels\.overdue/);assert.match(card,/One of the day’s three priorities/);
 assert.doesNotMatch(read('components/planner/PlannerUtilities.tsx'),/Search Planner tasks/,'search moved from the board toolbar into the list');
 assert.match(css,/\.muse-task-list::before\{|\.muse-task-list::before \{/,'accent spine marks the list as the source');
 assert.match(css,/\.muse-planner-layout\[data-dragging\] \.muse-day-drop \{ outline: 2px dashed/,'every day is a visible destination while dragging');
 assert.doesNotMatch(read('components/planner/Agenda.tsx'),/PlannerRail|TaskListRow/,'no task sidebar in Agenda');
});
