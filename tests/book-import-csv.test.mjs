import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';

const {parseLibraryCsv,libraryCsv}=load('lib/books/import-csv');

test('CSV preserves Unicode, escaped quotes, commas, and embedded newlines',()=>{
 const rows=[['Title','Review'],['Étoile, book','A "lovely" read\r\nAgain']];
 assert.deepEqual(parseLibraryCsv(libraryCsv(rows)),rows);
});
test('CSV rejects malformed input instead of shifting data into other columns',()=>{
 for(const csv of ['a,b\n"unfinished,b','a,b\n"x"oops,y','a,b\n1','a,b\n1,2,3','a,b\nhe"llo,x'])assert.throws(()=>parseLibraryCsv(csv));
});
test('spreadsheet formula cells are escaped even after whitespace',()=>{
 const csv=libraryCsv([['=1+1',' \t@cmd','-2','ordinary']]);
 assert.deepEqual(parseLibraryCsv(csv),[["'=1+1","' \t@cmd","'-2",'ordinary']]);
});
