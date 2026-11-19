// LOCAL browser journey for Journal history import + recall, with a disposable account and no AI at all: Journal
// settings → Import journal history; a Rosebud file is recognised but not guessed at; a Muse Journal export is
// previewed (counts, dates, fields, duplicates, problems, journal mapping), imported with a report, found in History
// search, opened with its provenance, recalled by the recall check ("tagged Jamie"), skipped as duplicates on a second
// import, and removed by "Remove this import". Phone width has no sideways scroll. No paid requests are possible here.
// Requires `npm run dev`. Run: JOURNAL_UI_ORIGIN=http://localhost:3000 node scripts/test-journal-history-ui.mjs
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {mkdtempSync,readFileSync,existsSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir,homedir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {load} from '../tests/helpers.mjs';
loadEnvFile('.env.local');
const origin=process.env.JOURNAL_UI_ORIGIN??'http://localhost:3000',url=process.env.NEXT_PUBLIC_SUPABASE_URL;
for(const endpoint of [origin,url])assert.ok(['localhost','127.0.0.1'].includes(new URL(endpoint).hostname),'Disposable checks must remain local');
const shots=process.env.JOURNAL_UI_SHOTS??join(tmpdir(),'muse-journal-history-ui');mkdirSync(shots,{recursive:true});
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options),must=r=>{if(r.error)throw Error(r.error.message);return r.data;};
const docker=process.env.MUSE_DOCKER_PATH||(existsSync(homedir()+'/.docker/bin/docker')?homedir()+'/.docker/bin/docker':'docker');
const sql=text=>{const r=spawnSync(docker,['exec','-i','supabase_db_muse-local','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],{input:text,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();};
const directory=mkdtempSync(join(tmpdir(),'muse-history-ui-'));let chrome,socket,passed=0;const users=[];
const check=(cond,label)=>{assert.ok(cond,label);passed++;console.log('✓',label);};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function account(name){const link=must(await admin.auth.admin.generateLink({type:'invite',email:`history-ui-${crypto.randomUUID()}@example.test`}));users.push(link.user.id);const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token}));
 sql(`update public.profiles set first_name='${name}',time_zone='UTC',time_zone_confirmed_at=now(),onboarded_at=now() where id='${link.user.id}'`);return {id:link.user.id,email:link.user.email,client};}
const count=async(t,userId,f={})=>{let q=admin.from(t).select('*',{count:'exact',head:true}).eq('user_id',userId);for(const [k,v] of Object.entries(f))q=v===null?q.is(k,null):q.eq(k,v);return (await q).count;};

// A Muse Journal export from "another" journal: four entries over 2025, one mentioning Jamie twice, one unfinished draft.
const conv=(id,date,title,summary,extra={})=>({id,journal_id:'jx',companion_name:'Rose',companion_version_id:null,mode:'open',status:'completed',local_date:date,time_zone:'America/Chicago',started_at:`${date}T02:00:00Z`,completed_at:`${date}T03:00:00Z`,title,title_source:'ai',summary,summary_source:'ai',favorite:false,exclude_from_memory:false,images:[],origin:'journal',...extra});
const msg=(c,role,body,t)=>({id:crypto.randomUUID(),conversation_id:c,role,body,created_at:t,corrected_at:null});
const exported={format:'Muse Journal',version:1,exported_at:'2026-01-01T00:00:00Z',journals:[{id:'jx',name:'Old Journal',description:'',memory_scope:'shared',archived_at:null}],companions:[],companionVersions:[],preferences:null,
 conversations:[conv('c1','2025-03-02','Jamie at the gallery','They met Jamie at an opening.'),conv('c2','2025-08-01','Jamie again',''),conv('c3','2025-11-20','Paris notes','A week in Paris.'),conv('c4','2025-12-01','','',{status:'draft'})],
 messages:[msg('c1','assistant','How was tonight?','2025-03-02T02:00:00Z'),msg('c1','user','I met Jamie at the gallery opening and we talked for an hour about printmaking.','2025-03-02T02:01:00Z'),msg('c1','assistant','That sounds lovely. What stayed with you?','2025-03-02T02:02:00Z'),msg('c1','user','How easy it felt.','2025-03-02T02:03:00Z'),
  msg('c2','user','Jamie texted about dinner on Friday.','2025-08-01T02:01:00Z'),msg('c3','user','Paris was everything: the Musée d’Orsay, the bakeries, walking for hours.','2025-11-20T02:01:00Z'),msg('c3','assistant','Which moment do you want to keep?','2025-11-20T02:02:00Z')],
 corrections:[],tags:[{id:'t1',kind:'person',name:'Jamie',aliases:[]},{id:'t2',kind:'place',name:'Paris',aliases:[]}],entryTags:[{conversation_id:'c1',tag_id:'t1',source:'ai'},{conversation_id:'c2',tag_id:'t1',source:'ai'},{conversation_id:'c3',tag_id:'t2',source:'ai'}],
 analyses:[],bookmarks:[],memories:[],reports:[],links:[]};

try{
 const a=await account('Wren');
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
 const shoot=async(name)=>{await wait(400);const r=await send('Page.captureScreenshot',{format:'png'});writeFileSync(join(shots,`${name}.png`),Buffer.from(r.data,'base64'));};
 const overflow=()=>evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
 const go=async(path,ready,label)=>{await evaluate(()=>{window.__old=1;}).catch(()=>{});await send('Page.navigate',{url:`${origin}${path}`});await until(new Function(`return !window.__old&&(${ready})`),label);};
 const setValue=(selector,value)=>evaluate(({selector,value})=>{const t=document.querySelector(selector);if(!t)throw Error('missing '+selector);const proto=t instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(t,value);t.dispatchEvent(new Event('input',{bubbles:true}));},{selector,value});
 const click=(selector,text)=>evaluate(({selector,text})=>{const b=[...document.querySelectorAll(selector)].find(x=>(text==null||x.textContent.trim()===text||x.textContent.trim().startsWith(text)||x.getAttribute('aria-label')===text)&&!x.disabled);if(!b)throw Error('missing '+selector+' '+text);b.click();},{selector,text});
 const has=(selector,text)=>evaluate(({selector,text})=>[...document.querySelectorAll(selector)].some(x=>!text||x.textContent.includes(text)),{selector,text});
 const signIn=async(u)=>{const magic=must(await admin.auth.admin.generateLink({type:'magiclink',email:u.email}));await send('Page.navigate',{url:`${origin}/auth/confirm?token_hash=${magic.properties.hashed_token}&type=email&next=/`});await until(()=>location.pathname==='/'&&!!document.querySelector('main'),'signed in');};
 const upload=async(name,content)=>{const f=join(directory,name);writeFileSync(f,content);const doc=await send('DOM.getDocument',{depth:-1});const {nodeId}=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.mj-file-pick input[type=file]'});await send('DOM.setFileInputFiles',{nodeId,files:[f]});};
 const openImport=async()=>{await go('/journal','!!document.querySelector(".mj-workspace")','workspace');await until(()=>!!document.querySelector('.mj-header-tools .mj-tb-settings'),'toolbar');await click('.mj-header-tools .mj-tb-settings');await until(()=>!!document.querySelector('#mj-settings'),'settings');await click('#mj-settings .muse-segmented button','Privacy & usage');await click('#mj-settings button','Import journal history…');await until(()=>!!document.querySelector('.mj-file-pick'),'import view');};
 await send('Page.enable');await send('Runtime.enable');await send('DOM.enable');await viewport(1280);
 await signIn(a);
 const P=load('lib/journal/persistence');
 await P.setupJournal(a.client,a.id,{journalName:'My Journal',presetKey:'thought-partner',instructions:'',prefs:(await P.loadJournal(a.client,a.id)).prefs});

 await openImport();
 check(await has('.mj-import','A Rosebud export (the .md file)'),'the import names what it accepts');
 await upload('notes.md','# Some notes\n\nNot a journal.');
 await until(()=>!!document.querySelector('.mj-import .mj-error'),'markdown message');
 check(await has('.mj-import .mj-error','doesn’t look like a Rosebud export'),'other Markdown is refused plainly, never guessed at');
 check(await count('journal_import_batches',a.id)===0,'nothing is written for an unreadable source');
 const rose=['# 🌹 Rosebud data export','','# 🌹 Rosebud entries','','---','','## 🔥 Gallery night','### Sunday, March 2nd, 2025','','#### Tags','**People:** Jamie','','#### Reflection','You met Jamie.','','#### Entry','','**Rosebud:** How was tonight?','','**Wren:** I met Jamie.','','---','','# Weekly reports','','### Week','x'].join('\n');
 await upload('rosebud-2026.md',rose);
 await until(()=>!!document.querySelector('.mj-import-preview'),'rosebud preview');
 const rp=await evaluate(()=>document.querySelector('.mj-import-preview').textContent.replace(/\s+/g,' '));
 check(/From Rosebud/.test(rp)&&/Ready to import\s*1/.test(rp),'a Rosebud export previews its entries');
 check(/not imported: Weekly reports/.test(rp)&&/dates only/.test(rp)&&/New journal “Rosebud”/.test(rp),'the preview says what isn’t imported, that times aren’t exported, and where entries go');
 await click('.mj-import-preview button','Cancel');
 await upload('muse-journal.json',JSON.stringify(exported));
 await until(()=>!!document.querySelector('.mj-import-preview'),'preview');
 const preview=await evaluate(()=>document.querySelector('.mj-import-preview').textContent.replace(/\s+/g,' '));
 check(/Ready to import\s*3/.test(preview),'preview: 3 ready to import');
 check(/Entries found\s*4/.test(preview)&&/Can’t import\s*1/.test(preview),'preview: 4 found, the draft reported');
 check(/Mar 2, 2025 – Nov 20, 2025/.test(preview),'preview: the historical date range');
 check(/Your messages · replies\s*4 · 3/.test(preview),'preview: your messages and AI replies counted separately');
 check(/AI replies\s*2 of 3/.test(preview)&&/Summaries\s*2 of 3/.test(preview),'preview: which fields each entry keeps');
 check(preview.includes('Old Journal')&&preview.includes('New journal “Old Journal”'),'preview: the exported journal maps to a new journal by default');
 check(await count('journal_conversations',a.id)===0,'the preview writes nothing');
 await shoot('01-preview');
 await click('.mj-import-preview button','Import 3 entries');
 await until(()=>!!document.querySelector('[aria-label="Import report"]'),'report',undefined,600);
 check(await has('[aria-label="Import report"]','3 imported'),'report: 3 imported');
 check(await count('journal_conversations',a.id,{origin:'import'})===3,'three ordinary entries exist');
 check(await count('journal_journals',a.id)===2,'the new journal was made as mapped');
 const batch=must(await a.client.from('journal_import_batches').select('*').single());
 check(batch.status==='complete'&&batch.imported===3&&JSON.stringify(batch.report).indexOf('printmaking')<0,'the stored report has counts, never journal text');
 await shoot('02-report');

 // History: search finds imported words; the entry opens with its original words and a quiet provenance note.
 await go('/journal?view=history','!!document.querySelector(".mj-history-view")','history');
 await setValue('.mj-history-view input[type=search]','printmaking');
 await until(()=>{const r=[...document.querySelectorAll('.mj-history-view .mj-row')];return r.length===1&&r[0].textContent.includes('Jamie at the gallery');},'search hit');
 check(true,'History search finds words inside an imported conversation');
 const c1=must(await a.client.from('journal_conversations').select('id').eq('title','Jamie at the gallery').single()).id;
 await go(`/journal?entry=${c1}`,'!!document.querySelector(".mj-message")','entry');
 await until(()=>[...document.querySelectorAll('.muse-kicker')].some(x=>x.textContent.includes('imported from a Muse export')),'provenance');
 check(await has('.muse-kicker','Sun, Mar 2')||await has('.muse-kicker','Mar'),'the entry keeps its original date');
 const bodies=await evaluate(()=>[...document.querySelectorAll('.mj-message')].map(m=>m.textContent));
 check(bodies.length===4&&bodies[1].includes('printmaking')&&bodies[0].includes('How was tonight'),'original messages in their original order');
 await shoot('03-entry');

 // Recall check (Memory): the same selection a reply uses, without AI.
 await go('/journal','!!document.querySelector(".mj-workspace")','workspace');
 await until(()=>!!document.querySelector('.mj-header-tools .mj-tb-settings'),'toolbar');await click('.mj-header-tools .mj-tb-settings');await until(()=>!!document.querySelector('#mj-settings'),'settings');
 await click('#mj-settings .muse-segmented button','Memory');
 await click('.mj-recall summary');
 await setValue('.mj-recall input[type=text]','Girl, guess who messaged me again? Jamie!');
 await click('.mj-recall button','Check');
 await until(()=>!!document.querySelector('.mj-recall-out'),'recall result');
 const recall=await evaluate(()=>document.querySelector('.mj-recall-out').textContent.replace(/\s+/g,' '));
 check(recall.includes('recognised Jamie'),'recall recognises Jamie');
 check(recall.includes('Jamie again')&&recall.includes('Jamie at the gallery')&&/tagged Jamie/.test(recall),'recall brings in both Jamie entries, by tag');
 check(!recall.includes('Paris notes'),'and nothing unrelated');
 check(await count('journal_ai_usage',a.id)===0,'the recall check makes no AI request');
 await shoot('04-recall');

 // Importing the same file again skips everything; removing the import removes only its entries.
 await click('#mj-settings .muse-segmented button','Privacy & usage');await click('#mj-settings button','Import journal history…');
 await until(()=>!!document.querySelector('.mj-file-pick'),'import view');
 await until(()=>document.querySelector('.mj-import')?.textContent.includes('Earlier imports'),'earlier imports');
 check(await has('.mj-import','Earlier imports')&&await has('.mj-import','3 imported'),'earlier imports are listed');
 await upload('muse-journal.json',JSON.stringify(exported));
 await until(()=>!!document.querySelector('.mj-import-preview'),'second preview');
 const again=await evaluate(()=>document.querySelector('.mj-import-preview').textContent.replace(/\s+/g,' '));
 check(/Ready to import\s*0/.test(again)&&/Already imported\s*3/.test(again),'a second import finds nothing new');
 check(await has('.mj-import-preview button','Nothing new to import'),'and offers nothing to import');
 await click('.mj-import-preview button','Cancel');
 await click('.mj-import button','Remove this import');
 await click('.mj-import .mj-mem-confirm button','Remove');
 await until(async()=>true,'');for(let i=0;i<50&&await count('journal_conversations',a.id,{origin:'import'})>0;i++)await wait(100);
 check(await count('journal_conversations',a.id,{origin:'import'})===0,'removing the import removes its entries');

 // Phone width: the import view fits.
 await viewport(390,844,true);
 await openImport();
 check(!(await overflow()),'phone: the import view has no sideways scroll');
 await shoot('05-phone');
 check(!errors.length,`no page errors${errors.length?': '+errors.slice(0,3).join(' | '):''}`);
 console.log(`PASS Journal history UI: ${passed} checks. Screenshots: ${shots}`);
}finally{try{socket?.close();}catch{}chrome?.kill();for(const id of users)await admin.auth.admin.deleteUser(id).catch(()=>{});rmSync(directory,{recursive:true,force:true});console.log('Disposable account removed.');}
