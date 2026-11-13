import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load,root } from './helpers.mjs';
const {moneySample}=load('lib/money-sample'),money=load('lib/money'),{MoneyContext}=load('components/money/MoneyStore');

function MoneyProvider({initialState=moneySample,children}){const view={state:initialState,loaded:true,pending:false,saving:false,error:'',conflict:false};return React.createElement(MoneyContext.Provider,{value:{getSnapshot:()=>view,subscribe:()=>()=>{},dispatch:()=>{}}},children);}

test('Money Overview aligns the spending/comparison row and keeps recurring full-width before recent spending',()=>{
 const {MoneyOverview}=load('components/money/MoneyViews'),html=renderToStaticMarkup(React.createElement(MoneyProvider,null,React.createElement(MoneyOverview,{paycheck:moneySample.paychecks[0],period:money.paycheckPeriod(moneySample.paychecks[0]),today:'2026-10-30',onOpen(){},onSpending(){}})));
 const spent=html.indexOf('muse-money-recorded'),comparison=html.indexOf('muse-money-comparison'),recurring=html.indexOf('<h2>Recurring</h2>'),recent=html.indexOf('<h2>Recent spending</h2>');assert.ok(spent<comparison&&comparison<recurring&&recurring<recent);assert.ok(!html.includes('muse-money-dashboard-column"'));const css=readFileSync(resolve(root,'components/money/Money.css'),'utf8');assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));assert.ok(!css.includes('grid-auto-rows'));
});

test('paycheck quick shelf stays three records while historical selection shares canonical IDs',()=>{
 const nav=money.paycheckNavigation(moneySample,'2026-10-30');assert.deepEqual(nav.quick.map((entry)=>entry.paycheck?.id),['pay-oct09','pay-oct23','pay-nov06']);assert.equal(nav.history.length,2);assert.equal(new Set([...nav.history,...nav.quick.map((entry)=>entry.paycheck)].map((entry)=>entry.id)).size,moneySample.paychecks.length);
 const {MoneyPaychecks}=load('components/money/MoneyPaychecks'),old=nav.history[0],html=renderToStaticMarkup(React.createElement(MoneyProvider,null,React.createElement(MoneyPaychecks,{paycheck:old,today:'2026-10-30',onOpen(){},onSelect(){}})));
 assert.ok(html.includes('<h2>'+old.name+'</h2>'));assert.ok(html.includes('Past paychecks: '+old.name));assert.equal((html.match(/class="choice-button"/g)??[]).length,3);
 assert.equal(money.paycheckNavigation({...moneySample,paychecks:[]},'2026-10-30').history.length,0);
});

test('inline allocation category edits preserve allocation identity, amounts, actual links and template defaults',()=>{
 const original=structuredClone(moneySample),allocation=original.allocations.find((item)=>item.id==='a-food'),changed={...allocation,categoryId:'beauty',subcategoryId:undefined};
 const next=money.moneyReducer(original,{type:'save',collection:'allocations',record:changed});assert.equal(next.allocations.find((item)=>item.id===allocation.id).plannedCents,25000);assert.equal(money.allocationActual(next,changed),21800);assert.deepEqual(next.templates,original.templates);assert.deepEqual(next.transactions,original.transactions);
 const {MoneyAllocationRow}=load('components/money/MoneyAllocationRow'),html=renderToStaticMarkup(React.createElement(MoneyProvider,null,React.createElement(MoneyAllocationRow,{allocation,onOpen(){}})));
 assert.ok(html.includes('Category for Groceries'));assert.ok(html.includes('muse-choice-value'));assert.ok(!html.includes('<select'));
});

test('Bills expose readable independent payment states and marking paid creates no financial event',()=>{
 const base=moneySample.bills[0];assert.equal(money.billStatus({...base,paid:true},'2026-10-30'),'paid');assert.equal(money.billStatus({...base,dueDate:'2026-10-20'},'2026-10-30'),'overdue');assert.equal(money.billStatus({...base,dueDate:'2026-10-30'},'2026-10-30'),'unpaid');assert.equal(money.billStatus(base,'2026-10-30'),'upcoming');
 const next=money.moneyReducer(moneySample,{type:'save',collection:'bills',record:{...base,paid:true}});assert.deepEqual(next.transactions,moneySample.transactions);assert.deepEqual(next.cards,moneySample.cards);
 const {MoneyBillRow}=load('components/money/MoneyBillRow'),html=renderToStaticMarkup(React.createElement(MoneyProvider,null,React.createElement(MoneyBillRow,{bill:{...base,dueDate:'2026-10-20'},today:'2026-10-30',onOpen(){}})));
 assert.ok(html.includes('>Overdue<'));assert.ok(html.includes('Mark paid'));assert.ok(html.includes('More options for Rent'));
});

test('legacy daily content shares the new editorial library and the greeting remains independent',()=>{
 const {dailyMantras,supportingMantra}=load('lib/daily-mantras'),{shiftDate}=load('lib/dates');
 const values=Array.from({length:dailyMantras.length},(_,index)=>supportingMantra(shiftDate('2026-10-30',index)));assert.equal(new Set(values).size,dailyMantras.length);assert.equal(supportingMantra('2026-10-30'),values[0]);assert.equal(supportingMantra(shiftDate('2026-10-30',dailyMantras.length)),values[0]);
 const {MuseHeader}=load('components/MuseHeader'),{mockProfile}=load('lib/mock-profile'),html=renderToStaticMarkup(React.createElement(MuseHeader,{date:{iso:'2026-10-30'},greeting:'Make room for a little magic.',profile:mockProfile,onDateChange(){}}));assert.ok(html.includes('Make room for a little magic, Stephanie.'));const {selectMantra}=load('lib/mantras');assert.ok(html.includes(selectMantra('daily',null)));
});

test('popover placement stays within desktop, tablet, mobile keyboard and modal bounds',()=>{
 const {popoverBounds,placePopover}=load('lib/popover-layout');
 for(const [width,height] of [[1440,900],[1280,800],[1024,768],[390,844],[320,480],[390,220]]){
 const bounds=popoverBounds({left:0,top:0,right:width,bottom:height});for(const anchor of [{left:width-40,right:width-4,top:height-50,bottom:height-6},{left:0,right:44,top:0,bottom:44},{left:100,right:150,top:height+100,bottom:height+144}]){const result=placePopover(anchor,bounds,350,560);assert.ok(result.left>=bounds.left);assert.ok(result.left+Math.min(350,result.maxWidth)<=bounds.right);assert.ok(result.top>=bounds.top);assert.ok(result.top+Math.min(560,result.maxHeight)<=bounds.bottom);}}
 const bounds=popoverBounds({left:0,top:300,right:390,bottom:520},{left:20,top:0,right:380,bottom:844});assert.deepEqual(bounds,{left:32,top:312,right:368,bottom:508});
});

test('compact task rows hide due/estimates by default, permit an explicit due preview, and timebox filters preserve semantics',()=>{
 const {plannerSample}=load('lib/planner-sample'),{PlannerProvider}=load('components/PlannerStore'),{PlannerTaskCard}=load('components/planner/PlannerTaskCard'),planner=load('lib/planner');
 const task={...plannerSample.tasks[0],dueDate:'2026-11-02',estimatedMinutes:60,timeSlot:'09:00'};
 const render=(showDueDate)=>renderToStaticMarkup(React.createElement(PlannerProvider,null,React.createElement(PlannerTaskCard,{task,showDueDate,onOpen(){}})));
 assert.ok(!render(false).includes('Due 2026-11-02'));assert.ok(!render(false).includes('60m est.'));assert.ok(render(true).includes('Due 2026-11-02'));assert.ok(render(false).includes('muse-task-secondary-row'));
 assert.deepEqual(planner.filterPlannerTasks([task,{...task,id:'flex',timeSlot:undefined}],'',{...planner.emptyPlannerFilters,timeboxedOnly:true},'').map((entry)=>entry.id),[task.id]);
 const source=readFileSync(resolve(root,'components/planner/TaskTimer.tsx'),'utf8');assert.ok(!source.includes('GlassPopover'));assert.ok(source.includes('muse-task-timer-panel'));assert.ok(source.includes('Tracked time'));assert.ok(source.includes('Estimated duration'));
});

test('shared atmosphere spans content height and sparse header punctuation retains the measured control safe region',()=>{
 const css=readFileSync(resolve(root,'app/atmosphere.css'),'utf8'),art=readFileSync(resolve(root,'components/PageCelestial.tsx'),'utf8'),style=readFileSync(resolve(root,'components/PageCelestial.css'),'utf8');
 assert.ok(css.includes('.muse-atmosphere { position:absolute; inset:0;'));assert.ok(!css.includes('position: fixed'));assert.ok(!css.includes('background-repeat:repeat'));assert.ok(art.includes('controls.getBoundingClientRect()'));assert.ok(art.includes('resize.observe(controls)'));assert.ok(style.includes('var(--hero-safe-end'));assert.ok(!art.includes('CosmicSprinkles'));assert.ok(!art.includes('muse-cosmos-depth'));
});

test('Coming up remains a bounded ledger preview with dated, right-aligned obligations and no management actions',()=>{
 const {MoneyOverview}=load('components/money/MoneyViews');
 for(const count of [0,1,12]){
  const state=structuredClone(moneySample);state.cards=[];state.recurring=[];state.bills=Array.from({length:count},(_,i)=>({id:`bill-${i}`,name:`A readable obligation ${i}`,amountCents:1200+i,dueDate:'2026-11-01',recurrence:'once',paid:false}));
  const before=JSON.stringify(state),html=renderToStaticMarkup(React.createElement(MoneyProvider,{initialState:state},React.createElement(MoneyOverview,{paycheck:state.paychecks[0],period:money.paycheckPeriod(state.paychecks[0]),today:'2026-10-30',onOpen(){},onSpending(){}}))),ledger=html.split('class="muse-money-upcoming"')[1].split('</ul>')[0];
  assert.equal((ledger.match(/<li /g)??[]).length+(ledger.match(/<li>/g)??[]).length,Math.min(count,6),'six obligations show before Show all');
  if(count){assert.ok(ledger.includes('<time dateTime="2026-11-01">Nov 1</time>'));assert.ok(ledger.includes('class="muse-money-ledger-number"'));assert.ok(ledger.includes('class="muse-ledger-name"'));}
  else assert.ok(html.includes('Nothing scheduled.'));
  assert.ok(!ledger.includes('Mark paid'));assert.ok(!ledger.includes('Remove'));assert.equal(JSON.stringify(state),before);
 }
});
