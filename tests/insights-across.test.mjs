import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {load,root} from './helpers.mjs';

const ranges=load('lib/insights/ranges'),{normalizeInsights}=load('lib/insights/normalize'),{calculateInsights}=load('lib/insights/metrics'),across=load('lib/insights/across'),prefs=load('lib/insights/preferences'),goals=load('lib/wellness-goals');
const {plannerSample}=load('lib/planner-sample'),{ritualsSample}=load('lib/rituals-sample'),{nourishSample}=load('lib/nourish-sample'),{moneySample}=load('lib/money-sample'),{initialMoodState}=load('lib/mood');
const empty=()=>{const input={planner:structuredClone(plannerSample),rituals:structuredClone(ritualsSample),nourish:structuredClone(nourishSample),money:structuredClone(moneySample),mood:structuredClone(initialMoodState),movement:[],water:[],today:'2026-11-05',timeZone:'UTC',source:{kind:'prototype-session'}};input.planner.tasks=[];input.planner.events=[];input.planner.completionHistory=[];input.rituals.rituals=[];input.rituals.entries=[];input.nourish.assignments=[];for(const key of Object.keys(input.money))input.money[key]=[];return input;};
const range={start:'2026-10-07',end:'2026-11-05'},previous=ranges.previousRange(range);
const types=[{id:'movement-upper',name:'Upper',source:'starter',archived:false},{id:'movement-cardio',name:'Cardio',source:'starter',archived:false}];
const days=ranges.rangeDays(range);

test('Across Muse lists separate, traceable module totals and omits modules without records',()=>{
 const input=empty();
 const m=calculateInsights(normalizeInsights(input),range),p=calculateInsights(normalizeInsights(input),previous);
 assert.deepEqual(across.macroSummary({current:m,previous:p,sources:{timeZone:'UTC',wellness:{activities:[],types,water:[],assignments:[]},planner:input.planner},previousRange:previous,compare:true}),[],'no records, no rows (and never a row of zeroes)');
 const activities=[{id:'a',date:'2026-10-20',typeId:'movement-upper',durationMinutes:40},{id:'b',date:'2026-10-21',typeId:'movement-cardio'},{id:'c',date:'2026-10-01',typeId:'movement-upper',durationMinutes:30}];
 const completionHistory=[{id:'e1',taskId:'t1',complete:true,occurredAt:'2026-10-10T10:00:00Z',localDate:'2026-10-10'},{id:'e2',taskId:'t1',complete:false,occurredAt:'2026-10-11T10:00:00Z',localDate:'2026-10-11'},{id:'e3',taskId:'t1',complete:true,occurredAt:'2026-10-12T10:00:00Z',localDate:'2026-10-12'}];
 const rows=across.macroSummary({current:m,previous:p,sources:{timeZone:'UTC',wellness:{activities,types,water:[],assignments:[]},planner:{tasks:[],completionHistory}},previousRange:previous,compare:true});
 const row=id=>rows.find(r=>r.id===id);
 assert.equal(row('tasks').current,1,'a re-completed task counts once');
 assert.equal(row('workouts').current,2);assert.equal(row('workouts').previous,1);
 assert.match(row('workouts').detail,/1 strength · 1 cardio/);
 assert.equal(row('workout-minutes').detail,'1 session without a time');
 assert.equal(rows.some(r=>r.id==='spending'||r.id==='mood'),false);
 assert.ok(rows.every(r=>r.definition.length>20&&r.href.startsWith('/')),'every figure explains itself and links to its owner');
 const quiet=across.macroSummary({current:m,previous:p,sources:{timeZone:'UTC',wellness:{activities,types,water:[],assignments:[]}},previousRange:previous,compare:false});
 assert.ok(quiet.every(r=>r.previous===null),'comparison off means no previous values');
});

test('cross-module comparisons need five days on each side and use recorded movement, not intentions',()=>{
 const input=empty();
 input.dailyPulse=days.map((date,i)=>({date,energy:i%2?4:7,stress:null,overallDay:null}));
 const m=calculateInsights(normalizeInsights(input),range);
 const moved=days.filter((_,i)=>i%2===0).map((date,i)=>({id:`m${i}`,date,typeId:'movement-upper'}));
 const [movement]=across.crossModuleConnections(m,{timeZone:'UTC',wellness:{activities:moved,types,water:[],assignments:[]}});
 assert.equal(movement.id,'movement-energy');assert.equal(movement.result.enough,true);
 assert.equal(movement.result.withMean,7);assert.equal(movement.result.withoutMean,4);
 assert.equal(movement.result.withN+movement.result.withoutN,days.length);
 const few=across.crossModuleConnections(m,{timeZone:'UTC',wellness:{activities:moved.slice(0,3),types,water:[],assignments:[]}})[0];
 assert.equal(few.result.enough,false);assert.equal(few.result.withMean,null,'suppressed below the sample threshold');
 assert.deepEqual(across.compareDays(['a','b'],()=>true,()=>null),{withN:0,withoutN:0,withMean:null,withoutMean:null,enough:false},'unrated days are excluded');
});

test('recap facts reuse owners and keep unknowns explicit',()=>{
 const input=empty();
 const m=calculateInsights(normalizeInsights(input),range);
 const goal=goals.newGoal('workouts','week',2,'sessions','2026-10-07','2026-10-07T00:00:00Z','g');
 const activities=['2026-10-07','2026-10-08','2026-10-14','2026-10-21','2026-10-22'].map((date,i)=>({id:`w${i}`,date,typeId:'movement-upper'}));
 const facts=across.recapFacts({metrics:m,sources:{timeZone:'UTC',wellness:{activities,types,water:[{date:'2026-10-07',total:90,goal:80,unit:'oz'}],assignments:[]},planner:{tasks:[],completionHistory:[]}},goals:[goal],today:'2026-11-05'});
 assert.equal(facts.tasks.completed,0);
 assert.equal(facts.wellness.workouts,5);assert.deepEqual(facts.wellness.hydration,{recordedDays:1,metDays:1});
 const g=facts.wellness.goals[0];
 assert.deepEqual([g.achieved,g.missed,g.unknown],[2,1,1],'two weeks met, one recorded week below target, and a week with no records is unknown rather than missed');
 assert.equal(facts.reading,null,'reading is absent when its source did not load, not zero');
 assert.equal(facts.money,null);
 assert.equal(facts.rituals.consistency,null);
});

test('Insights preferences parse safely and hidden sections cannot be the default',()=>{
 assert.deepEqual(prefs.parseInsightsPreferences(null),{hidden:[],defaultView:'overview',defaultRange:'30',dailyGoals:true});
 assert.deepEqual(prefs.parseInsightsPreferences({hidden:['money','money','nope'],defaultView:'money',defaultRange:'5',dailyGoals:'yes'}),{hidden:['money'],defaultView:'overview',defaultRange:'30',dailyGoals:true});
 assert.deepEqual(prefs.parseInsightsPreferences({hidden:['astrology'],defaultView:'nourish',defaultRange:'year',dailyGoals:false}),{hidden:['astrology'],defaultView:'nourish',defaultRange:'year',dailyGoals:false});
});

test('Insights wiring: customize, macro panel, connections, Wellness goals and the Daily Edit glance',()=>{
 const read=p=>readFileSync(join(root,p),'utf8');
 const page=read('components/insights/Insights.tsx');
 for(const pattern of [/<InsightsCustomize /,/macro=\{<AcrossMuse rows=\{macro\}\/>\}/,/<CrossConnections items=\{connections\}\/>/,/<WellnessGoalInsights /,/navItems=sections\.filter/])assert.match(page,pattern);
 assert.match(read('components/insights/PlansInsights.tsx'),/connectedComplete/);
 const daily=read('components/DailyEdit.tsx');assert.match(daily,/<WellnessGoalsGlance date=\{selectedDate\}\/>/);
 assert.match(read('components/DailyEdit.css'),/\.muse-goals-glance \{ order:7; \}/);
 assert.match(read('components/nourish/WellnessGoalsGlance.tsx'),/useInsightsPreferences\(profile\.id,active\.length>0\)/,'no preference request unless a goal is active');
});
