// Journal history import and recall against local Supabase: an imported entry is an ordinary finished entry with its
// original date, order and words; import provenance is separate and owner-only; the same entry is never imported
// twice (by source id or by content); an entry deleted by hand isn't brought back; undoing an import removes only that
// import's entries; tags join existing tags through confirmed aliases and skip removed ones; search finds imported
// words; and the real retrieval path (loadMemory) recalls an imported "Jamie" entry by tag, bounded and permitted.
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {createRequire} from 'node:module';
import {createClient} from '@supabase/supabase-js';
import {load} from '../tests/helpers.mjs';

loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local only');
// retrieve.ts is server-only; this script is the server here.
const require=createRequire(import.meta.url);const so=require.resolve('server-only');require.cache[so]={id:so,filename:so,loaded:true,exports:{}};
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options);
const users=[],must=r=>{if(r.error)throw Object.assign(Error(r.error.message),{code:r.error.code});return r.data;};
const P=load('lib/journal/persistence'),IM=load('lib/journal/import/model'),RUN=load('lib/journal/import/run'),RET=load('lib/journal/server/retrieve');
async function invite(){const link=must(await admin.auth.admin.generateLink({type:'invite',email:`muse-history-${crypto.randomUUID()}@example.test`}));users.push(link.user.id);const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token}));return {client,id:link.user.id};}
const today=new Date().toISOString().slice(0,10);
const entry=(o)=>IM.normalizeEntry({index:0,sourceKey:null,journalName:'',companionName:'Rose',title:'',summary:'',localDate:'2025-03-02',timeZone:'America/Chicago',startedAt:'2025-03-02T21:00:00-06:00',completedAt:null,messages:[],tags:[],original:{},...o});
const call=async(client,batch,e,journal,source='rosebud')=>{const fp=await IM.fingerprint(e);return must(await client.rpc('import_journal_entry',{p_batch:batch,p_source:source,p_key:IM.importKey(e,fp),p_fingerprint:fp,p_journal:journal,p_entry:IM.entryPayload(e),p_original:e.original}));};

try{
 const a=await invite(),b=await invite();
 const set=await P.setupJournal(a.client,a.id,{journalName:'My Journal',presetKey:'confidant',instructions:'',prefs:(await P.loadJournal(a.client,a.id)).prefs});
 const J=set.journal.id;
 // Existing Muse data: a person with a confirmed alias, a removed tag, and a native entry on the same day as an import.
 const sun=must(await a.client.from('journal_tags').insert({user_id:a.id,kind:'person',name:'Sun',aliases:['Son']}).select('*').single());
 must(await a.client.from('journal_tags').insert({user_id:a.id,kind:'person',name:'Harvey',suppressed:true}));
 const native=await P.createConversation(a.client,a.id,{id:crypto.randomUUID(),journalId:J,companion:set.companion,mode:'open',localDate:'2025-03-02',timeZone:'UTC',status:'active'});
 await P.addMessage(a.client,a.id,{id:crypto.randomUUID(),conversationId:native.id,body:'A Muse entry written the same day.',localDate:'2025-03-02'});

 const batch=(await RUN.startBatch(a.client,a.id,'rosebud','test export',3)).id;
 const jamie=entry({title:'Jamie at the gallery',summary:'Met Jamie at an opening; unsure what he meant.',messages:[
  {role:'assistant',body:'How was tonight?',createdAt:'2025-03-02T21:00:00-06:00'},
  {role:'user',body:'I met Jamie at the gallery opening. I think Jamie might be interested?',createdAt:'2025-03-02T21:01:00-06:00'},
  {role:'assistant',body:'What made you think so?',createdAt:'2025-03-02T21:01:30-06:00'},
  {role:'assistant',body:'Take your time.',createdAt:'2025-03-02T21:01:30-06:00'},
  {role:'user',body:'Son also said the review went well.',createdAt:'2025-03-02T21:03:00-06:00'}],
  tags:[{kind:'person',name:'Jamie'},{kind:'person',name:'Son'},{kind:'person',name:'Harvey'},{kind:'topic',name:'Dating'}],original:{analysis:{text:'Their own analysis'},raw_date:'March 2, 2025'}});
 const r1=await call(a.client,batch,jamie,J);
 assert.equal(r1.status,'imported');
 const conv=must(await a.client.from('journal_conversations').select('*').eq('id',r1.conversation_id).single());
 assert.deepEqual([conv.origin,conv.status,conv.local_date,conv.title_source,conv.summary_source,conv.companion_name],['import','completed','2025-03-02','import','import','Rose'],'an ordinary finished entry on its original day');
 assert.equal(new Date(conv.started_at).toISOString(),'2025-03-03T03:00:00.000Z','original time kept');
 const msgs=must(await a.client.from('journal_messages').select('role,body,created_at,reply_to,id').eq('conversation_id',conv.id).order('created_at'));
 assert.deepEqual(msgs.map(m=>m.body),jamie.messages.map(m=>m.body),'every message, in order, word for word');
 assert.ok(new Date(msgs[3].created_at)>new Date(msgs[2].created_at),'two replies at the same second keep their order');
 assert.equal(msgs[0].reply_to,null);assert.equal(msgs[3].reply_to,msgs[2].id,'several AI replies in a row are all kept');
 assert.equal(conv.user_words,20);assert.equal(conv.message_count,5);
 await assert.rejects(()=>P.addMessage(a.client,a.id,{id:crypto.randomUUID(),conversationId:conv.id,body:'more',localDate:'2025-03-02'}),/finished/,'an imported entry is finished');
 const tags=must(await a.client.from('journal_entry_tags').select('source,journal_tags(name,kind)').eq('conversation_id',conv.id));
 assert.deepEqual(tags.map(t=>t.journal_tags.name).sort(),['Dating','Jamie','Sun'],'Son reaches Sun through its alias; Harvey stays removed');
 assert.ok(tags.every(t=>t.source==='ai'),'imported tags are suggestions, not confirmations');
 const src=must(await a.client.from('journal_import_sources').select('*').eq('conversation_id',conv.id).single());
 assert.deepEqual(src.original.analysis,{text:'Their own analysis'},'the source’s own analysis is kept apart, as it was');
 assert.ok((await a.client.from('journal_import_sources').update({original:{}}).eq('conversation_id',conv.id).select('source_key')).data?.length!==1,'provenance is never edited in place');

 // Duplicates: the same entry again (same content) and the same id are skipped; a native entry is never touched.
 assert.equal((await call(a.client,batch,jamie,J)).status,'duplicate');
 const keyed=entry({sourceKey:'rb-2',localDate:'2025-05-10',startedAt:'2025-05-10T12:00:00Z',messages:[{role:'user',body:'Paris was everything.',createdAt:null}],tags:[{kind:'place',name:'Paris'}]});
 assert.equal((await call(a.client,batch,keyed,J)).status,'imported');
 assert.equal((await call(a.client,batch,{...keyed,messages:[{role:'user',body:'Edited elsewhere',createdAt:null}]},J)).status,'duplicate','the same source id is the same entry even if its words changed');
 assert.equal(must(await a.client.from('journal_messages').select('id').eq('conversation_id',native.id)).length,1,'the native entry on the same day is untouched');
 // Refusals: no words of the person's, another person's batch or journal, unreadable payloads.
 await assert.rejects(()=>call(a.client,batch,entry({localDate:'2025-01-01',messages:[{role:'assistant',body:'Only AI',createdAt:null}]}),J),/at least one message of yours/);
 await assert.rejects(()=>call(b.client,batch,entry({localDate:'2025-01-02',messages:[{role:'user',body:'x',createdAt:null}]}),J),/unavailable/,'another account can’t use my import or journal');
 const bj=(await P.setupJournal(b.client,b.id,{journalName:'B',presetKey:'confidant',instructions:'',prefs:(await P.loadJournal(b.client,b.id)).prefs})).journal.id;
 const bb=(await RUN.startBatch(b.client,b.id,'rosebud','b',1)).id;
 await assert.rejects(()=>call(b.client,bb,entry({localDate:'2025-01-03',messages:[{role:'user',body:'x',createdAt:null}]}),J),/unavailable/,'nor import into my journal');
 assert.equal((await call(b.client,bb,jamie,bj)).status,'imported','the same export is independent per account');
 assert.equal(must(await b.client.from('journal_import_sources').select('source_key')).length,1,'and each sees only their own provenance');
 const counts=must(await a.client.from('journal_import_batches').select('imported,duplicates').eq('id',batch).single());
 assert.deepEqual([counts.imported,counts.duplicates],[2,2]);

 // Search and History find imported words like any other entry.
 const hits=must(await a.client.rpc('search_journal',{p_query:'gallery opening',p_limit:10}));
 assert.ok(hits.some(h=>h.conversation_id===conv.id),'full-text search finds imported words');

 // Recall: tag history counts permitted entries and lists older ones; entries kept out of AI context never appear.
 const extra=entry({localDate:'2025-08-01',startedAt:'2025-08-01T12:00:00Z',title:'Jamie again',messages:[{role:'user',body:'Jamie texted about dinner.',createdAt:null}],tags:[{kind:'person',name:'Jamie'}]});
 const r3=await call(a.client,batch,extra,J);
 const hidden=entry({localDate:'2025-09-01',startedAt:'2025-09-01T12:00:00Z',title:'Private Jamie',messages:[{role:'user',body:'Something private about Jamie.',createdAt:null}],tags:[{kind:'person',name:'Jamie'}]});
 const r4=await call(a.client,batch,hidden,J);
 must(await a.client.from('journal_conversations').update({exclude_from_memory:true}).eq('id',r4.conversation_id));
 const jamieTag=must(await a.client.from('journal_tags').select('id').eq('kind','person').eq('normalized','jamie').single()).id;
 const th=must(await a.client.rpc('journal_tag_history',{p_tags:[jamieTag],p_journals:[J],p_before:today,p_per_tag:4}));
 assert.deepEqual([th[0].entries,th[0].first_date,th[0].last_date],[2,'2025-03-02','2025-08-01'],'counts and span cover permitted entries only');
 assert.deepEqual(th.map(r=>r.conversation_id),[r3.conversation_id,conv.id],'newest first; the excluded entry never appears');
 assert.equal(must(await b.client.rpc('journal_tag_history',{p_tags:[jamieTag],p_journals:[J],p_before:today})).length,0,'another account learns nothing');

 // The real retrieval path: “Girl, guess who messaged me again? Jamie!”
 const basics=await RET.basics(a.client,a.id);
 const journal=(await P.loadJournal(a.client,a.id)).journals.find(j=>j.id===J);
 const mem=await RET.loadMemory(a.client,a.id,basics,journal,{currentId:null,memoryOff:false,today,latest:'Girl, guess who messaged me again? Jamie!'});
 assert.deepEqual(mem.used.entities,['Jamie']);
 assert.deepEqual(mem.used.retrieved,[r3.conversation_id,conv.id],'both Jamie entries, newest first');
 assert.ok(mem.used.why[conv.id].includes('tag:Jamie'));
 assert.match(mem.retrieved,/Jamie \(person\): in 2 journal entries, from Mar 2, 2025 to Aug 1, 2025/);
 assert.match(mem.retrieved,/imported from Rosebud/);assert.match(mem.retrieved,/Summary written by Rosebud at the time/);
 assert.doesNotMatch(mem.retrieved,/Something private/,'kept out of AI context means never sent');
 assert.ok(mem.retrieved.length<=4300,`bounded (${mem.retrieved.length} chars)`);
 const follow=await RET.loadMemory(a.client,a.id,basics,journal,{currentId:null,memoryOff:false,today,latest:'what do you think he wants?',earlier:['Jamie messaged me again']});
 assert.ok(follow.used.retrieved.includes(conv.id),'a follow-up still recalls Jamie');
 const sunMem=await RET.loadMemory(a.client,a.id,basics,journal,{currentId:null,memoryOff:false,today,latest:'Son wants to meet tomorrow'});
 assert.deepEqual(sunMem.used.entities,['Sun'],'the alias leads to the canonical person');
 const noMatch=await RET.loadMemory(a.client,a.id,basics,journal,{currentId:null,memoryOff:false,today,latest:'I sat in the sun today'});
 assert.equal((noMatch.used.entities??[]).length,0,'the sun is not Sun');
 const off=await RET.loadMemory(a.client,a.id,basics,journal,{currentId:null,memoryOff:true,today,latest:'Jamie!'});
 assert.equal(off.retrieved,'','memory off for the conversation sends nothing');
 must(await a.client.from('journal_journals').update({memory_scope:'off'}).eq('id',J));
 const offJ=await RET.loadMemory(a.client,a.id,basics,{...journal,memoryScope:'off'},{currentId:null,memoryOff:false,today,latest:'Jamie!'});
 assert.equal(offJ.retrieved,'','a journal with memory off sends nothing');
 must(await a.client.from('journal_journals').update({memory_scope:'shared'}).eq('id',J));

 // Enrichment candidates: imported entries without a ready analysis, with their size.
 const cands=must(await a.client.rpc('journal_enrichment_candidates'));
 assert.equal(cands.length,4);assert.ok(cands.every(c=>!c.analysed&&c.chars>0));
 assert.equal(must(await b.client.rpc('journal_enrichment_candidates')).length,1);

 // Deleting an imported entry by hand is respected: re-importing doesn't bring it back.
 must(await a.client.from('journal_conversations').delete().eq('id',r3.conversation_id));
 const batch2=(await RUN.startBatch(a.client,a.id,'rosebud','again',1)).id;
 assert.equal((await call(a.client,batch2,extra,J)).status,'deleted');
 // Undo removes only that import's entries (never a native one) and lets the same file be imported again.
 const removed=must(await a.client.rpc('undo_journal_import',{p_batch:batch}));
 assert.equal(removed,3);
 assert.equal(must(await a.client.from('journal_conversations').select('id').eq('origin','import')).length,0);
 assert.equal(must(await a.client.from('journal_conversations').select('id').eq('id',native.id)).length,1,'a Muse entry is never removed by an undo');
 assert.equal(must(await a.client.from('journal_import_batches').select('status').eq('id',batch).single()).status,'undone');
 assert.equal((await call(a.client,batch2,jamie,J)).status,'imported','after an undo the same entry can be imported again');
 assert.ok((await a.client.rpc('import_journal_entry',{p_batch:batch,p_source:'rosebud',p_key:'k',p_fingerprint:'0'.repeat(64),p_journal:J,p_entry:IM.entryPayload(jamie)})).error,'an undone import accepts nothing more');
 const anon=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
 for(const t of ['journal_import_batches','journal_import_sources']){const r=await anon.from(t).select('*').limit(1);assert.ok(r.error||r.data.length===0,`${t} closed to anon`);}
 const gone=await admin.auth.admin.deleteUser(a.id);assert.ok(!gone.error,`account deletion succeeds with imports: ${gone.error?.message}`);users.splice(users.indexOf(a.id),1);
 for(const t of ['journal_import_batches','journal_import_sources','journal_conversations'])assert.equal((await admin.from(t).select('*',{count:'exact',head:true}).eq('user_id',a.id)).count,0,`${t} emptied by account deletion`);
 console.log('PASS Journal history: imported entries are ordinary finished entries (date, time, order, words, several replies), provenance separate + owner-only + append-only, duplicates by content and by id, native entries untouched, refusals, per-account isolation, search, tag history (counts, permitted only), loadMemory recalls Jamie by tag + follow-up + alias, never “the sun”, memory off sends nothing, enrichment candidates, manual deletion respected, undo removes only that import, account deletion removes everything.');
}finally{for(const id of users)await admin.auth.admin.deleteUser(id);console.log('Disposable accounts removed.');}
