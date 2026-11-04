import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {load,root} from './helpers.mjs';

test('newer unsupported emoji start with a visible fallback and retain their saved Unicode value',()=>{
 const {EmojiGlyph}=load('components/EmojiPicker');
 const catalog=JSON.parse(readFileSync(root+'/node_modules/emojibase-data/en/compact.json','utf8'));
 const entries=catalog.flatMap(item=>[item,...(item.skins??[])]);
 for(const [value,label] of [['🫫','cracking face'],['🫩','face with bags under eyes'],['🫪','distorted face']]){
  assert.equal(entries.find(item=>item.unicode===value)?.label,label);
  const html=renderToStaticMarkup(h(EmojiGlyph,{value}));assert.match(html,/muse-emoji-fallback/);assert.match(html,/✦/);assert.ok(!html.includes(value));
 }
 assert.equal(entries.filter(item=>item.unicode.includes('\uFFFD')).length,0);
 const savedView=readFileSync(root+'/components/DayInThree.tsx','utf8');assert.match(savedView,/<EmojiGlyph value=\{emoji\}/);
});
