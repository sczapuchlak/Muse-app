import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { load, root } from './helpers.mjs';
const domain = load('lib/rituals');
const { ritualsSample } = load('lib/rituals-sample');
const { weekDates } = load('lib/dates');
const fresh = () => structuredClone(ritualsSample);
const today = '2026-10-29';
function log(state, id, date, value, on = today) { return domain.ritualReducer(state, { type: 'entry/set', ritualId: id, date, value, today: on, now: `${on}T18:00:00Z` }); }

test('ritual schedule distinguishes weekdays, a weekly day, daily recurrence, and pre-start dates', () => {
  const ritual = fresh().rituals.find((item) => item.id === 'stretch');
  assert.equal(domain.isScheduled(ritual,'2026-10-26'),true);
  assert.equal(domain.isScheduled(ritual,'2026-10-27'),false);
  assert.equal(domain.isScheduled(ritual,'2026-10-28'),true);
  assert.equal(domain.isScheduled(ritual,'2026-10-23'),false);
  assert.equal(domain.isScheduled({...ritual,recurrence:{kind:'weekly',weekday:4}},today),true);
  assert.equal(domain.isScheduled({...ritual,recurrence:{kind:'weekly',weekday:4}},'2026-10-28'),false);
  assert.equal(domain.recurrenceLabel({kind:'weekdays',weekdays:[1,3,5]}),'Mon · Wed · Fri');
});

test('missing data, explicit zero, future scheduled days and unscheduled days remain distinct', () => {
  let state = fresh(); const ritual = state.rituals.find((item) => item.id === 'stretch');
  const missing = domain.ritualCell(state,ritual,'2026-10-30','2026-11-01');
  assert.deepEqual(missing,{status:'unknown',value:null,recorded:false});
  assert.equal(domain.ritualCell(state,ritual,'2026-10-30',today).status,'upcoming');
  assert.equal(domain.ritualCell(state,ritual,'2026-10-27',today).status,'unscheduled');
  state = log(state,'stretch','2026-10-26',0);
  assert.deepEqual(domain.ritualCell(state,ritual,'2026-10-26',today),{status:'missed',value:0,recorded:true});
  state = log(state,'stretch','2026-10-26',null);
  assert.equal(domain.ritualCell(state,ritual,'2026-10-26',today).value,null);
  assert.equal(domain.ritualCell(state,ritual,'2026-10-26',today).recorded,false);
});

test('entry commands allow backdating, retain stable identity, and reject unscheduled/future/invalid values', () => {
  const state = fresh();
  const updated = log(state,'stretch','2026-10-26',15);
  assert.equal(domain.entryFor(updated,'stretch','2026-10-26').id,domain.entryFor(state,'stretch','2026-10-26').id);
  assert.equal(domain.entryFor(state,'stretch','2026-10-26').value,10);
  assert.equal(log(state,'stretch','2026-10-27',15),state);
  assert.equal(log(state,'stretch','2026-10-30',15),state);
  for (const value of [-1,NaN,Infinity]) assert.equal(log(state,'pages',today,value),state);
  assert.equal(log(state,'pause',today,2),state);
  assert.equal(log(state,'lift',today,1.5),state);
  const once = log(state,'pages',today,12.5), twice = log(once,'pages',today,20);
  assert.equal(twice.entries.filter((entry) => entry.ritualId==='pages' && entry.date===today).length,1);
});

test('scheduled-day streaks skip unscheduled days and do not penalize the open current day', () => {
  const state = fresh(); const ritual = state.rituals.find((item) => item.id==='pause');
  assert.deepEqual(domain.ritualStreak(state,ritual,today),{count:2,start:'2026-10-26',unit:'scheduled days'});
  const complete = log(state,'pause',today,1);
  assert.equal(domain.ritualStreak(complete,ritual,'2026-10-30').count,3);
  assert.equal(domain.ritualStreak(state,ritual,'2026-10-30').count,0,'Past scheduled Thursday has not been confirmed');
  assert.equal(domain.ritualCell(state,ritual,'2026-10-27',today).status,'unscheduled');
});

test('weekly targets aggregate dated quantities; empty eligible days are available, not missed daily goals', () => {
  let state = fresh(); const ritual = state.rituals.find((item) => item.id==='lift');
  assert.equal(domain.weeklyValue(state,ritual,today),2);
  assert.equal(domain.ritualCell(state,ritual,'2026-10-27',today).status,'available');
  assert.equal(domain.ritualStreak(state,ritual,today).count,1,'Current unfinished week leaves last completed week intact');
  state = log(state,'lift',today,2);
  assert.equal(domain.weeklyValue(state,ritual,today),4);
  assert.deepEqual(domain.ritualStreak(state,ritual,today),{count:2,start:'2026-10-19',unit:'weeks'});
  assert.equal(domain.weekSummary(state,weekDates(today),today).weeklyMet,1);
  assert.equal(domain.ritualStreak(fresh(),ritual,'2026-11-02').count,0,'An unfinished closed week breaks weekly continuity');
});

test('week summary uses elapsed scheduled opportunities, not future or unscheduled days', () => {
  const state = fresh(), week=weekDates(today), summary=domain.weekSummary(state,week,today);
  const expected = state.rituals.filter((ritual)=>ritual.type!=='weekly-target').flatMap((ritual)=>week.filter((date)=>date<=today&&domain.isScheduled(ritual,date))).length;
  assert.equal(summary.scheduled,expected);
  assert.equal(summary.weeklyTargets,1);
  assert.equal(summary.weeklyMet,0);
  assert.equal(domain.weekSummary(state,weekDates('2026-11-12'),today).scheduled,0);
  assert.ok(summary.completed<=summary.scheduled);
  assert.equal(domain.weekSummary(state,week,'').scheduled,0);
});

test('milestone constellation triggers only on a threshold crossing and is not replayed after undo', () => {
  const state = fresh(), ritual = state.rituals.find((item)=>item.id==='pause');
  const completed = log(state,'pause',today,1);
  const feedback = domain.ritualFeedback(state,completed,ritual,today,today);
  assert.equal(feedback.kind,'constellation');
  assert.ok(completed.celebratedMilestones.includes(feedback.key));
  assert.equal(domain.ritualFeedback(completed,completed,ritual,today,today),null);
  const undone=log(completed,'pause',today,0), redone=log(undone,'pause',today,1);
  assert.equal(domain.ritualFeedback(undone,redone,ritual,today,today).kind,'orbital');
  assert.equal(redone.celebratedMilestones.length,1);
});

test('editing preserves historical schedule/goal semantics and safe group deletion', () => {
  const state=fresh(), original=state.rituals[0];
  const updated=domain.ritualReducer(state,{type:'ritual/save',ritual:{...original,name:'A tiny pause',type:'duration',goal:20,recurrence:{kind:'daily'}}});
  assert.equal(updated.rituals[0].name,'A tiny pause');
  assert.equal(updated.rituals[0].type,original.type);
  assert.equal(updated.rituals[0].goal,original.goal);
  assert.deepEqual(updated.rituals[0].recurrence,original.recurrence);
  assert.equal(domain.ritualReducer(state,{type:'group/delete',id:'morning'}),state);
  let custom=domain.ritualReducer(state,{type:'group/save',group:{id:'custom',name:'Creative',accent:'pop',icon:'notes',collapsed:false}});
  custom=domain.ritualReducer(custom,{type:'group/toggle',id:'custom'});
  assert.equal(custom.groups.find((group)=>group.id==='custom').collapsed,true);
  custom=domain.ritualReducer(custom,{type:'group/delete',id:'custom'});
  assert.ok(!custom.groups.some((group)=>group.id==='custom'));
});

test('new quantity/duration/weekly/checkbox definitions have validated goals and schedules', () => {
  const state=fresh();
  const template={...state.rituals[0],id:'new',name:'A custom rhythm',startDate:today};
  for(const type of ['checkbox','numeric','duration','weekly-target']) {
    const next=domain.ritualReducer(state,{type:'ritual/save',ritual:{...template,type,goal:4,unit:'units'}});
    const created=next.rituals.find((ritual)=>ritual.id==='new');
    assert.ok(created); assert.equal(created.type,type); assert.equal(created.goal,type==='checkbox'?1:4);
  }
  assert.equal(domain.ritualReducer(state,{type:'ritual/save',ritual:{...template,recurrence:{kind:'weekdays',weekdays:[]}}}),state);
  assert.equal(domain.ritualReducer(state,{type:'ritual/save',ritual:{...template,goal:0}}),state);
});

test('Ritual weekly rows expose seven semantic cells, group collapse and separate weekly target progress', () => {
  const {RitualContext}=load('components/rituals/RitualStore');
 const fixture=state=>({subscribe:()=>()=>{},getSnapshot:()=>({state,loaded:true,error:'',pending:false}),dispatch:()=>{},whenSaved:()=>{}});
  const {RitualGroup}=load('components/rituals/RitualGroup');
  function render(group) {return renderToStaticMarkup(React.createElement(RitualContext.Provider,{value:fixture(ritualsSample)},React.createElement(RitualGroup,{group,week:weekDates(today),today,selectedDate:today,onEdit(){},onEditEntry(){}})));}
  const html=render(ritualsSample.groups[1]);
  assert.equal((html.match(/class="muse-ritual-week-cell"/g)??[]).length,14);
  assert.ok(html.includes('data-status="unscheduled"'));
  assert.ok(html.includes('data-status="upcoming"'));
  assert.ok(html.includes('aria-label="Lift, at my own pace weekly progress"'));
  assert.ok(html.includes('2 / 4 this week'));
  assert.ok(!html.includes('type="range"'));
  const collapsed=render({...ritualsSample.groups[1],collapsed:true});
  assert.ok(collapsed.includes('aria-expanded="false"'));
  assert.ok(!collapsed.includes('class="muse-ritual-week-cell"'));
});

test('ritual feedback uses official MuseStar nodes, contained lines and reduced-motion glow', () => {
  const {OrbitalGlint,ConstellationCelebration}=load('components/MuseRitualFeedback');
  const orbital=renderToStaticMarkup(React.createElement(OrbitalGlint));
  const constellation=renderToStaticMarkup(React.createElement(ConstellationCelebration));
  assert.equal((orbital.match(/viewBox="0 0 24 40"/g)??[]).length,1);
  assert.equal((constellation.match(/viewBox="0 0 24 40"/g)??[]).length,4);
  const styles=readFileSync(resolve(root,'components/MuseRitualFeedback.css'),'utf8');
  assert.ok(styles.includes('pointer-events: none'));
  assert.ok(styles.includes('prefers-reduced-motion: reduce'));
  assert.ok(styles.includes('animation: none'));
  assert.ok(styles.includes('position: absolute'));
});

test('backfilling a gap consumes every crossed milestone without replay on later corrections', () => {
  const ritual={...ritualsSample.rituals[0],id:'backfill',recurrence:{kind:'daily'},startDate:'2026-10-20'};
  const dates=Array.from({length:10},(_,index)=>`2026-10-${20+index}`);
  const state={...fresh(),rituals:[ritual],entries:dates.filter((date)=>date!=='2026-10-27').map((date)=>({id:`backfill/${date}`,ritualId:'backfill',date,value:1,updatedAt:'sample'})),celebratedMilestones:[]};
  const completed=log(state,'backfill','2026-10-27',1);
  assert.equal(domain.ritualStreak(completed,ritual,today).count,10);
  assert.equal(completed.celebratedMilestones.length,2);
  const undone=log(completed,'backfill','2026-10-28',0);
  const redone=log(undone,'backfill','2026-10-28',1);
  assert.equal(domain.ritualFeedback(undone,redone,ritual,'2026-10-28',today).kind,'orbital');
});

test('Complete, Partial, explicit Missed and Unknown retain distinct values and summary counts', () => {
  let state=fresh(), ritual=state.rituals.find((item)=>item.id==='stretch');
  assert.equal(domain.ritualCell(state,ritual,'2026-10-26',today).status,'partial');
  assert.equal(domain.ritualCell(state,ritual,'2026-10-28',today).status,'complete');
  const past='2026-10-30', viewedOn='2026-11-01';
  assert.equal(domain.ritualCell(state,ritual,past,viewedOn).status,'unknown');
  state=log(state,'stretch',past,8,viewedOn);
  assert.equal(domain.ritualCell(state,ritual,past,viewedOn).status,'partial');
  state=log(state,'stretch',past,0,viewedOn);
  assert.equal(domain.ritualCell(state,ritual,past,viewedOn).status,'missed');
  assert.equal(domain.entryFor(state,'stretch',past).outcome,'missed');
  const summary=domain.weekSummary(state,weekDates(today),viewedOn);
  assert.ok(summary.partial>0 && summary.missed>0 && summary.unknown>0 && summary.completed>0);
  state=log(state,'stretch',past,null,viewedOn);
  assert.equal(domain.ritualCell(state,ritual,past,viewedOn).status,'unknown');
  assert.equal(domain.entryFor(state,'stretch',past),undefined);
});

test('weekly session logs never masquerade as a completed daily goal', () => {
  let state=fresh(); const ritual=state.rituals.find((item)=>item.id==='lift');
  assert.equal(domain.ritualCell(state,ritual,'2026-10-26',today).status,'logged');
  state=log(state,'lift',today,0);
  assert.equal(domain.ritualCell(state,ritual,today,today).status,'missed');
  assert.equal(domain.weeklyValue(state,ritual,today),2);
  assert.equal(domain.ritualStreak(state,ritual,today).count,1);
});

test('partial progress does not trigger completion feedback and clearing a log never celebrates', () => {
  const state=fresh(), ritual=state.rituals.find((item)=>item.id==='pages');
  const partial=log(state,'pages',today,10);
  assert.equal(domain.ritualFeedback(state,partial,ritual,today,today),null);
  const complete=log(partial,'pages',today,20);
  assert.ok(domain.ritualFeedback(partial,complete,ritual,today,today));
  const cleared=log(complete,'pages',today,null);
  assert.equal(domain.ritualFeedback(complete,cleared,ritual,today,today),null);
});

test('an explicitly missed current day closes a full-completion streak but clearing restores open semantics', () => {
  const state=fresh(), ritual=state.rituals.find((item)=>item.id==='pause');
  assert.equal(domain.ritualStreak(state,ritual,today).count,2);
  const missed=log(state,'pause',today,0);
  assert.equal(domain.ritualStreak(missed,ritual,today).count,0);
  const cleared=log(missed,'pause',today,null);
  assert.equal(domain.ritualStreak(cleared,ritual,today).count,2);
  assert.equal(domain.ritualFeedback(missed,cleared,ritual,today,today),null);
});

test('weekly partial sessions do not produce completion feedback before the weekly target is met', () => {
  const before=fresh(), ritual=before.rituals.find((item)=>item.id==='lift');
  const partial=log(before,'lift',today,1);
  assert.equal(domain.weeklyValue(partial,ritual,today),3);
  assert.equal(domain.ritualFeedback(before,partial,ritual,today,today),null);
  const complete=log(partial,'lift',today,2);
  assert.equal(domain.weeklyValue(complete,ritual,today),4);
  assert.equal(domain.ritualFeedback(partial,complete,ritual,today,today).kind,'orbital');
});

test('daily completion credit counts full scheduled daily goals, never partial credit or weekly session obligations',()=>{
 const base=fresh(),numeric=base.rituals.find((ritual)=>ritual.type==='numeric');
 const binary={...numeric,id:'binary-goal',type:'checkbox',goal:1,recurrence:{kind:'daily'},startDate:'2026-10-26'};
 const quantity={...numeric,id:'daily-quantity',goal:20,recurrence:{kind:'daily'},startDate:'2026-10-26'};
 const weekly={...numeric,id:'weekly-goal',type:'weekly-target',goal:4,recurrence:{kind:'daily'},startDate:'2026-10-26'};
 let state={...base,rituals:[binary,quantity,weekly],entries:[]};
 state=log(state,binary.id,today,1);state=log(state,quantity.id,today,12);
 assert.deepEqual(domain.ritualDayProgress(state,today,today),{total:2,completed:1,fraction:.5,perfect:false});
 state=log(state,quantity.id,today,22);
 assert.deepEqual(domain.ritualDayProgress(state,today,today),{total:2,completed:2,fraction:1,perfect:true});
 assert.equal(domain.weeklyValue(state,weekly,today),0,'weekly goal is still independent');
 state=log(state,quantity.id,today,null);
 assert.equal(domain.ritualDayProgress(state,today,today).perfect,false);
 assert.equal(domain.ritualCell(state,quantity,today,today).status,'open');
 const future=domain.ritualDayProgress(state,'2026-10-30',today);
 assert.equal(future.fraction,null);assert.equal(future.perfect,false);
 const empty={...state,rituals:[weekly]};
 assert.deepEqual(domain.ritualDayProgress(empty,today,today),{total:0,completed:0,fraction:null,perfect:false});
});

test('completed quantities retain a central value and small completion badge; partial alone uses a ring',()=>{
 const {RitualContext}=load('components/rituals/RitualStore');
 const fixture=state=>({subscribe:()=>()=>{},getSnapshot:()=>({state,loaded:true,error:'',pending:false}),dispatch:()=>{},whenSaved:()=>{}});
 const {RitualWeekCell}=load('components/rituals/RitualWeekCell');
 const base=fresh(),ritual={...base.rituals.find((item)=>item.type==='numeric'),goal:20,recurrence:{kind:'daily'},startDate:'2026-10-26'};
 const render=(value)=>{
  const state=log({...base,rituals:[ritual],entries:[]},ritual.id,today,value);
  return renderToStaticMarkup(React.createElement(RitualContext.Provider,{value:fixture(state)},React.createElement(RitualWeekCell,{ritual,date:today,today,selected:true,onEditEntry(){}})));
 };
 const complete=render(22),partial=render(12),missed=render(0),unknown=render(null);
 assert.ok(complete.includes('muse-ritual-completion-badge'));
 assert.ok(complete.includes('<svg'));
 assert.ok(complete.includes('complete: 22'));
 assert.ok(!complete.includes('muse-progress-ring'));
 assert.ok(partial.includes('data-progress="0.6"'));
 assert.ok(!partial.includes('muse-ritual-completion-badge'));
 assert.ok(missed.includes('explicitly missed'));
 assert.ok(unknown.includes('muse-ritual-unlogged'));
});

test('week progress surrounds dates with rings and rewards perfect days without treating future/no-obligation days as zero',()=>{
 const {WeekNavigator}=load('components/WeekNavigator');
 const {mockProfile}=load('lib/mock-profile');
 const html=renderToStaticMarkup(React.createElement(WeekNavigator,{selectedDate:today,timeZone:mockProfile.timeZone,onChange(){},progress:{
  '2026-10-26':{fraction:1,perfect:true,label:'All scheduled daily rituals completed'},
  '2026-10-27':{fraction:.5,perfect:false,label:'1 of 2 complete, 50%'},
  '2026-10-28':{fraction:null,perfect:false,label:'No scheduled daily rituals'},
  '2026-10-30':{fraction:null,perfect:false,label:'Upcoming; no completion percentage'},
 }}));
 assert.equal((html.match(/role="progressbar"/g)??[]).length,2);
 assert.equal((html.match(/class="muse-achievement-star"/g)??[]).length,1);
 assert.equal((html.match(/class="muse-progress-ring"/g)??[]).length,2);
 assert.ok(!html.includes('muse-week-day-progress'));
 assert.ok(html.includes('aria-valuenow="50"'));
 assert.ok(!html.includes('aria-valuenow="0"'));
 assert.ok(html.includes('All scheduled daily rituals completed'));
});
