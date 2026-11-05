import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {load,root} from './helpers.mjs';

const source=path=>readFileSync(join(root,path),'utf8');

test('Modals size to their content unless an editor or picker asks to stay tall',()=>{
 const modal=source('components/MuseModal.tsx');
 assert.match(modal,/size\?:\s*['"]auto['"]\s*\|\s*['"]tall['"]/);assert.match(modal,/size\s*=\s*['"]auto['"]/);assert.match(modal,/data-size=\{size\}/);
 const css=source('components/MuseModal.css');
 assert.match(css,/\.muse-modal \{[^}]*height: auto/);assert.match(css,/\.muse-modal\[data-size="tall"\]/);
 for(const [file,id] of [['components/whimsy/Bookshelf.tsx','bookshelf-book-editor'],['components/collections/MediaLibrary.tsx','collection-media-editor'],['components/MoodCard.tsx','feeling-picker'],['components/whimsy/Dreamscapes.tsx','dream-picker']])
  assert.match(source(file),new RegExp(`id="${id}"[^>]*size="tall"|size="tall"[^>]*id="${id}"`),`${id} stays tall`);
});

test('Programmatically focused headings never draw a focus box around dialog titles',()=>{
 assert.match(source('app/globals.css'),/:is\(h1,h2,h3,h4,h5,legend\)\[tabindex="-1"\]:focus\s*\{\s*outline:\s*none/);
});

test('Week jumps are one centered control without range text',()=>{
 for(const file of ['components/rituals/Rituals.tsx','components/nourish/Nourish.tsx']){
  const text=source(file);assert.match(text,/className="[^"]*muse-week-jump/);assert.match(text,/This week/);
 }
 assert.match(source('app/globals.css'),/\.muse-week-jump/);
});

test('Money periods read as human date ranges',()=>{
 const {periodRangeLabel}=load('components/money/Money');
 assert.equal(periodRangeLabel('2026-11-01','2026-11-30'),'Nov 1 – 30, 2026');
 assert.match(periodRangeLabel('2026-11-15','2026-12-14'),/^Nov 15 – Dec 14, 2026$/);
 assert.match(periodRangeLabel('2026-12-15','2027-01-14'),/^Dec 15, 2026 – Jan 14, 2027$/);
});

test('Daily Edit stacks in the approved mobile order',()=>{
 const css=source('components/DailyEdit.css');
 const order=['muse-cosmic-forecast','muse-daily-bookshelf','schedule-card','priorities-card','muse-little-rituals','water-card','movement-card','meals-card','mood-card','day-pulse-card','muse-daily-reflection','day-in-three-card'];
 order.forEach((name,index)=>assert.match(css,new RegExp(`\\.${name}[^{]*\\{[^}]*order:\\s*${index+1}\\b`),name));
});

test('Planner keeps Task List beside Filters in one toolbar',()=>{
 assert.match(source('components/planner/PlannerUtilities.tsx'),/taskList\?:\s*ReactNode/);
 assert.match(source('components/planner/Planner.tsx'),/taskList=\{<div className="muse-planner-mobile-tabs"/);
});

test('Dream Diary and Tarot journal filters fold away on mobile and count what is active',()=>{
 const diary=source('components/whimsy/dreams/DreamDiary.tsx');
 assert.match(diary,/data-filters-open=\{filtersOpen\}/);assert.match(diary,/sort==='oldest'/);
 assert.match(source('components/whimsy/TarotExperience.tsx'),/muse-tarot-date-filter/);
});

test('Collections remember the chosen sort with the other view preferences',()=>{
 const text=source('components/collections/Collections.tsx');
 assert.match(text,/updated=\{\.\.\.preferences,sort:/);assert.match(text,/saveCollectionsPreferences\(client,collection\.userId,updated\)/);assert.match(text,/data-advanced=\{advancedOpen\}/);
});

test('Placement details never repeat the hero title or summary',()=>{
 assert.doesNotMatch(source('components/astrology/CosmicChart.tsx'),/in astrological tradition/);
 const observatory=source('components/astrology/CosmicObservatory.tsx');
 assert.match(observatory,/entry\?'Astrology Library':placement\?'Your birth chart'/);
});
