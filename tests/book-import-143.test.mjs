import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';
const {readGoodreadsRow}=load('lib/books/import-goodreads'),{queryIsbn}=load('lib/books/metadata'),{planGoodreads,sameImportedValues}=load('lib/books/import-plan'),{prepareGoodreadsCommands}=load('lib/books/import-execute'),{importReviewIssues,unresolvedImportIssues,selectImportEdition}=load('lib/books/import-review'),{matchImportedBook}=load('lib/books/import-matching'),{verifiedImportCandidates}=load('lib/books/import-metadata'),{shelfMove}=load('lib/whimsy/reading-cycles'),{bookCompletions}=load('lib/whimsy/reading-stats');
const book={id:'saved',userId:'owner',revision:3,createdAt:'2020-01-01',updatedAt:'2026-01-01',title:'A Real Book',author:'A Writer',status:'reading',cycleId:'kept-cycle',currentPage:42,rating:5,finalThoughts:'Muse review',reviewEmojis:[]};
const headers=['Book Id','Title','Author','Exclusive Shelf','ISBN','ISBN13','Date Read','My Rating'];
const row=(shelf='read',isbn='=""',isbn13='=""')=>readGoodreadsRow(headers,['99','A Real Book','A Writer',shelf,isbn,isbn13,'2020/01/02','4']);
let sequence=0;const commands=plan=>prepareGoodreadsCommands(plan,'batch','2026-11-11T00:00:00Z',()=>`id-${sequence++}`);
test('Goodreads empty ISBN formulas are missing values, never verification failures',()=>{
 assert.equal(row().isbn,undefined);assert.deepEqual(row().warnings,[]);
 for(const value of ['="0306406152"',"'0306406152",'ISBN-10: 0–306–40615–2','"0306406152"','０３０６４０６１５２','0306406152\u200b'])assert.equal(queryIsbn(value),'9780306406157',value);
 for(const value of ['9780306406158','9.780306406E+12','=SUM(1,2)','9780306406157junk'])assert.equal(queryIsbn(value),undefined);
 assert.equal(row('read','="0306406152"','="9780306406158"').isbn,'9780306406157');
});
test('DNF is native, distinct from paused, and a source finish date never invents a completion',()=>{
 for(const value of ['dnf','did-not-finish']){const parsed=row(value);assert.equal(parsed.status,'dnf');assert.equal(parsed.sourceDetails['exclusive shelf'],value);const c=commands(planGoodreads([parsed],[],[]))[0];assert.equal(c.command.p_book.status,'dnf');assert.equal(c.command.p_book.finishedOn,undefined);assert.equal(c.command.p_book.completions,undefined);assert.equal(c.historyAdded,0);}
 const {shelfState}=load('lib/books/series-view');assert.equal(shelfState({...book,status:'dnf'},'released'),'dnf');assert.equal(shelfState({...book,status:'dnf',completions:[{id:'prior',finishedOn:'2020-01-01',recordedAt:'2020-01-01T00:00:00Z'}]},'released'),'read');
 const stopped={...book,...shelfMove(book,'dnf','2026-11-11')};assert.equal(stopped.cycleId,'kept-cycle');assert.equal(stopped.currentPage,42);assert.deepEqual(bookCompletions(stopped),[]);
 const restarted={...stopped,...shelfMove(stopped,'reading','2026-11-12')};assert.equal(restarted.cycleId,'kept-cycle');assert.equal(restarted.rating,5);assert.deepEqual(bookCompletions(restarted),[]);
});
test('684-book representative Goodreads import has no required actions for harmless missing ISBNs',()=>{
 const isbnFor=i=>{const core='978'+String(100000000+i),sum=[...core].reduce((n,c,j)=>n+Number(c)*(j%2?3:1),0);return core+((10-sum%10)%10);};
 const rows=Array.from({length:684},(_,i)=>({...row(i<2?'dnf':'to-read',i<124?'=""':'="0306406152"'),title:`Source Book ${i}`,sourceId:String(i),isbn:i<124?undefined:isbnFor(i),finishedOn:undefined}));
 const plan=planGoodreads(rows,[],[]);for(const p of plan)p.seriesNote='Series not identified; this may be a standalone book.';
 assert.equal(plan.length,684);assert.equal(plan.filter(p=>unresolvedImportIssues(p).length).length,0);assert.equal(commands(plan).length,684);
 const saved=plan.map((p,i)=>({...book,id:`book-${i}`,title:p.row.title,status:p.row.status})),ids=rows.map((r,i)=>({source:'goodreads',sourceId:r.sourceId,bookId:`book-${i}`}));
 const refreshed=planGoodreads(rows,saved,ids);assert.ok(refreshed.every(p=>p.kind==='matched'));assert.ok(commands(refreshed).every(c=>!c.historyAdded));
});
test('required decisions and informational defaults are independently actionable',()=>{
 const p=planGoodreads([{...row('unknown'),finishedOn:undefined}],[book],[])[0];assert.equal(unresolvedImportIssues(p).length,1);assert.ok(importReviewIssues(p).some(i=>!i.required));
 assert.equal(unresolvedImportIssues({...p,resolvedIssues:['status']}).length,0);assert.equal(unresolvedImportIssues({...p,skip:true}).length,0);
 const ambiguous={...p,kind:'review',reason:'Multiple matches',resolvedIssues:['status']};assert.equal(unresolvedImportIssues(ambiguous)[0].type,'identity');
});
test('edition selection keeps immutable source evidence, matches decorated Goodreads titles, and preserves Muse data',()=>{
 const original={...row('to-read'),finishedOn:undefined};const initial=planGoodreads([original],[],[])[0];const candidate={key:'g1',provider:'google-books',title:'Selected title',authors:['A Writer'],isbn13:'9780306406157',pageCount:300,genres:[],volumeId:'v1'};
 const selected=selectImportEdition(initial,candidate),c=commands([selected])[0];assert.equal(c.command.p_book.title,'Selected title');assert.ok(sameImportedValues(c.command.p_observed,original));assert.equal(c.command.p_book.isbn,'9780306406157');
 const matched=selectImportEdition(planGoodreads([original],[book],[])[0],candidate),kept=commands([matched])[0];assert.equal(kept.command.p_book.title,book.title);assert.equal(kept.command.p_book.rating,5);assert.equal(kept.command.p_book.currentPage,42);
 assert.equal(matchImportedBook({source:'goodreads',title:'A Real Book (The Series, #1.5)',author:'A Writer'},[book],[]).kind,'match');
 const differentEdition=selectImportEdition({...initial,book:{...book,isbn:'9781619634480',totalPages:undefined}},candidate);assert.equal(differentEdition.metadata.totalPages,undefined);assert.equal(differentEdition.metadata.metadataSource,undefined);
 assert.equal(verifiedImportCandidates([candidate],'Selected title','A Writer','9781619634480').length,0);
 assert.equal(verifiedImportCandidates([candidate],'Selected title (A Series, #1)','A Writer').length,1);
});
