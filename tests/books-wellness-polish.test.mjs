import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {load,root} from './helpers.mjs';
const read=file=>readFileSync(root+'/'+file,'utf8');

test('a choice menu squeezed beside its trigger on a phone uses the whole visible area instead',()=>{
 const {popoverBounds,placePopover,MIN_POPOVER_SPACE}=load('lib/popover-layout');
 assert.equal(MIN_POPOVER_SPACE,320);
 // Phone modal: the Genres trigger leaves ~250px below it; the list needs far more.
 const bounds=popoverBounds({left:0,top:0,right:390,bottom:844},{left:8,top:76,right:382,bottom:836});
 const placed=placePopover({left:24,right:366,top:520,bottom:560},bounds,300,900);
 assert.ok(placed.maxHeight>=MIN_POPOVER_SPACE,`got ${placed.maxHeight}`);assert.ok(placed.top>=bounds.top&&placed.top+Math.min(900,placed.maxHeight)<=bounds.bottom);
 const pop=read('components/GlassPopover.tsx');
 assert.match(pop,/matchMedia\?\.\('\(pointer: coarse\)'\)/,'touch screens do not open the keyboard by focusing search');
 assert.match(pop,/bounds\.right-bounds\.left<480\?/,'phones get a full-width menu');
 assert.match(read('components/GlassPopover.css'),/dialog \.muse-popover-panel \{ background: linear-gradient/,'menus in modals have a solid backing');
});

test('book details add a book to a series in place, without duplicates',()=>{
 const add=read('components/whimsy/AddToSeries.tsx'),shelf=read('components/whimsy/Bookshelf.tsx');
 assert.match(add,/useState<'pick'\|'new'>\(eligible\.length\?'pick':'new'\)/,'no series yet: start one');
 assert.match(add,/id:existing\?\.id\?\?crypto\.randomUUID\(\)/,'an existing entry is updated, never duplicated');
 assert.match(add,/s\.kind==='book'\|\|s\.kind==='mixed'/);
 assert.match(shelf,/<AddToSeries key=\{detail\.id\} book=\{detail\}/);
 assert.doesNotMatch(shelf,/<Link href="\/collections\?view=series">Add to a series<\/Link>/,'no longer just a link to the Series page');
 assert.match(shelf,/No reading logged yet/,'no zero-filled stat tiles for an unread book');
});

test('Wellness opens on Mood, Dayprint summary stays inside its card, Atlas overview has no gaps',()=>{
 assert.match(read('components/nourish/Nourish.tsx'),/query\.get\("view"\)==="plan"\?"plan":"mood"/);
 assert.match(read('components/mood/Mood.css'),/\.muse-dayprint-columns > \.muse-dayprint-summary \{ padding:var\(--space-4\)/);
 const atlas=read('components/whimsy/ReadingAtlas.tsx');
 assert.ok(atlas.indexOf('muse-atlas-overview-grid')<atlas.indexOf('<h4>Reading rhythm</h4>'),'rhythm spans the width after the charts and calendar');
 assert.match(atlas,/range==='month'\?monthLabel\(item\.start\.slice\(0,7\)\)/,'monthly rhythm rows name the month and year');
});
