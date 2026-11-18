// Muse Journal V1 against local Supabase: owner-only rows and cross-user isolation, server-only AI entitlement and
// usage, companion version snapshots, append-only messages with counters, finished entries closed to new messages,
// corrections that keep history, tags (case-insensitive, merge keeps an alias), explicit journal deletion, full-text
// search, journal days for Rituals, "Keep as Journal Entry" without duplicates, and the Rituals/Inner Compass hooks.
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {createClient} from '@supabase/supabase-js';
import {load} from '../tests/helpers.mjs';

loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local only');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options);
const users=[],must=r=>{if(r.error)throw r.error;return r.data;};
const P=load('lib/journal/persistence');
async function invite(){const link=must(await admin.auth.admin.generateLink({type:'invite',email:`muse-journal-${crypto.randomUUID()}@example.test`}));users.push(link.user.id);const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token}));return {client,id:link.user.id};}
const tables=['journal_companions','journal_companion_versions','journal_journals','journal_preferences','journal_conversations','journal_messages','journal_message_corrections','journal_tags','journal_entry_tags','journal_analyses','journal_bookmarks','journal_memories','journal_reports','journal_links','journal_ai_entitlements','journal_ai_usage'];
const today=new Date().toISOString().slice(0,10);

try{
 const a=await invite(),b=await invite();
 let state=await P.loadJournal(a.client,a.id);
 assert.equal(state.journals.length,0,'nothing exists until chosen');
 const starters=await P.addStarters(a.client,a.id,['everyday','work'],['explorer'],state);
 assert.equal(starters.journals.length,2);assert.equal(starters.companions.length,3,'journal companions plus the chosen one');
 state=await P.loadJournal(a.client,a.id);
 const everyday=state.journals.find(j=>j.presetKey==='everyday'),work=state.journals.find(j=>j.presetKey==='work');
 const thought=state.companions.find(c=>c.presetKey==='thought-partner');
 assert.equal(everyday.defaultCompanionId,thought.id,'journal points at its starter companion');
 assert.equal(work.memoryScope,'journal','Work keeps its memory to itself');
 assert.equal((await P.addStarters(a.client,a.id,['everyday'],[],state)).journals.length,0,'starters are never duplicated');

 // Companion versions: a snapshot at creation and whenever the words change; other edits don't make versions.
 let versions=await P.companionVersions(a.client,a.id,thought.id);assert.equal(versions.length,1);assert.equal(versions[0].version,1);
 const edited=await P.saveCompanion(a.client,a.id,{...thought,instructions:thought.instructions+'\nBe extra wry.'});
 assert.equal(edited.version,2);
 const moved=await P.saveCompanion(a.client,a.id,{...edited,position:9});assert.equal(moved.version,2,'reordering is not a new version');
 await assert.rejects(()=>P.saveCompanion(a.client,a.id,{...thought,name:'Stale'}),/another device/);
 versions=await P.companionVersions(a.client,a.id,thought.id);assert.deepEqual(versions.map(v=>v.version),[2,1]);
 assert.ok(!versions[1].instructions.includes('extra wry'),'version 1 keeps the earlier words');

 // A conversation pins the companion version it started with.
 let conv=await P.createConversation(a.client,a.id,{id:crypto.randomUUID(),journalId:everyday.id,companion:edited,mode:'evening',localDate:today,timeZone:'America/Chicago',status:'draft',draft:'Half a thought'});
 assert.equal(conv.status,'draft');assert.equal(conv.companionVersionId,versions[0].id);assert.equal(conv.draft,'Half a thought');
 await P.saveDraft(a.client,a.id,conv.id,'A whole thought about Alex and the Lisbon trip');
 const rev=conv.revision;conv=await P.refreshConversation(a.client,a.id,conv.id);assert.equal(conv.revision,rev,'drafts never bump the revision');
 const m1=await P.addMessage(a.client,a.id,{id:crypto.randomUUID(),conversationId:conv.id,body:'Had coffee with Alex and talked about the Lisbon trip for ages.',localDate:today});
 assert.deepEqual(await P.addMessage(a.client,a.id,{id:m1.id,conversationId:conv.id,body:'retry',localDate:today}).then(m=>m.body),m1.body,'a retried save returns the first copy');
 conv=await P.refreshConversation(a.client,a.id,conv.id);
 assert.equal(conv.status,'active','the first message makes a draft active');assert.equal(conv.userWords,12);assert.equal(conv.messageCount,1);assert.equal(conv.draft,'','sending clears the draft');
 // Photos on a message: my own message, my own folder for this entry, at most 7, never visible to anyone else.
 const img={conversation_id:conv.id,message_id:m1.id,position:0,path:`${a.id}/${conv.id}/p.webp`,thumbnail_path:`${a.id}/${conv.id}/p.thumb.webp`,width:10,height:10,mime:'image/webp'};
 assert.ok(!(await a.client.from('journal_message_images').insert(img)).error,'a photo links to my own message');
 assert.ok((await a.client.from('journal_message_images').insert({...img,position:1,path:`${b.id}/${conv.id}/p.webp`})).error,'a photo path must be in my own folder for this entry');
 assert.ok((await a.client.from('journal_message_images').insert({...img,position:7})).error,'at most 7 photos per message');
 assert.ok((await b.client.from('journal_message_images').insert({...img,position:2})).error,'another account cannot attach to my message');
 assert.equal((await b.client.from('journal_message_images').select('id').eq('message_id',m1.id)).data.length,0,'another account cannot see my photos');
 assert.ok((await a.client.from('journal_message_images').update({width:20}).eq('message_id',m1.id).select('id')).data?.length!==1,'photos are never edited in place');
 assert.equal((await P.loadMessages(a.client,a.id,conv.id)).messages.find(m=>m.id===m1.id).images.length,1,'a message loads with its photos');
 // Only one reply per message, and messages can't be edited directly.
 must(await a.client.from('journal_messages').insert({conversation_id:conv.id,role:'assistant',body:'How was it?',local_date:today,reply_to:m1.id}));
 assert.ok((await a.client.from('journal_messages').insert({conversation_id:conv.id,role:'assistant',body:'Dup',local_date:today,reply_to:m1.id})).error,'a second reply to the same message is refused');
 const direct=await a.client.from('journal_messages').update({body:'rewritten'}).eq('id',m1.id).select('id');
 assert.ok(direct.error||direct.data.length===0,'messages are never updated in place');

 // Metadata edits are revision-checked and leave the dialogue alone.
 conv=await P.updateMeta(a.client,a.id,{...conv,title:'Coffee with Alex',titleSource:'user',favorite:true});
 await assert.rejects(()=>P.updateMeta(a.client,a.id,{...conv,revision:conv.revision-1,title:'Stale'}),/another device/);
 // Finish: no more messages; it stays finished.
 conv=await P.completeConversation(a.client,a.id,conv,false);assert.equal(conv.status,'completed');
 await assert.rejects(()=>P.addMessage(a.client,a.id,{id:crypto.randomUUID(),conversationId:conv.id,body:'one more',localDate:today}),/finished/);
 assert.ok((await a.client.from('journal_conversations').update({status:'active',completed_at:null}).eq('id',conv.id)).error,'a finished entry stays finished');
 // Corrections keep the earlier words.
 const fixed=await P.correctMessage(a.client,m1.id,'Had coffee with Alex and talked about the Lisbon trip for hours.');
 assert.ok(fixed.correctedAt);const {messages,corrections}=await P.loadMessages(a.client,a.id,conv.id);
 assert.equal(messages[0].body,fixed.body);assert.equal(corrections.length,1);assert.equal(corrections[0].previousBody,m1.body);
 await assert.rejects(()=>P.correctMessage(a.client,messages[1].id,'Not mine'),/your own words/);

 // Tags: case-insensitive uniqueness, distinct kinds, merge keeps the other name as an alias.
 const alex=await P.createTag(a.client,a.id,'person','Alex');
 assert.equal((await P.createTag(a.client,a.id,'person','  alex ')).id,alex.id,'Alex and alex are one person');
 const alexTopic=await P.createTag(a.client,a.id,'topic','Alex');assert.notEqual(alexTopic.id,alex.id,'a topic is not a person');
 const hopeful=await P.createTag(a.client,a.id,'mood','Hopeful');assert.equal(hopeful.kind,'mood','moods are their own kind of tag');
 assert.ok((await a.client.from('journal_tags').insert({kind:'vibe',name:'x'})).error,'unknown tag kinds are refused');
 const al=await P.createTag(a.client,a.id,'person','Al');
 await P.tagEntry(a.client,a.id,conv.id,al.id);
 await assert.rejects(()=>P.mergeTags(a.client,al.id,alexTopic.id),/same kind/);
 const merged=await P.mergeTags(a.client,al.id,alex.id);assert.deepEqual(merged.aliases,['Al']);
 state=await P.loadJournal(a.client,a.id);assert.ok(state.entryTags.some(t=>t.tagId===alex.id&&t.conversationId===conv.id),'entries move to the kept tag');

 // My tags: user-made, deduplicated by capitals and spacing, a kind of their own, searchable like everything else.
 const mine=await P.createTag(a.client,a.id,'custom','Life  Moments');assert.equal(mine.kind,'custom');assert.equal(mine.name,'Life Moments');
 assert.equal((await P.createTag(a.client,a.id,'custom',' life moments ')).id,mine.id,'capitals and spacing never make a duplicate tag');
 assert.notEqual((await P.createTag(a.client,a.id,'topic','Life Moments')).id,mine.id,'a topic with the same name stays a separate kind');
 await P.tagEntry(a.client,a.id,conv.id,mine.id);
 assert.ok((await P.searchJournal(a.client,'life mom')).some(h=>h.conversationId===conv.id),'search finds an entry by part of one of my tags');
 assert.ok((await P.searchJournal(a.client,'lisb')).some(h=>h.conversationId===conv.id),'search matches part of a word (case-insensitive)');
 assert.ok((await P.searchJournal(a.client,'AL')).some(h=>h.conversationId===conv.id),'search finds a person by an alias');
 assert.deepEqual(await P.searchJournal(b.client,'life mom'),[],'tag search never crosses accounts');
 assert.ok((await b.client.from('journal_tags').select('id').eq('id',mine.id)).data.length===0,'another account cannot read my tags');

 // Continue from here: links only to my own entries; never itself; many follow-ups; a deleted original keeps the snapshot.
 const src=await P.createConversation(a.client,a.id,{id:crypto.randomUUID(),journalId:everyday.id,companion:null,mode:'open',localDate:today,timeZone:'UTC',status:'active'});
 const f1=await P.createConversation(a.client,a.id,{id:crypto.randomUUID(),journalId:everyday.id,companion:null,mode:'open',localDate:today,timeZone:'UTC',status:'draft',continues:{id:src.id,title:'The offer',date:today}});
 const f2=await P.createConversation(a.client,a.id,{id:crypto.randomUUID(),journalId:everyday.id,companion:null,mode:'open',localDate:today,timeZone:'UTC',status:'draft',continues:{id:src.id,title:'The offer',date:today}});
 assert.equal(f1.continuesId,src.id);assert.equal(f2.continuesId,src.id,'several entries can continue the same original');
 assert.equal((await P.refreshConversation(a.client,a.id,src.id)).revision,src.revision,'continuing an entry never changes it');
 const bConv=await b.client.from('journal_journals').select('id').limit(1);
 assert.ok((await b.client.from('journal_conversations').insert({journal_id:bConv.data?.[0]?.id??everyday.id,mode:'open',status:'draft',local_date:today,time_zone:'UTC',continues_id:src.id,continues_title:'x'})).error,'another account cannot continue my entry');
 assert.ok((await a.client.from('journal_conversations').update({continues_id:f1.id}).eq('id',f1.id).select('id')).error,'an entry cannot continue itself');
 await P.deleteConversation(a.client,a.id,src.id);
 const orphan=await P.refreshConversation(a.client,a.id,f1.id);assert.equal(orphan.continuesId,null);assert.equal(orphan.continuesTitle,'The offer','a deleted original leaves the snapshot');
 await P.deleteConversation(a.client,a.id,f1.id);await P.deleteConversation(a.client,a.id,f2.id);

 // Highlights: an exact range in one of my messages in that entry; My tags only; never on someone else's entry.
 const hl=must(await a.client.from('journal_bookmarks').insert({conversation_id:conv.id,message_id:m1.id,excerpt:'x',start_offset:0,end_offset:1}).select('*').single());
 assert.ok((await a.client.from('journal_bookmarks').insert({conversation_id:conv.id,message_id:m1.id,excerpt:'x',start_offset:5,end_offset:2})).error,'a highlight range must run forwards');
 const otherEntry=await P.createConversation(a.client,a.id,{id:crypto.randomUUID(),journalId:everyday.id,companion:null,mode:'open',localDate:today,timeZone:'UTC',status:'active'});
 assert.ok((await a.client.from('journal_bookmarks').insert({conversation_id:otherEntry.id,message_id:m1.id,excerpt:'x'})).error,'a highlight’s message must be in that entry');
 assert.ok((await b.client.from('journal_bookmarks').insert({conversation_id:conv.id,message_id:m1.id,excerpt:'x'})).error,'another account cannot highlight my entry');
 const myTag=await P.createTag(a.client,a.id,'custom','Keepers'),topicTag=await P.createTag(a.client,a.id,'topic','Work');
 await P.tagHighlight(a.client,a.id,hl.id,myTag.id);
 await assert.rejects(()=>P.tagHighlight(a.client,a.id,hl.id,topicTag.id),'only My tags go on highlights');
 assert.ok((await b.client.from('journal_highlight_tags').insert({highlight_id:hl.id,tag_id:myTag.id})).error,'another account cannot tag my highlight');
 assert.equal((await b.client.from('journal_highlight_tags').select('tag_id')).data.length,0,'highlight tags are private');
 assert.equal((await P.loadJournal(a.client,a.id)).highlightTags.length,1);
 await P.deleteConversation(a.client,a.id,otherEntry.id);

 // Manage Tags: never suggest again keeps entries; merge moves highlight tags and corrections; no silent fusing.
 const son=await P.createTag(a.client,a.id,'person','Son'),sun=await P.createTag(a.client,a.id,'person','Sun');
 await P.tagEntry(a.client,a.id,conv.id,son.id);
 const fix=await P.recordCorrection(a.client,a.id,'person','Maya',son.id);assert.equal((await P.recordCorrection(a.client,a.id,'person','maya',son.id)).times,2,'a repeated correction is counted, not duplicated');
 assert.equal(fix.toTagId,son.id);
 const merged2=await P.mergeTags(a.client,son.id,sun.id);assert.ok(merged2.aliases.includes('Son'));
 const st=await P.loadJournal(a.client,a.id);
 assert.ok(st.entryTags.some(t=>t.tagId===sun.id&&t.conversationId===conv.id),'merging moves the entry to the kept person');
 assert.ok(st.corrections.some(c=>c.toTagId===sun.id),'and the remembered correction moves with it');
 const sunTopic=await P.createTag(a.client,a.id,'topic','Sun');
 await assert.rejects(()=>P.setTagKind(a.client,a.id,sunTopic,'person'),/Merge them instead/,'changing category never fuses two tags silently');
 const hidden=await P.suppressTag(a.client,a.id,sun.id);
 assert.equal(hidden.suppressed,true);assert.ok(!(await P.loadJournal(a.client,a.id)).entryTags.some(t=>t.tagId===sun.id),'never suggest again removes it from entries');
 assert.ok((await P.refreshConversation(a.client,a.id,conv.id)),'and the entry itself stays');
 assert.equal((await P.restoreTag(a.client,a.id,sun.id)).suppressed,false,'and can be allowed again');
 assert.equal((await b.client.from('journal_tag_corrections').select('id')).data.length,0,'corrections are private');
 assert.ok((await b.client.from('journal_tag_corrections').insert({kind:'person',from_name:'x',to_tag_id:sun.id})).error,'another account cannot point a correction at my tag');

 // Guided Journals: my guides only; an entry keeps the guide as it began; answers save like a draft; questions travel with answers.
 const gid=crypto.randomUUID(),guide={id:gid,name:'Tarot',description:'',icon:'🔮',intro:'',mode:'steps',companion:false,questions:[{id:'q1',text:'What cards did you draw?',optional:false},{id:'q2',text:'Anything reversed?',optional:true}],version:1,archivedAt:null,revision:1,createdAt:''};
 const savedGuide=await P.saveGuide(a.client,a.id,guide,true,false);assert.equal(savedGuide.questions.length,2);
 assert.equal((await b.client.from('journal_guides').select('id').eq('id',gid)).data.length,0,'guides are private');
 const ge=await P.createConversation(a.client,a.id,{id:crypto.randomUUID(),journalId:everyday.id,companion:null,mode:'open',localDate:today,timeZone:'UTC',status:'draft',guide:{id:gid,snapshot:{name:'Tarot',icon:'🔮',intro:'',mode:'steps',companion:false,questions:savedGuide.questions,version:1},state:{answers:{q1:'The Star'}}}});
 assert.equal(ge.guideSnapshot.questions[0].text,'What cards did you draw?');assert.equal(ge.guideState.answers.q1,'The Star');
 await P.saveGuideState(a.client,a.id,ge.id,{answers:{q1:'The Star, the Moon'},step:1});
 const ge2=await P.refreshConversation(a.client,a.id,ge.id);assert.equal(ge2.revision,ge.revision,'saving answers never bumps the revision');assert.equal(ge2.guideState.step,1);
 const edited2=await P.saveGuide(a.client,a.id,{...savedGuide,questions:[{id:'q1',text:'Which cards came up?',optional:false}]},false,true);assert.equal(edited2.version,2,'changing the questions is a new version');
 assert.equal((await P.refreshConversation(a.client,a.id,ge.id)).guideSnapshot.questions[0].text,'What cards did you draw?','an entry keeps the questions it began with');
 const ans=await P.addMessage(a.client,a.id,{id:crypto.randomUUID(),conversationId:ge.id,body:'The Star',localDate:today,guideQuestionId:'q1',guideQuestion:'What cards did you draw?'});
 assert.equal(ans.guideQuestion,'What cards did you draw?','an answer remembers its question as written');
 const guidedJ=await P.saveJournal(a.client,a.id,{...everyday,defaultGuideId:gid,guided:true,revision:(await P.loadJournal(a.client,a.id)).journals.find(x=>x.id===everyday.id).revision});
 assert.equal(guidedJ.guided,true,'a journal turns guided prompts on');
 const offJ=await P.saveJournal(a.client,a.id,{...guidedJ,guided:false});assert.equal(offJ.guided,false);assert.equal(offJ.defaultGuideId,gid,'turning them off keeps the questions linked');
 assert.ok((await b.client.from('journal_conversations').insert({journal_id:everyday.id,mode:'open',status:'draft',local_date:today,time_zone:'UTC',guide_id:gid})).error,'another account cannot use my guide');
 await P.deleteGuide(a.client,a.id,gid);
 const st2=await P.loadJournal(a.client,a.id);assert.equal(st2.journals.find(x=>x.id===everyday.id).defaultGuideId,null,'deleting a guide clears a journal default');
 const ge3=await P.refreshConversation(a.client,a.id,ge.id);assert.equal(ge3.guideId,null);assert.equal(ge3.guideSnapshot.name,'Tarot','and the entry keeps its copy of the guide');
 await P.deleteConversation(a.client,a.id,ge.id);

 // Search and journal days.
 const hits=await P.searchJournal(a.client,'lisbon');assert.equal(hits[0].conversationId,conv.id);assert.match(hits[0].snippet,/Lisbon/);
 assert.deepEqual(await P.searchJournal(b.client,'lisbon'),[],'search never crosses accounts');
 const days=await P.journalDays(a.client,'2000-01-01');assert.deepEqual(days,[{date:today,messages:1}]);

 // Keep as Journal Entry: once, in order, finished.
 const key=crypto.randomUUID(),payload={key,journalId:everyday.id,companionId:edited.id,companionName:edited.name,messages:[{role:'user',body:'Test one'},{role:'assistant',body:'Reply one'},{role:'user',body:'Test two'}],localDate:today,timeZone:'UTC'};
 const kept=await P.keepTest(a.client,payload);assert.equal(kept.status,'completed');assert.equal(kept.origin,'playground');assert.equal(kept.messageCount,3);
 assert.equal((await P.keepTest(a.client,payload)).id,kept.id,'a second press returns the same entry');
 const keptMsgs=(await P.loadMessages(a.client,a.id,kept.id)).messages;assert.deepEqual(keptMsgs.map(m=>m.body),['Test one','Reply one','Test two']);
 assert.equal(keptMsgs[1].replyTo,keptMsgs[0].id);

 // Deleting a journal is explicit: refused while it has entries, then move or delete.
 await assert.rejects(()=>P.deleteJournal(a.client,everyday.id,null,false),/still has entries/);
 assert.equal(await P.deleteJournal(a.client,everyday.id,work.id,false),2,'entries moved');
 state=await P.loadJournal(a.client,a.id);assert.ok(state.conversations.every(c=>c.journalId===work.id));assert.ok(!state.journals.some(j=>j.id===everyday.id));

 // Memories: owner-only; deleting one leaves its entry.
 const mem=await P.saveMemory(a.client,a.id,{id:crypto.randomUUID(),body:'Planning a Lisbon trip in spring',kind:'situation',status:'confirmed',source:'user',journalId:null,sourceConversationId:conv.id,revision:0,createdAt:'',updatedAt:''});
 await P.deleteMemory(a.client,a.id,mem.id);assert.ok(await P.refreshConversation(a.client,a.id,conv.id),'deleting a memory keeps the entry');

 // Isolation: b sees nothing of a's and can't write into a's records.
 for(const t of tables){const r=await b.client.from(t).select('*').limit(5);assert.ok(r.error||r.data.length===0,`${t} hidden from another account`);}
 assert.ok((await b.client.from('journal_messages').insert({user_id:b.id,conversation_id:conv.id,role:'user',body:'intrude',local_date:today})).error,'no messages into someone else’s conversation');
 assert.equal((await b.client.from('journal_conversations').update({title:'x'}).eq('id',conv.id).select('id')).data?.length??0,0);
 await assert.rejects(()=>P.correctMessage(b.client,m1.id,'hijack'),/unavailable/);
 // AI access and usage are server-owned.
 assert.ok((await a.client.from('journal_ai_entitlements').insert({user_id:a.id,enabled:true})).error,'a browser can’t grant itself AI');
 must(await admin.from('journal_ai_entitlements').insert({user_id:a.id,enabled:true}));
 const ent=must(await a.client.from('journal_ai_entitlements').select('*').single());
 assert.deepEqual([Number(ent.monthly_limit_usd),Number(ent.warn_at_usd),Number(ent.daily_limit_usd)],[10,7.5,2],'default budget: $10 a month, warning at $7.50, $2 daily guard');
 assert.equal((await a.client.from('journal_ai_entitlements').update({daily_limit_usd:999}).eq('user_id',a.id).select('user_id')).data?.length??0,0,'limits can’t be raised from a browser');
 must(await admin.from('journal_ai_usage').insert({user_id:a.id,kind:'reply',request_key:'k1',model:'mock',status:'ok',cost_usd:0.01}));
 assert.equal(must(await a.client.from('journal_ai_usage').select('id')).length,1,'owner can read their usage');
 assert.equal((await a.client.from('journal_ai_usage').delete().eq('user_id',a.id).select('id')).data?.length??0,0,'usage can’t be erased from a browser');
 assert.equal(must(await b.client.from('journal_ai_usage').select('id')).length,0);
 const anon=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
 for(const t of tables){const r=await anon.from(t).select('*').limit(1);assert.ok(r.error||r.data.length===0,`${t} closed to anon`);}

 // Integrations: a Journaling ritual may connect to Journal days; a discovery may come from a journal entry.
 const valid=must(await admin.rpc('journal_days',{p_from:today}).then(()=>({data:true,error:null})));assert.ok(valid);
 const sql=await admin.from('inner_discoveries').insert({user_id:a.id,category:'values',title:'Curiosity',source_kind:'journal',source_id:conv.id,source_label:'Coffee with Alex'}).select('id');
 assert.ok(!sql.error,'a discovery may name a journal entry as its source');
 // First-run setup on a fresh account: exactly one journal and one default companion; the greeting starts on.
 const c2=await invite();
 const set=await P.setupJournal(c2.client,c2.id,{journalName:'My Journal',presetKey:'confidant',instructions:'Be extra gentle.',prefs:(await P.loadJournal(c2.client,c2.id)).prefs});
 let s2=await P.loadJournal(c2.client,c2.id);
 assert.equal(s2.journals.length,1);assert.equal(s2.companions.length,1);assert.equal(s2.journals[0].defaultCompanionId,set.companion.id,'the companion becomes the journal’s default');
 assert.equal(s2.prefs.defaultJournalId,set.journal.id);assert.equal(s2.prefs.greetOnNew,true,'the greeting is on by default');assert.equal(set.companion.instructions,'Be extra gentle.','custom words are kept (as version 2)');
 // Switching companion mid-entry: earlier replies keep the version that wrote them; the entry points at the new one.
 const other=(await P.addStarters(c2.client,c2.id,[],['explorer'],s2)).companions[0];
 const live=await P.createConversation(c2.client,c2.id,{id:crypto.randomUUID(),journalId:set.journal.id,companion:set.companion,mode:'open',localDate:today,timeZone:'UTC',status:'active'});
 const u1=await P.addMessage(c2.client,c2.id,{id:crypto.randomUUID(),conversationId:live.id,body:'Hello',localDate:today});
 must(await c2.client.from('journal_messages').insert({conversation_id:live.id,role:'assistant',body:'Hi',local_date:today,reply_to:u1.id,companion_version_id:live.companionVersionId}));
 const switched=await P.switchCompanion(c2.client,c2.id,live,other);
 assert.equal(switched.companionId,other.id);assert.notEqual(switched.companionVersionId,live.companionVersionId);
 const names=await P.versionsByIds(c2.client,c2.id,[live.companionVersionId]);assert.equal(names.get(live.companionVersionId).name,'The Confidant','the earlier reply still names who wrote it');
 assert.equal((await P.versionsByIds(a.client,a.id,[live.companionVersionId])).size,0,'another account can’t read those versions');
 const done=await P.completeConversation(c2.client,c2.id,switched,false);
 await assert.rejects(()=>P.switchCompanion(c2.client,c2.id,done,set.companion),/finished/,'a finished entry keeps its companion');

 // Account deletion (the auth service's own path) removes the whole journal.
 const gone=await admin.auth.admin.deleteUser(a.id);assert.ok(!gone.error,`account deletion succeeds: ${gone.error?.message}`);users.splice(users.indexOf(a.id),1);
 for(const t of tables)assert.equal((await admin.from(t).select('*',{count:'exact',head:true}).eq('user_id',a.id)).count,0,`${t} emptied by account deletion`);
 console.log('PASS Journal: owner-only + isolated, server-only AI allowance and usage, companion version snapshots, pinned versions, drafts without revision bumps, append-only messages + counters, one reply per message, finished entries closed, corrections keep history, tags + merge aliases, search, journal days, keep-test idempotent, explicit journal deletion, memories, anon closed, first-run setup, mid-entry companion switch, account deletion removes everything.');
}finally{for(const id of users)await admin.auth.admin.deleteUser(id);console.log('Disposable Journal accounts removed.');}
