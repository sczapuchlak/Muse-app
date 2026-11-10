import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';

const books=load('lib/whimsy/books');
const stats=load('lib/whimsy/reading-stats');
const start='2026-11-09T18:00:00.000Z';
const after=minutes=>new Date(Date.parse(start)+minutes*60000).toISOString();
const timer=(extra={})=>({bookId:'book',phase:'running',date:'2026-11-09',timeZone:'America/Los_Angeles',startedAt:start,sessionId:'sitting',sessionCommandId:'command',segments:[],runningSince:start,revision:1,updatedAt:start,...extra});

test('timed sitting counts active time, pauses, and overtime without stopping itself',()=>{
 const timed=timer({targetMinutes:15});
 assert.deepEqual(books.sittingClock(timed,Date.parse(after(5))),{label:'00:10:00',overtime:false,elapsed:300});
 const paused=timer({targetMinutes:15,phase:'paused',runningSince:undefined,segments:[{start,end:after(5)}]});
 assert.deepEqual(books.sittingClock(paused,Date.parse(after(50))),{label:'00:10:00',overtime:false,elapsed:300});
 const resumed={...paused,phase:'running',runningSince:after(50)};
 assert.deepEqual(books.sittingClock(resumed,Date.parse(after(62))),{label:'+00:02:00',overtime:true,elapsed:1020});
 assert.equal(resumed.phase,'running','reaching the target never changes timer phase');
});

test('open sitting counts upward; saved actual segments feed the existing daily goal and streak',()=>{
 const open=timer();
 assert.equal(books.sittingClock(open,Date.parse(after(17))).label,'00:17:00');
 const session={id:'sitting',bookId:'book',date:'2026-11-09',timeZone:'America/Los_Angeles',pages:8,activeSegments:[{start,end:after(5)},{start:after(50),end:after(62)}],createdAt:start,updatedAt:start,revision:1,userId:'owner'};
 const goal={id:'goal',period:'day',unit:'minutes',start:'2026-11-09',end:'2026-11-09',target:20,recurs:true,updatedAt:start};
 assert.equal(books.goalProgress(goal,[],[session],'2026-11-09'),17);
 assert.equal(stats.readingStreaks([session],'2026-11-09').readToday,true);
 assert.equal(books.activeSeconds(session.activeSegments),17*60);
});
