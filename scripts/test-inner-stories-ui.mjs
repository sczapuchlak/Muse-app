// Authenticated LOCAL browser journey for Inner Compass Phase 2 (#211): Chapters & Experiences with a disposable account: the empty Inner World,
// quick add, collections and search, the detail view (ordinary edit vs Record evolution, connections, Life Areas,
// reflections), the values garden, a guided exploration kept as a discovery, the evolution timeline, the manifesto
// (autosave, kept version), Intentions referencing a value, phone layouts without sideways scroll, and themes.
// Requires `npm run dev`. Run: INNER_UI_ORIGIN=http://localhost:3000 node scripts/test-inner-compass-ui.mjs
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {mkdtempSync,readFileSync,existsSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir,homedir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
loadEnvFile('.env.local');
const origin=process.env.INNER_UI_ORIGIN??'http://localhost:3000',url=process.env.NEXT_PUBLIC_SUPABASE_URL;
for(const endpoint of [origin,url])assert.ok(['localhost','127.0.0.1'].includes(new URL(endpoint).hostname),'Disposable checks must remain local');
const shots=process.env.INNER_UI_SHOTS??join(tmpdir(),'muse-inner-stories-ui');mkdirSync(shots,{recursive:true});
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options),must=r=>{if(r.error)throw Error(r.error.message);return r.data;};
const docker=process.env.MUSE_DOCKER_PATH||(existsSync(homedir()+'/.docker/bin/docker')?homedir()+'/.docker/bin/docker':'docker');
const sql=text=>{const r=spawnSync(docker,['exec','-i','supabase_db_muse-local','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],{input:text,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();};
const directory=mkdtempSync(join(tmpdir(),'muse-inner-ui-'));let chrome,socket,passed=0,userId='';
const check=(cond,label)=>{assert.ok(cond,label);passed++;console.log('✓',label);};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const count=async(t,f={})=>{let q=admin.from(t).select('*',{count:'exact',head:true}).eq('user_id',userId);for(const [k,v] of Object.entries(f))q=q.eq(k,v);return (await q).count;};
try{
 const link0=must(await admin.auth.admin.generateLink({type:'invite',email:`inner-ui-${crypto.randomUUID()}@example.test`}));userId=link0.user.id;
 const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link0.properties.hashed_token}));
 sql(`update public.profiles set first_name='Wren',time_zone='UTC',time_zone_confirmed_at=now(),onboarded_at=now() where id='${userId}'`);
 must(await client.from('life_areas').insert([{label:'Personal Growth',color:'#8050cf',position:7},{label:'Spirituality',color:'#e85d75',position:9},{label:'Fun & Recreation',color:'#f4a261',position:6}]));

 chrome=spawn(process.env.CHROME_BIN??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--hide-scrollbars','--remote-debugging-port=0',`--user-data-dir=${join(directory,'profile')}`],{stdio:'ignore'});
 const portFile=join(directory,'profile/DevToolsActivePort');for(let i=0;!existsSync(portFile)&&i<100;i++)await wait(100);
 const port=readFileSync(portFile,'utf8').split('\n')[0],targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.onopen=r);
 let id=0;const pending=new Map(),errors=[];
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown'){const t=m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text;if(!/negative time stamp/.test(t))errors.push(t);}
  if(m.method==='Page.javascriptDialogOpening')void send('Page.handleJavaScriptDialog',{accept:true});
  if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});socket.send(JSON.stringify({id:key,method,params}));});
 const evaluate=async(fn,args)=>{const r=await send('Runtime.evaluate',{expression:`(${fn})(${JSON.stringify(args)})`,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result?.value;};
 const until=async(fn,message,args,tries=300)=>{for(let i=0;i<tries;i++){if(await evaluate(fn,args).catch(()=>false))return;await wait(100);}throw Error(message);};
 const viewport=(width,height=900,touch=false)=>Promise.all([send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:touch?2:1,mobile:touch}),send('Emulation.setTouchEmulationEnabled',touch?{enabled:true,maxTouchPoints:5}:{enabled:false})]);
 const shoot=async(name,full=false)=>{await wait(500);let clip;if(full){const m=await send('Page.getLayoutMetrics');clip={x:0,y:0,width:m.cssContentSize.width,height:Math.min(m.cssContentSize.height,6000),scale:1};}
  const r=await send('Page.captureScreenshot',{format:'png',...(clip?{clip,captureBeyondViewport:true}:{})});writeFileSync(join(shots,`${name}.png`),Buffer.from(r.data,'base64'));};
 globalThis.__shoot=shoot;globalThis.__errors=errors;
 const overflow=()=>evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
 const go1=async(path,ready,label)=>{await evaluate(()=>{window.__old=1;}).catch(()=>{});await send('Page.navigate',{url:`${origin}${path}`});await until(new Function(`return !window.__old&&(${ready})`),label);};
 const go=async(path,ready,label)=>{for(let k=0;;k++){try{return await go1(path,ready,label);}catch(e){if(k>=2)throw e;console.log('retrying',label);}}};
 const setValue=(selector,value)=>evaluate(({selector,value})=>{const t=document.querySelector(selector);if(!t)throw Error('missing '+selector);const proto=t instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(t,value);t.dispatchEvent(new Event('input',{bubbles:true}));},{selector,value});
 const click1=(selector,text)=>evaluate(({selector,text})=>{const b=[...document.querySelectorAll(selector)].find(x=>(text==null||x.textContent.trim()===text||x.textContent.trim().startsWith(text)||x.getAttribute('aria-label')===text)&&!x.disabled);if(!b)throw Error('missing '+selector+' '+text);b.click();},{selector,text});
 const click=async(selector,text)=>{for(let k=0;;k++){try{return await click1(selector,text);}catch(e){if(k>=40)throw e;await wait(150);}}};
 const has=(selector,text)=>evaluate(({selector,text})=>[...document.querySelectorAll(selector)].some(x=>!text||x.textContent.includes(text)),{selector,text});
 await send('Page.enable');await send('Runtime.enable');await send('DOM.enable');await viewport(1280);
 const magic=must(await admin.auth.admin.generateLink({type:'magiclink',email:link0.user.email}));
 await send('Page.navigate',{url:`${origin}/auth/confirm?token_hash=${magic.properties.hashed_token}&type=email&next=/`});await until(()=>location.pathname==='/'&&!!document.querySelector('main'),'signed in');


 const discovery=crypto.randomUUID();
 must(await client.from('inner_discoveries').insert({id:discovery,category:'values',title:'Generosity',meaning:'',favorite:false,details:{},tags:[]}));
 // ---- Navigation: three views, no crumb ----
 await go('/envision?view=inner-compass','!!document.querySelector(".muse-compass-realms")','inner compass');
 check(!(await has('.muse-compass-crumb')),'no “Inner Compass ›” crumb');
 await until(()=>document.querySelectorAll('.muse-compass-realms button').length===3,'realms render');const realmsText=await evaluate(()=>[...document.querySelectorAll('.muse-compass-realms button')].map(b=>b.textContent).join('|'));console.log('realms:',realmsText);check(realmsText==='My Inner World|My Chapters|My Experiences','three Inner Compass views');
 await shoot('01-nav');

 // ---- Chapters: start with a word ----
 await click('.muse-compass-realms button','My Chapters');
 await until(()=>!!document.querySelector('.muse-stories-welcome'),'chapters welcome');
 check(await count('inner_chapters')===0,'visiting creates nothing');
 await shoot('02-chapters-empty');
 await click('.muse-stories-begin button','Courage');
 await until(()=>!!document.querySelector('#muse-new-chapter'),'new chapter dialog');
 await setValue('#muse-new-chapter .muse-compass-statement input','Prosperity');
 await click('#muse-new-chapter button[type=submit]');
 await until(()=>!!document.querySelector('#chapter-title'),'chapter page');
 const ch=must(await admin.from('inner_chapters').select('*').eq('user_id',userId).single());
 check(ch.title==='Prosperity'&&ch.word==='Prosperity','a guiding word stands as the name');
 check(await evaluate(()=>!!document.querySelector('.muse-stories-board-empty')),'no modules appear by default');

 // ---- Modules from the Add to chapter menu ----
 const addModule=async label=>{await click('.muse-stories-add button','Add to chapter');await until(()=>!!document.querySelector('.muse-stories-add-menu'),'add menu');await click('.muse-stories-add-menu button',label);await wait(900);};
 await addModule('Guiding words');
 await setValue('.muse-stories-module[data-type=words] .muse-stories-item-form input','Prosperity');
 await setValue('.muse-stories-module[data-type=words] .muse-stories-item-form textarea','Abundance of time, friends and chances, not only money.');
 await click('.muse-stories-module[data-type=words] .muse-stories-item-form button','Done');
 await addModule('Mantras & affirmations');
 await setValue('.muse-stories-module[data-type=mantras] .muse-stories-item-form textarea','There is enough, and I am open to it.');
 await evaluate(()=>{const c=[...document.querySelectorAll('.muse-stories-module[data-type=mantras] .muse-compass-check input')].find(i=>i.parentElement.textContent.includes('Daily Edit'));c.click();});
 await click('.muse-stories-module[data-type=mantras] .muse-stories-item-form button','Done');
 await addModule('Embracing & releasing');
 await click('.muse-stories-pair-side[data-side=embracing] > button','Add');await setValue('.muse-stories-pair-side[data-side=embracing] li input','Saying yes to invitations');
 await click('.muse-stories-pair-side[data-side=releasing] > button','Add');await setValue('.muse-stories-pair-side[data-side=releasing] li input','Scarcity thinking');
 await addModule('Inner World discoveries');
 await click('.muse-stories-module[data-type=discoveries] .muse-choice-trigger');await until(()=>!!document.querySelector('.popover-choice'),'discovery picker');await click('.popover-choice','Generosity');
 await addModule('Experiences');
 await setValue('#chapter-quick-exp','Prosperity Manifestation Evening');await click('.muse-stories-quick button[type=submit]');
 await until(()=>!!document.querySelector('.muse-stories-linked-exps .muse-stories-tile'),'experience linked');
 await addModule('Reflections');
 await click('.muse-stories-linked-reflections button','Write a reflection');await setValue('#compass-reflect-body','Prosperity is starting to feel like room to breathe.');await click('.muse-compass-reflect button[type=submit]');
 await until(()=>!!document.querySelector('.muse-stories-linked-reflections .muse-compass-reflection-body'),'reflection saved');
 await wait(1800);
 const mods=must(await admin.from('inner_modules').select('type,content,position').eq('user_id',userId).eq('chapter_id',ch.id).order('position'));
 check(mods.map(m=>m.type).join(',')==='words,mantras,embrace,discoveries,experiences,reflections','modules saved in the order added');
 check(mods[0].content.items[0].word==='Prosperity'&&mods[1].content.items[0].featured===true,'module content saves (word, featured mantra)');
 check(mods[2].content.embracing[0].text==='Saying yes to invitations'&&mods[2].content.releasing[0].text==='Scarcity thinking','embracing and releasing save');
 check(await count('inner_chapter_experiences',{chapter_id:ch.id})===1&&await count('inner_experiences')===1,'an experience created from a chapter is its own linked record');
 check(await count('inner_reflections',{chapter_id:ch.id})===1,'chapter reflection saved');
 // Reorder with Move up.
 await evaluate(()=>{const li=document.querySelectorAll('.muse-stories-modules>li')[1];li.querySelector('.muse-overflow-trigger, [aria-haspopup]').click();});
 await until(()=>[...document.querySelectorAll('[role=menuitem],.muse-overflow-menu button,.popover-choice')].some(b=>b.textContent.trim()==='Move up'),'menu');
 await evaluate(()=>[...document.querySelectorAll('[role=menuitem],.muse-overflow-menu button,.popover-choice,button')].find(b=>b.textContent.trim()==='Move up').click());
 await wait(1500);
 const order=must(await admin.from('inner_modules').select('type').eq('chapter_id',ch.id).order('position')).map(m=>m.type);
 check(order[0]==='mantras'&&order[1]==='words','Move up reorders modules');

 // ---- Cover and details ----
 await click('.muse-stories-hero-tools button','Cover');await until(()=>!!document.querySelector('.muse-cover-presets'),'cover picker');
 await shoot('03-cover-picker');
 await click('.muse-cover-presets button','Eclipse');await click('.muse-cover-accents button','Accent #e85d75');await click('#muse-cover-picker button','Save cover');
 await until(()=>!document.querySelector('#muse-cover-picker'),'cover saved');
 await click('.muse-stories-hero-tools button','Details');await until(()=>!!document.querySelector('#muse-chapter-details'),'details');
 await setValue('#muse-chapter-details textarea','A season of letting good things in.');
 await evaluate(()=>{const s=[...document.querySelectorAll('#muse-chapter-details input[type=date]')];});
 await setValue('#muse-chapter-details .muse-compass-row2 label:first-child input','2026-11-01');
 await evaluate(()=>[...document.querySelectorAll('#muse-chapter-details .muse-compass-check input')].forEach(i=>{if(!i.checked)i.click();}));
 await click('#muse-chapter-details .muse-compass-areas button','Spirituality');
 await click('#muse-chapter-details button[type=submit]');await until(()=>!document.querySelector('#muse-chapter-details'),'details saved');
 const ch2=must(await admin.from('inner_chapters').select('*').eq('id',ch.id).single());
 check(ch2.cover.preset==='eclipse'&&ch2.cover.accent==='#e85d75'&&ch2.is_primary&&ch2.show_on_daily&&ch2.starts_on==='2026-11-01','cover, primary, Daily Edit opt-in and dates save');
 check(await count('inner_area_links',{chapter_id:ch.id})===1,'chapter Life Atlas area saved');
 await shoot('04-chapter-page',true);

 // ---- Overlapping chapters on the timeline ----
 must(await client.from('inner_chapters').insert([{title:'The Year of Becoming',word:'Becoming',starts_on:'2026-01-01',ends_on:'2026-12-31',cover:{preset:'aurora'}},{title:'A Season of Healing',word:'',starts_on:'2025-03-01',ends_on:'2025-09-30',cover:{preset:'dawn'}},{title:'My Soft Life Era',word:'',starts_on:null,ends_on:null,cover:{preset:'bloom'}}]));
 await go('/envision?view=inner-compass&realm=chapters','document.querySelectorAll(".muse-stories-volume").length===4','chapters landing');
 check(await evaluate(()=>new Set([...document.querySelectorAll('.muse-stories-timeline-span')].map(s=>s.style.top)).size)>=2,'overlapping chapters sit in separate timeline lanes');
 await shoot('05-chapters',true);

 // ---- Experiences ----
 await click('.muse-compass-realms button','My Experiences');
 await until(()=>!!document.querySelector('.muse-stories-capture'),'experiences');
 await setValue('#exp-capture','First pottery workshop');await click('.muse-stories-capture button[type=submit]');
 await until(()=>/Kept/.test(document.querySelector('.muse-stories-capture [role=status]')?.textContent??''),'captured');
 check(await count('inner_experiences')===2,'an experience in seconds: just a title');
 await click('.muse-stories-collections header button','New collection');await setValue('#muse-new-collection .muse-compass-statement input','Coven Chronicles');await click('#muse-new-collection button[type=submit]');
 await until(()=>!!document.querySelector('.muse-stories-collection-head'),'collection view');
 await click('.muse-stories-add-existing .muse-choice-trigger');await until(()=>!!document.querySelector('.popover-choice'),'picker');await click('.popover-choice','Prosperity Manifestation Evening');
 await until(()=>document.querySelectorAll('.muse-stories-exp-tiles .muse-stories-tile').length===1,'added to collection');
 const evening=must(await admin.from('inner_experiences').select('id').eq('user_id',userId).eq('title','Prosperity Manifestation Evening').single());
 await go(`/envision?view=inner-compass&realm=experiences&experience=${evening.id}`,'!!document.querySelector("#experience-title")','experience page');
 check(await has('.muse-stories-belong[data-kind=chapter]','Prosperity')&&await has('.muse-stories-belong[data-kind=collection]','Coven Chronicles'),'one experience appears in its chapter and its collection');
 await click('.muse-stories-add button','Add to experience');await until(()=>!!document.querySelector('.muse-stories-add-menu'),'menu');
 check(await has('.muse-stories-add-menu button','Materials')&&await has('.muse-stories-add-menu button','Rituals'),'experiences offer Materials and Rituals');
 await click('.muse-stories-add-menu button','Materials');await wait(900);
 await setValue('.muse-stories-material-input input','tiger');
 await until(()=>!!document.querySelector('.muse-stories-suggest button'),'material suggestions');
 await evaluate(()=>{const b=document.querySelector('.muse-stories-suggest button');b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));b.click();});
 await until(()=>!!document.querySelector('.muse-stories-reference'),'reference shown');
 check(await has('.muse-stories-reference','quartz family')&&await has('.muse-stories-reference','not proven effects'),'the reference shows facts and labels associations as non-scientific');
 await setValue('.muse-stories-module[data-type=materials] .muse-stories-item-form label:nth-of-type(4) textarea, .muse-stories-module[data-type=materials] textarea:last-of-type','Taking opportunities');
 await click('.muse-stories-module[data-type=materials] .muse-stories-item-form button','Done');
 await click('.muse-stories-add button','Add to experience');await until(()=>!!document.querySelector('.muse-stories-add-menu'),'menu');await click('.muse-stories-add-menu button','Materials');await wait(900);
 await setValue('.muse-stories-module:last-of-type .muse-stories-material-input input','A key from my grandmother');
 await click('.muse-stories-module:last-of-type .muse-stories-item-form button','Done');await wait(1500);
 const mats=must(await admin.from('inner_modules').select('content').eq('experience_id',evening.id).eq('type','materials').order('position'));
 check(mats[0].content.items[0].refKey==='tigers-eye'&&mats[1].content.items[0].refKey===undefined,'library materials and custom materials both save');
 await click('.muse-stories-revisit button','Reflect on this');await setValue('#compass-reflect-body','We each chose a stone.');await click('.muse-compass-reflect button[type=submit]');
 await until(()=>document.querySelectorAll('.muse-stories-revisit .muse-compass-reflection-body').length===1,'first reflection');
 await click('.muse-stories-revisit button','Add a later reflection');await setValue('#compass-reflect-body','Three months later: prosperity feels like time.');await click('.muse-compass-reflect button[type=submit]');
 await until(()=>document.querySelectorAll('.muse-stories-revisit .muse-compass-reflection-body').length===2,'second reflection');
 check(await count('inner_reflections',{experience_id:evening.id})===2,'dated reflections accumulate');
 await evaluate(()=>[...document.querySelectorAll('.muse-stories-revisit .text-button')].find(b=>b.textContent.includes('Save as discovery')).click());
 await until(()=>!!document.querySelector('#muse-save-discovery'),'save as discovery');await click('#muse-save-discovery .muse-compass-cats button','Beliefs');await click('#muse-save-discovery button[type=submit]');
 await until(()=>/Saved to/.test(document.querySelector('#muse-save-discovery')?.textContent??''),'discovery saved');
 check(await count('inner_discoveries',{source_kind:'experience',source_id:evening.id})===1,'a discovery saved from an experience keeps its origin');
 await click('#muse-save-discovery button','Done');
 await click('.muse-compass-hero-actions button','Details');await until(()=>!!document.querySelector('#muse-experience-details'),'details');
 await setValue('#muse-experience-details .muse-compass-tags-box input','Prosperity');await evaluate(()=>document.querySelector('#muse-experience-details .muse-compass-tags-box input').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
 await click('#muse-experience-details .muse-compass-areas button','Spirituality');await click('#muse-experience-details .muse-compass-areas button','Personal Growth');
 await click('#muse-experience-details button[type=submit]');await until(()=>!document.querySelector('#muse-experience-details'),'saved');
 check(await count('inner_area_links',{experience_id:evening.id})===2,'an experience links to several Life Atlas areas directly');
 await shoot('06-experience',true);
 await go('/envision?view=inner-compass&realm=experiences','document.querySelectorAll(".muse-stories-tile").length===2','experiences');await shoot('07-experiences',true);

 // ---- Close and carry forward ----
 await go(`/envision?view=inner-compass&realm=chapters&chapter=${ch.id}`,'!!document.querySelector("#chapter-title")','chapter');
 await evaluate(()=>document.querySelector('.muse-stories-hero-tools [aria-haspopup]').click());await until(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Close this chapter…'),'menu');
 await evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Close this chapter…').click());
 await until(()=>!!document.querySelector('#muse-close-chapter'),'close dialog');await setValue('#muse-close-chapter textarea','Saying yes.');await click('#muse-close-chapter button[type=submit]');
 await until(()=>/Closed and kept/.test(document.querySelector('#muse-close-chapter')?.textContent??''),'closed');
 await click('#muse-close-chapter button','Carry something forward');await until(()=>!!document.querySelector('#muse-carry-forward'),'carry');
 await setValue('#muse-carry-forward .muse-compass-statement input','The Season of Plenty');
 await evaluate(()=>document.querySelectorAll('#muse-carry-forward .muse-stories-carry input').forEach(i=>i.click()));
 await click('#muse-carry-forward button[type=submit]');await until(()=>document.querySelector('#chapter-title')?.textContent==='The Season of Plenty','new chapter');
 const next=must(await admin.from('inner_chapters').select('id,carried_from').eq('user_id',userId).eq('title','The Season of Plenty').single());
 check(next.carried_from===ch.id,'the new chapter remembers where it came from');
 check((await count('inner_modules',{chapter_id:next.id}))>=2,'chosen words, mantras and discoveries carry forward');
 check(await count('inner_experiences')===2&&await count('inner_chapter_experiences',{chapter_id:ch.id})===1,'closing never touches experiences');
 await shoot('08-carried',true);

 // ---- Daily Edit widget (opt-in) and Life Atlas link ----
 must(await client.from('inner_chapters').update({closed_at:null,is_primary:true,show_on_daily:true}).eq('id',ch.id));
 await go('/','!!document.querySelector("#daily-chapter")','daily edit');
 check(await has('#daily-chapter','Prosperity')&&await has('#daily-chapter','There is enough'),'the Daily Edit shows the primary chapter and featured mantra, by opt-in');
 await evaluate(()=>document.querySelector('#daily-chapter').scrollIntoView());await shoot('09-daily');
 const spirit=must(await client.from('life_areas').select('id').eq('label','Spirituality').single());
 const aspId=crypto.randomUUID();must(await client.from('aspirations').insert({id:aspId,title:'Keep a monthly circle',start_date:'2026-11-01',target_date:'2026-12-31',timeframe:'year',progress_kind:'binary'}));
 must(await client.rpc('set_aspiration_primary_area',{p_aspiration_id:aspId,p_area_id:spirit.id}));
 await go('/envision','!!document.querySelector(".muse-lifeatlas-area-stories")','atlas link').catch(()=>{});
 await evaluate(()=>document.querySelector('.muse-lifeatlas-area-stories')?.closest('section')?.scrollIntoView()).catch(()=>{});await shoot('09b-atlas');
 check(await has('.muse-lifeatlas-area-stories','experience'),'the Life Atlas links to associated experiences');

 // ---- Phone ----
 await viewport(390,844,true);
 for(const [path,name,ready] of [['/envision?view=inner-compass&realm=chapters','10-phone-chapters','.muse-stories-volumes'],[`/envision?view=inner-compass&realm=chapters&chapter=${ch.id}`,'11-phone-chapter','#chapter-title'],[`/envision?view=inner-compass&realm=experiences&experience=${evening.id}`,'12-phone-experience','#experience-title'],['/envision?view=inner-compass&realm=experiences','13-phone-experiences','.muse-stories-tile']]){
  await go(path,`!!document.querySelector("${ready}")`,name);await wait(400);check(!(await overflow()),`${name}: no sideways scroll`);await shoot(name,true);
 }
 await viewport(1280);
 for(const theme of ['prism-noir','astral']){
  sql(`insert into public.appearance_preferences(user_id,theme,material,updated_at) values ('${userId}','${theme}','frosted',now()) on conflict (user_id) do update set theme=excluded.theme,updated_at=now()`);
  await evaluate(t=>localStorage.setItem('muse.theme',t),theme);
  await go(`/envision?view=inner-compass&realm=chapters`,'!!document.querySelector(".muse-stories-volumes")','themed');await wait(500);await shoot(`14-${theme}`,true);
 }
 check(errors.length===0,`no runtime errors (${errors.join(' | ').slice(0,400)})`);
 console.log(`PASS Inner Compass stories UI: ${passed} checks. Screenshots in ${shots}`);
}catch(e){try{await globalThis.__shoot?.('fail');}catch{}console.log('ERRORS:',JSON.stringify(globalThis.__errors??[]).slice(0,3000));throw e;}finally{
 if(userId)await admin.auth.admin.deleteUser(userId).catch(()=>undefined);console.log('Disposable account removed.');
 try{socket?.close();}catch{}chrome?.kill();await wait(800);try{rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:300});}catch{}
}
