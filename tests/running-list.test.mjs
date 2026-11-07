import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const R=load('lib/running-list'),P=load('lib/planner');
const read=f=>readFileSync(resolve(root,f),'utf8');
const task=(id,extra={})=>({id,kind:'task',title:id,complete:false,workspaceId:'w1',tagIds:[],actualMinutes:0,subtasks:[],createdAt:'2026-11-01T00:00:00Z',...extra});
const ev=(taskId,complete,occurredAt,localDate)=>({id:`${taskId}-${occurredAt}`,taskId,complete,occurredAt,localDate,timeZone:'America/Los_Angeles',title:taskId,workspaceId:'w1'});
const today='2026-11-06',week=R.runningSections([],new Map(),today,{scope:'both',sort:'manual'}).week;

test('views: Scheduled Board and Running List inside Tasks; preferences parse safely',()=>{
 assert.deepEqual(R.tasksViews.map(v=>v.label),['Scheduled Board','Running List']);
 assert.equal(R.parseTasksView('nope'),'board');assert.equal(R.parseTasksView('running'),'running');
 assert.equal(R.parseScheduleScope('x'),'both');assert.equal(R.parseRunningSort('x'),'manual');
 assert.deepEqual([week[0],week[6]],['2026-11-02','2026-11-08'],'weeks run Monday–Sunday');
});

test('completion day comes from the server history in local time, never from the planned date',()=>{
 // Completed late Thursday night in Los Angeles = Friday in UTC. The marker belongs on Thursday.
 const a=task('a',{complete:true,completedAt:'2026-11-06T07:30:00Z',plannedDate:'2026-11-03'});
 const done=R.completionDays([a],[ev('a',true,'2026-11-06T07:30:00Z','2026-11-05')],'America/Los_Angeles');
 assert.equal(done.get('a'),'2026-11-05','local completion day, not UTC, not the planned Tuesday');
 // Not yet echoed by the server: fall back to the timestamp in the person's zone.
 const b=task('b',{complete:true,completedAt:'2026-11-06T18:00:00Z'});
 assert.equal(R.completionDays([b],[],'America/Los_Angeles').get('b'),'2026-11-06');
 // Reopened: no completion day, even though history once said complete.
 const c=task('c',{complete:false});assert.equal(R.completionDays([c],[ev('c',true,'2026-11-03T10:00:00Z','2026-11-03')],'UTC').has('c'),false);
 // Recurring task: one record, its latest completion only (no invented occurrences).
 const r=task('r',{complete:true,completedAt:'2026-11-06T10:00:00Z',recurrence:{frequency:'daily',interval:1}});
 const hist=[ev('r',true,'2026-11-02T10:00:00Z','2026-11-02'),ev('r',false,'2026-11-03T10:00:00Z','2026-11-03'),ev('r',true,'2026-11-06T10:00:00Z','2026-11-06')];
 const strip=R.weekStrip(r,week,R.completionDays([r],hist,'UTC').get('r'),today);
 assert.deepEqual(strip.filter(c=>c.completed).map(c=>c.date),['2026-11-06'],'one marker, the latest real completion');
});

test('sections: unscheduled open tasks stay in Active every week; Completed this week is by completion day',()=>{
 const tasks=[task('inbox'),task('dated',{plannedDate:'2026-11-20'}),task('donefri',{complete:true,completedAt:'2026-11-06T10:00:00Z',plannedDate:'2026-11-03'}),task('donelast',{complete:true,completedAt:'2026-10-28T10:00:00Z'})];
 const done=R.completionDays(tasks,[],'UTC');
 for(const w of [today,'2026-11-13','2026-10-01']){const s=R.runningSections(tasks,done,w,{scope:'both',sort:'manual'});assert.deepEqual(s.active.map(t=>t.id),['inbox','dated'],`week of ${w}`);}
 assert.deepEqual(R.runningSections(tasks,done,today,{scope:'both',sort:'manual'}).completed.map(t=>t.id),['donefri']);
 assert.deepEqual(R.runningSections(tasks,done,'2026-10-28',{scope:'both',sort:'manual'}).completed.map(t=>t.id),['donelast'],'navigate weeks to review history');
 assert.deepEqual(R.runningSections(tasks,done,today,{scope:'unscheduled',sort:'manual'}).active.map(t=>t.id),['inbox']);
 assert.deepEqual(R.runningSections(tasks,done,today,{scope:'scheduled',sort:'manual'}).active.map(t=>t.id),['dated']);
 assert.deepEqual(R.runningSections([task('old',{createdAt:'2026-01-01'}),task('new',{createdAt:'2026-11-05'})],done,today,{scope:'both',sort:'created'}).active.map(t=>t.id),['new','old']);
 assert.deepEqual(R.weekSummary(done,week,today),{week:1,today:1},'counted once per task');
});

test('weekday strip: ✓ on the completion day, ○ on the planned day, only today acts',()=>{
 const t=task('t',{plannedDate:'2026-11-04'});
 const cells=R.weekStrip(t,week,undefined,today);
 assert.deepEqual(cells.map(c=>[c.date.slice(8),c.planned,c.completed,c.actionable]).filter(c=>c[1]||c[2]||c[3]),[['04',true,false,false],['06',false,false,true]]);
 assert.match(cells[4].label,/Friday, November 6\. Complete today/);assert.match(cells[2].label,/Wednesday, November 4: planned/);
 const doneEarlier=task('d',{complete:true,plannedDate:'2026-11-03'});
 assert.ok(R.weekStrip(doneEarlier,week,'2026-11-05',today).every(c=>!c.actionable),'completed on another day: nothing to click, no overwrite');
 assert.ok(R.weekStrip(doneEarlier,week,'2026-11-06',today).find(c=>c.today).actionable,'completed today: today can reopen');
 // Completing never touches the planned date (one task/toggle on the same record).
 const state={tasks:[t],events:[],workspaces:[{id:'w1',name:'W',accent:'primary'}],groups:[],tags:[],activeTimer:null};
 const after=P.plannerReducer(state,{type:'task/toggle',id:'t',now:'2026-11-06T18:00:00Z'}).tasks;
 assert.equal(after.length,1);assert.equal(after[0].plannedDate,'2026-11-04');assert.equal(after[0].complete,true);
});

test('wiring: a view inside Tasks, no date on quick add, destination asked for with All workspaces, no new tables',()=>{
 const planner=read('components/planner/Planner.tsx'),list=read('components/planner/RunningList.tsx'),utils=read('components/planner/PlannerUtilities.tsx');
 assert.match(utils,/label="Tasks view"/);assert.match(planner,/tasksView === "running" && <RunningList/);assert.match(planner,/tasksView === "board" &&/,'the Scheduled Board stays');
 assert.match(list,/createTask\(title, destination, crypto\.randomUUID\(\), new Date\(\)\.toISOString\(\), undefined\)/,'never auto-schedules');
 assert.match(list,/label="Add to workspace"/);assert.match(list,/role="img" aria-label=\{c\.label\}/,'past cells are read-only with full-date labels');
 assert.doesNotMatch(list,/canceled|cancelled/i,'no invented canceled status');
 assert.doesNotMatch(read('lib/running-list.ts'),/from ['"]@\/lib\/supabase|\.from\(/,'reads canonical tasks only');
 assert.match(read('lib/planner.ts'),/"task\/toggle"/);
});
