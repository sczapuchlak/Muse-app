import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {load,root} from './helpers.mjs';

const {createSeriesResolver,orderCatalogMembers}=load('lib/books/series-discovery');
const {planSeriesCatalog,matchCatalogBook}=load('lib/books/series-catalog');
const {seriesShelf,seriesSummary,catalogSeriesView}=load('lib/books/series-view');
const {distinctEditions,enrichFields,enrichmentChanges,existingLibraryBook}=load('lib/books/add-book');
const {parseSeriesKey,catalogSeriesKey,bookHref,seriesHref}=load('lib/books/return-nav');
const read=path=>readFileSync(`${root}/${path}`,'utf8');
const data=value=>({ok:true,json:async()=>({data:value})});
const today='2026-11-10';
const book=(id,title,position,extra={})=>({position,featured:true,compilation:false,...extra,book:{id,title,release_date:'2015-05-05',release_year:2015,pages:400,canonical_id:null,image:{url:`https://assets.example.test/${id}.jpg`,color:'#9C2D3F'},contributions:[{author:{name:'Sarah J. Maas'}}],...extra.book}});
const series={id:22,name:'Throne of Glass',description:'An assassin, a tournament, a crown.',books_count:9,primary_books_count:2,is_completed:true,author:{name:'Sarah J. Maas'},book_series:[
 book(3,'Crown of Midnight',2),
 book(1,'The Assassin and the Pirate Lord',0.1,{book:{release_date:null,release_year:2012,image:null,pages:77}}),
 book(2,'Throne of Glass',1),
 book(9,"The Assassin's Blade",0.1,{compilation:true}),
 book(5,'Throne of Glass',1,{book:{canonical_id:2}}),
 book(6,'Kingdom of Ash (announced)',3,{book:{release_date:'2027-01-12',release_year:2027}}),
]};

test('Hardcover catalogs never send an empty date, keep collections apart, drop duplicate records, and carry artwork',async()=>{
 const resolver=createSeriesResolver({hardcoverKey:()=>'k',now:()=>Date.parse(`${today}T12:00:00Z`),fetcher:async(_url,init)=>{const q=JSON.parse(init.body).query;return data(q.includes('series_by_pk')?{series_by_pk:series}:{});}});
 const catalog=await resolver.resolve({title:'Throne of Glass',source:'hardcover',sourceId:'22'});
 assert.equal(catalog.completed,true);assert.equal(catalog.description,'An assassin, a tournament, a crown.');
 assert.ok(catalog.members.every(m=>m.releaseDate===undefined||/^\d{4}-\d{2}-\d{2}$/.test(m.releaseDate)),'a missing release date is absent, never ""');
 assert.deepEqual(catalog.members.map(m=>[m.positionLabel,m.title,m.role]),[['0.1','The Assassin and the Pirate Lord','mainline'],['1','Throne of Glass','mainline'],['2','Crown of Midnight','mainline'],['3','Kingdom of Ash (announced)','mainline'],['0.1',"The Assassin's Blade",'collection']],'reading order with the prequel first; the omnibus apart; the duplicate record dropped');
 const prequel=catalog.members[0];assert.equal(prequel.releaseYear,2012);assert.equal(prequel.coverUrl,undefined);assert.equal(prequel.pages,77);
 assert.equal(catalog.members[1].coverUrl,'https://assets.example.test/2.jpg');assert.equal(catalog.members[1].coverColor,'#9c2d3f');
 assert.equal(catalog.members[3].releaseState,'announced');
 const plans=planSeriesCatalog(catalog,[],[]);
 assert.ok(plans.every(p=>p.fields.catalog_release_date===null||/^\d{4}-\d{2}-\d{2}$/.test(p.fields.catalog_release_date)),'saved rows never carry an empty date');
 assert.equal(plans[1].fields.catalog_cover_url,'https://assets.example.test/2.jpg');assert.equal(plans[4].fields.role,'collection');
});

test('one book lookup returns gap-filling catalog facts and the series it belongs to',async()=>{
 const calls=[];const resolver=createSeriesResolver({hardcoverKey:()=>'k',fetcher:async(_url,init)=>{const {query}=JSON.parse(init.body);calls.push(query);
  if(query.includes('editions(where'))return data({editions:[{book_id:2}]});
  if(query.includes('books(where'))return data({books:[{id:2,title:'Throne of Glass',description:'<p>Meet Celaena.</p>',release_date:'2012-08-07',pages:404,canonical_id:null,image:{url:'https://assets.example.test/2.jpg'},cached_tags:{Genre:[{tag:'Fantasy'},{tag:'Young Adult'},{tag:'Unmapped thing'}]},contributions:[{author:{name:'Sarah J. Maas'}}],book_series:[{series_id:22,position:1,featured:true,compilation:false},{series_id:99,position:4,featured:false,compilation:true}]}]});
  return data({series_by_pk:series});}});
 const result=await resolver.lookupBook({title:'Throne of Glass',author:'Sarah J. Maas',isbn:'9781599906959'});
 assert.equal(result.book.id,'2');assert.equal(result.book.description,'Meet Celaena.');assert.equal(result.book.releaseDate,'2012-08-07');
 assert.ok(result.book.genres.includes('Fantasy')&&!result.book.genres.includes('Unmapped thing'),'only Muse genres');
 assert.equal(result.catalog.id,'22');assert.equal(result.position,1);
 assert.ok(calls.some(q=>q.includes('isbn_13')),'ISBN identifies the work before any title search');
});

test('saved books link by catalog id, owning an omnibus never claims an installment, and enrichment fills only gaps',()=>{
 const owned={id:'b1',title:'Throne of Glass (Anniversary)',author:'Sarah J. Maas',status:'reading',reviewEmojis:[],metadataSource:{provider:'google-books',importedAt:'x',hardcoverId:'2'}};
 assert.equal(matchCatalogBook({source:'hardcover',id:'2',title:'Throne of Glass',author:'Sarah J. Maas',position:1,positionLabel:'1'},[owned])?.id,'b1');
 const omnibus={source:'hardcover',id:'9',title:'Throne of Glass (Anniversary)',author:'Sarah J. Maas',position:0.1,positionLabel:'0.1',role:'collection'};
 assert.equal(planSeriesCatalog({source:'hardcover',id:'22',title:'T',members:[omnibus],complete:false},[],[owned])[0].fields.book_id,null);
 const mine={description:'My own words',publishedDate:'',totalPages:undefined,coverUrl:'',genre:''};
 assert.deepEqual(enrichFields(mine,{id:'2',description:'Catalog words',releaseDate:'2012-08-07',pages:404,coverUrl:'https://a.test/c.jpg',genres:['Fantasy']}),{publishedDate:'2012-08-07',totalPages:404,coverUrl:'https://a.test/c.jpg',genre:'Fantasy'},'a reader’s description is never replaced');
 assert.equal(enrichFields(mine,{id:'2',pages:404,genres:[]},{pages:false}).totalPages,undefined,'saved books never gain a page count after the fact');
 const changes=enrichmentChanges({...owned,metadataSource:{provider:'google-books',importedAt:'x'}},{book:{id:'2',genres:[]},catalog:null,position:null});
 assert.equal(changes.metadataSource.hardcoverId,'2');assert.equal(changes.metadataSource.provider,'google-books','the original source is kept');
 assert.equal(existingLibraryBook([owned],{title:'Anything',authors:[]},'2')?.id,'b1','a catalog match is a duplicate even under another title');
});

test('the edition question is asked only when editions differ in ways a reader notices',()=>{
 const base={key:'g:1',provider:'google-books',title:'T',authors:['A'],genres:[],isbn13:'9780000000001',publisher:'Bloomsbury',year:'2015',pageCount:419,language:'English'};
 const same={...base,key:'ol:2',isbn13:'9780000000002'},paperback={...base,key:'ol:3',isbn13:'9780000000003',pageCount:448,format:'physical',formatLabel:'Paperback'};
 assert.equal(distinctEditions(base,[same]).length,1,'a second record of the same edition is not a choice');
 assert.equal(distinctEditions(base,[same,paperback]).length,2);
});

test('the series shelf keeps reading order, ownership and an honest next book; the summary only states known facts',()=>{
 const catalog={source:'hardcover',id:'22',title:'Throne of Glass',author:'Sarah J. Maas',primaryCount:3,totalCount:6,completed:false,complete:false,members:orderCatalogMembers([
  {source:'hardcover',id:'1',title:'Prequel',author:'Sarah J. Maas',position:0.1,positionLabel:'0.1',role:'mainline',releaseYear:2012,releaseState:'released'},
  {source:'hardcover',id:'2',title:'Throne of Glass',author:'Sarah J. Maas',position:1,positionLabel:'1',role:'mainline',releaseYear:2012,releaseState:'released'},
  {source:'hardcover',id:'3',title:'Crown of Midnight',author:'Sarah J. Maas',position:2,positionLabel:'2',role:'mainline',releaseYear:2013,releaseState:'released'},
  {source:'hardcover',id:'4',title:'Book Three',author:'Sarah J. Maas',position:3,positionLabel:'3',role:'mainline',releaseDate:'2027-01-12',releaseState:'announced'},
  {source:'hardcover',id:'5',title:'Companion',author:'Sarah J. Maas',position:null,positionLabel:'',role:'mainline',releaseState:'released'},
  {source:'hardcover',id:'6',title:'Box Set',author:'Sarah J. Maas',position:1,positionLabel:'1',role:'collection',releaseState:'released'}])};
 const read={id:'b2',title:'Throne of Glass',author:'Sarah J. Maas',status:'finished',reviewEmojis:[],completions:[{id:'r',finishedOn:'2025-01-01',recordedAt:'x'}]};
 const view=catalogSeriesView(catalog,[read],'u');assert.ok(view.series.id.startsWith('catalog:'),'a catalog view is never a saved row');
 const shelf=seriesShelf(view.series,view.members,[read],today);
 assert.deepEqual(shelf.main.map(e=>e.positionLabel),['#0.1','#1','#2','#3']);assert.deepEqual(shelf.companions.map(e=>e.title),['Companion']);assert.deepEqual(shelf.collections.map(e=>e.title),['Box Set']);
 assert.equal(shelf.readCount,1);assert.equal(shelf.releasedCount,2,'progress counts released primary books only');assert.equal(shelf.next.title,'Crown of Midnight','the next primary book, not a prequel');
 assert.equal(shelf.upcomingCount,1);assert.equal(shelf.nextRelease.title,'Book Three');
 const summary=seriesSummary(view.series,shelf);
 assert.match(summary,/^Throne of Glass is a 6-book series with 3 primary works, first released in 2012, by Sarah J\. Maas\./);assert.match(summary,/1 book is still to come; the next is expected/);
 const sparse=seriesSummary({...view.series,catalog_total_count:null,catalog_primary_count:null,catalog_author:''},{...shelf,firstYear:null,authors:'',upcomingCount:0});
 assert.equal(sparse,'Throne of Glass is a series.','missing facts stay missing');
});

test('series and book routes are addressable, contextual, and never revive the standalone Books page',()=>{
 assert.deepEqual(parseSeriesKey(catalogSeriesKey('hardcover','22')),{source:'hardcover',id:'22'});assert.deepEqual(parseSeriesKey('5b0c…'),{savedId:'5b0c…'});
 assert.equal(bookHref('b 1'),'/collections/books/b%201');assert.equal(seriesHref('hardcover-22','search'),'/collections/series/hardcover-22?from=search');
 const route=read('components/collections/SeriesRoute.tsx');
 assert.match(route,/catalogSeriesView\(catalog,books,userId\)/,'a catalog series renders without saving');
 assert.doesNotMatch(route.split('async function savedMember')[0],/saveDiscoveredSeries\(client,userId,found,records,books\)\s*;/,'opening a series never saves it');
 const page=read('components/whimsy/BookPage.tsx');
 assert.match(page,/className="muse-book-page-series-chip"/,'the series sits in the book header');assert.match(page,/muse-book-series-strip/,'an ordered series preview on the book itself');
 assert.doesNotMatch(page,/\['series','Series'\]/,'no Series tab hides the relationship');assert.doesNotMatch(page,/<details className="muse-books-about">/,'the synopsis is visible, not collapsed');
 const shelf=read('components/whimsy/Bookshelf.tsx');assert.doesNotMatch(shelf,/WhimsyExperienceHeader|aria-label="Bookshelf views"/,'no standalone Books header or tabs');
 assert.match(read('components/collections/Collections.tsx'),/<Bookshelf surface="desk" embedded\/>/,'Reading Desk lives in Collections › Books');
 assert.match(read('app/(app)/collections/reading-atlas/page.tsx'),/ReadingAtlasRoute/);
});

test('a real catalog normalizes to one work per position: translations, split volumes and bundles fold away (#136 Staging QA)',()=>{
 const {normalizeSeriesEntries,bundleTitle}=load('lib/books/series-discovery');
 const e=(id,title,position,readers,{featured=true,role}={})=>({member:{source:'hardcover',id:String(id),title,author:'Sarah J. Maas',position,positionLabel:position===null?'':String(position),role:role??(bundleTitle(title)?'collection':featured?'mainline':'optional')},readers,featured});
 const rows=[e(1,'The Assassin and the Pirate Lord',0.1,4000),e(2,'The Assassin and the Healer',0.2,3800),e(10,'Throne of Glass',1,90000),e(30,'アサシンの王女 上',1,14),e(38,'The Captain and the Prince',1.1,900),e(39,'The Assassin and the Princess',1.5,700),
  e(11,'Crown of Midnight',2,70000),e(31,'تاج نیمه شب',2,6),e(12,'Heir of Fire',3,60000),e(13,'Queen of Shadows',4,55000),e(14,'Empire of Storms',5,50000),e(32,'Império de Tempestades - Tomo 1',5,9),e(33,'Empire of Storms - Viharok birodalma',5,4),e(34,'Throne of Glass Series: 5-6',5,30),
  e(15,'Tower of Dawn',6,45000),e(16,'Kingdom of Ash',7,48000),e(35,'Tuhkan valtiatar - osa 1',7,5,{featured:false}),e(36,'Tuhkan valtiatar - osa 2',7,4,{featured:false}),e(37,'The Complete Throne of Glass Collection Full Series',null,40),e(40,'Unlisted translation',null,2),e(41,'Throne of Glass Coloring Book',null,2500)];
 const out=normalizeSeriesEntries(rows);
 const works=out.filter(m=>m.role!=='collection');
 assert.deepEqual(works.filter(m=>m.position!==null).map(m=>m.title),['The Assassin and the Pirate Lord','The Assassin and the Healer','Throne of Glass','The Captain and the Prince','The Assassin and the Princess','Crown of Midnight','Heir of Fire','Queen of Shadows','Empire of Storms','Tower of Dawn','Kingdom of Ash']);
 assert.deepEqual(works.filter(m=>m.position===null).map(m=>m.title),['Throne of Glass Coloring Book'],'a real companion stays; an unread stray record does not');
 assert.deepEqual(out.filter(m=>m.role==='collection').map(m=>m.title).sort(),['The Complete Throne of Glass Collection Full Series','Throne of Glass Series: 5-6']);
 assert.equal(works.filter(m=>Number.isInteger(m.position)).length,7,'seven primary novels, from data rather than a hardcoded count');
 const japaneseOnly=normalizeSeriesEntries([e(1,'Book',1,500),e(2,'外伝',1.5,40)]);assert.equal(japaneseOnly.length,2,'a distinct work keeps its own position whatever its language');
 for(const t of ['A Court of Thorns and Roses Box Set','Books 1-3','The Complete Collection'])assert.ok(bundleTitle(t),t);
 for(const t of ['Throne of Glass','Crown of Midnight','A Court of Silver Flames','The Assassin and the Healer'])assert.ok(!bundleTitle(t),t);
});
