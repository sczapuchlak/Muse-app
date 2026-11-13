import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderWithMoney as renderToStaticMarkup} from './money-render.mjs';
import { load } from './helpers.mjs';
const m=load('lib/money'),{moneySample}=load('lib/money-sample');
const fresh=()=>structuredClone(moneySample);
const period=m.paycheckPeriod(moneySample.paychecks[0]);
const save=(state,collection,record)=>m.moneyReducer(state,{type:'save',collection,record});

test('Money uses exact integer cents, permits recorded zero, and rejects invalid precision/nonfinite amounts',()=>{
 for(const [text,cents] of [['0',0],['72.18',7218],['.5',undefined],['12.5',1250],['-5.03',-503],['0.001',undefined],['Infinity',undefined],['',undefined],['9007199254740992',undefined]])assert.equal(m.parseMoney(text),cents);
 let state=fresh(),pay={...state.paychecks[0],id:'zero',actualCents:0};
 state=save(state,'paychecks',pay);assert.equal(state.paychecks.at(-1).actualCents,0);
 for(const value of [-1,NaN,Infinity,1.1])assert.equal(save(state,'transactions',{...state.transactions[0],amountCents:value}),state);
 assert.equal(m.formatMoney(undefined),'—');assert.equal(m.formatMoney(0),'$0.00');
});

test('paycheck periods cross months independently from calendar reporting and filter inclusively',()=>{
 const state=fresh();assert.deepEqual(period,{start:'2026-10-23',end:'2026-11-05',label:'Biweekly paycheck'});
 assert.equal(m.currentPaycheck(state,'2026-10-30').id,'pay-oct23');
 assert.equal(m.monthPeriod('2026-10-30').end,'2026-10-31');
 assert.ok(m.periodTransactions(state,period).some((item)=>item.id==='tx-nov'));
 assert.ok(!m.periodTransactions(state,m.monthPeriod('2026-10-30')).some((item)=>item.id==='tx-nov'));
 assert.ok(!m.periodTransactions(state,period).some((item)=>item.id==='tx-prior'));
 assert.equal(m.inPeriod(period.start,period),true);assert.equal(m.inPeriod(period.end,period),true);
});

test('unallocated/overallocated/full plans are explicit; missing actual never masquerades as received',()=>{
 const state=fresh(),pay=state.paychecks[0];assert.equal(m.paycheckSummary(state,pay).remaining,13000);
 const unknown={...pay,actualCents:undefined};assert.equal(m.paycheckSummary(state,unknown).basisKind,'expected');
 assert.equal(m.paycheckSummary(state,{...unknown,expectedCents:undefined}).remaining,null);
 const full={...pay,actualCents:371200};assert.equal(m.paycheckSummary(state,full).fullyAllocated,true);
 assert.equal(m.paycheckSummary(state,{...pay,actualCents:350000}).remaining,-21200);
 assert.equal(m.paycheckSummary({...state,allocations:[]},{...pay,actualCents:0}).fullyAllocated,false);
 assert.equal(m.allocationActual(state,state.allocations.find((item)=>item.id==='a-food')),21800);
 assert.equal(m.allocationActual(state,state.allocations.find((item)=>item.id==='a-out')),28600);
 assert.equal(m.allocationActual(state,state.allocations.find((item)=>item.id==='a-rent')),null);
});

test('card purchase counts once; card payments adjust balance without changing expense totals',()=>{
 let state=fresh(),base=m.spendingTotal(state,period),balance=state.cards.find((card)=>card.id==='amex').balanceCents;
 const tx={...state.transactions[0],id:'shoes',merchant:'Shoes',amountCents:10000};
 state=save(state,'transactions',tx);assert.equal(m.spendingTotal(state,period),base+10000);assert.equal(state.cards.find((card)=>card.id==='amex').balanceCents,balance+10000);
 const payment={id:'payment-new',cardId:'amex',date:'2026-10-30',amountCents:10000,paycheckId:'pay-oct23',allocationId:'a-amex'};
 state=save(state,'payments',payment);assert.equal(m.spendingTotal(state,period),base+10000);assert.equal(state.cards.find((card)=>card.id==='amex').balanceCents,balance);
 assert.equal(m.allocationActual(state,state.allocations.find((item)=>item.id==='a-amex')),10000);
 state=save(state,'payments',payment);assert.equal(state.cards.find((card)=>card.id==='amex').balanceCents,balance,'re-saving an ID cannot apply payment twice');
 state=m.moneyReducer(state,{type:'remove',collection:'payments',id:payment.id});assert.equal(state.cards.find((card)=>card.id==='amex').balanceCents,balance+10000);
 state=m.moneyReducer(state,{type:'remove',collection:'transactions',id:tx.id});assert.equal(m.spendingTotal(state,period),base);assert.equal(state.cards.find((card)=>card.id==='amex').balanceCents,balance);
});

test('editing a purchase moves the balance delta between cards and preserves stable transaction identity',()=>{
 let state=fresh();const tx=state.transactions[0],amex=state.cards[0].balanceCents,visa=state.cards[1].balanceCents;
 state=save(state,'transactions',{...tx,cardId:'visa',amountCents:10000});
 assert.equal(state.cards[0].balanceCents,amex-tx.amountCents);assert.equal(state.cards[1].balanceCents,visa+10000);
 assert.equal(state.transactions.filter((item)=>item.id===tx.id).length,1);
 state=save(state,'transactions',{...tx,cardId:undefined,paymentMethod:'cash'});assert.equal(state.cards[1].balanceCents,visa);
});

test('splits reconcile totals, keep underassigned remainder visible, and reject overassignment',()=>{
 let state=fresh();const tx=state.transactions.find((item)=>item.id==='tx-target');assert.equal(m.splitRemainder(tx),0);
 const total=m.spendingTotal(state,period);assert.equal(m.categorySpending(state,period).reduce((sum,row)=>sum+row.amount,0),total);
 const partial={...tx,splits:tx.splits.slice(0,1)};state=save(state,'transactions',partial);
 assert.equal(m.splitRemainder(partial),5500);assert.equal(m.categorySpending(state,period).find((row)=>row.id==='').amount,5500);
 assert.equal(m.categorySpending(state,period).reduce((sum,row)=>sum+row.amount,0),total);
 assert.equal(save(state,'transactions',{...tx,splits:[{id:'too-much',amountCents:9000,categoryId:'home'}]}),state);
});

test('templates clone allocation intent without actuals; instance edits never rewrite the template',()=>{
 const original=fresh(),pay={id:'new-pay',name:'New period',receivedDate:'2026-11-20',periodStart:'2026-11-20',periodEnd:'2026-12-03',expectedCents:380000};
 let state=m.moneyReducer(original,{type:'apply-template',templateId:'regular',paycheck:pay});const rows=state.allocations.filter((row)=>row.paycheckId===pay.id);
 assert.equal(rows.length,original.templates[0].allocations.length);assert.equal(new Set(rows.map((row)=>row.id)).size,rows.length);
 state=save(state,'allocations',{...rows[0],plannedCents:999,actualCents:500});assert.equal(state.templates[0].allocations[0].plannedCents,120000);
 const template=m.templateFromPaycheck(state,pay,'new-template','My structure');assert.equal(template.allocations[0].plannedCents,999);assert.equal('actualCents' in template.allocations[0],false);assert.equal('dueDate' in template.allocations[0],false);
 state=save(state,'templates',template);template.allocations[0].plannedCents=1;assert.equal(state.templates.at(-1).allocations[0].plannedCents,999,'commands do not share mutable payloads');
 assert.equal(m.moneyReducer(state,{type:'apply-template',templateId:'regular',paycheck:pay}),state,'an instance cannot be duplicated by replay');
});

test('category/tag archival keeps historical references; invalid hierarchy or payment links are rejected',()=>{
 let state=fresh();state=m.moneyReducer(state,{type:'archive',collection:'categories',id:'food',archived:true});
 state=m.moneyReducer(state,{type:'archive',collection:'tags',id:'treat',archived:true});
 assert.equal(state.transactions.find((item)=>item.id==='tx-food').categoryId,'food');assert.deepEqual(state.transactions.find((item)=>item.id==='tx-beauty').tagIds,['treat']);
 assert.equal(save(state,'transactions',{...state.transactions[0],subcategoryId:'skincare'}),state);
 assert.equal(save(state,'transactions',{...state.transactions[0],allocationId:'a-amex'}),state,'purchases cannot be logged as debt payments');
 assert.equal(save(state,'payments',{id:'invalid',cardId:'visa',date:'2026-10-30',amountCents:100,allocationId:'a-amex'}),state);
 const before=m.spendingTotal(state,period);state=save(state,'bills',{...state.bills[0],paid:true});assert.equal(m.spendingTotal(state,period),before,'bill status does not invent an expense');
 state=m.moneyReducer(state,{type:'remove',collection:'allocations',id:'a-food'});assert.equal(state.transactions.find((item)=>item.id==='tx-food').allocationId,undefined);assert.equal(state.transactions.find((item)=>item.id==='tx-food').amountCents,7218);
});

test('unknown card limit/APR remain unknown and upcoming obligations use actual reminder dates',()=>{
 const state=fresh();assert.equal(m.utilization(state.cards[2]),null);assert.equal(m.utilization({...state.cards[0],balanceCents:-100}),0);
 assert.equal(m.utilization({...state.cards[0],limitCents:0}),null);
 const upcoming=m.upcomingMoney(state,'2026-10-30');assert.equal(upcoming[0].name,'Rent');assert.ok(upcoming.some((item)=>item.kind==='card'&&item.name==='Amex'&&item.amount===70000));
});

test('Money sections render one shared model, compact ledger, vivid charts and Muse controls',()=>{
 const {MoneyContext}=load('components/money/MoneyStore'),views=load('components/money/MoneyViews'),onOpen=()=>{};
 const render=(component,props)=>renderToStaticMarkup(React.createElement(MoneyContext.Provider,{value:moneyFixture(moneySample)},React.createElement(component,{onOpen,...props})));
 const overview=render(views.MoneyOverview,{paycheck:moneySample.paychecks[0],period,today:'2026-10-30',onSpending(){}});
 assert.ok(overview.includes('Current paycheck'));assert.ok(overview.includes('muse-money-ribbon'));assert.ok(overview.includes('$130.00'));assert.ok(overview.includes('Coming up'));
 const paycheck=render(views.MoneyPaychecks,{paycheck:moneySample.paychecks[0],onSelect(){}});assert.ok(paycheck.includes('Use template'));assert.ok(paycheck.includes('Save changes to template'));assert.ok(paycheck.includes('$218.00'));
 const cards=render(views.MoneyCards,{});assert.ok(cards.includes('utilization unknown'));assert.ok(cards.includes('Unknown'));assert.ok(cards.includes('Record payment'));
 const categories=render(views.MoneyCategories,{});assert.ok(categories.includes('Subcategories')||categories.includes('Skincare'));assert.ok(categories.includes('Archive category'));
 const ledger=render(views.MoneyTransactions,{period,filters:{search:'Sephora',category:'',tag:'treat',payment:''}});assert.ok(ledger.includes('Sephora'));assert.ok(!ledger.includes('Whole Foods'));assert.ok(!ledger.includes('<select'));
 for(const html of [overview,paycheck,cards,categories])assert.ok(!html.includes('<select'));
});

test('Money refuses unsafe card-balance arithmetic and preserves existing allocation/payment relationships',()=>{
 let state=fresh();state=save(state,'cards',{...state.cards[0],balanceCents:Number.MAX_SAFE_INTEGER});
 assert.equal(save(state,'transactions',{...state.transactions[0],id:'too-large',amountCents:100}),state);
 state=fresh();state=save(state,'payments',{id:'linked',cardId:'amex',amountCents:100,date:'2026-10-30',allocationId:'a-amex'});
 const allocation=state.allocations.find((item)=>item.id==='a-amex');assert.equal(save(state,'allocations',{...allocation,cardId:'visa'}),state);
 assert.equal(save(state,'allocations',{...state.allocations.find((item)=>item.id==='a-food'),cardId:'amex'}),state);
});

function moneyFixture(state){const view={state,loaded:true,pending:false,error:''};return {subscribe:()=>()=>{},getSnapshot:()=>view,dispatch:()=>{},whenSaved:()=>{}};}

// Glow-up: Coming up lists bills, card payments and each recurring payment's next charge, once per obligation.
test('Coming up merges bills and recurring payments without duplicates or invented charges',()=>{
 const {comingUp}=load('lib/money');
 const rec=(id,name,date,extra={})=>({id,name,amountCents:1500,amountBehavior:'fixed',recurrence:{interval:1,unit:'month'},nextChargeDate:date,billingSource:'direct',status:'active',...extra});
 const bill=(id,name,date,extra={})=>({id,name,amountCents:1500,dueDate:date,recurrence:'monthly',paid:false,...extra});
 const state={paychecks:[],allocations:[],templates:[],transactions:[],payments:[],categories:[],tags:[],groups:[],paymentMethods:[],
  cards:[{id:'c1',name:'Visa',balanceCents:0,dueDate:'2026-11-20',minimumCents:2500}],
  bills:[bill('b1','Rent','2026-11-15',{amountCents:120000,recurringId:'r-rent'}),bill('b2','Gym','2026-11-18'),bill('b3','Water','2026-11-16',{paid:true,recurringId:'r-water'}),bill('b4','Old','2026-11-01')],
  recurring:[rec('r-rent','Rent','2026-11-15',{amountCents:120000}),rec('r-gym','gym ','2026-11-18'),rec('r-water','Water','2026-11-16'),rec('r-stream','Streaming','2026-11-14'),rec('r-power','Electricity','2026-11-19',{amountCents:undefined,amountBehavior:'estimated'}),rec('r-paused','Paused club','2026-11-17',{status:'paused'}),rec('r-gone','Cancelled','2026-11-17',{status:'cancelled',cancelledDate:'2026-10-01'})]};
 const list=comingUp(state,'2026-11-13');
 assert.deepEqual(list.map(i=>`${i.kind}:${i.name}:${i.date}`),['recurring:Streaming:2026-11-14','bill:Rent:2026-11-15','bill:Gym:2026-11-18','recurring:Electricity:2026-11-19','card:Visa:2026-11-20']);
 assert.equal(list.filter(i=>/rent/i.test(i.name)).length,1,'a linked bill and its recurring payment are one obligation');
 assert.equal(list.filter(i=>/gym/i.test(i.name)).length,1,'an unlinked bill with the same name, date and amount is the same obligation');
 assert.ok(!list.some(i=>i.name==='Water'),'a paid linked bill settles that charge');
 assert.ok(!list.some(i=>/Paused|Cancelled|Old/.test(i.name)),'paused, cancelled and past items are not listed');
 const power=list.find(i=>i.name==='Electricity');assert.equal(power.amount,undefined,'an unknown amount stays unknown');assert.equal(power.estimated,true);
 assert.equal(list.find(i=>i.name==='Streaming').cadence,'Monthly');
 assert.deepEqual(comingUp(state,'not-a-date'),[]);
});
