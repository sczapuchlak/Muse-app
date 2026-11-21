// Journal lists past the API's 1000-row cap, against LOCAL Supabase only (max_rows = 1000, as hosted), with a
// disposable user removed afterwards. An imported archive has thousands of tag links: every one must load, or new
// entries' AI tags vanish from the screen (Nov 20 bug), History filters miss entries and the export is incomplete.
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {createClient} from '@supabase/supabase-js';
import {load} from '../tests/helpers.mjs';
loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local Supabase only');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options);
const must=r=>{if(r.error)throw r.error;return r.data;};
const P=load('lib/journal/persistence');
let userId;
try{
 const link=must(await admin.auth.admin.generateLink({type:'invite',email:`journal-paging-${crypto.randomUUID()}@example.test`}));userId=link.user.id;
 const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token}));
 const journal=must(await client.from('journal_journals').insert({user_id:userId,name:'Paging test'}).select('id').single());
 const convs=must(await client.from('journal_conversations').insert(Array.from({length:30},(_,i)=>({user_id:userId,journal_id:journal.id,mode:'open',local_date:`2026-10-${String(i+1).padStart(2,'0')}`,time_zone:'UTC',status:'completed',completed_at:new Date().toISOString()}))).select('id,local_date'));
 const tags=must(await client.from('journal_tags').insert(Array.from({length:40},(_,i)=>({user_id:userId,kind:'topic',name:`Topic ${i}`}))).select('id'));
 const links=convs.flatMap(c=>tags.map(t=>({user_id:userId,conversation_id:c.id,tag_id:t.id,source:'ai'})));
 for(let i=0;i<links.length;i+=500)must(await client.from('journal_entry_tags').insert(links.slice(i,i+500)));
 const capped=must(await client.from('journal_entry_tags').select('tag_id').eq('user_id',userId).limit(50000));
 assert.equal(capped.length,1000,'the API caps a plain read at 1000 rows (the cause)');
 const state=await P.loadJournal(client,userId);
 assert.equal(state.entryTags.length,1200,'every tag link loads');
 const newest=convs.find(c=>c.local_date==='2026-10-30');
 assert.equal(state.entryTags.filter(t=>t.conversationId===newest.id).length,40,'the newest entry shows all of its AI tags');
 assert.equal(new Set(state.entryTags.map(t=>`${t.conversationId}:${t.tagId}`)).size,1200,'no link repeats across pages');
 console.log('PASS journal paging: 1200 tag links load past the 1000-row cap; the newest entry keeps all 40 tags; no repeats');
}finally{if(userId)await admin.auth.admin.deleteUser(userId).catch(()=>{});}
