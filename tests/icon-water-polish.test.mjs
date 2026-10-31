import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import React from 'react';
import {renderWithWellness as renderToStaticMarkup} from './wellness-render.mjs';
import {load,root} from './helpers.mjs';

const {MuseIcon}=load('components/MuseIcon'),{MuseStarCluster}=load('components/MuseStarCluster'),{MUSE_STAR_PATH}=load('components/MuseStar'),{AchievementStar}=load('components/AchievementStar');
const render=(component,props)=>renderToStaticMarkup(React.createElement(component,props));

test('repeated prismatic icons and signature stars own unique paint servers without changing icon geometry or size',()=>{
 const html=renderToStaticMarkup(React.createElement('div',null,...Array.from({length:18},(_,i)=>React.createElement(MuseIcon,{key:i,name:i%2?'water':'calendar',size:20,treatment:'prismatic'})),React.createElement(MuseStarCluster)));
 const ids=[...html.matchAll(/<linearGradient id="([^"]+)"/g)].map((match)=>match[1]);assert.equal(ids.length,21);assert.equal(new Set(ids).size,21);
 const references=[...html.matchAll(/(?:stroke|fill)="url\(#([^\)]+)\)"/g)].map((match)=>match[1]);assert.equal(references.length,21);for(const id of references)assert.ok(ids.includes(id));
 assert.equal((html.match(/stroke-width="1.6"/g)??[]).length,18);assert.equal((html.match(/viewBox="0 0 24 24"/g)??[]).length,18);assert.equal((html.match(/aria-hidden="true"/g)??[]).length,22);
 const paths=(markup)=>[...markup.matchAll(/<path d="([^"]+)"/g)].map((match)=>match[1]);assert.deepEqual(paths(render(MuseIcon,{name:'water'})),paths(render(MuseIcon,{name:'water',treatment:'prismatic'})));
 const utility=render(MuseIcon,{name:'trash',size:16});assert.ok(utility.includes('stroke="currentColor"'));assert.ok(!utility.includes('linearGradient'));assert.ok(!html.includes('tabindex='));
});

test('the three-star identity keeps official geometry and three coordinated tones; earned gold remains independent',()=>{
 const html=render(MuseStarCluster,{});assert.equal((html.split(MUSE_STAR_PATH).length-1),3);for(const tone of ['primary','secondary','tertiary'])assert.ok(html.includes(`data-prism-tone="${tone}"`));
 const earned=render(AchievementStar,{});assert.ok(earned.includes(MUSE_STAR_PATH));assert.ok(earned.includes('var(--achievement-gold)'));assert.ok(!earned.includes('--icon-gradient'));
});

test('standalone heading icons keep unique gradient paint without decorative tiles or button semantics',()=>{
 const {GlassIcon}=load('components/GlassIcon'),{CardHeading}=load('components/CardHeading');
 const legacy=render(GlassIcon,{name:'water'});assert.ok(legacy.startsWith('<svg'));assert.ok(legacy.includes('linearGradient'));assert.ok(!legacy.includes('<span'));assert.ok(!legacy.includes('<button'));assert.ok(!legacy.includes('tabindex='));
 for(const icon of ['water','movement','meals','mood','money','notes','insights']){
  const html=render(CardHeading,{id:icon,title:icon,icon});assert.ok(html.includes('linearGradient'));assert.ok(!html.includes('muse-glass-icon'));assert.ok(!html.includes('<button'));assert.ok(html.includes('width="22" height="22"'));
 }
 assert.ok(!render(MuseIcon,{name:'search',size:16}).includes('linearGradient'));
});

test('every existing theme supplies a distinct sharp icon palette with readable chromatic stops',()=>{
 const {themes}=load('lib/themes'),css=readFileSync(resolve(root,'app/themes.css'),'utf8');
 const luminance=(hex)=>{const a=[1,3,5].map((i)=>parseInt(hex.slice(i,i+2),16)/255).map((v)=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722;};
 const signatures=new Set();
 for(const theme of themes){const block=css.split(`:root[data-theme="${theme.id}"] {`)[1]?.split('}')[0];assert.ok(block,theme.id);const tokens=Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match)=>[match[1],match[2]]));
  for(const role of ['gradient-start','gradient-middle','gradient-end','gradient-highlight','edge'])assert.match(tokens[`--icon-${role}`],/^#[\da-f]{6}$/i);
  signatures.add(['start','middle','end'].map((key)=>tokens[`--icon-gradient-${key}`]).join('/'));
  for(const key of ['start','middle','end']){const a=luminance(tokens[`--icon-gradient-${key}`]),b=luminance(tokens['--background']);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=3,`${theme.id} ${key}`);}
 }assert.equal(signatures.size,9);
});

test('goal observations celebrate true threshold crossings once, rearm Water below goal and keep other milestone guards',()=>{
 const {observeAchievement}=load('lib/achievement');let state={observed:true,awarded:false};
 const step=(total,goal,repeat=true)=>{const result=observeAchievement(state,goal>0&&total>=goal,true,repeat);state=result;return result.celebrate;};
 assert.equal(step(72,100),false);assert.equal(step(100,100),true);assert.equal(step(108,100),false);assert.equal(step(108,100),false);
 assert.equal(step(90,100),false);assert.equal(step(108,100),true);
 assert.equal(step(108,120),false);assert.equal(step(108,105),true);assert.equal(step(108,0),false);
 let loaded=observeAchievement({observed:false,awarded:false},true,true,true);assert.equal(loaded.celebrate,false);assert.equal(observeAchievement(loaded,true,true,true).celebrate,false);
 assert.equal(observeAchievement({observed:true,awarded:true},true,true,true).celebrate,false,'already complete mount is calm');
 let once=observeAchievement({observed:true,awarded:false},true);assert.equal(once.celebrate,true);once=observeAchievement(once,false);assert.equal(observeAchievement(once,true).celebrate,false,'other milestones do not acquire Water reentry behavior');
});

test('Water reserves its progress endpoint, retains true amounts and loads completed history without celebration',()=>{
 const {WaterCard}=load('components/WaterCard');
 for(const total of [72,100,108]){const html=render(WaterCard,{initialDay:{date:'2026-10-30',total},settings:{unit:'oz',goal:100,quickAdds:[12,24,32,40]}});assert.ok(html.includes('water-achievement-finish'));assert.ok(html.indexOf('water-achievement-finish')>html.indexOf('role="progressbar"'));assert.ok(html.indexOf('water-achievement-finish')<html.indexOf('water-additions'));assert.ok(!html.slice(0,html.indexOf('water-progress-goal')).includes('muse-achievement-star'));
  if(total>=100){assert.ok(html.includes('data-celebrating="false"'));assert.ok(html.includes(`aria-valuetext="${total} of 100 oz, goal reached"`));assert.ok(html.includes('--water-progress:100%'));}else assert.ok(!html.includes('muse-achievement-star'));
 }
});
