import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';

const {browseBooks}=load('lib/books/library');
const {seriesProgress}=load('lib/collections/models');
const book=(n,extra={})=>({id:`book-${n}`,title:`Volume ${String(n).padStart(4,'0')}`,author:n%2?'Mira Lane':'Eli Star',genre:n%3?'Fantasy':'Science Fiction',status:'planned',reviewEmojis:[],createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-02T00:00:00Z',revision:1,userId:'owner',...extra});
const base={query:'',status:'',genre:'',seriesId:'',progress:'all',sort:'title'};

test('a thousand books stay complete while search, filters and sorting operate on canonical records',()=>{
 const books=Array.from({length:1000},(_,i)=>book(i+1)),selected=books[812];
 const series=[{id:'series',title:'The Lantern Cycle',scope:'released',conclusion_state:'unknown'}],members=[{id:'member',series_id:'series',book_id:selected.id,sequence:1,role:'mainline',release_state:'released'}];
 assert.equal(browseBooks(books,[],series,members,base).length,1000);
 assert.deepEqual(browseBooks(books,[],series,members,{...base,query:'lantern 0813'}).map(row=>row.id),[selected.id]);
 assert.deepEqual(browseBooks(books,[],series,members,{...base,seriesId:'series'}).map(row=>row.id),[selected.id]);
 assert.equal(browseBooks(books,[],series,members,{...base,genre:'Science Fiction'}).length,333);
 assert.equal(browseBooks(books,[],series,members,{...base,progress:'unstarted'}).length,1000);
 assert.deepEqual(browseBooks(books,[],series,members,{...base,sort:'title'}).slice(0,2).map(row=>row.id),['book-1','book-2']);
});

test('a reread preserves one distinct completed series book',()=>{
 const rereading=book(1,{status:'reading',cycleId:'book-1:read:2',completions:[{id:'book-1:read:1',finishedOn:'2025-06-01',recordedAt:'2025-06-01T12:00:00Z',rating:5,review:'A favorite'}]});
 const series={id:'series',title:'The Lantern Cycle',scope:'released',conclusion_state:'unknown'},members=[{id:'one',series_id:'series',book_id:rereading.id,sequence:1,role:'mainline',release_state:'released'}];
 const result=seriesProgress(series,members,[rereading],[]);
 assert.equal(result.completed,1);assert.equal(result.availableTotal,1);assert.equal(result.next,null);
 assert.equal(rereading.completions[0].review,'A favorite');
});
