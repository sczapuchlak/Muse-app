import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {root} from './helpers.mjs';

const read=path=>readFileSync(join(root,path),'utf8');
const walk=(dir,ext)=>readdirSync(join(root,dir)).flatMap(name=>{const path=`${dir}/${name}`;return statSync(join(root,path)).isDirectory()?walk(path,ext):path.endsWith(ext)?[path]:[];});

test('typography and design language load once, app-wide, in order',()=>{
 const layout=read('app/layout.tsx');
 assert.match(layout,/Fraunces\(\{[\s\S]*axes: \["opsz", "SOFT", "WONK"\]/,'Fraunces loads all three axes');
 assert.match(layout,/Plus_Jakarta_Sans\(\{[\s\S]*variable: "--font-interface"/,'Plus Jakarta Sans fills the interface slot');
 assert.ok(layout.indexOf('./typography.css')<layout.indexOf('./design-language.css'),'roles load before patterns');
 const type=read('app/typography.css');
 assert.match(type,/--editorial-axes:"SOFT" 100,"WONK" 0/);
 for(const role of ['type-display','type-editorial','type-quote','type-reading','type-title','type-heading','type-body','type-meta','type-numeric'])assert.match(type,new RegExp(`\\.${role}\\{`),role);
});

test('module stylesheets never declare their own serif family, style weight or Georgia',()=>{
 const offenders=walk('components','.css').concat(walk('app','.css').filter(p=>!p.endsWith('typography.css'))).filter(path=>/Georgia|var\(--font-serif|var\(--dream-serif\)[^;]*serif/.test(read(path).replace(/--dream-serif:var\(--font-editorial\)/,'')));
 assert.deepEqual(offenders,[],'serif decisions live in app/typography.css');
});

test('shared patterns exist once and the reference module uses them',()=>{
 const dl=read('app/design-language.css');
 for(const pattern of ['muse-kicker','muse-section-intro','muse-hero','muse-panel','muse-accent-note','muse-tone-pill','muse-chip-row','muse-segmented','muse-search','muse-empty-state','muse-stat-grid'])assert.match(dl,new RegExp(`\\.${pattern}\\b`),pattern);
 assert.doesNotMatch(dl,/#[0-9a-fA-F]{3,8}\b/,'patterns use theme tokens only');
 const dreams=read('components/whimsy/Dreamscapes.css');
 for(const base of [/\n\.muse-dream-search\{/,/\n\.muse-dream-segmented\{/,/\n\.muse-dream-empty-state\{/])assert.doesNotMatch(dreams,base,'Dreamscapes no longer duplicates shared base rules');
 assert.match(read('components/whimsy/dreams/parts.tsx'),/<MuseSearch \{\.\.\.props\} className="muse-dream-search"\/>/);
});

test('modules adopt the shared search, switchers, chips and empty states',()=>{
 const uses=(file,pattern)=>assert.match(read(file),pattern,file);
 for(const file of ['components/whimsy/TarotExperience.tsx','components/collections/Collections.tsx','components/collections/MediaLibrary.tsx','components/astrology/AstrologyLibrary.tsx','components/astrology/CosmicJournal.tsx','components/money/Money.tsx','components/money/MoneyRecurring.tsx','components/nourish/SavedMealLibrary.tsx','components/whimsy/FortunesExperience.tsx'])uses(file,/<MuseSearch /);
 uses('components/whimsy/TarotExperience.tsx',/className="muse-segmented muse-tarot-journal-view"/);
 uses('components/whimsy/TarotExperience.tsx',/className="muse-chip-row muse-tarot-filters"/);
 uses('components/astrology/CosmicObservatory.tsx',/className="muse-segmented muse-cosmic-period-selector"/);
 uses('components/books/BooksNav.tsx',/className="muse-page-tabs muse-books-nav"/);
 for(const file of ['components/collections/Collections.tsx','components/whimsy/Bookshelf.tsx','components/astrology/CosmicChart.tsx'])uses(file,/className="muse-empty-state [^"]*" data-variant="editorial"/);
 for(const file of ['components/notes/NotesList.tsx','components/nourish/WellnessGoals.tsx'])uses(file,/className="muse-empty-state [^"]*" data-variant="quiet"/);
});

test('Tarot follows the theme and keeps the artwork as the focal point',()=>{
 const css=read('components/whimsy/TarotExperience.css').replace(/\/\*[\s\S]*?\*\//g,'');
 assert.doesNotMatch(css,/#181623|rgba\(255,\s*255,\s*255/,'no fixed dark dialog or white-on-dark literals');
 assert.match(css,/\.muse-tarot-ritual::before\{content:none\}/,'no nested frame around the reading');
 assert.doesNotMatch(css,/data-arcana=(major|minor)\]\s*\{\s*border-top:3px/,'no heavy coloured tile borders');
 assert.match(read('components/whimsy/TarotExperience.tsx'),/<MusePageHeader title="Tarot" description=/,'the one page title names the module, not the first tab');
});

test('Fortune & Fun pages show the module header before their tabs',()=>{
 for(const file of ['components/whimsy/FortunesExperience.tsx','components/whimsy/WeeklySideQuests.tsx'])assert.match(read(file),/<\/WhimsyExperienceHeader><FortuneFunNavigation /,file);
});

test('temporary typography tools are gone',()=>{
 assert.equal(existsSync(join(root,'app/typography-playground')),false);
 assert.equal(existsSync(join(root,'components/typography')),false);
 assert.doesNotMatch(read('lib/auth/paths.ts'),/typography-playground/,'no unauthenticated exception remains');
});
