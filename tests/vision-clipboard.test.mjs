import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';
const C=load('lib/vision-boards/clipboard');
const image=new File(['image bytes'],'web-picture.png',{type:'image/png'});

test('native image paste takes files once even when clipboard items expose the same image',()=>{
 assert.deepEqual(C.imageFilesFromPaste({files:[image],items:[{kind:'file',type:'image/png',getAsFile:()=>image}]}),[image]);
});
test('image clipboard items work when the files collection is empty',()=>{
 assert.deepEqual(C.imageFilesFromPaste({files:[],items:[{kind:'string',type:'text/html',getAsFile:()=>null},{kind:'file',type:'image/png',getAsFile:()=>image}]}),[image]);
});
test('copied links, rich text and non-image files are not imported as images',()=>{
 const text=new File(['https://example.test/image.png'],'link.txt',{type:'text/plain'});
 assert.deepEqual(C.imageFilesFromPaste({files:[text],items:[{kind:'string',type:'text/uri-list',getAsFile:()=>null},{kind:'string',type:'text/html',getAsFile:()=>null}]}),[]);
});
test('clipboard read prefers PNG bytes and preserves the source blob without flattening transparency',async()=>{
 const requested=[];const blob=new Blob([new Uint8Array([137,80,78,71,0,255])],{type:'image/png'});
 const files=await C.readClipboardImages({read:async()=>[{types:['text/html','image/jpeg','image/png'],getType:async type=>{requested.push(type);return blob;}}]});
 assert.deepEqual(requested,['image/png']);assert.equal(files.length,1);assert.equal(files[0].type,'image/png');assert.equal(files[0].name,'pasted-image.png');assert.deepEqual(new Uint8Array(await files[0].arrayBuffer()),new Uint8Array(await blob.arrayBuffer()));
});
test('clipboard images can be read alongside webpage text without requesting copied HTML or URLs',async()=>{
 const requested=[];
 const files=await C.readClipboardImages({read:async()=>[{types:['text/html','text/plain'],getType:()=>assert.fail('text must not be requested')},{types:['image/webp'],getType:async type=>{requested.push(type);return new Blob(['webp'],{type});}}]});
 assert.equal(files[0].type,'image/webp');assert.deepEqual(requested,['image/webp']);
});
test('missing image data and denied clipboard permissions provide a recovery path',async()=>{
 await assert.rejects(C.readClipboardImages({read:undefined}),/Photos/);
 await assert.rejects(C.readClipboardImages({read:async()=>[{types:['text/plain']}]}),/Copy Image/);
 const denied=new DOMException('blocked','NotAllowedError');
 await assert.rejects(C.readClipboardImages({read:async()=>{throw denied;}}),{name:'NotAllowedError'});
 assert.match(C.clipboardPasteError(denied),/Paste button/);assert.match(C.clipboardPasteError(denied),/Photos/);
});
