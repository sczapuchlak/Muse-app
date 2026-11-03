import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const base='content/whimsy/grimoire/source',files=readdirSync(base).filter(name=>name.endsWith('-DRAFT.json')).sort();
assert.equal(files.length,7,'seven original source batches');
const batches=files.map(name=>({name,body:JSON.parse(readFileSync(join(base,name),'utf8'))}));
const canonical=JSON.parse(readFileSync('content/whimsy/tarot-cards.json','utf8'));
const artwork=JSON.parse(readFileSync('content/whimsy/rws-artwork.json','utf8'));
const byId=new Map(canonical.map(card=>[card.id,card])),byName=new Map(canonical.map(card=>[card.name,card]));
const artIds=new Set(artwork.map(item=>item.cardId)),mapped=new Set(),sourceIds=new Set(),problems=[];
const required=['story','symbolism','meanings','inYourLife','hiddenKnowledge','reflection'];
const names=['The Story','Symbolism','Meanings','In Your Life','Hidden Knowledge','Reflection'];
for(const {name,body} of batches){assert.ok(Array.isArray(body.cards),`${name} cards array`);
 for(const card of body.cards){const id=card.id,canonicalCard=byId.get(id)??byName.get(card.name);if(sourceIds.has(id))problems.push(`Duplicate source ID ${id}`);sourceIds.add(id);
  if(!canonicalCard||canonicalCard.name!==card.name)problems.push(`Unmapped card ${id} / ${card.name}`);
  else{if(mapped.has(canonicalCard.id))problems.push(`Duplicate canonical card ${canonicalCard.id}`);mapped.add(canonicalCard.id);if(!artIds.has(canonicalCard.id))problems.push(`No artwork mapping for ${canonicalCard.id}`);}
  if(card.editorialStatus!=='draft')problems.push(`Unexpected publication status ${id}: ${card.editorialStatus}`);
  const chapters=Array.isArray(card.chapters)?Object.fromEntries(card.chapters.map(entry=>[names.indexOf(entry.title),entry])):card.chapters;
  for(let index=0;index<required.length;index++){const value=Array.isArray(card.chapters)?chapters[index]:chapters?.[required[index]]??(required[index]==='inYourLife'?chapters?.life:null);if(!value||typeof value==='string'&&!value.trim())problems.push(`Missing chapter ${id}/${required[index]}`);}
  const meanings=Array.isArray(card.chapters)?card.chapters[2]:card.chapters.meanings;
  if(typeof meanings==='object'&&(!meanings.upright||!meanings.reversed))problems.push(`Missing orientation ${id}`);
  if(!Array.isArray(card.sources)||!card.sources.length||card.sources.some(source=>!source.url?.startsWith('https://')))problems.push(`Missing/invalid source ${id}`);
 }
}
for(const card of canonical)if(!mapped.has(card.id))problems.push(`Missing canonical card ${card.id}`);
assert.equal(mapped.size,78,'all 78 canonical cards are mapped');assert.deepEqual(problems,[]);
console.log(JSON.stringify({sourceFiles:files.length,sourceCards:sourceIds.size,canonicalCards:mapped.size,provisionalSwordsIds:batches.find(row=>row.name.startsWith('swords'))?.body.cards.filter(card=>!byId.has(card.id)).map(card=>({source:card.id,canonical:byName.get(card.name).id})),editorialStatus:'draft',issues:problems},null,2));
