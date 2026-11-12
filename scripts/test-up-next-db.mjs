// DB checks for Up Next against the LOCAL Supabase stack: three slots, no duplicates, atomic save, privacy, cascade.
import assert from 'node:assert/strict';
import {seedAccount,removeAccount,sql} from './qa/books-harness.mjs';
let passed=0;const check=(ok,label)=>{assert.ok(ok,label);passed++;console.log('PASS',label);};
const a=await seedAccount(),b=await seedAccount();
try{
 const {client,ids}=a,save=s=>client.rpc('save_up_next',{p_book_ids:s}),read=async()=>{const r=(await client.from('up_next_slots').select('slot,book_id')).data;const s=[null,null,null];for(const x of r)s[x.slot]=x.book_id;return s;};
 let r=await save([ids.acowar,null,ids.circe]);check(!r.error&&(await read()).join()===[ids.acowar,'',ids.circe].join(),'slots save in position, leaving one empty');
 await save([ids.circe,ids.acowar,null]);check((await read()).join()===[ids.circe,ids.acowar,''].join(),'reordering replaces the whole queue in one step');
 r=await save([ids.circe,ids.circe,null]);check(!!r.error&&(await read()).join()===[ids.circe,ids.acowar,''].join(),'a book cannot fill two slots, and the failed save leaves the queue as it was');
 r=await save([ids.circe,ids.acowar]);check(!!r.error,'the queue must have exactly three slots');
 r=await save([ids.circe,crypto.randomUUID(),null]);check(!!r.error&&(await read()).join()===[ids.circe,ids.acowar,''].join(),'an unknown book is rejected without changing the queue');
 const bad=await client.from('up_next_slots').insert({slot:3,book_id:ids.heir});check(!!bad.error,'there is no fourth slot');
 check((await b.client.from('up_next_slots').select('slot')).data.length===0,'Up Next is private to its owner');
 const steal=await b.client.rpc('save_up_next',{p_book_ids:[ids.circe,null,null]});check(!!steal.error||(await b.client.from('up_next_slots').select('slot')).data.length===0,'another account cannot queue someone else\'s book');
 const status=await client.from('whimsy_books').select('payload').eq('id',ids.heir).single();await save([ids.heir,null,null]);check((await client.from('whimsy_books').select('payload').eq('id',ids.heir).single()).data.payload.status===status.data.payload.status,'queueing a book never changes its reading status');
 await save([ids.acowar,ids.circe,null]);await client.rpc('add_reading_plan_books',{p_kind:'month',p_period:'2026-11',p_book_ids:[ids.acowar]});await save([null,ids.circe,null]);
 check((await client.from('reading_plan_entries').select('id').eq('book_id',ids.acowar)).data.length===1,'taking a book out of Up Next keeps its Reading Plan membership');
 sql(`delete from public.whimsy_books where id='${ids.circe}'`);check((await read()).every(x=>x!==ids.circe),'deleting a book frees its slot');
 console.log(`${passed} up-next checks passed.`);
}finally{await removeAccount(a.userId);await removeAccount(b.userId);}
