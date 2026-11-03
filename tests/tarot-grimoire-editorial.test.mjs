import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {load,root} from './helpers.mjs';
const {grimoireEntries,grimoireById,grimoireChapters,grimoireEntryHref,grimoireSearchText}=load('lib/whimsy/grimoire');
const {tarotCards}=load('lib/whimsy/tarot');
const sourceFiles=['major-batch-01','major-batch-02','major-batch-03','wands-batch-01','cups-batch-01','swords-batch-01','pentacles-batch-01'].map(name=>`content/whimsy/grimoire/source/${name}-DRAFT.json`);
const rawCards=sourceFiles.flatMap(file=>JSON.parse(readFileSync(`${root}/${file}`,'utf8')).cards);
const chapterIds=grimoireChapters.map(chapter=>chapter.id);
test('78 original draft manuscripts map one-to-one to immutable Muse Tarot IDs and artwork',()=>{
 assert.equal(grimoireEntries.length,78);
 assert.equal(new Set(grimoireEntries.map(entry=>entry.id)).size,78);
 assert.deepEqual(new Set(grimoireEntries.map(entry=>entry.id)),new Set(tarotCards.map(card=>card.id)));
 for(const entry of grimoireEntries){const card=tarotCards.find(card=>card.id===entry.id);assert.equal(entry.name,card.name);assert.equal(entry.artPath,card.artPath);assert.ok(existsSync(`${root}/public${entry.artPath}`));assert.equal(entry.editorialStatus,'draft');assert.deepEqual(entry.raw,rawCards.find(raw=>raw.id===entry.sourceId));assert.deepEqual(Object.keys(entry.chapters),chapterIds);for(const id of chapterIds)assert.ok(entry.chapters[id]);assert.equal(grimoireById(entry.id),entry);assert.ok(grimoireSearchText(entry).includes(entry.name.toLowerCase()));}
});
test('provisional Swords court IDs map to canonical reading and artwork IDs without changing source',()=>{
 for(const [rank,number] of [['page','11'],['knight','12'],['queen','13'],['king','14']]){const entry=grimoireById(`tarot-swords-${number}`);assert.equal(entry.sourceId,`tarot-swords-${rank}`);assert.equal(entry.raw.id,entry.sourceId);}
});
test('source chapter values are retained verbatim through every editorial format',()=>{
 const titles=['The Story','Symbolism','Meanings','In Your Life','Hidden Knowledge','Reflection'];
 for(const entry of grimoireEntries){const original=entry.raw.chapters;for(let index=0;index<chapterIds.length;index++){const id=chapterIds[index],expected=Array.isArray(original)?original.find(chapter=>chapter.title===titles[index]):original[id]??(id==='inYourLife'?original.life:undefined);assert.deepEqual(entry.chapters[id],expected,`${entry.name}: ${id}`);}}
});
test('full-page routes and reading links use canonical IDs and return context',()=>{
 for(const file of ['app/(app)/whimsy/tarot/[cardId]/page.tsx','app/(app)/whimsy/dreamscapes/encyclopedia/[symbolId]/page.tsx'])assert.ok(existsSync(`${root}/${file}`));
 const href=grimoireEntryHref('tarot-swords-11',{from:'journal',reading:'12345678-1234-1234-1234-123456789abc',orientation:'reversed'});assert.equal(href,'/whimsy/tarot/tarot-swords-11?from=journal&orientation=reversed&reading=12345678-1234-1234-1234-123456789abc');
 const tarot=readFileSync(`${root}/components/whimsy/TarotExperience.tsx`,'utf8'),dream=readFileSync(`${root}/components/whimsy/Dreamscapes.tsx`,'utf8');assert.match(tarot,/Explore this card/);assert.match(tarot,/muse\.tarot\.table\.draft\.v1/);assert.doesNotMatch(tarot,/selectedCard&&tab==='grimoire'/);assert.match(dream,/symbolHref\(item\.id,'encyclopedia'\)/);assert.doesNotMatch(dream,/id="dream-symbol"/);
});
const {parseGrimoireReflection}=load('lib/whimsy/grimoire-reflection');
test('all 78 source reflections expose separate questions and retain ritual and closing text',()=>{
 for(const entry of grimoireEntries){const parsed=parseGrimoireReflection(entry.chapters.reflection);assert.ok(parsed,entry.id);assert.equal(parsed.upright.length,3,entry.id);assert.equal(parsed.reversed.length,3,entry.id);assert.ok(parsed.ritual.trim(),entry.id);const source=JSON.stringify(entry.chapters.reflection);for(const text of [...parsed.upright,...parsed.reversed,parsed.ritual,parsed.misconception,parsed.closing].filter(Boolean)){assert.ok(source.includes(text.replace(/^\*|\*$/g,'')),`${entry.id}: ${text}`);}}
});
test('Swords overlay fills only the documented display gaps with canonical, reviewable links',()=>{
 const swords=grimoireEntries.filter(entry=>entry.section==='Swords');assert.equal(swords.length,14);
 for(const entry of swords){const overlay=entry.editorialOverlay;assert.ok(overlay,entry.id);assert.equal(overlay.id,entry.id);assert.equal(overlay.reviewStatus,'draft-awaiting-creative-review');assert.ok(overlay.uprightKeywords.length>=3&&overlay.reversedKeywords.length>=3);assert.ok(grimoireSearchText(entry).includes(overlay.uprightKeywords[0]));for(const related of overlay.relatedCards){assert.ok(grimoireById(related.id),`${entry.id} → ${related.id}`);assert.ok(related.rationale.length>25);assert.ok(['thematic','source-cited'].includes(related.kind));}assert.equal(entry.raw.id,entry.sourceId);}
 for(const entry of grimoireEntries.filter(entry=>entry.section!=='Swords'))assert.equal(entry.editorialOverlay,undefined);
 const king=grimoireById('tarot-swords-14');assert.ok(king.editorialOverlay.relatedCards.some(link=>link.id==='tarot-major-11'&&link.kind==='source-cited'));
});
