// Vision Boards (#118) against local Supabase: owner-only rows, revision checks, derived image paths, the
// own-folder rule, PNG uploads for transparency, and the guard that keeps a file shared by a duplicate.
import assert from 'node:assert/strict';
import {loadEnvFile} from 'node:process';
import {createClient} from '@supabase/supabase-js';
import sharp from 'sharp';
import {load} from '../tests/helpers.mjs';

loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname))throw Error('Local only');
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,process.env.SUPABASE_SECRET_KEY,options);
const users=[],must=r=>{if(r.error)throw r.error;return r.data;};
const {loadBoards,saveBoard,deleteBoard}=load('lib/vision-boards/persistence'),{blankBoard,usedPaths}=load('lib/vision-boards/model'),{deleteConstellationFiles}=load('lib/auth/constellation-storage-cleanup');
async function invite(){const link=must(await admin.auth.admin.generateLink({type:'invite',email:`muse-vision-${crypto.randomUUID()}@example.test`}));users.push(link.user.id);const client=createClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,options);must(await client.auth.verifyOtp({type:'invite',token_hash:link.properties.hashed_token}));return {client,id:link.user.id};}
const hashId=()=>crypto.randomUUID();

try{
 const a=await invite(),b=await invite(),bucket=a.client.storage.from('constellation-images');
 const board=await saveBoard(a.client,{...blankBoard(crypto.randomUUID(),new Date().toISOString()),title:'My 2027 Vision',period:'year',periodStart:'2027-01-01'});
 assert.equal(board.revision,1);

 // A transparent PNG (what Safari uploads for cutouts) is accepted in the board's folder.
 const png=await sharp({create:{width:40,height:40,channels:4,background:{r:255,g:0,b:120,alpha:0}}}).png().toBuffer(),id=hashId();
 const path=`${a.id}/${board.id}/${id}.png`,thumbnailPath=`${a.id}/${board.id}/${id}.thumb.png`;
 must(await bucket.upload(path,png,{contentType:'image/png'}));must(await bucket.upload(thumbnailPath,png,{contentType:'image/png'}));
 const image={id:'e1',kind:'image',x:400,y:300,w:300,h:300,rotation:4,image:{path,thumbnailPath,width:40,height:40,mime:'image/png',alpha:true},crop:{shape:'heart',zoom:1.4,x:0.2,y:-0.1},outline:{color:'#ffffff',width:10},
  link:{kind:'aspiration',id:crypto.randomUUID(),label:'Learn to sew'}};
 const saved=await saveBoard(a.client,{...board,elements:[image,{id:'t1',kind:'text',x:800,y:200,w:600,h:96,rotation:0,text:'Becoming her',font:'editorial',size:84,color:'#2a2135',align:'center'}]});
 assert.equal(saved.revision,2);
 const row=must(await a.client.from('vision_boards').select('asset_paths').eq('id',board.id).single());
 assert.deepEqual([...row.asset_paths].sort(),[path,thumbnailPath].sort(),'image paths are derived by the database');
 const [reopened]=await loadBoards(a.client);
 assert.deepEqual(reopened.elements,saved.elements,'the exact arrangement reopens');

 // Revision check: a second device holding the old revision can't overwrite.
 await assert.rejects(()=>saveBoard(a.client,{...board,title:'Stale'}),/another device/);
 // Someone else can't see, change or delete it.
 assert.equal((await loadBoards(b.client)).length,0);
 const hijack=await b.client.from('vision_boards').update({title:'Mine now'}).eq('id',board.id).select('id');assert.equal(hijack.data.length,0);
 // A board can't reference another person's files.
 await assert.rejects(()=>saveBoard(b.client,{...blankBoard(crypto.randomUUID(),new Date().toISOString()),title:'Borrowed',elements:[image]}),e=>e.code==='42501');
 // A file the board uses can't be deleted; the duplicate shares it without copying.
 const copy=await saveBoard(a.client,{...saved,id:crypto.randomUUID(),title:'Copy',revision:0});
 const blocked=await bucket.remove([path]);assert.equal((blocked.data??[]).length,0,'storage refuses to delete a file in use');
 await deleteBoard(a.client,saved);
 assert.equal((await bucket.remove([path])).data?.length??0,0,'still used by the duplicate');
 assert.ok(usedPaths([copy]).has(path));
 await deleteBoard(a.client,copy);
 assert.equal(must(await bucket.remove([path,thumbnailPath])).length,2,'free to remove once no board uses it');
 // Period rules match Intentions.
 const bad=await a.client.from('vision_boards').insert({title:'Bad',period:'quarter',period_start:'2026-02-01'});assert.ok(bad.error,'quarters start in Jan, Apr, Jul or Oct');
 console.log('PASS Vision Boards: owner-only, revision-checked, exact reopen, derived paths, own-folder rule, PNG uploads, shared-file guard, period rules.');
}finally{for(const id of users){await deleteConstellationFiles(admin,id).catch(()=>undefined);await admin.auth.admin.deleteUser(id);}console.log('Disposable Vision Boards accounts and images removed.');}
