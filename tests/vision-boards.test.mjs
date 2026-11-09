import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const M=load('lib/vision-boards/model');
const S=load('lib/vision-boards/shapes');
const I=load('lib/intentions/model');
const read=f=>readFileSync(resolve(root,f),'utf8');
const U='11111111-1111-1111-1111-111111111111',B='22222222-2222-2222-2222-222222222222',H='33333333-3333-3333-3333-333333333333';
const asset={path:`${U}/${B}/${H}.webp`,thumbnailPath:`${U}/${B}/${H}.thumb.webp`,width:1600,height:1200,mime:'image/webp',name:'beach.jpg'};
const img=(o={})=>({id:'a1',kind:'image',x:400,y:300,w:400,h:300,rotation:-3,image:asset,crop:{shape:'rect',zoom:1,x:0,y:0},...o});
const txt=(o={})=>({id:'t1',kind:'text',x:800,y:200,w:600,h:96,rotation:0,text:'Dream big',font:'editorial',size:84,color:'#2a2135',align:'center',...o});
const stk=(o={})=>({id:'s1',kind:'sticker',x:100,y:100,w:180,h:180,rotation:0,sticker:'heart',color:'#f4a259',...o});

test('elements round-trip and parsing drops only what it cannot understand',()=>{
 const els=[img({link:{kind:'aspiration',id:'asp-1',label:'Learn to sew'},border:{color:'#FFFFFF',width:10},shadow:true}),txt({bold:true,highlight:'#fff3b0'}),stk(),stk({id:'s2',sticker:'mark:plane'})];
 assert.deepEqual(M.parseElements(JSON.parse(JSON.stringify(els))).map(e=>e.id),['a1','t1','s1','s2']);
 const parsed=M.parseElements(els);
 assert.equal(parsed[0].border.color,'#ffffff','colors normalise to lowercase hex');
 assert.deepEqual(parsed[0].link,{kind:'aspiration',id:'asp-1',label:'Learn to sew'});
 const junk=[{id:'x',kind:'video'},{kind:'text'},img({id:'a1'}),img({image:{...asset,path:'other/../x.webp'}}),stk({id:'s9',sticker:'not-a-sticker'}),{...txt({id:'t9'}),font:'comic'}];
 const out=M.parseElements([els[0],...junk]);
 assert.deepEqual(out.map(e=>e.id),['a1','t9'],'unknown kinds, duplicate ids, foreign paths and unknown stickers are dropped');
 assert.equal(out[1].font,'editorial','an unknown font falls back instead of losing the words');
 assert.equal(M.parseElements(Array.from({length:400},(_,i)=>stk({id:`s${i}`}))).length,M.MAX_ELEMENTS);
 const clamped=M.parseElements([img({crop:{shape:'blob',zoom:9,x:-5,y:2}})])[0];
 assert.deepEqual(clamped.crop,{shape:'rect',zoom:4,x:-1,y:1});
});

test('background is pinned hex (never a theme token), with a safe default',()=>{
 assert.deepEqual(M.parseBackground({kind:'solid',color:'#ABCDEF'}),{kind:'solid',color:'#abcdef'});
 assert.deepEqual(M.parseBackground({kind:'solid',color:'primary'}),M.defaultBackground,'theme accents are not stored: the board keeps its own colors');
 assert.deepEqual(M.parseBackground({kind:'gradient',gradient:{colors:['#000000','#ffffff'],angle:90}}),{kind:'gradient',gradient:{colors:['#000000','#ffffff'],angle:90}});
 assert.deepEqual(M.parseBackground(null),M.defaultBackground);
});

test('layers, duplicate and remove are pure and keep links as references',()=>{
 const els=[img(),txt(),stk()];
 assert.deepEqual(M.moveLayer(els,'a1','front').map(e=>e.id),['t1','s1','a1']);
 assert.deepEqual(M.moveLayer(els,'s1','back').map(e=>e.id),['s1','a1','t1']);
 assert.deepEqual(M.moveLayer(els,'t1','forward').map(e=>e.id),['a1','s1','t1']);
 assert.deepEqual(M.moveLayer(els,'t1','backward').map(e=>e.id),['t1','a1','s1']);
 assert.equal(M.moveLayer(els,'s1','forward'),els,'already on top: unchanged');
 const linked=[img({link:{kind:'bucket',id:'d1',label:'Visit Tokyo'},locked:true})];
 const dup=M.duplicateElement(linked,'a1','a2');
 assert.deepEqual(dup.map(e=>e.id),['a1','a2'],'the copy sits right above the original');
 assert.deepEqual(dup[1].link,linked[0].link,'the copy points at the same dream (no new dream is created)');
 assert.equal(dup[1].locked,undefined,'a copy is never locked');
 assert.equal(dup[1].x,linked[0].x+32);
 assert.deepEqual(M.removeElement(els,'t1').map(e=>e.id),['a1','s1']);
 assert.equal(els.length,3,'inputs are never mutated');
});

test('undo and redo walk snapshots; a new edit clears redo',()=>{
 const a={elements:[],background:M.defaultBackground},b={elements:[stk()],background:M.defaultBackground},c={elements:[stk(),txt()],background:M.defaultBackground};
 let h=M.record(M.emptyHistory(),a);h=M.record(h,b);
 const u1=M.undo(h,c);assert.equal(u1.snapshot,b);
 const u2=M.undo(u1.history,b);assert.equal(u2.snapshot,a);
 assert.equal(M.undo(u2.history,a),null);
 const r1=M.redo(u2.history,a);assert.equal(r1.snapshot,b);
 assert.deepEqual(M.record(r1.history,b).future,[],'editing after undo drops the redo branch');
 let long=M.emptyHistory();for(let i=0;i<200;i++)long=M.record(long,a);
 assert.equal(long.past.length,M.HISTORY_LIMIT);
});

test('crop math always fills the frame and shapes with a fixed ratio square the frame',()=>{
 const frame={w:300,h:300},image={width:1600,height:1200};
 const r=M.cropRect(frame,image,{zoom:1,x:0,y:0});
 assert.equal(r.h,300);assert.equal(r.w,400);assert.equal(r.x,-50);assert.equal(r.y,0);
 const left=M.cropRect(frame,image,{zoom:1,x:-1,y:0}),right=M.cropRect(frame,image,{zoom:1,x:1,y:0});
 assert.equal(left.x,-100);assert.equal(right.x,0,'the photo edge never leaves the frame');
 const z=M.cropRect(frame,image,{zoom:2,x:0,y:0});assert.equal(z.w,800);
 const sq=M.withCropShape(img({w:400,h:100}),'circle',1);assert.equal(sq.w,sq.h);assert.equal(sq.w,200);
 assert.equal(M.withCropShape(img(),'heart',null).w,400,'free-ratio shapes keep the frame');
 for(const s of S.cropShapes)assert.ok(S.shapePaths[s.id].startsWith('M'),s.id);
 assert.equal(S.scalePath('M0 0H1V1H0Z',200,100),'M0 0H200V100H0Z');
 assert.equal(S.scalePath('M0.5 0C1 0 1 1 0.5 1Z',10,20),'M5 0C10 0 10 20 5 20Z');
});

test('placement, fitting and library sorting',()=>{
 const f=M.fitImage({size:'landscape'},{width:4000,height:2000});assert.ok(f.w>f.h);assert.equal(Math.round(f.w/f.h),2);
 const p=M.fitImage({size:'portrait'},{width:1000,height:3000});assert.ok(p.h>p.w);
 const a=M.nextPlacement({size:'landscape'},0),b=M.nextPlacement({size:'landscape'},1);assert.notDeepEqual(a,b,'new pieces never stack exactly');
 const boards=[
  {...M.blankBoard('b1','2026-01-01T00:00:00Z'),title:'Summer in Europe',period:'quarter',periodStart:'2026-07-01',updatedAt:'2026-03-01T00:00:00Z'},
  {...M.blankBoard('b2','2026-02-01T00:00:00Z'),title:'dream home',updatedAt:'2026-02-01T00:00:00Z'},
  {...M.blankBoard('b3','2026-03-01T00:00:00Z'),title:'My 2027 Vision',theme:'Becoming Her',period:'year',periodStart:'2027-01-01',updatedAt:'2026-01-05T00:00:00Z'},
 ];
 assert.deepEqual(M.libraryView(boards,'','all','updated').map(b=>b.id),['b1','b2','b3']);
 assert.deepEqual(M.libraryView(boards,'','all','created').map(b=>b.id),['b3','b2','b1']);
 assert.deepEqual(M.libraryView(boards,'','all','title').map(b=>b.id),['b2','b3','b1']);
 assert.deepEqual(M.libraryView(boards,'','none','updated').map(b=>b.id),['b2']);
 assert.deepEqual(M.libraryView(boards,'becoming','all','updated').map(b=>b.id),['b3'],'search covers the theme');
 assert.deepEqual(M.libraryView(boards,'q3','all','updated').map(b=>b.id),['b1'],'and the period label');
 assert.equal(M.periodStartFor('quarter','2026-11-09'),'2026-10-01');
 assert.equal(M.periodStartFor('month','2026-11-09'),'2026-11-01');
 assert.equal(M.periodLabel('month','2026-11-01'),'November 2026');
 assert.equal(M.boardFieldsValid({title:'  ',period:null,periodStart:null}),'Give the board a name.');
});

test('files: duplicates share files and only unused files may be removed',()=>{
 const one={elements:[img(),img({id:'a2',image:{...asset,path:`${U}/${B}/${H.replace(/3/g,'4')}.png`,thumbnailPath:`${U}/${B}/${H.replace(/3/g,'4')}.thumb.png`,alpha:true}})]};
 const used=M.usedPaths([one]);
 assert.equal(used.size,4);assert.ok(used.has(asset.thumbnailPath));
 assert.equal(M.linkStatus({kind:'bucket',id:'d',label:'Tokyo'},undefined).note,'no longer there');
 assert.equal(M.linkStatus({kind:'bucket',id:'d',label:'Tokyo'},{label:'Visit Tokyo'}).note,'now “Visit Tokyo”');
});

test('migration: owner-only table, derived asset paths, PNG for transparency, shared-file guard',()=>{
 const sql=read('supabase/migrations/20261203000100_vision_boards.sql');
 assert.match(sql,/create table public\.vision_boards/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.vision_boards from public, anon, authenticated/);
 for(const p of ['owner_read','owner_insert','owner_update','owner_delete'])assert.match(sql,new RegExp(`create policy ${p} on public\\.vision_boards`));
 assert.match(sql,/jsonb_array_length\(elements\) <= 300/);
 assert.match(sql,/split_part\(p, '\/', 1\) <> new\.user_id::text/,'a board can only use files from its owner’s folder');
 assert.match(sql,/allowed_mime_types = array\['image\/webp', 'image\/jpeg', 'image\/png'\]/);
 assert.match(sql,/\(webp\|jpg\|png\)\$/);
 assert.match(sql,/b\.asset_paths @> array\[name\]/,'a file used by any board can’t be deleted');
 assert.match(sql,/constellation_cards c/,'the Constellations guard is kept');
 assert.doesNotMatch(sql,/aspirations|bucket_entries/,'boards hold references only: no foreign keys or writes into other modules');
});

test('integrations: Envision tab, Intentions references a board, export includes boards',()=>{
 const env=read('components/envision/Envision.tsx');
 assert.match(env,/<VisionBoards today=\{today\} \/>/);
 assert.doesNotMatch(env,/VisionBoardsEmpty/);
 const kinds=I.sectionKinds.map(k=>k.key);assert.ok(kinds.includes('boards'));
 assert.ok(!I.templates.year.seeds.some(s=>s.key==='boards'),'existing templates are unchanged');
 const sec=I.parseSections([{id:'s1',type:'boards',title:'Vision board',content:{items:[{id:'i1',ref:{kind:'board',id:'b1',label:'My 2027 Vision'},note:''},{id:'i2',ref:{kind:'aspiration',id:'a',label:'x'},note:''}]}}]);
 assert.equal(sec[0].content.items.length,1,'only board references belong in a board section');
 assert.equal(I.MAX_ITEMS.boards,3);
 const ints=read('components/planner/intentions/Intentions.tsx');
 assert.match(ints,/\/envision\?view=vision-boards&board=\$\{r\.id\}/);
 assert.match(read('app/api/account/export/route.ts'),/client\.from\('vision_boards'\)\.select\('\*'\)/);
 const canvas=read('components/envision/vision/VisionBoards.tsx');
 assert.match(canvas,/dynamic\(\(\) => import\("\.\/BoardEditor"\), \{ ssr: false/,'Konva loads only in the browser, on demand');
 const editor=read('components/envision/vision/BoardEditor.tsx');
 assert.match(editor,/visibilitychange/);assert.match(editor,/beforeunload/);assert.match(editor,/keepTransparency: true/);
 assert.doesNotMatch(editor,/createTask|save_rituals|aspirations\.save/,'a board never creates tasks, rituals or aspirations');
});

test('cutouts: Apple-guided only, iPhone/iPad only, never claims Muse removes backgrounds',()=>{
 const help=read('components/envision/vision/CutoutHelp.tsx'),editor=read('components/envision/vision/BoardEditor.tsx');
 assert.match(help,/iPhone\|iPad\|iPod/);assert.match(help,/maxTouchPoints > 1/,'iPadOS is recognised');
 assert.match(editor,/\{apple && <CutoutTools/,'the guide is not rendered on desktop');
 assert.match(help,/navigator\.clipboard\.read/);assert.match(help,/muse\.vision\.cutoutHint/);
 assert.doesNotMatch(help.replace(/doesn[’']t remove backgrounds/g,''),/remove(s)? backgrounds?/i,'only the disclaimer mentions removing backgrounds');
 assert.doesNotMatch(read('package.json'),/background-removal|onnxruntime|@huggingface\/transformers/,'no model or API dependency in v1');
});
