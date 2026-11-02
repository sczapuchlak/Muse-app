// Local Chrome fixtures only: never connect to an account or write private records.
// CHROME_BIN=/path/to/chrome node scripts/test-fortunes-ui.mjs [--production]
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,readdirSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load,root} from '../tests/helpers.mjs';

const production=process.argv.includes('--production');
const {themes}=load('lib/themes');
const {accentStyle}=load('lib/appearance-values');
const {curiosityPage,curiosityCategoryAccents}=load('lib/whimsy/fortunes');
const {FortuneCollectionCard}=load('components/whimsy/FortuneCollectionCard');
const {FortuneResultActions}=load('components/whimsy/FortuneResultActions');
const {ColorLabel}=load('components/ColorLabel');
const noop=()=>{};
const curiosities=curiosityPage('','').items;
const files=production?readdirSync(join(root,'.next/static/chunks')).filter(f=>f.endsWith('.css')).map(f=>`.next/static/chunks/${f}`):['app/globals.css','app/themes.css','app/materials.css','app/interactions.css','components/PrismaticSvg.css','components/MuseControls.css','components/SaveIndicator.css','components/whimsy/WhimsyExperienceHeader.css','components/whimsy/FortunesExperience.css'];
const css=files.map(f=>readFileSync(join(root,f),'utf8').replace(/^@import.*$/gm,'')).join('\n');
const actions=kind=>h(FortuneResultActions,{kind,busy:false,saved:false,onAnother:noop,onSave:noop,onCopy:noop,onShare:noop});
const markup=renderToStaticMarkup(h('main',{className:'muse-page muse-whimsy-page muse-fortunes'},
 ...['cookie','oracle'].map(kind=>h('section',{key:kind,className:'muse-fortune-stage','data-kind':kind},h('article',{className:'muse-fortune-reveal'},h('h4',null,'A little mystery'),h('p',null,'A saved surprise to keep.'),actions(kind)))),
 h('section',{className:'muse-fortune-stage','data-kind':'curiosity'},h('div',{className:'muse-fortune-cabinet'},...curiosities.map(item=>h('button',{key:item.id,type:'button',className:'muse-fortune-drawer',style:accentStyle(curiosityCategoryAccents[item.metadata.category]),'aria-pressed':false},h('span',{className:'small-label'},h(ColorLabel,{color:curiosityCategoryAccents[item.metadata.category]},item.metadata.category)),h('strong',null,item.title),h('span',null,'Open drawer →'))))),
 h('section',{className:'muse-fortune-collection'},h('h3',null,'Your Collection'),h('div',{className:'muse-fortune-collection-grid'},...curiosities.slice(0,8).map((content,index)=>h(FortuneCollectionCard,{key:index,item:{id:String(index),assignmentId:String(index),revision:1,userId:'fixture',date:'2026-11-01',timeZone:'America/Los_Angeles',savedAt:'2026-11-02T01:30:00Z',category:content.metadata.category,note:'A private saved note.',snapshot:{title:content.title,body:content.body,sourceUrl:content.sources[0].url}},kind:'curiosity',content,busy:false,onRemove:noop,onSaveNote:async()=>true}))))));
const directory=mkdtempSync(join(tmpdir(),'muse-fortunes-ui-'));
const file=join(directory,'fixture.html');
// Measure settled interaction colors rather than an arbitrary transition frame.
writeFileSync(file,`<!doctype html><meta charset="utf-8"><style>:root{--font-interface:Arial}${css}\n*,*::before,*::after{transition:none!important;animation:none!important}</style>${markup}`);
const chrome=process.env.CHROME_BIN??(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'chromium');
const processHandle=spawn(chrome,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',`--user-data-dir=${join(directory,'profile')}`],{stdio:'ignore'});
let socket;
try{
 const portFile=join(directory,'profile/DevToolsActivePort');
 for(let attempt=0;!existsSync(portFile)&&attempt<100;attempt++)await new Promise(resolve=>setTimeout(resolve,100));
 assert.ok(existsSync(portFile),'Chrome must start with an isolated debugging port');
 const port=readFileSync(portFile,'utf8').split('\n')[0];
 const targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(response=>response.json());
 socket=new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let requestId=0;const pending=new Map(),events=new Map();
 socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);if(message.error)reject(Error(JSON.stringify(message.error)));else resolve(message.result);}else events.get(message.method)?.(message.params);};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++requestId;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async (fn,args)=>{const result=await send('Runtime.evaluate',{expression:`(${fn})(${JSON.stringify(args)})`,returnByValue:true,awaitPromise:true});assert.ok(!result.exceptionDetails,JSON.stringify(result.exceptionDetails));return result.result.value;};
 for(const domain of ['Page','Runtime','DOM','CSS'])await send(`${domain}.enable`);
 const loaded=new Promise(resolve=>events.set('Page.loadEventFired',resolve));
 await send('Page.navigate',{url:pathToFileURL(file).href});await loaded;
 let layouts=0,contrasts=0;let minimum=Infinity;
 const measure=({theme,material,width})=>{
  document.documentElement.dataset.theme=theme;document.documentElement.dataset.material=material;
  const grid=document.querySelector('.muse-fortune-collection-grid'),cards=[...grid.children];
  const columns=getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  const wanted=width===1440?3:width===800?2:1;
  return {columns,wanted,overflow:document.documentElement.scrollWidth>width,compact:cards.every(card=>card.getBoundingClientRect().height<340),cabinetCount:document.querySelectorAll('.muse-fortune-drawer').length};
 };
 const contrast=()=>{
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d');canvas.width=canvas.height=1;
  const rgb=color=>{context.clearRect(0,0,1,1);context.fillStyle=color;context.fillRect(0,0,1,1);return [...context.getImageData(0,0,1,1).data].slice(0,3);};
  const luminance=color=>rgb(color).map(c=>{const v=c/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  const buttons=[...document.querySelectorAll('[data-kind=cookie] .muse-fortune-actions button')];
  const results=buttons.filter(button=>!button.classList.contains('muse-fortune-save')).map(button=>{const s=getComputedStyle(button);return {label:button.textContent,ratio:ratio(s.color,s.backgroundColor),outline:s.outlineStyle};});
  const save=buttons.find(button=>button.classList.contains('muse-fortune-save')),style=getComputedStyle(save),probe=document.createElement('span');save.append(probe);
  for(const stop of ['var(--action-fill)','color-mix(in srgb,var(--action-fill) 92%,var(--accent-secondary))']){probe.style.backgroundColor=stop;results.push({label:'Save gradient',ratio:ratio(style.color,getComputedStyle(probe).backgroundColor)});}probe.remove();
  return results;
 };
 for(const width of [1440,800,390]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:false});
  for(const theme of themes)for(const material of ['crystal','frosted']){
   const layout=await evaluate(measure,{theme:theme.id,material,width});
   assert.equal(layout.columns,layout.wanted,JSON.stringify({theme:theme.id,material,width,layout}));assert.equal(layout.overflow,false);assert.equal(layout.compact,true);assert.equal(layout.cabinetCount,12);layouts++;
   const results=await evaluate(contrast);for(const result of results){assert.ok(result.ratio>=4.5,JSON.stringify({theme:theme.id,material,width,...result}));minimum=Math.min(minimum,result.ratio);contrasts++;}
  }
 }
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
 const {root:documentRoot}=await send('DOM.getDocument');
 const {nodeIds}=await send('DOM.querySelectorAll',{nodeId:documentRoot.nodeId,selector:'[data-kind=cookie] .muse-button'});
 for(const theme of themes){
  await evaluate(({theme})=>{document.documentElement.dataset.theme=theme;},{theme:theme.id});
  for(const [index,nodeId] of nodeIds.entries()){
   await send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['hover','focus-visible']});
   const hovered=await evaluate(contrast);assert.ok(hovered.every(result=>result.ratio>=4.5),JSON.stringify({theme:theme.id,hovered}));
   assert.equal(await evaluate(index=>getComputedStyle(document.querySelectorAll('[data-kind=cookie] button')[index]).outlineStyle,index),'solid');
   await send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:[]});
  }
  await evaluate(()=>document.querySelectorAll('[data-kind=cookie] button').forEach(button=>button.disabled=true));
  const disabled=await evaluate(contrast);assert.ok(disabled.every(result=>result.ratio>=4.5),JSON.stringify({theme:theme.id,disabled}));
  await evaluate(()=>document.querySelectorAll('[data-kind=cookie] button').forEach(button=>button.disabled=false));
 }
 const {nodeIds:drawerNodes}=await send('DOM.querySelectorAll',{nodeId:documentRoot.nodeId,selector:'.muse-fortune-drawer'});
 for(const [index,nodeId] of drawerNodes.entries()){
  await send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['hover']});
  const outline=await evaluate(index=>{const drawer=document.querySelectorAll('.muse-fortune-drawer')[index],probe=document.createElement('span');drawer.append(probe);probe.style.color='var(--item-accent)';const values={actual:getComputedStyle(drawer).borderTopColor,expected:getComputedStyle(probe).color};probe.remove();return values;},index);
  assert.equal(outline.actual,outline.expected,`Hover outline uses the category accent: ${JSON.stringify({index,outline})}`);
  await send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:[]});
 }
 await evaluate(()=>document.querySelector('summary').focus());
 assert.equal(await evaluate(()=>document.activeElement.tagName),'SUMMARY');
 for(const [key,code,virtualKey] of [['Enter','Enter',13],[' ','Space',32]]){
  const before=await evaluate(()=>document.querySelector('details').open);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:virtualKey,text:code==='Enter'?'\r':' '});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:virtualKey});
  assert.notEqual(await evaluate(()=>document.querySelector('details').open),before,`${code} toggles the keepsake`);
 }
 await evaluate(()=>document.querySelector('summary').click());
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 assert.equal(await evaluate(()=>document.activeElement.textContent),'Original source ↗','Expanded source is reachable by Tab');
 const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(join(directory,'preview.png'),Buffer.from(screenshot.data,'base64'));
 console.log(`${production?'Production':'Source'} CSS: ${layouts} responsive theme/material layouts, ${contrasts} contrast checks (minimum ${minimum.toFixed(2)}:1), hover/focus/disabled states, and Enter/Space/Tab disclosure navigation passed.`);
 console.log(`Preview: ${join(directory,'preview.png')}`);
}finally{socket?.close();processHandle.kill('SIGTERM');}
