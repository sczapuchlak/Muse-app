import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';
const {detectGoodreads,readGoodreadsRow}=load('lib/books/import-goodreads');
test('Goodreads mapping preserves source values without inventing reads',()=>{
 const h=['Book Id','Title','Author','ISBN13','My Rating','Exclusive Shelf','Date Read','My Review','Bookshelves'];
 assert.equal(detectGoodreads(h),true);
 const row=readGoodreadsRow(h,['42','A Book','A Writer','="9781619634480"','4','read','2022/01/15','A review','favorites, fantasy']);
 assert.equal(row.isbn,'9781619634480');assert.equal(row.finishedOn,'2022-01-15');assert.equal(row.status,'finished');assert.equal(row.rating,4);assert.deepEqual(row.shelves,['favorites','fantasy']);
});
test('unknown statuses and invalid dates or ratings remain reviewable',()=>{
 const row=readGoodreadsRow(['Title','Exclusive Shelf','Date Read','My Rating'],['Book','dnf','2022/02/31','5.5']);
 assert.equal(row.status,undefined);assert.equal(row.finishedOn,undefined);assert.equal(row.rating,undefined);assert.equal(row.warnings.length,3);
});
