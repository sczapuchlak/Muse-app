import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {createClient} from '@supabase/supabase-js';
loadEnvFile('.env.local');
const site=process.env.SITE_URL??'http://localhost:3000',api=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;
for(const value of [site,api])if(!value||!['localhost','127.0.0.1','[::1]'].includes(new URL(value).hostname))throw new Error('Auth integration tests require LOCAL services.');
if(!key)throw new Error('Run npm run db:env first.');
const admin=createClient(api,key,{auth:{persistSession:false,autoRefreshToken:false}}),ids=[],email=`muse-auth-${crypto.randomUUID()}@example.test`;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function browser(){const cookies=new Map();return {cookies,async request(path,options={}){const response=await fetch(new URL(path,site),{redirect:'manual',...options,headers:{cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),...options.headers},signal:AbortSignal.timeout(45000)});for(const raw of response.headers.getSetCookie()){const pair=raw.split(';')[0],index=pair.indexOf('='),name=pair.slice(0,index),value=pair.slice(index+1);if(/max-age=0(?:;|$)/i.test(raw)||!value)cookies.delete(name);else cookies.set(name,value);}return response;}};}
const origin=new URL(site).origin;
async function inboxLink(address,type,seen=new Set()){
 for(let attempt=0;attempt<50;attempt++){
  const result=await fetch('http://127.0.0.1:54324/api/v1/messages').then(r=>r.json());
  for(const message of result.messages??[]){
   if(seen.has(message.ID)||!message.To?.some(to=>to.Address.toLowerCase()===address.toLowerCase()))continue;
   const detail=await fetch(`http://127.0.0.1:54324/api/v1/message/${message.ID}`).then(r=>r.json());
   const links=[...(detail.HTML??'').matchAll(/href="([^"]+)"/g)].map(match=>match[1].replaceAll('&amp;','&'));
   const link=links.find(value=>{try{return new URL(value).pathname==='/auth/confirm'&&new URL(value).searchParams.get('type')===type;}catch{return false;}});
   if(link){seen.add(message.ID);return link;}
  }
  await wait(150);
 }
 throw new Error('No matching local inbox link arrived. Check local Auth/email services.');
}
try{
 const guest=browser();
 for(const path of ['/','/planner','/rituals','/nourish','/mood','/money','/notes','/insights','/appearance','/settings','/whimsy']){
  const result=await guest.request(path);assert.equal(result.status,307,path);assert.equal(new URL(result.headers.get('location'),site).pathname,'/login');assert.match(result.headers.get('cache-control'),/no-store/);
 }
 console.log('PASS anonymous protection across all module destinations');
 const missing=await guest.request('/auth/confirm');assert.match(missing.headers.get('location'),/notice=invalid-link/);
 const expired=await guest.request('/auth/confirm?type=email&token_hash='+'a'.repeat(64));assert.match(expired.headers.get('location'),/notice=link-expired/);
 const badOrigin=await guest.request('/auth/link',{method:'POST',headers:{origin:'https://other.example','content-type':'application/json'},body:JSON.stringify({email})});assert.equal(badOrigin.status,403);
 console.log('PASS malformed/expired links and cross-origin login denial');
 const invite=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:`${origin}/auth/confirm`});if(invite.error)throw invite.error;ids.push(invite.data.user.id);
 const seen=new Set(),link=await inboxLink(email,'invite',seen),signed=browser();
 const confirmed=await signed.request(link);assert.equal(confirmed.status,307);assert.equal(new URL(confirmed.headers.get('location'),site).pathname,'/');assert.ok([...signed.cookies.keys()].some(name=>name.includes('auth-token')));
 const page=await signed.request('/');assert.equal(page.status,200);assert.match(await page.text(),/The Daily Edit/);
 const reused=await browser().request(link);assert.match(reused.headers.get('location'),/notice=link-expired/);
 console.log('PASS actual inbox invitation, cookie callback, protected page and one-use link');
 await wait(1100); // Respect the local Auth email cooldown even on a warm development server.
 const linkResponse=await signed.request('/auth/link',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({email,next:'/mood?date=2026-10-29'})});assert.equal(linkResponse.status,200);
 const magic=await inboxLink(email,'email',seen),magicResponse=await signed.request(magic);assert.equal(new URL(magicResponse.headers.get('location'),site).pathname,'/mood');assert.equal(new URL(magicResponse.headers.get('location'),site).search,'?date=2026-10-29');
 assert.equal((await signed.request('/mood')).status,200);
 console.log('PASS login request sends a real local magic link and preserves a safe return destination');
 const prefix=`sb-${new URL(api).hostname.split('.')[0]}-auth-token`,chunks=[...signed.cookies].filter(([name])=>name===prefix||new RegExp(`^${prefix}\\.\\d+$`).test(name)).sort(([a],[b])=>(Number(a.split('.').at(-1))||0)-(Number(b.split('.').at(-1))||0));
 const encoded=chunks.map(([,value])=>value).join(''),session=JSON.parse(Buffer.from(encoded.slice('base64-'.length),'base64url').toString());
 const originalRefresh=session.refresh_token;session.expires_at=1;const stale='base64-'+Buffer.from(JSON.stringify(session)).toString('base64url');for(const [name]of chunks)signed.cookies.delete(name);if(stale.length<=3180)signed.cookies.set(prefix,stale);else for(let i=0;i<stale.length;i+=3180)signed.cookies.set(`${prefix}.${i/3180}`,stale.slice(i,i+3180));
 const refreshed=await signed.request('/planner');assert.equal(refreshed.status,200);assert.ok(refreshed.headers.getSetCookie().some(value=>value.includes('auth-token')));assert.match(refreshed.headers.get('cache-control'),/no-store/);assert.ok(originalRefresh);
 console.log('PASS server-side refresh propagates cookies to protected rendering');
 const csrf=await signed.request('/auth/logout',{method:'POST',headers:{origin:'https://other.example',accept:'application/json'}});assert.equal(csrf.status,403);assert.equal((await signed.request('/settings')).status,200);
 const logout=await signed.request('/auth/logout',{method:'POST',headers:{origin,accept:'application/json'}});assert.equal(logout.status,200);assert.ok(![...signed.cookies.keys()].some(name=>name.startsWith(prefix)));assert.equal((await signed.request('/notes')).status,307);
 console.log('PASS logout revocation/cookie cleanup, protected redirects and CSRF protection');
 const unknown=await guest.request('/auth/link',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({email:`not-invited-${crypto.randomUUID()}@example.test`})});assert.equal(unknown.status,200);assert.deepEqual(await unknown.json(),{ok:true});
 console.log('PASS uninvited addresses receive a generic response without signup');
}finally{
 for(const id of ids){const {error}=await admin.auth.admin.deleteUser(id);if(error)throw error;}
 console.log('Auth test users removed. No real personal records created.');
}
