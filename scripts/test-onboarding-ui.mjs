// Authenticated LOCAL browser QA for invited-user onboarding (#29). Disposable synthetic account; local requests only.
// Requires `npm run dev`. Screenshots go to ONBOARDING_UI_SHOTS (default: a temp folder).
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {mkdtempSync,readFileSync,existsSync,rmSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir,homedir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
loadEnvFile('.env.local');
const origin=process.env.ONBOARDING_UI_ORIGIN??process.env.SITE_URL??'http://localhost:3000',url=process.env.NEXT_PUBLIC_SUPABASE_URL;
for(const endpoint of [origin,url])assert.ok(['localhost','127.0.0.1'].includes(new URL(endpoint).hostname),'Disposable checks must remain local');
const shots=process.env.ONBOARDING_UI_SHOTS??join(tmpdir(),'muse-onboarding-ui');mkdirSync(shots,{recursive:true});
const admin=createClient(url,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),must=r=>{if(r.error)throw Error(r.error.message);return r.data;};
const docker=process.env.MUSE_DOCKER_PATH||(existsSync(homedir()+'/.docker/bin/docker')?homedir()+'/.docker/bin/docker':'docker');
const sql=text=>{const r=spawnSync(docker,['exec','-i','supabase_db_muse-local','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],{input:text,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();};
const directory=mkdtempSync(join(tmpdir(),'muse-onboarding-ui-'));let userId,chrome,socket,captured=0;
try{
 const email=`onboarding-ui-${crypto.randomUUID()}@example.test`,invite=must(await admin.auth.admin.generateLink({type:'invite',email}));userId=invite.user.id;
 assert.equal(sql(`select coalesce(onboarded_at::text,'null')||'|'||first_name||'|'||time_zone from public.profiles where id='${userId}'`),'null||UTC','the existing trigger provisions a private profile that needs setup');
 chrome=spawn(process.env.CHROME_BIN??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--hide-scrollbars','--remote-debugging-port=0',`--user-data-dir=${join(directory,'profile')}`],{stdio:'ignore'});
 const portFile=join(directory,'profile/DevToolsActivePort');for(let i=0;!existsSync(portFile)&&i<100;i++)await new Promise(r=>setTimeout(r,100));
 const port=readFileSync(portFile,'utf8').split('\n')[0],targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
 let id=0;const requests=new Map(),hosts=new Set(),errors=[];
 socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.method==='Page.javascriptDialogOpening'){const key=++id;requests.set(key,{resolve(){},reject(){}});socket.send(JSON.stringify({id:key,method:'Page.handleJavaScriptDialog',params:{accept:true}}));}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);if(m.method==='Network.requestWillBeSent'&&m.params?.request?.url.startsWith('http'))hosts.add(new URL(m.params.request.url).hostname);if(m.id&&requests.has(m.id)){const p=requests.get(m.id);requests.delete(m.id);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;requests.set(key,{resolve,reject});socket.send(JSON.stringify({id:key,method,params}));});
 const evaluate=async(fn,args)=>{const r=await send('Runtime.evaluate',{expression:`(${fn})(${JSON.stringify(args)})`,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('Browser expression failed: '+(r.exceptionDetails.exception?.description??r.exceptionDetails.text));return r.result.value;};
 const until=async(fn,message,args)=>{for(let i=0;i<200;i++){if(await evaluate(fn,args).catch(()=>false))return;await new Promise(r=>setTimeout(r,150));}throw Error(`${message}; at ${await evaluate(()=>location.pathname+location.search)}; ${errors.slice(-2).join(' | ')}`);};
 const click=async(text,selector='button')=>{for(let i=0;i<80;i++){if(await evaluate(({text,selector})=>{const e=[...document.querySelectorAll(selector)].find(e=>e.textContent.trim()===text&&!e.disabled);if(!e)return false;e.scrollIntoView({block:'center'});e.focus();e.click();return true;},{text,selector}))return;await new Promise(r=>setTimeout(r,120));}assert.fail(`Control available: ${text}`);};
 const type=async(selector,value)=>{await evaluate(({selector})=>document.querySelector(selector).focus(),{selector});await evaluate(({selector})=>{const e=document.querySelector(selector);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'');e.dispatchEvent(new Event('input',{bubbles:true}));},{selector});await send('Input.insertText',{text:value});};
 const viewport=async(width,height=900)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:width<600?2:1,mobile:width<600});
 const shoot=async(name)=>{await new Promise(r=>setTimeout(r,350));const overflow=await evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);assert.equal(overflow,false,`${name}: no horizontal overflow`);const height=await evaluate(()=>Math.min(document.documentElement.scrollHeight,3200)),width=await evaluate(()=>document.documentElement.clientWidth);const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width,height,scale:1}});writeFileSync(join(shots,`${name}.png`),Buffer.from(shot.data,'base64'));captured++;};
 const profile=()=>sql(`select coalesce(onboarded_at is not null,false)::text||'|'||first_name||'|'||time_zone from public.profiles where id='${userId}'`);
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 await send('Emulation.setTimezoneOverride',{timezoneId:'Europe/Lisbon'});
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await viewport(390);

 // 1. Accepting the invitation signs her in and lands on onboarding, not Daily Edit.
 const inviteLink=`${origin}/auth/confirm?token_hash=${encodeURIComponent(invite.properties.hashed_token)}&type=invite`;
 await send('Page.navigate',{url:inviteLink});
 await until(()=>location.pathname==='/welcome'&&document.body.innerText.includes('Welcome to Muse.'),'Invitation lands on onboarding');
 assert.match(await evaluate(()=>document.body.innerText),/A little universe for everything that makes you, you\./);
 await shoot('welcome-hello-mobile');
 // 2. Refreshing mid-setup changes nothing and keeps her in onboarding.
 await send('Page.reload');await until(()=>document.body.innerText.includes('Your universe is waiting.'),'Refresh keeps onboarding');
 assert.equal(profile(),'false||UTC','nothing saved before Finish');
 // Keyboard: the primary action works with Enter, and focus moves to the new step's heading.
 await evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Personalize my universe').focus());
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
 await until(()=>document.activeElement?.id==='welcome-step-title'&&document.activeElement.textContent.includes('Personalize'),'Keyboard advances and focus lands on the step heading');
 // 3. Timezone is detected from the device, and can be changed.
 assert.match(await evaluate(()=>document.querySelector('.muse-welcome-step').innerText),/Lisbon · Europe\/Lisbon/,'browser timezone detected');
 // 4. Validation: a name is required, and nothing is saved.
 await click('Finish setup');await until(()=>document.querySelector('#welcome-name-error')?.textContent.includes('what to call you'),'Name is required');
 assert.equal(profile(),'false||UTC');
 await type('#welcome-name','Ana');
 // Theme preview applies immediately, reusing the existing picker.
 const before=await evaluate(()=>document.documentElement.dataset.theme);
 await evaluate(()=>[...document.querySelectorAll('.muse-welcome-appearance .muse-appearance-theme')].find(b=>b.getAttribute('aria-pressed')!=='true').click());
 await until(({before})=>document.documentElement.dataset.theme!==before,'Theme previews immediately',{before});
 await click('Frosted','.muse-welcome-appearance button');await until(()=>document.documentElement.dataset.material==='frosted','Glass choice applies');
 await shoot('welcome-personalize-mobile');
 // 5. A failed save keeps her choices and saves nothing; retrying succeeds.
 await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await click('Finish setup');await until(()=>[...document.querySelectorAll('[role=alert]')].some(e=>e.textContent.includes('isn’t saved yet')),'Failed save explains itself');
 assert.equal(await evaluate(()=>document.querySelector('#welcome-name').value),'Ana','choices are kept');assert.equal(profile(),'false||UTC','nothing partially saved');
 await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await click('Finish setup');await until(()=>document.body.innerText.includes('Welcome home, Ana.'),'Setup completes');
 assert.equal(profile(),'true|Ana|Europe/Lisbon','name, timezone and completion saved to her own profile');
 await shoot('welcome-done-mobile');
 // 6. Into Daily Edit with a one-time, dismissible orientation.
 await click('Enter Muse');await until(()=>location.pathname==='/'&&!!document.querySelector('.muse-welcome-orientation'),'Daily Edit with orientation');
 assert.match(await evaluate(()=>document.querySelector('.muse-welcome-orientation').innerText),/Planner[\s\S]*Rituals[\s\S]*Whimsy[\s\S]*Settings/);
 await shoot('welcome-orientation-mobile');
 await click('Got it');await until(()=>!document.querySelector('.muse-welcome-orientation')&&!new URLSearchParams(location.search).has('welcome'),'Orientation dismisses');
 // 7. Returning: no onboarding again, and /welcome sends her home.
 await send('Page.reload');await until(()=>location.pathname==='/'&&document.body.innerText.includes('The Daily Edit'),'Returning visit goes straight to Daily Edit');
 await send('Page.navigate',{url:`${origin}/welcome`});await until(()=>location.pathname==='/','Finished accounts leave /welcome');
 // 8. Settings shows what she chose, and she can rename herself there.
 await send('Page.navigate',{url:`${origin}/settings`});await until(()=>document.querySelector('#settings-name')?.value==='Ana','Settings shows her name');
 await type('#settings-name','Ana Lucia');await click('Save name');for(let i=0;i<40&&!profile().includes('Ana Lucia');i++)await new Promise(r=>setTimeout(r,150));
 assert.equal(profile(),'true|Ana Lucia|Europe/Lisbon','rename saves without reopening onboarding');
 // 9. Desktop layout of the same flow, using a second fresh invitation.
 const second=must(await admin.auth.admin.generateLink({type:'invite',email:`onboarding-ui-${crypto.randomUUID()}@example.test`}));
 await send('Network.clearBrowserCookies');await viewport(1280,900);
 await send('Page.navigate',{url:`${origin}/auth/confirm?token_hash=${encodeURIComponent(second.properties.hashed_token)}&type=invite`});
 await until(()=>location.pathname==='/welcome','Second invitation lands on onboarding');await shoot('welcome-hello-desktop');
 await click('Personalize my universe');await until(()=>!!document.querySelector('#welcome-name'),'Personalize step');await shoot('welcome-personalize-desktop');
 must(await admin.auth.admin.deleteUser(second.user.id));
 // 10. A used invitation explains how to recover.
 await send('Network.clearBrowserCookies');await send('Page.navigate',{url:inviteLink});
 await until(()=>location.pathname==='/login'&&document.body.innerText.includes('That invitation has expired or was already used'),'Used invitation shows recovery guidance');
 await viewport(390);await shoot('invite-expired-mobile');
 assert.ok([...hosts].every(h=>['localhost','127.0.0.1'].includes(h)),`Browser stayed local: ${[...hosts].join(', ')}`);
 assert.deepEqual(errors,[],'No uncaught browser exceptions');
 console.log(`PASS invited-user onboarding in a real browser: invitation → welcome, refresh-safe, keyboard and focus, detected timezone, validation, live theme/glass preview, failed save recovery, saved profile, orientation, returning bypass, /welcome redirect, Settings rename, desktop and mobile, used-invitation guidance. ${captured} screenshots in ${shots}.`);
}finally{
 if(userId)must(await admin.auth.admin.deleteUser(userId));console.log('Disposable onboarding account removed.');
 try{socket?.close();}catch{}chrome?.kill();await new Promise(r=>setTimeout(r,500));try{rmSync(directory,{recursive:true,force:true,maxRetries:5});}catch{}
}
