// Authenticated LOCAL browser journey for Inner Compass (#210) with a disposable account: the empty Inner World,
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
const shots=process.env.INNER_UI_SHOTS??join(tmpdir(),'muse-inner-compass-ui');mkdirSync(shots,{recursive:true});
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
 must(await client.from('life_areas').insert([{label:'Growth',color:'#8050cf',position:0},{label:'Love',color:'#e85d75',position:1},{label:'Creativity',color:'#f4a261',position:2}]));

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
 const overflow=()=>evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
 const go=async(path,ready,label)=>{await evaluate(()=>{window.__old=1;}).catch(()=>{});await send('Page.navigate',{url:`${origin}${path}`});await until(new Function(`return !window.__old&&(${ready})`),label);};
 const setValue=(selector,value)=>evaluate(({selector,value})=>{const t=document.querySelector(selector);if(!t)throw Error('missing '+selector);const proto=t instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(t,value);t.dispatchEvent(new Event('input',{bubbles:true}));},{selector,value});
 const click=(selector,text)=>evaluate(({selector,text})=>{const b=[...document.querySelectorAll(selector)].find(x=>(text==null||x.textContent.trim()===text||x.textContent.trim().startsWith(text)||x.getAttribute('aria-label')===text)&&!x.disabled);if(!b)throw Error('missing '+selector+' '+text);b.click();},{selector,text});
 const has=(selector,text)=>evaluate(({selector,text})=>[...document.querySelectorAll(selector)].some(x=>!text||x.textContent.includes(text)),{selector,text});
 await send('Page.enable');await send('Runtime.enable');await send('DOM.enable');await viewport(1280);
 const magic=must(await admin.auth.admin.generateLink({type:'magiclink',email:link0.user.email}));
 await send('Page.navigate',{url:`${origin}/auth/confirm?token_hash=${magic.properties.hashed_token}&type=email&next=/`});await until(()=>location.pathname==='/'&&!!document.querySelector('main'),'signed in');

 // ---- Empty Inner World ----
 await go('/envision?view=inner-compass','!!document.querySelector(".muse-compass-hero")','overview');
 check(await has('[aria-label="Envision views"]','Inner Compass'),'Inner Compass is an Envision tab');
 check((await evaluate(()=>document.querySelectorAll('.muse-compass-label').length))===6&&(await evaluate(()=>document.querySelectorAll('.muse-compass-facet').length))===6,'six collections on the star chart and as facets');
 check(await count('inner_discoveries')===0&&await count('inner_manifestos')===0,'visiting creates nothing');
 await shoot('01-empty-overview',true);

 // ---- Quick add: a category and a few words ----
 await click('.muse-compass-hero .muse-compass-cats button','Character');
 await setValue('.muse-compass-hero .muse-compass-statement textarea','Generosity, even when life is difficult');
 await click('.muse-compass-hero button[type=submit]');
 await until(()=>/Added/.test(document.querySelector('.muse-compass-quickadd [role=status]')?.textContent??''),'quick add saved');
 check(await count('inner_discoveries',{category:'character'})===1,'quick add saves with only a category and a statement');

 // ---- Seed a living Inner World through the owner's own client ----
 const D=(category,title,extra={})=>({id:crypto.randomUUID(),category,title,meaning:'',favorite:false,details:{},tags:[],...extra});
 const seed=[
  D('values','Curiosity',{meaning:'Wanting to know how things work, and why people are the way they are.',favorite:true,details:{stance:'core',why:'A life without questions feels small.',practice:'Asking the second question.'},tags:['mind','growth']}),
  D('values','Freedom',{meaning:'Room to choose the shape of my days.',details:{stance:'core'},tags:['freedom']}),
  D('values','Tenderness',{details:{stance:'cultivating'}}),
  D('character','Courage',{meaning:'Acting while afraid.',details:{stance:'cultivating',practice:'Saying the honest thing kindly.'}}),
  D('character','Playfulness',{details:{stance:'rediscovered'},favorite:true}),
  D('beliefs','Meaningful relationships require mutual curiosity.',{details:{stance:'held',why:'The friendships that lasted were the curious ones.'}}),
  D('beliefs','Rest is productive.',{details:{stance:'questioning'}}),
  D('philosophy','An interesting life is worth more to me than a perfectly predictable one.',{favorite:true,details:{kind:'principle',theme:'Living'}}),
  D('philosophy','Tell me, what is it you plan to do with your one wild and precious life?',{details:{kind:'quote',attribution:'Mary Oliver',theme:'Living'}}),
  D('philosophy','Leave every room a little kinder than you found it.',{details:{kind:'saying',theme:'People'}}),
  D('boundaries','I protect time for myself without needing to justify it.',{details:{area:'time',why:'I come back to people better.'}}),
  D('patterns','I feel most like myself when I’m exploring something unfamiliar.',{details:{kind:'thrive'},tags:['travel']}),
  D('patterns','Crowded weeks make me go quiet.',{details:{kind:'drains'}}),
 ];
 must(await client.from('inner_discoveries').insert(seed));
 const belief=seed[6];must(await client.rpc('record_inner_evolution',{p_id:belief.id,p_revision:1,p_title:'Rest is part of the work, not a reward for it.',p_meaning:'',p_details:{stance:'held'},p_reason:'A year of burning out taught me otherwise.',p_reflection:'',p_evolved_on:'2026-10-02'}));
 const [a,b]=[seed[0].id,seed[5].id].sort();must(await client.from('inner_discovery_links').insert({a_id:a,b_id:b}));
 await go('/envision?view=inner-compass','document.querySelectorAll(".muse-compass-star").length>=14','overview with discoveries');
 check(await evaluate(()=>document.querySelectorAll('.muse-compass-lines line').length)===1,'a connection is drawn as a constellation line');
 check(await evaluate(()=>document.querySelectorAll('.muse-compass-star[data-evolved]').length)===1,'the evolved discovery wears a ring');
 await shoot('02-overview',true);

 // ---- Collections ----
 await go('/envision?view=inner-compass&space=collections&cat=values','document.querySelectorAll(".muse-compass-grid .muse-compass-card").length===3','values collection');
 await shoot('03-values');
 await go('/envision?view=inner-compass&space=collections','document.querySelectorAll(".muse-compass-grid .muse-compass-card").length===14','everything');
 await setValue('.muse-compass-toolbar input[type=search]','curiosity');
 await until(()=>document.querySelectorAll('.muse-compass-grid .muse-compass-card').length===2,'search finds titles and meanings');
 check(true,'search finds words in titles and meanings');
 await go('/envision?view=inner-compass&space=collections&cat=philosophy','!!document.querySelector(".muse-compass-commonplace")','philosophy');
 check(await has('.muse-compass-commonplace-theme','Living')&&await has('.muse-compass-card-credit','Mary Oliver'),'Philosophy reads as a commonplace book with themes and credits');
 await shoot('04-philosophy');

 // ---- Detail: ordinary edit vs evolution, connections, areas, reflections ----
 await go(`/envision?view=inner-compass&space=collections&cat=values&d=${seed[0].id}`,'!!document.querySelector(".muse-compass-detail-title")','detail');
 await shoot('05-detail');
 await click('.muse-compass-detail-actions button','Edit');
 await setValue('.muse-compass-editor .muse-compass-statement textarea','Curiosity!');
 check(await has('.muse-compass-hint','understanding changed'),'changing the words offers Record evolution, without forcing it');
 await click('.muse-compass-editor button[type=submit]','Save');
 await until(()=>document.querySelector('.muse-compass-detail-title')?.textContent==='Curiosity!','edit saved');
 check(await count('inner_discovery_versions',{discovery_id:seed[0].id})===0,'an ordinary edit creates no version');
 await click('.muse-compass-detail-actions button','Record evolution');
 await setValue('.muse-compass-editor .muse-compass-statement textarea','Curiosity, even about the people I disagree with');
 await setValue('.muse-compass-editor label:nth-of-type(3) textarea','A long conversation with my sister.');
 await click('.muse-compass-editor button[type=submit]','Record evolution');
 await until(()=>!!document.querySelector('.muse-compass-history'),'history shows');
 check(await count('inner_discovery_versions',{discovery_id:seed[0].id})===1,'Record evolution keeps the earlier words as a version');
 check(await has('.muse-compass-history-words[data-earlier]','Curiosity!'),'the timeline shows the earlier words as earlier');
 await click('.muse-compass-areas button','Growth');
 await until(()=>document.querySelector('.muse-compass-areas button[aria-pressed=true]')!==null,'area chosen');
 await wait(500);check(await count('inner_discovery_areas')===1,'a Life Atlas area is associated, optionally');
 await click('.muse-compass-detail-actions button','Reflect on this');
 await setValue('#compass-reflect-body','Today I asked the second question and it changed the whole dinner.');
 await click('.muse-compass-reflect .muse-chip-row button','curious');
 await click('.muse-compass-reflect button[type=submit]','Save reflection');
 await until(()=>!!document.querySelector('.muse-compass-reflection-body'),'reflection saved');
 check(await count('inner_reflections',{discovery_id:seed[0].id})===1,'reflection saved with the discovery');
 await shoot('06-detail-history',false);
 await evaluate(()=>{const d=document.querySelector('.muse-compass-detail');d.scrollTop=d.scrollHeight;});await shoot('06b-detail-bottom');
 await click('#muse-compass-detail .muse-modal-universal-close button');
 await until(()=>!document.querySelector('#muse-compass-detail'),'detail closed');

 // ---- Values garden ----
 await go('/envision?view=inner-compass&space=collections&cat=values','!!document.querySelector(".muse-compass-collection-actions")','values');
 await click('.muse-compass-collection-actions button','Discover values');
 await until(()=>!!document.querySelector('.muse-compass-words'),'garden');
 check(await has('.muse-compass-words button[disabled]','Already yours'),'values already held are marked as yours');
 await shoot('07-garden');
 await click('.muse-compass-words button','Wonder');await click('.muse-compass-words button','Integrity');
 await click('.muse-compass-garden-foot button','Gather');
 await click('.muse-compass-gathered li:first-child .muse-chip-row button','Core to me');
 await click('.muse-compass-garden-foot button','Define them');
 await setValue('.muse-compass-define li:first-child textarea','Being astonished on purpose, at least once a day.');
 await click('.muse-compass-garden-foot button','Keep 2 words');
 await until(()=>!!document.querySelector('.muse-compass-garden-done'),'garden saved');
 check(await count('inner_discoveries',{category:'values',source_kind:'garden'})===2,'garden words become value discoveries (no top-five limit)');
 await click('.muse-compass-garden-done button');

 // ---- A guided exploration, one answer kept as a discovery ----
 await go('/envision?view=inner-compass&space=explore','document.querySelectorAll(".muse-compass-explore-card").length>=30','explorations');
 check(await evaluate(()=>document.querySelectorAll('.muse-compass-explore-card').length)>=30,'at least 30 explorations');
 await shoot('08-explorations');
 await click('.muse-compass-explore-card','Identity');
 await until(()=>!!document.querySelector('.muse-compass-session-intro'),'session intro');
 await shoot('09-session-intro');
 await click('.muse-compass-session-intro button','Begin');
 await setValue('.muse-compass-prompts li:first-child textarea','Walking home at dusk with no plan. My hands were in my pockets and I was humming.');
 await click('.muse-compass-prompts li:first-child .muse-compass-keep-toggle');
 await shoot('10-session-write');
 await click('.muse-compass-session-write button[type=submit]');
 await until(()=>!!document.querySelector('.muse-compass-session-kept'),'exploration saved');
 check(await count('inner_exploration_responses')===1&&await count('inner_discoveries',{source_kind:'exploration'})===1,'the exploration and its kept answer are saved');
 await click('.muse-compass-session-kept button','Done');

 // ---- Evolution timeline ----
 await go('/envision?view=inner-compass&space=evolution','!!document.querySelector(".muse-compass-timeline")','evolution');
 check(await evaluate(()=>document.querySelectorAll('.muse-compass-timeline li[data-kind=evolved]').length)===2,'both evolutions appear in the timeline');
 await shoot('11-evolution',true);

 // ---- Manifesto: authored by the person, autosaved, versioned ----
 await go('/envision?view=inner-compass&space=manifesto','!!document.querySelector(".muse-compass-manifesto-view")','manifesto');
 await shoot('12-manifesto-empty');
 await click('.muse-compass-manifesto-bar button','Begin my manifesto');
 await until(()=>!!document.querySelector('.muse-compass-manifesto-desk'),'editor');
 check(await count('inner_manifestos')===0,'opening the editor creates nothing');
 await click('.muse-compass-manifesto-add .muse-choice-trigger','Add a heading: ＋ Heading');await until(()=>!!document.querySelector('.popover-choice'),'heading menu');await click('.popover-choice','What I value');
 await click('.muse-compass-manifesto-add .muse-choice-trigger','Add from my discoveries: ＋ From my discoveries');await until(()=>!!document.querySelector('.popover-choice'),'discovery menu');await click('.popover-choice','Values · Freedom');
 await click('.muse-compass-manifesto-add button','A line of my own');
 await setValue('.muse-compass-blocks li:last-child textarea','I will choose an interesting life over a tidy one.');
 await until(()=>false,'',null,25).catch(()=>{});
 await until(()=>/saved/i.test(document.querySelector('.muse-compass-manifesto-edit .muse-save-indicator')?.textContent??''),'manifesto autosaved',null,80).catch(()=>{});
 await wait(1500);
 check(await count('inner_manifestos')===1,'the manifesto autosaves once it has words');
 await click('.muse-compass-keep-version button[type=submit]');await wait(1200);
 check(await count('inner_manifesto_versions')===1,'Keep this version stores a dated copy');
 await click('.muse-compass-manifesto-bar button','Done');
 await until(()=>!!document.querySelector('.muse-compass-sheet h3'),'read view');
 check(await has('.muse-compass-sheet-line','Freedom')&&await has('.muse-compass-sheet-line','interesting life'),'the typeset manifesto shows the chosen and written lines');
 await shoot('13-manifesto',true);

 // ---- Intentions references a value (id + name snapshot), and links back to it ----
 const monday=sql(`select (date_trunc('week', now() at time zone 'UTC'))::date`);
 must(await client.from('intention_pages').insert({period:'week',period_start:monday,period_end:sql(`select ('${monday}'::date + 6)`),sections:[{id:'c1',type:'compass',title:'Values & qualities to honor',content:{items:[{id:'i1',ref:{kind:'discovery',id:seed[1].id,label:'Freedom'},note:'Say no to one thing.'}]}}]}));
 await go(`/planner?view=intentions&period=week&date=${monday}`,'!!document.querySelector(".muse-intentions-ref[data-kind=discovery] a")','intentions');
 check(await evaluate(()=>document.querySelector('.muse-intentions-ref[data-kind=discovery] a').getAttribute('href').includes('view=inner-compass&d=')),'an Intentions section references a value and links to it');
 await shoot('20-intentions');

 // ---- Phone ----
 await viewport(390,844,true);
 for(const [path,name,ready] of [['/envision?view=inner-compass','14-phone-overview','.muse-compass-hero'],['/envision?view=inner-compass&space=collections&cat=values','15-phone-values','.muse-compass-grid'],['/envision?view=inner-compass&space=manifesto','16-phone-manifesto','.muse-compass-sheet'],['/envision?view=inner-compass&space=explore','17-phone-explore','.muse-compass-explore-grid']]){
  await go(path,`!!document.querySelector("${ready}")`,name);await wait(300);
  check(!(await overflow()),`${name}: no sideways scroll on a phone`);await shoot(name,name==='14-phone-overview');
 }
 await go(`/envision?view=inner-compass&d=${seed[0].id}`,'!!document.querySelector(".muse-compass-detail-title")','phone detail');await shoot('18-phone-detail');
 check(!(await overflow()),'phone detail: no sideways scroll');

 // ---- Themes and materials ----
 await viewport(1280);
 for(const [theme,material] of [['prism-noir','frosted'],['astral','crystal'],['iridescent','frosted'],['disco-damage','crystal']]){
  await go('/envision?view=inner-compass','document.querySelectorAll(".muse-compass-star").length>=10','overview');
  await evaluate(({theme,material})=>{document.documentElement.dataset.theme=theme;document.documentElement.dataset.material=material;},{theme,material});
  await shoot(`19-theme-${theme}-${material}`);
 }
 check(errors.length===0,`no runtime errors (${errors.join(' | ').slice(0,300)})`);
 console.log(`PASS Inner Compass UI: ${passed} checks. Screenshots in ${shots}`);
}finally{
 if(userId)await admin.auth.admin.deleteUser(userId).catch(()=>undefined);console.log('Disposable Inner Compass UI account removed.');
 try{socket?.close();}catch{}chrome?.kill();await wait(800);try{rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:300});}catch{/* the browser profile is in the system temp folder */}
}
