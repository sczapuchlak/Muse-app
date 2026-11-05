import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load,root} from './helpers.mjs';
const d=load('lib/whimsy/dreams');
const read=f=>readFileSync(root+'/'+f,'utf8');
let n=0;const dream=(over={})=>({id:`d${n++}`,userId:'u',revision:1,createdAt:'x',updatedAt:'x',date:'2026-10-01',timeZone:'UTC',loggedAt:'2026-10-01T07:00:00Z',text:'A house by the sea.',symbolIds:[],emotions:[],interpretation:'',...over});

test('pagination clamps pages and shows a compact page window',()=>{
 assert.deepEqual(d.paginate([1,2,3,4,5],9,2),{items:[5],page:2,pages:3,total:5,start:5,end:5});
 assert.deepEqual(d.paginate([],0,12),{items:[],page:0,pages:1,total:0,start:0,end:0});
 assert.deepEqual(d.pageWindow(5,12),[0,'gap',4,5,6,'gap',11]);assert.deepEqual(d.pageWindow(0,3),[0,1,2]);
});

test('untitled dreams use their first sentence, trimmed at a word',()=>{
 assert.equal(d.dreamDisplayTitle({text:'I was back home. Then rain.'}),'I was back home.');
 assert.equal(d.dreamDisplayTitle({title:'  The red door ',text:'x'}),'The red door');
 assert.match(d.dreamDisplayTitle({text:'word '.repeat(40)}),/word…$/);
 assert.equal(d.dreamDisplayTitle({text:'   '}),'Untitled dream');
});

test('the constellation only joins symbols that really shared dreams',()=>{
 const dreams=[dream({symbolIds:['a','b']}),dream({symbolIds:['a','b','c']}),dream({symbolIds:['a','c']}),dream({symbolIds:['d']}),dream({symbolIds:['b','b']})];
 const c=d.symbolConstellation(dreams);
 assert.deepEqual(c.nodes,[{id:'a',count:3},{id:'b',count:3},{id:'c',count:2}],'single-dream symbols are not stars; repeats in one dream count once');
 assert.deepEqual(c.links,[{a:'a',b:'b',count:2},{a:'a',b:'c',count:2}],'b and c shared only one dream, so no line');
 assert.deepEqual(d.symbolConstellation([dream({symbolIds:['x']})]),{nodes:[],links:[]});
 assert.deepEqual(d.emotionPairs([dream({emotions:['calm','joy']}),dream({emotions:['joy','calm']}),dream({emotions:['calm']})]),[{a:'calm',b:'joy',count:2}]);
});

test('month and weekday rhythms include real zeros and group dreams by month',()=>{
 const dreams=[dream({date:'2026-10-05'}),dream({date:'2026-10-06'}),dream({date:'2026-08-01'})];
 const months=d.dreamMonths(dreams,'2026-11-04');assert.equal(months.length,12);assert.deepEqual(months.slice(-4),[{month:'2026-08',count:1},{month:'2026-09',count:0},{month:'2026-10',count:2},{month:'2026-11',count:0}]);
 assert.deepEqual(d.dreamWeekdays(dreams),[1,1,0,0,0,1,0]);
 assert.deepEqual(d.dreamsByMonth(dreams).map(g=>[g.month,g.dreams.length]),[['2026-10',2],['2026-08',1]]);
});

test('every section renders honestly with an empty and a full archive',()=>{
 const {DreamDiary}=load('components/whimsy/dreams/DreamDiary'),{DreamDecoder}=load('components/whimsy/dreams/DreamDecoder'),{DreamLibrary}=load('components/whimsy/dreams/DreamLibrary'),{DreamAtlas}=load('components/whimsy/dreams/DreamAtlas');
 const noop=()=>{},full=Array.from({length:30},(_,i)=>dream({date:`2026-${String(7+i%4).padStart(2,'0')}-${String(1+i%27).padStart(2,'0')}`,symbolIds:['dream-house','dream-ocean'].slice(0,1+i%2),emotions:['emotion-calm'],classifications:[i%2?'Lucid':'Nightmare'],intensity:3}));
 const diary=dreams=>renderToStaticMarkup(createElement(DreamDiary,{dreams,symbols:d.dreamSymbols,today:'2026-11-04',seriesName:()=>'',symbolHref:()=>'#',onCapture:noop,onOpen:noop,onEdit:noop,onDelete:noop,onDecode:noop,view:'timeline',setView:noop,selectedDate:'',setSelectedDate:noop,calendarMonth:'2026-11',setCalendarMonth:noop}));
 assert.match(diary([]),/Your dream archive is waiting for its first strange little story/);
 const page=diary(full);assert.equal((page.match(/class="muse-dream-entry"/g)||[]).length,12,'12 dreams per page');assert.match(page,/1–12 of 30/);assert.match(page,/aria-label="Dream pages"/);
 const decoder=dream=>renderToStaticMarkup(createElement(DreamDecoder,{dream,dreams:full,symbols:d.dreamSymbols,meanings:[],symbolCounts:d.symbolDreamCounts(full),symbolHref:()=>'#',onChoose:noop,onEdit:noop,onOpen:noop,reflection:'',setReflection:noop,onSaveReflection:noop,busy:false}));
 assert.match(decoder(undefined),/Choose a dream\. Let’s see what followed you out of sleep\./);
 const studio=decoder(full[1]);assert.match(studio,/aria-pressed="true"/,'the first symbol is examined');assert.match(studio,/Open in the Encyclopedia/);
 assert.match(decoder({...full[0],symbolIds:[]}),/Every dream has its own language/);
 const library=renderToStaticMarkup(createElement(DreamLibrary,{symbols:d.dreamSymbols,categories:d.dreamCategories,dreamCounts:d.symbolDreamCounts(full),search:'',setSearch:noop,category:'',setCategory:noop,symbolHref:()=>'#',addSymbol:null,credit:null}));
 assert.equal((library.match(/class="muse-dream-result"/g)||[]).length,24);assert.match(library,/From your dreams/);assert.match(library,/aria-label="Filter by first letter"/);
 const atlas=dreams=>renderToStaticMarkup(createElement(DreamAtlas,{dreams,series:[],seriesOf:()=>'',symbolName:id=>id,symbolHref:()=>'#',today:'2026-11-04',onOpen:noop,onRemoveSeries:noop,newSeries:null}));
 assert.match(atlas([]),/A few nights of dreaming will help the patterns emerge/);
 const map=atlas(full);assert.match(map,/class="muse-dream-constellation"/);assert.match(map,/Often felt together|Emotional traces/);
 for(const html of [page,studio,library,map])assert.doesNotMatch(html,/NaN|undefined|Infinity/);
});

test('symbol pages read as one full entry; motion respects Quiet magic and reduced motion',()=>{
 const entry=read('components/whimsy/encyclopedia/DreamEncyclopediaEntry.tsx'),css=read('components/whimsy/Dreamscapes.css');
 assert.doesNotMatch(entry,/muse-encyclopedia-chapters/,'no chapter navigation');assert.match(entry,/chapters\.filter\(\(\[id\]\)=>hasContent\(id\)\)/);
 assert.match(css,/@media \(prefers-reduced-motion: reduce\)\{\.muse-dream-reveal/);assert.match(css,/:root\[data-magic="quiet"\] \.muse-dream-reveal\{animation:none\}/);
 assert.doesNotMatch(css,/confetti/i);
});

test('only globals.css goes through the Tailwind loader, so component CSS edits are never served stale',()=>{
 const config=read('next.config.ts');
 assert.match(config,/"globals\.css": \{\s*loaders: \["@tailwindcss\/turbopack"\]/);
 assert.doesNotMatch(config,/"\*\.css":/,'a blanket *.css rule made Turbopack serve stale component styles');
 const entry=read('components/whimsy/encyclopedia/DreamEncyclopediaEntry.tsx');
 assert.match(entry,/<span className="muse-encyclopedia-numeral" aria-hidden="true">[^<]*<\/span>\{' '\}<span>\{label\}<\/span>/,'numerals stay readable even without styles');
 assert.match(entry,/className="muse-encyclopedia-variation"/);
});
