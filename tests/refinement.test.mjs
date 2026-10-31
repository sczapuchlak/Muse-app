import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { load, root } from './helpers.mjs';

test('movement overflow promotes into a bounded shelf, preferring unselected least-recent choices', () => {
  const { promoteMovement } = load('lib/selections');
  const quick = ['upper','lower','cardio','walk'];
  assert.deepEqual(promoteMovement(quick,'yoga',[],[]),['upper','lower','cardio','yoga']);
  assert.deepEqual(quick,['upper','lower','cardio','walk']);
  assert.deepEqual(promoteMovement(quick,'yoga',['walk','cardio','lower','upper'],[]),['yoga','lower','cardio','walk']);
  assert.deepEqual(promoteMovement(quick,'yoga',['walk'],['upper','lower','cardio']),['upper','lower','cardio','yoga']);
  assert.deepEqual(promoteMovement(quick,'yoga',[],[],['walk']),['upper','lower','yoga','walk']);
  assert.equal(promoteMovement(quick,'walk',[],[]),quick);
  assert.equal(promoteMovement(quick,'pilates',[],quick).length,quick.length);
  assert.deepEqual(promoteMovement([],'yoga',[],[]),['yoga']);
});

test('material preference restores independently, updates immediately and tolerates blocked storage', () => {
  const storage = new Map([['muse.material','frosted']]);
  const events = new EventTarget();
  globalThis.window = { localStorage: { getItem:(key)=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value) },addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events) };
  try {
    let preference=load('lib/material-preference',true);
    assert.equal(preference.readMaterial(),'frosted');
    let updates=0; const stop=preference.subscribeMaterial(()=>updates++);
    preference.selectMaterial('crystal'); assert.equal(preference.readMaterial(),'crystal');
    preference.selectMaterial('frosted'); assert.equal(updates,2); stop();
    preference=load('lib/material-preference',true); assert.equal(preference.readMaterial(),'frosted');
    storage.set('muse.material','unknown'); assert.equal(preference.readMaterial(),'crystal');
    window.localStorage.setItem=()=>{throw Error('blocked');};
    preference.selectMaterial('frosted'); assert.equal(preference.readMaterial(),'frosted');
    assert.equal(storage.get('muse.theme'),undefined);
  } finally { delete globalThis.window; }
});

test('Planner uses three rolling dates and secondary filters preserve one canonical task type', () => {
  const planner=load('lib/planner'), {plannerSample}=load('lib/planner-sample');
  const {shiftDate}=load('lib/dates');
  assert.equal(planner.PLANNING_WINDOW_DAYS,3);
  const window=(date)=>Array.from({length:planner.PLANNING_WINDOW_DAYS},(_,i)=>shiftDate(date,i));
  assert.deepEqual(window('2026-10-31'),['2026-10-31','2026-11-01','2026-11-02']);
  assert.deepEqual(window(shiftDate('2026-10-31',1)),['2026-11-01','2026-11-02','2026-11-03']);
  assert.deepEqual(planner.filterPlannerTasks(plannerSample.tasks,'work',{groupId:'launch',tagIds:['deep-work'],status:'open'},'story').map((task)=>task.id),['launch-story']);
  assert.equal(planner.filterPlannerTasks(plannerSample.tasks,'work',{...planner.emptyPlannerFilters,status:'complete'},'').length,0);
  const pool=planner.createTask('Inbox idea','personal','pool','now');
  const day=planner.createTask('Friday plan','personal','day','now','2026-10-30');
  assert.equal(pool.kind,day.kind); assert.equal(pool.plannedDate,undefined); assert.equal(day.plannedDate,'2026-10-30');
  assert.equal(planner.placementChanges(plannerSample,{type:'task/place',id:'unknown',date:'2026-10-29'}),false);
  assert.equal(planner.placementChanges(plannerSample,{type:'task/place',id:'frame',date:'2026-10-30'}),true);
});

test('one Filters trigger replaces permanent Group/Tag controls; Today uses a one-day rolling shift', () => {
  const {PlannerProvider}=load('components/PlannerStore');
  const {PlannerFilters}=load('components/planner/PlannerFilters');
  const {emptyPlannerFilters}=load('lib/planner');
  const html=renderToStaticMarkup(React.createElement(PlannerProvider,null,React.createElement(PlannerFilters,{value:{...emptyPlannerFilters,groupId:'launch',tagIds:['quick']},onChange(){},workspaceId:''})));
  assert.ok(html.includes('Filters · 2')); assert.equal((html.match(/<button/g)??[]).length,1);
  const source=readFileSync(resolve(root,'components/planner/Planner.tsx'),'utf8');
  assert.ok(!source.includes('<MuseChoiceMenu'));
  assert.ok(source.includes('changeDate(today)'));
  assert.match(source,/shiftDate\(date,\s*-1\)/);assert.match(source,/shiftDate\(date,\s*1\)/);
  assert.ok(!source.includes('Previous four days'));
});

test('quantity ring clamps overflow, exposes partial geometry and keeps checkbox progress optional', () => {
  const {MuseProgressRing}=load('components/MuseProgressRing');
  const partial=renderToStaticMarkup(React.createElement(MuseProgressRing,{value:10,goal:20},'10m'));
  assert.ok(partial.includes('data-progress="0.5"')); assert.ok(partial.includes('10m'));
  assert.ok(partial.includes('--ring-offset:59.69'));
  const complete=renderToStaticMarkup(React.createElement(MuseProgressRing,{value:24,goal:20},'24m'));
  assert.ok(complete.includes('data-progress="1"'));
  assert.ok(complete.includes('--ring-offset:0'));
  const styles=readFileSync(resolve(root,'components/MuseProgressRing.css'),'utf8');
  assert.ok(styles.includes('prefers-reduced-motion: reduce'));
});

test('Daily Edit uses a full abstract field, with stars left of date and no hero theme picker',()=>{
 const {MuseHeader}=load('components/MuseHeader'),{mockProfile}=load('lib/mock-profile');
 const html=renderToStaticMarkup(React.createElement(MuseHeader,{date:{iso:'2026-10-29',label:''},profile:mockProfile,greeting:'Make room for a little magic.',onDateChange(){}}));
 assert.ok(html.includes('muse-star-cluster'));assert.ok(!html.includes('muse-profile-constellation'));assert.ok(!html.includes('muse-theme-root'));
 assert.ok(html.indexOf('muse-star-cluster')<html.indexOf('class="muse-date-navigation"')||html.indexOf('muse-star-cluster')<html.indexOf('aria-label="Previous day"'));
 const source=readFileSync(resolve(root,'components/AppShell.tsx'),'utf8');assert.ok(source.includes('<div className="muse-rail-footer"><ThemeSwitcher'));
 const artwork=readFileSync(resolve(root,'components/PageCelestial.tsx'),'utf8');assert.ok(!artwork.includes('CelestialPath'));assert.ok(artwork.includes('compositions[motif]'));
});
