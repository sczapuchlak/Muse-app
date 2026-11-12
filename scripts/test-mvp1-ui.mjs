// Local-only MVP 1 regression journeys. Never accepts hosted database or app URLs.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,mkdirSync,rmSync,openSync,closeSync} from 'node:fs';
import {tmpdir,homedir} from 'node:os';
import {join} from 'node:path';
import {createClient} from '@supabase/supabase-js';
const baseline=process.env.MVP1_BASELINE==='1',origin='http://localhost:3141';
const env={...process.env,PATH:homedir()+'/.docker/bin:'+process.env.PATH};
const status=spawnSync('./node_modules/.bin/supabase',['status','--workdir','/private/tmp/muse-mvp1-supabase','--output','json'],{env,encoding:'utf8'});if(status.status)throw Error('Run node scripts/mvp1-test-db.mjs start first.');assert.match(readFileSync('/private/tmp/muse-mvp1-supabase/supabase/config.toml','utf8'),/project_id = "muse-mvp1-priority1"/);const cfg=JSON.parse(status.stdout);assert.equal(cfg.API_URL,'http://127.0.0.1:56321');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(cfg.API_URL,cfg.SECRET_KEY??cfg.SERVICE_ROLE_KEY,options),must=r=>{if(r.error)throw Error(r.error.message);return r.data;};
const appEnv={...process.env,NEXT_PUBLIC_SUPABASE_URL:cfg.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY??cfg.ANON_KEY,SUPABASE_SECRET_KEY:cfg.SECRET_KEY??cfg.SERVICE_ROLE_KEY,SITE_URL:origin};
const dir=mkdtempSync(join(tmpdir(),'muse-mvp1-ui-')),shots=`/private/tmp/muse-mvp1-${baseline?'before':'after'}`;mkdirSync(shots,{recursive:true});const log=openSync('/private/tmp/muse-mvp1-server.log','w');let server,chrome,socket,userId='',passed=0;const wait=ms=>new Promise(r=>setTimeout(r,ms)),check=(value,label)=>{assert.ok(value,label);passed++;console.log('PASS',label);};
try{
 if(process.env.MVP1_BUILD==='1'){const result=spawnSync('./node_modules/.bin/next',['build','--webpack'],{env:appEnv,stdio:'inherit'});assert.equal(result.status,0,'Local production build');}
 server=spawn('./node_modules/.bin/next',process.env.MVP1_PRODUCTION==='1'?['start','--port','3141','--hostname','127.0.0.1']:['dev','--webpack','--port','3141','--hostname','127.0.0.1'],{env:appEnv,stdio:['ignore',log,log]});
 for(let i=0;i<300;i++){try{if((await fetch(origin+'/login')).ok)break;}catch{}await wait(200);if(i===299)throw Error('Local app did not start');}
 chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--hide-scrollbars','--remote-debugging-port=0',`--user-data-dir=${join(dir,'profile')}`],{stdio:'ignore'});
 const portFile=join(dir,'profile/DevToolsActivePort');for(let i=0;!existsSync(portFile)&&i<100;i++)await wait(100);const port=readFileSync(portFile,'utf8').split('\n')[0],pages=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.onopen=r);
 let id=0;const pending=new Map(),errors=[];const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id,deadline=setTimeout(()=>{pending.delete(key);reject(Error('Timed out: '+method));},20000);pending.set(key,{resolve:v=>{clearTimeout(deadline);resolve(v);},reject:e=>{clearTimeout(deadline);reject(e);}});socket.send(JSON.stringify({id:key,method,params}));});
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result);}};
 const evaluate=async(fn,arg)=>{const r=await send('Runtime.evaluate',{expression:`(${fn})(${JSON.stringify(arg)})`,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result?.value;};
 const until=async(fn,label,arg)=>{for(let i=0;i<600;i++){if(await evaluate(fn,arg).catch(()=>false))return;await wait(100);}throw Error(label+' · '+await evaluate(()=>document.body.innerText.slice(-1800)));};
 const go=async(path,selector)=>{await send('Page.navigate',{url:origin+path});await until(s=>!!document.querySelector(s),'Page ready: '+path,selector);await wait(400);};
 const click=async(selector,text)=>{await evaluate(({selector,text})=>{const b=[...document.querySelectorAll(selector)].find(el=>!el.disabled&&(text===undefined||el.textContent.trim().replace(/\s+/g,' ')===text||el.getAttribute('aria-label')===text));if(!b)throw Error('Missing '+selector+' '+text);b.click();},{selector,text});await wait(100);};
 const setValue=(selector,value)=>evaluate(({selector,value})=>{const el=document.querySelector(selector),proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));},{selector,value});
 const viewport=async(width,height=844)=>{await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});await send('Emulation.setTouchEmulationEnabled',{enabled:width<600,maxTouchPoints:5});};
 const theme=async value=>{await evaluate(v=>{localStorage.setItem('muse.theme',v);document.documentElement.dataset.theme=v;window.dispatchEvent(new Event('muse-theme-change'));},value);await wait(150);};
 const shot=async name=>{const r=await send('Page.captureScreenshot',{format:'png'});writeFileSync(join(shots,name+'.png'),Buffer.from(r.data,'base64'));};
 const reach=async selector=>{await evaluate(s=>document.querySelector(s)?.scrollIntoView({block:'center'}),selector);await wait(100);return evaluate(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {reachable:r.top>=0&&r.bottom<=innerHeight&&(hit===e||e.contains(hit)),top:r.top,bottom:r.bottom};},selector);};
 await send('Page.enable');await send('Runtime.enable');await send('DOM.enable');await viewport(1280,900);
 await go('/login','.muse-login-glass');await theme('astral');await shot('login-astral-choices');
 await until(()=>{if(document.querySelector('input[type=email]'))return true;document.querySelector('.muse-login-email-link')?.click();return false;},'email form');
 const contrast=await evaluate(()=>{const q=s=>{const e=document.querySelector(s),c=getComputedStyle(e);return {color:c.color,background:c.backgroundColor,border:c.borderColor}};return {heading:q('.muse-login-glass h2'),card:q('.muse-login-glass'),input:q('input[type=email]'),label:q('.muse-login-glass label'),placeholder:getComputedStyle(document.querySelector('input[type=email]'),'::placeholder').color};});console.log('LOGIN',JSON.stringify(contrast));await shot('login-astral-email');

 // Read the rendered colors (including color-mix alpha), then composite the card
  // over both black and white. No screenshot sampling or assumed hex values.
  const auditContrast=()=>{
   const context=document.createElement('canvas').getContext('2d');
   const rgba=value=>{context.clearRect(0,0,1,1);context.fillStyle=value;context.fillRect(0,0,1,1);return [...context.getImageData(0,0,1,1).data].map((v,i)=>i===3?v/255:v);};
   const over=(a,b)=>a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3]));
   const luminance=a=>a.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
   const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
   const card=document.querySelector('.muse-login-glass'),field=card.querySelector('input');
   return [0,255].map(base=>{
    const cardBg=over(rgba(getComputedStyle(card).backgroundColor),[base,base,base]);
    const against=(selector,property='color',pseudo=null)=>{const e=card.querySelector(selector),c=getComputedStyle(e,pseudo),bg=over(rgba(getComputedStyle(e).backgroundColor),cardBg);return ratio(over(rgba(c[property]),bg),bg);};
    const inputBg=field?over(rgba(getComputedStyle(field).backgroundColor),cardBg):cardBg;
    const buttons=[...card.querySelectorAll('button')].filter(e=>!e.disabled).map(e=>{const c=getComputedStyle(e),bg=over(rgba(c.backgroundColor),cardBg);return ratio(over(rgba(c.color),bg),bg);});return {buttons,heading:against('h2'),label:against('.editor-label'),feedback:against('.muse-login-feedback'),link:against('.muse-login-email-link'),...(field?{input:against('input'),placeholder:against('input','color','::placeholder'),border:ratio(over(rgba(getComputedStyle(field).borderLeftColor),inputBg),inputBg),focus:ratio(over(rgba(getComputedStyle(field).outlineColor),inputBg),inputBg)}:{})};
   });
  };
 if(!baseline){
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await evaluate(()=>document.querySelector('input[type=email]').focus());
  check(await evaluate(()=>document.querySelector('input[type=email]').matches(':focus-visible')&&getComputedStyle(document.querySelector('input[type=email]')).outlineStyle!=='none'),'Email input has a visible keyboard focus ring');
  const ratios=await evaluate(auditContrast);console.log('CONTRAST',JSON.stringify(ratios));
  check(ratios.every(r=>r.buttons.every(v=>v>=4.5)&&r.heading>=3&&r.label>=4.5&&r.feedback>=4.5&&r.link>=4.5&&r.input>=4.5&&r.placeholder>=4.5&&r.border>=3&&r.focus>=3),'Midnight Ballerina rendered text, border, and focus contrast');
  await setValue('input[type=email]','invalid');await click('.muse-login-glass button[type=submit]');
  check(await evaluate(()=>document.querySelector('input').getAttribute('aria-invalid')==='true'&&document.querySelector('#login-feedback').textContent.includes('valid email')),'Email validation remains readable and accessible');await shot('login-astral-error');
  await click('.muse-login-email-link','Back to sign-in options');
  // Intercept the local OAuth handoff: assert Google parameters, return the
  // provider-denied callback, and never navigate to Google's real service.
  let oauthUrl='';
  const prior=socket.onmessage;socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.method==='Fetch.requestPaused'){oauthUrl=m.params.request.url;void send('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:302,responseHeaders:[{name:'Location',value:origin+'/auth/oauth/callback?error=access_denied'}],body:''});}else prior(event);};
  await send('Fetch.enable',{patterns:[{urlPattern:cfg.API_URL+'/auth/v1/authorize*',requestStage:'Request'}]});await click('.muse-login-method.button-primary');
  await until(()=>document.querySelector('#login-feedback')?.textContent.includes('sign-in'),'Google denied callback');
  await send('Fetch.disable');socket.onmessage=prior;
  check(new URL(oauthUrl).searchParams.get('provider')==='google'&&new URL(oauthUrl).searchParams.get('redirect_to')===origin+'/auth/oauth/callback','Google sign-in handoff and provider failure return safely');await shot('login-astral-google-error');

  const dom=await send('DOM.getDocument');const google=await send('DOM.querySelector',{nodeId:dom.root.nodeId,selector:'.muse-login-method.button-primary'});await send('CSS.enable');await send('CSS.forcePseudoState',{nodeId:google.nodeId,forcedPseudoClasses:['hover']});await wait(300);
  const hoverRatios=await evaluate(auditContrast);console.log('HOVER_CONTRAST',JSON.stringify(hoverRatios));check(hoverRatios.every(r=>r.buttons.every(v=>v>=4.5)),'All login button text remains readable on hover');await send('CSS.forcePseudoState',{nodeId:google.nodeId,forcedPseudoClasses:[]});
  const choices=await evaluate(()=>[...document.querySelectorAll('.muse-login-method,.muse-login-email-link')].map(e=>({color:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).borderColor})));
  console.log('LOGIN_CHOICES',JSON.stringify(choices));
  for(const t of ['iridescent','prism-noir']){await theme(t);check(await evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Login retains its layout in '+t);await shot('login-'+t);}
  await theme('astral');await viewport(390);await shot('login-astral-mobile');
 }
 const link=must(await admin.auth.admin.generateLink({type:'invite',email:`mvp1-${crypto.randomUUID()}@example.test`}));userId=link.user.id;const client=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY??cfg.ANON_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token}));const profile=must(await client.from('profiles').select('revision').eq('id',userId).single());must(await client.rpc('save_account_preferences',{p_expected_revision:profile.revision,p_command_id:crypto.randomUUID(),p_patch:{first_name:'QA',time_zone:'UTC',onboarded:true}}));

 if(!baseline){
  await viewport(390);await go('/login','.muse-login-email-link');await until(()=>{if(document.querySelector('#login-email'))return true;document.querySelector('.muse-login-email-link')?.click();return false;},'email sign-in');await setValue('#login-email',link.user.email);await click('.muse-login-glass button[type=submit]');await until(()=>!!document.querySelector('#login-code'),'local email code sent');
  const codeRatios=await evaluate(auditContrast);console.log('CODE_CONTRAST',JSON.stringify(codeRatios));check(codeRatios.every(r=>r.input>=4.5&&r.placeholder>=4.5&&r.border>=3&&r.feedback>=4.5),'Verification-code input, placeholder, border and feedback contrast');
  await setValue('#login-code','12');await click('.muse-login-glass button[type=submit]');check(await evaluate(()=>document.querySelector('#login-feedback').textContent.includes('six-digit')),'Incomplete email code is explained');await shot('login-astral-code');
  const issued=must(await admin.auth.admin.generateLink({type:'magiclink',email:link.user.email}));await setValue('#login-code',issued.properties.email_otp);await click('.muse-login-glass button[type=submit]');await until(()=>!location.pathname.startsWith('/login'),'real local code verification');check(await evaluate(()=>!location.pathname.startsWith('/login')),'Real local email code signs into Muse');
 }
 const magic=must(await admin.auth.admin.generateLink({type:'magiclink',email:link.user.email}));await send('Page.navigate',{url:`${origin}/auth/confirm?token_hash=${magic.properties.hashed_token}&type=email&next=/envision?view=vision-boards`});await until(()=>!!document.querySelector('.muse-envision-empty button'),'Vision Boards library');await wait(400);
 await viewport(390,844);await click('.muse-envision-empty button','Create your first board');await until(()=>!!document.querySelector('#vision-board-details'),'creation modal');await setValue('#vision-board-details input','MVP mobile board');await click('[aria-label=Period] button','Year');
 const vision=await evaluate(()=>{const d=document.querySelector('#vision-board-details'),f=d.querySelector('form');return {dialogHeight:d.clientHeight,dialogScroll:d.scrollHeight,dialogOverflow:getComputedStyle(d).overflow,formHeight:f.clientHeight,formScroll:f.scrollHeight,formOverflow:getComputedStyle(f).overflow};});const year=await reach('#vision-board-details button[aria-label^="Year:"]'),save=await reach('#vision-board-details button[type=submit]');console.log('VISION',JSON.stringify({vision,year,save}));await shot('vision-phone');
 if(!baseline){
  check(year.reachable&&save.reachable,'Year and Create are reachable on iPhone-sized viewport');
  const scroller=await evaluate(()=>{const d=document.querySelector('#vision-board-details'),e=d.querySelector('.muse-vision-details-body'),r=e.getBoundingClientRect();return {overflow:getComputedStyle(e).overflowY,height:e.clientHeight,total:e.scrollHeight,x:r.x+30,y:r.y+30,dialogFits:d.scrollHeight<=d.clientHeight+1};});
  check(scroller.overflow==='auto'&&scroller.total>scroller.height&&scroller.dialogFits,'One real scroll region contains all fields without clipping the dialog');
  await evaluate(()=>document.querySelector('.muse-vision-details-body').scrollTop=0);
  await send('Input.synthesizeScrollGesture',{x:scroller.x,y:scroller.y,yDistance:-500,speed:800,gestureSourceType:'touch'});
  check(await evaluate(()=>document.querySelector('.muse-vision-details-body').scrollTop>20),'Touch scrolling reaches lower creation fields');
  // Simulate the iOS visual viewport shrinking and panning while layout viewport
  // remains unchanged. This tests our listener, not a claimed real keyboard test.
  await evaluate(()=>{window.mvpViewport={height:visualViewport.height,top:visualViewport.offsetTop};Object.defineProperty(visualViewport,'height',{configurable:true,value:400});Object.defineProperty(visualViewport,'offsetTop',{configurable:true,value:30});visualViewport.dispatchEvent(new Event('resize'));});
  await wait(100);
  check(await evaluate(()=>{const r=document.querySelector('#vision-board-details').getBoundingClientRect();return r.top>=30&&r.bottom<=430;}),'Dialog stays inside a panned 400px visual viewport');
  check((await reach('#vision-board-details button[type=submit]')).bottom<=430,'Actions stay above the simulated keyboard');await shot('vision-keyboard');
  await evaluate(()=>{delete visualViewport.height;delete visualViewport.offsetTop;visualViewport.dispatchEvent(new Event('resize'));});await wait(100);
  await reach('#vision-board-details button[aria-label^="Year:"]');await click('#vision-board-details button[aria-label^="Year:"]');await until(()=>!!document.querySelector('.muse-popover-panel'),'year menu');await click('.popover-choice','2027');await click('#vision-board-details button[type=submit]');await until(()=>!!document.querySelector('.muse-vision-editor'),'board editor');
  let board=must(await client.from('vision_boards').select('*')).at(0);check(board.title==='MVP mobile board'&&board.period_start==='2027-01-01','Create persists the selected year and board');
  await go('/envision?view=vision-boards','.muse-vision-card');await evaluate(()=>document.querySelector('.muse-vision-card-link').click());await until(()=>!!document.querySelector('.muse-vision-editor'),'reopen board');
  await click('.muse-vision-editor button','Details');await until(()=>!!document.querySelector('#vision-board-details'),'edit details');await setValue('#vision-board-details input','MVP edited board');await setValue('#vision-board-details textarea','Saved on a phone');await click('#vision-board-details button[type=submit]');await until(()=>!document.querySelector('#vision-board-details'),'details saved');
  for(let i=0;i<100;i++){board=must(await client.from('vision_boards').select('*')).at(0);if(board.title==='MVP edited board')break;await wait(100);}
  check(board.title==='MVP edited board'&&board.description==='Saved on a phone'&&board.period_start==='2027-01-01','Editing preserves the selected period and saves changes');
  check(must(await client.from('vision_boards').select('*')).length===1,'Reopen and edit preserve the same board without duplication');await shot('vision-saved');

  // A narrow phone, safe-area insets, and the other conditional period menus.
  await viewport(320,568);await send('Emulation.setSafeAreaInsetsOverride',{insets:{top:47,bottom:34,left:0,right:0}});
  await click('.muse-vision-editor button','Details');await until(()=>!!document.querySelector('#vision-board-details'),'small-phone details');await click('[aria-label=Period] button','Month');
  console.log('SAFE_AREA',JSON.stringify(await evaluate(()=>{const d=document.querySelector('#vision-board-details'),r=d.getBoundingClientRect(),c=getComputedStyle(d);return {top:r.top,bottom:r.bottom,height:innerHeight,width:innerWidth,scroll:document.documentElement.scrollWidth,dialogWidth:d.clientWidth,dialogScrollWidth:d.scrollWidth,dialogHeight:d.clientHeight,dialogScrollHeight:d.scrollHeight,gapTop:c.getPropertyValue('--vision-top-gap'),gapBottom:c.getPropertyValue('--vision-bottom-gap'),viewportHeight:visualViewport.height};})));
  check(await evaluate(()=>{const d=document.querySelector('#vision-board-details'),r=d.getBoundingClientRect();return r.top>=46&&r.bottom<=innerHeight-33&&d.scrollHeight<=d.clientHeight+1&&document.documentElement.scrollWidth<=innerWidth;}),'Small-phone dialog respects safe areas without horizontal overflow');
  for(const label of ['Month','Year']){await reach('#vision-board-details button[aria-label^="'+label+':"]');await click('#vision-board-details button[aria-label^="'+label+':"]');await until(()=>!!document.querySelector('.muse-popover-panel'),'period menu');check(await evaluate(()=>{const p=document.querySelector('.muse-popover-panel'),r=p.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}),label+' menu fits on a small phone');await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until(()=>!document.querySelector('.muse-popover-panel'),'menu closes');}
  await click('[aria-label=Period] button','Quarter');check((await reach('#vision-board-details button[aria-label^="Quarter:"]')).reachable,'Quarter selection is accessible on a narrow phone');await shot('vision-small-phone');await click('#vision-board-details button','Cancel');
  await send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,bottom:0,left:0,right:0}});await viewport(390,844);
  const unchanged=must(await client.from('vision_boards').select('*')).at(0);check(JSON.stringify(unchanged)===JSON.stringify(board),'Cancel leaves all saved board data unchanged');
  // Close a real details dialog after keyboard navigation to exercise fallback focus.
  await click('.muse-vision-editor button','Details');await until(()=>!!document.querySelector('#vision-board-details'),'details focus test');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until(()=>!document.querySelector('#vision-board-details'),'keyboard dismissal');
  check(await evaluate(()=>document.activeElement.id==='muse-main-content'&&getComputedStyle(document.activeElement).outlineStyle==='none'),'Dialog focus return keeps accessible focus without a page-wide outline');
 }

 else {await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until(()=>!document.querySelector('#vision-board-details'),'modal closes');}
 // Focus-return reproduction: a text-input modal closes without an explicit return target.
 if(!baseline)await go('/envision?view=vision-boards','.muse-vision-card');
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await evaluate(()=>{document.getElementById('muse-main-content')?.focus();});
 const focus=await evaluate(()=>{const e=document.getElementById('muse-main-content'),c=getComputedStyle(e),r=e.getBoundingClientRect();return {active:document.activeElement===e,focusVisible:e.matches(':focus-visible'),outline:c.outlineStyle,width:c.outlineWidth,rectWidth:r.width};});console.log('FOCUS',JSON.stringify(focus));if(!baseline)check(focus.outline==='none'||focus.width==='0px','Programmatic page focus does not paint a page-wide line');await shot('page-focus');

 if(!baseline){
  await viewport(1280,900);await go('/envision?view=vision-boards','.muse-vision-card');await click('.muse-vision-tools .muse-search-add');await until(()=>!!document.querySelector('#vision-board-details'),'desktop creation');
  for(const t of ['iridescent','prism-noir','astral']){await theme(t);check(await evaluate(()=>{const e=document.querySelector('#vision-board-details'),r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&e.scrollHeight<=e.clientHeight+1;}),'Desktop creation dialog fits in '+t);}
  await shot('vision-desktop');await click('#vision-board-details button','Cancel');check(must(await client.from('vision_boards').select('*')).length===1,'Cancelling desktop creation preserves the existing board');
 }
 for(const width of [1280,820,390,320]){await viewport(width,width<600?844:900);await go('/whimsy/observatory?view=library','.muse-cosmic-library-featured');await theme('astral');await evaluate(()=>document.querySelector('.muse-cosmic-library-featured').scrollIntoView({block:'center'}));const metrics=await evaluate(()=>{const es=[document.querySelector('.muse-cosmic-library-discovery'),...document.querySelectorAll('.muse-cosmic-library-featured,.muse-cosmic-library-featured>button')];return {pageOverflow:document.documentElement.scrollWidth-innerWidth,items:es.map(e=>({class:e.className,width:e.clientWidth,scroll:e.scrollWidth,height:e.clientHeight,scrollHeight:e.scrollHeight,overflow:getComputedStyle(e).overflow}))};});console.log('ASTRO',width,JSON.stringify(metrics));if(!baseline)check(metrics.pageOverflow<=1&&metrics.items.every(e=>e.scroll<=e.width+1&&e.scrollHeight<=e.height+1),'Astrology spark content fits at '+width+'px');await shot('astrology-'+width);}

 for(const width of [820,390,320]){
  await viewport(width);await go('/whimsy/observatory?view=library','.muse-cosmic-library-featured');await evaluate(()=>{document.documentElement.style.fontSize='200%';document.body.style.fontSize='28px';});
  await evaluate(()=>document.querySelector('.muse-cosmic-library-featured').scrollIntoView({block:'center'}));
  const zoom=await evaluate(()=>({page:document.documentElement.scrollWidth-innerWidth,items:[...document.querySelectorAll('.muse-cosmic-library-featured>button')].map(e=>({width:e.clientWidth,scroll:e.scrollWidth,children:[...e.children].map(c=>({text:c.textContent,client:c.clientWidth,scroll:c.scrollWidth}))}))}));
  console.log('ASTRO_ZOOM',width,JSON.stringify(zoom));await shot('astrology-large-text-'+width);if(!baseline)check(zoom.page<=1&&zoom.items.every(e=>e.scroll<=e.width+1&&e.children.every(c=>c.scroll<=c.client+1)),'Spark content fits with enlarged text at '+width+'px');await evaluate(()=>{document.documentElement.style.removeProperty('font-size');document.body.style.removeProperty('font-size');});
 }

 if(!baseline)for(const t of ['iridescent','prism-noir','astral']){
  await theme(t);await viewport(390);await go('/whimsy/observatory?view=library','.muse-cosmic-library-featured');
  for(const index of [0,1,2]){
   await evaluate(i=>document.querySelectorAll('.muse-cosmic-library-featured>button')[i].querySelector('small').scrollIntoView({block:'center'}),index);await wait(100);
   check(await evaluate(i=>{const b=document.querySelectorAll('.muse-cosmic-library-featured>button')[i],e=b.querySelector('small'),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return (hit===b||b.contains(hit))&&r.top>=0&&r.bottom<=innerHeight;},index),'Spark action '+index+' is not covered by navigation in '+t);
   await evaluate(i=>document.querySelectorAll('.muse-cosmic-library-featured>button')[i].click(),index);await until(()=>!!document.querySelector('.muse-cosmic-entry'),'spark entry opens');await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until(()=>!document.querySelector('.muse-cosmic-entry'),'spark entry closes');
  }
  await evaluate(()=>document.querySelector('.muse-skip-link').click());check(await evaluate(()=>document.activeElement.id==='muse-main-content'&&getComputedStyle(document.activeElement).outlineStyle==='none'),'Skip navigation keeps focus without page outline in '+t);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  check(await evaluate(()=>{const e=document.activeElement;return e.matches('button,a,input')&&e.matches(':focus-visible')&&getComputedStyle(e).outlineStyle!=='none';}),'Interactive keyboard focus stays visible in '+t);
  await shot('astrology-focus-'+t);
 }
 check(errors.filter(e=>!e.includes('negative time stamp')).length===0,'No browser runtime errors');console.log(`PASS ${passed} checks; screenshots ${shots}`);
}finally{socket?.close();chrome?.kill('SIGTERM');server?.kill('SIGTERM');closeSync(log);if(userId)must(await admin.auth.admin.deleteUser(userId));await wait(500);rmSync(dir,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
