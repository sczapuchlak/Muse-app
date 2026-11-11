import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';
const {streakDetail,streakCelebration,STREAK_MILESTONES}=load('lib/whimsy/reading-streak');
const s=(date,extra={})=>({id:`${date}-${Math.random()}`,bookId:'b',date,timeZone:'UTC',pages:3,activeSegments:[],...extra});
const range=(end,count)=>Array.from({length:count},(_,i)=>{const d=new Date(`${end}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-i);return d.toISOString().slice(0,10);});

test('several sessions on one day count once and the week shows seven hearts ending today',()=>{
 const d=streakDetail([s('2026-11-10'),s('2026-11-10'),s('2026-11-09')],'2026-11-10');
 assert.equal(d.current,2);assert.equal(d.totalDays,2);assert.equal(d.week.length,7);assert.equal(d.week.at(-1).date,'2026-11-10');assert.ok(d.week.at(-1).today&&d.week.at(-1).read);
});
test('a streak stays alive through today until midnight',()=>{
 const d=streakDetail([s('2026-11-09'),s('2026-11-08')],'2026-11-10');assert.equal(d.current,2);assert.equal(d.readToday,false);
 assert.equal(streakDetail([s('2026-11-08')],'2026-11-10').current,0,'a missed full day breaks it');
});
test('streaks come from saved sessions only, and deleting a session recalculates',()=>{
 const sessions=range('2026-11-10',8).map(date=>s(date));assert.equal(streakDetail(sessions,'2026-11-10').current,8);
 const withoutMiddle=sessions.filter(x=>x.date!=='2026-11-07');const d=streakDetail(withoutMiddle,'2026-11-10');
 assert.equal(d.current,3);assert.equal(d.longest,4);assert.equal(streakDetail([s('2026-11-10',{pages:0})],'2026-11-10').current,0,'an empty session is not reading');
});
test('milestones record the day they were reached and celebrate only that day',()=>{
 assert.deepEqual([...STREAK_MILESTONES].slice(0,5),[7,14,30,50,100]);
 const d=streakDetail(range('2026-11-10',7).map(date=>s(date)),'2026-11-10');
 assert.equal(d.milestones[0].reachedOn,'2026-11-10');assert.equal(streakCelebration(d,'2026-11-10'),7);assert.equal(d.nextMilestone,14);
 assert.equal(streakCelebration(streakDetail(range('2026-11-10',8).map(date=>s(date)),'2026-11-10'),'2026-11-10'),null);
});
test('future-dated sessions do not inflate the streak',()=>{assert.equal(streakDetail([s('2026-11-11'),s('2026-11-10')],'2026-11-10').current,1);});
