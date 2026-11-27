// Up Next read from the plans, and monthly goals (Nov 26).
import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';
const U=load('lib/books/up-next'),G=load('lib/whimsy/reading-goals');
const b=(id,status='planned',extra={})=>({id,title:id,status,reviewEmojis:[],createdAt:'2026-01-01T00:00:00.000Z',...extra});
const e=(kind,period,bookId,position)=>({id:`${kind}${period}${bookId}`,kind,period,bookId,position});
const goal=(f)=>({id:Math.random().toString(36),unit:'books',updatedAt:'2026-01-01T00:00:00.000Z',revision:1,...f});

test('Up next is this month’s waiting books in plan order, then later months, then the year; each once',()=>{
 const books=[b('a'),b('f','finished'),b('r','reading'),b('n'),b('y'),b('old'),b('p','paused')];
 const plans=[e('month','2026-11','f',0),e('month','2026-11','n',2),e('month','2026-11','a',1),e('month','2026-11','r',3),e('month','2026-12','p',0),e('month','2026-12','a',1),e('year','2026','y',0),e('month','2026-10','old',0)];
 assert.deepEqual(U.upNextFromPlans(plans,books,'2026-11-26').map(x=>x.id),['a','n','p','y'],'finished, reading and past months are skipped; duplicates once');
 assert.deepEqual(U.upNextFromPlans(plans,books,'2026-11-26',2).map(x=>x.id),['a','n']);
 assert.deepEqual(U.upNextFromPlans([],books,'2026-11-26'),[]);
});

test('a month uses its pinned goal, else the latest repeating goal that has started, else its plan',()=>{
 const repeat=goal({period:'month',start:'2026-09-01',end:'2026-09-30',target:3,recurs:true}),later=goal({period:'month',start:'2026-12-01',end:'2026-12-31',target:5,recurs:true}),pinned=goal({period:'month',start:'2026-11-01',end:'2026-11-30',target:4,recurs:false});
 assert.equal(G.monthGoalFor([repeat,later],'2026-11'),repeat,'December’s new repeating goal leaves November alone');
 assert.equal(G.monthGoalFor([repeat,later,pinned],'2026-11'),pinned);
 assert.equal(G.monthGoalFor([repeat,later],'2026-12'),later);
 assert.equal(G.monthGoalFor([repeat],'2026-08'),null);
 assert.equal(G.monthGoalFor([goal({period:'month',start:'2026-11-01',end:'2026-11-30',target:9,recurs:false,unit:'pages'})],'2026-11'),null,'only books goals');
});

test('month progress: the plan is the goal without one; a goal counts every finish in the month',()=>{
 const done=b('d','finished',{finishedOn:'2026-11-03',completions:[{id:'c1',finishedOn:'2026-11-03'}]}),extra=b('x','finished',{finishedOn:'2026-11-20',completions:[{id:'c2',finishedOn:'2026-11-20'}]});
 const planned=[done,b('a'),b('r','reading')],books=[...planned,extra];
 const plan=G.monthProgress([],books,planned,'2026-11');
 assert.equal(plan.source,'plan');assert.equal(plan.target,3);assert.equal(plan.done,1);assert.equal(plan.percent,33);
 const withGoal=G.monthProgress([goal({period:'month',start:'2026-11-01',end:'2026-11-30',target:4,recurs:false})],books,planned,'2026-11');
 assert.equal(withGoal.source,'goal');assert.equal(withGoal.target,4);assert.equal(withGoal.done,2,'planned or not, both November finishes count');
 assert.equal(G.monthProgress([],books,[],'2026-11').source,'none');
});

test('goal ideas offer finishing this month’s plan only when there is one',()=>{
 assert.ok(G.goalIdeas('2026-11-26',3).some(i=>i.id==='plan'&&i.target===3&&i.timeframe==='month'));
 assert.ok(!G.goalIdeas('2026-11-26',0).some(i=>i.id==='plan'));
 assert.ok(G.goalIdeas('2026-11-26',0).every(i=>['year','month','daily'].includes(i.timeframe)));
});
