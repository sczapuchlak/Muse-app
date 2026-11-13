import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {load,root} from './helpers.mjs';
const {interpretCard,readSpread,excerpt}=load('lib/whimsy/tarot-interpretation'),{tarotCards,tarotSpreads}=load('lib/whimsy/tarot');

test('every card reads in both orientations and every named seat, from existing content',()=>{
 const seats=[...new Set(tarotSpreads.flatMap(s=>s.positions))];
 for(const card of tarotCards)for(const orientation of ['upright','reversed']){
  const r=interpretCard(card.id,orientation,'Advice');
  assert.equal(r.essence,orientation==='upright'?card.upright:card.reversed,card.id);
  assert.ok(r.keywords.length&&r.questions.length&&r.positionLine&&r.positionAngle&&r.orientationNote&&r.symbolism,card.id);
  assert.notEqual(r.summary,r.essence,`${card.id} summary repeats the essence`);
  assert.doesNotMatch(r.summary,/central resource or skill/,'placeholder manuscript lines are not shown');
  assert.doesNotMatch(r.everyday,/^#|\*\*/,'excerpts carry no Markdown');
  for(const text of [r.positionLine,r.orientationNote])assert.doesNotMatch(text,/\byou will\b|\bwill happen\b|destined|guarantee/i,'no predictions');
 }
 for(const seat of seats)assert.match(interpretCard('tarot-major-00','upright',seat).positionLine,/The Fool/);
 assert.equal(interpretCard('nope','upright','Today'),null);
});

test('a spread is read as a whole from what the cards actually share',()=>{
 const id=name=>tarotCards.find(c=>c.name===name).id;
 const spread=readSpread([{cardId:id('Five of Cups'),orientation:'upright'},{cardId:id('Five of Wands'),orientation:'reversed'},{cardId:id('The Tower'),orientation:'upright'}],['Situation','Challenge','Advice'],'What now?');
 const titles=spread.threads.map(t=>t.title);
 assert.ok(titles.includes('2 Fives')&&titles.includes('One Major Arcana')&&titles.includes('One card reversed'),titles.join('|'));
 assert.match(spread.sentence,/Five of Cups names the matter, Five of Wands \(reversed\) names the friction, and The Tower offers a way/);
 assert.ok(spread.prompts.length>=4&&spread.prompts.length<=6&&spread.prompts.some(p=>/your question/.test(p)));
 const one=readSpread([{cardId:id('The Star'),orientation:'upright'}],['Today']);
 assert.equal(one.sentence,'');assert.deepEqual(one.threads,[]);
 assert.deepEqual(readSpread([],[]).prompts,[]);
});

test('excerpts end on whole sentences',()=>{assert.equal(excerpt('One. Two is longer. Three.',12),'One.');assert.equal(excerpt('Short.',50),'Short.');});

test('the desk keeps cards, meaning and journal on one screen without touching the draft',()=>{
 const desk=readFileSync(`${root}/components/whimsy/tarot/InterpretationDesk.tsx`,'utf8'),table=readFileSync(`${root}/components/whimsy/TarotExperience.tsx`,'utf8');
 assert.match(desk,/role="tablist"/);assert.match(desk,/What might this mean for me\?/);assert.match(desk,/onReflection\(event\.target\.value\)/);
 assert.match(table,/<InterpretationDesk [^>]*reflection=\{reflection\} onReflection=\{setReflection\}/,'the draft lives with the table, so switching cards cannot reset it');
 assert.doesNotMatch(desk,/useState\(reflection|setReflection\(''\)/);
});
