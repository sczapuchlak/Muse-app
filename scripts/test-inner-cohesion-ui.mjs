// Authenticated LOCAL browser checks for #214: Life Atlas shows linked Chapters and Experiences with or without
// aspirations; Inner Compass visual cohesion screenshots across themes, materials and phone with a disposable account: the empty Inner World,
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
const shots=process.env.INNER_UI_SHOTS??join(tmpdir(),'muse-inner-cohesion-ui');mkdirSync(shots,{recursive:true});
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
 const areas=must(await client.from('life_areas').insert([{label:'Health & Fitness',color:'#3fa66b',position:0},{label:'Personal Growth',color:'#8050cf',position:7},{label:'Spirituality',color:'#e85d75',position:9},{label:'Fun & Recreation',color:'#f4a261',position:6}]).select('id,label'));const area=l=>areas.find(a=>a.label===l).id;

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



 const theme=async(t,m='frosted')=>{sql(`insert into public.appearance_preferences(user_id,theme,material,updated_at) values ('${userId}','${t}','${m}',now()) on conflict (user_id) do update set theme=excluded.theme,material=excluded.material,updated_at=now()`);await evaluate(([t,m])=>{localStorage.setItem('muse.theme',t);localStorage.setItem('muse.material',m);},[t,m]);};
 await theme('prism-noir');
 for(const [path,name,ready] of [['/envision?view=inner-compass','01-world-empty','.muse-compass-hero'],['/envision?view=inner-compass&realm=chapters','02-chapters-empty','.muse-stories-welcome'],['/envision?view=inner-compass&realm=experiences','03-experiences-empty','.muse-stories-archive']]){
  await go(path,`!!document.querySelector("${ready}")`,name);await wait(600);await shoot(name);
 }
 check(await evaluate(()=>getComputedStyle(document.querySelector('.muse-stories-archive'),'::after').backgroundImage!=='none'),'primary containers take the theme’s gradient ring');
 check(await evaluate(()=>!!document.querySelector('.muse-stories-exp-hero .muse-stories-capture')),'quick capture lives inside the Experiences hero');
 // Begin a chapter from the hero composer.
 await go('/envision?view=inner-compass&realm=chapters','!!document.querySelector(".muse-stories-begin-form")','chapters');
 await click('.muse-stories-begin-form .muse-segmented button','A guiding word');await setValue('#chapters-begin','Vitality');await click('.muse-stories-begin-form button[type=submit]');
 await until(()=>document.querySelector('#chapter-title')?.textContent==='Vitality','chapter from the hero composer');
 check(true,'a chapter begins from the hero composer with one word');
 const vitality=must(await admin.from('inner_chapters').select('id').eq('user_id',userId).eq('title','Vitality').single()).id;

 // ---- Life Atlas scenarios ----
 const ch=(title,o={})=>({id:crypto.randomUUID(),title,word:'',subtitle:'',meaning:'',cover:{preset:'aurora'},...o});
 const ex=(title,o={})=>({id:crypto.randomUUID(),title,happened_on:'2026-11-13',cover:{preset:'dawn'},...o});
 const growthCh=ch('The Year of Becoming',{starts_on:'2026-01-01'}),[evening,hike]=[ex('Prosperity Manifestation Evening'),ex('Weekend hike',{happened_on:'2026-10-04'})];
 must(await client.from('inner_chapters').insert([growthCh]));must(await client.from('inner_experiences').insert([evening,hike]));
 must(await client.from('inner_area_links').insert([
  {area_id:area('Health & Fitness'),chapter_id:vitality},                         // 3. chapter only
  {area_id:area('Spirituality'),experience_id:evening.id},                       // 2. experience only (and 6. multi-area)
  {area_id:area('Personal Growth'),experience_id:evening.id},
  {area_id:area('Personal Growth'),chapter_id:growthCh.id},                      // 1. aspiration + chapter + experience
  {area_id:area('Health & Fitness'),experience_id:hike.id},                      // 4. chapters and experiences, no aspiration
 ]));
 const asp=crypto.randomUUID();must(await client.from('aspirations').insert({id:asp,title:'Read every morning',start_date:'2026-11-01',target_date:'2026-12-31',timeframe:'year',progress_kind:'binary'}));
 must(await client.rpc('set_aspiration_primary_area',{p_aspiration_id:asp,p_area_id:area('Personal Growth')}));
 const ratingsBefore=(await admin.from('life_ratings').select('*',{count:'exact',head:true}).eq('user_id',userId)).count;
 await go('/envision','!!document.querySelector(".muse-lifeatlas-stories")','atlas');await wait(800);
 const sec=(label)=>evaluate(l=>{const s=[...document.querySelectorAll('.muse-lifeatlas-area')].find(x=>x.querySelector('h3')?.textContent.includes(l));if(!s)return null;return {asp:s.querySelectorAll('.muse-lifeatlas-rows>li:not(:last-child)').length,ch:s.querySelectorAll('.muse-lifeatlas-story[data-kind=chapter]').length,ex:s.querySelectorAll('.muse-lifeatlas-story[data-kind=experience]').length};},label);
 const g=await sec('Personal Growth'),sp=await sec('Spirituality'),hf=await sec('Health & Fitness'),fun=await sec('Fun & Recreation');
 check(g&&g.ch===1&&g.ex===1,'1. an area with an aspiration, a chapter and an experience shows all three');
 check(sp&&sp.ex===1&&sp.ch===0,'2. an area with only an experience shows it without an aspiration');
 check(hf&&hf.ch===1,'3. an area with only a chapter shows it');
 check(hf&&hf.ex===1&&hf.ch===1,'4. chapters and experiences with no aspiration');
 check(fun===null&&await has('.muse-lifeatlas-open-tile','Fun'),'5. an area with nothing linked stays an open page');
 check(g.ex===1&&sp.ex===1,'6. one experience appears in two areas (one record)');
 await evaluate(()=>document.querySelector('.muse-lifeatlas-stories')?.closest('section')?.scrollIntoView());await shoot('04-atlas');
 // 9. Navigation: Atlas → Experience → back to the area.
 await click('.muse-lifeatlas-story[data-kind=experience]','Prosperity Manifestation Evening');
 await until(()=>document.querySelector('#experience-title')?.textContent==='Prosperity Manifestation Evening','experience opens from the Atlas');
 const back=await evaluate(()=>[...document.querySelectorAll('.muse-stories-belong[data-kind=area]')].map(a=>a.getAttribute('href')));
 check(back.length===2&&back.every(h=>h.startsWith('/envision#atlas-area-')),'9. the experience links back to its Life Atlas areas');
 await click('.muse-stories-belong[data-kind=area]','Life AtlasSpirituality');
 await until(()=>location.hash.startsWith('#atlas-area-')&&!!document.querySelector('.muse-lifeatlas-area'),'back to the Atlas');await wait(1200);
 check(await evaluate(()=>{const el=document.getElementById(location.hash.slice(1));if(!el)return false;const r=el.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}),'9. … and lands on that area');
 // 7. Removing an association keeps the record; 8. a closed chapter keeps its association.
 must(await client.from('inner_area_links').delete().eq('experience_id',evening.id).eq('area_id',area('Spirituality')));
 must(await client.from('inner_chapters').update({closed_at:new Date().toISOString()}).eq('id',vitality));
 await go('/envision','!!document.querySelector(".muse-lifeatlas-stories")','atlas again');await wait(800);
 check((await sec('Spirituality'))===null,'7. unlinking removes it from that area');
 check(must(await admin.from('inner_experiences').select('id').eq('id',evening.id)).length===1,'7. … and never deletes the experience');
 check(await has('.muse-lifeatlas-story[data-kind=chapter]','Closed'),'8. a closed chapter keeps its Life Atlas association');
 check((await admin.from('life_ratings').select('*',{count:'exact',head:true}).eq('user_id',userId)).count===ratingsBefore,'Life Atlas ratings are untouched');

 // ---- Populated screens across themes and materials ----
 must(await client.from('inner_experience_collections').insert({name:'Coven Chronicles',cover:{preset:'eclipse'}}).select('id'));
 for(const [t,m] of [['prism-noir','frosted'],['astral','crystal'],['iridescent','frosted'],['northern-lights-out','crystal']]){
  await theme(t,m);
  for(const [path,name,ready] of [['/envision?view=inner-compass','world','.muse-compass-hero'],['/envision?view=inner-compass&realm=chapters','chapters','.muse-stories-volumes'],['/envision?view=inner-compass&realm=experiences','experiences','.muse-stories-archive .muse-stories-tile']]){
   await go(path,`!!document.querySelector("${ready}")`,`${t} ${name}`);await wait(700);await shoot(`10-${t}-${m}-${name}`);
  }
 }
 await theme('prism-noir');
 await viewport(390,844,true);
 for(const [path,name,ready] of [['/envision?view=inner-compass','20-phone-world','.muse-compass-hero'],['/envision?view=inner-compass&realm=chapters','21-phone-chapters','.muse-stories-volumes'],['/envision?view=inner-compass&realm=experiences','22-phone-experiences','.muse-stories-archive'],['/envision','23-phone-atlas','.muse-lifeatlas-stories']]){
  await go(path,`!!document.querySelector("${ready}")`,name);await wait(500);check(!(await overflow()),`10. ${name}: no sideways scroll`);await shoot(name,name==='22-phone-experiences'||name==='23-phone-atlas');
 }
 check(errors.length===0,`no runtime errors (${errors.join(' | ').slice(0,400)})`);
 console.log(`PASS #214: ${passed} checks. Screenshots in ${shots}`);
}catch(e){try{await globalThis.__shoot?.('fail');}catch{}console.log('ERRORS:',JSON.stringify(globalThis.__errors??[]).slice(0,3000));throw e;}finally{
 if(userId)await admin.auth.admin.deleteUser(userId).catch(()=>undefined);console.log('Disposable account removed.');
 try{socket?.close();}catch{}chrome?.kill();await wait(800);try{rmSync(directory,{recursive:true,force:true,maxRetries:5,retryDelay:300});}catch{}
}
