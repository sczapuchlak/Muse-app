import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';
const {bookCarryFields}=load('lib/whimsy/books');
const {withReadFavorite,isFavoriteRead,shelfMove}=load('lib/whimsy/reading-cycles');
const base={isbn:undefined,publisher:undefined,publishedDate:undefined,description:undefined,metadataSource:undefined,completions:undefined,archivedAt:undefined,cycleId:undefined,unassignedRating:undefined,unassignedReview:undefined};
const book=(extra={})=>({id:'b',revision:1,title:'T',status:'finished',reviewEmojis:[],createdAt:'2026-01-01T00:00:00.000Z',completions:[{id:'r1',finishedOn:'2026-02-01',recordedAt:'2026-02-01T00:00:00.000Z'},{id:'r2',finishedOn:'2026-06-01',recordedAt:'2026-06-01T00:00:00.000Z'}],...extra});
test('an earlier book-level heart is still carried by record rewrites',()=>{
 assert.equal(bookCarryFields({...base,favorite:true}).favorite,true);
 assert.equal('favorite' in bookCarryFields({...base}),false);
});
test('a read is marked as a favourite on that read only',()=>{
 const {completions}=withReadFavorite(book(),'r1',true);
 assert.equal(completions[0].favorite,true);assert.equal(completions[1].favorite,undefined);
 const off=withReadFavorite(book({completions}),'r1',false).completions;assert.equal('favorite' in off[0],false);
});
test('finishing with the heart marks the closing read; skipping leaves it unmarked',()=>{
 const reading={id:'b',revision:1,title:'T',status:'reading',reviewEmojis:[],startedOn:'2026-03-01',createdAt:'2026-01-01T00:00:00.000Z'};
 const fin=shelfMove(reading,'finished','2026-03-10',{finishedOn:'2026-03-10',reviewEmojis:[],favorite:true});
 assert.equal(fin.completions.at(-1).favorite,true);
 const plain=shelfMove(reading,'finished','2026-03-10',{finishedOn:'2026-03-10',reviewEmojis:[]});
 assert.equal(plain.completions.at(-1).favorite,undefined);
});
test('a heart set directly on the book counts only for its latest read',()=>{
 const b=book({favorite:true}),[r1,r2]=b.completions;
 assert.equal(isFavoriteRead(b,r2),true);assert.equal(isFavoriteRead(b,r1),false);
});
