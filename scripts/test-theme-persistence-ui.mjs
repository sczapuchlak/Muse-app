// Authenticated LOCAL browser regression for theme persistence (#64): a person's own theme survives navigation
// between Daily Edit, My Profile, Friends and Showcase Studio, survives full reloads without flashing the default
// theme, and comes back after visiting a friend's profile that wears its own theme. Requires `npm run dev`.
// Two disposable synthetic accounts; local requests only; both are deleted afterwards.
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir,homedir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
loadEnvFile('.env.local');
const origin=process.env.THEME_UI_ORIGIN??'http://localhost:3000',url=process.env.NEXT_PUBLIC_SUPABASE_URL;
for(const endpoint of [origin,url])assert.ok(['localhost','127.0.0.1'].includes(new URL(endpoint).hostname),'Disposable checks must remain local');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options),must=r=>{if(r.error)throw Error(r.error.message);return r.data;};
const docker=process.env.MUSE_DOCKER_PATH||(existsSync(homedir()+'/.docker/bin/docker')?homedir()+'/.docker/bin/docker':'docker');
const sql=text=>{const r=spawnSync(docker,['exec','-i','supabase_db_muse-local','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],{input:text,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();};
const tag=crypto.randomUUID().slice(0,6),users=[],OWN='astral',FRIEND_THEME='iridescent';
async function person(name){
 const link=must(await admin.auth.admin.generateLink({type:'invite',email:`theme-${name}-${crypto.randomUUID()}@example.test`}));users.push(link.user.id);
 const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token}));
 sql(`update public.profiles set first_name='${name}',time_zone='UTC',time_zone_confirmed_at=now(),onboarded_at=now() where id='${link.user.id}'`);
 const username=`${name}${tag}`,pid=must(await client.rpc('social_create_identity',{p_username:username,p_display_name:name}));
 return {id:link.user.id,client,username,pid,email:link.user.email};
}
const directory=mkdtempSync(join(tmpdir(),'muse-theme-ui-'));let chrome,socket,passed=0;
const check=(cond,label)=>{assert.ok(cond,label);passed++;console.log('✓',label);};
try{
 const [me,friend]=await Promise.all([person('vee'),person('fen')]);
 // My own profile theme is Glitter too, so any leak of a profile theme onto my own pages would show.
 must(await me.client.from('muse_profiles').insert({user_id:me.id,profile_theme:FRIEND_THEME}));
 must(await friend.client.from('muse_profiles').insert({user_id:friend.id,profile_theme:FRIEND_THEME,visibility:'friends'}));
 must(await friend.client.from('social_identities').update({discoverable:true}).eq('user_id',friend.id));
 must(await me.client.rpc('social_send_request',{p_target:friend.pid}));must(await friend.client.rpc('social_accept',{p_target:me.pid}));

 chrome=spawn(process.env.CHROME_BIN??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--disable-gpu','--no-first-run','--hide-scrollbars','--remote-debugging-port=0',`--user-data-dir=${join(directory,'profile')}`],{stdio:'ignore'});
 const portFile=join(directory,'profile/DevToolsActivePort');for(let i=0;!existsSync(portFile)&&i<100;i++)await new Promise(r=>setTimeout(r,100));
 const port=readFileSync(portFile,'utf8').split('\n')[0],targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json());
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.onopen=r);
 let id=0;const pending=new Map();socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});socket.send(JSON.stringify({id:key,method,params}));});
 const evaluate=async(fn,args)=>{const r=await send('Runtime.evaluate',{expression:`(${fn})(${JSON.stringify(args)})`,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result?.value;};
 const until=async(fn,message,args)=>{for(let i=0;i<200;i++){if(await evaluate(fn,args).catch(()=>false))return;await new Promise(r=>setTimeout(r,100));}throw Error(message);};
 const theme=()=>evaluate(()=>document.documentElement.getAttribute('data-theme'));
 await send('Page.enable');await send('Runtime.enable');
 // Watch every data-theme the page ever wears, from the first parsed byte, so a brief flash is caught too.
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__themes=[];new MutationObserver(records=>{for(const r of records)if(r.type==='attributes'&&r.target===document.documentElement)window.__themes.push(document.documentElement.getAttribute('data-theme'));}).observe(document,{subtree:true,attributes:true,attributeFilter:['data-theme']});document.addEventListener('readystatechange',()=>{if(document.readyState==='interactive')window.__themes.unshift('first:'+document.documentElement.getAttribute('data-theme'));},{once:true});`});
 const hard=async(path,ready)=>{await send('Page.navigate',{url:origin+path});await until(()=>document.readyState==='complete','load '+path);await until(r=>!!document.querySelector(r),`${path} ready`,ready);await new Promise(r=>setTimeout(r,600));};
 const soft=async(href,ready)=>{await evaluate(h=>{const a=[...document.querySelectorAll('a')].find(a=>a.getAttribute('href')===h);if(!a)throw Error('no link '+h);a.click();},href);await until(h=>location.pathname===h,'route '+href,href.split('?')[0]);await until(r=>!!document.querySelector(r),`${href} ready`,ready);await new Promise(r=>setTimeout(r,500));};

 const link=must(await admin.auth.admin.generateLink({type:'magiclink',email:me.email}));
 await send('Page.navigate',{url:`${origin}/auth/confirm?token_hash=${link.properties.hashed_token}&type=email&next=/`});await until(()=>location.pathname==='/'&&!!document.querySelector('.muse-rail-footer'),'signed in');
 await evaluate(t=>localStorage.setItem('muse.theme',t),OWN);

 // 1. Full reloads paint my theme from the first frame on every page (no flash of Glitter).
 for(const [path,ready] of [['/','.muse-rail-footer'],['/profile','.muse-profile'],['/friends','.muse-segmented,[role=group]'],['/profile/showcases/new','.muse-studio']]){
  await hard(path,ready);const seen=await evaluate(()=>window.__themes);
  check(seen[0]===`first:${OWN}`&&!seen.slice(1).includes(FRIEND_THEME)&&await theme()===OWN,`reload ${path}: my theme from first paint (${seen.join(' → ')})`);
 }
 // 2. Moving around my own pages never changes my theme, including My Profile → Friends.
 await hard('/','.muse-rail-footer');
 await soft('/profile','.muse-profile');check(await theme()===OWN,'Daily Edit → My Profile keeps my theme');
 await soft('/friends','[role=group]');check(await theme()===OWN,'My Profile → Friends keeps my theme');
 await soft('/profile','.muse-profile');check(await theme()===OWN,'Friends → My Profile keeps my theme');
 // 3. Preview as a friend wears my profile theme only while previewing.
 await evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Preview as a friend').click());
 await until(t=>document.documentElement.getAttribute('data-theme')===t,'preview wears the profile theme',FRIEND_THEME);check(true,'Preview as a friend wears my profile theme');
 await until(()=>[...document.querySelectorAll('button')].some(b=>/Back to editing view/i.test(b.textContent)),'exit preview button');
 await evaluate(()=>[...document.querySelectorAll('button')].find(b=>/Back to editing view/i.test(b.textContent)).click());
 await until(t=>document.documentElement.getAttribute('data-theme')===t,'leaving preview restores my theme',OWN);check(true,'leaving the preview restores my theme');
 // 4. A friend's profile lends the page their theme; leaving restores mine, by link and by Back.
 await soft('/friends','[role=group]');
 await soft(`/people/${friend.username}`,'.muse-profile');check(await theme()===FRIEND_THEME,'a friend’s profile wears their theme');
 await evaluate(()=>history.back());await until(()=>location.pathname==='/friends','back to Friends');await new Promise(r=>setTimeout(r,500));
 check(await theme()===OWN,'Back from a friend’s profile restores my theme');
 await hard(`/people/${friend.username}`,'.muse-profile');check(await theme()===FRIEND_THEME,'reloading a friend’s profile still wears their theme');
 await soft('/','.muse-rail-footer');check(await theme()===OWN,'leaving a reloaded friend profile restores my theme');
 check(await evaluate(()=>localStorage.getItem('muse.theme'))===OWN,'my saved theme was never overwritten');
 console.log(`Theme persistence UI: ${passed} checks passed.`);
}finally{
 try{socket?.close();}catch{}chrome?.kill();
 for(const user of users)await admin.auth.admin.deleteUser(user).catch(()=>{});
 await new Promise(r=>setTimeout(r,300));try{rmSync(directory,{recursive:true,force:true,maxRetries:5});}catch{/* temp profile */}
}
