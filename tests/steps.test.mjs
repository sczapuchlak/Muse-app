import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';
const S=load('lib/steps'),store=load('lib/steps-store'),read=f=>readFileSync(resolve(root,f),'utf8');

test('#130 step counts accept ordinary typing and reject everything else with a clear reason',()=>{
 for(const [raw,value] of [['8432',8432],[' 8,432 ',8432],['8 432',8432],['0',0],['200000',200000]])assert.deepEqual(S.parseSteps(raw),{ok:true,value});
 for(const raw of ['','   ','abc','12.5','-3','1e4','200001','99999999'])assert.equal(S.parseSteps(raw).ok,false,`"${raw}" is refused`);
 assert.match(S.parseSteps('12.5').reason,/whole numbers/);assert.match(S.parseSteps('200001').reason,/more than 200,000/);
 assert.equal(S.parseGoal('50').ok,false);assert.deepEqual(S.parseGoal('10,000'),{ok:true,value:10000});
});

test('#130 progress is bounded, and an unrecorded day is missing rather than zero',()=>{
 assert.equal(S.stepProgress(4000,8000),.5);assert.equal(S.stepProgress(20000,8000),1);assert.equal(S.stepProgress(0,8000),0);assert.equal(S.stepProgress(5,0),0);
 assert.equal(S.stepsLeft(7500,8000),500);assert.equal(S.stepsLeft(9000,8000),0);
 assert.equal(S.goalMet({steps:8000,goal:8000}),true);assert.equal(S.goalMet({steps:7999,goal:8000}),false);
 const s=S.summarizeSteps([{date:'2026-11-09',steps:10000,goal:8000},{date:'2026-11-10',steps:4000,goal:8000},{date:'2026-11-11',steps:0,goal:6000}]);
 assert.equal(s.days,3);assert.equal(s.total,14000);assert.equal(s.average,4667);assert.equal(s.goalDays,1);assert.deepEqual(s.best,{date:'2026-11-09',steps:10000});
 assert.deepEqual(S.summarizeSteps([]),{days:0,total:0,average:null,goalDays:0,best:null},'no data: no average, never zero');
});

function fakeClient(){const calls=[];const chain=(table)=>{const q={table,ops:[]};const api=new Proxy({}, {get:(_,k)=>k==='then'?undefined:(...a)=>{q.ops.push([k,a]);if(['single','maybeSingle'].includes(k))return Promise.resolve({data:chain.result?.(table,q)??null,error:null});return api;}});calls.push(q);return api;};return {client:{from:chain},calls};}

test('#130 saving keeps the goal that was in effect when the day was first recorded',async()=>{
 const f=fakeClient();f.client.from.result=undefined;
 const out=[];const client={from:(t)=>({upsert:(row,opt)=>{out.push({t,row,opt});return {select:()=>({single:async()=>({data:{local_date:row.local_date,steps:row.steps,goal:row.goal},error:null})})};}})};
 const first=await store.saveStepDay(client,{date:'2026-11-10',steps:5000,goal:8000,timeZone:'UTC'},null);
 assert.deepEqual(first,{date:'2026-11-10',steps:5000,goal:8000});
 const edited=await store.saveStepDay(client,{date:'2026-11-10',steps:9000,goal:12000,timeZone:'UTC'},first);
 assert.equal(edited.goal,8000,'changing the goal later does not rewrite an earlier day');assert.equal(edited.steps,9000);
 assert.equal(out[1].opt.onConflict,'user_id,local_date','editing replaces the same day, never duplicates it');
 await assert.rejects(store.saveStepDay(client,{date:'2026-11-10',steps:-1,goal:8000,timeZone:'UTC'},null),/between 0 and 200,000/);
 await assert.rejects(store.saveStepDay(client,{date:'2026-11-10',steps:1.5,goal:8000,timeZone:'UTC'},null),RangeError);
 await assert.rejects(store.saveStepDay(client,{date:'nope',steps:10,goal:8000,timeZone:'UTC'},null),/valid date/);
 await assert.rejects(store.saveGoal(client,50),/between 100 and 200,000/);
});

test('#130 reads and clears touch only that day and only the steps tables',async()=>{
 const seen=[];const client={from:(t)=>{seen.push(t);const q={select:()=>q,eq:(c,v)=>{seen.push(['eq',c,v]);return q;},delete:()=>q,maybeSingle:async()=>({data:{local_date:'2026-11-10',steps:6000,goal:8000},error:null}),then:(res)=>res({error:null})};return q;}};
 assert.deepEqual(await store.readStepDay(client,'2026-11-10'),{date:'2026-11-10',steps:6000,goal:8000});
 await store.clearStepDay(client,'2026-11-10');
 assert.ok(seen.filter(x=>typeof x==='string').every(t=>t==='step_days'));assert.ok(seen.some(x=>Array.isArray(x)&&x[1]==='local_date'&&x[2]==='2026-11-10'));
 assert.deepEqual(await store.readStepRange(client,'2026-11-10','2026-11-01'),[],'a backwards range reads nothing');
 assert.equal(store.stepsUnavailable({code:'PGRST205'}),true);assert.equal(store.stepsUnavailable({code:'23505'}),false);
});

test('#130 Movement shows Activity and Steps as two areas, and steps stay separate from movement data',()=>{
 const card=read('components/MovementCard.tsx');
 assert.match(card,/movement-area-title">Activity</);assert.match(card,/<StepsArea key=\{initialDay\.date\}/);
 assert.doesNotMatch(read('components/steps/StepsArea.tsx'),/movement_|useWellness|dispatch/,'steps never touch planned or completed movement');
 const {StepsArea}=load('components/steps/StepsArea');
 const html=renderToStaticMarkup(React.createElement(StepsArea,{date:'2026-11-10'}));
 assert.match(html,/aria-label="Steps"/);assert.match(html,/role="progressbar"/);assert.match(html,/Goal 8,000/);assert.match(html,/placeholder="Enter your steps"/);
});

test('#130 steps storage is owner-only, bounded, additive, and ready for (but does not implement) a device source',()=>{
 const sql=read('supabase/migrations/20261213000100_manual_steps.sql');
 assert.match(sql,/create table public\.step_days/);assert.match(sql,/create table public\.step_settings/);
 assert.match(sql,/steps integer not null check \(steps between 0 and 200000\)/);assert.match(sql,/primary key \(user_id, local_date\)/);
 assert.match(sql,/source text not null default 'manual' check \(source in \('manual'\)\)/,'manual today; a device would widen this in its own migration');
 assert.match(sql,/revoke all on public\.%I from public, anon, authenticated/);assert.match(sql,/owner_read.*owner_insert.*owner_update.*owner_delete/s);
 const code=sql.split('\n').filter(l=>!l.trim().startsWith('--')).join('\n');
 assert.doesNotMatch(code,/movement_|hydration_|alter table public\.(?!%I)|drop /i,'no existing table is touched');
 assert.match(read('app/api/account/export/route.ts'),/step_days/);
 assert.match(read('components/insights/Insights.tsx'),/StepsInsights/,'the classic Wellness view');
 assert.match(read('components/insights/glance/InsightsGlance.tsx'),/<StepsSummary start=\{range\.start\}/,'the live Insights week and month');
});
