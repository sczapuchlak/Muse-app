import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

// Visions: Books (cover + up to eight pages), conversions, covers, writing elements, PDF export.
const M=load('lib/vision-boards/model');
const K=load('lib/vision-boards/book');
const C=load('lib/vision-boards/covers');
const P=load('lib/vision-boards/pdf');
const read=f=>readFileSync(resolve(root,f),'utf8');
let n=0;const id=()=>`id-${++n}`;
const txt=(o={})=>({id:id(),kind:'text',x:300,y:200,w:600,h:96,rotation:0,text:'Hi',font:'editorial',size:60,color:'#2a2135',align:'center',...o});
const shp=(o={})=>({id:id(),kind:'shape',x:100,y:100,w:200,h:100,rotation:0,shape:'rect',fill:{kind:'solid',color:'#ff0000'},...o});
const page=(i,els=[])=>({id:`p${i}`,title:`Page ${i}`,background:{kind:'solid',color:'#ffffff'},elements:els});

test('pages and covers parse safely, with a hard limit of eight pages',()=>{
 const pages=M.parsePages(Array.from({length:12},(_,i)=>page(i+1,[txt()])));
 assert.equal(pages.length,8);assert.equal(M.MAX_PAGES,8);
 assert.equal(M.parsePages([{id:'bad id!'},{id:'p1',title:'  '}])[0].title,'Page 1','blank titles get a name; bad ids are dropped');
 const cover=M.parseCover({preset:'celestial',title:'Paris',subtitle:'Spring',palette:2,family:'Cinzel',image:{path:'nope'}});
 assert.deepEqual([cover.preset,cover.title,cover.subtitle,cover.palette,cover.family,cover.image],['celestial','Paris','Spring',2,'Cinzel',undefined]);
 assert.equal(M.parseCover({preset:'neon'},'Fallback').preset,'classic');
 assert.equal(M.parseCover({},'Fallback').title,'Fallback');
 assert.equal(M.parseElements([txt({role:'p'})])[0].role,'p');
 assert.equal(M.parseElements([txt({role:'h9'})])[0].role,undefined);
 assert.ok(M.LIMITS.text>=4000,'paragraphs have room for real writing');
});

test('page operations: add, duplicate (fresh ids), delete, reorder, rename',()=>{
 const g='g1',base=[page(1,[txt({groupId:g}),txt({groupId:g})]),page(2)];
 const added=K.addPage(base,0,'new');assert.deepEqual(added.map(p=>p.id),['p1','new','p2']);
 const dup=K.duplicatePage(base,0,'copy',id);
 assert.equal(dup[1].title,'Page 1 (copy)');assert.notEqual(dup[1].elements[0].id,base[0].elements[0].id);
 assert.equal(new Set(dup[1].elements.map(e=>e.groupId)).size,1);assert.notEqual(dup[1].elements[0].groupId,g,'a copied group is its own group');
 assert.deepEqual(K.removePage(base,0).map(p=>p.id),['p2']);assert.equal(K.removePage([page(1)],0).length,1,'a book keeps at least one page');
 const moved=K.movePage([page(1),page(2),page(3)],0,2);assert.deepEqual(moved.map(p=>p.id),['p2','p3','p1']);
 assert.deepEqual(moved[2],page(1),'moving a page never touches what is on it');
 assert.equal(K.renamePage(base,1,'Dinner in Paris')[1].title,'Dinner in Paris');
 const full=Array.from({length:8},(_,i)=>page(i+1));
 assert.equal(K.addPage(full,0,'x'),full);assert.equal(K.duplicatePage(full,0,'x',id),full,'the limit applies to duplicates too');
 assert.equal(K.spreadPartner(0,3),1);assert.equal(K.spreadPartner(1,3),0);assert.equal(K.spreadPartner(2,3),undefined);
});

test('board → book → board round-trips every piece exactly',()=>{
 const els=[txt(),shp({finish:{kind:'holo',intensity:.7}})],bg={kind:'gradient',gradient:{colors:['#ff0000','#00ff00'],angle:45}};
 const book=K.boardToBook({title:'Studio',elements:els,background:bg},'p1');
 assert.equal(book.format,'book');assert.equal(book.pages.length,1);assert.deepEqual(book.pages[0].elements,els);assert.deepEqual(book.pages[0].background,bg);
 assert.equal(book.cover.title,'Studio');
 const back=K.singlePageToBoard(book);
 assert.deepEqual([back.format,back.elements,back.background,back.pages],['board',els,bg,undefined]);
 assert.equal(K.singlePageToBoard({pages:[page(1),page(2)]}),null,'a multi-page book is combined into a copy instead');
});

test('combining pages: editable, side by side, positions kept within each page, never flattened',()=>{
 const pages=[page(1,[txt({x:100,y:50})]),page(2,[shp({x:10,y:20})]),page(3)];
 const r=K.combinePages({size:'portrait',pages},id,80);
 assert.equal(r.ok,true);assert.deepEqual(r.canvas,{w:1200*3+160,h:1600});
 const papers=r.elements.filter(e=>e.kind==='shape'&&e.role==='paper');assert.equal(papers.length,3,'each page background becomes an editable paper');
 const t=r.elements.find(e=>e.kind==='text'),s=r.elements.find(e=>e.kind==='shape'&&!e.role);
 assert.deepEqual([t.x,t.y],[100,50]);assert.deepEqual([s.x,s.y],[10+1280,20]);
 assert.ok(r.elements.every(e=>e.kind!=='image'||!e.image.path.includes('flat')));
 const huge=K.combinePages({size:'custom',canvas:{w:7000,h:7000},pages:[page(1),page(2)]},id);
 assert.equal(huge.ok,false);assert.match(huge.reason,/larger than the biggest board/);
 const many=K.combinePages({size:'square',pages:[page(1,Array.from({length:300},()=>shp()))]},id);
 assert.equal(many.ok,false,'too many pieces is explained, never silently dropped');
});

test('five covers, each its own composition (not one layout recoloured)',()=>{
 const sig=[];
 for(const preset of M.coverPresets){
  const cv=C.coverBoard({preset,title:'Paris in the Spring',subtitle:'A travel diary',caption:'2027',palette:0},{w:1200,h:1600});
  assert.ok(cv.elements.length>=5,preset);
  assert.ok(cv.elements.every(e=>e.locked),'cover art is generated, not hand-dragged');
  assert.ok(cv.elements.some(e=>e.kind==='text'&&e.text.toLowerCase().includes('paris')),`${preset} shows the title`);
  for(const pi in C.coverPalettes[preset])assert.ok(C.coverBoard({preset,title:'x',palette:+pi},{w:1200,h:1600}).elements.length);
  sig.push(cv.elements.map(e=>e.kind==='shape'?e.shape:e.kind).join(','));
 }
 assert.equal(new Set(sig).size,5,'every preset has a different structure');
 const withImage=C.coverBoard({preset:'editorial',title:'Moodbook',palette:0,image:{path:'u/b/x.webp',thumbnailPath:'u/b/x.thumb.webp',width:10,height:10,mime:'image/webp'}},{w:1200,h:1600});
 assert.ok(withImage.elements.some(e=>e.kind==='image'&&e.w===1200),'editorial takes a full-bleed image');
 const shown=C.displayBoard({format:'book',size:'portrait',background:{kind:'solid',color:'#000000'},elements:[],cover:{preset:'romantic',title:'T',palette:0}});
 assert.ok(shown.elements.length>0,'a book previews as its cover');
 assert.ok(M.usedPaths([{elements:[],pages:[page(1,[{kind:'image',image:{path:'p'}}])],cover:{image:{path:'c'}}}]).size>=0);
});

test('PDF: valid structure, one page per sheet in order, JPEG size read from the file',()=>{
 // A minimal JPEG header with an SOF0 marker for 30×20.
 const jpeg=new Uint8Array([0xff,0xd8,0xff,0xe0,0,4,0,0,0xff,0xc0,0,11,8,0,20,0,30,3,1,0x11,0,0xff,0xd9]);
 assert.deepEqual(P.jpegSize(jpeg),{width:30,height:20});
 const pdf=new TextDecoder('latin1').decode(P.buildPdf([{jpeg,width:30,height:20},{jpeg,width:20,height:30}]));
 assert.match(pdf,/^%PDF-1\.4/);assert.match(pdf,/%%EOF\n$/);
 assert.equal((pdf.match(/\/Type \/Page /g)||[]).length,2);
 assert.match(pdf,/\/Count 2/);assert.match(pdf,/\/MediaBox \[0 0 842 561\.33\]/);
 const xref=Number(pdf.match(/startxref\n(\d+)/)[1]);assert.equal(pdf.slice(xref,xref+4),'xref','the cross-reference offset is exact');
 for(const [, off] of pdf.matchAll(/(\d{10}) 00000 n/g)){const o=Number(off);assert.match(pdf.slice(o,o+12),/^\d+ 0 obj/);}
});

test('storage and editor wiring: pages and cover are protected; the editor never drops the limit',()=>{
 const sql=read('supabase/migrations/20261221000100_visions_books.sql');
 assert.match(sql,/format in \('board', 'book'\)/);assert.match(sql,/jsonb_array_length\(pages\) between 1 and 8/);
 assert.match(sql,/coalesce\(new\.pages, '\[\]'\)/);assert.match(sql,/coalesce\(new\.cover, '\{\}'\)/);
 assert.match(sql,/update of elements, background, pages, cover/);
 const ed=read('components/envision/vision/BoardEditor.tsx');
 assert.match(ed,/>= MAX_PAGES \? setAnnounce/);assert.match(ed,/combinePages\(/);assert.match(ed,/exportBookPdf/);
 assert.match(ed,/syncPage/,'the page being edited is written back before saving, switching or exporting');
 assert.match(read('lib/vision-boards/persistence.ts'),/elements: \[\] as unknown/,'books keep their pieces only in pages (never duplicated)');
 assert.match(read('lib/envision.ts'),/label: "Visions"/);
 assert.match(read('components/envision/vision/BoardCanvas.tsx'),/e\.role === "p" \? e\.size/,'resizing a paragraph changes its width, not its type size');
 assert.match(read('components/envision/vision/CutoutHelp.tsx'),/showPaste &&/,'no second Paste button on a Mac');
});
