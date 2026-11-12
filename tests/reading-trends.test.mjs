import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';
const T=load('lib/whimsy/reading-trends');
const TODAY='2026-11-11';
const day=n=>{const d=new Date(Date.parse(`${TODAY}T12:00:00Z`)-n*86400000);return d.toISOString().slice(0,10);};
const seg=(date,minutes,hour=9)=>{const start=`${date}T${String(hour).padStart(2,'0')}:00:00.000Z`;return {start,end:new Date(Date.parse(start)+minutes*60000).toISOString()};};
const s=(date,minutes,pages=10,extra={})=>({id:`${date}-${Math.random()}`,bookId:'b',date,timeZone:'UTC',pages,activeSegments:minutes?[seg(date,minutes,extra.hour)]:[],...extra});
const book=(id,extra={})=>({id,title:id,status:'planned',reviewEmojis:[],createdAt:'2026-01-01T00:00:00.000Z',...extra});
const done=(id,finishedOn,extra={})=>book(id,{status:'finished',completions:[{id:`${id}-r`,finishedOn,recordedAt:`${finishedOn}T00:00:00.000Z`,...extra}]});

test('the window is the last 30 days including today, and the previous 30 days sit right before it',()=>{
 const t=T.readingTrends([],[],TODAY);
 assert.deepEqual([t.current.start,t.current.end],['2026-10-13','2026-11-11']);assert.deepEqual([t.previous.start,t.previous.end],['2026-09-13','2026-10-12']);
 const edge=T.readingTrends([],[s(day(0),10,5),s(day(29),10,7),s(day(30),10,100),s(day(59),10,50),s(day(60),10,999)],TODAY);
 assert.equal(edge.pages.current,12,'day 0 and day 29 are in; day 30 is not');assert.equal(edge.pages.previous,150,'day 30 and day 59 are in the previous window; day 60 is out');
 assert.equal(edge.pages.daily.length,30);assert.equal(edge.pages.daily[29],5,'today is the last bar');assert.equal(edge.pages.daily[0],7);
});
test('pages, time and reading days use the same per-day rules as the Atlas and the streak',()=>{
 const ses=[s(day(1),30,20),s(day(1),15,10,{hour:14}),s(day(2),0,40,{manual:true}),s(day(3),20,0)];
 const t=T.readingTrends([],ses,TODAY);
 assert.equal(t.pages.current,70,'every session adds its pages');assert.equal(Math.round(t.time.current/60),65,'time is active time only; a manual log without a duration adds none');
 assert.equal(t.days.current,3,'several sessions in a day count once; a pages-only manual log still counts as a reading day; a time-only day counts');
});
test('active time that crosses midnight is split onto the days it was read, in the session time zone',()=>{
 const cross={id:'x',bookId:'b',date:day(1),timeZone:'UTC',pages:5,activeSegments:[{start:`${day(1)}T23:50:00.000Z`,end:`${day(0)}T00:20:00.000Z`}]};
 const t=T.readingTrends([],[cross],TODAY);assert.equal(Math.round(t.time.daily[28]/60),10);assert.equal(Math.round(t.time.daily[29]/60),20);assert.equal(t.pages.daily[28],5,'pages stay on the session date');
 const la={id:'y',bookId:'b',date:day(3),timeZone:'America/Los_Angeles',pages:4,activeSegments:[{start:`${day(2)}T07:40:00.000Z`,end:`${day(2)}T08:20:00.000Z`}]};
 const l=T.readingTrends([],[la],TODAY);assert.equal(Math.round(l.time.daily[26]/60),20,'23:40–00:00 in Los Angeles is still day(3)');assert.equal(Math.round(l.time.daily[27]/60),20);
});
test('books finished counts completion events in the window, rereads as their own finish, and imports only by their finish date',()=>{
 const books=[done('a',day(2)),book('paused',{status:'paused'}),book('dnf',{status:'dnf'}),book('imported',{status:'planned',createdAt:`${day(1)}T00:00:00.000Z`}),
  book('reread',{status:'finished',completions:[{id:'r1',finishedOn:day(40),recordedAt:''},{id:'r2',finishedOn:day(5),recordedAt:''}]}),done('old',day(45))];
 const t=T.readingTrends(books,[],TODAY);
 assert.equal(t.finished.current,2,'a finished read and the second read of a reread book; paused, DNF and unread imports do not count');assert.equal(t.finished.previous,2,'day 40 and day 45 fall in the previous window');
 assert.equal(t.days.current,0,'an imported book is not a reading day');
});
test('comparison never shows NaN or an invented percentage, and a decrease is not a failure',()=>{
 const base={comparable:true};
 assert.deepEqual(T.movement({...base,current:150,previous:100}),{tone:'up',percent:50,diff:50});assert.deepEqual(T.movement({...base,current:60,previous:100}),{tone:'down',percent:40,diff:-40});
 assert.deepEqual(T.movement({...base,current:5,previous:0}),{tone:'new',percent:null,diff:5},'up from nothing has no percentage');assert.deepEqual(T.movement({...base,current:0,previous:0}),{tone:'same',percent:null,diff:0});
 assert.equal(T.movement({comparable:false,current:5,previous:0}).tone,'none');
 for(const m of [{tone:'down',percent:40,diff:-40},{tone:'up',percent:50,diff:50},{tone:'new',percent:null,diff:5},{tone:'none',percent:null,diff:0},{tone:'same',percent:null,diff:0}]){const text=T.movementLine('pages',m)+T.movementBadge(m);assert.doesNotMatch(text,/NaN|Infinity|undefined|null/);}
 assert.match(T.movementLine('time',{tone:'down',percent:10,diff:-4500}),/1 h 15 min fewer than the 30 days before/);
});
test('the first 30 days have nothing to compare; an empty history is empty; formatting is natural',()=>{
 const first=T.readingTrends([],[s(day(3),20,12)],TODAY);assert.equal(first.pages.comparable,false);assert.equal(T.movement(first.pages).tone,'none');assert.equal(first.empty,false);
 const older=T.readingTrends([],[s(day(70),20,12),s(day(3),20,12)],TODAY);assert.equal(older.pages.comparable,true);assert.equal(older.pages.previous,0);assert.equal(T.movement(older.pages).tone,'new');
 assert.equal(T.readingTrends([],[],TODAY).empty,true);
 assert.equal(T.formatTrend('time',45*60),'45 min');assert.equal(T.formatTrend('time',(6*60+5)*60),'6 h 5 min');assert.equal(T.formatTrend('time',7200),'2 h');assert.equal(T.formatTrend('pages',1240),'1,240 pages');assert.equal(T.formatTrend('days',1),'1 day');assert.equal(T.formatTrend('finished',1),'1 book');
});
test('editing or deleting a session changes the totals (nothing is stored)',()=>{
 const a=s(day(2),30,20),b=s(day(4),30,20);
 assert.equal(T.readingTrends([],[a,b],TODAY).pages.current,40);assert.equal(T.readingTrends([],[a],TODAY).pages.current,20);assert.equal(T.readingTrends([],[{...a,pages:5},b],TODAY).pages.current,25);
});
test('overlapping records fall back to session dates instead of throwing',()=>{
 const x=s(day(2),30,10),y={...s(day(2),30,10),id:'y'};
 assert.doesNotThrow(()=>T.readingTrends([],[x,y],TODAY));assert.equal(T.readingTrends([],[x,y],TODAY).pages.current,20);
});
