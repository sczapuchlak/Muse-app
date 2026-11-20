import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';

const engine=load('lib/books/completion');
const cycles=load('lib/whimsy/reading-cycles');
const stats=load('lib/whimsy/reading-stats');
const books=load('lib/whimsy/books');
const LA='America/Los_Angeles',today='2026-11-20';
let n=0;
const row=(date,startPage,endPage,minutes='',notes='')=>({key:`r${n++}`,date,startPage:String(startPage),endPage:String(endPage),minutes:String(minutes),notes});
const book=(over={})=>({id:'b1',title:'Book',status:'planned',reviewEmojis:[],totalPages:384,createdAt:'2026-11-20T12:00:00Z',updatedAt:'2026-11-20T12:00:00Z',revision:1,userId:'u',...over});
const saved=(b,fields)=>({...b,...fields,revision:b.revision+1});
const ctx=(over={})=>({totalPages:384,today,firstStart:0,...over});
const juneRows=()=>[row('2025-06-01',0,60,45),row('2025-06-02',60,145,70),row('2025-06-04',145,250,85),row('2025-06-06',250,384,90)];

test('four historical sessions validate, suggest their own dates, and become manual sessions linked to the read',()=>{
 const {parsed,issues}=engine.validateRows(juneRows(),ctx());
 assert.deepEqual(issues,[]);assert.equal(parsed.length,4);
 assert.deepEqual(parsed.map(r=>r.pages),[60,85,105,134]);
 const dates=engine.suggestedDates(parsed,384);
 assert.equal(dates.startedOn,'2025-06-01');assert.equal(dates.finishedOn,'2025-06-06','the last row reached the last page, so its date is the suggested finish');
 const {segments,failures}=engine.placeRowMinutes(parsed,LA,[]);
 assert.deepEqual(failures,[]);
 const records=engine.rowSessionRecords(parsed,{bookId:'b1',cycleId:'read-1',timeZone:LA,segments,positionRecordedAt:()=>'2025-06-06T19:00:00.000Z'});
 assert.ok(records.every(r=>r.manual===true&&r.cycleId==='read-1'&&r.bookId==='b1'));
 assert.deepEqual(records.map(r=>Math.round(stats.sessionSeconds(r)/60)),[45,70,85,90],'the minutes entered, exactly');
 assert.deepEqual(records.map(r=>r.date),['2025-06-01','2025-06-02','2025-06-04','2025-06-06'],'no session is invented for the days between');
 assert.equal(engine.completionSummary({finishedOn:'2025-06-06',totalPages:384,sessions:4,rating:4.5}),'Finished June 6, 2025 · 384 pages · 4 sessions · 4.5 stars');
 assert.equal(engine.completionSummary({finishedOn:'2025-06-06',totalPages:384,sessions:0}),'Finished June 6, 2025 · 384 pages · No detailed sessions recorded');
});

test('rows with pages but no minutes keep their pages and dates and record no time',()=>{
 const {parsed,issues}=engine.validateRows([row('2025-06-01',0,60),row('2025-06-02','',145)],ctx());
 assert.deepEqual(issues,[]);
 assert.equal(parsed[1].startingPage,60,'a blank starting page continues from the row above (cumulative progress)');assert.ok(parsed[1].inheritedStart);
 const {segments}=engine.placeRowMinutes(parsed,LA,[]);
 const records=engine.rowSessionRecords(parsed,{bookId:'b1',cycleId:'c',timeZone:LA,segments,positionRecordedAt:()=>'x'});
 assert.deepEqual(records.map(r=>r.activeSegments),[[],[]]);
 assert.equal(stats.readingPace(records).pagesPerHour,null,'no pace without real time');
});

test('row validation is inline, specific, and never rewrites what was entered',()=>{
 const issues=rows=>engine.validateRows(rows,ctx({startedOn:'2025-06-01',finishedOn:'2025-06-10'})).issues.map(i=>`${i.field}:${i.level}:${i.message}`);
 assert.match(issues([row('2025-06-03',100,90)])[0],/^endPage:error:Ends before it starts/);
 assert.match(issues([row('2025-06-03',0,400)])[0],/^endPage:error:Past the last page \(384\)/);
 assert.match(issues([row('2025-05-30',0,10)])[0],/^date:error:Before the start date/);
 assert.match(issues([row('2025-06-11',0,10)])[0],/^date:error:After the finish date/);
 assert.match(issues([row('2027-01-01',0,10)])[0],/^date:error:This date is in the future/);
 assert.match(issues([row('2025-02-30',0,10)])[0],/^date:error:Enter a real date/);
 assert.match(issues([row('2025-06-03',0,10,-5)])[0],/^minutes:error/);
 assert.match(issues([row('2025-06-03',0,10,'1441')])[0],/^minutes:error/);
 assert.match(issues([row('2025-06-04',0,60),row('2025-06-03',60,90)])[0],/^row:error:Dated before the session above/);
 assert.match(issues([row('2025-06-03',0,60),row('2025-06-04',50,90)])[0],/^row:error:Overlaps the session above, which already reached page 60/);
 assert.match(issues([row('2025-06-03',0,60),row('2025-06-03',0,60)])[0],/^row:error:This repeats the session above/);
 assert.deepEqual(issues([row('2025-06-03',0,60),row('2025-06-03',60,90)]),[],'two real sessions on one day are allowed');
 assert.deepEqual(engine.validateRows([engine.blankRow('x'),row('2025-06-03',0,60)],ctx()).issues,[],'an untouched blank row is ignored');
});

test('correcting a row clears its error before saving',()=>{
 const rows=[row('2025-06-01',0,60),row('2025-06-02',50,145)];
 assert.equal(engine.validateRows(rows,ctx()).issues.length,1);
 rows[1]={...rows[1],startPage:'60'};
 assert.deepEqual(engine.validateRows(rows,ctx()).issues,[]);
});

test('pages already logged for this read need confirmation rather than being silently merged',()=>{
 const existing=[{id:'s',bookId:'b1',date:'2025-06-01',timeZone:LA,pages:60,startingPage:0,endingPage:60,activeSegments:[]}];
 const {issues}=engine.validateRows([row('2025-06-02',30,90)],ctx({existing}));
 assert.equal(issues.length,1);assert.equal(issues[0].level,'confirm');assert.match(issues[0].message,/Pages 30–60 are already logged/);
});

test('an incomplete log never suggests a finish date, and the reader enters it',()=>{
 const {parsed}=engine.validateRows([row('2025-06-01',0,60),row('2025-06-04',60,250)],ctx());
 const dates=engine.suggestedDates(parsed,384);
 assert.equal(dates.finishedOn,undefined);assert.equal(dates.complete,false);assert.equal(dates.lastPage,250);
});

test('date rules: finish required and not in the future; start optional; sessions inside the read',()=>{
 const v=r=>engine.validateDates({target:'current',today,completions:[],...r}).map(p=>p.message);
 assert.deepEqual(v({finishedOn:'2025-06-06'}),[],'a finish date alone is a complete historical read');
 assert.deepEqual(v({startedOn:'2025-06-01',finishedOn:'2025-06-06'}),[]);
 assert.match(v({finishedOn:''})[0],/Choose the day you finished/);
 assert.match(v({finishedOn:'2026-12-01'})[0],/in the future/);
 assert.match(v({startedOn:'2025-06-07',finishedOn:'2025-06-06'})[0],/start date is after/);
 assert.match(v({finishedOn:'2025-06-05',sessionDates:['2025-06-06']})[0],/comes after this finish/);
 assert.match(v({finishedOn:'2025-06-06',completions:[{id:'a',finishedOn:'2025-07-01'}]})[0],/on or after your previous finish/);
 const open=[{id:'s',date:'2026-11-10'}];
 assert.match(v({finishedOn:'2026-11-05',openSessions:open})[0],/You logged a session on Nov 10, 2026, after this finish/);
 assert.match(v({startedOn:'2026-11-12',finishedOn:'2026-11-15',openSessions:open})[0],/before this start date/);
});

test('a past read may not overlap another read or the read in progress',()=>{
 const v=r=>engine.validateDates({target:'past',today,completions:[{id:'a',startedOn:'2025-06-01',finishedOn:'2025-06-06'}],...r}).map(p=>p.message);
 assert.deepEqual(v({startedOn:'2020-03-01',finishedOn:'2020-03-09'}),[]);
 assert.match(v({startedOn:'2025-06-03',finishedOn:'2025-06-20'})[0],/overlaps another read/);
 assert.match(v({finishedOn:'2025-06-06'})[0],/already have a read finished on Jun 6, 2025/);
 assert.deepEqual(v({startedOn:'2025-06-06',finishedOn:'2025-06-09'}),[],'a read may begin the day the previous one ended');
 assert.match(v({finishedOn:'2026-11-12',openStartedOn:'2026-11-01'})[0],/overlaps your current read/);
});

test('timed historical rows never overlap saved sessions and stay on their own local day',()=>{
 const busy=[{start:'2025-06-02T19:00:00.000Z',end:'2025-06-02T20:30:00.000Z'}];// 12:00–13:30 in Los Angeles
 const {segments,failures}=engine.placeRowMinutes([{key:'a',date:'2025-06-02',minutes:60},{key:'b',date:'2025-06-02',minutes:30}],LA,busy);
 assert.deepEqual(failures,[]);
 const [a]=segments.get('a'),[b]=segments.get('b');
 assert.equal(a.start,'2025-06-02T20:30:00.000Z','placed after the saved session');assert.equal(b.start,a.end,'and the next one after it');
 const long=engine.placeRowMinutes([{key:'c',date:'2025-06-02',minutes:780}],LA,[]);
 const days=load('lib/whimsy/integrations').readingByDay([{id:'c',bookId:'b',date:'2025-06-02',timeZone:LA,pages:1,activeSegments:long.segments.get('c')}]);
 assert.deepEqual(days.map(d=>[d.date,Math.round(d.seconds/60)]),[['2025-06-02',780]],'13 hours still count on the day entered');
 assert.equal(engine.placeRowMinutes([{key:'d',date:'2025-06-02',minutes:1440}],LA,busy).failures.length,1,'no room is a clear error, not a shifted day');
});

test('pasting rows from a spreadsheet or another app',()=>{
 const {rows,skipped}=engine.parsePastedRows('Date\tStart\tEnd\tMinutes\n2025-06-01\t0\t60\t45\nJune 2, 2025\t60\t145\t70\n6/4/2025\t145\t250\t85\n2025-06-06, 384\nnot a row',()=>`k${n++}`);
 assert.deepEqual(rows.map(r=>[r.date,r.startPage,r.endPage,r.minutes]),[['2025-06-01','0','60','45'],['2025-06-02','60','145','70'],['2025-06-04','145','250','85'],['2025-06-06','','384','']]);
 assert.deepEqual(skipped,['not a row']);
 assert.equal(engine.parseLooseDate('1 June 2025'),'2025-06-01');assert.equal(engine.parseLooseDate('June 1'),null,'a missing year is never guessed');
});

test('half-star ratings: steps, unrated, and saved fractional values kept exactly',()=>{
 for(const v of [0.5,2.5,4.5,5])assert.ok(engine.isHalfStep(v));
 for(const v of [0,4.25,5.5,NaN])assert.ok(!engine.isHalfStep(v));
 assert.ok(engine.acceptableRating(4.25,4.25),'an imported 4.25 is preserved when unchanged');
 assert.ok(!engine.acceptableRating(4.25,4));
 assert.equal(engine.starsPhrase(4.5),'4.5 stars');assert.equal(engine.starsPhrase(1),'1 star');
});

test('finishing the current read with historical dates: one completion under its read id, rating kept as given',()=>{
 let b=book({status:'reading',startedOn:'2026-11-01',cycleId:'b1:read:0'});
 const fields=cycles.finishCurrentRead(b,today,{startedOn:'2025-06-01',finishedOn:'2025-06-06',rating:4.5,review:'Lovely',reviewEmojis:[]});
 assert.equal(fields.readId,'b1:read:0');
 b=saved(b,fields);
 assert.equal(b.status,'finished');assert.equal(b.finishedOn,'2025-06-06','not today');assert.equal(b.startedOn,'2025-06-01');
 assert.deepEqual(b.completions.map(c=>[c.id,c.finishedOn,c.rating,c.review,c.historical]),[['b1:read:0','2025-06-06',4.5,'Lovely',undefined]]);
 assert.equal(b.rating,4.5,'the book-level mirror keeps the half star');
 const unrated=saved(book(),cycles.finishCurrentRead(book(),today,{finishedOn:'2025-06-06',reviewEmojis:[]}));
 assert.equal(unrated.completions[0].rating,undefined,'unrated stays unrated, never zero');assert.equal(unrated.rating,undefined);
 const noStart=saved(book({startedOn:'2026-11-01'}),cycles.finishCurrentRead(book({startedOn:'2026-11-01'}),today,{startedOn:'',finishedOn:'2025-06-06',reviewEmojis:[]}));
 assert.equal(noStart.completions[0].startedOn,undefined,'an unknown start stays unknown');
});

test('a To Be Read book finished historically creates no sessions and counts only where its dates support',()=>{
 const b=saved(book(),cycles.finishCurrentRead(book(),today,{startedOn:'2025-06-01',finishedOn:'2025-06-06',rating:2.5,reviewEmojis:[]}));
 const june=stats.completionsIn([b],{start:'2025-06-01',end:'2025-06-30'});
 assert.equal(june.count,1,'counted in June 2025');assert.equal(stats.completionsIn([b],{start:'2026-11-01',end:'2026-11-30'}).count,0,'not in the month it was entered');
 const summary=stats.periodSummary([b],[],'all',today);
 assert.deepEqual([summary.seconds,summary.pages,summary.readingDays,summary.sessions,summary.pace.pagesPerHour],[0,0,0,0,null]);
 assert.deepEqual(stats.readingStreaks([],today),{current:0,longest:0,readToday:false});
 assert.equal(stats.completedReadAverages([b],[]).averageCalendarDays,6,'calendar days only from the dates given');
 assert.equal(stats.completedReadAverages([b],[]).averageActiveSeconds,null,'no active time invented');
 assert.deepEqual(books.completedBookSeries([b],'month'),[{start:'2025-06-01',count:1}]);
});

test('a reread recorded later is another read of the same book; earlier reads and current progress are untouched',()=>{
 let b=book({status:'reading',startedOn:'2026-11-01',cycleId:'b1:read:4',revision:5,completions:[{id:'old',finishedOn:'2023-02-01',startedOn:'2023-01-10',recordedAt:'2023-02-01T00:00:00.000Z',rating:4}],currentPage:120});
 const live={id:'live',bookId:'b1',date:'2026-11-10',timeZone:LA,pages:40,activeSegments:[{start:'2026-11-10T18:00:00.000Z',end:'2026-11-10T19:00:00.000Z'}],cycleId:'b1:read:4'};
 const legacy={id:'legacy',bookId:'b1',date:'2026-11-12',timeZone:LA,pages:20,activeSegments:[]};
 const before=cycles.sessionReadId(b,legacy);
 const fields=cycles.addPastRead(b,today,{startedOn:'2020-03-01',finishedOn:'2020-03-09',rating:0.5,reviewEmojis:[]});
 b=saved(b,fields);
 assert.equal(b.status,'reading');assert.equal(b.cycleId,'b1:read:4','the read in progress keeps its id');assert.equal(b.currentPage,120);
 assert.deepEqual(b.completions.map(c=>[c.finishedOn,c.rating,!!c.historical]),[['2020-03-09',0.5,true],['2023-02-01',4,false]]);
 assert.equal(cycles.sessionReadId(b,live),'b1:read:4');
 assert.equal(cycles.sessionReadId(b,legacy),before,'an older unlinked session is never re-attributed to the past read');
 assert.equal(cycles.bookReads(b).length,3);
 assert.equal(stats.completionsIn([b],null).uniqueTitles,1,'one catalog book');
});

test('a reread added after a finished read becomes the latest read and the book mirrors it',()=>{
 let b=book({status:'finished',startedOn:'2020-03-01',finishedOn:'2020-03-09',completions:[{id:'first',startedOn:'2020-03-01',finishedOn:'2020-03-09',recordedAt:'2020-03-09T00:00:00.000Z',rating:3}]});
 b=saved(b,cycles.addPastRead(b,today,{startedOn:'2025-06-01',finishedOn:'2025-06-06',rating:4.5,reviewEmojis:['📚']}));
 assert.equal(b.status,'finished');assert.equal(b.finishedOn,'2025-06-06');assert.equal(b.cycleId,b.completions[1].id);
 assert.equal(b.rating,4.5);assert.deepEqual(b.completions[0].rating,3,'the earlier read keeps its own rating');
 assert.equal(stats.completionsIn([b],null).rereads,1);
});
