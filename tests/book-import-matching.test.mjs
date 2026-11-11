import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';
const {matchImportedBook}=load('lib/books/import-matching');
const books=[{id:'a',title:'Half City',author:'Kate Golden',isbn:'059395341X'},{id:'b',title:'Other',author:'A Writer',isbn:'9781619634480'}];
test('matches source identity and ISBN editions without creating another book',()=>{
 assert.deepEqual(matchImportedBook({source:'goodreads',sourceId:'12',title:'Old title'},books,[{source:'goodreads',sourceId:'12',bookId:'a'}]),{kind:'match',bookId:'a',basis:'source'});
 assert.deepEqual(matchImportedBook({source:'csv',title:'Half City',isbn:'9780593953419'},books,[]),{kind:'match',bookId:'a',basis:'isbn'});
});
test('ambiguous and contradictory identities need review',()=>{
 assert.equal(matchImportedBook({source:'goodreads',sourceId:'12',title:'Half City',isbn:'9781619634480'},books,[{source:'goodreads',sourceId:'12',bookId:'a'}]).kind,'review');
 assert.equal(matchImportedBook({source:'csv',title:'Half City',author:'Kate Golden'},[...books,{...books[0],id:'c'}],[]).kind,'review');
 assert.equal(matchImportedBook({source:'csv',title:'Half City'},books,[]).kind,'review');
});
