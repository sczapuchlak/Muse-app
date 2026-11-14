// Authenticated LOCAL browser journey for Vision Boards (#118) with a disposable account: create a board, upload a
// photo and a transparent cutout, add text and a sticker, drag, nudge, undo, layer, crop to a heart, link an
// Aspiration, reload and get the exact arrangement back, phone layout with touch, duplicate and delete from the
// library, and a board shown in Intentions. Requires `npm run dev`. Run: npm run test:vision-boards:ui
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {mkdtempSync,readFileSync,existsSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir,homedir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import sharp from 'sharp';
loadEnvFile('.env.local');
const origin=process.env.VISION_UI_ORIGIN??'http://localhost:3000',url=process.env.NEXT_PUBLIC_SUPABASE_URL;
for(const endpoint of [origin,url])assert.ok(['localhost','127.0.0.1'].includes(new URL(endpoint).hostname),'Disposable checks must remain local');
const shots=process.env.VISION_UI_SHOTS??join(tmpdir(),'muse-vision-ui');mkdirSync(shots,{recursive:true});
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options),must=r=>{if(r.error)throw Error(r.error.message);return r.data;};
const docker=process.env.MUSE_DOCKER_PATH||(existsSync(homedir()+'/.docker/bin/docker')?homedir()+'/.docker/bin/docker':'docker');
const sql=text=>{const r=spawnSync(docker,['exec','-i','supabase_db_muse-local','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],{input:text,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();};
const directory=mkdtempSync(join(tmpdir(),'muse-vision-ui-'));let chrome,socket,passed=0,userId='';
const check=(cond,label)=>{assert.ok(cond,label);passed++;console.log('✓',label);};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const link0=must(await admin.auth.admin.generateLink({type:'invite',email:`vision-ui-${crypto.randomUUID()}@example.test`}));userId=link0.user.id;
 const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link0.properties.hashed_token}));
 sql(`update public.profiles set first_name='Vee',time_zone='UTC',time_zone_confirmed_at=now(),onboarded_at=now() where id='${userId}'`);
 const aspirationId=crypto.randomUUID();
 must(await client.from('aspirations').insert({id:aspirationId,title:'Learn to sew my own clothes',start_date:'2026-11-01',progress_kind:'milestones'}));
 // Fixtures: a photo, and a transparent cutout (a circle on nothing).
 const photo=join(directory,'beach.jpg'),cutout=join(directory,'cutout.png');
 await sharp({create:{width:1200,height:800,channels:3,background:{r:40,g:170,b:220}}}).composite([{input:Buffer.from('<svg width="1200" height="800"><rect y="500" width="1200" height="300" fill="#f4d58d"/><circle cx="900" cy="200" r="90" fill="#ffd166"/></svg>')}]).jpeg().toFile(photo);
 await sharp({create:{width:600,height:600,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:Buffer.from('<svg width="600" height="600"><circle cx="300" cy="300" r="220" fill="#e85d75"/></svg>')}]).png().toFile(cutout);

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
 const shoot=async name=>{await wait(400);const r=await send('Page.captureScreenshot',{format:'png'});writeFileSync(join(shots,`${name}.png`),Buffer.from(r.data,'base64'));};
 const overflow=()=>evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
 const go=async(path,ready,label)=>{await evaluate(()=>{window.__old=1;}).catch(()=>{});await send('Page.navigate',{url:`${origin}${path}`});await until(new Function(`return !window.__old&&(${ready})`),label);};
 const setValue=(selector,value)=>evaluate(({selector,value})=>{const t=document.querySelector(selector);const proto=t instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(t,value);t.dispatchEvent(new Event('input',{bubbles:true}));},{selector,value});
 const click=(selector,text)=>evaluate(({selector,text})=>{const b=[...document.querySelectorAll(selector)].find(x=>(text==null||x.textContent.trim()===text||x.getAttribute('aria-label')===text)&&!x.disabled);if(!b)throw Error('missing '+selector+' '+text);b.click();},{selector,text});
 const board=async()=>must(await admin.from('vision_boards').select('*').eq('user_id',userId).order('created_at')).at(0);
 const saved=()=>until(()=>/All changes saved/.test(document.querySelector('.muse-save-indicator')?.textContent??''),'board saved');
 const canvasBox=()=>evaluate(()=>{const r=document.querySelector('.muse-vision-canvas').getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height};});
 const mouse=async(type,x,y)=>send('Input.dispatchMouseEvent',{type,x,y,button:'left',buttons:type==='mouseReleased'?0:1,clickCount:1});
 const key=async(k,code,mods=0)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:k,code,modifiers:mods,windowsVirtualKeyCode:{ArrowRight:39,z:90}[k]});await send('Input.dispatchKeyEvent',{type:'keyUp',key:k,code,modifiers:mods});};
 await send('Page.enable');await send('Runtime.enable');await send('DOM.enable');await viewport(1280);
 const magic=must(await admin.auth.admin.generateLink({type:'magiclink',email:link0.user.email}));
 await send('Page.navigate',{url:`${origin}/auth/confirm?token_hash=${magic.properties.hashed_token}&type=email&next=/`});await until(()=>location.pathname==='/'&&!!document.querySelector('main'),'signed in');

 // ---- Library: empty state → create ----
 await go('/envision?view=vision-boards','!!document.querySelector(".muse-envision-empty button")','empty library');
 check(await evaluate(()=>document.querySelector('[aria-label="Envision views"]')?.textContent.includes('Visions')),'Visions sits in Envision’s tabs');
 await shoot('01-empty');
 await click('.muse-envision-empty button','Create your first Vision');
 await until(()=>!!document.querySelector('#vision-board-details input'),'details form');
 await setValue('#vision-board-details input','My 2027 Vision');
 await click('#vision-board-details .muse-segmented button','Year');
 await click('#vision-board-details button[type=submit]','Create board');
 await until(()=>location.search.includes('board=')&&!!document.querySelector('.muse-vision-canvas canvas'),'editor opens');
 check((await board()).period==='year'&&(await board()).period_start.endsWith('-01-01'),'board created with a yearly period');

 // ---- Uploads: a photo and a transparent cutout ----
 const doc=await send('DOM.getDocument',{depth:-1}),input=await send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.muse-vision-editor input[type=file]'});
 await send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[photo,cutout]});
 await until(()=>/2 pieces/.test(document.querySelector('.muse-vision-canvas')?.getAttribute('aria-label')??''),'two photos on the board');
 await saved();
 let row=await board();
 const [p1,p2]=row.elements;
 check(p1.kind==='image'&&p1.border&&p1.shadow,'a photo gets a print border and shadow');
 check(p2.image.alpha===true&&!p2.border,'a transparent cutout keeps its transparency and has no frame');
 check(row.asset_paths.length===4&&row.asset_paths.every(p=>p.startsWith(userId)),'files live in the owner’s private folder (image + thumbnail each)');

 // ---- Text and a sticker ----
 await click('.muse-vision-toolbar button','Aa Text');
 await until(()=>!!document.querySelector('.muse-writing-menu'),'writing menu');
 await evaluate(()=>[...document.querySelectorAll('.muse-writing-menu button')].find(b=>/Words/.test(b.textContent)).click());
 await until(()=>!!document.querySelector('.muse-vision-inline-text'),'writing right on the canvas');
 await setValue('.muse-vision-inline-text','Becoming her');
 await evaluate(()=>document.querySelector('.muse-vision-inline-text').blur());
 await click('.muse-vision-toolbar button','Library');
 await until(()=>!!document.querySelector('.muse-asset-tabs'),'library panel');
 await click('.muse-asset-tabs button','Doodles');
 await until(()=>!!document.querySelector('[aria-label="Add Heart"]'),'doodles');
 await click('[aria-label="Add Heart"]');
 await saved();
 row=await board();
 check(row.elements.map(e=>e.kind).join()==='image,image,text,sticker','text and sticker added on top');
 check(row.elements[2].text==='Becoming her','words saved');
 await shoot('02-editor');

 // ---- Drag the sticker (top, at the board's centre), nudge, undo ----
 const c=await canvasBox(),cx=c.x+c.w/2,cy=c.y+c.h/2,before=row.elements[3];
 await mouse('mouseMoved',cx,cy);await mouse('mousePressed',cx,cy);for(let i=1;i<=6;i++)await mouse('mouseMoved',cx+i*20,cy+i*10);await mouse('mouseReleased',cx+120,cy+60);
 await saved();row=await board();
 const dragged=row.elements.find(e=>e.id===before.id);
 check(dragged.x>before.x+40&&dragged.y>before.y+20,'dragging moves the sticker in board units');
 await evaluate(()=>document.querySelector('.muse-vision-canvas').focus());
 await key('ArrowRight','ArrowRight',8);
 await saved();row=await board();
 check(row.elements.find(e=>e.id===before.id).x===dragged.x+10,'Shift+→ nudges by 10');
 await click('.muse-vision-toolbar button','Undo');
 await saved();row=await board();
 check(row.elements.find(e=>e.id===before.id).x===dragged.x,'Undo restores the position');
 await click('.muse-vision-toolbar button','Redo');await saved();row=await board();
 check(row.elements.find(e=>e.id===before.id).x===dragged.x+10,'Redo reapplies it');
 await click('.muse-vision-inspector button','Back');await saved();row=await board();
 check(row.elements[2].id===before.id,'Backward moves the sticker one layer down');

 // ---- Crop the photo into a heart, add a link ----
 await click('.muse-vision-toolbar button','Layers');
 await until(()=>[...document.querySelectorAll('.muse-vision-layers button')].some(b=>b.textContent.includes('beach.jpg')),'layers list');
 await evaluate(()=>[...document.querySelectorAll('.muse-vision-layers button')].find(b=>b.textContent.includes('beach.jpg')).click());
 await click('.muse-vision-inspector button','Crop & shape');
 await until(()=>!!document.querySelector('#vision-crop svg image'),'crop sheet with the photo');
 await click('#vision-crop .muse-vision-shapes button','Heart');
 await setValue('#vision-crop input[type=range]','1.6');
 await shoot('03-crop');
 await click('#vision-crop .muse-button','Apply');
 await until(()=>[...document.querySelectorAll('.muse-vision-section>summary')].some(s=>s.textContent==='Link to Muse'),'link section');
 await evaluate(()=>{const d=[...document.querySelectorAll('.muse-vision-section')].find(x=>x.querySelector('summary').textContent==='Link to Muse');d.open=true;(d.querySelector('.muse-choice-trigger, button[aria-haspopup]')??d.querySelector('.muse-vision-section-body button')).click();});
 await until(()=>[...document.querySelectorAll('[role=option],[role=menuitemradio],.popover-choice')].some(o=>o.textContent.includes('Learn to sew')),'aspiration offered');
 await evaluate(()=>[...document.querySelectorAll('[role=option],[role=menuitemradio],.popover-choice')].find(o=>o.textContent.includes('Learn to sew')).click());
 await saved();row=await board();
 const cropped=row.elements.find(e=>e.id===p1.id);
 check(cropped.crop.shape==='heart'&&cropped.crop.zoom===1.6,'heart crop stored on the element (non-destructive)');
 check(cropped.image.path===p1.image.path,'the original image is untouched');
 check(cropped.link?.kind==='aspiration'&&cropped.link.id===aspirationId&&cropped.link.label==='Learn to sew my own clothes','linked to the Aspiration by id with a name snapshot');
 const asp=must(await client.from('aspirations').select('title,revision').eq('id',aspirationId).single());
 check(asp.revision===1,'linking never changes the Aspiration');

 // ---- Reload: exact arrangement ----
 const frozen=JSON.stringify(row.elements);
 await go(`/envision?view=vision-boards&board=${row.id}`,'!!document.querySelector(".muse-vision-canvas canvas")','editor reopens');
 await wait(1500);
 check(JSON.stringify((await board()).elements)===frozen&&(await board()).revision===row.revision,'reopening restores the exact arrangement and doesn’t resave');
 check(await evaluate(()=>/4 pieces/.test(document.querySelector('.muse-vision-canvas').getAttribute('aria-label'))),'all four pieces are back');

 check(await evaluate(()=>!document.querySelector('.muse-vision-cutout-trigger')&&!document.querySelector('.muse-vision-cutout-hint')),'desktop shows no iPhone cutout guide');
 // ---- Phone with touch (as an iPhone) ----
 await viewport(390,844,true);
 await send('Emulation.setUserAgentOverride',{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',platform:'iPhone'});
 await go(`/envision?view=vision-boards&board=${row.id}`,'!!document.querySelector(".muse-vision-canvas canvas")&&!!document.querySelector(".muse-vision-cutout-hint")','phone editor with the cutout tip');
 await shoot('04a-iphone-hint');
 check(await evaluate(()=>!/remove(s)? (the )?background/i.test(document.querySelector('.muse-vision-cutout-hint').innerText)),'the tip never claims Muse removes backgrounds');
 await click('.muse-vision-cutout-trigger','Make a cutout');
 await until(()=>!!document.querySelector('#vision-cutout-help .muse-vision-cutout-steps'),'cutout guide opens');
 check(await evaluate(()=>{const t=document.querySelector('#vision-cutout-help').innerText;return ['Photos','Press and hold','Copy','Paste','Outline'].every(w=>t.includes(w))&&document.querySelectorAll('#vision-cutout-help li').length===5;}),'the guide walks through Photos → hold → Copy → Paste → Outline');
 check(!(await overflow()),'the guide fits a phone without sideways scroll');
 await shoot('04a-iphone-guide');
 check(await evaluate(()=>!document.querySelector('.muse-vision-cutout-hint')),'opening the guide retires the first-time tip');
 await evaluate(()=>document.querySelector('#vision-cutout-help')?.closest('[role=dialog]')?.querySelector('button[aria-label^="Close"]')?.click());
 // Paste a transparent cutout through the clipboard, as after "Copy" in Photos.
 await send('Browser.grantPermissions',{origin,permissions:['clipboardReadWrite','clipboardSanitizedWrite']}).catch(()=>undefined);
 const pasted=await evaluate(async()=>{try{const c=document.createElement('canvas');c.width=c.height=200;const x=c.getContext('2d');x.fillStyle='#7cb518';x.beginPath();x.arc(100,100,70,0,7);x.fill();const blob=await new Promise(r=>c.toBlob(r,'image/png'));await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);return true;}catch{return false;}});
 if(pasted){
  await click('.muse-vision-toolbar button','Paste');
  await until(()=>/5 pieces/.test(document.querySelector('.muse-vision-canvas').getAttribute('aria-label')),'pasted cutout lands on the board');
  await saved();
  const added=(await board()).elements.at(-1);
  check(added.kind==='image'&&added.image.alpha===true&&!added.border,'a pasted cutout keeps its transparency, with no frame');
  row=await board();
 }else console.log('· clipboard write unavailable in headless Chrome; paste covered by the shared upload path');
 await go(`/envision?view=vision-boards&board=${row.id}`,'!!document.querySelector(".muse-vision-canvas canvas")','phone editor again');
 await wait(500);
 check(await evaluate(()=>!document.querySelector('.muse-vision-cutout-hint')&&!!document.querySelector('.muse-vision-cutout-trigger')),'the tip stays dismissed; the guide stays one tap away');
 check(!(await overflow()),'no sideways page scroll on a phone');
 check(await evaluate(()=>getComputedStyle(document.querySelector('.muse-vision-canvas')).touchAction==='none'),'the canvas owns touch gestures (page doesn’t scroll)');
 await shoot('04-phone-editor');
 await send('Emulation.setUserAgentOverride',{userAgent:''});
 await viewport(1280);
 // A dark theme changes the chrome, never the board's own colors.
 await evaluate(()=>localStorage.setItem('muse.theme','prism-noir'));
 await go(`/envision?view=vision-boards&board=${row.id}`,'!!document.querySelector(".muse-vision-canvas canvas")','dark editor');
 await shoot('04b-dark-editor');

 // ---- Library: preview, duplicate, delete ----
 await go('/envision?view=vision-boards','!!document.querySelector(".muse-vision-card canvas")','library with a preview');
 await shoot('05-library');
 await evaluate(()=>document.querySelector('.muse-vision-card .muse-overflow-trigger').click());
 await until(()=>[...document.querySelectorAll('.popover-choice')].some(b=>b.textContent.trim()==='Duplicate'),'card menu');
 await click('.popover-choice','Duplicate');
 await until(()=>document.querySelectorAll('.muse-vision-card').length===2,'duplicate appears');
 const boards=must(await admin.from('vision_boards').select('id,title,asset_paths').eq('user_id',userId));
 const copy=boards.find(b=>b.title.endsWith('(copy)'));
 check(copy&&JSON.stringify(copy.asset_paths)===JSON.stringify(row.asset_paths),'a duplicate shares the same files (no copies)');
 await evaluate(()=>{const card=[...document.querySelectorAll('.muse-vision-card')].find(c=>c.innerText.includes('(copy)'));card.querySelector('.muse-overflow-trigger').click();});
 await until(()=>[...document.querySelectorAll('.popover-choice')].some(b=>b.textContent.trim()==='Delete…'),'copy menu');
 await click('.popover-choice','Delete…');
 await until(()=>!!document.querySelector('#vision-delete'),'delete confirmation');
 check(await evaluate(()=>document.querySelector('#vision-delete').innerText.includes('not touched')),'deleting explains linked records stay');
 await click('#vision-delete button','Delete board');
 await until(()=>document.querySelectorAll('.muse-vision-card').length===1,'copy deleted');
 const files=must(await admin.storage.from('constellation-images').list(`${userId}/${row.id}`));
 check(files.length===row.asset_paths.length,'the original’s files survive deleting the duplicate');
 check(must(await client.from('aspirations').select('id').eq('id',aspirationId)).length===1,'the linked Aspiration survives');

 // ---- Intentions shows the board ----
 must(await client.from('intention_pages').insert({period:'year',period_start:'2027-01-01',period_end:'2027-12-31',sections:[{id:'sec1',type:'boards',title:'Vision board',content:{items:[{id:'it1',ref:{kind:'board',id:row.id,label:'My 2027 Vision'},note:''}]}}]}));
 await go('/planner?view=intentions&period=year&date=2027-01-01','!!document.querySelector(".muse-intentions-board canvas")','Intentions preview');
 check(await evaluate(id=>document.querySelector('.muse-intentions-board').getAttribute('href').includes(id),row.id),'Intentions links to the board in Envision');
 await shoot('06-intentions');

 // ---- Studio (#187): a patterned shape with a gradient border, then more board space on the left ----
 await go(`/envision?view=vision-boards&board=${row.id}`,'!!document.querySelector(".muse-vision-canvas canvas")','studio editor');
 const beforeStudio=(await board()).elements;
 await click('.muse-vision-toolbar button','Library');
 await until(()=>!!document.querySelector('[aria-label="Add Scalloped card"]'),'shapes');
 await click('[aria-label="Add Scalloped card"]');
 await until(()=>[...document.querySelectorAll('.muse-vision-section>summary')].some(s=>s.textContent==='Fill'),'shape inspector');
 await evaluate(()=>{const sec=t=>[...document.querySelectorAll('.muse-vision-section')].find(d=>d.querySelector('summary').textContent===t);
  [...sec('Fill').querySelectorAll('.muse-segmented button')].find(b=>b.textContent==='Pattern').click();
  sec('Border').querySelector('input[type=checkbox]').click();});
 await saved();row=await board();
 const sh=row.elements.at(-1);
 check(sh.kind==='shape'&&sh.shape==='scallop-rect'&&sh.fill.kind==='pattern'&&sh.stroke.paint.kind==='gradient','a scalloped card with a pattern fill and a gradient border');
 await evaluate(()=>{document.querySelector('.muse-vision-canvas').focus();document.querySelector('.muse-vision-canvas').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));});
 await until(()=>[...document.querySelectorAll('.muse-vision-inspector button')].some(b=>b.textContent.includes('Left')),'board inspector');
 await click('.muse-vision-inspector button','← Left');
 await saved();
 const grown=await board();
 check(grown.size==='custom'&&grown.canvas_w===2000&&grown.canvas_h===1200,'adding space on the left makes a 2000×1200 custom board');
 check(grown.elements.every(e=>{const o=row.elements.find(x=>x.id===e.id);return e.x===o.x+400&&e.y===o.y&&e.w===o.w&&e.h===o.h&&e.rotation===o.rotation;}),'every piece keeps its place in the art: shifted with the new space, never scaled or distorted');
 check(beforeStudio.length+1===grown.elements.length,'nothing else was added or removed');
 await shoot('07-studio');

 check(errors.length===0,`no runtime errors${errors.length?': '+errors.join(' | '):''}`);
 console.log(`PASS ${passed} Vision Boards browser checks. Screenshots: ${shots}`);
}finally{
 try{socket?.close();}catch{/* closed */}chrome?.kill();
 if(userId){const {deleteConstellationFiles}=await import('../tests/helpers.mjs').then(h=>h.load('lib/auth/constellation-storage-cleanup'));await deleteConstellationFiles(admin,userId).catch(()=>undefined);await admin.auth.admin.deleteUser(userId);}
 rmSync(directory,{recursive:true,force:true});console.log('Disposable Vision Boards account and images removed.');
}
