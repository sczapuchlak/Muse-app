import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load,root} from './helpers.mjs';

const dna=load('lib/whimsy/reading-dna');
const read=file=>readFileSync(resolve(root,file),'utf8');
const LA='America/Los_Angeles';
let n=0;
const own=id=>({id,userId:'u',revision:1,createdAt:'2025-01-01T00:00:00Z',updatedAt:'2025-01-01T00:00:00Z'});
const done=(id,finishedOn,startedOn,extra={})=>({id:`${id}-${finishedOn}`,finishedOn,...(startedOn?{startedOn}:{}),recordedAt:`${finishedOn}T00:00:00Z`,...extra});
const book=(id,over={})=>({...own(id),title:`Book ${id}`,status:'finished',reviewEmojis:[],...over});
const at=(iso,minutes)=>[{start:iso,end:new Date(Date.parse(iso)+minutes*60000).toISOString()}];
const session=(bookId,date,over={})=>({...own(`s${n++}`),bookId,date,timeZone:'UTC',pages:10,activeSegments:at(`${date}T12:00:00.000Z`,30),manual:false,...over});
const Y26={start:'2026-01-01',end:'2026-12-31'};

test('genres: each book counts fully in each genre, names group case-insensitively, shares can overlap',()=>{
 const books=[book('a',{genre:'Fantasy, Romance',completions:[done('a','2026-02-01')]}),book('b',{genre:'fantasy',completions:[done('b','2026-03-01')]}),book('c',{genre:'',completions:[done('c','2026-04-01')]}),book('d',{genre:'Science Fiction',status:'reading'})];
 const sessions=[session('d','2026-05-01',{activeSegments:at('2026-05-01T12:00:00.000Z',300),pages:50}),session('a','2026-01-20',{pages:200})];
 const g=dna.genreBreakdown(books,sessions,Y26);
 const fantasy=g.rows.find(r=>r.key==='fantasy');
 assert.deepEqual([fantasy.finished,fantasy.share,fantasy.genre],[2,67,'Fantasy']);
 assert.equal(g.rows.find(r=>r.key==='romance').share,33);assert.equal(g.finishedBooks,3);assert.equal(g.untagged,1);assert.equal(g.overlapping,false);
 const fav=dna.favoriteGenres(g.rows);
 assert.deepEqual([fav.mostRead.genre,fav.mostTime.genre,fav.mostPages.genre],['Fantasy','Science Fiction','Fantasy'],'three separate answers');
 assert.equal(dna.genreBreakdown([book('x',{genre:'Fantasy, Romance',completions:[done('x','2026-02-01')]})],[],Y26).overlapping,true);
});

test('emojis: once per book, unique books once per year, finished books only, all time vs one year',()=>{
 const books=[
  book('a',{reviewEmojis:['🐉','🐉','❤️'],completions:[done('a','2026-02-01'),done('a','2026-09-01')]}),
  book('b',{reviewEmojis:['🐉','❤','✨'],completions:[done('b','2026-03-01')]}),
  book('c',{reviewEmojis:['👍🏽','✨'],completions:[done('c','2025-03-01')]}),
  book('d',{reviewEmojis:['🌹'],status:'reading'}),
 ];
 const year=dna.yearInThreeEmojis(books,'2026');
 assert.deepEqual(year.top.map(e=>[e.emoji,e.books]),[['🐉',2],['❤️',2],['✨',1]],'a book finished twice in 2026 counts once; the heart with and without its selector is one emoji');
 const all=dna.emojiRanking(books,null).ranking;
 assert.deepEqual(all.find(e=>e.emoji==='✨').books,2,'all time includes 2025');
 assert.ok(!all.some(e=>e.emoji==='🌹'),'unfinished books are not in completed-book emoji statistics');
 assert.deepEqual(dna.yearInThreeEmojis(books,'2025').top.map(e=>e.emoji),['👍🏽','✨'],'ties follow the order the emojis were chosen in');
 assert.deepEqual(dna.yearInThreeEmojis(books,'2024').top,[]);
});

test('habits: reading hour uses timed sessions split across local hours; weekday, month and consistency follow rules',()=>{
 const s=[
  session('a','2026-03-02',{timeZone:LA,activeSegments:at('2026-03-03T04:30:00.000Z',60)}), // 8:30–9:30 pm LA (PST)
  session('a','2026-03-03',{timeZone:LA,activeSegments:at('2026-03-04T04:40:00.000Z',20)}),
  session('a','2026-03-04',{timeZone:LA,activeSegments:at('2026-03-05T05:00:00.000Z',10)}),
  session('a','2026-03-07',{manual:true,activeSegments:at('2026-03-07T12:00:00.000Z',120)}),
 ];
 const h=dna.readingHabits(s,null,'2026-03-31');
 assert.equal(Math.round(h.hours[20]/60),30+20);assert.equal(Math.round(h.hours[21]/60),30+10);assert.equal(h.hours[12],0,'the manual session has no reliable clock time');
 assert.equal(h.topHour,20);assert.equal(h.timedSessions,3);
 assert.equal(h.favoriteDay.name,'Saturday','most time: the two-hour manual session');
 assert.equal(h.mostConsistentMonth.month,'2026-03');assert.equal(h.mostConsistentMonth.eligible,31);
 assert.equal(dna.readingHabits(s,null,'2026-03-10').mostConsistentMonth,null,'a current month needs 14 elapsed days');
 assert.equal(dna.readingHabits(s.slice(0,2),null,'2026-03-31').topHour,null,'favorite hour needs three timed sessions');
});

test('superlatives use real data only and per-read ratings',()=>{
 const books=[
  book('long',{totalPages:800,completions:[done('long','2026-05-01','2026-01-01',{rating:4})]}),
  book('short',{totalPages:120,completions:[done('short','2026-02-03','2026-02-01',{rating:5}),done('short','2026-08-10','2026-08-01',{rating:3})]}),
  book('nopages',{completions:[done('np','2026-03-01',undefined,{rating:5})]}),
 ];
 const s=dna.bookSuperlatives(books,[session('long','2026-02-01',{activeSegments:at('2026-02-01T12:00:00.000Z',600)}),session('short','2026-02-02'),session('short','2026-02-02',{activeSegments:at('2026-02-02T15:00:00.000Z',20)})],Y26);
 assert.deepEqual([s.longest.book.id,s.shortest.book.id,s.fastest.book.id,s.fastest.days],['long','short','short',3]);
 assert.deepEqual([s.mostTime.book.id,s.mostSessions.book.id],['long','short']);
 assert.equal(s.highestRated.rating,5);assert.equal(s.highestRated.tied,1);assert.equal(s.finishedBooks,3,'a reread title counts once among finished books');
 assert.equal(dna.bookSuperlatives([books[0]],[],Y26).shortest,null,'no shortest from a single book');
});

test('genre personality follows documented thresholds and never invents dragons',()=>{
 const make=(genres,emojis=[])=>genres.map((genre,i)=>book(`g${i}`,{genre,reviewEmojis:emojis[i]??[],completions:[done(`g${i}`,`2026-0${(i%9)+1}-01`)]}));
 assert.deepEqual(dna.genrePersona(make(['Fantasy','Fantasy']),Y26),{needed:3});
 const fantasy=dna.genrePersona(make(['Fantasy','Fantasy','fantasy','Romance','Mystery']),Y26);
 assert.equal(fantasy.title,'Fantasy Royalty');assert.match(fantasy.evidence,/3 of your 5 finished books include Fantasy/);assert.doesNotMatch(fantasy.line,/dragon/);
 assert.match(dna.genrePersona(make(['Fantasy','Fantasy','Fantasy','Romance','Mystery'],[['🐉'],['🐉']]),Y26).line,/dragons/,'dragons only when two books carry 🐉');
 assert.equal(dna.genrePersona(make(['Fantasy','Romance','Mystery','Horror','Poetry','History']),Y26).title,'The Genre Explorer');
 assert.equal(dna.genrePersona(make(['Fantasy','Fantasy','Romance','Romance','Mystery','Fantasy, Romance']),Y26).title,'Fantasy Royalty','exactly half is enough for a genre persona');
 assert.equal(dna.genrePersona(make(['Fantasy','Fantasy','Romance','Romance','Mystery','Horror','Fantasy, Romance']),Y26).title,'The Two-World Reader');
 assert.equal(dna.genrePersona(make(['Cozy','Cozy','Cozy']).concat(make(['x','y']).map((b,i)=>({...b,id:`z${i}`,genre:'Cozy'}))),Y26).title,'The Cozy Devotee');
});

test('behavior traits need their minimum data and report their evidence',()=>{
 const nights=Array.from({length:12},(_,i)=>session('a',`2026-04-${String(i+1).padStart(2,'0')}`,{activeSegments:at(`2026-04-${String(i+1).padStart(2,'0')}T22:00:00.000Z`,45)}));
 const t=dna.readingTraits([],nights,null,'2026-04-30');
 assert.ok(t.some(x=>x.title==='The Night Owl'&&/100% of your timed reading/.test(x.evidence)));
 assert.deepEqual(dna.readingTraits([],nights.slice(0,5),null,'2026-04-30').filter(x=>x.title==='The Night Owl'),[],'five sessions are not enough');
 const rereads=[book('r',{completions:[done('r','2026-01-01'),done('r','2026-02-01'),done('r','2026-03-01')]})];
 assert.ok(dna.readingTraits(rereads,[],null,'2026-04-30').some(x=>x.title==='The Comfort Rereader'));
});

test('milestones: dated from history, recalculated after edits, celebrated once and never as a flood',()=>{
 const books=[book('a',{completions:[done('a','2026-02-01')]})];
 const s=[session('a','2026-01-01',{pages:60}),session('a','2026-01-05',{pages:60})];
 const m=dna.readingMilestones(books,s),get=id=>m.find(x=>x.id===id);
 assert.deepEqual([get('books-1').achievedOn,get('pages-100').achievedOn,get('pages-1000').achievedOn],['2026-02-01','2026-01-05',null]);
 assert.equal(get('pages-1000').progress,120);
 assert.equal(dna.readingMilestones(books,[s[0]]).find(x=>x.id==='pages-100').achievedOn,null,'deleting a session can un-reach a milestone');
 const reached=m.filter(x=>x.achievedOn).map(x=>x.id);
 assert.deepEqual(dna.milestoneCelebration(reached,undefined),{celebrate:[],nextSeen:reached},'history becomes a silent baseline');
 const state={seen:['books-1'],since:'x'};
 assert.deepEqual(dna.milestoneCelebration(reached,state).celebrate,['pages-100']);
 assert.deepEqual(dna.milestoneCelebration(['books-1'],{seen:['books-1','pages-100'],since:'x'}).celebrate,[],'un-reached after an edit: nothing to show');
 assert.deepEqual(dna.milestoneCelebration(reached,{seen:['books-1','pages-100'],since:'x'}).celebrate,[],'reached again later: not celebrated twice');
 const streak=dna.readingMilestones([],Array.from({length:7},(_,i)=>session('a',`2026-06-0${i+1}`))).find(x=>x.id==='streak-7');
 assert.equal(streak.achievedOn,'2026-06-07');
});

test('Year in Review keeps annual and all-time apart and counts each read in its own year',()=>{
 const books=[book('a',{reviewEmojis:['🐉'],completions:[done('a','2025-12-30','2025-12-01'),done('a','2026-01-04','2026-01-02')]})];
 const sessions=[session('a','2025-12-31'),session('a','2026-01-01'),session('a','2026-01-02')];
 const y=dna.yearReview(books,sessions,'2026','2026-02-01');
 assert.deepEqual([y.numbers.reads,y.numbers.uniqueBooks,y.numbers.rereads,y.numbers.sessions,y.numbers.pages,y.numbers.readingDays,y.numbers.longestStreak],[1,1,1,2,20,2,2]);
 assert.equal(y.months[0].finished,1);assert.equal(y.months.length,12);
 assert.deepEqual(dna.yearsWithReading(books,sessions),['2026','2025']);
 assert.deepEqual(y.emojis.top.map(e=>e.emoji),['🐉']);
});

test('Reading Atlas has five sections, each rendering honestly from empty and real data',()=>{
 const {ReadingAtlas}=load('components/whimsy/ReadingAtlas');const noop=()=>{};
 const base={books:[],sessions:[],goals:[],today:'2026-11-02',timeZone:LA,range:'month',setRange:noop,calendarMonth:'2026-11',setCalendarMonth:noop,selectedDay:'2026-11-02',setSelectedDay:noop,onAddGoal:noop,onRemoveGoal:noop,onEditSession:noop,onDeleteSession:noop};
 const data={books:[book('a',{genre:'Fantasy',totalPages:300,reviewEmojis:['🐉','✨'],completions:[done('a','2026-10-01','2026-09-20',{rating:5})]})],sessions:[session('a','2026-09-21',{timeZone:LA})]};
 for(const initialSection of ['overview','dna','patterns','books','year']){
  const empty=renderToStaticMarkup(createElement(ReadingAtlas,{...base,initialSection})),full=renderToStaticMarkup(createElement(ReadingAtlas,{...base,...data,initialSection}));
  for(const html of [empty,full])assert.doesNotMatch(html,/NaN|Infinity|undefined/,initialSection);
  assert.match(full,/Overview.*Reading DNA.*Patterns.*Books &amp; Milestones.*Year in Review/);
 }
 const dnaView=renderToStaticMarkup(createElement(ReadingAtlas,{...base,...data,initialSection:'dna'}));
 assert.match(dnaView,/Still taking shape/);assert.match(dnaView,/shares can add up to more than 100%/);assert.match(dnaView,/🐉/);
 const year=renderToStaticMarkup(createElement(ReadingAtlas,{...base,...data,initialSection:'year'}));
 assert.match(year,/Your 2026 in emojis/);assert.match(year,/×1/,'every emoji shows how many books used it');assert.match(year,/\d+%/,'and its share of finished books');assert.match(year,/Your year so far/);
 const books=renderToStaticMarkup(createElement(ReadingAtlas,{...base,...data,initialSection:'books'}));
 assert.match(books,/First book finished/);assert.match(books,/5\/5 for that read/);
});

test('milestone state is synced on the account and never dropped by other preference writers',()=>{
 const shelf=read('components/whimsy/Bookshelf.tsx'),widget=read('components/whimsy/BooksDayviewWidget.tsx'),connected=read('lib/whimsy/connected.ts'),atlas=read('components/whimsy/ReadingAtlas.tsx'),css=read('components/whimsy/Bookshelf.css');
 assert.match(shelf,/readingMilestones:\{seen,since:/);assert.match(shelf,/milestonesReady=\{status\.loaded\}/,'never baselines before data has loaded');
 assert.match(widget,/\.\.\.bookshelfWidgetExtras\(preference\),featuredBookId/);assert.match(connected,/bookshelfWidgetExtras\(current\)/);
 assert.match(atlas,/milestoneCelebration\(achieved,milestoneState\)/);
 assert.match(css,/:root\[data-magic="quiet"\] \.muse-atlas-year-stars\{display:none\}/);
 assert.match(css,/\.muse-atlas-sections\{/);assert.doesNotMatch(atlas,/muse-page-tabs/,'Atlas sections are a view selector, not page tabs');
});
