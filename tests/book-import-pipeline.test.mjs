import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';
const {planGoodreads}=load('lib/books/import-plan');
const {prepareGoodreadsCommands,executeImportCommands}=load('lib/books/import-execute');
const book={id:'muse',userId:'u',revision:3,createdAt:'2020-01-01T00:00:00Z',updatedAt:'2024-01-01T00:00:00Z',title:'A Book',author:'Author',status:'reading',rating:5,finalThoughts:'Muse review',reviewEmojis:[]};
const row={sourceId:'123',title:'A Book',author:'Author',status:'finished',finishedOn:'2022-01-02',rating:4,review:'External review',shelves:[],warnings:[]};
test('matched import preserves Muse opinions and leaves ambiguous history uncounted',()=>{
 const plan=planGoodreads([row],[book],[]);assert.equal(plan[0].kind,'matched');assert.ok(plan[0].conflicts.length>=3);
 const cmds=prepareGoodreadsCommands(plan,'batch','2026-01-01T00:00:00Z',()=> 'command');
 assert.equal(cmds[0].command.p_book.rating,5);assert.equal(cmds[0].command.p_book.finalThoughts,'Muse review');assert.equal(cmds[0].command.p_book.completions,undefined);assert.equal(cmds[0].command.p_observation.review,'External review');
});
test('duplicate rows require review and execution reports actual successes',async()=>{
 const plan=planGoodreads([row,row],[],[]);assert.deepEqual(plan.map(x=>x.kind),['new','review']);
 let n=0;const commands=prepareGoodreadsCommands(plan,'batch','2026-01-01T00:00:00Z',()=>String(++n));const steps=[];
 const result=await executeImportCommands({rpc:async(name,args)=>({data:{sourceId:args.p_book.id},error:null})},commands,(done,total)=>steps.push([done,total]));
 assert.equal(result.saved,1);assert.deepEqual(steps,[[1,1]]);assert.equal(commands[0].command.p_book.completions.length,1);
});
