// Malibu Mugshot readability and the Agenda week in Safari (Nov 25). Requires a production build on :3000 and local
// Supabase. Run: node scripts/test-malibu-ui.mjs
import assert from 'node:assert/strict';
import {seedAccount,openBrowser,removeAccount,wait} from './qa/books-harness.mjs';

let passed=0;const check=(cond,label)=>{assert.ok(cond,label);passed++;console.log('✓',label);};
const account=await seedAccount();let ui;
try{
 const {client}=account,today=new Date().toISOString().slice(0,10);
 const {error}=await client.rpc('save_whimsy_record',{p_kind:'dreams',p_expected_revision:0,p_command_id:crypto.randomUUID(),p_record:{id:crypto.randomUUID(),date:today,timeZone:'UTC',loggedAt:new Date().toISOString(),title:'test dream',text:'A house by the sea and a phone that would not stop ringing.',symbolIds:[],emotions:['anxious','calm'],interpretation:'',classifications:['lucid'],lucid:true},p_delete:false});
 if(error)throw error;
 ui=await openBrowser(account,{shots:process.env.MALIBU_SHOTS});
 const {evaluate,go,shoot,viewport,click,errors}=ui;
 await viewport(1440,1000);
 const luminance=c=>{const m=c.match(/[\d.]+/g).map(Number);const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2]);};
 for(const theme of ['bubblegum-baby','prism-noir']){
  await evaluate(t=>localStorage.setItem('muse.theme',t),theme);
  const malibu=theme==='bubblegum-baby';
  // Daily Edit: the title on the canvas.
  await go('/','!!document.querySelector(".muse-header-identity .muse-greeting")','daily');await wait(1500);
  if(malibu){check(await evaluate(()=>getComputedStyle(document.querySelector('.muse-header-identity .muse-greeting')).color==='rgb(255, 255, 255)'),'Malibu: “Make room for a little magic.” is white on the magenta canvas');await shoot('malibu-daily');}
  // Dreams: chips with white words on a deep fill; no pale pill inside.
  await go('/whimsy/dreamscapes','!!document.querySelector(".muse-dream-type-chips")','dreams');await wait(1500);
  if(malibu){
   const chip=await evaluate(()=>{const b=document.querySelector('.muse-dream-type-chips>button:not([aria-pressed="true"])'),s=getComputedStyle(b),inner=b.querySelector('.muse-dream-type');return {color:s.color,bg:s.backgroundColor,inner:inner?getComputedStyle(inner).backgroundColor:''};});
   check(chip.color==='rgb(255, 255, 255)','Malibu: dream type chips have white words');
   check(luminance(chip.bg)<.18,`Malibu: chip fill is deep enough for white words (${chip.bg})`);
   check(/rgba\(0, 0, 0, 0\)|transparent/.test(chip.inner),'Malibu: no pale pill inside a chip');
   await shoot('malibu-dreams');
  }
  await go('/whimsy/dreamscapes?view=encyclopedia','!!document.querySelector(".muse-chip-row>button")','symbols');await wait(1500);
  if(malibu){check(await evaluate(()=>[...document.querySelectorAll('.muse-chip-row>button')].every(b=>getComputedStyle(b).color==='rgb(255, 255, 255)')),'Malibu: Symbol Encyclopedia category chips have white words');await shoot('malibu-symbols');}
  // Rituals: the selected day is a solid white pill.
  await go('/rituals','!!document.querySelector(".muse-week-day[aria-pressed=\\"true\\"]")','rituals');await wait(1200);
  if(malibu){const d=await evaluate(()=>{const s=getComputedStyle(document.querySelector('.muse-week-day[aria-pressed="true"]'));return {bg:s.backgroundColor,color:s.color};});
   check(luminance(d.bg)>.85,`Malibu: the selected ritual day is a solid white pill (${d.bg})`);await shoot('malibu-rituals');}
  // Life Atlas labels: the halo is the card surface, not the page's pink.
  await go('/envision','!!document.querySelector("main")','envision');await wait(1200);
  await click('button','Build My Atlas Myself').catch(()=>{});await wait(1500);
  const label=await evaluate(()=>{const t=document.querySelector('.muse-lifeatlas-constellation[data-web] .muse-lifeatlas-star-label');return t?getComputedStyle(t).stroke:null;});
  if(label)check(!/255, 79, 160/.test(label),`${theme}: Life Atlas labels are haloed with the card surface (${label})`);
  if(malibu)await shoot('malibu-envision');
  // Agenda week: no masked full-height layers left for Safari to drop on hover.
  await go('/planner?view=agenda','!!document.querySelector(".muse-agenda-week .muse-agenda-day")','agenda');await wait(1800);
  const masked=await evaluate(()=>{let n=0;for(const el of document.querySelectorAll('.muse-agenda-week>.muse-agenda-day'))for(const p of [null,'::before','::after']){const s=getComputedStyle(el,p);if(s.content!=='none'&&((s.maskImage&&s.maskImage!=='none')||(s.webkitMaskImage&&s.webkitMaskImage!=='none')))n++;}return n;});
  check(masked===0,`${theme}: Agenda week columns carry no masked layers (${masked})`);
  const ring=await evaluate(()=>getComputedStyle(document.querySelector('.muse-agenda-week>.muse-agenda-day')).backgroundImage);
  check(/gradient.*gradient.*gradient/.test(ring),`${theme}: the week column still wears the theme’s gradient outline`);
  await shoot(`agenda-${theme}`);
 }
 // Mood: "Add feeling" fits on one line, in a dark theme and in Malibu, at a laptop width.
 for(const theme of ['astral','bubblegum-baby']){await evaluate(t=>localStorage.setItem('muse.theme',t),theme);await viewport(1280,900);
  await go('/','!!document.querySelector(".mood-card .feeling-chips>.add-control")','mood');await wait(1500);
  const lines=await evaluate(()=>{const b=document.querySelector('.mood-card .feeling-chips>.add-control');b.scrollIntoView({block:'center'});const t=[...b.childNodes].find(n=>n.nodeType===3&&/Add feeling/.test(n.textContent));const r=document.createRange();r.selectNodeContents(t);return Math.round([...r.getClientRects()].reduce((set,x)=>set.add(Math.round(x.top)),new Set()).size);});
  await shoot(`mood-${theme}`);check(lines===1,`${theme}: “Add feeling” stays on one line (${lines})`);}
 check(errors.length===0,`no page errors${errors.length?`: ${errors[0]}`:''}`);
 console.log(`\n${passed} checks passed. Screenshots: ${ui.shots}`);
}catch(e){console.error(e);process.exitCode=1;}
finally{ui?.close();await removeAccount(account.userId);}
