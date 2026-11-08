import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { load } from './helpers.mjs';
const r=load('lib/recurring'),m=load('lib/money'),{moneySample}=load('lib/money-sample');
const fresh=()=>structuredClone(moneySample),today='2026-10-30';
const item=(patch={})=>({id:'custom',name:'A recurring thing',amountCents:1000,amountBehavior:'fixed',recurrence:{unit:'month',interval:1},nextChargeDate:'2026-10-14',billingSource:'Apple App Store',cardId:'amex',status:'active',...patch});

test('monthly and yearly renewal calculations retain anchor days across short months and leap years',()=>{
 assert.equal(r.recurrenceDate('2026-01-31',{unit:'month',interval:1},1),'2026-02-28');
 assert.equal(r.recurrenceDate('2026-01-31',{unit:'month',interval:1},2),'2026-03-31');
 assert.equal(r.nextRecurringDate(item({nextChargeDate:'2026-01-31'}),'2026-03-01'),'2026-03-31');
 assert.equal(r.recurrenceDate('2024-02-29',{unit:'year',interval:1},1),'2025-02-28');
 assert.equal(r.recurrenceDate('2024-02-29',{unit:'year',interval:1},4),'2028-02-29');
 assert.equal(r.nextRecurringDate(item(),today),'2026-11-14');
 assert.equal(r.nextRecurringDate(item(),'2026-11-14'),'2026-11-14','today is a valid upcoming date');
});

test('weekly, fortnightly, quarterly, six-month and custom intervals derive expected dates without mutating records',()=>{
 const original=item({nextChargeDate:'2026-10-23',recurrence:{unit:'week',interval:2}}),copy=structuredClone(original);
 assert.equal(r.nextRecurringDate(original,today),'2026-11-06');assert.deepEqual(original,copy);
 assert.equal(r.nextRecurringDate(item({nextChargeDate:'2026-09-03',recurrence:{unit:'month',interval:6}}),today),'2027-03-03');
 assert.equal(r.nextRecurringDate(item({nextChargeDate:'2026-01-31',recurrence:{unit:'month',interval:3}}),'2026-08-01'),'2026-10-31');
 assert.equal(r.nextRecurringDate(item({nextChargeDate:'2026-10-20',recurrence:{unit:'day',interval:4}}),today),'2026-11-01');
 assert.equal(r.validRecurrence({unit:'month',interval:0}),false);assert.equal(r.validRecurrence({unit:'week',interval:1.5}),false);
});

test('paused/cancelled/ended expectations leave upcoming and normalized totals while retaining history',()=>{
 const active=item(),paused=item({id:'paused',status:'paused'}),cancelled=item({id:'ended',status:'cancelled'}),expired=item({id:'expired',endDate:'2026-10-20'});
 const items=[active,paused,cancelled,expired];assert.equal(r.upcomingRecurring(items,today).length,1);
 assert.equal(r.recurringSummary(items,today).active,1);assert.equal(items.length,4);
 assert.equal(r.nextRecurringDate(expired,today),null);
 assert.equal(r.nextRecurringDate(item({endDate:'2026-11-14'}),today),'2026-11-14');
});

test('real billing amounts stay distinct from monthly equivalent and annualized costs, including unknown and estimates',()=>{
 const items=[item(),item({id:'annual',amountCents:12000,recurrence:{unit:'year',interval:1}}),item({id:'unknown',amountCents:undefined}),item({id:'estimated',amountCents:8000,amountBehavior:'estimated'})];
 const summary=r.recurringSummary(items,today);assert.equal(summary.monthlyBilled,9000);assert.equal(summary.annualized,120000);assert.equal(summary.monthlyEquivalent,10000);assert.equal(summary.unknown,1);assert.equal(summary.estimated,1);
 assert.equal(items[1].amountCents,12000);assert.equal(r.annualizedCents(items[2]),null);
 assert.equal(r.recurringSummary([item({amountCents:0})],today).unknown,0);
});

test('recurring saves use existing categories/cards/methods and never manufacture a transaction or change card balances',()=>{
 const state=fresh(),record=item({categoryId:'fun'}),action={type:'save',collection:'recurring',record};
 const next=m.moneyReducer(state,action);assert.equal(next.recurring.at(-1).billingSource,'Apple App Store');assert.equal(next.recurring.at(-1).cardId,'amex');assert.deepEqual(next.transactions,state.transactions);assert.deepEqual(next.cards,state.cards);assert.deepEqual(next.payments,state.payments);
 const total=m.spendingTotal(state,m.monthPeriod(today));assert.equal(m.spendingTotal(next,m.monthPeriod(today)),total);
 record.name='Changed outside';assert.equal(next.recurring.at(-1).name,'A recurring thing');
 for(const patch of [{categoryId:'missing'},{cardId:'missing'},{amountCents:-1},{amountCents:10.5},{billingSource:''},{recurrence:{unit:'month',interval:0}}])assert.equal(m.moneyReducer(state,{...action,record:{...item(),...patch}}),state);
 const method={type:'save',collection:'paymentMethods',record:{id:'manual',name:'My checking'}};
 const added=m.moneyReducer(state,method);assert.equal(m.moneyReducer(added,{...action,record:item({cardId:undefined,paymentMethodId:'manual'})}).recurring.at(-1).paymentMethodId,'manual');
 assert.equal(m.moneyReducer(added,{...action,record:item({paymentMethodId:'manual'})}),added,'one funding reference, not card plus method');
});

test('custom category, card/method, source, status and frequency filters combine without collapsing their meanings',()=>{
 const items=[item(),item({id:'other',categoryId:'home',cardId:undefined,paymentMethodId:'checking',billingSource:'Custom insurer',recurrence:{unit:'year',interval:1}})];
 const defaults={frequency:'all',search:'',category:'',method:'',source:'',status:''};
 assert.equal(r.filterRecurring(items,{...defaults,method:'card:amex',source:'Apple App Store'}).length,1);
 assert.deepEqual(r.filterRecurring(items,{...defaults,frequency:'yearly',category:'home',method:'method:checking',source:'Custom insurer',status:'active'}).map((entry)=>entry.id),['other']);
 assert.equal(r.filterRecurring(items,{...defaults,frequency:'monthly',source:'Custom insurer'}).length,0);
 assert.equal(r.filterRecurring(items,{...defaults,search:'  A RECURRING  '}).length,2);
});

test('chronological buckets cross month/year boundaries and linked bills are deduplicated only for a matching expected date',()=>{
 assert.equal(r.recurringBucket('2026-11-03',today),'Next 7 days');assert.equal(r.recurringBucket('2026-11-14',today),'Next month');assert.equal(r.recurringBucket('2027-01-02','2026-12-30'),'Next 7 days');
 let state=fresh();assert.ok(!m.upcomingMoney(state,today).some((entry)=>entry.recordId==='internet'));
 state=m.moneyReducer(state,{type:'save',collection:'recurring',record:{...state.recurring.find((entry)=>entry.id==='internet-recurring'),status:'cancelled'}});
 assert.ok(m.upcomingMoney(state,today).some((entry)=>entry.recordId==='internet'),'cancelling a future expectation must not erase an explicitly dated unpaid bill');
});

test('Recurring view is compact, distinguishes source/method and annual billing, and exposes historical status',()=>{
 const {MoneyContext}=load('components/money/MoneyStore'),{MoneyRecurring,RecurringPreview}=load('components/money/MoneyRecurring');
 const html=renderToStaticMarkup(React.createElement(MoneyContext.Provider,{value:{getSnapshot:()=>({state:moneySample,loaded:true}),subscribe:()=>()=>{},dispatch:()=>{}}},React.createElement(MoneyRecurring,{today,onOpen(){}})));
 for(const text of ['Know what’s coming','Next charge','Billed through','Paid with','Apple App Store','Yearly','Paused','Cancelled','annualized'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('<select'));assert.match(html,/<label[^>]*class="sr-only"[^>]*>Search recurring payments<\/label>[\s\S]*type="search"/,'search keeps an accessible label');
 const preview=renderToStaticMarkup(React.createElement(MoneyContext.Provider,{value:{getSnapshot:()=>({state:moneySample,loaded:true}),subscribe:()=>()=>{},dispatch:()=>{}}},React.createElement(RecurringPreview,{today,onOpen(){},onView(){}})));
 assert.equal((preview.match(/<time /g)??[]).length,3,'dashboard stays bounded');
});

test('editing an amount in a short month preserves the billing day; deliberately editing next date reanchors it',()=>{
 const original=item({nextChargeDate:'2026-01-31'}),displayed=r.nextRecurringDate(original,'2026-02-01');assert.equal(displayed,'2026-02-28');
 const preserved={...original,amountCents:2000,nextChargeDate:r.recurringAnchorAfterEdit(original,displayed,original.recurrence,false)};
 assert.equal(r.nextRecurringDate(preserved,'2026-03-01'),'2026-03-31');
 const changed={...original,nextChargeDate:r.recurringAnchorAfterEdit(original,displayed,original.recurrence,true)};
 assert.equal(r.nextRecurringDate(changed,'2026-03-01'),'2026-03-28');
});
