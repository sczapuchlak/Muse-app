import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load,root} from './helpers.mjs';
const {tarotCards,tarotDeck}=load('lib/whimsy/tarot');
const {TarotCardArt}=load('components/whimsy/TarotCardArt');
const {TarotStudy}=load('components/whimsy/TarotStudy');
const {WhimsyExperienceHeader}=load('components/whimsy/WhimsyExperienceHeader');
test('all 78 original artwork files are real JPEGs with direct authenticated-browser sources',()=>{
 const sources=JSON.parse(readFileSync(root+'/content/whimsy/rws-artwork.json','utf8'));
 assert.equal(tarotCards.length,78);assert.equal(tarotDeck.id,'rws1909');
 for(const card of tarotCards){const bytes=readFileSync(root+'/public'+card.artPath);assert.ok(bytes.length>10000);assert.equal(bytes.readUInt16BE(0),0xffd8);assert.equal(bytes.readUInt16BE(bytes.length-2),0xffd9);const source=sources.find(x=>x.cardId===card.id);assert.equal(source.license,'Public domain');assert.ok(source.source.startsWith('https://commons.wikimedia.org/wiki/File'));
 const html=renderToStaticMarkup(createElement(TarotCardArt,{card,small:true}));assert.ok(html.includes(`src="${card.artPath}"`));assert.ok(!html.includes('/_next/image'));assert.ok(!html.includes('Artwork could not load'));assert.match(html,/loading="lazy"/);}
});
test('Study has adjacent learning content, observes image readiness, and retains canonical definitions',()=>{
 const card=tarotCards[0],before=JSON.stringify(card);const html=renderToStaticMarkup(createElement(TarotStudy,{cards:tarotCards}));assert.match(html,/muse-tarot-study-artwork/);assert.match(html,/muse-tarot-study-learning/);assert.match(html,/artwork is loading/);assert.ok(!html.includes('Symbolism in the artwork'));assert.ok(!html.includes(card.upright));assert.match(html,/aria-label="Previous study card"/);assert.match(html,/aria-label="Next study card"/);assert.match(html,/Reveal meaning/);assert.match(html,/Another card/);assert.equal((html.match(new RegExp('<h3>'+card.name+'</h3>','g'))||[]).length,1);assert.equal(JSON.stringify(card),before);
});
test('filtered-empty Study is honest and a one-card pool disables navigation',()=>{
 const empty=renderToStaticMarkup(createElement(TarotStudy,{cards:[]}));assert.match(empty,/No study cards match/);assert.ok(!empty.includes('<img'));
 const one=renderToStaticMarkup(createElement(TarotStudy,{cards:[tarotCards[0]]}));assert.match(one,/aria-label="Previous study card" disabled=""/);assert.match(one,/aria-label="Next study card" disabled=""/);
});
test('context metadata belongs to the shared header side, separate from title and supporting copy',()=>{
 const html=renderToStaticMarkup(createElement(WhimsyExperienceHeader,{title:'The Weekly Draw',subtitle:'Six possibilities. Three adventures. One week.',context:'Week of November 2'},createElement('button',null,'Action')));assert.match(html,/muse-whimsy-experience-side/);assert.ok(html.indexOf('Week of November 2')>html.indexOf('muse-whimsy-experience-side'));assert.match(html,/muse-whimsy-experience-actions/);
});
test('all four Fortunes objects render artwork in both unopened and revealed states, with Oracle hold progress',()=>{
 const {FortuneObject}=load('components/whimsy/FortuneObject');
 for(const kind of ['cookie','oracle','prophecy','curiosity'])for(const revealed of [false,true]){const html=renderToStaticMarkup(createElement(FortuneObject,{kind,revealed,animating:false,disabled:false,onOpen:()=>{},label:`Open ${kind}`,charge:kind==='oracle'?.5:0}));assert.match(html,/<svg/);assert.match(html,/<path/);assert.ok(html.includes(`data-open="${revealed}"`));if(kind==='oracle'){assert.match(html,/data-charging="true"/);assert.match(html,/stroke-dasharray="0.5 1"/);}}
});
test('card faces: classic by default; six other styles restyle the same 1909 scan (#186)',()=>{
 const {CardFacePicker}=load('components/whimsy/tarot/CardFacePicker');const {cardFaceStyles}=load('components/whimsy/tarot/TarotCardFace');
 const card=tarotCards[0],plain=renderToStaticMarkup(createElement(TarotCardArt,{card}));
 assert.match(plain,/data-face="classic"/);assert.ok(plain.includes(`src="${card.artPath}"`));assert.ok(!plain.includes(' style"'));
 const ids=cardFaceStyles.map(s=>s.id);assert.deepEqual(ids,['classic','prism','parlour','boho','moonmilk','gilded','moonlit']);assert.equal(new Set(cardFaceStyles.map(s=>s.name)).size,ids.length);
 for(const face of ids.slice(1)){const html=renderToStaticMarkup(createElement(TarotCardArt,{card,face}));assert.match(html,new RegExp(`data-face="${face}"`));assert.ok(html.includes(`src="${card.artPath}"`),'every style uses the original public-domain scan');assert.match(html,/1909 illustration, .+ style"/);}
 const picker=renderToStaticMarkup(createElement(CardFacePicker));assert.equal((picker.match(/role="radio"/g)||[]).length,ids.length);assert.match(picker,/aria-checked="true"[^>]*title="The original/);assert.equal((picker.match(/data-face="[a-z]+"/g)||[]).length,ids.length,'each choice previews a real Fool card');
});
