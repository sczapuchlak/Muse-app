import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const cycles=load('lib/whimsy/reading-cycles');
const stats=load('lib/whimsy/reading-stats');
const read=file=>readFileSync(resolve(root,file),'utf8');
const LA='America/Los_Angeles';
let n=0;
const session=(over={})=>({id:`s${n++}`,bookId:'b1',date:'2026-03-02',timeZone:LA,pages:30,activeSegments:[{start:'2026-03-02T18:00:00.000Z',end:'2026-03-02T19:00:00.000Z'}],createdAt:'2026-03-02T19:00:00Z',updatedAt:'2026-03-02T19:00:00Z',revision:1,userId:'u',...over});
const book=(over={})=>({id:'b1',title:'Book',status:'reading',reviewEmojis:[],totalPages:300,createdAt:'2026-01-01T12:00:00Z',updatedAt:'2026-01-01T12:00:00Z',revision:1,userId:'u',...over});
/** What the server returns after a save: the written fields with the next revision. */
const saved=(b,fields)=>({...b,...fields,revision:b.revision+1});
const finish=(b,day,opinion={})=>saved(b,cycles.shelfMove(b,'finished',day,{finishedOn:day,reviewEmojis:b.reviewEmojis,...opinion}));
const restart=(b,day)=>saved(b,cycles.shelfMove(b,'reading',day));
const readOf=(b,id)=>cycles.bookReads(b).find(r=>r.id===id);

test('a 2026 read and a 2027 reread keep separate dates, sessions, time, pages, pace, ratings and reviews',()=>{
 let b=book({startedOn:'2026-03-01'});
 b=saved(b,{cycleId:cycles.newCycleId(b)});const first=b.cycleId;
 const s1=[session({cycleId:first,date:'2026-03-02',pages:60}),session({cycleId:first,date:'2026-03-10',pages:40})];
 b=finish(b,'2026-03-20',{rating:4,review:'Loved the slow start.'});
 assert.equal(b.completions.length,1);assert.equal(b.completions[0].id,first,'finishing closes the read in progress under its own id');
 b=restart(b,'2027-05-01');const second=b.cycleId;assert.notEqual(second,first);assert.equal(b.startedOn,'2027-05-01');
 assert.deepEqual(b.completions,[{...b.completions[0]}],'starting a reread changes no earlier read');
 const s2=[session({cycleId:second,date:'2027-05-02',pages:90,activeSegments:[{start:'2027-05-02T18:00:00.000Z',end:'2027-05-02T19:30:00.000Z'}]})];
 b=finish(b,'2027-05-20',{rating:2,review:'Did not hold up.'});
 const [r1,r2]=b.completions;
 assert.deepEqual([r1.id,r1.finishedOn,r1.startedOn,r1.rating,r1.review],[first,'2026-03-20','2026-03-01',4,'Loved the slow start.'],'the 2026 experience is untouched');
 assert.deepEqual([r2.id,r2.finishedOn,r2.startedOn,r2.rating,r2.review],[second,'2027-05-20','2027-05-01',2,'Did not hold up.']);
 assert.equal(b.rating,2,'cards show the latest read');assert.equal(b.finalThoughts,'Did not hold up.');
 const all=[...s1,...s2],one=cycles.readStats(b,all,readOf(b,first),'2027-06-01'),two=cycles.readStats(b,all,readOf(b,second),'2027-06-01');
 assert.deepEqual([one.sessions,one.pages,one.seconds,one.pagesPerHour,one.calendarDays],[2,100,7200,50,20]);
 assert.deepEqual([two.sessions,two.pages,two.seconds,two.pagesPerHour,two.calendarDays],[1,90,5400,60,20]);
 assert.deepEqual(['2026','2027'].map(y=>stats.completionsIn([b],{start:`${y}-01-01`,end:`${y}-12-31`}).count),[1,1],'each completion counts in its own year');
 const total=stats.completionsIn([b],null);assert.deepEqual([total.count,total.uniqueTitles,total.rereads],[2,1,1]);
});

test('several reads in one year, and finishing then restarting on the same day, stay distinct',()=>{
 let b=book({startedOn:'2026-01-05'});b=saved(b,{cycleId:cycles.newCycleId(b)});const a=b.cycleId;
 b=finish(b,'2026-02-01',{rating:5});b=restart(b,'2026-02-01');const c=b.cycleId;
 const sameDay=[session({cycleId:a,date:'2026-02-01',pages:10}),session({cycleId:c,date:'2026-02-01',pages:25})];
 b=finish(b,'2026-02-01',{rating:3});
 assert.equal(b.completions.length,2,'a same-day reread is a second read, not a duplicate');
 assert.deepEqual(b.completions.map(x=>[x.id,x.finishedOn,x.rating]),[[a,'2026-02-01',5],[c,'2026-02-01',3]]);
 assert.deepEqual([cycles.readStats(b,sameDay,readOf(b,a),'2026-03-01').pages,cycles.readStats(b,sameDay,readOf(b,c),'2026-03-01').pages],[10,25],'explicit links decide, never the date');
 b=restart(b,'2026-06-01');b=finish(b,'2026-06-30');
 assert.equal(stats.completionsIn([b],{start:'2026-01-01',end:'2026-12-31'}).count,3);
 assert.equal(b.completions[2].rating,undefined,'a skipped rating stays empty');assert.equal(b.rating,3,'cards keep the latest rated read');
});

test('retried or repeated finishes never create a second completion for one read',()=>{
 let b=book({startedOn:'2026-01-05'});b=saved(b,{cycleId:cycles.newCycleId(b)});
 const once=cycles.shelfMove(b,'finished','2026-02-01',{finishedOn:'2026-02-01',reviewEmojis:[]}),again=cycles.shelfMove(b,'finished','2026-02-01',{finishedOn:'2026-02-01',reviewEmojis:[]});
 assert.deepEqual(once,again,'the same write from the same saved book is identical, so the idempotent command applies once');
 const done=saved(b,once);
 assert.deepEqual(stats.nextCompletions(done,{status:'finished',finishedOn:'2026-02-01',cycleId:b.cycleId},'x',()=>'new'),done.completions,'finishing an already recorded read adds nothing');
 const noOpen=book({startedOn:'2026-01-05'});
 assert.equal(cycles.shelfMove(noOpen,'finished','2026-02-01',{finishedOn:'2026-02-01',reviewEmojis:[]}).completions[0].id,cycles.newCycleId(noOpen),'a read that began before cycle ids gets a deterministic id');
});

test('older sessions without a cycle id stay valid and are placed in a read only when unambiguous',()=>{
 const legacy=book({status:'finished',startedOn:'2026-01-01',finishedOn:'2026-02-01'});
 const s=[session({date:'2026-01-10'}),session({date:'2026-02-01'}),session({date:'2026-03-01'})];
 const only=cycles.bookReads(legacy);assert.equal(only.length,1);
 assert.deepEqual(s.map(x=>cycles.sessionReadId(legacy,x)),[only[0].id,only[0].id,only[0].id],'one read: every older session is that read');
 // Two reads: inside each window is clear; the shared finish day and later days are not.
 const two=book({status:'finished',completions:[{id:'r1',finishedOn:'2026-02-01',startedOn:'2026-01-01',recordedAt:'2026-02-01T00:00:00Z'},{id:'r2',finishedOn:'2026-04-01',startedOn:'2026-02-01',recordedAt:'2026-04-01T00:00:00Z'}],finishedOn:'2026-04-01'});
 const placed=[session({date:'2026-01-10'}),session({date:'2026-02-01'}),session({date:'2026-03-01'}),session({date:'2026-04-01'}),session({date:'2026-05-01'})].map(x=>cycles.sessionReadId(two,x));
 assert.deepEqual(placed,['r1',null,'r2','r2',null]);
 const reading={...two,status:'reading'};
 assert.deepEqual([session({date:'2026-04-01'}),session({date:'2026-04-02'})].map(x=>cycles.sessionReadId(reading,x)),[null,cycles.legacyOpenId(reading)],'with a read in progress, the last finish day is shared too');
 assert.equal(cycles.unlinkedSessions(two,[session({date:'2026-02-01'})]).length,1,'ambiguous sessions are listed for the reader to assign');
 assert.equal(cycles.sessionReadId(two,session({cycleId:'removed',date:'2026-03-01'})),null,'a link to a removed read is shown as not linked, not moved');
 // Period totals still include every session.
 const all=[session({date:'2026-02-01',pages:7})];assert.equal(stats.periodSummary([two],all,'all','2026-06-01').pages,7);
});

test('a book-level rating and review is copied to its read only when that is unambiguous, and never lost',()=>{
 const single=book({status:'finished',finishedOn:'2026-02-01',startedOn:'2026-01-01',rating:4,finalThoughts:'Lovely.'});
 const kept=cycles.preserveOpinions(single);
 assert.deepEqual([kept.completions[0].rating,kept.completions[0].review,kept.completions[0].id],[4,'Lovely.',`legacy:b1:2026-02-01`],'one read: the values are its, and its id is kept stable');
 assert.equal(kept.rating,4);assert.equal(kept.finalThoughts,'Lovely.','the original book-level values are not changed');
 // Reread in 2027: the 2026 opinion survives a new rating.
 let b=restart(single,'2027-01-10');b=finish(b,'2027-02-01',{rating:2,review:'Different now.'});
 assert.deepEqual(b.completions.map(c=>[c.finishedOn,c.rating,c.review]),[['2026-02-01',4,'Lovely.'],['2027-02-01',2,'Different now.']]);
 // Two reads but one book-level opinion: kept as unassigned, not guessed.
 const many=book({status:'reading',rating:5,finalThoughts:'Which read?',completions:[{id:'r1',finishedOn:'2025-01-01',recordedAt:'2025-01-01T00:00:00Z'},{id:'r2',finishedOn:'2026-01-01',recordedAt:'2026-01-01T00:00:00Z'}]});
 const unsure=cycles.preserveOpinions(many);
 assert.deepEqual([unsure.unassignedRating,unsure.unassignedReview,unsure.rating,unsure.finalThoughts],[5,'Which read?',5,'Which read?']);
 assert.ok(unsure.completions.every(c=>c.rating===undefined&&c.review===undefined),'no read is credited with it');
 const after=finish(many,'2026-09-01',{rating:3});
 assert.deepEqual([after.unassignedRating,after.unassignedReview,after.rating],[5,'Which read?',3],'a new read never overwrites the preserved value');
 assert.equal(cycles.readOpinion(after,after.completions[0]).rating,undefined);
 // The reader assigns it in Edit book.
 const form={status:'finished',startedOn:'',finishedOn:'2026-09-01',reads:after.completions.map(c=>c.id==='r1'?{...c,rating:5,review:'Which read?'}:c),review:'',unassigned:{}};
 const fields=cycles.editorReadFields(after,form,after,'2026-09-02');
 assert.deepEqual([fields.completions[0].rating,fields.unassignedRating,fields.rating],[5,undefined,3]);
});

test('Edit book saves each read on its own; finishing there closes the read in progress',()=>{
 let b=book({startedOn:'2026-01-01'});b=saved(b,{cycleId:cycles.newCycleId(b)});
 const fields=cycles.editorReadFields(b,{status:'finished',startedOn:'2026-01-01',finishedOn:'2026-02-01',reads:[],rating:4,review:' Good. ',unassigned:{}},b,'2026-02-01');
 assert.deepEqual(fields.completions.map(c=>[c.id,c.rating,c.review]),[[b.cycleId,4,'Good.']]);
 b=saved(b,fields);
 const edited=cycles.editorReadFields(b,{status:'finished',startedOn:'',finishedOn:'',reads:[{...b.completions[0],rating:5,finishedOn:'2026-02-03'}],review:'',unassigned:{}},b,'2026-02-04');
 assert.deepEqual([edited.completions[0].rating,edited.finishedOn,edited.rating,edited.cycleId],[5,'2026-02-03',5,b.cycleId]);
 assert.throws(()=>cycles.editorReadFields(b,{status:'finished',startedOn:'',finishedOn:'',reads:[{...b.completions[0],startedOn:'2026-03-01'}],review:'',unassigned:{}},b,'2026-03-02'),/finish date on or after its start/);
 const reread=cycles.editorReadFields(b,{status:'reading',startedOn:'2026-05-01',finishedOn:'',reads:b.completions,review:'',unassigned:{}},b,'2026-05-01');
 assert.notEqual(reread.cycleId,b.cycleId,'choosing Reading after Finished opens a new read');assert.equal(reread.completions.length,1);
});

test('editing or deleting a session recalculates only its read',()=>{
 const b=book({status:'reading',cycleId:'r2',completions:[{id:'r1',finishedOn:'2026-02-01',recordedAt:'2026-02-01T00:00:00Z'}]});
 const s=[session({cycleId:'r1',pages:10}),session({cycleId:'r2',pages:20,date:'2026-03-05'})];
 const r1=readOf(b,'r1'),r2=readOf(b,'r2');
 assert.deepEqual([cycles.readStats(b,s,r1,'2026-04-01').pages,cycles.readStats(b,s,r2,'2026-04-01').pages],[10,20]);
 const moved=[{...s[0],cycleId:'r2'},s[1]];
 assert.deepEqual([cycles.readStats(b,moved,r1,'2026-04-01').pages,cycles.readStats(b,moved,r2,'2026-04-01').pages],[0,30],'reassigning a session moves its pages');
 assert.deepEqual([cycles.readStats(b,[s[1]],r1,'2026-04-01').sessions,cycles.readStats(b,[s[1]],r2,'2026-04-01').sessions],[0,1],'deleting a session removes it from its read');
 const averages=stats.completedReadAverages([{...b,status:'finished',finishedOn:'2026-02-01'}],s);
 assert.ok(averages,'completed-read averages use the explicit links');
});

test('timed and manual sessions are linked to their read in the app',()=>{
 const shelf=read('components/whimsy/Bookshelf.tsx');
 assert.match(shelf,/const cycleId=await ensureOpenRead\(book\);const start=\{bookId:book\.id,cycleId,/,'the timer records the read when it starts');
 assert.match(shelf,/\.\.\.\(saving\.cycleId\?\{cycleId:saving\.cycleId\}:\{\}\)\},expectedRevision:0/,'the timed session saves the timer\'s read');
 assert.equal((shelf.match(/\.\.\.\(timer\.cycleId\?\{cycleId:timer\.cycleId\}:\{\}\)/g)??[]).length,2,'pause, resume and finish keep the read on the timer');
 assert.match(shelf,/\.\.\.\(t\.cycleId\?\{cycleId:t\.cycleId\}:\{\}\)/,'long-stretch corrections keep the read');
 assert.match(shelf,/form\.cycleId=bookReads\(book\)\.at\(-1\)\?\.id\?\?'';if\(session\)\{form\.cycleId=session\.cycleId\?\?'';/,'a new manual session defaults to the current read; an edited one keeps its own link or stays unlinked');
 assert.match(shelf,/sessionForm\.cycleId===legacyOpenId\(book\)\?await ensureOpenRead\(book\):sessionForm\.cycleId\|\|undefined/);
 assert.match(shelf,/Which read\?/);
 const b=book({status:'reading',startedOn:'2026-01-01'});
 assert.equal(cycles.bookReads(b).at(-1).id,cycles.legacyOpenId(b),'a read begun before cycle ids is named only until a stored id is created');
 assert.equal(cycles.openReadId({...b,cycleId:'abc'}),'abc');
 assert.equal(cycles.openReadId(book({status:'finished',cycleId:'r1',completions:[{id:'r1',finishedOn:'2026-02-01',recordedAt:'x'}]})),undefined,'a finished book has no read in progress');
});

test('Finish Book saves this read\'s details, prefills only a first read, and uses quiet Muse Magic',()=>{
 const finishView=read('components/whimsy/FinishBook.tsx'),css=read('components/whimsy/Bookshelf.css'),shelf=read('components/whimsy/Bookshelf.tsx');
 assert.match(finishView,/draft=\{rating:reread\?undefined:book\.rating,review:reread\?undefined:/,'a reread starts with an empty rating and review');
 assert.match(finishView,/Skip details/);assert.match(finishView,/<CoverThumb src=\{book\.coverUrl\}\/>/);assert.match(finishView,/<BookEmojiPicker/);
 assert.match(shelf,/if\(next==='finished'&&!details\)\{setError\(''\);setDetailId\(null\);setFinishing\(\{bookId:book\.id,reason:'shelf'\}\)/,'moving to Finished opens the finish check-in');
 assert.match(css,/@keyframes muse-finish-shimmer/);assert.match(css,/prefers-reduced-motion: reduce\)[^}]*\.muse-finish-shimmer/);assert.match(css,/data-magic="quiet"\] \.muse-finish-shimmer/);
 assert.ok(!/confetti/i.test(finishView+css.slice(css.indexOf('muse-finish'))));
 // Emojis stay one flexible set per book (0-3).
 const books=load('lib/whimsy/books');assert.deepEqual(books.parseEmojiReview('🐉'),['🐉']);assert.deepEqual(books.parseEmojiReview(''),[]);assert.throws(()=>books.parseEmojiReview('🐉✨🖤🌹'));
});

test('starting a reread never saves a finish date before the new start (the server rejects that)',()=>{
 const finished=book({status:'finished',startedOn:'2026-03-01',finishedOn:'2026-03-20'});
 for(const fields of [cycles.shelfMove(finished,'reading','2027-01-10'),cycles.shelfMove(finished,'paused','2027-01-10'),cycles.editorReadFields(finished,{status:'reading',startedOn:'2027-01-10',finishedOn:'2026-03-20',reads:stats.bookCompletions(finished),review:'',unassigned:{}},finished,'2027-01-10')]){
  assert.ok(!fields.finishedOn||!fields.startedOn||fields.finishedOn>=fields.startedOn,JSON.stringify(fields));
  assert.deepEqual(fields.completions.map(c=>c.finishedOn),['2026-03-20'],'the earlier finish is kept in the read history');
 }
 const done=cycles.shelfMove(book({startedOn:'2026-05-10'}),'finished','2026-05-01',{finishedOn:'2026-05-01',reviewEmojis:[]});
 assert.ok(!done.startedOn||done.startedOn<=done.finishedOn,'an earlier finish than the recorded start drops the impossible start instead of failing');
});

test('an Edit book save can never drop a preserved older rating or review',()=>{
 const many=book({status:'finished',rating:5,finalThoughts:'Still pure magic.',finishedOn:'2026-09-20',completions:[{id:'c1',finishedOn:'2025-06-10',recordedAt:'x'},{id:'c2',finishedOn:'2026-09-20',recordedAt:'y'}]});
 const lost=cycles.editorReadFields(many,{status:'finished',startedOn:'',finishedOn:'',reads:stats.bookCompletions(many),review:'',unassigned:{}},many,'2026-11-05');
 assert.deepEqual([lost.unassignedRating,lost.unassignedReview,lost.rating,lost.finalThoughts],[5,'Still pure magic.',5,'Still pure magic.'],'a form that forgot the value still saves it');
 const assigned=cycles.editorReadFields(many,{status:'finished',startedOn:'',finishedOn:'',reads:stats.bookCompletions(many).map(c=>c.id==='c1'?{...c,rating:5,review:'Still pure magic.'}:c),review:'',unassigned:{}},many,'2026-11-05');
 assert.deepEqual([assigned.completions[0].rating,assigned.completions[0].review,assigned.unassignedRating,assigned.unassignedReview,assigned.rating],[5,'Still pure magic.',undefined,undefined,5],'once a read holds it, it moves there');
 const shelf=read('components/whimsy/Bookshelf.tsx');
 assert.match(shelf,/onChange=\{\(reads,unassigned\)=>setBookForm\(form=>form\?\{\.\.\.form,reads,unassigned\}:form\)\}/,'reads and the preserved value change in one update');
});
