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

test('keepsake: reviews stay out unless chosen, sections follow the choices, and sparse years stay honest',()=>{
 const k=load('lib/whimsy/keepsake');
 assert.ok(!k.defaultKeepsakeSections.includes('reviews'),'reviews are opt-in');
 const books=[book('a',{title:'Earthsea',genre:'Fantasy',completions:[done('a','2025-03-01',null,{rating:4,review:'Old magic.'}),done('a','2026-02-01',null,{rating:5,review:'A private thought about this book.',emojis:['🐉']})]}),book('b',{title:'Dune',completions:[done('b','2026-06-01',null,{rating:3})]})];
 const goals=[{...own('g'),period:'year',unit:'books',start:'2026-01-01',end:'2026-12-31',target:4,recurs:false}];
 const base={books,sessions:[],goals,today:'2026-11-06'};
 const y=k.keepsakeContent({...base,year:'2026',include:k.defaultKeepsakeSections});
 assert.deepEqual(y.reviews,[],'no review text by default');assert.doesNotMatch(JSON.stringify(y),/private thought/);
 assert.deepEqual(y.challenge,{done:2,target:4});assert.deepEqual(y.emojis,['🐉']);assert.deepEqual(y.favorites.map(f=>[f.title,f.rating]),[['Earthsea',5],['Dune',3]]);
 assert.equal(y.timeline.length,12);assert.equal(y.kicker,'My year in reading, so far');
 assert.deepEqual(k.keepsakeContent({...base,year:'2026',include:['reviews']}).reviews,[{title:'Earthsea',text:'A private thought about this book.'}]);
 const all=k.keepsakeContent({...base,year:null,include:k.defaultKeepsakeSections});
 assert.equal(all.challenge,null,'no single-year challenge on all time');assert.deepEqual(all.timeline.map(t=>[t.label,t.value]),[['’25',1],['’26',2]]);
 assert.equal(all.stats.find(s=>s.label==='Rereads').value,'1');assert.equal(all.favorites.length,2,'each book once');
 const empty=k.keepsakeContent({books:[],sessions:[],goals:[],today:'2026-11-06',year:'2026',include:k.defaultKeepsakeSections});
 assert.deepEqual([empty.emojis,empty.favorites,empty.timeline,empty.persona,empty.challenge],[[],[],[],null,null]);
 assert.equal(empty.stats[0].value,'0');
 assert.deepEqual(k.keepsakeContent({...base,year:'2026',include:[]}).stats,[]);
});

test('genre aliases resolve for statistics only, and unknown genres pass through untouched',()=>{
 const g=load('lib/collections/genres');const b=load('lib/whimsy/books');
 for(const v of ['sci-fi','SciFi',' SF ','science-fiction'])assert.equal(g.canonicalGenre(v),'Science Fiction',v);
 assert.equal(g.canonicalGenre('Cozy Mystery Vibes'),'Cozy Mystery Vibes');
 const book={genre:'sci-fi, Science Fiction, fantasy'};
 assert.deepEqual(b.bookGenres(book),['Science Fiction','Fantasy'],'aliases of one genre count once per book');
 assert.equal(book.genre,'sci-fi, Science Fiction, fantasy','saved text is never rewritten');
 assert.equal(b.genreKey('SF'),b.genreKey('Science Fiction'));
});

test('emojis belong to each read; legacy book emojis count once, at the latest read',()=>{
 const c=load('lib/whimsy/reading-cycles');
 const legacy=book('a',{reviewEmojis:['🐉'],completions:[done('a','2025-01-01'),done('a','2026-01-01')]});
 assert.deepEqual(legacy.completions.map(x=>c.readEmojis(legacy,x)),[[],['🐉']]);
 const single=book('s',{reviewEmojis:['🌙'],completions:[done('s','2026-01-01')]});assert.deepEqual(c.readEmojis(single,single.completions[0]),['🌙']);
 const next=c.withReadEmojis(legacy,'a-2025-01-01',['🌊','✨','🔥','extra']);
 assert.deepEqual(next.completions[0].emojis,['🌊','✨','🔥'],'at most three');
 assert.deepEqual(next.unassignedEmojis,['🐉'],'older book emojis are kept, not lost');
 const after={...legacy,...next};assert.deepEqual(after.completions.map(x=>c.readEmojis(after,x)),[['🌊','✨','🔥'],[]]);
 const cleared=c.withReadEmojis(after,'a-2025-01-01',[]);assert.deepEqual(cleared.completions[0].emojis,[]);assert.deepEqual(cleared.reviewEmojis,['🐉'],'mirror falls back to the kept emojis');
});

test('Reading Challenge: pinned year wins, rereads count in their finish year, pace is neutral, signals are factual',()=>{
 const r=load('lib/whimsy/reading-challenge');
 const goal=(id,start,target,recurs,updatedAt='2026-01-01T00:00:00Z')=>({...own(id),updatedAt,period:'year',unit:'books',start,end:`${start.slice(0,4)}-12-31`,target,recurs});
 const repeating=goal('r','2024-01-01',10,true),pinned=goal('p','2026-01-01',4,false);
 assert.equal(r.challengeFor([repeating,pinned],'2026').id,'p');assert.equal(r.challengeFor([repeating,pinned],'2025').id,'r');assert.equal(r.challengeFor([repeating],'2023'),null,'not before it started');
 assert.equal(r.challengeFor([{...pinned,period:'month'}],'2026'),null,'only yearly books goals');
 const books=[book('a',{completions:[done('a','2025-12-31'),done('a','2026-01-02')]}),book('b',{completions:[done('b','2026-03-01')]}),book('c',{status:'reading'})];
 const p=r.challengeProgress(pinned,books,'2026','2026-07-02');
 assert.deepEqual([p.done,p.target,p.percent,p.remaining,p.reached],[2,4,50,2,false]);assert.equal(p.reads[0].reread,true,'the reread counts in 2026');
 assert.equal(p.pace.status,'on-pace');
 assert.equal(r.challengeProgress(pinned,books,'2026','2027-02-01').pace,null,'no pace for a finished year');
 assert.equal(r.challengeProgress(pinned,[],'2026','2026-01-01').done,0,'sparse: an empty shelf');
 const s=r.challengeSignals(p,books);assert.deepEqual(s.thresholds,[25,50]);assert.equal(s.personalRecord,true,'2 beats 2025’s 1');assert.equal(s.firstFinishOfYear.finishedOn,'2026-01-02');
 assert.deepEqual(r.challengeYears([pinned],books,'2026-11-06'),['2027','2026','2025']);
});
