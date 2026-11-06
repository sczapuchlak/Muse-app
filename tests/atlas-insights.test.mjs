import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from './helpers.mjs';

const ai=load('lib/whimsy/atlas-insights');
const own=id=>({id,userId:'u',revision:1,createdAt:'2025-01-01T00:00:00Z',updatedAt:'2025-01-01T00:00:00Z'});
const done=(id,finishedOn,startedOn,extra={})=>({id:`${id}-${finishedOn}`,finishedOn,...(startedOn?{startedOn}:{}),recordedAt:`${finishedOn}T00:00:00Z`,...extra});
const book=(id,over={})=>({...own(id),title:`Book ${id}`,status:'finished',reviewEmojis:[],...over});
let n=0;
const session=(date,start,minutes,over={})=>({...own(`s${n++}`),bookId:'a',date,timeZone:'UTC',pages:10,manual:false,activeSegments:[{start,end:new Date(Date.parse(start)+minutes*60000).toISOString()}],...over});
const Y26={start:'2026-01-01',end:'2026-12-31'};

test('ratings count each read with its own rating and keep unrated reads out of the average',()=>{
 const books=[book('a',{completions:[done('a','2025-05-01',null,{rating:2}),done('a','2026-02-01',null,{rating:5})]}),book('b',{completions:[done('b','2026-03-01',null,{rating:4.5})]}),book('c',{completions:[done('c','2026-04-01')]})];
 const r=ai.ratingsDistribution(books,Y26);
 assert.deepEqual([r.rated,r.unrated,r.average],[2,1,4.8]);
 assert.deepEqual(r.buckets.find(b=>b.value===5).books.map(b=>b.bookId),['a'],'the 2026 reread, not the 2025 read');
 assert.ok(r.buckets.some(b=>b.value===4.5));assert.ok(!r.buckets.some(b=>b.value===3.5),'unused half steps stay hidden');
 assert.equal(ai.ratingsDistribution(books,null).rated,3,'all time sees both reads');
 assert.equal(ai.ratingsDistribution([],null).average,null,'sparse: no average invented');
});

test('rhythm splits sessions across local hours and midnight, by each session’s own time zone',()=>{
 // Sunday 23:30 → Monday 00:30 in UTC.
 const r=ai.readingRhythm([session('2026-11-01','2026-11-01T23:30:00.000Z',60),session('2026-11-02','2026-11-02T10:00:00.000Z',30,{manual:true})],null);
 assert.equal(r.grid[6][23],1800);assert.equal(r.grid[0][0],1800,'the second half lands on Monday');
 assert.deepEqual([r.timedSessions,r.excludedSessions],[1,1]);assert.equal(r.bands.lateNight,3600);
 const la=ai.readingRhythm([session('2026-11-02','2026-11-02T03:00:00.000Z',30,{timeZone:'America/Los_Angeles'})],null);
 assert.equal(la.grid[6][19],1800,'7pm Sunday in Los Angeles, not 3am Monday UTC');
 const empty=ai.readingRhythm([],null);assert.deepEqual([empty.total,empty.topDay,empty.topHour],[0,null,null]);
});

test('formats keep missing data as “not recorded”, and finish speed uses each read’s own dates',()=>{
 const books=[book('a',{format:'audiobook',completions:[done('a','2026-01-10','2026-01-01'),done('a','2026-06-01','2026-06-01')]}),book('b',{completions:[done('b','2026-03-05','2026-01-01')]}),book('c',{format:'ebook',completions:[done('c','2026-04-01')]})];
 const f=ai.formatBreakdown(books,Y26);
 assert.equal(f.reads,4);assert.deepEqual(f.rows.map(r=>[r.format,r.reads]),[['physical',0],['ebook',1],['audiobook',2],['unknown',1]]);
 const s=ai.finishSpeed(books,Y26);
 assert.deepEqual([s.reads,s.missingStart,s.fastest.days,s.slowest.days,s.typicalDays],[3,1,1,64,10]);
 assert.equal(s.bands.find(b=>b.id==='same').reads,1,'a same-day reread is its own read');
});

test('authors split co-authors, count reads and unique books, and know new from returning',()=>{
 const books=[book('a',{author:'Ursula K. Le Guin',completions:[done('a','2024-01-01'),done('a','2026-01-01')]}),book('b',{author:'Neil Gaiman & Terry Pratchett',completions:[done('b','2026-02-01')]}),book('c',{author:'Terry Pratchett',completions:[done('c','2025-02-01')]}),book('d',{completions:[done('d','2026-03-01')]})];
 const a=ai.authorStats(books,Y26);
 assert.deepEqual(a.authors.map(x=>[x.author,x.reads,x.books,x.isNew]),[['Neil Gaiman',1,1,true],['Terry Pratchett',1,1,false],['Ursula K. Le Guin',1,1,false]]);
 assert.deepEqual([a.newAuthors,a.returningAuthors,a.unknownAuthorReads],[1,2,1]);
 assert.equal(ai.authorStats(books,null).authors.find(x=>x.author==='Ursula K. Le Guin').reads,2,'all-time rereads');
});

test('series progress reuses Collections’ own rules and ignores series without books',()=>{
 const s=(id,title)=>({id,title,scope:'released',conclusion_state:'concluded'});const m=(series_id,book_id,sequence)=>({id:`${series_id}${sequence}`,series_id,book_id,media_id:null,sequence,role:'mainline',release_state:'released'});
 const books=[book('a',{completions:[done('a','2026-01-01')]}),book('b',{status:'reading'})];
 const rows=ai.bookSeries(books,[s('x','Earthsea'),s('y','Films')],[m('x','a',1),m('x','b',2),{...m('y',null,1),media_id:'film'}]);
 assert.equal(rows.length,1);assert.deepEqual([rows[0].progress.completed,rows[0].progress.availableTotal,rows[0].progress.next.id],[1,2,'b']);
});

test('Patterns renders honestly with sparse, multi-year and reread histories',()=>{
 const {Patterns}=load('components/whimsy/atlas/Patterns');
 const base={sessions:[],label:'this year',series:[],seriesMembers:[],media:[],range:Y26};
 const empty=renderToStaticMarkup(createElement(Patterns,{...base,books:[]}));
 assert.doesNotMatch(empty,/NaN|Infinity|undefined/);assert.match(empty,/No rated reads/);assert.match(empty,/Timed sessions will draw your week/);
 const books=[book('a',{genre:'Fantasy',author:'A. Writer',format:'physical',completions:[done('a','2024-05-01','2024-04-01',{rating:3,emojis:['🌙']}),done('a','2026-05-01','2026-04-20',{rating:5,emojis:['🐉','✨']})]})];
 const full=renderToStaticMarkup(createElement(Patterns,{...base,books,sessions:[session('2026-04-21','2026-04-21T20:00:00.000Z',45)],onOpenBook:()=>{}}));
 assert.doesNotMatch(full,/NaN|Infinity|undefined/);
 assert.match(full,/5\/5/);assert.match(full,/Show 1 book/);assert.match(full,/Show as a table/);assert.match(full,/🐉/);
 assert.match(full,/2024.*🌙/s,'each year keeps its own read’s emojis');
});
