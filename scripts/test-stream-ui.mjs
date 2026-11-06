// Authenticated LOCAL browser journey for Stream (#27) with two disposable accounts: default audience, reactions that
// persist, motion that respects Muse Magic and reduced motion, spoilers, comments, hiding Stream from navigation, and
// every registered theme on desktop and phone. Requires `npm run dev`. Run: npm run test:stream:ui
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {mkdtempSync,readFileSync,existsSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir,homedir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
loadEnvFile('.env.local');
const origin=process.env.STREAM_UI_ORIGIN??'http://localhost:3000',url=process.env.NEXT_PUBLIC_SUPABASE_URL;
for(const endpoint of [origin,url])assert.ok(['localhost','127.0.0.1'].includes(new URL(endpoint).hostname),'Disposable checks must remain local');
const shots=process.env.STREAM_UI_SHOTS??join(tmpdir(),'muse-stream-ui');mkdirSync(shots,{recursive:true});
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options),must=r=>{if(r.error)throw Error(r.error.message);return r.data;};
const docker=process.env.MUSE_DOCKER_PATH||(existsSync(homedir()+'/.docker/bin/docker')?homedir()+'/.docker/bin/docker':'docker');
const sql=text=>{const r=spawnSync(docker,['exec','-i','supabase_db_muse-local','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],{input:text,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();};
const tag=crypto.randomUUID().slice(0,6),users=[];
async function person(name){
 const link=must(await admin.auth.admin.generateLink({type:'invite',email:`stream-ui-${name}-${crypto.randomUUID()}@example.test`}));users.push(link.user.id);
 const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token}));
 sql(`update public.profiles set first_name='${name}',time_zone='UTC',time_zone_confirmed_at=now(),onboarded_at=now() where id='${link.user.id}'`);
 const pid=must(await client.rpc('social_create_identity',{p_username:`${name}${tag}`,p_display_name:name[0].toUpperCase()+name.slice(1)}));
 return {id:link.user.id,client,pid,email:link.user.email,username:`${name}${tag}`};
}
const directory=mkdtempSync(join(tmpdir(),'muse-stream-ui-'));let chrome,socket,passed=0;
const check=(cond,label)=>{assert.ok(cond,label);passed++;console.log('✓',label);};
try{
 const [me,ava]=await Promise.all([person('stevie'),person('ava')]);
 must(await ava.client.from('social_identities').update({discoverable:true}).eq('user_id',ava.id));
 must(await me.client.rpc('social_send_request',{p_target:ava.pid}));must(await ava.client.rpc('social_accept',{p_target:me.pid}));
 const plain=crypto.randomUUID(),spoiled=crypto.randomUUID();
 must(await ava.client.rpc('stream_publish',{p_id:plain,p_body:'emotionally attached to a fictional vampire.',p_audience:'friends',p_decoration:'in-my-feelings'}));
 must(await ava.client.rpc('stream_publish',{p_id:spoiled,p_body:'cannot believe the twist where the narrator was the ghost',p_audience:'friends',p_spoiler:true}));

 chrome=spawn(process.env.CHROME_BIN??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--hide-scrollbars','--remote-debugging-port=0',`--user-data-dir=${join(directory,'profile')}`],{stdio:'ignore'});
 const portFile=join(directory,'profile/DevToolsActivePort');for(let i=0;!existsSync(portFile)&&i<100;i++)await new Promise(r=>setTimeout(r,100));
 const port=readFileSync(portFile,'utf8').split('\n')[0],targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.onopen=r);
 let id=0;const pending=new Map(),errors=[];
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown'){const t=m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text;if(!/negative time stamp/.test(t))errors.push(t);}
  if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});socket.send(JSON.stringify({id:key,method,params}));});
 const evaluate=async(fn,args)=>{const r=await send('Runtime.evaluate',{expression:`(${fn})(${JSON.stringify(args)})`,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result?.value;};
 const until=async(fn,message,args)=>{for(let i=0;i<200;i++){if(await evaluate(fn,args).catch(()=>false))return;await new Promise(r=>setTimeout(r,100));}throw Error(message);};
 const viewport=(width,height=900)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
 const shoot=async name=>{await new Promise(r=>setTimeout(r,300));const r=await send('Page.captureScreenshot',{format:'png'});writeFileSync(join(shots,`${name}.png`),Buffer.from(r.data,'base64'));};
 const overflow=()=>evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
 const open=async()=>{await evaluate(()=>{window.__old=1;}).catch(()=>{});await send('Page.navigate',{url:`${origin}/stream`});await until(()=>!window.__old&&!!document.querySelector('.muse-stream-feed .muse-stream-post'),'feed loads');};
 const setText=(selector,value)=>evaluate(({selector,value})=>{const t=document.querySelector(selector);Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,value);t.dispatchEvent(new Event('input',{bubbles:true}));},{selector,value});
 const clickText=(selector,text)=>evaluate(({selector,text})=>{const b=[...document.querySelectorAll(selector)].find(x=>x.textContent.trim()===text&&!x.disabled);if(!b)throw Error('missing '+text);b.click();},{selector,text});
 await send('Page.enable');await send('Runtime.enable');await viewport(1280);
 const link=must(await admin.auth.admin.generateLink({type:'magiclink',email:me.email}));
 await send('Page.navigate',{url:`${origin}/auth/confirm?token_hash=${link.properties.hashed_token}&type=email&next=/`});await until(()=>location.pathname==='/'&&!!document.querySelector('main'),'signed in');

 // Feed, spoilers and the one contextual reaction.
 await open();
 check(await evaluate(()=>document.querySelector('.muse-stream-feed').innerText.includes('fictional vampire')),'a friend’s status appears in the feed');
 check(await evaluate(()=>!document.body.innerText.includes('narrator was the ghost')&&!!document.querySelector('.muse-stream-spoiler')),'spoilers are hidden until revealed');
 await evaluate(()=>document.querySelector('.muse-stream-spoiler button').click());
 check(await evaluate(()=>document.body.innerText.includes('narrator was the ghost')),'Reveal shows the spoiler');
 check(await evaluate(()=>[...document.querySelectorAll('.muse-stream-actions')].every(a=>a.querySelectorAll('.muse-stream-reaction').length===1&&!!a.querySelector('.muse-stream-comment-toggle'))),'each post offers exactly one reaction plus Comment');
 const card=`[aria-labelledby="post-${plain}"]`;
 await evaluate(c=>document.querySelector(`${c} .muse-stream-reaction`).click(),card);
 await until(c=>document.querySelector(`${c} .muse-stream-reaction`).getAttribute('aria-pressed')==='true','reaction lands',card);
 const animated=await evaluate(c=>{const i=document.querySelector(`${c} .muse-stream-burst i`);return i?getComputedStyle(i).animationName:'none';},card);
 check(animated!=='none','the reaction gesture plays once after it lands');
 await evaluate(()=>{window.__old=1;});await send('Page.reload');await until(c=>!window.__old&&document.readyState==='complete'&&!!document.querySelector(`${c} .muse-stream-reaction`),'reloaded',card);
 check(await evaluate(c=>document.querySelector(`${c} .muse-stream-reaction`).getAttribute('aria-pressed')==='true',card),'the reaction persists after a reload');
 check(must(await ava.client.rpc('stream_post',{p_id:plain})).reactionCount===1,'the author sees one reaction');

 // Reduced motion and Quiet Muse Magic: the reaction still works, without the gesture.
 await evaluate(c=>document.querySelector(`${c} .muse-stream-reaction`).click(),card);await until(c=>document.querySelector(`${c} .muse-stream-reaction`).getAttribute('aria-pressed')==='false','reaction removed',card);
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await evaluate(c=>document.querySelector(`${c} .muse-stream-reaction`).click(),card);await until(c=>!!document.querySelector(`${c} .muse-stream-burst i`),'burst element',card);
 check(await evaluate(c=>getComputedStyle(document.querySelector(`${c} .muse-stream-burst i`)).animationName==='none',card),'reduced motion: no gesture');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
 await evaluate(()=>document.documentElement.setAttribute('data-magic','quiet'));
 check(await evaluate(c=>getComputedStyle(document.querySelector(`${c} .muse-stream-burst i`)).animationName==='none',card),'Quiet Muse Magic: no gesture');
 await evaluate(()=>document.documentElement.setAttribute('data-magic','magical'));

 // Comments.
 await evaluate(c=>document.querySelector(`${c} .muse-stream-comment-toggle`).click(),card);await until(c=>!!document.querySelector(`${c} .muse-stream-comment-form textarea`),'comment box',card);
 await setText(`${card} .muse-stream-comment-form textarea`,'Which vampire, though?');await evaluate(c=>document.querySelector(`${c} .muse-stream-comment-form button[type=submit]`).click(),card);
 await until(c=>document.querySelector(`${c} .muse-stream-comments ol`)?.innerText.includes('Which vampire'),'comment posts',card);
 check(must(await ava.client.rpc('stream_comments',{p_post:plain})).some(c=>c.body==='Which vampire, though?'),'the author can read the comment');

 // Composer: Only me by default, preview before publishing.
 check(await evaluate(()=>[...document.querySelectorAll('.muse-stream-composer .muse-segmented button')].find(b=>b.getAttribute('aria-pressed')==='true')?.textContent==='Only me'),'new posts start as Only me');
 await setText('.muse-stream-is textarea','contemplating another unnecessary hobby.');await clickText('.muse-stream-composer button','Preview');
 await until(()=>document.querySelector('.muse-stream-composer')?.getAttribute('aria-label')==='Preview your post','preview');
 check(await evaluate(()=>document.querySelector('.muse-stream-composer').innerText.includes('Only you will see this')),'the preview states the audience');
 await shoot('stream-preview');
 await clickText('.muse-stream-composer button','Save to Only me');await until(()=>document.querySelector('.muse-stream-feed').innerText.includes('unnecessary hobby'),'saved privately');
 check(!must(await ava.client.rpc('stream_feed',{})).some(p=>p.body?.includes('unnecessary hobby')),'an Only me post never reaches friends');

 // Hiding Stream from navigation leaves posts and friendships alone.
 await clickText('.muse-stream-header-actions button','Settings');await until(()=>!!document.querySelector('.muse-stream-settings input'),'settings');
 await evaluate(()=>[...document.querySelectorAll('.muse-stream-settings label')].find(l=>l.textContent.includes('Show Stream in my navigation')).querySelector('input').click());
 await until(()=>![...document.querySelectorAll('.muse-rail a')].some(a=>a.getAttribute('href')==='/stream'),'Stream leaves the navigation');
 check(true,'hiding Stream removes it from the navigation');
 check(must(await ava.client.rpc('stream_feed',{})).length>0&&must(await ava.client.rpc('stream_post',{p_id:plain}))!==null,'…while posts stay exactly as published');
 await evaluate(()=>[...document.querySelectorAll('.muse-stream-settings label')].find(l=>l.textContent.includes('Show Stream in my navigation')).querySelector('input').click());
 await until(()=>[...document.querySelectorAll('.muse-rail a')].some(a=>a.getAttribute('href')==='/stream'),'Stream returns');

 // Every registered theme, desktop and phone.
 const themeIds=[...readFileSync('lib/themes.ts','utf8').matchAll(/\{ id: "([a-z-]+)", name:/g)].map(m=>m[1]);assert.ok(themeIds.length>=9,'registered themes found');
 for(const width of [1280,390]){await viewport(width);await open();
  for(const theme of themeIds){await evaluate(t=>document.documentElement.setAttribute('data-theme',t),theme);await new Promise(r=>setTimeout(r,120));
   assert.equal(await overflow(),false,`${theme} at ${width}px: no horizontal overflow`);}
  passed++;console.log('✓',`all ${themeIds.length} themes fit at ${width}px`);
  await evaluate(()=>document.documentElement.setAttribute('data-theme','astral'));await shoot(`stream-${width}`);}
 assert.deepEqual(errors,[],'no uncaught browser errors');passed++;
 console.log(`Stream UI: ${passed} checks passed. Screenshots in ${shots}`);
}finally{
 try{socket?.close();}catch{}chrome?.kill();
 for(const user of users)await admin.auth.admin.deleteUser(user).catch(()=>{});
 await new Promise(r=>setTimeout(r,300));try{rmSync(directory,{recursive:true,force:true,maxRetries:5});}catch{/* temp profile */}
}
