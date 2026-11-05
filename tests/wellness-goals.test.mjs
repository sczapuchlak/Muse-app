import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';

const engine=load('lib/progress/engine'),goals=load('lib/wellness-goals'),connections=load('lib/ritual-connections'),rituals=load('lib/rituals'),wellness=load('lib/wellness');
const types=[{id:'movement-upper',name:'Upper',source:'starter',archived:false},{id:'movement-cardio',name:'Cardio',source:'starter',archived:false},{id:'custom-climb',name:'Climb',source:'custom',archived:false,category:'strength'},{id:'custom-dance',name:'Dance',source:'custom',archived:false}];
const wellnessSource=(over={})=>({water:[],activities:[],types,assignments:[],...over});
const sources=(over={})=>({timeZone:'UTC',wellness:wellnessSource(over.wellness),reading:over.reading,planner:over.planner});

test('workouts are classified by type, counted once per record, and unknown durations stay incomplete',()=>{
 const activities=[{id:'a',date:'2026-11-02',typeId:'movement-upper',durationMinutes:45},{id:'b',date:'2026-11-02',typeId:'movement-cardio',durationMinutes:30},{id:'c',date:'2026-11-03',typeId:'custom-climb'},{id:'d',date:'2026-11-04',typeId:'custom-dance',durationMinutes:20},{id:'a',date:'2026-11-02',typeId:'movement-upper',durationMinutes:45}];
 const all=engine.measureDays({metric:'workouts'},sources({wellness:{activities}}));
 assert.equal(all.days.get('2026-11-02').value,2,'two sessions in one day; the duplicate id counts once');
 const strength=engine.measureDays({metric:'workouts',category:'strength'},sources({wellness:{activities}}));
 assert.deepEqual([...strength.days.keys()],['2026-11-02','2026-11-03'],'starter Upper and custom Climb are Strength; uncategorised Dance is not');
 const minutes=engine.measureDays({metric:'workout-minutes'},sources({wellness:{activities}}));
 assert.equal(minutes.days.get('2026-11-02').value,75);
 assert.equal(minutes.days.get('2026-11-03').complete,false,'a session without a duration is incomplete, not zero');
 const week=engine.periodTotal(minutes.days,'2026-11-02','week');
 assert.equal(week.value,95);assert.equal(week.incompleteDays,1);
});

test('hydration converts units and separates no record from a recorded zero',()=>{
 const water=[{date:'2026-11-02',total:1000,unit:'mL',goal:2000},{date:'2026-11-03',total:0,unit:'oz',goal:80}];
 const days=engine.measureDays({metric:'water',unit:'oz'},sources({wellness:{water}})).days;
 assert.ok(Math.abs(days.get('2026-11-02').value-33.81)<0.01);
 assert.equal(days.get('2026-11-03').recorded,true);assert.equal(days.get('2026-11-03').value,0);
 assert.equal(days.has('2026-11-04'),false);
});

test('tasks count once on their latest completion and reopened tasks stop counting',()=>{
 const completionHistory=[{id:'e1',taskId:'t1',complete:true,occurredAt:'2026-11-01T10:00:00Z',localDate:'2026-11-01'},{id:'e2',taskId:'t1',complete:false,occurredAt:'2026-11-02T10:00:00Z',localDate:'2026-11-02'},{id:'e3',taskId:'t1',complete:true,occurredAt:'2026-11-03T10:00:00Z',localDate:'2026-11-03'},{id:'e4',taskId:'t2',complete:true,occurredAt:'2026-11-03T11:00:00Z',localDate:'2026-11-03'},{id:'e5',taskId:'t3',complete:true,occurredAt:'2026-11-03T11:00:00Z',localDate:'2026-11-03'},{id:'e6',taskId:'t3',complete:false,occurredAt:'2026-11-04T11:00:00Z',localDate:'2026-11-04'}];
 const days=engine.measureDays({metric:'tasks-completed'},sources({planner:{tasks:[],completionHistory}})).days;
 assert.deepEqual([...days.values()].map(d=>[d.date,d.value]),[['2026-11-03',2]]);
});

test('periods respect Monday weeks, month lengths and years',()=>{
 assert.equal(engine.periodStart('2026-11-05','week'),'2026-11-02');
 assert.equal(engine.periodEnd('2026-02-01','month'),'2026-02-28');
 assert.equal(engine.periodEnd('2026-12-01','month'),'2026-12-31');
 assert.deepEqual(engine.periodStarts('2026-01-15','2026-03-02','month'),['2026-01-01','2026-02-01','2026-03-01']);
});

test('goal versions keep historical targets, and pausing is never a miss',()=>{
 let goal=goals.newGoal('strength-workouts','week',2,'sessions','2026-10-14','2026-10-14T09:00:00Z','g1');
 assert.equal(goal.versions[0].effectiveFrom,'2026-10-12','a weekly goal starts with the current week');
 goal=goals.withVersion(goal,'2026-10-28',{target:3},'2026-10-28T09:00:00Z');
 goal=goals.withVersion(goal,'2026-11-04',{status:'paused'},'2026-11-04T09:00:00Z');
 const activities=['2026-10-13','2026-10-15','2026-10-20','2026-10-27','2026-10-28','2026-10-29'].map((date,i)=>({id:`w${i}`,date,typeId:'movement-upper'}));
 const {results}=goals.goalHistory(goal,sources({wellness:{activities}}),'2026-11-05',5);
 assert.deepEqual(results.map(r=>[r.start,r.status,r.target]),[
  ['2026-10-05','inactive',null],['2026-10-12','achieved',2],['2026-10-19','missed',2],['2026-10-26','achieved',3],['2026-11-02','paused',3]]);
 const summary=goals.adherence(results);
 assert.deepEqual([summary.achieved,summary.missed,summary.paused,summary.inactive],[2,1,1,1]);
 assert.equal(summary.rate,2/3);
});

test('daily goals separate unknown days, recorded misses and incomplete nutrition',()=>{
 const goal=goals.newGoal('water','day',80,'oz','2026-11-01','2026-11-01T08:00:00Z','w');
 const water=[{date:'2026-11-01',total:90,unit:'oz'},{date:'2026-11-02',total:40,unit:'oz'},{date:'2026-11-04',total:20,unit:'oz'}];
 const {results}=goals.goalHistory(goal,sources({wellness:{water}}),'2026-11-04',4);
 assert.deepEqual(results.map(r=>r.status),['achieved','missed','unknown','in-progress']);
 const protein=goals.newGoal('nutrition-protein','day',100,'g','2026-11-01','2026-11-01T08:00:00Z','p');
 const assignments=[{id:'m1',date:'2026-11-01',nutrition:{protein:60}},{id:'m2',date:'2026-11-01'},{id:'m3',date:'2026-11-02',nutrition:{protein:40}}];
 const nutrition=goals.goalHistory(protein,sources({wellness:{assignments}}),'2026-11-03',3).results;
 assert.deepEqual(nutrition.map(r=>r.status),['unknown','missed','in-progress'],'a meal without protein makes the day unknown, never a miss');
 const calories=goals.newGoal('nutrition-calories','day',2000,'kcal','2026-11-01','2026-11-01T08:00:00Z','c');
 const meals=[{id:'k1',date:'2026-11-01',nutrition:{calories:1800}},{id:'k2',date:'2026-11-02',nutrition:{calories:2400}}];
 assert.deepEqual(goals.goalHistory(calories,sources({wellness:{assignments:meals}}),'2026-11-03',3).results.map(r=>r.status),['achieved','missed','in-progress'],'at-most goals');
});

test('goal saves need a supported server and invalid durations are ignored',()=>{
 const base=wellness.emptyWellness();
 const goal=goals.newGoal('workouts','week',3,'sessions','2026-11-05','2026-11-05T08:00:00Z','g');
 assert.equal(wellness.wellnessReducer(base,{kind:'goal/save',goal}).goals,undefined,'no goals before the server supports them');
 assert.equal(wellness.wellnessReducer({...base,goals:[]},{kind:'goal/save',goal}).goals.length,1);
 const state={...base,activities:[{id:'a',date:'2026-11-05',typeId:'movement-upper'}]};
 assert.equal(wellness.wellnessReducer(state,{kind:'activity/duration',id:'a',durationMinutes:0}),state);
 assert.equal(wellness.wellnessReducer(state,{kind:'activity/duration',id:'a',durationMinutes:40}).activities[0].durationMinutes,40);
 assert.throws(()=>goals.newGoal('water','week',80,'oz','2026-11-05','x','w'),/period/);
});

const group={id:'grp',name:'Body',accent:'primary'};
const ritual=(over)=>({id:'r1',name:'Hydrate',groupId:'grp',type:'numeric',goal:80,unit:'oz',recurrence:{kind:'daily'},startDate:'2026-10-01',createdAt:'2026-10-01T00:00:00Z',...over});

test('connected rituals derive from source records, recalculate on edits, and stay read-only',()=>{
 const r=ritual({connection:{metric:'water',unit:'oz',since:'2026-11-02'}});
 const state={groups:[group],rituals:[r],entries:[{id:'r1/2026-11-01',ritualId:'r1',date:'2026-11-01',value:50,updatedAt:'x'},{id:'r1/2026-11-02',ritualId:'r1',date:'2026-11-02',value:10,updatedAt:'x'}],celebratedMilestones:[],connectionsEnabled:true};
 const water=[{date:'2026-11-01',total:99,unit:'oz'},{date:'2026-11-02',total:85,unit:'oz'},{date:'2026-11-03',total:30,unit:'oz'},{date:'2026-11-06',total:90,unit:'oz'}];
 const view=connections.withConnections(state,sources({wellness:{water}}),'2026-11-05');
 const value=d=>view.state.entries.find(e=>e.date===d)?.value;
 assert.equal(value('2026-11-01'),50,'before the connection date the manual history stays');
 assert.equal(value('2026-11-02'),85,'connected value replaces the manual one from the connection date');
 assert.equal(value('2026-11-06'),undefined,'future records never count');
 assert.equal(rituals.ritualCell(view.state,r,'2026-11-02','2026-11-05').status,'complete');
 assert.equal(rituals.ritualCell(view.state,r,'2026-11-03','2026-11-05').status,'partial');
 assert.equal(rituals.ritualCell(view.state,r,'2026-11-04','2026-11-05').status,'unknown','no record is unknown, not missed');
 const corrected=connections.withConnections(state,sources({wellness:{water:water.filter(d=>d.date!=='2026-11-02')}}),'2026-11-05');
 assert.equal(corrected.state.entries.some(e=>e.date==='2026-11-02'&&e.derived),false,'deleting the source removes the derived value');
 assert.equal(rituals.ritualReducer(state,{type:'entry/set',ritualId:'r1',date:'2026-11-03',value:80,today:'2026-11-05',now:'n'}),state,'manual logging is blocked while connected');
});

test('weekly targets count qualifying workouts without double counting',()=>{
 const r=ritual({id:'r2',type:'weekly-target',goal:3,unit:'workouts',connection:{metric:'workouts',category:'strength',since:'2026-11-02'}});
 const activities=[{id:'a',date:'2026-11-02',typeId:'movement-upper'},{id:'b',date:'2026-11-02',typeId:'custom-climb'},{id:'c',date:'2026-11-03',typeId:'movement-cardio'},{id:'d',date:'2026-11-04',typeId:'movement-upper'}];
 const state={groups:[group],rituals:[r],entries:[],celebratedMilestones:[],connectionsEnabled:true};
 const view=connections.withConnections(state,sources({wellness:{activities}}),'2026-11-05');
 assert.equal(rituals.weeklyValue(view.state,r,'2026-11-05'),3);
 assert.equal(view.derived.get('r2/2026-11-02').recordIds.length,2);
});

test('checkbox thresholds, reading minutes and books finished connect through the same engine',()=>{
 const reading={sessions:[{id:'s1',bookId:'b',date:'2026-11-03',timeZone:'UTC',pages:12,activeSegments:[{start:'2026-11-03T10:00:00Z',end:'2026-11-03T10:25:00Z'}]}],books:[{id:'b',title:'B',status:'finished',reviewEmojis:[],finishedOn:'2026-11-04',createdAt:'2026-10-01T00:00:00Z',completions:[{id:'c1',finishedOn:'2026-11-04',recordedAt:'2026-11-04T00:00:00Z'}]}]};
 const read=ritual({id:'r3',type:'checkbox',goal:1,unit:'done',connection:{metric:'reading-minutes',threshold:20,since:'2026-11-01'}});
 const state={groups:[group],rituals:[read],entries:[],celebratedMilestones:[],connectionsEnabled:true};
 assert.equal(connections.withConnections(state,sources({reading}),'2026-11-05').state.entries[0].value,1);
 const strict={...read,connection:{...read.connection,threshold:30}};
 assert.equal(connections.withConnections({...state,rituals:[strict]},sources({reading}),'2026-11-05').state.entries.length,0,'below the threshold nothing is derived');
 const books=engine.measureDays({metric:'books-finished'},sources({reading}));
 assert.equal(books.days.get('2026-11-04').value,1);
 assert.equal(connections.validConnection({type:'duration'},{metric:'water',since:'2026-11-01'}),false,'water cannot drive a duration ritual');
});

test('disconnecting stores exactly what was shown and keeps manual history',()=>{
 const r=ritual({connection:{metric:'water',unit:'oz',since:'2026-11-02'}});
 const state={groups:[group],rituals:[r],entries:[{id:'r1/2026-11-01',ritualId:'r1',date:'2026-11-01',value:50,updatedAt:'x'}],celebratedMilestones:[],connectionsEnabled:true};
 const src=sources({wellness:{water:[{date:'2026-11-02',total:85,unit:'oz'},{date:'2026-11-03',total:30,unit:'oz'}]}});
 const materialize=connections.materializeConnection(r,src,'2026-11-05');
 const next=rituals.ritualReducer(state,{type:'ritual/connect',id:'r1',connection:null,materialize,today:'2026-11-05',now:'2026-11-05T10:00:00Z'});
 assert.equal(next.rituals[0].connection,null);
 assert.deepEqual(next.entries.map(e=>[e.date,e.value]).sort(),[['2026-11-01',50],['2026-11-02',85],['2026-11-03',30]]);
 assert.equal(rituals.ritualReducer({...state,connectionsEnabled:false},{type:'ritual/connect',id:'r1',connection:null,materialize,today:'2026-11-05',now:'n'}).rituals[0].connection.metric,'water','no connection changes before the server supports them');
});

test('shared Wellness summaries count categories, untimed sessions and hydration days honestly',()=>{
 const aggregates=load('lib/wellness-aggregates');
 const state={types,activities:[{id:'a',date:'2026-11-02',typeId:'movement-upper',durationMinutes:40},{id:'b',date:'2026-11-03',typeId:'movement-cardio'},{id:'c',date:'2026-11-09',typeId:'custom-dance',durationMinutes:30}],water:[{date:'2026-11-02',total:90,goal:80,unit:'oz'},{date:'2026-11-03',total:20,goal:80,unit:'oz'}],assignments:[]};
 const week=aggregates.wellnessPeriodSummary(state,'2026-11-02','week','2026-11-05');
 assert.deepEqual([week.workouts,week.byCategory.strength,week.byCategory.cardio,week.minutes,week.sessionsWithoutDuration],[2,1,1,40,1]);
 assert.deepEqual(week.hydration,{recordedDays:2,metDays:1});
 assert.equal(aggregates.wellnessSeries(state,'2026-11-01','2026-12-31','month','2026-11-05').length,1,'future months are not reported');
 const history=aggregates.hydrationHistory(state,'2026-11-04',4);
 assert.deepEqual(history.map(r=>[r.start,r.status,r.target]),[['2026-11-01','unknown',null],['2026-11-02','achieved',80],['2026-11-03','missed',80],['2026-11-04','in-progress',null]],'each day is graded by the goal saved with it');
});

test('Rituals surfaces read the connected view while writes stay with the Ritual owner',async()=>{
 const {readFileSync}=await import('node:fs');const {join}=await import('node:path');const {root}=await import('./helpers.mjs');
 const read=p=>readFileSync(join(root,p),'utf8');
 for(const file of ['components/rituals/Rituals.tsx','components/rituals/RitualGroup.tsx','components/rituals/RitualWeekNavigator.tsx','components/rituals/LittleRituals.tsx','components/insights/useInsightsSources.ts'])assert.match(read(file),/useRitualView\(\)/,file);
 const cell=read('components/rituals/RitualWeekCell.tsx');assert.match(cell,/data-connected="true"/);assert.match(cell,/Edit the source record to change it/);
 const editor=read('components/rituals/RitualEditor.tsx');assert.match(editor,/materializeConnection\(initial/);assert.match(editor,/disabled=\{!state\.connectionsEnabled\}/);
 assert.match(read('components/AppShell.tsx'),/<ConnectedRitualsProvider timeZone=\{profile\.timeZone\}>/);
 assert.match(read('components/rituals/ConnectedRituals.tsx'),/useWhimsyData\(\{autoload:false\}\)/,'reading data is fetched only when a ritual needs it');
 assert.match(read('components/nourish/Nourish.tsx'),/\{id:"goals",label:"Goals"\}/);
 assert.match(read('components/MovementCard.tsx'),/kind:'activity\/duration'/);
});

test('nutrition goals are planned, never worded as achieved intake',async()=>{
 for(const m of ['nutrition-protein','nutrition-calories','nutrition-carbs','nutrition-fat']){assert.equal(goals.goalMetricInfo[m].basis,'planned');assert.match(goals.goalMetricInfo[m].label,/\(planned\)/);}
 for(const m of ['workouts','strength-workouts','cardio-workouts','workout-minutes'])assert.equal(goals.goalMetricInfo[m].basis,'recorded');
 assert.equal(goals.goalStatusLabel('achieved','planned'),'Plan meets target');
 assert.equal(goals.goalStatusLabel('missed','planned'),'Plan below target');
 assert.equal(goals.goalStatusLabel('achieved'),'Met');
 const {readFileSync}=await import('node:fs');const {join}=await import('node:path');const {root}=await import('./helpers.mjs');
 const read=p=>readFileSync(join(root,p),'utf8');
 assert.match(read('components/nourish/WellnessGoals.tsx'),/not confirmed intake/);
 assert.match(read('components/nourish/WellnessGoalsGlance.tsx'),/goalStatusLabel\(result\.status,goalMetricInfo\[goal\.metric\]\.basis\)/);
 assert.match(read('components/insights/WellnessGoalInsights.tsx'),/Plan met/);
});
