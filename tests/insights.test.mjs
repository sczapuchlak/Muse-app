import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import React from 'react';
import {renderWithWellness as renderToStaticMarkup} from './wellness-render.mjs';
import {load,root} from './helpers.mjs';
const ranges=load('lib/insights/ranges'),{normalizeInsights,dailySessionRecords}=load('lib/insights/normalize'),{calculateInsights}=load('lib/insights/metrics'),{generateRevelations}=load('lib/insights/revelations'),{emptyCheckIn,initialMoodState}=load('lib/mood');
const {plannerSample}=load('lib/planner-sample'),{ritualsSample}=load('lib/rituals-sample'),{nourishSample}=load('lib/nourish-sample'),{moneySample}=load('lib/money-sample');
const sample=()=>({planner:structuredClone(plannerSample),rituals:structuredClone(ritualsSample),nourish:structuredClone(nourishSample),money:structuredClone(moneySample),mood:structuredClone(initialMoodState),movement:[],water:[],today:'2026-10-30',timeZone:'America/Los_Angeles',source:{kind:'prototype-session'}});
const empty=()=>{const input=sample();input.planner.tasks=[];input.planner.events=[];input.rituals.rituals=[];input.rituals.entries=[];input.nourish.assignments=[];for(const key of Object.keys(input.money))input.money[key]=[];return input;};
const period={start:'2026-10-26',end:'2026-11-01'};
const metrics=(input,range=period)=>calculateInsights(normalizeInsights(input),range);

test('Insights ranges use local calendar boundaries, inclusive periods and equal-length previous periods',()=>{
 assert.deepEqual(ranges.rangeFor('7','2026-11-01'),{start:'2026-10-26',end:'2026-11-01'});assert.equal(ranges.rangeDays({start:'2028-02-28',end:'2028-03-01'}).length,3);assert.deepEqual(ranges.previousRange({start:'2028-02-28',end:'2028-03-01'}),{start:'2028-02-25',end:'2028-02-27'});
 assert.deepEqual(ranges.rangeFor('year','2026-10-30'),{start:'2026-01-01',end:'2026-10-30'});assert.equal(ranges.rangeDays({start:'2026-02-30',end:'2026-03-01'}).length,0);assert.equal(ranges.rangeDays({start:'2026-10-30',end:'2026-10-29'}).length,0);assert.equal(ranges.rangeDays({start:'2020-01-01',end:'2026-01-01'}).length,0);
 assert.equal(ranges.localTimestampDate('2026-10-30T02:00:00Z','America/Los_Angeles'),'2026-10-29');assert.equal(ranges.localTimestampDate('2026-10-30','America/Los_Angeles'),'2026-10-30');assert.equal(ranges.localTimestampDate('2026-02-30T02:00:00Z','UTC'),undefined);assert.equal(ranges.within('2026-02-30',{start:'2026-02-01',end:'2026-03-01'}),false);
});

test('missing or zero comparison baselines never create misleading percentage changes',()=>{
 assert.deepEqual(ranges.compareCounts(5,0,false),{difference:null,percent:null});assert.deepEqual(ranges.compareCounts(5,0,true),{difference:5,percent:null});assert.deepEqual(ranges.compareCounts(6,3,true),{difference:3,percent:100});
});

test('empty sources do not receive demo records, synthetic revelations or averages',()=>{
 const input=normalizeInsights(empty()),result=calculateInsights(input,period),previous=calculateInsights(input,ranges.previousRange(period));assert.equal(result.planner.planned.length,0);assert.equal(result.rituals.opportunities.length,0);assert.equal(result.mood.day.value,null);assert.equal(result.money.transactions.length,0);assert.equal(result.nourish.assignments.length,0);assert.deepEqual(generateRevelations(result,previous),[]);
 const {Overview}=load('components/insights/Overview'),html=renderToStaticMarkup(React.createElement(Overview,{metrics:result,revelations:[],onDate(){}}));assert.ok(html.includes('Your patterns are still introducing themselves.'));assert.ok(!html.includes('muse-insight-chart-canvas'));
});

test('task metrics separate planned snapshot, creation date and actual completion timestamp',()=>{
 const input=empty(),base=plannerSample.tasks[0];input.planner.tasks=[{...base,id:'dated',plannedDate:'2026-10-29',createdAt:'2026-10-20T12:00:00Z',complete:true,completedAt:'2026-10-30T02:00:00Z',actualMinutes:12,estimatedMinutes:30},{...base,id:'legacy',complete:true,completedAt:undefined,estimatedMinutes:undefined,plannedDate:'2026-10-28',createdAt:'2026-10-28T12:00:00Z'},{...base,id:'inbox',plannedDate:undefined,complete:false,createdAt:'2026-10-29T12:00:00Z'}];
 const result=metrics(input).planner;assert.equal(result.planned.length,2);assert.equal(result.completed.length,2);assert.equal(result.rate,1);assert.equal(result.created.length,2);assert.equal(result.datedCompletions.length,1);assert.equal(result.undatedCompletions,1);assert.equal(result.byDate.find((row)=>row.date==='2026-10-29').completed,1);assert.equal(result.actualMinutes,12);assert.equal(result.estimatedMinutes,30);
 const {plannerReducer}=load('lib/planner');let state={...input.planner,tasks:[{...base,id:'new',complete:false,completedAt:undefined}]};state=plannerReducer(state,{type:'task/toggle',id:'new',now:'2026-10-29T18:00:00Z'});assert.equal(state.tasks[0].completedAt,'2026-10-29T18:00:00Z');state=plannerReducer(state,{type:'task/move',id:'new',date:'2026-11-02'});assert.equal(state.tasks[0].completedAt,'2026-10-29T18:00:00Z');assert.equal(state.tasks[0].complete,true);state=plannerReducer(state,{type:'task/toggle',id:'new',now:'2026-10-30T18:00:00Z'});assert.equal(state.tasks[0].completedAt,undefined);
});

test('Ritual insights keep complete, partial, explicit missed, unknown, unscheduled and future distinct',()=>{
 const input=empty();input.today='2026-10-29';input.rituals={...ritualsSample,rituals:[{...ritualsSample.rituals[1],id:'r',recurrence:{kind:'daily'},startDate:'2026-10-26'}],entries:[{id:'a',ritualId:'r',date:'2026-10-26',value:20,updatedAt:'a'},{id:'b',ritualId:'r',date:'2026-10-27',value:8,updatedAt:'b'},{id:'c',ritualId:'r',date:'2026-10-28',value:0,outcome:'missed',updatedAt:'c'}]};
 const result=metrics(input).rituals;assert.equal(result.opportunities.length,4);assert.equal(result.complete,1);assert.equal(result.partial,1);assert.equal(result.missed,1);assert.equal(result.unknown,1);assert.equal(result.byDate.find((row)=>row.date==='2026-10-30').upcoming,1);
 input.rituals.rituals[0].recurrence={kind:'weekdays',weekdays:[1,3,5]};const filtered=metrics(input).rituals;assert.equal(filtered.byDate.find((row)=>row.date==='2026-10-27').applicable,0);assert.equal(filtered.opportunities.length,2);
});

test('weekly-target quantities use whole-week goals, remain separate and exclude future logged values',()=>{
 const input=empty(),ritual=ritualsSample.rituals.find((item)=>item.type==='weekly-target');input.rituals={...input.rituals,rituals:[ritual],entries:[{id:'one',ritualId:ritual.id,date:'2026-10-26',value:1,updatedAt:'one'},{id:'two',ritualId:ritual.id,date:'2026-10-28',value:2,updatedAt:'two'},{id:'future',ritualId:ritual.id,date:'2026-11-01',value:99,updatedAt:'future'}]};const result=metrics(input,{start:'2026-10-28',end:'2026-10-29'}).rituals;assert.equal(result.opportunities.length,0);assert.equal(result.weekly[0].value,3);assert.equal(result.weekly[0].fullWeek,false);assert.equal(result.entries.length,1);
});

test('Mood averages exclude missing values and family frequencies preserve multiple selected feelings',()=>{
 const input=empty();input.mood.records=[{...emptyCheckIn('2026-10-28','morning'),energy:4,overallDay:8,emotionIds:['emotion-calm','emotion-anxious'],causeTagIds:['context-work']},{...emptyCheckIn('2026-10-28','evening'),energy:8,stress:7,emotionIds:['emotion-calm']}];const result=metrics(input).mood;assert.equal(result.energy.value,6);assert.equal(result.energy.n,2);assert.equal(result.day.value,8);assert.equal(result.day.n,1);assert.equal(result.loggedDays,1);assert.equal(result.families.reduce((sum,row)=>sum+row.count,0),3);assert.equal(result.byDate.find((row)=>row.date==='2026-10-29').day,null);assert.ok(result.weekday.every((row)=>row.day===null));
});

test('normalization deduplicates by identity/date-period, validates numeric values and preserves explicit zero',()=>{
 const input=empty(),record={...emptyCheckIn('2026-10-28','morning'),energy:4,updatedAt:'2026-10-28T09:00:00Z'};input.mood.records=[record,{...record,id:'other-id',energy:6,stress:NaN,updatedAt:'2026-10-28T10:00:00Z'}];const tx={...moneySample.transactions[0],id:'zero',date:'2026-10-28',amountCents:0,splits:[]};input.money.transactions=[tx,{...tx},{...tx,id:'bad',amountCents:NaN},{...tx,id:'invalid-date',date:'2026-02-30'}];input.nourish.assignments=[{...nourishSample.assignments[0],date:'2026-10-28',nutrition:{calories:0,protein:0,carbs:0,fat:NaN}}];
 const normalized=normalizeInsights(input);assert.equal(normalized.mood.records.length,1);assert.equal(normalized.mood.records[0].energy,6);assert.equal(normalized.mood.records[0].stress,null);assert.equal(normalized.money.transactions.length,1);assert.equal(normalized.money.transactions[0].amountCents,0);assert.equal(normalized.nourish.assignments[0].nutrition.calories,0);assert.equal(normalized.nourish.assignments[0].nutrition.fat,undefined);assert.ok(normalized.quality.duplicatesRemoved>=2);assert.equal(normalized.quality.invalidDailyDates,1);assert.ok(normalized.quality.invalidNumericRecords>=3);
});

test('Money counts card purchases once and excludes payments, planned savings, bills and recurring expectations',()=>{
 const input=empty(),base=moneySample.transactions[0];input.money.transactions=[{...base,id:'purchase',date:'2026-10-28',amountCents:10000,cardId:'card',splits:[]}];input.money.payments=[{id:'payment',cardId:'card',amountCents:10000,date:'2026-10-29'}];input.money.bills=[{id:'bill',name:'Bill',amountCents:20000,dueDate:'2026-10-29',recurrence:'once',paid:true}];input.money.recurring=[{id:'recurring',name:'Expected',amountCents:30000,amountBehavior:'fixed',recurrence:{interval:1,unit:'month'},nextChargeDate:'2026-10-29',billingSource:'Direct',status:'active'}];input.money.paychecks=[{id:'pay',name:'Pay',receivedDate:'2026-10-26',periodStart:'2026-10-26',periodEnd:'2026-11-08',actualCents:80000}];input.money.allocations=[{id:'savings',paycheckId:'pay',name:'Saving intent',plannedCents:40000,groupId:'saving'}];
 const result=metrics(input).money;assert.equal(result.spending,10000);assert.equal(result.expected,30000);assert.equal(result.planned,40000);assert.equal(result.income,80000);assert.equal(result.transactions.length,1);assert.equal(input.money.payments.length,1);
});

test('Money split category shares reconcile, unknown allocation actuals stay null and recorded zero stays zero',()=>{
 const input=sample(),base=moneySample.transactions[0];input.money.transactions=[{...base,id:'split',date:'2026-10-28',amountCents:10000,splits:[{id:'split-a',categoryId:'food',amountCents:3000},{id:'split-b',categoryId:'home',amountCents:5000}]}];const result=metrics(input).money;assert.equal(result.categories.reduce((sum,row)=>sum+row.amount,0),10000);assert.equal(result.categories.find((row)=>row.id==='').amount,2000);const pay=input.money.paychecks.find((item)=>item.receivedDate>='2026-10-26'&&item.receivedDate<='2026-11-01')??input.money.paychecks[0];input.money.paychecks=[{...pay,receivedDate:'2026-10-26'}];input.money.allocations=[{id:'unknown',paycheckId:pay.id,name:'Unknown',groupId:'x',plannedCents:0},{id:'zero',paycheckId:pay.id,name:'Zero',groupId:'x',plannedCents:0,actualCents:0}];const next=metrics(input).money;assert.equal(next.allocations[0].actual,null);assert.equal(next.allocations[1].actual,0);assert.equal(next.actualCoverage,1);
});

test('recurring range enumeration retains original month-end anchors without adding actual spending',()=>{
 const input=empty();input.money.recurring=[{id:'r',name:'Month end',amountCents:500,amountBehavior:'fixed',nextChargeDate:'2026-01-31',recurrence:{interval:1,unit:'month'},status:'active',billingSource:'Direct'}];const result=metrics(input,{start:'2026-02-01',end:'2026-03-31'}).money;assert.deepEqual(result.recurring.map((item)=>item.date),['2026-02-28','2026-03-31']);assert.equal(result.expected,1000);assert.equal(result.spending,0);
});

test('Nourish counts planned assignments, not consumption, and nutrition uses only fully known subsets',()=>{
 const input=empty(),base=nourishSample.assignments[0];input.nourish.assignments=[{...base,id:'complete',date:'2026-10-28',nutrition:{calories:0,protein:0,carbs:0,fat:0}},{...base,id:'partial',date:'2026-10-29',nutrition:{calories:500}},{...base,id:'missing',date:'2026-10-30',nutrition:undefined}];const result=metrics(input).nourish;assert.equal(result.assignments.length,3);assert.equal(result.plannedDays,3);assert.equal(result.fullyKnown,1);assert.equal(result.completeNutrition.fields.calories.value,0);assert.equal(result.knownNutrition.fields.calories.value,500);assert.equal(result.knownNutrition.fields.protein.trackedMeals,1);assert.equal(result.weeks[0].days,7);
});

test('daily source extraction reads only canonical records and keeps water units/goals and movement intentions separate',()=>{
 const records={'2026-10-28/water':{date:'2026-10-28',total:100,goal:100,unit:'oz'},'2026-10-29/water':{date:'2026-10-29',total:1000,goal:2000,unit:'mL'},'2026-10-30/water':{date:'2026-10-30',total:0},'2026-10-28/movement':{date:'2026-10-28',typeIds:['walk','walk']},'library/water-goal':100};const daily=dailySessionRecords(records);assert.equal(daily.water.length,3);assert.equal(daily.movement[0].typeIds.length,1);const result=metrics({...empty(),...daily}).daily;assert.equal(result.knownGoals,2);assert.equal(result.waterMet,1);assert.equal(result.movementDays,1);assert.deepEqual(dailySessionRecords({}),{water:[],movement:[]});
});

test('relationships require paired observations and variation; unlogged movement never becomes no movement',()=>{
 const {pearson,relationships}=load('lib/insights/relationships');assert.equal(pearson([[1,2],[2,3]]),null);assert.equal(pearson(Array.from({length:10},()=>[2,4])),null);assert.equal(pearson(Array.from({length:10},(_,i)=>[i,i*2])),1);const input=empty();input.mood.records=Array.from({length:10},(_,i)=>({...emptyCheckIn(`2026-10-${String(i+20).padStart(2,'0')}`,'morning'),energy:i+1,stress:5}));const result=relationships(metrics(input,{start:'2026-10-20',end:'2026-10-30'}));assert.equal(result.movementEnergy.empty,0);assert.equal(result.movementEnergy.selectedMean,null);assert.equal(result.ritualEnergy.r,null);assert.equal(result.stressLoad.r,null);
});

test('Little Revelations are deterministic, range/record traceable and never require a no-data comparison',()=>{
 const input=normalizeInsights(sample()),current=calculateInsights(input,period),previous=calculateInsights(input,ranges.previousRange(period)),first=generateRevelations(current,previous);assert.deepEqual(first,generateRevelations(current,previous));assert.equal(new Set(first.map((item)=>item.type)).size,first.length);for(const item of first){assert.deepEqual(item.range,period);assert.ok(item.sampleSize>0);assert.ok(item.recordIds.length>0);assert.ok(item.basis);assert.ok(item.href.startsWith('/'));}assert.ok(!first.some((item)=>item.type==='completion-comparison'),'legacy undated completions prevent an overclaim');
});

test('Daily Edit renders one Forecast after its section heading and before priorities, outside the date header',()=>{
 const {DailyEdit}=load('components/DailyEdit'),{PlannerProvider}=load('components/PlannerStore'),{NourishProvider}=load('components/NourishStore'),{MuseSessionProvider}=load('components/MuseSession');
 const {AccountPreferencesContext}=load('components/AccountPreferences');const account={loaded:true,saved:{profile:{cosmic_enabled:true,zodiac_sign:null}},draft:{}};const tree=React.createElement(MuseSessionProvider,{initialDate:'2026-10-29'},React.createElement(PlannerProvider,null,React.createElement(NourishProvider,null,React.createElement(DailyEdit))));const html=renderToStaticMarkup(React.createElement(AccountPreferencesContext.Provider,{value:{subscribe:()=>()=>{},getSnapshot:()=>account}},tree));
 assert.equal((html.match(/id="cosmic-forecast"/g)??[]).length,1);
 assert.ok(html.indexOf('</header>')<html.indexOf('id="daily-edit"'));
 assert.ok(html.indexOf('id="daily-edit"')<html.indexOf('class="daily-grid"'));
 assert.ok(html.indexOf('class="daily-grid"')<html.indexOf('id="cosmic-forecast"'));
 assert.ok(html.indexOf('id="cosmic-forecast"')<html.indexOf('id="priorities"'));
 assert.equal((html.match(/id="day-in-three"/g)??[]).length,1);
 assert.ok(html.indexOf('id="mood"')<html.indexOf('id="day-in-three"'));
 assert.ok(html.indexOf('id="day-in-three"')<html.indexOf('id="day-pulse"'));
 const pulse=html.slice(html.indexOf('id="day-pulse"'));assert.ok(pulse.includes('The numbers behind your day.'));assert.ok(!pulse.includes('Morning ratings'));assert.ok(!pulse.includes('Evening ratings'));
 const svg=readFileSync(resolve(root,'public/atmosphere/disco-ball.svg'),'utf8');assert.ok((svg.match(/<polygon/g)??[]).length>700);assert.ok(svg.includes('radialGradient'));assert.ok(!svg.includes('<image'));assert.ok(Buffer.byteLength(svg)<100000);
});

test('date heatmap distinguishes neutral unscheduled, explicit missed, unlogged and upcoming without color alone',()=>{
 const {RitualHeatmap}=load('components/insights/RitualHeatmap'),input=empty();input.rituals=structuredClone(ritualsSample);const result=metrics(input),html=renderToStaticMarkup(React.createElement(RitualHeatmap,{days:result.rituals.byDate,today:input.today,onDate(){}}));assert.ok(html.includes('data-status="upcoming"'));assert.ok(html.includes('data-status="unknown"')||html.includes('data-status="partial"'));assert.ok(html.includes('aria-label="'));assert.ok(html.includes('Not scheduled'));assert.equal((html.match(/tabindex="0"/g)??[]).length,1);
});

test('chart value tables preserve recorded zero and missing values and expose category drill-down by stable identity',()=>{
 const {InsightChart}=load('components/insights/InsightChart');const html=renderToStaticMarkup(React.createElement(InsightChart,{title:'A real series',description:'Known zero is different from missing.',kind:'bar',labelKey:'label',inspectKey:'id',data:[{id:'one',label:'Same name',amount:0},{id:'two',label:'Same name',amount:null}],series:[{key:'amount',label:'Amount',color:'var(--chart-1)'}],onInspect(){}}));assert.ok(html.includes('Read the values'));assert.ok(html.includes('>0</td>'));assert.ok(html.includes('Not recorded'));assert.ok(html.includes('Known zero is different from missing.'));
});


test('Insights streaks reuse recurrence-aware rules and never include entries after the inspected cutoff',()=>{
 const input=empty(),base=ritualsSample.rituals[0];input.rituals={...input.rituals,rituals:[{...base,id:'recurring',type:'checkbox',goal:1,startDate:'2026-10-26',recurrence:{kind:'weekdays',weekdays:[1,3,5]}}],entries:['2026-10-26','2026-10-28','2026-10-30'].map((date)=>({id:date,ritualId:'recurring',date,value:1,updatedAt:date}))};
 const result=metrics(input,{start:'2026-10-28',end:'2026-10-29'}).rituals;assert.equal(result.streakDate,'2026-10-29');assert.equal(result.streaks[0].count,2);assert.equal(result.streaks[0].unit,'scheduled days');
 input.rituals.entries=input.rituals.entries.filter((entry)=>entry.date!=='2026-10-28');assert.equal(metrics(input,{start:'2026-10-28',end:'2026-10-29'}).rituals.streaks[0].count,0);
});


test('Recharts 3 category interaction uses the active tooltip index rather than a removed payload or a duplicated label',()=>{
 const {ChartCanvas}=load('components/insights/ChartCanvas');let inspected;const chart=ChartCanvas({data:[{id:'first',label:'Same name',amount:1},{id:'second',label:'Same name',amount:2}],series:[{key:'amount',label:'Amount',color:'var(--chart-1)'}],kind:'bar',labelKey:'label',inspectKey:'id',onInspect(value){inspected=value;}});
 chart.props.children.props.onClick({activeTooltipIndex:'1',activeLabel:'Same name'});assert.equal(inspected,'second');inspected=undefined;chart.props.children.props.onClick({activeTooltipIndex:undefined,activeLabel:'Same name'});assert.equal(inspected,undefined);
});
