import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';
const U=load('lib/books/up-next');
const b=(id,status='planned',extra={})=>({id,title:id,status,reviewEmojis:[],createdAt:'2026-01-01T00:00:00.000Z',...extra});
const e=(kind,period,bookId,position)=>({id:`${kind}${period}${bookId}`,kind,period,bookId,position});
test('only waiting books are eligible',()=>{
 assert.ok(U.eligible(b('a','planned'))&&U.eligible(b('a','paused'))&&U.eligible(b('a','dnf')));
 assert.ok(!U.eligible(b('a','reading'))&&!U.eligible(b('a','finished'))&&!U.eligible(b('a','planned',{archivedAt:'2026-02-01'})));
});
test('every source offers its own eligible books and skips ones already in other slots',()=>{
 const books=[b('a'),b('c','paused'),b('d','finished'),b('r','reading'),b('t')],plans=[e('month','2026-11','a',0),e('month','2026-11','d',1),e('month','2026-12','t',0),e('year','2026','c',0),e('year','2026','r',1)];
 const p=U.buildPools(books,plans,'2026-11-11',new Set());
 assert.deepEqual(p.month.map(x=>x.id),['a'],'this month, minus finished');assert.deepEqual(p.year.map(x=>x.id),['c'],'yearly, minus reading');
 assert.deepEqual(p.tbr.map(x=>x.id),['a','t']);assert.deepEqual(p.library.map(x=>x.id),['a','c','t']);
 assert.deepEqual(U.buildPools(books,plans,'2026-11-11',new Set(['a'])).month,[],'a book in another slot is not offered');
 assert.deepEqual(U.poolFor(p,'surprise').map(x=>x.id).sort(),['a','c','t'],'surprise merges the four, each book once');
});
test('an empty source explains itself and suggests sources that have books',()=>{
 const p=U.buildPools([b('t')],[],'2026-11-11',new Set()),r=U.emptyReason('month',p);
 assert.match(r.why,/month/);assert.deepEqual(r.try,['tbr','library']);
});
test('random picks are uniform, unbiased and avoid an immediate repeat',()=>{
 const counts={};const pool=[b('a'),b('b'),b('c'),b('d'),b('e')];
 for(let i=0;i<5000;i++){const id=U.pickRandom(pool).id;counts[id]=(counts[id]??0)+1;}
 assert.equal(Object.keys(counts).length,5);for(const n of Object.values(counts))assert.ok(n>800&&n<1200,`roughly even: ${n}`);
 for(let i=0;i<200;i++)assert.notEqual(U.pickRandom(pool,'c').id,'c','spin again moves on');
 assert.equal(U.pickRandom([b('only')],'only').id,'only','a single book is still returned');assert.equal(U.pickRandom([]),null);
 // rejection sampling: a source that hands back the very top of the range is retried, not folded into the pool
 let calls=0;const rigged=a=>{calls++;a[0]=calls===1?0xffffffff:2;return a;};assert.equal(U.randomIndex(3,rigged),2);assert.equal(calls,2);
});
test('the reel always ends on the winner',()=>{const pool=[b('a'),b('b'),b('c')],w=pool[1],r=U.reelFor(pool,w,10);assert.equal(r.length,10);assert.equal(r.at(-1).id,'b');});
test('slots: placing never duplicates, nudging swaps, settle drops started or missing books',()=>{
 let s=U.emptySlots();s=U.setSlot(s,0,'a');s=U.setSlot(s,1,'b');s=U.setSlot(s,2,'a');assert.deepEqual(s,[null,'b','a'],'a book moves rather than duplicating');
 assert.deepEqual(U.nudgeSlot(['a','b',null],0,1),['b','a',null]);assert.deepEqual(U.nudgeSlot(['a','b',null],0,-1),['a','b',null]);
 assert.deepEqual(U.removeFromSlot(['a','b','c'],1),['a',null,'c']);
 assert.deepEqual(U.settle(['a','b','c'],[b('a','reading'),b('b','planned'),b('x')]),[null,'b',null],'started and missing books leave Up Next');
 assert.deepEqual(U.settle(['p'],[b('p','paused')]),['p'],'a paused book stays');
});
