// DB checks for Reading Plans against the LOCAL Supabase stack: duplicates, order, move, copy, isolation, cascade.
import assert from 'node:assert/strict';
import {seedAccount,removeAccount,sql} from './qa/books-harness.mjs';
let passed=0;const check=(ok,label)=>{assert.ok(ok,label);passed++;console.log('PASS',label);};
const a=await seedAccount(),b=await seedAccount();
try{
 const {client}=a,{heir,acowar,acotar,circe}=a.ids,rpc=(n,args)=>client.rpc(n,args);
 const order=async(kind,period)=>(await client.from('reading_plan_entries').select('book_id,position').eq('period_kind',kind).eq('period',period).order('position')).data.map(r=>r.book_id);
 let r=await rpc('add_reading_plan_books',{p_kind:'month',p_period:'2026-11',p_book_ids:[acowar,heir,circe]});check(!r.error&&(await order('month','2026-11')).join()===[acowar,heir,circe].join(),'adding appends in the order given');
 r=await rpc('add_reading_plan_books',{p_kind:'month',p_period:'2026-11',p_book_ids:[heir,acotar]});check((await order('month','2026-11')).join()===[acowar,heir,circe,acotar].join(),'a book already in the plan is skipped; new ones append (no duplicates)');
 r=await rpc('reorder_reading_plan',{p_kind:'month',p_period:'2026-11',p_book_ids:[circe,acowar]});check((await order('month','2026-11')).join()===[circe,acowar,heir,acotar].join(),'reordering puts listed books first and keeps the rest after them');
 await rpc('add_reading_plan_books',{p_kind:'month',p_period:'2026-12',p_book_ids:[acowar]});await rpc('add_reading_plan_books',{p_kind:'year',p_period:'2026',p_book_ids:[acowar,heir]});
 check((await client.from('reading_plan_entries').select('id').eq('book_id',acowar)).data.length===3,'one book can be in several monthly plans and the yearly plan');
 await rpc('move_reading_plan_book',{p_kind:'month',p_from:'2026-11',p_to:'2026-12',p_book_id:heir});check(!(await order('month','2026-11')).includes(heir)&&(await order('month','2026-12')).join()===[acowar,heir].join(),'moving leaves the source and joins the end of the target');
 await rpc('move_reading_plan_book',{p_kind:'month',p_from:'2026-11',p_to:'2026-12',p_book_id:acowar});check((await order('month','2026-12')).join()===[acowar,heir].join()&&!(await order('month','2026-11')).includes(acowar),'moving a book already in the target just removes it from the source');
 const bad=await client.from('reading_plan_entries').insert({period_kind:'month',period:'2026-13',book_id:circe,position:0});check(!!bad.error,'an invalid period is rejected');
 const dup=await client.from('reading_plan_entries').insert({period_kind:'year',period:'2026',book_id:acowar,position:9});check(!!dup.error,'the same book cannot be added to one plan twice');
 const status=await client.from('whimsy_books').select('payload').eq('id',heir).single();check(status.data.payload.status==='reading','plan changes never touch a book\'s reading status');
 // Another account sees nothing and cannot write into these plans.
 const other=await b.client.from('reading_plan_entries').select('id');check(other.data.length===0,'plans are private to their owner');
 const steal=await b.client.rpc('add_reading_plan_books',{p_kind:'month',p_period:'2026-11',p_book_ids:[circe]});check(((await b.client.from('reading_plan_entries').select('id')).data.length===0),'another account cannot add someone else\'s book to its own plan');
 await client.from('reading_plan_entries').delete().eq('period_kind','month').eq('period','2026-12').eq('book_id',heir);check(!(await order('month','2026-12')).includes(heir),'removing from a plan leaves the book');
 check((await client.from('whimsy_books').select('id').eq('id',heir)).data.length===1,'the removed book is still in the Library');
 sql(`delete from public.whimsy_books where id='${acowar}'`);check((await client.from('reading_plan_entries').select('id').eq('book_id',acowar)).data.length===0,'deleting a book removes it from every plan');
 console.log(`${passed} reading-plan checks passed.`);
}finally{await removeAccount(a.userId);await removeAccount(b.userId);}
