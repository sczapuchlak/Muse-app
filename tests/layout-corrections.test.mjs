import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from './helpers.mjs';

test('emoji drafts enforce the cap, replace an explicit slot and leave the confirmed list unchanged',()=>{
 const {changeEmojiDraft}=load('lib/daily-expression');const saved=['🌱'],first=changeEmojiDraft(saved,'☕'),second=changeEmojiDraft(first,'🌙');
 assert.deepEqual(saved,['🌱']);assert.deepEqual(second,['🌱','☕','🌙']);assert.equal(changeEmojiDraft(second,'📚'),second);assert.deepEqual(changeEmojiDraft(second,'📚',1),['🌱','📚','🌙']);assert.deepEqual(changeEmojiDraft(second,'☕'),['🌱','🌙']);assert.equal(changeEmojiDraft(second,'📚',-1),second);
});

test('Dayprint summary keeps conflicting session scores attributable without averaging, copying or changing identity',()=>{
 const {Dayprint}=load('components/mood/Dayprint'),{emptyCheckIn}=load('lib/mood');const morning={...emptyCheckIn('2026-10-30','morning'),energy:9,stress:3,reflection:'A recorded morning.'},evening={...emptyCheckIn('2026-10-30','evening'),energy:2,overallDay:6},other={...emptyCheckIn('2026-10-31','morning'),stress:10};
 const before=structuredClone([morning,evening,other]);const html=renderToStaticMarkup(React.createElement(Dayprint,{date:'2026-10-30',expression:{intention:'Go gently',intentionEmoji:'🌱',dayInThree:['☕','🌙']},records:[evening,morning,other],influences:[],onOpen(){},onDelete(){},onDate(){}}));
 const header=html.slice(0,html.indexOf('</header>')),sessions=html.slice(html.indexOf('</header>'));
 for(const text of ['DAY IN THREE','Morning ratings','Evening ratings','9','2','Overall Day'])assert.ok(header.includes(text),text);
 assert.ok(!header.includes('10<small>'));assert.ok(!sessions.includes('<dt>Energy</dt>'));assert.ok(sessions.includes('A recorded morning.'));assert.ok(sessions.indexOf('Edit morning')<sessions.indexOf('Edit evening'));assert.deepEqual([morning,evening,other],before);
});
