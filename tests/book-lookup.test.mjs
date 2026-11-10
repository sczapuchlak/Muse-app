import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const m=load('lib/books/metadata');
const {createBookLookup}=load('lib/books/lookup');
const read=file=>readFileSync(resolve(root,file),'utf8');

const googleVolume={id:'vol1',volumeInfo:{title:'Half City',authors:['Kate Golden'],publisher:'Berkley',publishedDate:'2025-08-12',description:'<p>Demon hunting <b>is</b> hell.</p><script>alert(1)</script>&amp; more',pageCount:461,categories:['Fiction / Fantasy / Romantic','Fiction / General'],language:'en',industryIdentifiers:[{type:'ISBN_10',identifier:'059395341X'}],imageLinks:{thumbnail:'http://books.google.com/books/content?id=vol1&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api'}}};
const olDoc={key:'/works/OL17823218W',title:'A Court of Wings and Ruin',author_name:['Sarah J. Maas'],first_publish_year:2017,cover_i:8506724,edition_count:26,number_of_pages_median:699,subject:['Fantasy fiction','Romance'],editions:{docs:[{key:'/books/OL26M',title:'A Court of Wings and Ruin',isbn:['9781619634480'],publish_date:['May 02, 2017'],publishers:['Bloomsbury'],cover_i:-1}]}};
const olEdition=(key,extra={})=>({key,title:'A Court of Wings and Ruin',works:[{key:'/works/OL17823218W'}],...extra});

test('ISBNs are validated, converted and detected in search queries',()=>{
 assert.equal(m.validIsbn13('978-1-61963-448-0'),true);assert.equal(m.validIsbn13('9781619634481'),false);
 assert.equal(m.validIsbn10('059395341X'),true);assert.equal(m.isbn10To13('059395341X'),'9780593953419');
 assert.equal(m.queryIsbn(' 978 1619634480 '),'9781619634480');assert.equal(m.queryIsbn('Half City'),undefined);
 assert.equal(m.plausibleIsbn(''),true);assert.equal(m.plausibleIsbn('978-1-61963-448-0'),true);assert.equal(m.plausibleIsbn('12345'),false);
});

test('external text and image URLs are made safe',()=>{
 const text=m.plainText('<p>One</p><p>Two &amp; <i>three</i></p><img src=x onerror=alert(1)>&#x1F4D6;&#0;');
 assert.equal(text,'One\nTwo & three\n📖');assert.ok(!/[<>]/.test(text));
 assert.equal(m.safeCoverUrl('http://books.google.com/books/content?id=a&edge=curl&zoom=1'),'https://books.google.com/books/content?id=a&zoom=1');
 for(const bad of ['javascript:alert(1)','data:image/png;base64,AAAA','ftp://x/y.jpg',42,undefined])assert.equal(m.safeCoverUrl(bad),undefined,String(bad));
 assert.equal(m.openLibraryCover(-1,'L'),undefined);assert.equal(m.openLibraryCover(8506724,'L'),'https://covers.openlibrary.org/b/id/8506724-L.jpg');
});

test('Google Books volumes map to edition-specific metadata without guessing',()=>{
 const c=m.fromGoogleVolume(googleVolume);
 assert.equal(c.title,'Half City');assert.deepEqual(c.authors,['Kate Golden']);assert.equal(c.pageCount,461);assert.equal(c.isbn13,'9780593953419');
 assert.equal(c.coverUrl,'https://books.google.com/books/content?id=vol1&printsec=frontcover&img=1&zoom=1&source=gbs_api');
 assert.equal(c.description,'Demon hunting is hell.\nalert(1)& more');assert.deepEqual(c.genres,['Romantasy','Fantasy'],'Fiction / Fantasy / Romantic is romantasy; Fiction / General maps to nothing');
 assert.equal(c.publishedDate,'2025-08-12');assert.equal(c.year,'2025');assert.equal(c.language,'English');assert.equal(c.format,undefined,'Google does not state binding');
 assert.equal(m.fromGoogleVolume({id:'x',volumeInfo:{title:'T',pageCount:-4}}).pageCount,undefined);
 assert.equal(m.fromGoogleVolume({volumeInfo:{}}),undefined);
});

test('Open Library results never use work medians as page counts and drop placeholder covers',()=>{
 const c=m.fromOpenLibraryDoc(olDoc);
 assert.equal(c.pageCount,undefined);assert.equal(c.isbn13,'9781619634480');assert.equal(c.publishedDate,'2017-05-02');assert.equal(c.publisher,'Bloomsbury');
 assert.equal(c.coverUrl,'https://covers.openlibrary.org/b/id/8506724-L.jpg','work cover used when the edition has none');
 assert.equal(c.editionKey,'/books/OL26M');assert.equal(c.editionCount,26);
 const e=m.fromOpenLibraryEdition(olEdition('/books/OL1M',{physical_format:'paperback',number_of_pages:720,isbn_13:['9781619634480'],covers:[-1,13315544],languages:[{key:'/languages/eng'}],publish_date:'2017'}),{authors:['Sarah J. Maas']});
 assert.deepEqual([e.format,e.formatLabel,e.pageCount,e.language,e.coverUrl],['physical','Paperback',720,'English','https://covers.openlibrary.org/b/id/13315544-L.jpg']);
});

test('formats map only when clearly stated',()=>{
 assert.deepEqual(m.mapFormat('Hardcover'),{format:'physical',formatLabel:'Hardcover'});
 assert.deepEqual(m.mapFormat('Kindle Edition'),{format:'ebook',formatLabel:'Kindle Edition'});
 assert.deepEqual(m.mapFormat('audio cd'),{format:'audiobook',formatLabel:'Audio cd'});
 assert.deepEqual(m.mapFormat('Тверда'),{formatLabel:'Тверда'});assert.deepEqual(m.mapFormat(undefined),{});
});

test('results are deduplicated by ISBN and by title plus author, primary source first',()=>{
 const a={key:'g1',provider:'google-books',title:'Half City',authors:['Kate Golden'],isbn13:'9780593953419',genres:[]};
 const b={...a,key:'g2',isbn13:'9780593953420'},c={...a,key:'o1',provider:'open-library'},d={key:'o2',provider:'open-library',title:'Other',authors:['X'],isbn13:'9780593953419',genres:[]},e={key:'o3',provider:'open-library',title:'New',authors:['Y'],genres:[]};
 assert.deepEqual(m.mergeCandidates([[a,b],[c,d,e]]).map(x=>x.key),['g1','o3']);
 assert.equal(m.mergeCandidates([[a,e]],1).length,1);
 const editions=m.sortEditions([{key:'1',title:'t',authors:[],genres:[],language:'French',coverUrl:'c'},{key:'2',title:'t',authors:[],genres:[],language:'English'},{key:'3',title:'t',authors:[],genres:[],language:'English',coverUrl:'c',isbn13:'i'}]);
 assert.deepEqual(editions.map(x=>x.key),['3','2','1']);
});

const blank={title:'',author:'',genre:'',coverUrl:'',format:'physical',totalPages:'',isbn:'',publisher:'',publishedDate:'',description:''};
test('imports fill blank fields, keep reader edits, and follow the chosen edition',()=>{
 const book=m.fromGoogleVolume(googleVolume);
 const first=m.applyImport({...blank,author:'K. Golden (my note)'},blank,{},m.candidateFields(book));
 assert.equal(first.form.title,'Half City');assert.equal(first.form.author,'K. Golden (my note)','typed author is kept');assert.equal(first.imported.author,undefined);
 assert.equal(first.form.totalPages,'461');assert.equal(first.form.coverUrl,book.coverUrl);
 const edited={...first.form,publisher:'My shelf copy'};
 const edition={key:'open-library:/books/OL9M',provider:'open-library',title:'Half City',authors:[],genres:[],editionKey:'/books/OL9M',isbn13:'9781399719308',coverUrl:'https://covers.openlibrary.org/b/id/9-L.jpg',format:'physical',formatLabel:'Paperback',publisher:'Hodder'};
 const second=m.applyImport(edited,blank,first.imported,m.candidateFields(m.withEdition(book,edition)));
 assert.equal(second.form.publisher,'My shelf copy','reader edit survives an edition change');
 assert.equal(second.form.totalPages,'','different edition without a page count does not keep the old edition pages');
 assert.deepEqual([second.form.isbn,second.form.coverUrl,second.form.format],['9781399719308',edition.coverUrl,'physical']);
 assert.equal(second.form.description,first.form.description,'book-level description stays');
 const cleared=m.applyImport(second.form,blank,second.imported,{});
 assert.deepEqual([cleared.form.title,cleared.form.coverUrl,cleared.form.publisher],['','','My shelf copy']);
});

test('the same edition may fill gaps; another edition never inherits edition details',()=>{
 const book={key:'g',provider:'google-books',title:'T',authors:['A'],genres:[],isbn13:'9781619634480',pageCount:699,volumeId:'v',coverUrl:'https://g/c'};
 const same=m.withEdition(book,{key:'o',provider:'open-library',title:'T',authors:[],genres:[],isbn13:'9781619634480',format:'physical',formatLabel:'Hardcover'});
 assert.deepEqual([same.pageCount,same.format,same.coverUrl,same.provider],[699,'physical','https://g/c','google-books']);
 const other=m.withEdition(book,{key:'o2',provider:'open-library',title:'T',authors:[],genres:[],isbn13:'9781526617163',editionKey:'/books/OL2M'});
 assert.deepEqual([other.pageCount,other.isbn13,other.volumeId,other.provider],[undefined,'9781526617163',undefined,'open-library']);
});

function fakeFetch(routes){
 const calls=[];
 const fetcher=async(url,init)=>{calls.push(url);for(const [pattern,reply] of routes)if(pattern.test(url))return typeof reply==='function'?reply(url,init):reply;throw Error('offline');};
 return {fetcher,calls};
}
const ok=json=>({ok:true,status:200,json:async()=>json});
test('Google Books leads, Open Library fills in, and the key stays server-side',async()=>{
 const {fetcher,calls}=fakeFetch([[/googleapis/,ok({items:[googleVolume]})],[/openlibrary\.org\/search/,ok({docs:[olDoc]})]]);
 const lookup=createBookLookup({fetcher,googleKey:()=>'secret-key'});
 const result=await lookup.search('court');
 assert.deepEqual(result.results.map(r=>r.provider),['google-books','open-library']);assert.deepEqual(result.attribution,['Google Books','Open Library']);
 assert.ok(calls.some(u=>u.includes('key=secret-key')&&u.startsWith('https://www.googleapis.com/')));assert.ok(!JSON.stringify(result).includes('secret-key'));
 await lookup.search('court');assert.equal(calls.length,2,'second identical search is cached');
 const isbn=await lookup.search('978-1-61963-448-0');assert.ok(calls.some(u=>u.includes('q=isbn%3A9781619634480')));assert.ok(calls.some(u=>u.includes('isbn=9781619634480')));assert.ok(isbn.results.length>0);
});

test('Open Library takes over when Google is unconfigured, rate-limited, down, or slow',async()=>{
 const none=fakeFetch([[/openlibrary/,ok({docs:[olDoc]})]]);
 const r1=await createBookLookup({fetcher:none.fetcher,googleKey:()=>undefined}).search('court');
 assert.equal(r1.providers['google-books'],'not-configured');assert.ok(!none.calls.some(u=>u.includes('googleapis')));assert.equal(r1.results[0].provider,'open-library');
 const limited=fakeFetch([[/googleapis/,{ok:false,status:429,json:async()=>({})}],[/openlibrary/,ok({docs:[olDoc]})]]);
 const r2=await createBookLookup({fetcher:limited.fetcher,googleKey:()=>'k'}).search('court');assert.equal(r2.providers['google-books'],'unavailable');assert.equal(r2.results.length,1);
 const slow=fakeFetch([[/googleapis/,(url,init)=>new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(Error('aborted'))))],[/openlibrary/,ok({docs:[olDoc]})]]);
 const r3=await createBookLookup({fetcher:slow.fetcher,googleKey:()=>'k',timeoutMs:20}).search('court');assert.equal(r3.providers['google-books'],'unavailable');assert.equal(r3.results.length,1);
 const down=fakeFetch([]);const r4=await createBookLookup({fetcher:down.fetcher,googleKey:()=>'k'}).search('court');
 assert.deepEqual([r4.results.length,r4.providers['google-books'],r4.providers['open-library']],[0,'unavailable','unavailable']);
});

test('editions resolve through an ISBN to the Open Library work, sorted for the reader',async()=>{
 const {fetcher,calls}=fakeFetch([[/\/isbn\/9781619634480\.json/,ok({works:[{key:'/works/OL17823218W'}]})],[/\/works\/OL17823218W\/editions\.json/,ok({entries:[olEdition('/books/OL2M',{languages:[{key:'/languages/fre'}],covers:[2]}),olEdition('/books/OL1M',{languages:[{key:'/languages/eng'}],covers:[1],isbn_13:['9781619634480'],number_of_pages:720})]})]]);
 const lookup=createBookLookup({fetcher,googleKey:()=>undefined});
 const result=await lookup.editions({isbn:'9781619634480',title:'A Court of Wings and Ruin',authors:['Sarah J. Maas']});
 assert.equal(result.status,'ok');assert.deepEqual(result.editions.map(e=>e.editionKey),['/books/OL1M','/books/OL2M']);assert.deepEqual(result.editions[0].authors,['Sarah J. Maas']);
 assert.deepEqual(await lookup.editions({workKey:'../../etc'}),{editions:[],status:'empty'});assert.equal(calls.filter(u=>u.includes('etc')).length,0);
});

test('Open Library work descriptions fill a missing description as plain text',async()=>{
 const {fetcher}=fakeFetch([[/\/works\/OL17823218W\/editions\.json/,ok({entries:[olEdition('/books/OL1M',{covers:[1]})]})],[/\/works\/OL17823218W\.json/,ok({description:{type:'/type/text',value:'Feyre has returned to the Spring Court <b>determined</b>.'}})]]);
 const result=await createBookLookup({fetcher,googleKey:()=>undefined}).editions({workKey:'/works/OL17823218W'});
 assert.equal(result.description,'Feyre has returned to the Spring Court determined.');
 const none=fakeFetch([[/editions\.json/,ok({entries:[olEdition('/books/OL1M')]})]]);
 const missing=await createBookLookup({fetcher:none.fetcher,googleKey:()=>undefined}).editions({workKey:'/works/OL17823218W'});
 assert.equal(missing.status,'ok');assert.equal('description' in missing,false,'a missing work record never blocks editions');
 assert.match(read('components/whimsy/BookSearch.tsx'),/!book\.description&&typeof data\.description==='string'/,'only fills a missing description');
 assert.match(read('components/whimsy/Bookshelf.css'),/\.muse-books-fields\{align-items:flex-start\}/,'field rows share a top edge');
});

test('lookup routes are authenticated, bounded and rate-limited; client code never sees the key',()=>{
 const {allowLookup}=load('lib/books/rate-limit');
 for(let i=0;i<60;i++)assert.equal(allowLookup('reader-a',1000+i),true);
 assert.equal(allowLookup('reader-a',1100),false);assert.equal(allowLookup('reader-b',1100),true);assert.equal(allowLookup('reader-a',62000),true);
 const guard=read('lib/books/route-guard.ts');assert.match(guard,/trustedOrigin\(request\)/);assert.match(guard,/auth\.getUser\(\)/);
 const clientFiles=['components','app'].flatMap(dir=>readdirSync(resolve(root,dir),{recursive:true}).filter(f=>/\.tsx?$/.test(f)).map(f=>resolve(root,dir,f))).filter(f=>!f.includes('/app/api/'));
 for(const file of clientFiles){const source=readFileSync(file,'utf8');assert.ok(!/lib\/books\/(lookup|service)|GOOGLE_BOOKS_API_KEY/.test(source),file);}
 assert.ok(!/NEXT_PUBLIC_GOOGLE/.test(read('lib/books/lookup.ts')));
 assert.match(read('components/whimsy/BookSearch.tsx'),/post<[^>]*>\('\/api\/books\/search'/);
});

test('every book write keeps lookup metadata, and older books stay valid',()=>{
 const {bookMetadataFields}=load('lib/whimsy/books');
 assert.deepEqual(bookMetadataFields({}),{});
 const meta={isbn:'9781619634480',publisher:'Bloomsbury',publishedDate:'2017-05-02',description:'Text',metadataSource:{provider:'open-library',workKey:'/works/OL1W',importedAt:'2026-11-04T00:00:00.000Z'}};
 assert.deepEqual(bookMetadataFields({...meta,title:'ignored'}),meta);
 const shelf=read('components/whimsy/Bookshelf.tsx');
 assert.match(shelf,/finalThoughts:book\.finalThoughts,\.\.\.bookCarryFields\(book\),\.\.\.changes\};\}/,'every shelf write starts from the complete record');
 assert.match(shelf,/const record=bookRecord\(base,shelfMove\(base,next/,'status moves use the complete record');
 assert.match(read('lib/whimsy/books.ts'),/return \{\.\.\.bookMetadataFields\(book\),\.\.\.\(book\.completions\?\.length/,'carry fields include lookup metadata');
 assert.match(shelf,/\.\.\.bookMetadataFields\(\{isbn:bookForm\.isbn/,'editor saves metadata');
 assert.match(shelf,/!books\.some\(b=>b\.id===bookForm\.id\)&&<><BookSearch/,'search only when adding a new book');
 assert.match(read('components/whimsy/BookPage.tsx'),/<p key=\{index\}>\{paragraph\}<\/p>/,'description renders as text');assert.ok(!/dangerouslySetInnerHTML/.test(shelf+read('components/whimsy/BookSearch.tsx')+read('components/whimsy/BookPage.tsx')+read('components/collections/SeriesRoute.tsx')));
});
