// Isolated browser regression: no authenticated app, database reads, or writes.
// Run with CHROME_BIN=/path/to/chrome node scripts/test-whimsy-layout.mjs [--production].
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load,root} from '../tests/helpers.mjs';

const production=process.argv.includes('--production');
const {MusePageHeader}=load('components/MusePageHeader');
const {WhimsyExperienceHeader}=load('components/whimsy/WhimsyExperienceHeader');
const {MuseCard}=load('components/MuseCard');
const {experiences}=load('components/whimsy/WhimsyFoundation');
const {themes}=load('lib/themes');
const files=production
 ? readdirSync(join(root,'.next/static/chunks')).filter(f=>f.endsWith('.css')).map(f=>`.next/static/chunks/${f}`)
 : ['app/globals.css','app/themes.css','components/MusePageHeader.css','components/MuseStarCluster.css','components/whimsy/WhimsyFoundation.css','components/whimsy/WhimsyExperienceHeader.css',...['WeeklySideQuests','TarotExperience','Dreamscapes','FortunesExperience','Bookshelf'].map(f=>`components/whimsy/${f}.css`)];
const css=files.map(f=>readFileSync(join(root,f),'utf8').replace(/^@import.*$/gm,'')).join('\n');
assert.ok(css.includes('.muse-page.muse-whimsy-page'), 'Shared Whimsy CSS must be present');
const fixtures=experiences.flatMap(experience=>['loading','error','empty','populated'].map(state=>({
 id:experience.id,state,
 html:renderToStaticMarkup(h('main',{className:`muse-page muse-whimsy-page muse-${experience.id==='side-quests'?'side-quests':experience.id}`},
  h(MusePageHeader,{title:'Whimsy'}),
  h('nav',{className:'muse-whimsy-navigation','aria-label':'Whimsy experiences'},...experiences.map(e=>h('a',{key:e.id,className:'muse-button button-ghost',href:`/whimsy/${e.id}`,'aria-current':e.id===experience.id?'page':undefined},e.name))),
  h(WhimsyExperienceHeader,{title:experience.id==='side-quests'?'The Weekly Draw':experience.name,subtitle:experience.description,context:experience.id==='side-quests'?'Week of November 2':undefined}),
  state==='empty'&&experience.id==='side-quests'
   ? h(MuseCard,{id:'quest-first-draw'},h('h2',{id:'quest-first-draw-title'},'Ready to see what this week might hold?'),h('button',{className:'muse-button'},'Draw six possibilities'))
   : h('section',{'data-state':state},state)))
})));
const directory=mkdtempSync(join(tmpdir(),'muse-whimsy-layout-'));
const browserTest=async ({css,fixtures,themes})=>{
 const frame=document.querySelector('iframe');
 const doc=frame.contentDocument;
 doc.head.innerHTML='<meta charset="utf-8"><style></style>';
 doc.querySelector('style').textContent=css;
 const failures=[];let checked=0;
 for(const width of [1440,1000,390])for(const theme of themes)for(const fixture of fixtures){
  frame.style.width=`${width}px`;
  doc.documentElement.dataset.theme=theme.id;
  doc.body.innerHTML=fixture.html;
  const main=doc.querySelector('main'),items=[...main.children];
  const boxes=items.map(e=>e.getBoundingClientRect());
  const columns=frame.contentWindow.getComputedStyle(main).gridTemplateColumns;
  const stacked=boxes.every((box,i)=>!i||box.top>=boxes[i-1].bottom-1);
  const fullWidth=boxes.every(box=>Math.abs(box.width-main.getBoundingClientRect().width)<1);
  const contained=main.getBoundingClientRect().right<=width&&doc.documentElement.scrollWidth<=width;
  if(!stacked||!fullWidth||!contained)failures.push({width,theme:theme.id,id:fixture.id,state:fixture.state,columns,stacked,fullWidth,contained});
  checked++;
 }
 document.querySelector('pre').textContent=JSON.stringify({checked,failures});
};
const file=join(directory,'test.html');
writeFileSync(file,`<!doctype html><meta charset="utf-8"><iframe style="height:1000px;border:0"></iframe><pre id="result"></pre><script>(${browserTest})(${JSON.stringify({css,fixtures,themes}).replace(/</g,'\\u003c')});</script>`);
const chrome=process.env.CHROME_BIN??(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'chromium');
const result=spawnSync(chrome,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check',`--user-data-dir=${join(directory,'profile')}`,'--dump-dom',pathToFileURL(file).href],{encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024});
assert.equal(result.status,0,result.error?.message??result.stderr);
const match=result.stdout.match(/<pre id="result">([^<]+)<\/pre>/);
assert.ok(match,'Browser must return layout measurements');
const report=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
assert.deepEqual(report.failures,[],JSON.stringify(report.failures.slice(0,5)));
console.log(`${production?'Production':'Source'} CSS: ${report.checked} layouts passed (5 experiences × 4 record states × 9 themes × 3 widths).`);
