import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';
const G=load('lib/whimsy/daily-goal');
const seg=(date,minutes,hour=8)=>({start:`${date}T${String(hour).padStart(2,'0')}:00:00.000Z`,end:new Date(Date.parse(`${date}T${String(hour).padStart(2,'0')}:00:00.000Z`)+minutes*60000).toISOString().replace('.000Z','.000Z')});
const s=(date,minutes,extra={})=>({id:`${date}-${Math.random()}`,bookId:'b',date,timeZone:'UTC',pages:minutes?5:3,activeSegments:minutes?[seg(date,minutes,extra.hour??8)]:[],...extra});
const goal=(target=20,start='2026-11-01',extra={})=>({id:'g',period:'day',unit:'minutes',start,end:start,target,recurs:true,revision:1,createdAt:'2026-11-01T00:00:00.000Z',...extra});
const read=sessions=>new Set(sessions.map(x=>x.date));
const run=(g,sessions,today)=>{const sec=G.secondsByDay(sessions);return G.goalStreak(g,sec,read(sessions),today);};
test('consecutive days meeting the target build the goal streak; five minutes reads but does not meet 20',()=>{
 const ses=[s('2026-11-08',25),s('2026-11-09',20),s('2026-11-10',5),s('2026-11-11',30),s('2026-11-12',22)];
 const d=run(goal(20,'2026-11-01'),ses,'2026-11-12');
 assert.equal(d.current,2,'11 and 12 are consecutive; the 5-minute 10th breaks it');assert.equal(d.longest,2);assert.ok(d.metToday);
 assert.deepEqual(d.week.map(x=>x.met),[false,false,true,true,false,true,true],'the 10th was read but not met');
 assert.ok(d.week.find(x=>x.date==='2026-11-10').read&&!d.week.find(x=>x.date==='2026-11-10').met);
});
test('a missed day resets, today stays alive until midnight, and a zero-reading history is zero',()=>{
 const ses=[s('2026-11-10',30),s('2026-11-11',30)];
 assert.equal(run(goal(20),ses,'2026-11-12').current,2,'not met yet today: the streak is still alive');
 assert.equal(run(goal(20),ses,'2026-11-13').current,0,'a whole day missed');
 const none=run(goal(20),[],'2026-11-12');assert.deepEqual([none.current,none.longest,none.minutesToday,none.toGo],[0,0,0,20]);
 assert.equal(run(null,ses,'2026-11-12').current,0,'no goal, no goal streak');
});
test('several sessions in one day add up; manual logs without a duration never satisfy a time goal',()=>{
 const ses=[s('2026-11-12',8,{hour:7}),s('2026-11-12',7,{hour:12,bookId:'c'}),s('2026-11-12',6,{hour:20})];
 const d=run(goal(20),ses,'2026-11-12');assert.equal(Math.round(d.minutesToday),21);assert.ok(d.metToday,'8+7+6 minutes across two books meets 20');
 const manual=run(goal(20),[s('2026-11-12',0,{manual:true,pages:40})],'2026-11-12');
 assert.equal(manual.minutesToday,0);assert.ok(!manual.metToday);assert.ok(manual.week.at(-1).read,'but it still counts as a reading day');
 const timedManual=run(goal(20),[s('2026-11-12',25,{manual:true})],'2026-11-12');assert.ok(timedManual.metToday,'a manual entry with valid time counts');
});
test('changing the target never rewrites the past',()=>{
 const ses=[s('2026-11-09',12),s('2026-11-10',12),s('2026-11-11',25)];
 let g=goal(10,'2026-11-01');assert.equal(run(g,ses,'2026-11-11').current,3);
 g={...g,...G.withTarget(g,30,'2026-11-11')};
 const d=run(g,ses,'2026-11-11');assert.deepEqual(G.targetHistory(g).map(e=>`${e.from}:${e.target}`),['2026-11-01:10','2026-11-11:30']);
 assert.equal(G.targetOn(g,'2026-11-10'),10);assert.equal(G.targetOn(g,'2026-11-11'),30);assert.equal(G.targetOn(g,'2026-10-31'),null,'before the goal existed nothing is judged');
 assert.ok(d.week.find(x=>x.date==='2026-11-10').met,'11/10 still met against the 10 it was judged on');assert.ok(!d.metToday,'25 minutes does not meet the new 30');assert.equal(d.current,2);
 assert.deepEqual(G.withTarget(g,20,'2026-11-11').targetHistory.map(e=>e.target),[10,20],'a same-day change replaces that day\'s entry');
});
test('days before the goal existed are not judged, even if they were read',()=>{
 const ses=[s('2026-10-30',60),s('2026-10-31',60),s('2026-11-01',30)];
 const d=run(goal(20,'2026-11-01'),ses,'2026-11-01');assert.equal(d.current,1);assert.equal(d.longest,1);assert.equal(d.totalMet,1);
});
test('editing or deleting a session recalculates: nothing is stored',()=>{
 const ses=[s('2026-11-10',30),s('2026-11-11',30),s('2026-11-12',30)];
 assert.equal(run(goal(20),ses,'2026-11-12').current,3);
 assert.equal(run(goal(20),[ses[0],ses[2]],'2026-11-12').current,1,'deleting the middle day splits the run');
 assert.equal(run(goal(20),[ses[0],{...ses[1],activeSegments:[seg('2026-11-11',5)]},ses[2]],'2026-11-12').current,1,'shortening a session to 5 minutes breaks it');
});
test('time zones: a session is judged on its own local date, and active time crossing midnight is split',()=>{
 const la={id:'x',bookId:'b',date:'2026-11-11',timeZone:'America/Los_Angeles',pages:5,activeSegments:[{start:'2026-11-12T07:40:00.000Z',end:'2026-11-12T08:20:00.000Z'}]};
 const sec=G.secondsByDay([la]);assert.equal(Math.round((sec.get('2026-11-11')??0)/60),20,'07:40–08:20 UTC is 23:40–00:20 in Los Angeles: 20 minutes on the 11th');assert.equal(Math.round((sec.get('2026-11-12')??0)/60),20,'and 20 on the 12th');
 const cross={id:'y',bookId:'b',date:'2026-11-11',timeZone:'UTC',pages:5,activeSegments:[{start:'2026-11-11T23:50:00.000Z',end:'2026-11-12T00:20:00.000Z'}]};
 const c=G.secondsByDay([cross]);assert.equal(Math.round((c.get('2026-11-11')??0)/60),10);assert.equal(Math.round((c.get('2026-11-12')??0)/60),20);
});
test('monthly consistency counts days read versus days that met the target',()=>{
 const ses=[s('2026-11-02',30),s('2026-11-03',5),s('2026-11-04',25),s('2026-10-30',40)];
 const sec=G.secondsByDay(ses),m=G.monthlyConsistency(goal(20,'2026-10-01'),sec,read(ses),'2026-11-12',2);
 assert.deepEqual(m.map(x=>[x.month,x.read,x.met]),[['2026-10',1,1],['2026-11',3,2]]);
});
test('the active daily goal is the latest started daily-minutes goal; other goals are ignored',()=>{
 const a=goal(10,'2026-10-01'),b=goal(20,'2026-11-01',{id:'b'}),c={...goal(5),unit:'pages',id:'c',start:'2026-12-01'},d={...goal(1),period:'year',unit:'books',id:'d'};
 assert.equal(G.activeDailyGoal([a,c,d,b]).id,'b');assert.equal(G.activeDailyGoal([c,d]),null);
});
const C=load('lib/whimsy/celebrations');const SD=load('lib/whimsy/reading-streak');
const readOn=(...dates)=>dates.map(d=>({id:`${d}-${Math.random()}`,bookId:'b',date:d,timeZone:'UTC',pages:5,activeSegments:[]}));
const daysBack=(today,n)=>Array.from({length:n},(_,i)=>{const d=new Date(Date.parse(`${today}T12:00:00Z`)-i*86400000);return d.toISOString().slice(0,10);});
test('celebrations are true of today only and never invent history',()=>{
 const today='2026-11-12',week=daysBack(today,7),streak=SD.streakDetail(readOn(...week),today);
 const e=C.detectCelebrations({today,streak,goal:null});
 assert.deepEqual(e.map(x=>x.kind),['streak'],'the 7th day reached today celebrates the milestone (and not a duplicate personal best)');assert.equal(e[0].id,`streak:7:${today}`);
 const old=SD.streakDetail(readOn(...daysBack('2026-10-20',7)),today);assert.deepEqual(C.detectCelebrations({today,streak:old,goal:null}),[],'a 7-day streak from last month is not celebrated now');
 const notToday=SD.streakDetail(readOn(...daysBack('2026-11-11',7)),today);assert.deepEqual(C.detectCelebrations({today,streak:notToday,goal:null}),[],'a streak is only celebrated on the day it is reached');
});
test('a personal best needs an earlier, shorter best; the goal celebrates once per day; the challenge when its last book lands today',()=>{
 const today='2026-11-12',earlier=readOn('2026-10-01','2026-10-02','2026-10-03'),now=readOn(...daysBack(today,4));
 const streak=SD.streakDetail([...earlier,...now],today),ev=C.detectCelebrations({today,streak,goal:null});assert.deepEqual(ev.map(x=>x.kind),['best']);assert.equal(ev[0].count,4);
 const flat=SD.streakDetail(readOn(...daysBack(today,4),'2026-10-01','2026-10-02','2026-10-03','2026-10-04','2026-10-05'),today);assert.deepEqual(C.detectCelebrations({today,streak:flat,goal:null}),[],'not longer than the earlier 5-day run');
 const goal={metToday:true,targetToday:20,minutesToday:25.4,current:3};const g=C.detectCelebrations({today,streak:SD.streakDetail(readOn(today),today),goal});assert.equal(g[0].id,`goal:${today}`);assert.match(g[0].line,/25 of 20 minutes · 3 days in a row/);
 assert.equal(C.nextUnseen(g,[`goal:${today}`]),null,'seen once, never again');
 const ch={year:'2026',target:2,done:2,reached:true,reads:[{finishedOn:'2026-05-01'},{finishedOn:today}]};
 assert.equal(C.detectCelebrations({today,streak:SD.streakDetail([],today),goal:null,challenge:ch})[0].kind,'challenge');
 assert.deepEqual(C.detectCelebrations({today,streak:SD.streakDetail([],today),goal:null,challenge:{...ch,reads:[{finishedOn:'2026-05-01'},{finishedOn:'2026-06-01'}]}}),[],'a challenge finished earlier is not re-announced');
});
