import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {load} from './helpers.mjs';
const {parseLibraryCsv}=load('lib/books/import-csv'),{guessMapping,mapCsvRow,assignRowIds}=load('lib/books/import-mapping'),{planGoodreads,sameImportedValues}=load('lib/books/import-plan'),{prepareGoodreadsCommands,executeImportCommands}=load('lib/books/import-execute'),{csvArchive,primaryLibraryCsv}=load('lib/books/import-export'),{importSeriesMatch}=load('lib/books/import-series'),{sessionReadId}=load('lib/whimsy/reading-cycles'),{completionsIn}=load('lib/whimsy/reading-stats');
const row=(extra={})=>({source:'goodreads',sourceId:'1',title:'First Book',author:'Author',status:'planned',shelves:[],warnings:[],...extra});
const book={id:'a',userId:'u',revision:1,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z',title:'First Book',author:'Author',status:'reading',reviewEmojis:[]};

test('generic mapping preserves fractional ratings and stable refresh identities',async()=>{
 const headers=['Title','Author','Status','Rating','Started On','Finished On','Format'],m=guessMapping(headers);
 const a=mapCsvRow(['Book','Writer','read','8.5','2022-01-01','2022-01-02','physical'],m,'csv:test',10);assert.equal(a.rating,4.25);assert.equal(a.format,'physical');
 const b={...a,status:'planned',rating:2};await assignRowIds([a,b]);assert.equal(a.sourceId,b.sourceId);assert.equal(sameImportedValues(a,Object.fromEntries(Object.entries(a).reverse())),true);
});
test('25,000 rows match through one identity index and preserve valid ISBN-less books',()=>{
 const rows=Array.from({length:25000},(_,i)=>row({sourceId:String(i),title:`Book ${i}`})),books=rows.map((r,i)=>({...book,id:String(i),title:r.title}));
 const parsed=parseLibraryCsv('Book Id,Title,Author\n'+rows.map(r=>`${r.sourceId},${r.title},Author`).join('\n'));assert.equal(parsed.length,25001);
 const plan=planGoodreads(rows,books,[]);assert.equal(plan.length,25000);assert.ok(plan.every(p=>p.kind==='matched'));
 assert.equal(planGoodreads([row({title:'No cover or ISBN'})],[],[])[0].kind,'new');
});
test('imported history is separate from actual sessions and ambiguous reads stay uncounted',()=>{
 const existing={...book,completions:[{id:'original',startedOn:'2026-01-01',finishedOn:'2026-02-01',recordedAt:'2026-02-01T00:00:00Z'}],rating:5,finalThoughts:'Mine'};
 const p=planGoodreads([row({finishedOn:'2022-01-01',rating:2,review:'Earlier'})],[existing],[]);assert.equal(p[0].historyAction,'add');
 let i=0;const command=prepareGoodreadsCommands(p,'batch','2026-03-01T00:00:00Z',()=>String(++i))[0],saved=command.command.p_book;
 assert.equal(saved.rating,5);assert.equal(saved.finalThoughts,'Mine');assert.equal(sessionReadId(saved,{date:'2025-01-01'}),'original');assert.equal(completionsIn([saved],null).importedCompletions,1);
 const ambiguous=planGoodreads([row({finishedOn:'2026-02-02'})],[existing],[]);assert.equal(ambiguous[0].historyAction,'preserve');assert.ok(ambiguous[0].conflicts.some(c=>c.includes('reading date')));
});
test('pause and retry retain exact transaction commands and report real counts',async()=>{
 const plan=planGoodreads([row(),row({sourceId:'2',title:'Second'})],[],[]);let n=0;const commands=prepareGoodreadsCommands(plan,'batch','2026-01-01T00:00:00Z',()=>String(++n)),seen=[],ctrl=new AbortController(),confirmed=new Set();
 const client={rpc:async(name,args)=>{seen.push(args.p_command_id);ctrl.abort();return {data:{sourceId:args.p_book.id},error:null};}};
 const first=await executeImportCommands(client,commands,()=>{},ctrl.signal,confirmed);assert.equal(first.saved,1);assert.equal(first.remaining,1);
 const resumed=await executeImportCommands({rpc:async(name,args)=>{seen.push(args.p_command_id);return {data:{sourceId:args.p_book.id},error:null};}},commands,()=>{},undefined,confirmed);assert.equal(resumed.saved,2);assert.equal(new Set(seen).size,2);
});
test('series catalog matching uses existing identities and preserves manual/hidden choices',()=>{
 const series=[{id:'s',kind:'book',title:'Series',catalog_source:'hardcover',catalog_id:'10'}],lookup={book:{id:'20'},catalog:{source:'hardcover',id:'10',members:[{source:'hardcover',id:'20',title:'First Book',author:'Author',position:.5,role:'optional'}]}};
 const match=importSeriesMatch(book,series,[],lookup);assert.equal(match.link.seriesId,'s');assert.equal(match.link.sequence,.5);assert.equal(match.link.role,'optional');
 assert.equal(importSeriesMatch(book,[],[],lookup).link,undefined);
 for(const override of [{hidden:true},{manual_override:true}])assert.equal(importSeriesMatch(book,series,[{id:'m',series_id:'s',catalog_source:'hardcover',catalog_id:'20',book_id:null,media_id:null,...override}],lookup).link,undefined);
});
test('archive opens with a standard ZIP reader and CSV remains Unicode safe',()=>{
 const dir=mkdtempSync(join(tmpdir(),'muse-zip-'));try{const csv=primaryLibraryCsv([{...book,title:'Étoile, "Book"',finalThoughts:'=unsafe()\nA review'}]);const zip=join(dir,'books.zip');writeFileSync(zip,csvArchive({'library.csv':csv,'README.txt':'Data portable.'}));const result=spawnSync('unzip',['-t',zip],{encoding:'utf8'});assert.equal(result.status,0,result.stdout+result.stderr);const decoded=parseLibraryCsv(csv);assert.equal(decoded[1][1],'Étoile, "Book"');assert.ok(decoded[1][6].startsWith("'=unsafe()"));}finally{rmSync(dir,{recursive:true,force:true});}
});
test('existing Books visual files stay untouched by the entry integration',()=>{
 const entry=readFileSync(new URL('../components/whimsy/Bookshelf.tsx',import.meta.url),'utf8');assert.ok(entry.includes('<BooksSettings name="Bookshelf"'));const css=readFileSync(new URL('../components/books/BooksSettings.css',import.meta.url),'utf8');assert.ok(!css.includes('.muse-series-'));assert.ok(!css.includes('.muse-bookshelf'));
});

test('explicit active-opinion replacement follows existing read ownership and retains the old value',()=>{
 const existing={...book,rating:5,finalThoughts:'Muse review',status:'finished',completions:[{id:'read',finishedOn:'2026-01-01',recordedAt:'2026-01-01T00:00:00Z',rating:5,review:'Muse review'}]};
 const plan=planGoodreads([row({finishedOn:'2026-01-01',rating:3,review:'Imported review'})],[existing],[]);plan[0].useFields=['rating','finalThoughts'];let n=0;
 const command=prepareGoodreadsCommands(plan,'batch','2026-01-02T00:00:00Z',()=>String(++n))[0].command;
 assert.equal(command.p_book.completions[0].rating,3);assert.equal(command.p_book.completions[0].review,'Imported review');assert.equal(command.p_observation.museBefore.rating,5);assert.equal(command.p_observation.museBefore.finalThoughts,'Muse review');
 const {shelfMove}=load('lib/whimsy/reading-cycles');assert.equal(shelfMove({...existing,...command.p_book},'reading','2026-01-03').rating,3);
});
test('changed source dates do not automatically invent another reread',()=>{
 const existing={...book,startedOn:'2026-01-01',completions:[{id:'imported',finishedOn:'2022-01-01',recordedAt:'2026-01-01T00:00:00Z',importSource:'goodreads'},{id:'muse',startedOn:'2026-01-01',finishedOn:'2026-02-01',recordedAt:'2026-02-01T00:00:00Z'}]};
 assert.equal(planGoodreads([row({finishedOn:'2023-01-01'})],[existing],[])[0].historyAction,'preserve');
});
test('Muse CSV summary reimports safely and preserves collection names containing separators',()=>{
 const csv=primaryLibraryCsv([{...book,format:'physical'}],new Map([[book.id,['A, B; C']]])),rows=parseLibraryCsv(csv),mapping=guessMapping(rows[0]),mapped=mapCsvRow(rows[1],mapping,'csv:muse',5);
 assert.deepEqual(mapped.shelves,['A, B; C']);assert.equal(mapped.format,'physical');assert.equal(planGoodreads([mapped],[book],[])[0].kind,'matched');
});
test('an older imported read never acquires an open Muse read’s unassigned opinions',()=>{
 const existing={...book,startedOn:'2026-01-01',rating:5,finalThoughts:'Current Muse opinion',reviewEmojis:['🖤']},p=planGoodreads([row({finishedOn:'2022-01-01',rating:2,review:'Old source opinion'})],[existing],[]);let n=0;
 const saved=prepareGoodreadsCommands(p,'batch','2026-02-01T00:00:00Z',()=>String(++n))[0].command.p_book;assert.equal(saved.unassignedRating,5);assert.equal(saved.unassignedReview,'Current Muse opinion');
 const {readOpinion,shelfMove}=load('lib/whimsy/reading-cycles');assert.equal(readOpinion(saved,saved.completions[0]).rating,undefined);assert.equal(shelfMove({...existing,...saved},'reading','2026-02-01').rating,5);
});
test('Currently Reading order ignores import timestamps and retains Muse status and active cycles',()=>{
 const {orderBooksByReadingActivity}=load('lib/books/reading-order'),{activeReadingBooks}=load('lib/whimsy/books');
 const a={...book,id:'active-a',title:'Genuine recent Muse activity',cycleId:'a:current',createdAt:'2020-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z',startedOn:'2026-01-01'},b={...book,id:'active-b',title:'Earlier Muse activity',cycleId:'b:current',startedOn:'2025-01-01'},unknown={...book,id:'old-unknown',title:'Existing undated book'};
 const sessions=[{bookId:a.id,date:'2026-06-01',pages:10,activeSegments:[]},{bookId:b.id,date:'2026-05-01',pages:2,activeSegments:[]}];
 const before=activeReadingBooks(orderBooksByReadingActivity([b,a,unknown],sessions));assert.deepEqual(before.map(b=>b.id),[a.id,b.id,unknown.id]);
 const imports=[{...book,id:'new-undated',createdAt:'2026-11-10T23:59:00Z',updatedAt:'2026-11-10T23:59:00Z'},{...book,id:'source-old',startedOn:'2022-01-01',createdAt:'2026-11-10T23:59:00Z',updatedAt:'2026-11-10T23:59:00Z'}];
 const after=activeReadingBooks(orderBooksByReadingActivity([b,{...a,updatedAt:'2026-11-10T23:59:00Z'},unknown,...imports],sessions));assert.deepEqual(after.map(b=>b.id),[a.id,b.id,'source-old',unknown.id,'new-undated']);assert.deepEqual(after.filter(item=>[a.id,b.id].includes(item.id)).map(item=>item.cycleId),['a:current','b:current']);
 const matched=planGoodreads([row({title:a.title,status:'finished',finishedOn:'2022-01-01'})],[a],[]);let n=0;const saved=prepareGoodreadsCommands(matched,'batch','2026-11-10T00:00:00Z',()=>String(++n))[0].command.p_book;assert.equal(saved.status,'reading');assert.equal(saved.cycleId,'a:current');
});
