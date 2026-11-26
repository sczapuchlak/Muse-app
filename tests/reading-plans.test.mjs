import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';
const P=load('lib/books/reading-plans');
const e=(kind,period,bookId,position)=>({id:`${kind}-${period}-${bookId}`,kind,period,bookId,position});
test('periods shift across year ends and label themselves',()=>{
 assert.equal(P.shiftPeriod('month','2026-12',1),'2027-01');assert.equal(P.shiftPeriod('month','2026-01',-1),'2025-12');assert.equal(P.shiftPeriod('month','2026-11',14),'2028-01');
 assert.equal(P.shiftPeriod('year','2026',-1),'2025');assert.equal(P.periodOf('month','2026-11-11'),'2026-11');assert.equal(P.periodOf('year','2026-11-11'),'2026');
 assert.equal(P.periodLabel('month','2026-11'),'November 2026');assert.equal(P.periodLabel('year','2026'),'2026');
 assert.ok(P.isPeriod('month','2026-02')&&!P.isPeriod('month','2026-13')&&P.isPeriod('year','2026')&&!P.isPeriod('year','26'));
});
test('a plan is its own entries in manual order; a book can be in several plans',()=>{
 const all=[e('month','2026-11','a',1),e('month','2026-11','b',0),e('month','2026-12','a',0),e('year','2026','a',0)];
 assert.deepEqual(P.planEntries(all,'month','2026-11').map(x=>x.bookId),['b','a']);
 assert.equal(P.planCount(all,'month','2026-12'),1);
 assert.deepEqual(P.plansForBook(all,'a').map(x=>`${x.kind}:${x.period}`),['year:2026','month:2026-11','month:2026-12']);
 assert.deepEqual(P.periodsWithPlans(all,'month'),['2026-12','2026-11'],'historical and future plans are listed');
});
test('status distribution follows real statuses, in a fixed order, and omits empty ones',()=>{
 const d=P.statusDistribution([{status:'finished'},{status:'planned'},{status:'planned'},{status:'dnf'},{status:'reading'}]);
 assert.deepEqual(d.map(x=>`${x.status}:${x.count}`),['planned:2','reading:1','finished:1','dnf:1']);
});
test('reordering moves one item and keeps a hidden remainder in place',()=>{
 assert.deepEqual(P.moveItem(['a','b','c','d'],0,2),['b','c','a','d']);assert.deepEqual(P.moveItem(['a','b'],5,0),['a','b']);
 assert.deepEqual(P.reorderWithin(['a','b','c','d','e'],['a','b','c'],['c','a','b']),['c','a','b','d','e']);
});
test('plan dates come from the read that is finished or in progress',()=>{
 assert.deepEqual(P.planDates({status:'finished',completions:[{id:'1',finishedOn:'2026-02-01',startedOn:'2026-01-10',recordedAt:''}]}),{started:'2026-01-10',finished:'2026-02-01'});
 assert.deepEqual(P.planDates({status:'reading',startedOn:'2026-11-02'}),{started:'2026-11-02',finished:undefined});
 assert.deepEqual(P.planDates({status:'planned'}),{started:undefined,finished:undefined});
});
test('a year shows every month of it, by month, each book once, then the books planned for the year itself (Nov 25)',()=>{
 const E=(kind,period,bookId,position)=>({id:`${kind}${period}${bookId}`,kind,period,bookId,position});
 const entries=[E('month','2026-11','a',0),E('month','2026-11','b',1),E('month','2026-03','c',0),E('month','2026-10','a',0),E('year','2026','d',0),E('year','2026','b',1),E('month','2025-11','z',0),E('year','2027','q',0)];
 const rows=P.yearRollup(entries,'2026');
 assert.deepEqual(rows.map(r=>`${r.bookId}@${r.period}`),['c@2026-03','a@2026-11','b@2026-11','d@2026'],'March, then November (a appears once, under its latest month), then Anytime (b is already in November)');
 assert.deepEqual(P.planRows(entries,'month','2026-11').map(r=>r.bookId),['a','b'],'a month is just its own books');
 assert.deepEqual(P.yearsWithPlans(entries),['2027','2026','2025'],'a year with only monthly plans still counts');
});
