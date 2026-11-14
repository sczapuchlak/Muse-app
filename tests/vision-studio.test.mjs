import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

// Vision Boards 2.0 (#187): the creative studio's pure logic, the asset pipeline and the storage guard.
const M=load('lib/vision-boards/model');
const P=load('lib/vision-boards/paint');
const D=load('lib/vision-boards/decor');
const E=load('lib/vision-boards/editing');
const L=load('lib/vision-boards/library');
const F=load('lib/vision-boards/fonts');
const read=f=>readFileSync(resolve(root,f),'utf8');
const U='11111111-1111-1111-1111-111111111111',B='22222222-2222-2222-2222-222222222222',H='33333333-3333-3333-3333-333333333333',H2='44444444-4444-4444-4444-444444444444';
const asset={path:`${U}/${B}/${H}.webp`,thumbnailPath:`${U}/${B}/${H}.thumb.webp`,width:1600,height:1200,mime:'image/webp'};
const pattern={path:`${U}/${B}/${H2}.png`,thumbnailPath:`${U}/${B}/${H2}.thumb.png`,width:300,height:300,mime:'image/png'};
const img=(o={})=>({id:'a1',kind:'image',x:400,y:300,w:400,h:300,rotation:0,image:asset,crop:{shape:'rect',zoom:1,x:0,y:0},...o});
const shape=(o={})=>({id:'sh1',kind:'shape',x:200,y:200,w:200,h:100,rotation:0,shape:'rounded',...o});
const builtin={kind:'pattern',pattern:{source:'builtin',id:'pattern/gingham/pink-gingham'},scale:1.5,rotation:30,x:0.2,y:-0.4,base:'#FFFFFF'};

test('old boards parse exactly as before (backward compatible)',()=>{
 const old=[img({border:{color:'#ffffff',width:10},shadow:true}),{id:'t1',kind:'text',x:1,y:2,w:300,h:90,rotation:0,text:'Hi',font:'clean',size:60,color:'#2a2135',align:'left'},{id:'s1',kind:'sticker',x:1,y:1,w:100,h:100,rotation:0,sticker:'heart',color:'#f4a259'}];
 assert.deepEqual(M.parseElements(JSON.parse(JSON.stringify(old))),old);
 assert.deepEqual(M.canvasOf({size:'landscape'}),{w:1600,h:1200});
 assert.deepEqual(M.canvasOf({size:'custom'}),{w:1600,h:1200},'a custom size without dimensions falls back safely');
 assert.deepEqual(M.parseBackground({kind:'solid',color:'#FFEEDD'}),{kind:'solid',color:'#ffeedd'});
});

test('finishes: three kinds, intensity, optional shimmer and lift, all round-trip',()=>{
 for(const kind of ['matte','glossy','holo'])assert.equal(P.parseFinish({kind,intensity:0.7}).kind,kind);
 assert.equal(P.parseFinish({kind:'holo',intensity:2}).intensity,1);
 assert.deepEqual(P.parseFinish({kind:'holo',intensity:.5,shimmer:true,lift:false}),{kind:'holo',intensity:.5,shimmer:true,lift:false});
 assert.equal(P.parseFinish({kind:'chrome',intensity:.5}),undefined);
 const pc=read('components/envision/vision/paintCanvas.ts');
 assert.match(pc,/finishCache/,'finish layers are cached per silhouette (cheap redraws while dragging)');
 assert.match(pc,/destination-in/,'every finish is confined to the silhouette');
 assert.match(read('components/envision/vision/Inspector.tsx'),/label: "Holographic"/);
});

test('paints: solid, gradient and pattern parse, clamp and stay hex',()=>{
 assert.deepEqual(P.parsePaint({kind:'solid',color:'#ABCDEF'}),{kind:'solid',color:'#abcdef'});
 assert.equal(P.parsePaint({kind:'solid',color:'primary'}),undefined,'theme tokens are never stored');
 const g=P.parsePaint({kind:'gradient',gradient:{colors:['#ff0000','#00ff00','#0000ff'],angle:-90}});
 assert.equal(g.gradient.angle,270,'any direction, not only the four app presets');assert.equal(g.gradient.colors.length,3);
 assert.equal(P.parsePaint({kind:'gradient',gradient:{colors:['#ff0000','#00ff00'],angle:17.6}}).gradient.angle,18);
 const p=P.parsePaint({...builtin,scale:99,x:5});
 assert.equal(p.scale,8);assert.equal(p.x,1);assert.equal(p.base,'#ffffff');
 assert.equal(P.parsePaint(builtin,false),undefined,'text never takes a pattern');
 assert.equal(P.parsePaint({kind:'pattern',pattern:{source:'builtin',id:'../../etc'}}),undefined);
 assert.equal(P.parsePaint({kind:'pattern',pattern:{source:'asset',asset:{path:'https://evil.example/x.png',thumbnailPath:'x'}}}),undefined,'patterns only use the person’s own private files');
 const up=P.parsePaint({kind:'pattern',pattern:{source:'asset',asset:pattern,tile:false},scale:1,rotation:0,x:0,y:0});
 assert.equal(up.pattern.tile,false);
 assert.equal(P.paintColor(g),'#ff0000');
});

test('every new element kind round-trips with its full style',()=>{
 const els=[
  shape({fill:builtin,stroke:{paint:{kind:'gradient',gradient:{colors:['#ff8fab','#ffd166'],angle:45}},width:12},radius:24,shadowStyle:{color:'#1b1027',blur:20,x:0,y:8,opacity:0.3},finish:{kind:'holo',intensity:0.7,shimmer:true},role:'backing',groupId:'g1',opacity:0.8}),
  {id:'p1',kind:'piece',x:5,y:5,w:100,h:40,rotation:8,piece:'washi/grid/mint-grid',outline:{color:'#ffffff',width:8,paint:builtin},finish:{kind:'glossy',intensity:0.5}},
  img({id:'a2',radius:30,border:{color:'#ffffff',width:12,paint:builtin},outline:{color:'#ffffff',width:10},finish:{kind:'matte',intensity:0.4}}),
  {id:'t2',kind:'text',x:1,y:2,w:300,h:90,rotation:0,text:'Glow',font:'editorial',size:80,color:'#ff0000',align:'center',family:'Playfair Display',weight:700,letterSpacing:0.1,lineHeight:1.1,paint:{kind:'gradient',gradient:{colors:['#ff0000','#0000ff'],angle:90}},stroke:{color:'#ffffff',width:3},glow:{color:'#fff3b0',blur:30}},
 ];
 const back=M.parseElements(JSON.parse(JSON.stringify(els)));
 assert.equal(back.length,4);
 assert.deepEqual(back[0].stroke.paint.gradient.colors,['#ff8fab','#ffd166']);assert.equal(back[0].radius,24);assert.equal(back[0].finish.shimmer,true);assert.equal(back[0].groupId,'g1');assert.equal(back[0].opacity,0.8);
 assert.equal(back[1].outline.paint.kind,'pattern');
 assert.equal(back[2].border.paint.kind,'pattern');assert.equal(back[2].radius,30);
 assert.equal(back[3].family,'Playfair Display');assert.equal(back[3].paint.kind,'gradient');assert.equal(back[3].glow.blur,30);
 assert.equal(M.parseElements([shape({shape:'not-a-shape'})]).length,0);
 assert.equal(M.parseElements([{...els[3],family:'Comic<script>'}])[0].family,undefined);
});

test('storage: every private path anywhere in a board is kept (patterns, borders, backgrounds)',()=>{
 const pat={kind:'pattern',pattern:{source:'asset',asset:pattern},scale:1,rotation:0,x:0,y:0};
 const used=M.usedPaths([{elements:[shape({fill:pat})],background:{kind:'pattern',paint:{...pat,pattern:{source:'asset',asset:asset}}}}]);
 assert.ok(used.has(pattern.path)&&used.has(pattern.thumbnailPath)&&used.has(asset.path),'files used only as fills or backgrounds are never swept');
 const sql=read('supabase/migrations/20261220000100_vision_boards_studio.sql');
 assert.match(sql,/strict \$\.\*\*\.path/);assert.match(sql,/new\.background/);
 assert.match(sql,/update of elements, background/,'the guard refreshes when only the background changes');
 assert.match(sql,/split_part\(p, '\/', 1\) <> new\.user_id::text/,'still only the owner’s own files');
 assert.match(sql,/coalesce\(canvas_w between 400 and 8000 and canvas_h between 400 and 8000, false\)/,'a custom size always has valid dimensions');
});

test('decorative shapes are generated at real size so borders follow the true outline',()=>{
 assert.ok(D.decorShapes.length>=18);
 for(const s of D.decorShapes){const d=D.decorPath(s.id,300,180,20,7);assert.match(d,/^M/,s.id);assert.doesNotMatch(d,/NaN|Infinity/,s.id);}
 const r0=D.decorPath('rounded',300,180,0),r40=D.decorPath('rounded',300,180,40);
 assert.notEqual(r0,r40,'corner radius changes the geometry, not a preset');
 assert.equal(D.decorPath('torn',300,180,0,D.seedOf('a')),D.decorPath('torn',300,180,0,D.seedOf('a')),'organic edges are stable per piece');
 for(const s of ['scallop-rect','wavy','ticket','banner','bubble','label'])assert.ok(D.decorShapes.some(x=>x.id===s));
});

test('canvas expansion adds real space without moving, scaling or distorting anything',()=>{
 const els=[img(),shape()];
 const r=E.expandCanvas({size:'landscape',elements:els},{left:300,top:100,right:50});
 assert.deepEqual(r.canvas,{w:1950,h:1300});assert.equal(r.size,'custom');assert.deepEqual(r.shift,{x:300,y:100});
 assert.deepEqual(r.elements.map(e=>[e.x-els.find(o=>o.id===e.id).x,e.y-els.find(o=>o.id===e.id).y]),[[300,100],[300,100]],'everything shifts together: the composition is unchanged');
 assert.deepEqual(r.elements.map(e=>[e.w,e.h,e.rotation]),els.map(e=>[e.w,e.h,e.rotation]),'no scaling or rotation');
 const right=E.expandCanvas({size:'landscape',elements:els},{right:400,bottom:400});
 assert.equal(right.elements,els,'space on the right/bottom leaves coordinates untouched');
 const huge=E.expandCanvas({size:'landscape',elements:els},{right:99999});
 assert.equal(huge.canvas.w,8000,'limited to the maximum size');
 const exact=E.resizeCanvas({size:'square',elements:els},2000,1400,{x:0.5,y:0.5});
 assert.deepEqual(exact.canvas,{w:2000,h:1400});assert.deepEqual(exact.shift,{x:300,y:0});
});

test('groups, selection, align, distribute, layers and duplicate work on many pieces',()=>{
 const els=[img({id:'a',x:100,y:100}),img({id:'b',x:500,y:300}),img({id:'c',x:900,y:200}),shape({id:'d'})];
 const g=E.groupElements(els,['a','b'],'g');
 assert.deepEqual(E.expandSelection(g,['a']),['a','b'],'picking one grouped piece picks the group');
 assert.ok(E.isGrouped(g,['a','b']));
 assert.equal(E.ungroupElements(g,['a','b']).every(e=>!e.groupId),true);
 assert.deepEqual(E.ungroupElements(g,['a','b']).map(e=>[e.x,e.y]),els.map(e=>[e.x,e.y]),'ungrouping moves nothing');
 const left=E.alignElements(els,['a','b','c'],'left',{w:1600,h:1200});
 assert.equal(new Set(left.slice(0,3).map(e=>E.boundsOf(e).x)).size,1);
 const solo=E.alignElements(els,['c'],'right',{w:1600,h:1200});
 assert.equal(E.boundsOf(solo[2]).x+E.boundsOf(solo[2]).w,1600,'one piece aligns to the board');
 const dist=E.distributeElements(els,['a','b','c'],'h');
 const bx=dist.slice(0,3).map(e=>E.boundsOf(e)).sort((p,q)=>p.x-q.x);
 assert.ok(Math.abs((bx[1].x-(bx[0].x+bx[0].w))-(bx[2].x-(bx[1].x+bx[1].w)))<=1,'equal gaps');
 assert.deepEqual(E.moveLayers(els,['a','b'],'front').map(e=>e.id),['c','d','a','b']);
 assert.deepEqual(E.moveLayers(els,['c'],'back').map(e=>e.id),['c','a','b','d']);
 let n=0;const dup=E.duplicateElements(g,['a','b'],()=>`n${n++}`);
 assert.equal(dup.ids.length,2);const copies=dup.elements.filter(e=>dup.ids.includes(e.id));
 assert.equal(new Set(copies.map(e=>e.groupId)).size,1);assert.notEqual(copies[0].groupId,'g','copies form their own group');
 assert.equal(E.moveElements([{...els[0],locked:true}],['a'],10,10)[0].x,100,'locked pieces stay put');
});

test('snapping finds edges and centers within the threshold',()=>{
 const s=E.snapBox({x:296,y:597,w:100,h:100},[{x:300,y:0,w:100,h:100}],{w:1600,h:1200},6);
 assert.deepEqual([s.dx,s.dy],[4,3],'left edge to the other piece’s left edge; top edge to the board’s middle');
 assert.deepEqual(s.guides,[{axis:'x',at:300},{axis:'y',at:600}]);
 const free=E.snapBox({x:150,y:150,w:100,h:100},[],{w:1600,h:1200},6);
 assert.deepEqual([free.dx,free.dy,free.guides.length],[0,0,0],'nothing nearby: no snap');
});

test('copy and paste: pieces get fresh ids; styles paste only what a kind understands',()=>{
 let n=0;const r=E.pasteElements([],[img(),shape({groupId:'g'})],()=>`p${n++}`,{x:800,y:600});
 assert.equal(r.ids.length,2);assert.ok(r.elements.every(e=>e.id.startsWith('p')));
 const box=E.unionBox(r.elements.map(E.boundsOf));assert.equal(Math.round(box.x+box.w/2),800);
 const style=E.copyStyle(shape({fill:builtin,radius:20,stroke:{paint:{kind:'solid',color:'#000000'},width:3},finish:{kind:'glossy',intensity:0.5}}));
 const onImage=E.pasteStyle(img(),style);
 assert.equal(onImage.fill,undefined,'a photo never gets a shape fill');assert.equal(onImage.stroke,undefined);
 assert.equal(onImage.radius,20);assert.equal(onImage.finish.kind,'glossy');
 const onShape=E.pasteStyle(shape({id:'z',shape:'star'}),style);
 assert.equal(onShape.shape,'star','the shape itself never changes');assert.equal(onShape.fill.kind,'pattern');
});

test('library: generated registry, stable ids, a curated pattern collection and test assets for other kinds',()=>{
 const items=L.allLibraryItems();
 for(const k of L.libraryKinds.map(k=>k.id).filter(k=>k!=='pattern'&&k!=='washi')){const n=items.filter(i=>i.kind===k).length;assert.ok(n>=2&&n<=6,`${k}: ${n}`);}
 const washi=items.filter(i=>i.kind==='washi');assert.ok(washi.length>=12,'a real washi collection');for(const c of ['girly','celestial','whimsical'])assert.ok(washi.filter(i=>i.category===c).length>=4,c);
 const fills=items.filter(i=>i.kind==='pattern'||i.kind==='texture');
 assert.ok(fills.length>=60&&fills.length<=100,`about 60–80 patterns plus stationery (${fills.length})`);
 for(const c of L.fillCategories)assert.ok(fills.filter(i=>i.category===c.id).length>=6,`${c.label} has a full set`);
 assert.deepEqual(L.fillCategoryList().slice(0,L.fillCategories.length),L.fillCategories.map(c=>c.id),'curated categories browse in order');
 assert.equal(L.categoryLabel('girly-romantic'),'Girly & Romantic');
 assert.equal(L.libraryItem('pattern/classic/gingham').category,'girly-romantic','a sidecar files an item under a category without changing its id');
 for(const i of fills.filter(i=>i.src.endsWith('.svg'))){const svg=readFileSync(resolve(root,'public'+i.src),'utf8');assert.match(svg,/<svg[^>]*width="\d+"[^>]*height="\d+"/,`${i.id} has intrinsic size (canvas patterns need it)`);assert.doesNotMatch(svg,/https?:\/\/(?!www\.w3\.org)/,`${i.id} references nothing external`);assert.ok(svg.length<40000,`${i.id} stays small`);}
 for(const i of items){
  assert.ok(P.builtinIdOk(i.id),i.id);assert.ok(i.id.startsWith(`${i.kind}/`));
  assert.ok(existsSync(resolve(root,'public'+i.src)),i.src);assert.ok(existsSync(resolve(root,'public'+i.thumb)),i.thumb);
 }
 assert.equal(L.libraryItem('texture/paper/watercolor-wash').tileable,false,'sidecar overrides tiling');
 assert.ok(L.searchLibrary('fills').every(i=>i.kind==='pattern'||i.kind==='texture'));
 assert.ok(L.searchLibrary('pattern','gingham').length>=1);
 const s=L.pieceSize({w:400,h:100,kind:'washi'},{w:1600,h:1200});assert.ok(Math.abs(s.w/s.h-4)<0.1,'pieces keep their proportions');
});

test('asset import: SVGs are sanitized; nothing executable or external survives',async()=>{
 const {sanitizeSvg,slug}=await import(resolve(root,'scripts/vision-assets/import.mjs'));
 const dirty=`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><foreignObject><div>x</div></foreignObject>
  <a href="javascript:alert(1)"><rect fill="url(https://evil.example/p.svg)" onclick="x()"/></a><image href="https://evil.example/t.png"/><use href="#ok"/><style>@import url(https://evil.example/a.css);</style></svg>`;
 const clean=sanitizeSvg(dirty);
 for(const bad of [/script/i,/foreignObject/i,/onload|onclick/i,/javascript:/i,/evil\.example/,/@import/])assert.doesNotMatch(clean,bad);
 assert.match(clean,/href="#ok"/,'internal references are kept');
 assert.equal(sanitizeSvg('<html>not svg</html>'),null);
 assert.equal(slug('Pink Gingham (Large)!'),'pink-gingham-large');
 assert.match(read('proxy.ts'),/vision-assets\//,'public library art skips the auth proxy (no per-tile session check)');
 const doc=read('docs/VISION_ASSETS.md');assert.match(doc,/npm run vision:assets/);assert.match(doc,/assets-src\/vision/);
});

test('fonts: lazy Google Fonts URLs, real weights only, safe family names',()=>{
 assert.ok(F.fontCatalog.length>=100);
 const pf=F.catalogFont('Playfair Display');assert.ok(pf);
 const url=F.fontCssUrl(pf);assert.match(url,/^https:\/\/fonts\.googleapis\.com\/css2\?family=Playfair\+Display:ital,wght@/);assert.match(url,/display=swap/);
 assert.equal(F.nearestWeight(pf,880),900);assert.equal(F.nearestWeight(F.catalogFont('Pacifico'),700),400,'a family never asks for a weight it lacks');
 assert.ok(F.searchFonts('',`script`).every(f=>f.category==='script'));
 for(const f of F.fontCatalog)assert.match(f.family,/^[A-Za-z0-9 ]{2,48}$/,'every catalog family passes the model’s name check');
});

test('editor: contextual inspector, export, shortcuts and fully editable borders and radii',()=>{
 const ed=read('components/envision/vision/BoardEditor.tsx'),ins=read('components/envision/vision/Inspector.tsx');
 for(const k of ['"a"','"d"','"g"','"x"','"c"'])assert.ok(ed.includes(`k === ${k}`),k);
 assert.match(ed,/exportBoard\(/);assert.match(ed,/expandCanvas\(/);
 assert.match(ed,/x: v\.x - r\.shift\.x \* v\.scale/,'adding space on the left keeps the art still on screen');
 assert.match(ins,/label="Corner radius"/);assert.match(ins,/<PaintEditor label="Border"/);assert.match(ins,/label="Thickness"/);
 assert.match(read('components/envision/vision/PaintEditor.tsx'),/label="Rotation"/);
 assert.match(read('components/envision/vision/BoardCanvas.tsx'),/reducedMotion/,'shimmer respects reduced motion');
});
