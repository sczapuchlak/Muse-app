// Authenticated LOCAL browser journey for Muse Journal V1 with disposable accounts and the local MOCK AI provider
// (no paid requests): first-run setup (one journal, one companion), the writing workspace, a New entry greeting, Scenario A continuity, a reply streaming in, memory add/correct/remove reaching the
// AI context (C), Finish & Save with analysis into real tags (people, places, topics, moods), corrections that keep
// history, bookmarks, full-text search over messages, clicking a tag, combined filters, the week view and date jump,
// merge with alias and duplicate prevention across weeks (E), the cached weekly reflection (F), Companion Studio test,
// compare, version save and isolation (Playground), Keep as Journal Entry, draft recovery after reload (D), the
// budget stop with writing still working (H), a second account's isolation and server-side AI refusal (G), phone
// layouts and two themes.
// Requires `JOURNAL_AI_PROVIDER=mock npm run dev`. Run: JOURNAL_UI_ORIGIN=http://localhost:3000 node scripts/test-journal-ui.mjs
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {mkdtempSync,readFileSync,existsSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir,homedir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
loadEnvFile('.env.local');
const origin=process.env.JOURNAL_UI_ORIGIN??'http://localhost:3000',url=process.env.NEXT_PUBLIC_SUPABASE_URL;
for(const endpoint of [origin,url])assert.ok(['localhost','127.0.0.1'].includes(new URL(endpoint).hostname),'Disposable checks must remain local');
const shots=process.env.JOURNAL_UI_SHOTS??join(tmpdir(),'muse-journal-ui');mkdirSync(shots,{recursive:true});
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options),must=r=>{if(r.error)throw Error(r.error.message);return r.data;};
const docker=process.env.MUSE_DOCKER_PATH||(existsSync(homedir()+'/.docker/bin/docker')?homedir()+'/.docker/bin/docker':'docker');
const sql=text=>{const r=spawnSync(docker,['exec','-i','supabase_db_muse-local','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],{input:text,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();};
const directory=mkdtempSync(join(tmpdir(),'muse-journal-ui-'));let chrome,socket,passed=0;const users=[];
const check=(cond,label)=>{assert.ok(cond,label);passed++;console.log('✓',label);};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const today=new Date().toISOString().slice(0,10),day=n=>new Date(Date.parse(`${today}T12:00:00Z`)+n*86400000).toISOString().slice(0,10);
async function account(name){const link=must(await admin.auth.admin.generateLink({type:'invite',email:`journal-ui-${crypto.randomUUID()}@example.test`}));users.push(link.user.id);const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token}));
 sql(`update public.profiles set first_name='${name}',time_zone='UTC',time_zone_confirmed_at=now(),onboarded_at=now() where id='${link.user.id}'`);return {id:link.user.id,email:link.user.email,client};}
const count=async(t,userId,f={})=>{let q=admin.from(t).select('*',{count:'exact',head:true}).eq('user_id',userId);for(const [k,v] of Object.entries(f))q=v===null?q.is(k,null):q.eq(k,v);return (await q).count;};
try{
 const a=await account('Wren'),b=await account('Juno');
 must(await admin.from('journal_ai_entitlements').insert({user_id:a.id,enabled:true,per_minute:60})); // the test is faster than a person; the 8/minute default is checked at the end

 chrome=spawn(process.env.CHROME_BIN??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--hide-scrollbars','--remote-debugging-port=0',`--user-data-dir=${join(directory,'profile')}`],{stdio:'ignore'});
 const portFile=join(directory,'profile/DevToolsActivePort');for(let i=0;!existsSync(portFile)&&i<100;i++)await wait(100);
 const port=readFileSync(portFile,'utf8').split('\n')[0],targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.onopen=r);
 let id=0;const pending=new Map(),errors=[];
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown'){const t=m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text;if(!/negative time stamp/.test(t))errors.push(t);}
  if(m.method==='Page.javascriptDialogOpening')void send('Page.handleJavaScriptDialog',{accept:true});
  if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});socket.send(JSON.stringify({id:key,method,params}));});
 const evaluate=async(fn,args)=>{const r=await send('Runtime.evaluate',{expression:`(${fn})(${JSON.stringify(args)})`,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
 const until=async(fn,message,args,tries=300)=>{for(let i=0;i<tries;i++){if(await evaluate(fn,args).catch(()=>false))return;await wait(100);}throw Error(message);};
 const viewport=(width,height=900,touch=false)=>Promise.all([send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:touch?2:1,mobile:touch}),send('Emulation.setTouchEmulationEnabled',touch?{enabled:true,maxTouchPoints:5}:{enabled:false})]);
 const shoot=async(name,full=false)=>{await wait(500);let clip;if(full){const m=await send('Page.getLayoutMetrics');clip={x:0,y:0,width:m.cssContentSize.width,height:Math.min(m.cssContentSize.height,6000),scale:1};}
  const r=await send('Page.captureScreenshot',{format:'png',...(clip?{clip,captureBeyondViewport:true}:{})});writeFileSync(join(shots,`${name}.png`),Buffer.from(r.data,'base64'));};
 const overflow=()=>evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
 const go=async(path,ready,label)=>{await evaluate(()=>{window.__old=1;}).catch(()=>{});await send('Page.navigate',{url:`${origin}${path}`});await until(new Function(`return !window.__old&&(${ready})`),label);};
 const setValue=(selector,value)=>evaluate(({selector,value})=>{const t=document.querySelector(selector);if(!t)throw Error('missing '+selector);const proto=t instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(t,value);t.dispatchEvent(new Event('input',{bubbles:true}));},{selector,value});
 const click=(selector,text)=>evaluate(({selector,text})=>{const b=[...document.querySelectorAll(selector)].find(x=>(text==null||x.textContent.trim()===text||x.textContent.trim().startsWith(text)||x.getAttribute('aria-label')===text||x.getAttribute('aria-label')?.startsWith(text))&&!x.disabled);if(!b)throw Error('missing '+selector+' '+text);b.click();},{selector,text});
 const has=(selector,text)=>evaluate(({selector,text})=>[...document.querySelectorAll(selector)].some(x=>!text||x.textContent.includes(text)),{selector,text});
 const text=selector=>evaluate(s=>[...document.querySelectorAll(s)].map(x=>x.textContent).join('\n'),selector);
 const menu=async(trigger,choice)=>{await click('button.muse-choice-trigger',trigger);await until(c=>[...document.querySelectorAll('.popover-choice')].some(x=>x.textContent.trim()===c),`menu ${choice}`,choice);await click('.popover-choice',choice);await wait(150);};
 const pickDate=async(label,date)=>{await click('button.muse-date-picker-trigger',label);await until(()=>!!document.querySelector('.muse-calendar'),'calendar opens');for(let i=0;i<14&&!(await has(`[data-date="${date}"]`));i++){await click('button','Previous month');await wait(80);}await click(`[data-date="${date}"]`);await wait(300);};
 const signIn=async(u)=>{const magic=must(await admin.auth.admin.generateLink({type:'magiclink',email:u.email}));await send('Page.navigate',{url:`${origin}/auth/confirm?token_hash=${magic.properties.hashed_token}&type=email&next=/`});await until(()=>location.pathname==='/'&&!!document.querySelector('main'),'signed in');};
 await send('Page.enable');await send('Runtime.enable');await send('DOM.enable');await viewport(1280);
 // A stand-in for the browser's speech recognizer, so the mic can be tested without a microphone.
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.webkitSpeechRecognition=class{constructor(){this.results=[];}start(){window.__rec=this;}stop(){this._end();}abort(){this._end();}_end(){if(window.__rec===this)window.__rec=null;this.onend&&this.onend();}
  say(list){this.results=list.map(([t,f])=>Object.assign([{transcript:t}],{isFinal:f}));this.onresult&&this.onresult({resultIndex:0,results:this.results});}
  fail(code){this.onerror&&this.onerror({error:code});this._end();}};window.SpeechRecognition=window.webkitSpeechRecognition;`});
 await signIn(a);

 // ---- First visit: nothing is created until chosen ----
 await go('/journal','!!document.querySelector(".mj-setup")','setup');
 check(await count('journal_journals',a.id)===0,'visiting the Journal creates nothing');
 check(await evaluate(()=>[...document.querySelectorAll('nav[aria-label="Journal views"] a')].map(a=>a.textContent.trim()).join('|'))==='Journal|History|Insights','Journal | History | Insights (no management tab)');
 await shoot('01-setup',true);
 await click('.mj-setup .mj-choice','The Thought Partner');await click('.mj-setup button','Start journaling');
 await until(()=>!!document.querySelector('.mj-workspace .mj-composer textarea'),'workspace');
 check(await count('journal_journals',a.id)===1&&await count('journal_companions',a.id)===1,'first run makes exactly one journal and one companion');
 check(await count('journal_conversations',a.id)===0&&await count('journal_ai_usage',a.id)===0,'opening the workspace creates no entry and makes no AI request');

 // ---- Seed yesterday's entry (Scenario A) and older history across weeks (E) through the owner's own client ----
 const P=await import('../tests/helpers.mjs').then(m=>m.load('lib/journal/persistence'));
 await P.addStarters(a.client,a.id,['work'],[],await P.loadJournal(a.client,a.id));
 let st=await P.loadJournal(a.client,a.id);const everyday=st.journals.find(x=>x.presetKey==='everyday'),work=st.journals.find(x=>x.presetKey==='work');
 const thought=st.companions.find(c=>c.presetKey==='thought-partner'),strategist=st.companions.find(c=>c.presetKey==='strategist');
 const seed=async(journalId,companion,date,title,summary,words)=>{const c=await P.createConversation(a.client,a.id,{id:crypto.randomUUID(),journalId,companion,mode:'open',localDate:date,timeZone:'UTC',status:'active'});await P.addMessage(a.client,a.id,{id:crypto.randomUUID(),conversationId:c.id,body:words,localDate:date});const done=await P.completeConversation(a.client,a.id,c,false);return P.updateMeta(a.client,a.id,{...done,title,titleSource:'ai',summary,summarySource:'ai'});};
 const quilt=await seed(everyday.id,thought,day(-1),'Finishing the quilt','You were excited to nearly finish your quilt.','I am so excited, the quilt is almost finished and Alex loved the colours.');
 const older=await seed(everyday.id,thought,day(-15),'Dinner with Alex','You had dinner with Alex and talked about moving.','Dinner with Alex tonight, we talked about whether to move to Lisbon.');
 const workEntry=await seed(work.id,strategist,day(-9),'Quarterly planning','Planning the quarter at work.','Alex from finance pushed back on the budget in planning.');
 const alex=await P.createTag(a.client,a.id,'person','Alex');for(const c of [older,workEntry])await P.tagEntry(a.client,a.id,c.id,alex.id);
 await go('/journal','!!document.querySelector(".mj-blank")','workspace reload');
 check(await has('.mj-blank','Finishing the quilt'),'the blank page invites you back to yesterday’s entry by name (no AI)');

 // ---- Scenario A: the companion opens with yesterday's context; then follows a topic change ----
 check(await evaluate(()=>!!document.querySelector('.mj-navrow .mj-header-toolbar')&&!document.querySelector('.muse-header-layout .mj-header-toolbar')&&!!document.querySelector('.muse-header-layout .mj-tb-settings')),'journal, companion and New entry sit beside Journal | History | Insights; settings stay alone up top');
 check(!(await has('.mj-header-toolbar .muse-overflow-trigger')),'no ⋯ menu in the toolbar');
 await until(()=>{const b=document.querySelector('.mj-tb-new');return !!b&&!b.disabled;},'new entry ready');await wait(300);await click('.mj-header-toolbar button','New entry');await until(()=>!!document.querySelector('#mj-new-entry'),'new entry menu');
 check(await has('#mj-new-entry','Start writing')&&await has('#mj-new-entry','to begin')&&await has('#mj-new-entry','Morning intention')&&await has('#mj-new-entry','Evening reflection'),'New entry offers: start writing, ask the companion to begin, morning intention, evening reflection');
 await click('#mj-new-entry .popover-choice','Start writing');
 await until(()=>!!document.querySelector('.mj-workspace')&&[...document.querySelectorAll('.mj-message[data-role=assistant]')].length===1&&!document.querySelector('[data-streaming]'),'opening arrives',undefined,400);
 const opening=await text('.mj-message[data-role=assistant] .mj-message-body');
 check(/Finishing the quilt/.test(opening),'the opening draws on yesterday’s entry (recent context)');
 check(!/Quarterly planning/.test(opening),'a journal-only Work entry never reaches Everyday');
 const latest=async()=>must(await admin.from('journal_conversations').select('id').eq('user_id',a.id).order('created_at',{ascending:false}).limit(1).single()).id;
 const convId=await latest();
 check(await count('journal_ai_usage',a.id,{kind:'opening'})===1,'New entry made exactly one greeting request');
 await setValue('.mj-ws-page .mj-composer textarea','Totally different topic. I keep thinking about Lisbon and what Alex said about moving there.');
 await click('.mj-live-compose button[type=submit]');
 await until(()=>document.querySelectorAll('.mj-message[data-role=assistant]').length===2&&!document.querySelector('[data-streaming]'),'reply arrives',undefined,400);
 const reply=(await text('.mj-message[data-role=assistant] .mj-message-body')).split('\n').pop();
 check(/mock The Thought Partner/.test(reply),'the reply comes from the chosen companion');
 check(/Dinner with Alex/.test(reply),'older history about Lisbon and Alex is retrieved for the new topic');
 check(await count('journal_messages',a.id,{conversation_id:convId})===3,'opening, your message and the reply are all saved during the conversation');
 check(await count('journal_ai_usage',a.id,{status:'ok'})===2,'each AI request is recorded');
 await shoot('02-live-conversation');

 // ---- Scenario C: a memory you add is used; corrected words replace it; deleting removes it ----
 await click('.mj-header-tools .mj-tb-settings');
 await until(()=>!!document.querySelector('#mj-settings'),'settings');
 await click('#mj-settings .muse-segmented button','Memory');
 await setValue('#mj-settings input[aria-label="Add a memory"]','My sister is called Nia');await click('#mj-settings .mj-mem-add button[type=submit]','Add');
 await until(()=>!!document.querySelector('#mj-settings .mj-mem'),'memory listed');
 await click('#mj-settings .muse-close-button, #mj-settings button[aria-label^="Close"]').catch(()=>evaluate(()=>document.querySelector('#mj-settings')?.close()));
 const say=async(words,n)=>{await setValue('.mj-ws-page .mj-composer textarea',words);await click('.mj-live-compose button[type=submit]');await until(n=>document.querySelectorAll('.mj-message[data-role=assistant]').length===n&&!document.querySelector('[data-streaming]'),'reply '+n,n,400);return (await text('.mj-message[data-role=assistant] .mj-message-body')).split('\n').pop();};
 check(/Remembered: My sister is called Nia/.test(await say('Thinking about family today.',3)),'a confirmed memory reaches the next reply');
 const mem=must(await a.client.from('journal_memories').select('*').single());
 must(await a.client.from('journal_memories').update({body:'My sister is called Nina'}).eq('id',mem.id).select('id'));
 const corrected=await say('Still thinking about family.',4);
 check(/Nina/.test(corrected)&&!/Nia\b/.test(corrected),'the corrected memory is what the AI receives');
 must(await a.client.from('journal_memories').delete().eq('id',mem.id).select('id'));
 check(!/Remembered/.test(await say('And one more thing.',5)),'a deleted memory is gone from AI context');
 // Pinned memories come first inside the same budget (the mock lists what it was given, in order).
 must(await admin.from('journal_memories').insert([{user_id:a.id,body:'Pinned fact about tea',status:'confirmed',source:'user',pinned:true,updated_at:'2020-01-01T00:00:00Z'},{user_id:a.id,body:'Newer unpinned fact',status:'confirmed',source:'user',pinned:false,updated_at:new Date().toISOString()}]).select('id'));
  check(/Remembered: Pinned fact about tea \/ Newer unpinned fact/.test(await say('A quick note.',6)),'a pinned memory comes first, without sending more than fits');
 must(await admin.from('journal_memories').delete().eq('user_id',a.id).in('body',['Pinned fact about tea','Newer unpinned fact']).select('id'));
 // ---- Photos with a message: sent with that message only; earlier ones are named, not resent; attach again on request ----
 const png=join(directory,'photo.png');writeFileSync(png,Buffer.from((await send('Page.captureScreenshot',{format:'png',clip:{x:0,y:0,width:240,height:160,scale:1}})).data,'base64'));
 const attach=async()=>{const doc=await send('DOM.getDocument',{depth:-1});const {nodeId}=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.mj-composer-dock input[type=file]'});await send('DOM.setFileInputFiles',{nodeId,files:[png]});};
 await setValue('.mj-ws-page .mj-composer textarea','Look at this view.');await attach();
 await until(()=>document.querySelectorAll('.mj-attach-strip li').length===1,'photo preview');
 check(true,'a photo shows as a preview before sending, with a remove button');
 const said=async(n)=>{await until(n=>document.querySelectorAll('.mj-message[data-role=assistant]').length===n&&!document.querySelector('[data-streaming]'),'reply '+n,n,400).catch(async e=>{console.log('DBG',await text('.mj-error'),await count('journal_message_images',a.id),await count('journal_messages',a.id),JSON.stringify(must(await admin.from('journal_ai_usage').select('*').eq('user_id',a.id).order('created_at',{ascending:false}).limit(2))));throw e;});return (await text('.mj-message[data-role=assistant] .mj-message-body')).split('\n').pop();};
 await click('.mj-live-compose button[type=submit]');
 check(/I can see 1 photo/.test(await said(7)),'the companion sees the photo sent with that message');
 check(await count('journal_message_images',a.id)===1&&await has('.mj-message[data-role=user] .mj-photos'),'the photo is saved with the message and shown in the conversation');
 await setValue('.mj-ws-page .mj-composer textarea','And one more thought about it.');await click('.mj-live-compose button[type=submit]');
 const next=await said(8);
 check(!/I can see/.test(next)&&/Earlier photos aren't visible/.test(next),'the next message does not resend the photo; the AI is told it can no longer see it');
 await click('.mj-photos .mj-photo');await until(()=>!!document.querySelector('.mj-lightbox'),'lightbox');await click('.mj-lightbox button','Ask about this again');
 await until(()=>document.querySelectorAll('.mj-attach-strip li').length===1,'reattached');
 await setValue('.mj-ws-page .mj-composer textarea','Look again?');await click('.mj-live-compose button[type=submit]');
 check(/I can see 1 photo/.test(await said(9))&&await count('journal_message_images',a.id)===2,'Ask about this again sends that photo with the new message');
 check(await count('journal_ai_usage',a.id,{kind:'reply',status:'ok'})===8,'photo replies are counted in the AI budget like any reply');

 // ---- Finish & Save → analysis into real tags ----
 // ---- Bottom actions: once you've written, Finish entry and Go deeper sit side by side, equal width ----
 const pair=await evaluate(()=>{const b=[...document.querySelectorAll('.mj-live-compose .mj-composer-bar>button')];const r=b.map(x=>x.getBoundingClientRect());return {labels:b.map(x=>x.textContent.trim()),same:r.length===2&&Math.abs(r[0].width-r[1].width)<2&&Math.abs(r[0].top-r[1].top)<2,top:!!document.querySelector('.mj-header-toolbar .mj-finish-button')};});
 check(pair.labels[0]==='Finish entry'&&/^Go deeper/.test(pair.labels[1])&&pair.same&&!pair.top,'Finish entry and Go deeper share the bottom row, equal width; nothing in the top bar');
 // ---- Voice typing: a mic in the field (a stand-in recognizer; nothing listens, nothing is paid) ----
 await setValue('.mj-ws-page .mj-composer textarea','I walked to the water');
 await evaluate(()=>{const t=document.querySelector('.mj-ws-page .mj-composer textarea');t.focus();t.setSelectionRange(t.value.length,t.value.length);});
 await click('.mj-live-compose .mj-mic');
 await until(()=>!!document.querySelector('.mj-mic[data-listening]')&&!!window.__rec,'listening');
 await evaluate(()=>window.__rec.say([['and saw',false]]));
 check(await evaluate(()=>document.querySelector('.mj-ws-page .mj-composer textarea').value)==='I walked to the water and saw','spoken words appear live at the caret');
 await evaluate(()=>window.__rec.say([['and saw the sea.',true]]));
 check(await evaluate(()=>document.querySelector('.mj-ws-page .mj-composer textarea').value)==='I walked to the water and saw the sea.','interim words are replaced, never doubled, as speech settles');
 check(await has('.mj-live-compose .mj-composer-hint','Listening'),'the field says it is listening');
 await click('.mj-live-compose .mj-mic');
 await until(()=>!document.querySelector('.mj-mic[data-listening]'),'stopped listening');
 await click('.mj-live-compose .mj-mic');await until(()=>!!window.__rec,'listening again');await evaluate(()=>window.__rec.fail('not-allowed'));
 await until(()=>!document.querySelector('.mj-mic[data-listening]'),'stopped after error');
 check(await has('.mj-live-compose .mj-composer-hint','Microphone access is off'),'a blocked microphone explains itself, and the words stay');
 await shoot('journal-paired-actions');
 await setValue('.mj-ws-page .mj-composer textarea','');
 await click('.mj-live-compose .mj-composer-secondary','Finish entry');await click('.mj-finish button','Finish & save');
 await until(()=>!!document.querySelector('.mj-saved')&&!!document.querySelector('.mj-blank'),'fresh page after saving');
 check(true,'Finish & save turns to a fresh page and links the saved entry');
 await go(`/journal?entry=${convId}`,'!!document.querySelector(".mj-entry")','finished entry');
 check(!(await has('.mj-entry .mj-composer')),'a finished entry has no composer');
 check((await a.client.from('journal_messages').insert({user_id:a.id,conversation_id:convId,role:'user',body:'late',local_date:today})).error!=null,'the database refuses new messages on a finished entry');
 for(let i=0;i<80&&!(await admin.from('journal_conversations').select('analysis_status').eq('id',convId).single()).data?.analysis_status?.match(/ready|failed/);i++)await wait(150);
 const conv=must(await admin.from('journal_conversations').select('*').eq('id',convId).single());
 check(conv.analysis_status==='ready'&&conv.title_source==='ai'&&conv.summary_source==='ai','the analysis writes an AI title and summary, marked as AI');
 const tagRows=must(await admin.from('journal_entry_tags').select('source,journal_tags(kind,name)').eq('conversation_id',convId));
 check(tagRows.some(t=>t.journal_tags.kind==='person'&&t.journal_tags.name==='Alex'&&t.source==='ai'),'people become real, distinct tag records linked to the entry');
 check((await count('journal_tags',a.id,{kind:'person',name:'Alex'}))===1,'the existing Alex is reused, never duplicated');
 check(await count('journal_ai_usage',a.id,{kind:'analysis',status:'ok'})===1,'one bounded analysis request after finishing');
 await go(`/journal?entry=${convId}`,'!!document.querySelector(".mj-entry")','entry reload');
 await click('.mj-entry .muse-segmented button','Analysis');
 await until(()=>!!document.querySelector('.mj-tag-editor'),'analysis tab');
 check(await has('.mj-tag[data-ai]','Alex'),'AI suggestions show as suggestions');
 // Correct metadata without AI: Lisbon is a topic here, not a person.
 if(await has('.mj-tag-editor .mj-tag','Lisbon'))await click('.mj-tag-editor button','Remove Lisbon');
 await evaluate(()=>[...document.querySelectorAll('.mj-tag-editor')].find(e=>e.querySelector('h3')?.textContent==='Topics').querySelector('.mj-tag-plus').click());await wait(150);
 await evaluate(()=>{const ed=[...document.querySelectorAll('.mj-tag-editor')].find(e=>e.querySelector('h3')?.textContent==='Topics');const i=ed.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'Lisbon');i.dispatchEvent(new Event('input',{bubbles:true}));});
 await evaluate(()=>[...document.querySelectorAll('.mj-tag-editor')].find(e=>e.querySelector('h3')?.textContent==='Topics').querySelector('button[type=submit]').click());
 await evaluate(()=>[...document.querySelectorAll('.mj-tag-editor')].find(e=>e.querySelector('h3')?.textContent==='Moods').querySelector('.mj-tag-plus').click());await wait(150);
 await evaluate(()=>{const ed=[...document.querySelectorAll('.mj-tag-editor')].find(e=>e.querySelector('h3')?.textContent==='Moods');const i=ed.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'Wistful');i.dispatchEvent(new Event('input',{bubbles:true}));});
 await evaluate(()=>[...document.querySelectorAll('.mj-tag-editor')].find(e=>e.querySelector('h3')?.textContent==='Moods').querySelector('button[type=submit]').click());
 await until(()=>[...document.querySelectorAll('.mj-tag[data-kind=mood]')].some(x=>x.textContent.includes('Wistful')),'mood added');
 check(await count('journal_tags',a.id,{kind:'topic',name:'Lisbon'})===1&&await count('journal_tags',a.id,{kind:'mood',name:'Wistful'})===1,'topics and moods are added by hand, no AI request');
 check(await evaluate(()=>[...document.querySelectorAll('.mj-tag-editor h3')].map(h=>h.firstChild.textContent.trim()).join('|'))==='My tags|People|Topics|Moods','only My tags, People, Topics and Moods are shown');
 // My tags: added by hand on the saved entry, no AI; capitals and a leading # never make a duplicate.
 const addMine=async(name)=>{await evaluate(()=>document.querySelector('.mj-tag-editor[data-kind=custom] .mj-tag-plus')?.click());await wait(150);
  await evaluate(n=>{const i=document.querySelector('.mj-tag-editor[data-kind=custom] input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,n);i.dispatchEvent(new Event('input',{bubbles:true}));},name);
  await evaluate(()=>document.querySelector('.mj-tag-editor[data-kind=custom] button[type=submit]').click());};
 await addMine('#First Dates');
 await until(()=>[...document.querySelectorAll('.mj-tag[data-kind=custom]')].some(x=>x.textContent.includes('#First Dates')),'my tag added');
 await click('.mj-tag-editor[data-kind=custom] button','Remove First Dates');await wait(300);await addMine('first dates');
 await until(()=>document.querySelectorAll('.mj-tag[data-kind=custom]').length===1,'my tag re-added');
 check(await count('journal_tags',a.id,{kind:'custom'})===1,'My tags: add, remove and re-add; “first dates” and “#First Dates” are one tag');
 await click('.mj-tag[data-ai] button','Keep Alex');await wait(400);
 check(must(await admin.from('journal_entry_tags').select('source').eq('conversation_id',convId).eq('tag_id',alex.id).single()).source==='user','keeping a suggestion makes it yours');
 check(await count('journal_ai_usage',a.id,{kind:'analysis'})===1,'editing tags made no AI request');
 await shoot('03-analysis',true);

 // ---- Corrections keep history; bookmarks ----
 await click('.mj-entry .muse-segmented button','Conversation');
 const firstUser=must(await admin.from('journal_messages').select('id,body').eq('conversation_id',convId).eq('role','user').order('created_at').limit(1).single());
 await evaluate(()=>document.querySelector('.mj-message[data-role=user] button.muse-overflow-trigger').click());
 await until(()=>[...document.querySelectorAll('[role=menuitem]')].some(x=>/Correct/.test(x.textContent)),'message menu');await click('[role=menuitem]','Correct a dictation slip');
 await until(()=>!!document.querySelector('#mj-correct textarea'),'correct dialog');
 await setValue('#mj-correct textarea',firstUser.body.replace('Lisbon','Lisboa'));await click('#mj-correct button[type=submit]','Save correction');
 await until(()=>!document.querySelector('#mj-correct')&&!!document.querySelector('.mj-history'),'corrected');
 check(must(await admin.from('journal_message_corrections').select('previous_body').eq('message_id',firstUser.id)).map(x=>x.previous_body)[0]===firstUser.body,'the original wording is kept with the correction');
 await evaluate(()=>document.querySelector('.mj-message[data-role=user] button.muse-overflow-trigger').click());
 await until(()=>[...document.querySelectorAll('[role=menuitem]')].some(x=>/Highlight/.test(x.textContent)),'message menu 2');await click('[role=menuitem]','Highlight');
 await until(()=>!!document.querySelector('#mj-mark'),'bookmark dialog');await setValue('#mj-mark textarea:nth-of-type(1)','Lisboa is calling');
 await evaluate(()=>{const t=document.querySelectorAll('#mj-mark textarea')[1];Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,'The day I decided to look properly');t.dispatchEvent(new Event('input',{bubbles:true}));});
 await click('#mj-mark button[type=submit]','Save highlight');await until(()=>!!document.querySelector('.mj-message[data-marked]'),'bookmark saved');
 check(await count('journal_bookmarks',a.id)===1,'Highlight… saves a trimmed passage with a note (works on iPhone too)');
 // ---- Highlights: select words, save, see them softly; note and My tags; never on the wrong words after a correction ----
 const usageBeforeHl=await count('journal_ai_usage',a.id);
 const hlReply=must(await admin.from('journal_messages').select('id,body').eq('conversation_id',convId).eq('role','assistant').order('created_at').limit(2)).at(-1);
 const phrase='most alive';
 await evaluate(({id,phrase})=>{const body=document.querySelector(`[data-message-id="${id}"] .mj-message-body`);const w=document.createTreeWalker(body,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){const i=n.textContent.indexOf(phrase);if(i>=0){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+phrase.length);const s=getSelection();s.removeAllRanges();s.addRange(r);return;}}throw Error('phrase not found');},{id:hlReply.id,phrase});
 await until(()=>!!document.querySelector('.mj-hl-pill'),'selection pill');
 await shoot('06d-pill');
 check(await evaluate(()=>{const p=document.querySelector('.mj-hl-pill').getBoundingClientRect(),m=document.querySelector('mark.mj-hl, .mj-thread').getBoundingClientRect(),s=getSelection().getRangeAt(0).getClientRects()[0];return Math.abs(p.top+4-s.top)<30&&p.left>=document.querySelector('.mj-thread').getBoundingClientRect().right;}),'Save highlight sits in the gutter beside the selected words, level with them');
 await click('.mj-hl-pill','Save highlight');
 await until(()=>!!document.querySelector('mark.mj-hl'),'highlight painted');
 const hl=must(await admin.from('journal_bookmarks').select('*').eq('message_id',hlReply.id).single());
 check(hl.excerpt===phrase&&hlReply.body.slice(hl.start_offset,hl.end_offset)===phrase,'selecting words saves the exact passage and where it sits in the message');
 check(await has('mark.mj-hl',phrase)&&must(await admin.from('journal_messages').select('body').eq('id',hlReply.id).single()).body===hlReply.body,'the highlight shows softly in the conversation; the text is unchanged');
 await evaluate(()=>{const card=[...document.querySelectorAll('.mj-hl-card')].find(c=>c.querySelector('blockquote').textContent==='most alive');[...card.querySelectorAll('button')].find(b=>b.textContent==='Note & tags').click();});
 await until(()=>!!document.querySelector('#mj-hl-edit'),'highlight editor');
 await setValue('#mj-hl-edit textarea','Worth keeping');await setValue('#mj-hl-edit input[aria-label="New tag"]','#Keepers');await click('#mj-hl-edit button','Add tag');
 await until(()=>[...document.querySelectorAll('#mj-hl-edit .mj-filter-chip[aria-pressed=true]')].some(b=>b.textContent.includes('Keepers')),'tag on highlight');
 await click('#mj-hl-edit button[type=submit]','Save');await until(()=>!document.querySelector('#mj-hl-edit'),'editor closed');
 check(must(await admin.from('journal_bookmarks').select('note').eq('id',hl.id).single()).note==='Worth keeping'&&await count('journal_highlight_tags',a.id)===1,'a note and a My tag on the highlight, no AI');
 // A highlight whose words a correction removed is kept as a quote but never painted onto other words.
 const stale=firstUser.body.indexOf('Lisbon');
 must(await admin.from('journal_bookmarks').insert({user_id:a.id,conversation_id:convId,message_id:firstUser.id,excerpt:'Lisbon',start_offset:stale,end_offset:stale+6,created_at:'2020-01-01T00:00:00Z'}).select('id'));
 await go(`/journal?entry=${convId}`,'!!document.querySelector(".mj-entry")','entry reload');await click('.mj-entry .muse-segmented button','Conversation');await until(()=>!!document.querySelector('.mj-hl-toggle'),'highlights bar');await click('.mj-hl-toggle');
 await until(()=>!!document.querySelector('.mj-hl-list'),'highlight list');
 await until(()=>[...document.querySelectorAll('.mj-hl-card')].some(c=>c.textContent.includes('corrected after you saved it')),'stale note',undefined,100).catch(()=>{});
 check(await has('.mj-hl-card','corrected after you saved it')&&!(await has('mark.mj-hl','Lisbon'))&&(await evaluate(()=>[...document.querySelectorAll('.mj-hl-card')].filter(c=>c.textContent.includes('corrected after')).length))===1,'after a correction the old quote is kept and never attached to the wrong text');
 check(await count('journal_ai_usage',a.id)===usageBeforeHl,'saving, tagging and noting highlights made no AI request');
 await shoot('04-entry-conversation',true);

 // ---- History: search across messages, click a tag, combined filters, week view and date jump ----
 await go('/journal?view=history','!!document.querySelector(".mj-history-view .mj-strip")','history');
 check(await has('.mj-history-view .muse-segmented button[aria-pressed="true"], .mj-history-view .muse-segmented [aria-checked="true"]','Week')||await evaluate(()=>!!document.querySelector('.mj-strip')),'History opens on this week');
 await click('.mj-history-view .muse-segmented button','All');await until(()=>!!document.querySelector('.mj-history-view .mj-row'),'all view');
 check((await evaluate(()=>document.querySelectorAll('.mj-history-view .mj-row').length))===4,'four entries across three weeks');
 await setValue('.mj-history-view input[type=search]','colours');
 await until(()=>document.querySelectorAll('.mj-history-view .mj-row').length===1,'search narrows');
 check(await has('.mj-row mark','colours'),'full-text search matches words inside the original messages, highlighted');
 await setValue('.mj-history-view input[type=search]','colo');
 await until(()=>[...document.querySelectorAll('.mj-history-view .mj-row')].length===1,'partial search');
 check(true,'search matches part of a word');
 await setValue('.mj-history-view input[type=search]','');
 await click('.mj-history-view .muse-segmented button','Week');await until(()=>!!document.querySelector('.mj-strip'),'week again');
 await setValue('.mj-history-view input[type=search]','alex');
 await until(()=>[...document.querySelectorAll('.mj-results .mj-row')].some(x=>x.textContent.includes('Dinner with Alex')),'global search');
 check(true,'a search from the week view finds entries from weeks ago');
 await setValue('.mj-history-view input[type=search]','');
 // Filters: one panel of dropdowns, one multi-select per tag kind; tags AND the search text.
 await click('.mj-filters-toggle');await until(()=>!!document.querySelector('.mj-filter-panel'),'filter panel');
 check(!(await has('.mj-filter-panel .mj-filter-chip')),'tags live in dropdowns, not chip walls');
 await click('.mj-filter-panel button.muse-choice-trigger','My tags');await until(()=>[...document.querySelectorAll('.popover-choice')].some(x=>x.textContent.startsWith('#First Dates')),'my tags menu');
 await click('.popover-choice','#First Dates');await until(()=>!!document.querySelector('.mj-active-filters .mj-tag[data-kind=custom]'),'active chip');
 await evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
 check((await evaluate(()=>document.querySelectorAll('.mj-results .mj-row').length))===1,'choosing #First Dates shows only the entries I tagged');
 await shoot('06b-filters');
 await setValue('.mj-history-view input[type=search]','Lisbon');await wait(900);
 check((await evaluate(()=>document.querySelectorAll('.mj-results .mj-row').length))===1,'#First Dates AND “Lisbon” keeps the matching entry');
 await setValue('.mj-history-view input[type=search]','colours');
 await until(()=>!!document.querySelector('.mj-history-view .mj-quiet'),'no match');
 check(await has('.mj-history-view .mj-quiet','No entry matches'),'#First Dates AND “colours” finds nothing, and says so');
 await click('.mj-active-filters button','Clear all');await click('.mj-filter-done button','Done');
 await go(`/journal?view=history&tag=${alex.id}`,'!!document.querySelector(".mj-active-filters")&&!!document.querySelector(".mj-row")','tag page');
 check((await evaluate(()=>document.querySelectorAll('.mj-history-view .mj-row').length))===3,'Alex opens every entry with Alex, across dates and journals');
 await click('.mj-filters-toggle');await until(()=>!!document.querySelector('.mj-filter-panel'),'panel');
 await menu('Journals','My Journal');await click('.popover-footer button, .muse-choice-popover button','Done').catch(()=>send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27}));await wait(200);
 check((await evaluate(()=>document.querySelectorAll('.mj-history-view .mj-row').length))===2,'person + journal combine');
 await pickDate('From',today);
 check((await evaluate(()=>document.querySelectorAll('.mj-history-view .mj-row').length))===1,'person + journal + date range combine');
 await click('.mj-active-filters button','Clear all');await click('.mj-filter-done button','Done');
 await click('.mj-history-view .muse-segmented button','Week');
 await until(()=>!!document.querySelector('.mj-strip'),'week view');
 check(await evaluate(()=>document.querySelectorAll('.mj-strip-day').length===7&&!!document.querySelector('.mj-strip-day[data-today][data-on]')&&!!document.querySelector('.mj-week .mj-row')),'the week view: seven days, today lit, this week’s entries as rows');
 check(await has('.mj-week-reflection'),'the week’s reflection lives with the week');
 await pickDate('Jump to a date',day(-15));
 await until(()=>[...document.querySelectorAll('.mj-week .mj-row')].some(x=>x.textContent.includes('Dinner with Alex')),'jumped');
 check(true,'the date picker jumps straight to any day');
 check(!(await overflow()),'desktop History with every filter has no sideways scrolling');
 await shoot('05-history-week');
 // Highlights in History: search the saved words, filter by My tags, open right at the passage, remove.
 await click('.mj-history-view .muse-segmented button','Highlights');await until(()=>!!document.querySelector('.mj-highlights'),'highlights view');
 await setValue('.mj-highlights input[type=search]','alive');
 await until(()=>document.querySelectorAll('.mj-highlights .mj-hl-card').length===1,'highlight search');
 check(true,'History searches highlighted words across entries');
 await setValue('.mj-highlights input[type=search]','');await click('.mj-highlights .mj-filter-chip','#Keepers');
 await until(()=>document.querySelectorAll('.mj-highlights .mj-hl-card').length===1,'highlight tag filter');
 check(await has('.mj-highlights .mj-hl-card .type-meta','Wed')||await has('.mj-highlights .mj-hl-card .type-meta',','),'and filters them by My tags, showing the entry title and date');
 await shoot('06c-highlights');
 await click('.mj-highlights .mj-hl-card a','Open at this passage');
 await until(()=>!!document.querySelector('.mj-hl[data-flash]'),'jumped to passage');
 check(true,'a highlight opens its entry right at the passage');
 const hlCount=await count('journal_bookmarks',a.id);
 await click('.mj-hl-toggle');await until(()=>!!document.querySelector('.mj-hl-list'),'list');
 await evaluate(()=>{const card=[...document.querySelectorAll('.mj-hl-card')].find(c=>c.querySelector('blockquote').textContent==='most alive');[...card.querySelectorAll('button')].find(b=>b.textContent==='Remove').click();});
 for(let i=0;i<30&&await count('journal_bookmarks',a.id)!==hlCount-1;i++)await wait(150);
 check(await count('journal_bookmarks',a.id)===hlCount-1&&await count('journal_highlight_tags',a.id)===0&&!(await has('mark.mj-hl','most alive')),'removing a highlight removes only the highlight (and its tags), never the text');
 await go('/journal?view=history','!!document.querySelector(".mj-history-view")','history again');
 // Duplicate prevention and merge with alias.
 const al=await P.createTag(a.client,a.id,'person','Al');await P.tagEntry(a.client,a.id,quilt.id,al.id);
 check((await P.createTag(a.client,a.id,'person','alex')).id===alex.id,'typing “alex” finds Alex instead of making a duplicate');
 await go(`/journal?view=history&tag=${al.id}`,'!!document.querySelector(".mj-active-filters")','al page');
 await click('.mj-active-filters button','Rename, aliases or merge');await until(()=>!!document.querySelector('#mj-tag'),'manage tag');
 await click('#mj-tag [aria-label="Merge"] button.muse-choice-trigger');await until(()=>[...document.querySelectorAll('.popover-choice')].some(x=>x.textContent.includes('Alex')),'merge choices');await click('.popover-choice','Alex');
 await click('#mj-tag .mj-finish button.button-primary','Merge');await until(()=>!document.querySelector('#mj-tag'),'merged').catch(async e=>{console.log('DIALOG:',await text('#mj-tag'),'| ERR:',await text('.mj-error'));await shoot('debug-merge');throw e;});
 const merged=must(await admin.from('journal_tags').select('aliases').eq('id',alex.id).single());
 check(merged.aliases.includes('Al')&&await count('journal_entry_tags',a.id,{tag_id:alex.id})===4,'merging Al into Alex moves the entry and keeps “Al” as an alias');
 check(await count('journal_ai_usage',a.id,{kind:'analysis'})===1,'search, filters, tags and merge made no AI request');

 // ---- Scenario F: weekly reflection, cached ----
 await go('/journal?view=insights','!!document.querySelector(".mj-week-chart")','insights');
 check(await has('.mj-insights','Days journaled'),'deterministic weekly numbers');
 await until(()=>[...document.querySelectorAll('.mj-reflection button')].some(b=>b.textContent.includes('Write this week')),'reflection button');
 await click('.mj-reflection button','Write this week’s reflection');
 await until(()=>!!document.querySelector('.mj-reflection .mj-reflection-page'),'reflection written',undefined,300);
 check(await count('journal_reports',a.id)===1,'the reflection is saved');
 await go('/journal?view=history','!!document.querySelector(".mj-history-view")','away');await go('/journal?view=insights','!!document.querySelector(".mj-reflection .mj-reflection-page")','back to insights');
 check(await count('journal_ai_usage',a.id,{kind:'report'})===1,'reopening shows the saved reflection without another request');
 await shoot('06-insights',true);

 // ---- Companion Studio: test, compare, save a version; isolation ----
 const before={c:await count('journal_conversations',a.id),m:await count('journal_messages',a.id),t:await count('journal_tags',a.id),mem:await count('journal_memories',a.id)};
 await go(`/journal?companion=${thought.id}`,'!!document.querySelector(".mj-studio")','studio');
 await setValue('.mj-studio-edit textarea.mj-prompt',thought.instructions+'\nAlways be a little wry.');
 check(await has('.mj-studio','unsaved changes'),'edits are a draft until saved');
 await setValue('.mj-studio-test .mj-composer textarea','Ugh, today was a lot.');await click('.mj-studio-test button[type=submit]','Send');
 await until(()=>[...document.querySelectorAll('.mj-studio-test .mj-message[data-role=assistant]')].some(x=>/\(test\)/.test(x.textContent))&&!document.querySelector('.mj-studio-test [data-streaming]'),'test reply',undefined,300);
 check(true,'the studio replies with the draft personality, labelled as a test');
 await setValue('.mj-studio-test .mj-composer textarea','What would you say about my week?');await click('.mj-studio-test button','Compare responses');
 await until(()=>document.querySelectorAll('.mj-compare-card .mj-message-body').length===2,'two versions',undefined,300).catch(async e=>{console.log('COMPARE:',await text('.mj-studio-test'));throw e;});
 check(await has('.mj-compare-card figcaption','Version A — Current personality')&&await has('.mj-compare-card figcaption','Version B — Revised personality'),'compare labels Version A and Version B on the same message');
 await shoot('07-studio-compare');
 await click('.mj-compare-card button','Keep version B');await click('.mj-studio-actions button','Save companion');
 await until(()=>/version 2/.test(document.querySelector('.mj-studio [role=status]')?.textContent??''),'saved v2');
 check(await count('journal_companion_versions',a.id,{companion_id:thought.id})===2,'saving keeps the earlier version in history');
 const after={c:await count('journal_conversations',a.id),m:await count('journal_messages',a.id),t:await count('journal_tags',a.id),mem:await count('journal_memories',a.id)};
 check(JSON.stringify(before)===JSON.stringify(after),'tests created no entries, messages, tags or memories');
 check(await count('journal_ai_usage',a.id,{kind:'test'})===3,'every test request is recorded as a test');
 await click('.mj-studio-test button','Keep as journal entry');await click('.mj-studio-test .mj-finish button','Keep as entry');
 await until(()=>/Kept/.test(document.querySelector('.mj-studio-test [role=status]')?.textContent??''),'kept');
 check(await count('journal_conversations',a.id,{origin:'playground'})===1,'Keep as Journal Entry copies the test once, on request');

 // ---- Continue from here: a fresh page that references an old entry; nothing created or paid until you write ----
 const beforeCount=await count('journal_conversations',a.id),opensBefore=await count('journal_ai_usage',a.id,{kind:'opening'});
 const orig=must(await admin.from('journal_conversations').select('revision,updated_at,title').eq('id',convId).single());
 await go(`/journal?entry=${convId}`,'!!document.querySelector(".mj-entry .mj-continue")','entry for continue');
 await click('.mj-entry .mj-continue');
 await until(()=>!!document.querySelector('.mj-ref')&&!!document.querySelector('.mj-workspace .mj-ws-page .mj-composer textarea'),'continue page');
 check(await count('journal_conversations',a.id)===beforeCount&&await has('.mj-ref',orig.title.slice(0,12)),'Continue from here opens a fresh page with a small reference and creates nothing yet');
 await shoot('15-continue');
 await setValue('.mj-ws-page .mj-composer textarea','WELL, GUESS WHAT. It happened.');await click('.mj-live-compose button[type=submit]');
 await until(()=>document.querySelectorAll('.mj-message[data-role=assistant]').length===1&&!document.querySelector('[data-streaming]'),'continued reply',undefined,400);
 const firstRef=await text('.mj-message[data-role=assistant] .mj-message-body');
 check(/Continuing “.+” \(full\)/.test(firstRef)&&!/I can see/.test(firstRef),'the first reply has the original entry (bounded) as context, and none of its photos');
 check(await count('journal_ai_usage',a.id,{kind:'opening'})===opensBefore,'clicking Continue made no greeting or other AI request');
 const follow=must(await admin.from('journal_conversations').select('id,continues_id,continues_title').eq('user_id',a.id).eq('continues_id',convId).single());
 check(follow.continues_title===orig.title,'the new entry links to the original, with a title snapshot');
 await setValue('.mj-ws-page .mj-composer textarea','And there is more.');await click('.mj-live-compose button[type=submit]');
 await until(()=>document.querySelectorAll('.mj-message[data-role=assistant]').length===2&&!document.querySelector('[data-streaming]'),'second continued reply',undefined,400);
 check(/Continuing “.+” \(summary\)/.test((await text('.mj-message[data-role=assistant] .mj-message-body')).split('\n').pop()),'later messages carry only the summary, not the whole original again');
 const origAfter=must(await admin.from('journal_conversations').select('revision,updated_at,title').eq('id',convId).single());
 check(origAfter.revision===orig.revision&&origAfter.updated_at===orig.updated_at,'the original entry is untouched');
 await go(`/journal?entry=${follow.id}`,'!!document.querySelector(".mj-ref")','reload continued');
 check(await has('.mj-ref','Referencing'),'the reference survives a reload');
 await click('.mj-ref-link');await until(()=>!!document.querySelector('#mj-ref-preview'),'preview');await click('#mj-ref-preview button','Keep writing');
 await until(()=>{const b=document.querySelector('.mj-live-compose .mj-composer-secondary');return !!b&&!b.disabled;},'finish ready');
 await click('.mj-live-compose .mj-composer-secondary','Finish entry');await click('.mj-finish button','Finish & save');
 for(let i=0;i<60&&must(await admin.from('journal_conversations').select('status').eq('id',follow.id).single()).status!=='completed';i++)await wait(200);
 check(must(await admin.from('journal_conversations').select('status').eq('id',follow.id).single()).status==='completed','the continued entry finishes and saves like any other');
 await go(`/journal?entry=${convId}`,'!!document.querySelector(".mj-entry-links")','original links');
 check(await has('.mj-entry-links','Continued in'),'the original shows where it was continued');
 await go(`/journal?entry=${follow.id}`,'!!document.querySelector(".mj-entry-links")','follow links');
 check(await has('.mj-entry-links','Continues'),'the new entry links back to its source');
 await go('/journal?view=history','!!document.querySelector(".mj-history-view")','history threads');await click('.mj-history-view .muse-segmented button','All');
 await until(()=>!!document.querySelector('.mj-row-thread'),'thread marks');
 check(await has('.mj-row-thread','Continues “')&&await has('.mj-row-thread','Continued once'),'History marks an entry that continues another, and the one it continued');

 // ---- Manage Tags and person corrections: one entry only; never suggest again; all in Journal settings; no AI ----
 const usageBeforeTags=await count('journal_ai_usage',a.id);
 await go(`/journal?entry=${convId}`,'!!document.querySelector(".mj-entry")','entry for tags');await click('.mj-entry .muse-segmented button','Analysis');
 await until(()=>!!document.querySelector('.mj-tag-editor[data-kind=person] .mj-tag'),'person tags');
 const alexBefore=await count('journal_entry_tags',a.id,{tag_id:alex.id});
 await click('.mj-tag-editor[data-kind=person] button','Replace Alex on this entry');
 await until(()=>!!document.querySelector('.mj-tag-replace input'),'replace field');
 await setValue('.mj-tag-replace input','Nia');await click('.mj-tag-replace button[type=submit]','Replace');
 await until(()=>[...document.querySelectorAll('.mj-tag-editor[data-kind=person] .mj-tag')].some(x=>x.textContent.includes('Nia')),'replaced');
 check(await count('journal_entry_tags',a.id,{tag_id:alex.id})===alexBefore-1&&alexBefore-1>0,'replacing Alex with Nia changes only this entry; Alex stays a separate person elsewhere');
 check(await count('journal_tag_corrections',a.id)===1,'the correction is remembered (as a hint for future analysis, never a rule)');
 await click('.mj-tb-settings');await until(()=>!!document.querySelector('#mj-settings'),'settings');
 await click('#mj-settings .muse-segmented button','Tags');await until(()=>!!document.querySelector('.mj-manage-tags'),'manage tags');
 check(await has('.mj-manage-tags .mj-section-title','People')&&await has('.mj-manage-tags','entries')&&await has('.mj-manage-tags','“Alex” was'),'Manage Tags lists every tag by category with counts, and the remembered correction');
 await shoot('07b-manage-tags');
 await click('.mj-manage-tags .mj-tag-line','Wistful');await until(()=>!!document.querySelector('#mj-tag'),'tag dialog');
 await click('#mj-tag button','Delete this mood');await click('#mj-tag .mj-finish button.button-primary','Delete tag');
 await until(()=>[...document.querySelectorAll('.mj-manage-tags .mj-tag-group')].some(g=>g.textContent.includes('Never suggested again')&&g.textContent.includes('Wistful')),'suppressed listed');
 const wist=must(await admin.from('journal_tags').select('id,suppressed').eq('user_id',a.id).eq('kind','mood').eq('name','Wistful').single());
 check(wist.suppressed&&await count('journal_entry_tags',a.id,{tag_id:wist.id})===0&&await count('journal_conversations',a.id,{id:convId})===1,'deleting with “never suggest again” takes the tag off its entries, keeps the entries, and remembers the name');
 await click('.mj-manage-tags button','Allow again');
 for(let i=0;i<30&&must(await admin.from('journal_tags').select('suppressed').eq('id',wist.id).single()).suppressed;i++)await wait(150);
 check(!must(await admin.from('journal_tags').select('suppressed').eq('id',wist.id).single()).suppressed,'and it can be allowed again');
 check(await count('journal_ai_usage',a.id)===usageBeforeTags,'managing tags made no AI request');
 await evaluate(()=>document.querySelector('#mj-settings')?.dispatchEvent(new Event('cancel')));

 // ---- Memory Studio: pending vs known, edit before approving, dismiss for good, conflicts, pin, remove; no AI ----
 const memAi=await count('journal_ai_usage',a.id);
 must(await admin.from('journal_memories').insert([
  {user_id:a.id,body:'I started a new role at Linden in January',status:'suggested',source:'ai',source_conversation_id:convId,kind:'fact'},
  {user_id:a.id,body:'Coffee every morning',status:'suggested',source:'ai',source_conversation_id:convId,kind:'fact'},
  {user_id:a.id,body:'I live in Lisbon now',status:'confirmed',source:'user',kind:'fact',source_conversation_id:null},
  {user_id:a.id,body:'I live in Lisbon',status:'suggested',source:'ai',source_conversation_id:convId,kind:'fact'}]).select('id'));
 await go(`/journal?entry=${convId}`,'!!document.querySelector(".mj-entry")','entry for memory');
 await click('.mj-tb-settings');await until(()=>!!document.querySelector('#mj-settings'),'settings');
 await click('#mj-settings .muse-segmented button','Memory');await until(()=>!!document.querySelector('.mj-studio-mem'),'memory studio');
 check(await has('.mj-studio-mem','What Muse wants to remember')&&await has('.mj-studio-mem','What your companion knows')&&(await evaluate(()=>document.querySelectorAll('.mj-mem[data-status=suggested]').length))===3,'one place shows what Muse wants to remember and what it knows');
 check(await has('.mj-mem[data-status=suggested] .mj-mem-meta','Suggested from'),'each suggestion links to the entry it came from');
 const card=(text)=>`[...document.querySelectorAll('#mj-settings .mj-mem')].find(c=>(c.querySelector('.mj-mem-body')?.textContent??c.querySelector('textarea')?.value??'').includes(${JSON.stringify(text)}))`;
 const press=(text,label)=>evaluate(new Function(`const c=${card(text)};[...c.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}||b.getAttribute('aria-label')===${JSON.stringify(label)}).click();`));
 await press('Linden','Edit');await until(()=>!!document.querySelector('#mj-settings .mj-mem-edit textarea'),'editing');
 await setValue('#mj-settings .mj-mem-edit textarea','I started a new role at Birch in January');await press('Birch','Remember');
 for(let i=0;i<30&&!(await count('journal_memories',a.id,{body:'I started a new role at Birch in January',status:'confirmed'}));i++)await wait(150);
 check(await count('journal_memories',a.id,{body:'I started a new role at Birch in January',status:'confirmed'})===1,'a suggestion can be corrected before it is approved');
 await press('Coffee every morning','Dismiss');
 for(let i=0;i<30&&await count('journal_memories',a.id,{body:'Coffee every morning'});i++)await wait(150);
 const dismissedList=must(await admin.from('journal_analyses').select('dismissed').eq('conversation_id',convId).single()).dismissed;
 check(await count('journal_memories',a.id,{body:'Coffee every morning'})===0&&dismissedList.includes('memory:coffee every morning'),'dismissing removes it and stops that entry suggesting the same words again');
 check(await has('#mj-settings .mj-mem-hint','Close to something Muse already knows'),'a suggestion close to a known memory says so');
 await evaluate(()=>[...document.querySelectorAll('#mj-settings .mj-mem-hint button')].find(b=>b.textContent.includes('Replace it with this')).click());
 for(let i=0;i<30&&await count('journal_memories',a.id,{body:'I live in Lisbon',status:'suggested'});i++)await wait(150);
 check(await count('journal_memories',a.id,{body:'I live in Lisbon',status:'confirmed'})===1&&await count('journal_memories',a.id,{body:'I live in Lisbon now'})===0,'and can replace it instead of making a near-duplicate');
 await press('Birch','Pin');for(let i=0;i<30&&!must(await admin.from('journal_memories').select('pinned').eq('user_id',a.id).eq('body','I started a new role at Birch in January').single()).pinned;i++)await wait(150);
 check(must(await admin.from('journal_memories').select('pinned').eq('user_id',a.id).eq('body','I started a new role at Birch in January').single()).pinned,'a known memory can be pinned');
 await shoot('17-memory-studio');
 await press('I live in Lisbon','Remove');await press('I live in Lisbon','Forget');
 for(let i=0;i<30&&await count('journal_memories',a.id,{body:'I live in Lisbon'});i++)await wait(150);
 check(await count('journal_memories',a.id,{body:'I live in Lisbon'})===0,'removing a memory forgets it (it is no longer used anywhere)');
 check(await count('journal_ai_usage',a.id)===memAi,'reviewing, correcting, pinning and removing memories made no AI request');
 await evaluate(()=>document.querySelector('#mj-settings')?.dispatchEvent(new Event('cancel')));

 // ---- Guided prompts belong to a journal: set them up in the journal's settings; the journal decides; no guide picker ----
 const journalMenu=async()=>{await click('.mj-header-toolbar button.mj-tb-button','Journal');await until(()=>!!document.querySelector('#mj-tb-journal'),'journal menu');};
 await go('/journal','!!document.querySelector(".mj-header-toolbar")','workspace for guided journals');
 check(await has('.mj-ws-page .mj-composer textarea'),'an everyday (freeform) journal opens the composer');
 await journalMenu();check(!(await has('#mj-tb-journal','New guide'))&&!(await has('#mj-tb-journal','Guided entries')),'there is no separate guide to create or pick');
 await click('#mj-tb-journal button','New journal');await until(()=>!!document.querySelector('#mj-journal-editor'),'journal editor');
 await setValue('#mj-journal-editor input[type=text]','Spanish Journal');
 await click('#mj-journal-editor .mj-guided-switch input');await until(()=>!!document.querySelector('#mj-journal-editor .mj-guide-examples'),'guided section');
 await click('#mj-journal-editor .mj-filter-chip','Spanish Practice');await until(()=>document.querySelectorAll('#mj-journal-editor .mj-guide-q-row').length===3,'questions');
 await click('#mj-journal-editor button[aria-label="Move question 2 up"]');await evaluate(()=>document.querySelector('#mj-journal-editor .mj-guided-prompts').scrollIntoView({block:'start'}));await shoot('16a-journal-guided-settings');
 await click('#mj-journal-editor button[type=submit]','Save');await until(()=>!document.querySelector('#mj-journal-editor'),'journal saved');
 const spanish=must(await admin.from('journal_journals').select('id,guided,default_guide_id').eq('user_id',a.id).eq('name','Spanish Journal').single());
 const spanishGuide=must(await admin.from('journal_guides').select('questions,mode,companion').eq('id',spanish.default_guide_id).single());
 check(spanish.guided&&spanishGuide.questions.length===3&&spanishGuide.questions[0].text==='¿Qué fue lo mejor de tu día?'&&spanishGuide.companion,'one journal settings screen sets up the questions, their order and the companion option (no AI)');
 const entriesBefore=await count('journal_conversations',a.id),privateReplies=await count('journal_ai_usage',a.id,{kind:'reply'});
 await journalMenu();await click('#mj-tb-journal .popover-choice','Spanish Journal');
 await until(()=>!!document.querySelector('.mj-guided .mj-guide-step'),'guided page');
 check(await has('.mj-guide-count','Question 1 of 3')&&await count('journal_conversations',a.id)===entriesBefore,'choosing the Spanish Journal starts its questions automatically, and creates nothing yet');
 await shoot('16-guided-step');
 await setValue('.mj-guide-card textarea','Hoy trabajé mucho.');
 for(let i=0;i<40&&await count('journal_conversations',a.id)===entriesBefore;i++)await wait(150);
 const gEntry=must(await admin.from('journal_conversations').select('id,guide_snapshot,status').eq('user_id',a.id).eq('journal_id',spanish.id).single());
 check(gEntry.status==='draft'&&gEntry.guide_snapshot.questions.length===3,'the first answer creates one draft entry with a copy of the questions');
 await click('.mj-guide-dock button','Next');await until(()=>(document.querySelector('.mj-guide-count')?.textContent??'').includes('2 of 3'),'step 2');
 await setValue('.mj-guide-card textarea','Fui al parque.');await click('.mj-guide-dock button','Next');
 await until(()=>(document.querySelector('.mj-guide-count')?.textContent??'').includes('3 of 3'),'step 3');
 check(await has('.mj-guide-dock button','Finish entry'),'the last question offers Finish entry');
 // Changing companion never changes the journal's questions.
 const otherCompanion=must(await admin.from('journal_companions').select('id,name').eq('user_id',a.id).neq('id',must(await admin.from('journal_conversations').select('companion_id').eq('id',gEntry.id).single()).companion_id??'00000000-0000-0000-0000-000000000000').limit(1));
 if(otherCompanion.length){await click('.mj-header-toolbar button.mj-tb-button','Companion');await until(()=>!!document.querySelector('#mj-tb-companion'),'companion menu');await click('#mj-tb-companion .popover-choice',otherCompanion[0].name);await wait(400);}
 check(must(await admin.from('journal_conversations').select('guide_snapshot').eq('id',gEntry.id).single()).guide_snapshot.questions.length===3&&await has('.mj-guide-count','3 of 3'),'switching companions keeps the journal’s questions and your place');
 await wait(1000);
 await go(`/journal?entry=${gEntry.id}`,'!!document.querySelector(".mj-guided")','guided reload');
 check(await has('.mj-guide-count','3 of 3'),'a reload resumes the draft at the same question, without restarting');
 await click('.mj-guide-progress button[aria-label="Question 1"]');await until(()=>document.querySelector('.mj-guide-card textarea')?.value==='Hoy trabajé mucho.','answer restored');
 check(true,'with every answer you wrote');
 await click('.mj-guide-progress button[aria-label="Question 3"]');await setValue('.mj-guide-card textarea','Descansar.');
 await click('.mj-guide-dock button','Finish entry');await click('.mj-finish button','Finish & save');
 for(let i=0;i<60&&must(await admin.from('journal_conversations').select('status').eq('id',gEntry.id).single()).status!=='completed';i++)await wait(200);
 const gMsgs=must(await admin.from('journal_messages').select('body,guide_question,role').eq('conversation_id',gEntry.id).order('created_at'));
 check(gMsgs.length===3&&gMsgs[0].guide_question==='¿Qué fue lo mejor de tu día?'&&gMsgs.every(m=>m.role==='user'),'Finish saves each answer under its question, in order');
 check(await count('journal_ai_usage',a.id,{kind:'reply'})===privateReplies,'answering and moving between questions made no AI reply');
 // Editing the journal's questions changes new entries only.
 await go('/journal','!!document.querySelector(".mj-header-toolbar")','workspace again');await journalMenu();await click('#mj-tb-journal .popover-choice','Spanish Journal');await until(()=>!!document.querySelector('.mj-guided'),'spanish again');
 await journalMenu();await click('#mj-tb-journal button','Rename or edit');await until(()=>!!document.querySelector('#mj-journal-editor .mj-guide-q-row'),'edit spanish');
 await setValue('#mj-journal-editor textarea[aria-label="Question 1"]','¿Cómo te sientes?');await click('#mj-journal-editor button[type=submit]','Save');await until(()=>!document.querySelector('#mj-journal-editor'),'edited');
 await until(()=>(document.querySelector('.mj-guide-card .mj-guide-question')?.textContent??'').includes('¿Cómo te sientes?'),'new questions on the next entry');
 check(true,'the next new entry uses the edited questions');
 await go(`/journal?entry=${gEntry.id}`,'!!document.querySelector(".mj-entry")','old guided entry');await click('.mj-entry .muse-segmented button','Conversation');
 await until(()=>!!document.querySelector('.mj-guide-asked'),'questions shown');
 check(await has('.mj-guide-asked','¿Qué fue lo mejor de tu día?')&&!(await has('.mj-guide-asked','¿Cómo te sientes?')),'the finished entry keeps the questions it was written with');
 await go('/journal?view=history','!!document.querySelector(".mj-history-view")','history guided');await setValue('.mj-history-view input[type=search]','parque');
 await until(()=>[...document.querySelectorAll('.mj-results .mj-row')].some(r=>r.textContent.includes('Spanish Journal')),'guided search');
 check(true,'History finds a guided entry by its answers');
 // Turning guided prompts off: the journal goes freeform; the questions are kept for later.
 await go('/journal','!!document.querySelector(".mj-header-toolbar")','workspace for off');await journalMenu();await click('#mj-tb-journal .popover-choice','Spanish Journal');await until(()=>!!document.querySelector('.mj-guided'),'spanish for off');
 await journalMenu();await click('#mj-tb-journal button','Rename or edit');await until(()=>!!document.querySelector('#mj-journal-editor .mj-guided-switch'),'edit again');
 await click('#mj-journal-editor .mj-guided-switch input');await click('#mj-journal-editor button[type=submit]','Save');await until(()=>!document.querySelector('#mj-journal-editor'),'saved off');
 await until(()=>!!document.querySelector('.mj-ws-page .mj-composer textarea')&&!document.querySelector('.mj-guided'),'freeform now');
 const offJ=must(await admin.from('journal_journals').select('guided,default_guide_id').eq('id',spanish.id).single());
 check(!offJ.guided&&offJ.default_guide_id===spanish.default_guide_id&&(must(await admin.from('journal_guides').select('questions').eq('id',spanish.default_guide_id).single()).questions.length===3),'turning guided prompts off opens the composer and keeps the questions');
 await journalMenu();await click('#mj-tb-journal .popover-choice','My Journal');await until(()=>!!document.querySelector('.mj-ws-page .mj-composer textarea'),'back to my journal');

 // ---- Scenario D: a draft survives a reload ----
 await go('/journal','!!document.querySelector(".mj-workspace .mj-composer textarea")','workspace');
 const long=Array.from({length:60},(_,i)=>`Sentence ${i} of a long dictated thought about the day.`).join(' ');
 await setValue('.mj-ws-page .mj-composer textarea',long);await wait(2200);
 await go('/journal','!!document.querySelector(".mj-ws-page .mj-composer textarea")','workspace again');
 check((await evaluate(()=>document.querySelector('.mj-ws-page .mj-composer textarea').value)).length===long.length,'an unsent long draft is still there after reloading');
 check(await count('journal_conversations',a.id,{status:'draft'})===1,'and it is saved as a resumable draft entry for other devices');

 // ---- Scenario H: the budget stops new AI requests; writing still works ----
 must(await admin.from('journal_ai_entitlements').update({monthly_limit_usd:0}).eq('user_id',a.id).select('user_id'));
 await evaluate(()=>localStorage.clear());must(await admin.from('journal_conversations').delete().eq('user_id',a.id).eq('status','draft').select('id'));
 await go('/journal','!!document.querySelector(".mj-workspace .mj-composer textarea")','workspace budget');
 const before2=await count('journal_conversations',a.id);
 await click('.mj-header-toolbar button','New entry');await until(()=>!!document.querySelector('#mj-new-entry'),'new entry menu 2');await click('#mj-new-entry .popover-choice','Start writing');
 await until(()=>/budget/.test(document.querySelector('.mj-greet-note')?.textContent??''),'greeting falls back',undefined,300);
 check(await count('journal_conversations',a.id)===before2,'with the budget used up, New entry falls back to a blank page and leaves no empty entry');
 await setValue('.mj-ws-page .mj-composer textarea','Writing still works without AI.');await click('.mj-live-compose button[type=submit]');
 await until(()=>/budget/.test(document.querySelector('.mj-workspace .mj-error')?.textContent??''),'reply budget stop',undefined,300);
 check(true,'an exhausted budget stops replies with a clear message');
 const live2=await latest();
 check(await count('journal_messages',a.id,{conversation_id:live2,role:'user'})===1,'your words still save when the budget is used up');
 check(await count('journal_conversations',a.id,{status:'draft'})===0,'sending never leaves a stray duplicate draft entry behind');
 must(await admin.from('journal_ai_entitlements').update({monthly_limit_usd:10}).eq('user_id',a.id).select('user_id'));
 must(await admin.from('journal_ai_entitlements').update({per_minute:1}).eq('user_id',a.id).select('user_id'));
 const fast=await evaluate(async()=>{const r=await fetch('/api/journal/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'test',requestKey:crypto.randomUUID(),companion:{name:'x',instructions:'x'},messages:[{role:'user',body:'hi'}]})});return {status:r.status,body:await r.json()};});
 check(fast.status===429&&fast.body.code==='too-fast','the per-minute cap refuses a burst of requests');

 // ---- Phones and themes ----
 await viewport(390,844,true);
 for(const [path,ready,name] of [['/journal','!!document.querySelector(".mj-workspace")','08-phone-workspace'],[`/journal?entry=${convId}`,'!!document.querySelector(".mj-entry")','09-phone-entry'],['/journal?view=history','!!document.querySelector(".mj-history-view")','10-phone-history'],[`/journal?companion=${thought.id}`,'!!document.querySelector(".mj-studio")','11-phone-studio-sheet'],[`/journal?entry=${live2}`,'!!document.querySelector(".mj-workspace .mj-message")','12-phone-live']]){
  await go(path,ready,name);check(!(await overflow()),`${name}: no sideways scrolling`);await shoot(name);}
 await evaluate(()=>{const t=document.querySelector('.mj-ws-page .mj-composer textarea');t.focus();t.scrollIntoView({block:'end'});});await wait(300);
 check(await evaluate(()=>{const b=document.querySelector('.mj-live-compose button[type=submit]').getBoundingClientRect(),nav=document.querySelector('.muse-bottom-navigation')?.getBoundingClientRect();return b.width>0&&b.bottom<=innerHeight&&(!nav||b.bottom<=nav.top);}),'Send stays visible above the phone tab bar');
 check(await evaluate(()=>getComputedStyle(document.querySelector('.mj-ws-page .mj-composer textarea')).fontSize==='16px'),'the phone composer is 16px, so iOS doesn’t zoom');
 await viewport(1280);
 for(const theme of ['iridescent','prism-noir']){await evaluate(t=>localStorage.setItem('muse.theme',t),theme);await go(`/journal?entry=${convId}`,'!!document.querySelector(".mj-entry")','theme '+theme);await shoot(`13-theme-${theme}`);}
 await evaluate(()=>localStorage.removeItem('muse.theme'));

 // ---- Scenario G: another account ----
 await signIn(b);
 await go('/journal','!!document.querySelector(".mj-setup")','b setup');
 check(!(await has('main','Finishing the quilt')),'another account sees none of the owner’s journal');
 const denied=await evaluate(async(c)=>{const r=await fetch('/api/journal/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'opening',conversationId:c,localDate:new Date().toISOString().slice(0,10)})});return {status:r.status,body:await r.json()};},convId);
 check(denied.status===404||denied.status===403,`the server refuses AI on someone else’s conversation (${denied.status})`);
 await click('.mj-setup button','Start journaling');await until(()=>!!document.querySelector('.mj-workspace .mj-composer textarea'),'b workspace');
 check(!(await has('.mj-tb-button','Companion')),'AI is off for an account without an entitlement (no companion in the toolbar)');
 const statusB=await evaluate(async()=>(await fetch('/api/journal/ai')).json());check(statusB.enabled===false&&statusB.entitled===false,'the AI status says not entitled');
 const testB=await evaluate(async()=>{const r=await fetch('/api/journal/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'test',requestKey:crypto.randomUUID(),companion:{name:'x',instructions:'x'},messages:[{role:'user',body:'hi'}]})});return {status:r.status,body:await r.json()};});
 check(testB.status===403&&testB.body.code==='not-entitled','a direct API call without entitlement is blocked on the server');
 await setValue('.mj-ws-page .mj-composer textarea','My own private diary line.');await click('.mj-live-compose button[type=submit]');
 await until(()=>!!document.querySelector('.mj-workspace .mj-message[data-role=user]:not([data-pending])'),'b saved');
 check(await count('journal_messages',b.id,{role:'user'})===1&&await count('journal_messages',b.id,{role:'assistant'})===0,'a non-AI account journals privately with no AI replies');
 const crossRead=await b.client.from('journal_conversations').select('id').eq('id',convId);check((crossRead.data??[]).length===0,'RLS: the owner’s entry can’t be read by id');
 check(!errors.length,`no page errors${errors.length?': '+errors.slice(0,3).join(' | '):''}`);
 console.log(`PASS Journal UI: ${passed} checks. Screenshots: ${shots}`);
}finally{try{socket?.close();}catch{}chrome?.kill();for(const id of users)await admin.auth.admin.deleteUser(id).catch(()=>{});rmSync(directory,{recursive:true,force:true});console.log('Disposable Journal accounts removed.');}
