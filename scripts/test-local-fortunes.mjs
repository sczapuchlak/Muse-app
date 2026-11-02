import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {createClient} from '@supabase/supabase-js';
import {load} from '../tests/helpers.mjs';
loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local Supabase only');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options),anon=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);
const {readWhimsy,saveWhimsyRecord,deleteWhimsyRecord}=load('lib/whimsy/persistence');
const {assignFortuneOnce}=load('lib/whimsy/connected');
const {fortuneLibrary}=load('lib/whimsy/fortunes');
const id=()=>crypto.randomUUID(),users=[],must=r=>{if(r.error)throw r.error;return r.data;};
async function invite(){const link=must(await admin.auth.admin.generateLink({type:'invite',email:`fortune-${id()}@example.test`}));users.push(link.user.id);const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options),session=must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token})).session;return {client,userId:link.user.id,session};}
try{
 const a=await invite(),b=await invite(),date='2026-11-02',timeZone='America/Los_Angeles',cookie=fortuneLibrary.find(item=>item.metadata.kind==='cookie'),other=fortuneLibrary.find(item=>item.metadata.kind==='cookie'&&item.id!==cookie.id),now=new Date().toISOString();
 const catalog=must(await a.client.from('whimsy_content_versions').select('content_id').eq('experience','fortunes'));assert.ok(catalog.length>=fortuneLibrary.length);for(const entry of fortuneLibrary)assert.ok(catalog.some(row=>row.content_id===entry.id));
 assert.ok((await anon.rpc('read_whimsy')).error);assert.ok((await anon.from('whimsy_fortune_assignments').select('*')).error);
 const dailyRecord={id:id(),date,timeZone,kind:'cookie',content:{contentId:cookie.id,version:1},shownAt:now,category:cookie.metadata.category},command=id();
 const daily=await assignFortuneOnce(a.client,dailyRecord,command);assert.equal(daily.id,dailyRecord.id);assert.equal((await assignFortuneOnce(a.client,{...dailyRecord,id:id(),content:{contentId:other.id,version:1}},id())).id,daily.id);
 const extraRecord={...dailyRecord,id:id(),slot:id(),content:{contentId:other.id,version:1}},extraCommand=id();const extra=await saveWhimsyRecord(a.client,'fortunes',{record:extraRecord,expectedRevision:0,commandId:extraCommand});assert.equal((await saveWhimsyRecord(a.client,'fortunes',{record:extraRecord,expectedRevision:0,commandId:extraCommand})).id,extra.id);
 assert.equal((await readWhimsy(a.client)).fortunes.length,2);assert.equal((await readWhimsy(b.client)).fortunes.length,0);assert.ok((await b.client.from('whimsy_fortune_assignments').insert({id:id(),user_id:a.userId,payload:{},activity_date:date,time_zone:timeZone})).error);
 const savedRecord={id:id(),date,timeZone,assignmentId:extra.id,savedAt:now,category:other.metadata.category,question:'A private question?',note:'',snapshot:{title:other.title,body:other.body}},savedCommand=id();const saved=await saveWhimsyRecord(a.client,'saved',{record:savedRecord,expectedRevision:0,commandId:savedCommand});assert.equal((await saveWhimsyRecord(a.client,'saved',{record:savedRecord,expectedRevision:0,commandId:savedCommand})).id,saved.id);await assert.rejects(()=>saveWhimsyRecord(b.client,'saved',{record:{...savedRecord,id:id()},expectedRevision:0,commandId:id()}));
 const edited=await saveWhimsyRecord(a.client,'saved',{record:{...savedRecord,note:'Remember this'},expectedRevision:1,commandId:id()});assert.equal(edited.note,'Remember this');await assert.rejects(()=>saveWhimsyRecord(a.client,'saved',{record:{...savedRecord,note:'stale'},expectedRevision:1,commandId:id()}));
 const fresh=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await fresh.auth.setSession(a.session));assert.equal((await readWhimsy(fresh)).saved[0].snapshot.body,other.body);assert.equal((await readWhimsy(fresh)).saved[0].note,'Remember this');
 await deleteWhimsyRecord(a.client,'saved',saved.id,edited.revision,id());assert.equal((await readWhimsy(a.client)).saved.length,0);assert.equal((await readWhimsy(a.client)).fortunes.length,2);
 console.log('PASS local Fortunes catalog, daily stability, extra draws, idempotent saves, snapshots, CAS, restart persistence, RLS and anonymous denial');
}finally{for(const userId of users)must(await admin.auth.admin.deleteUser(userId));console.log('Disposable Fortunes users removed.');}
