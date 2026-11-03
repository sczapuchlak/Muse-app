import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {load,root} from './helpers.mjs';

const source=path=>readFileSync(`${root}/${path}`,'utf8');

test('Whimsy opens an overview with all five experience entrances',()=>{
 const page=source('app/(app)/whimsy/page.tsx');
 const overview=source('components/whimsy/WhimsyFoundation.tsx');
 const {experiences}=load('components/whimsy/WhimsyFoundation');
 assert.match(page,/<WhimsyFoundation\s*\/>/);
 assert.doesNotMatch(page,/redirect\(/);
 assert.deepEqual(experiences.map(item=>item.id),['observatory','tarot','dreamscapes','fortunes','side-quests']);
 assert.match(overview,/muse-whimsy-overview-intro/);
 assert.match(overview,/experiences\.map\(item=><MuseCard/);
});

test('Cosmic Profile opens from the Observatory header and leaves content navigation intact',()=>{
 const observatory=source('components/astrology/CosmicObservatory.tsx');
 const nav=observatory.match(/const sections=(\[[^;]+);/)?.[1]??'';
 assert.ok(nav.includes("['forecast','Horoscopes']"));
 assert.ok(!nav.includes("['profile'"));
 assert.match(observatory,/\?\?'forecast'/);
 assert.match(observatory,/<WhimsyExperienceHeader[^>]+><button[^>]+onClick=\{\(\)=>\{capture\(\);setProfileOpen\(true\);\}\}>/);
 assert.match(observatory,/<MuseModal id="cosmic-profile-settings"[^>]+onClose=\{\(\)=>setProfileOpen\(false\)\}/);
 assert.match(observatory,/onProfile=\{\(\)=>\{capture\(\);setProfileOpen\(true\);\}\}/);
 for(const setting of ['Default zodiac sign','Preferred forecast period','Forecast category','Show Cosmic Forecast on The Daily Edit','Birth details & calculation accuracy','Privacy & Data','Appearance'])assert.ok(observatory.includes(setting),setting);
});

test('all 78 Grimoire manuscripts resolve through the full-page entry route',()=>{
 const {grimoireEntries}=load('lib/whimsy/grimoire');
 const route=source('app/(app)/whimsy/tarot/[cardId]/page.tsx');
 const tarot=source('components/whimsy/TarotExperience.tsx');
 const entry=source('components/whimsy/encyclopedia/TarotGrimoireEntry.tsx');
 assert.equal(grimoireEntries.length,78);
 assert.match(route,/return <TarotGrimoireEntry entry=\{entry\}\/>/);
 assert.match(tarot,/href=\{grimoireEntryHref\(card\.id,\{from:'grimoire'/);
 assert.doesNotMatch(tarot,/selectedCard|cardDetailModal/);
 for(const chapter of ['story','symbolism','meanings','inYourLife','hiddenKnowledge','reflection'])assert.ok(source('lib/whimsy/grimoire.ts').includes(chapter),chapter);
 assert.match(entry,/grimoireChapters\.map/);
 assert.match(entry,/Related cards/);
});
