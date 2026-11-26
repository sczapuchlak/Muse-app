// Spaces card looks (Nov 26): callout rows, independent background and border (solid or gradient, from Muse's shared
// paint picker), automatic text contrast, emoji icons, a header field on the right, side-by-side field layout, and
// templates that keep all of it. Requires a production build on :3000 and local Supabase through 20270117000100.
// Run: node scripts/test-spaces-looks-ui.mjs   (SPACES_SHOTS=/dir keeps screenshots)
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {mkdirSync} from 'node:fs';
import {execSync} from 'node:child_process';
import {seedAccount,openBrowser,removeAccount,wait} from './qa/books-harness.mjs';

let passed=0;const check=(cond,label)=>{assert.ok(cond,label);passed++;console.log('✓',label);};
const shots=process.env.SPACES_SHOTS??join(tmpdir(),'muse-spaces-looks');mkdirSync(shots,{recursive:true});
const account=await seedAccount();let ui;const {client}=account;const id=()=>crypto.randomUUID();
const f=(i,label,type,value,extra={})=>({id:i,label,type,value,...extra});
const solid=(color)=>({kind:'solid',color}),grad=(a,b,angle=90)=>({kind:'gradient',gradient:{colors:[a,b],angle}});
try{
 // ---- Monday: three callouts, a note and a checklist ----
 const T=id(),mon=id(),chk=id();
 await client.from('lists').insert({id:T,title:'Japan itinerary',preset:'project',section_columns:1});
 await client.from('list_sections').insert({id:mon,list_id:T,title:'Monday',position:0});
 const flight={id:id(),list_id:T,section_id:mon,kind:'card',position:0,width:'full',data:{preset:'flight',title:'Flight to Tokyo',icon:'✈️',display:'row',aside:'date',preview:['departs','from','to'],
  look:{preset:'callout',bg:solid('#fff1c2'),strength:100,border:grad('#ff4fa3','#ff9a3c'),placement:'left'},
  fields:[f('date','Date','date','2027-10-04'),f('departs','Departs','time','15:15'),f('from','From','text','LAX Terminal B'),f('to','To','text','HND'),f('carrier','Airline & flight','text','Delta DL 7'),f('confirmation','Confirmation','text','QX7Y2'),f('bags','Baggage','text','2 × 23kg'),f('notes','Notes','longtext','Window seats')]}};
 const hotel={id:id(),list_id:T,section_id:mon,kind:'card',position:1,width:'full',data:{preset:'stay',title:'Hotel check-in',icon:'🏨',display:'row',aside:'checkin',preview:['address','time'],
  look:{preset:'callout',bg:solid('#4d96ff'),strength:22,border:solid('#4d96ff'),placement:'left'},
  fields:[f('address','Address','text','Shinjuku'),f('time','Check-in time','time','15:00'),f('checkin','Check-in','date','2027-10-05'),f('confirmation','Reservation','text','HK-88'),f('link','Booking','url','https://example.com/b')]}};
 const dinner={id:id(),list_id:T,section_id:mon,kind:'card',position:2,width:'full',data:{preset:'reservation',title:'Dinner reservation',icon:'🍜',display:'collapsible',aside:'time',preview:['note'],
  look:{preset:'callout',bg:solid('#c77dff'),strength:20,border:solid('#c77dff'),placement:'left'},
  fields:[f('time','Time','time','19:30'),f('note','Summary','text','Restaurant details and confirmation'),f('confirmation','Confirmation','text','RD-1')]}};
 await client.from('list_blocks').insert([flight,hotel,dinner,{id:id(),list_id:T,section_id:mon,kind:'note',position:3,width:'half',data:{text:'',doc:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Shibuya crossing at night'}]}]}}},{id:chk,list_id:T,section_id:mon,kind:'checklist',position:4,width:'half',data:{}}]);
 await client.from('list_items').insert({id:id(),list_id:T,section_id:mon,block_id:chk,title:'Buy Suica card',position:0});
 ui=await openBrowser(account,{shots});
 const {evaluate,until,go,click,viewport,shoot,type}=ui;
 await viewport(1440,1000);
 await go(`/notes?view=lists&list=${T}`,'document.querySelectorAll(".muse-space-card-row").length>=2','monday');await wait(1000);
 const row=(i)=>evaluate((i)=>{const r=document.querySelector(`#space-block-${i} :is(.muse-space-card-row,.muse-space-card)`);const cs=getComputedStyle(r),after=getComputedStyle(r,'::after'),before=getComputedStyle(r,'::before');
  return {text:r.textContent,painted:r.hasAttribute('data-painted'),border:r.dataset.border,ink:r.dataset.ink,borderBg:after.backgroundImage+after.backgroundColor,bg:before.backgroundColor+before.backgroundImage,alpha:before.opacity,color:cs.color,chev:!!r.querySelector('.muse-space-chev'),aside:r.querySelector('.muse-space-aside')?.textContent,emoji:r.querySelector('.muse-space-emoji')?.textContent};},i);
 let fr=await row(flight.id);
 check(fr.painted&&fr.border==='left'&&/linear-gradient/.test(fr.borderBg)&&/255, 241, 194/.test(fr.bg),'the flight is a yellow callout with its own pink→orange gradient stripe');
 check(fr.ink==='dark'&&/rgb\(29, 24, 40\)/.test(fr.color),'its text turns dark ink on the yellow automatically');
 check(fr.emoji==='✈️'&&/Flight to Tokyo/.test(fr.text)&&/Mon, Oct 4/.test(fr.aside??''),'plane emoji, the title, and the date on the right');
 check(/3:15 PM · LAX Terminal B · HND/.test(fr.text)&&!/QX7Y2|Delta|2 × 23kg/.test(fr.text),'collapsed, it shows only the chosen preview: 3:15 PM · LAX Terminal B · HND');
 const hr=await row(hotel.id),dr=await row(dinner.id);
 check(hr.painted&&Number(hr.alpha)<.3&&!hr.ink&&dr.painted&&dr.border==='left','hotel and dinner are soft tinted callouts that keep the theme’s text colours');
 check(hr.bg!==dr.bg&&hr.bg!==fr.bg,'every card keeps its own colours');
 await shoot('looks-monday');
 await evaluate((i)=>document.querySelector(`#space-block-${i} .muse-space-card-row`).click(),flight.id);await wait(500);
 fr=await row(flight.id);
 check(/QX7Y2/.test(fr.text)&&/2 × 23kg/.test(fr.text)&&/Window seats/.test(fr.text)&&fr.painted&&fr.border==='left','expanding reveals every other field inside the same styled card');
 await shoot('looks-flight-open');
 await evaluate((i)=>document.querySelector(`#space-block-${i} .muse-space-card-toggle`).click(),flight.id);await wait(400);
 check(await evaluate((i)=>!!document.querySelector(`#space-block-${i} .muse-space-card-row`),flight.id),'and collapses back to the row');
 // A card whose fields are all in its preview offers no misleading chevron.
 const plain={id:id(),list_id:T,section_id:mon,kind:'card',position:5,width:'half',data:{preset:'info',title:'Train pass',display:'row',preview:['d'],fields:[f('d','Days','text','7')]}};
 await client.from('list_blocks').insert(plain);
 await go(`/notes?view=lists&list=${T}`,`!!document.querySelector("#space-block-${plain.id}")`,'reload');await wait(900);
 check(!(await row(plain.id)).chev,'a card with nothing hidden shows no expand chevron');
 check(await evaluate((i)=>!document.querySelector(`#space-block-${i} [data-painted]`),chk),'blocks without a look render exactly as before');

 // ---- Bedroom: emerald furniture card, measurement in two columns, shopping with the price on the right ----
 const H=id(),bed=id();await client.from('lists').insert({id:H,title:'Apartment',preset:'project',section_columns:1});await client.from('list_sections').insert({id:bed,list_id:H,title:'Bedroom',position:0});
 const furn={id:id(),list_id:H,section_id:bed,kind:'card',position:0,width:'half',data:{preset:'info',title:'Velvet bed frame',icon:'🛏️',look:{preset:'gradient',bg:grad('#0f9d76','#2ec4b6',135),strength:100,placement:'none'},fields:[f('w','Width','text','64 in'),f('l','Length','text','86 in')]}};
 const meas={id:id(),list_id:H,section_id:bed,kind:'card',position:1,width:'half',data:{preset:'info',title:'Bedroom wall',fields:[f('w','Width','text','132 in',{width:'half'}),f('h','Height','text','96 in',{width:'half'}),f('n','Note','text','Outlet 20 in from the left',{width:'full'})]}};
 const shop={id:id(),list_id:H,section_id:bed,kind:'card',position:2,width:'full',data:{preset:'shopping',title:'Linen duvet',aside:'price',look:{preset:'outline',border:grad('#22d3ee','#8b5cf6',90),placement:'full'},fields:[f('price','Price','money','189'),f('status','Status','choice','To buy',{options:['To buy','Bought']})]}};
 await client.from('list_blocks').insert([furn,meas,shop,{id:id(),list_id:H,section_id:bed,kind:'images',position:3,width:'full',data:{images:[]}}]);
 await go(`/notes?view=lists&list=${H}`,`!!document.querySelector("#space-block-${shop.id}")`,'bedroom');await wait(900);
 const fu=await row(furn.id);check(fu.painted&&fu.ink==='light'&&/linear-gradient/.test(fu.bg),'an emerald gradient card switches to light text');
 check(await evaluate((i)=>{const d=[...document.querySelectorAll(`#space-block-${i} .muse-space-details[data-layout]>div`)];return d.length===3&&Math.abs(d[0].getBoundingClientRect().top-d[1].getBoundingClientRect().top)<2&&d[2].dataset.span==='2';},meas.id),'Width and Height sit side by side, the note on its own row');
 const sh=await row(shop.id);check(sh.border==='full'&&/linear-gradient/.test(sh.borderBg)&&!sh.painted&&/\$189/.test(sh.aside??'')&&(sh.text.match(/\$189/g)??[]).length===1,'the shopping card has a gradient outline, no fill, and its price on the right (shown once)');
 await shoot('looks-bedroom');

 // ---- Build a custom card in the editor, style it, lay it out, save it as a template, reuse it elsewhere ----
 await click('.muse-space-add','Add content');await until(()=>!!document.querySelector('.muse-space-card-actions'),'picker');
 await evaluate(()=>[...document.querySelectorAll('.muse-space-card-actions button')].find(b=>/Create custom card/.test(b.textContent)).click());await until(()=>!!document.querySelector('.muse-space-card-edit'),'builder');
 await type('.muse-space-card-edit input[placeholder="Wi-Fi & door codes"]','Vendor');
 const addField=async(label,typ)=>{await type('.muse-space-addfield input',label);await evaluate((t)=>{const s=document.querySelector('.muse-space-addfield select');s.value=t;s.dispatchEvent(new Event('change',{bubbles:true}));},typ);await wait(80);await click('.muse-space-addfield button','Add field');await wait(250);};
 await addField('Date','date');await addField('Contact','text');await addField('Deposit','money');await addField('Booked','checkbox');
 for(const n of ['Date','Contact'])await evaluate((n)=>document.querySelector(`[aria-label="Show ${n} side by side"]`).click(),n);
 await evaluate(()=>document.querySelector('[aria-label="Show Contact in preview"]').click());
 await evaluate(()=>{const s=document.querySelector('.muse-space-aside-choice select');s.value=[...s.options].find(o=>o.textContent==='Date').value;s.dispatchEvent(new Event('change',{bubbles:true}));});
 await evaluate(()=>[...document.querySelectorAll('.muse-space-display button')].find(b=>b.textContent==='Compact row').click());
 await evaluate(()=>{document.querySelector('.muse-space-appearance').open=true;});await wait(100);
 await evaluate(()=>[...document.querySelectorAll('.muse-space-look-presets button')].find(b=>/Callout/.test(b.textContent)).click());await wait(300);
 await evaluate(()=>{const fs=[...document.querySelectorAll('.muse-space-appearance fieldset')].find(x=>/Border colour/.test(x.querySelector('legend').textContent));[...fs.querySelectorAll('button')].find(b=>b.textContent==='Gradient').click();});await wait(200);
 await evaluate(()=>{const fs=[...document.querySelectorAll('.muse-space-appearance fieldset')].find(x=>/Border colour/.test(x.querySelector('legend').textContent));fs.querySelector('.muse-paint-gradient').click();});await wait(300);
 await evaluate(()=>{const set=(el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));};set(document.querySelector('.muse-space-card-edit [aria-label="Contact"]'),'Mika · 555 0101');set(document.querySelector('.muse-space-card-edit [aria-label="Date"]'),'2027-06-12');});await wait(300);
 check(await evaluate(()=>{const p=document.querySelector('.muse-space-live .muse-space-card-row');return !!p&&p.dataset.border==='left'&&/Mika/.test(p.textContent);}),'the editor previews the card live as you style it');
 await shoot('looks-builder');
 await evaluate(()=>document.querySelector('.muse-space-card-edit').requestSubmit());await wait(1200);
 const vendor=(await client.from('list_blocks').select('*').eq('list_id',H).order('created_at',{ascending:false})).data.find(b=>b.data.title==='Vendor');
 const vd=vendor.data;
 check(vd.display==='row'&&vd.aside==='date'&&vd.look.placement==='left'&&vd.look.border.kind==='gradient'&&vd.look.bg,'the card saves its row display, header date and callout look with a gradient border');
 check(vd.fields.filter(x=>x.width==='half').map(x=>x.label).join()==='Date,Contact'&&vd.preview.join()==='contact','and its side-by-side fields and preview');
 await evaluate((i)=>document.querySelector(`#space-block-${i} .muse-space-more`).click(),vendor.id);await until(()=>!!document.querySelector('.muse-space-menu'),'menu');
 await click('.muse-space-menu .popover-choice','Save as card template…');await until(()=>!!document.querySelector('#space-save-template input'),'save');
 await type('#space-save-template input','Party vendor');await evaluate(()=>document.querySelector('#space-save-template form').requestSubmit());await wait(1000);
 const tpl=(await client.from('list_card_templates').select('*').eq('name','Party vendor').single()).data;
 check(tpl.display.look?.border?.kind==='gradient'&&tpl.display.aside==='date'&&tpl.display.mode==='row'&&tpl.fields.some(x=>x.width==='half')&&tpl.fields.every(x=>!('value' in x)),'the template keeps fields, layout, header field, display and appearance, never values');
 const L2=id();await client.from('lists').insert({id:L2,title:'Birthday party',preset:'project'});
 await go(`/notes?view=lists&list=${L2}`,'!!document.querySelector(".muse-space-add")','party');await wait(900);
 await click('.muse-space-add','Add content');await until(()=>!!document.querySelector('.muse-space-card-actions'),'picker 2');
 await evaluate(()=>[...document.querySelectorAll('.muse-space-card-actions button')].find(b=>/My card templates/.test(b.textContent)).click());await until(()=>!!document.querySelector('.muse-space-palette-grid[data-mine]'),'mine');
 await evaluate(()=>[...document.querySelectorAll('.muse-space-palette-grid[data-mine] button')].find(b=>/Party vendor/.test(b.textContent)).click());await wait(1000);
 const inst=(await client.from('list_blocks').select('*').eq('list_id',L2).single()).data;
 check(JSON.stringify(inst.data.look)===JSON.stringify(vd.look)&&inst.data.fields.every(x=>!x.value)&&inst.data.aside==='date','a card from the template arrives with the same look and layout, values empty');
 inst.data.look={...inst.data.look,bg:solid('#e85d75')};await client.from('list_blocks').update({data:inst.data}).eq('id',inst.id);
 check(JSON.stringify((await client.from('list_card_templates').select('display').eq('id',tpl.id).single()).data.display.look)===JSON.stringify(vd.look),'restyling that card leaves the template as it was');
 // ---- Dark theme: contrast still follows each background; phone layout ----
 await go(`/notes?view=lists&list=${T}`,'document.querySelectorAll(".muse-space-card-row").length>=2','monday dark');await wait(800);
 await evaluate(()=>{document.documentElement.dataset.theme='northern-lights-out';});await wait(500);
 fr=await row(flight.id);check(fr.ink==='dark'&&/rgb\(29, 24, 40\)/.test(fr.color),'in a dark theme the yellow callout still uses dark ink');
 await shoot('looks-monday-dark');
 await viewport(390,844,true);await wait(800);
 check(!(await ui.overflow()),'no sideways scrolling on a phone');
 check(await evaluate((i)=>document.querySelector(`#space-block-${i} .muse-space-card-row`).getBoundingClientRect().width<=390,flight.id),'callout rows fit an iPhone');
 await shoot('looks-monday-phone',{full:true});
 check(!execSync('git status --porcelain -- components/MusePaintPicker.tsx components/MuseColorPicker.tsx components/MuseGradientBuilder.tsx components/rituals',{cwd:new URL('..',import.meta.url).pathname}).toString().trim(),'the shared colour and gradient tools Rituals uses are unchanged');
 check(ui.errors.length===0,`no page errors ${ui.errors.slice(0,2).join(' | ')}`);
 console.log(`\n${passed} checks passed. Screenshots: ${shots}`);
}finally{ui?.close();await removeAccount(account.userId);}
