import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load,root} from './helpers.mjs';
const {PAGE_SIZES,DEFAULT_PAGE_SIZE,parsePage,parsePageSize,pageCount,clampPage,pageWindow,pageItems,pageAfterResize,pageButtons}=load('lib/collections/pagination');
const {browseLibrary}=load('lib/collections/library-browse');
const {PaginationControls}=load('components/collections/PaginationControls');

const book=(i,extra={})=>{const status=['reading','planned','finished','paused'][i%4];return {id:`b${String(i).padStart(4,'0')}`,kind:'book',title:`Book ${i}`,creator:`Author ${i%37}`,coverUrl:null,status,genre:i%2?'Fantasy, Romance':'Mystery',rating:i%5||null,favorite:false,createdAt:`2026-01-${String(1+i%28).padStart(2,'0')}T00:00:00Z`,updatedAt:new Date(Date.UTC(2026,0,1)+i*60000).toISOString(),book:{finishedOn:status==='finished'?`2026-02-${String(1+i%28).padStart(2,'0')}`:undefined},...extra};};
const library=Array.from({length:1200},(_,i)=>book(i));
const filters={kind:'all',status:'',genre:'',rating:'',tag:'',seriesIds:null,favoriteOnly:false,addedAfter:'',completedAfter:'',search:''};

test('page sizes are 12, 24, 48 and 96 with 24 as the default',()=>{
 assert.deepEqual([...PAGE_SIZES],[12,24,48,96]);assert.equal(DEFAULT_PAGE_SIZE,24);
 assert.equal(parsePageSize('48'),48);assert.equal(parsePageSize('50'),24);assert.equal(parsePageSize(null),24);assert.equal(parsePageSize('abc',12),12);
});
test('page numbers from a URL are safe',()=>{
 assert.equal(parsePage('3'),3);for(const bad of [null,'','0','-2','1.5','abc'])assert.equal(parsePage(bad),1);
});
test('the window reports total, range and page and never leaves the last page',()=>{
 assert.deepEqual(pageWindow(684,1,24),{page:1,pages:29,size:24,total:684,start:0,end:24,from:1,to:24});
 const last=pageWindow(684,29,24);assert.equal(last.from,673);assert.equal(last.to,684);
 assert.equal(pageWindow(684,99,24).page,29);assert.equal(pageWindow(684,0,24).page,1);
 assert.deepEqual(pageWindow(0,5,24),{page:1,pages:1,size:24,total:0,start:0,end:0,from:0,to:0});
 assert.equal(pageCount(24,24),1);assert.equal(pageCount(25,24),2);assert.equal(clampPage(7,30,24),2);
});
test('only the current page is sliced out of the whole result',()=>{
 for(const size of PAGE_SIZES){const w=pageWindow(library.length,3,size),rows=pageItems(library,w);assert.equal(rows.length,size);assert.equal(rows[0],library[2*size]);}
 const tail=pageItems(library,pageWindow(1200,13,96));assert.equal(tail.length,1200-12*96);
});
test('changing page size keeps the first visible card on screen',()=>{
 assert.equal(pageAfterResize(3,24,48),2);assert.equal(pageAfterResize(1,24,96),1);assert.equal(pageAfterResize(5,12,24),3);assert.equal(pageAfterResize(2,96,12),9);
});
test('page buttons collapse long runs with gaps and always include first, last and neighbours',()=>{
 assert.deepEqual(pageButtons(1,1),[1]);assert.deepEqual(pageButtons(2,4),[1,2,3,4]);
 assert.deepEqual(pageButtons(1,29),[1,2,null,29]);assert.deepEqual(pageButtons(15,29),[1,null,14,15,16,null,29]);assert.deepEqual(pageButtons(29,29),[1,null,28,29]);assert.deepEqual(pageButtons(3,29),[1,2,3,4,null,29]);
});

test('search, status, genre, rating and sort run over all 1,200 books, not the visible page',()=>{
 assert.equal(browseLibrary(library,filters,'recent',new Map()).length,1200);
 const hit=browseLibrary(library,{...filters,search:'book 1199'},'recent',new Map());assert.deepEqual(hit.map(i=>i.id),['b1199']);
 assert.equal(browseLibrary(library,{...filters,status:'reading'},'recent',new Map()).length,300);
 assert.equal(browseLibrary(library,{...filters,genre:'Romance'},'recent',new Map()).length,600);
 assert.equal(browseLibrary(library,{...filters,rating:'3'},'recent',new Map()).length,240);
 const byTitle=browseLibrary(library,filters,'title',new Map());assert.equal(byTitle[0].title,'Book 0');assert.equal(byTitle.at(-1).title,'Book 999');
 assert.equal(browseLibrary(library,filters,'recent',new Map())[0].id,'b1199');
});
test('series membership is searchable and the Series filter narrows the entire Library',()=>{
 const names=new Map([['b0007',['Court of Thorns']],['b0900',['Court of Thorns']]]);
 assert.deepEqual(browseLibrary(library,{...filters,search:'court of thorns'},'title',names).map(i=>i.id).sort(),['b0007','b0900']);
 assert.equal(browseLibrary(library,{...filters,seriesIds:new Set(['b0900'])},'title',names).length,1);
});
test('the sort order is total, so pages never repeat or skip a book',()=>{
 const same=library.map(item=>({...item,updatedAt:'2026-01-01T00:00:00Z',rating:3,createdAt:'2026-01-01T00:00:00Z'}));
 for(const sort of ['recent','oldest','rating','completed','title','author']){
  const sorted=browseLibrary(same,filters,sort,new Map()),seen=new Set();
  for(let page=1;page<=pageCount(sorted.length,48);page++)for(const row of pageItems(sorted,pageWindow(sorted.length,page,48))){assert.ok(!seen.has(row.id),`${sort} repeated ${row.id}`);seen.add(row.id);}
  assert.equal(seen.size,1200);
  assert.deepEqual(sorted.map(i=>i.id),browseLibrary([...same].reverse(),filters,sort,new Map()).map(i=>i.id),`${sort} must not depend on input order`);
 }
});
test('filtering and sorting 1,200 books stays fast',()=>{
 const start=performance.now();for(let i=0;i<20;i++)browseLibrary(library,{...filters,search:`author ${i}`},i%2?'title':'recent',new Map());
 assert.ok(performance.now()-start<1500,`20 passes took ${performance.now()-start}ms`);
});

test('controls show the range, total and page, and render at the top and bottom',()=>{
 const w=pageWindow(684,2,24),noop=()=>{};
 const top=renderToStaticMarkup(h(PaginationControls,{window:w,noun:'books',position:'top',label:'Library',onPage:noop,onSize:noop}));
 assert.match(top,/25–48/);assert.match(top,/of 684 books/);assert.match(top,/Page 2 of 29/);assert.match(top,/role="status"/);assert.match(top,/aria-current="page"/);
 const bottom=renderToStaticMarkup(h(PaginationControls,{window:w,noun:'books',position:'bottom',label:'Library',onPage:noop,onSize:noop}));
 assert.doesNotMatch(bottom,/role="status"/);assert.match(bottom,/Library pages, bottom/);
 const first=renderToStaticMarkup(h(PaginationControls,{window:pageWindow(684,1,24),noun:'books',position:'top',label:'Library',onPage:noop,onSize:noop}));assert.match(first,/aria-label="Previous page" title="Previous page" disabled/);
 assert.equal(renderToStaticMarkup(h(PaginationControls,{window:pageWindow(0,1,24),noun:'books',position:'top',label:'Library',onPage:noop,onSize:noop})),'');
 assert.match(renderToStaticMarkup(h(PaginationControls,{window:pageWindow(1,1,24),noun:'books',position:'top',label:'Library',onPage:noop,onSize:noop})),/of 1 book</);
});

test('the Library renders one page of cards, keeps its state in the URL, and restores scroll',()=>{
 const source=readFileSync(root+'/components/collections/Collections.tsx','utf8');
 assert.match(source,/cards\(pageSlice\)/);assert.doesNotMatch(source,/cards\(filtered\)/);assert.doesNotMatch(source,/Show more/);
 assert.match(source,/usePagination\(\{total:filtered\.length/);assert.match(source,/browseLibrary\(/);
 assert.match(source,/replaceState\(null/);assert.match(source,/muse\.library\.scroll/);assert.match(source,/useDeferredValue\(search\)/);
 const hook=readFileSync(root+'/components/collections/usePagination.ts','utf8');
 assert.match(hook,/params\.set\('page'/);assert.match(hook,/params\.set\('size'/);assert.match(hook,/key:resetKey/);
});
test('covers load lazily with reserved dimensions and cards keep one structure',()=>{
 const shelf=readFileSync(root+'/components/whimsy/Bookshelf.tsx','utf8'),css=readFileSync(root+'/components/collections/Collections.css','utf8');
 assert.match(shelf,/loading=\{priority\?'eager':'lazy'\} decoding="async"/);assert.match(shelf,/width=\{300\} height=\{450\}/);
 assert.match(css,/-webkit-line-clamp:2/);assert.match(css,/\.muse-card-creator\{[^}]*white-space:nowrap/);assert.match(css,/aspect-ratio:2\/3/);
});
