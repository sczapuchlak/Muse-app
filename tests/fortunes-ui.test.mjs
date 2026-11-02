import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from './helpers.mjs';
const {curiosityPage,curiosityCategoryAccents,fortuneLibrary}=load('lib/whimsy/fortunes');
const {FortuneCollectionCard}=load('components/whimsy/FortuneCollectionCard');
const {FortuneResultActions}=load('components/whimsy/FortuneResultActions');
const noop=()=>{};
const item={id:'saved',assignmentId:'original',revision:1,userId:'owner',date:'2026-10-01',timeZone:'America/Los_Angeles',savedAt:'2026-11-02T01:30:00Z',category:'Scientific Oddities',question:'A private question',note:'An existing private note',snapshot:{title:'Historical title',body:'The exact text originally saved.\nAnother line.',sourceUrl:'https://science.nasa.gov/venus/venus-facts/'}};

test('cabinet reveals twelve real records, then the remaining catalog without mutation',()=>{
 const before=JSON.stringify(fortuneLibrary),all=fortuneLibrary.filter(row=>row.metadata.kind==='curiosity');
 const first=curiosityPage('',''),next=curiosityPage('','',24);
 assert.equal(first.items.length,12);assert.equal(first.total,all.length);
 assert.deepEqual(next.items,all);assert.deepEqual(next.items.slice(0,12),first.items);
 assert.equal(new Set(next.items.map(row=>row.id)).size,all.length);
 assert.equal(JSON.stringify(fortuneLibrary),before);
});
test('filtering happens before batching, so the thirteenth curiosity remains searchable',()=>{
 const last=fortuneLibrary.filter(row=>row.metadata.kind==='curiosity').at(-1);
 assert.equal(curiosityPage(last.title,'').items[0],last);
 assert.equal(curiosityPage('',last.metadata.category).items.some(row=>row.id===last.id),true);
 assert.equal(curiosityPage('no such curiosity','').total,0);
});
test('all eight published curiosity categories have distinct shared accents',()=>{
 const categories=new Set(fortuneLibrary.filter(row=>row.metadata.kind==='curiosity').map(row=>row.metadata.category));
 assert.equal(categories.size,8);assert.deepEqual(new Set(Object.keys(curiosityCategoryAccents)),categories);
 assert.equal(new Set(Object.values(curiosityCategoryAccents)).size,8);
});
test('keepsakes preserve snapshots, notes, question, safe source and the actual saved date',()=>{
 const before=structuredClone(item),content={title:'Changed catalog title',body:'Changed catalog body',metadata:{category:'Natural Wonders'}};
 const html=renderToStaticMarkup(h(FortuneCollectionCard,{item,kind:'curiosity',content,busy:false,onRemove:noop,onSaveNote:async()=>true}));
 const summary=html.slice(html.indexOf('<summary'),html.indexOf('</summary>'));
 assert.match(summary,/Historical title/);assert.match(summary,/Saved Nov 1, 2026/);assert.match(summary,/Cabinet of Curiosities/);
 assert.doesNotMatch(summary,/private note|private question/);assert.doesNotMatch(html,/Changed catalog/);
 assert.match(html,/An existing private note/);assert.match(html,/A private question/);assert.match(html,/Original source/);
 assert.match(html,/<details/);assert.doesNotMatch(html,/<details[^>]+open/);assert.doesNotMatch(html,/Reopen experience/);
 assert.match(html,/--item-accent:#00bcd4/);assert.deepEqual(item,before);
});
test('historical keepsakes remain expandable without an assignment and reject unsafe links',()=>{
 const html=renderToStaticMarkup(h(FortuneCollectionCard,{item:{...item,snapshot:{...item.snapshot,sourceUrl:'javascript:alert(1)'}},busy:true,onRemove:noop,onSaveNote:async()=>false}));
 assert.match(html,/Saved discovery/);assert.match(html,/Historical title/);assert.doesNotMatch(html,/javascript:|Original source/);
 assert.match(html,/disabled="">Add or edit note/);assert.match(html,/disabled="">Remove/);
});
test('result actions retain a distinct primary save and real disabled controls',()=>{
 const props={kind:'cookie',busy:false,saved:false,onAnother:noop,onSave:noop,onCopy:noop,onShare:noop};
 const html=renderToStaticMarkup(h(FortuneResultActions,props));
 assert.match(html,/class="muse-button button-primary muse-fortune-save"[^>]*>Save to Collection/);
 assert.match(html,/Another Cookie/);assert.match(html,/>Copy/);assert.match(html,/>Share/);
 const disabled=renderToStaticMarkup(h(FortuneResultActions,{...props,busy:true}));
 assert.equal((disabled.match(/disabled=""/g)||[]).length,4);
 const saved=renderToStaticMarkup(h(FortuneResultActions,{...props,saved:true}));
 assert.match(saved,/disabled="">Saved/);assert.equal((saved.match(/disabled=""/g)||[]).length,1);
});
