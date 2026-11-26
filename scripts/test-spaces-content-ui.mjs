// Spaces content refinement (Nov 26): Add content everywhere (section button, section ⋯ menu, page), the empty-section
// hint, every block made by hand, card templates across spaces, card display modes with preview fields, field
// reordering and checkboxes, and section duplication (structure vs content) on a multi-day itinerary.
// Requires a production build on :3000 and local Supabase with migrations through 20270117000100.
// Run: node scripts/test-spaces-content-ui.mjs   (SPACES_SHOTS=/dir keeps screenshots)
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {mkdirSync} from 'node:fs';
import {seedAccount,openBrowser,removeAccount,wait} from './qa/books-harness.mjs';

let passed=0;const check=(cond,label)=>{assert.ok(cond,label);passed++;console.log('✓',label);};
const shots=process.env.SPACES_SHOTS??join(tmpdir(),'muse-spaces-content');mkdirSync(shots,{recursive:true});
const account=await seedAccount(),other=await seedAccount();let ui;
const {client}=account;
const blocks=async(listId)=>(await client.from('list_blocks').select('*').eq('list_id',listId).order('position')).data??[];
const sectionsOf=async(listId)=>(await client.from('list_sections').select('*').eq('list_id',listId).order('position')).data??[];
try{
 ui=await openBrowser(account,{shots});
 const {evaluate,until,go,click,viewport,shoot,type}=ui;
 await viewport(1440,1000);
 // ---- A blank space and a hand-made Bathroom section ----
 await go('/notes?view=lists','!!document.querySelector(".muse-lists-new")','library');await wait(900);
 await click('.muse-lists-new','');await until(()=>!!document.querySelector('.muse-space-starts'),'new');
 await type('#list-new-title','Apartment Glow Up');await click('.muse-space-start','Blank space');await evaluate(()=>document.querySelector('.muse-lists-new-form').requestSubmit());
 await until(()=>!!document.querySelector('.muse-list-addsection input'),'space open');await wait(800);
 const space=(await client.from('lists').select('*').eq('title','Apartment Glow Up').single()).data;
 await click('.muse-space-page-content','');await until(()=>!!document.querySelector('#space-add-content .muse-space-card-actions'),'picker shape');
 check(await evaluate(()=>{const d=document.querySelector('#space-add-content');const basics=[...d.querySelectorAll('.muse-space-palette-grid button b')].map(b=>b.textContent).join();const acts=[...d.querySelectorAll('.muse-space-card-actions b')].map(b=>b.textContent).join();return basics==='Checklist,Note,Photos,Link,Heading,Divider'&&acts==='Create custom card,My card templates,Browse presets'&&!/Flight/.test(basics);}),'Add content shows the six basics and three card actions, not a wall of presets');
 await evaluate(()=>[...document.querySelectorAll('#space-add-content .muse-space-card-actions button')].find(b=>/My card templates/.test(b.textContent)).click());await wait(300);
 check(await evaluate(()=>/No card templates yet/.test(document.querySelector('#space-add-content').textContent)),'My card templates explains itself when empty');
 await evaluate(()=>document.querySelector('#space-add-content .muse-modal-universal-close button').click());await wait(400);
 check(await evaluate(()=>!!document.querySelector('.muse-space-page-content')&&/New section/.test(document.querySelector('.muse-list-addsection input').placeholder)),'the page offers New section and Add content side by side');
 await type('.muse-list-addsection input','Bathroom');await evaluate(()=>document.querySelector('.muse-list-addsection').requestSubmit());
 await until(()=>[...document.querySelectorAll('.muse-list-section')].some(s=>/Bathroom/.test(s.textContent)),'bathroom');await wait(500);
 check(await evaluate(()=>{const s=[...document.querySelectorAll('.muse-list-section')].find(x=>/Bathroom/.test(x.textContent));return !!s.querySelector('.muse-list-quickadd input')&&/checklist, note, photos, a link or an info card/.test(s.textContent)&&/Add content/.test(s.querySelector('.muse-space-add').textContent);}),'a new section says what can go in it, with Add an item and Add content');
 await shoot('content-empty-section');
 const bath=(await sectionsOf(space.id)).find(s=>s.title==='Bathroom');
 const addInBath=async(label)=>{await evaluate((id)=>document.querySelector(`#space-section-${id} .muse-space-add`).click(),bath.id);await until(()=>!!document.querySelector('.muse-space-palette'),'picker');
  const pickIn=async(label)=>evaluate((label)=>{const b=[...document.querySelectorAll('.muse-space-palette-grid button')].find(x=>x.querySelector('b')?.textContent.trim()===label);if(!b)return false;b.click();return true;},label);
  if(!(await pickIn(label))){await evaluate(()=>[...document.querySelectorAll('.muse-space-card-actions button')].find(b=>/Browse presets/.test(b.textContent)).click());await wait(300);
   check(await evaluate(()=>['Travel','Home & shopping','Personal'].every(t=>[...document.querySelectorAll('.muse-space-palette[data-view=presets] .editor-label')].some(l=>l.textContent===t))),`Browse presets groups Travel, Home & shopping and Personal (${label})`);
   assert.ok(await pickIn(label),'preset '+label);}
  await wait(900);
  await evaluate(()=>{for(const b of document.querySelectorAll('.muse-space-done'))b.click();});await wait(500);};
 await shoot('content-picker-pre');
 for(const label of ['Checklist','Note','Photos','Link','Measurement','Shopping item'])await addInBath(label);
 let bb=(await blocks(space.id)).filter(b=>b.section_id===bath.id);
 check(['checklist','note','images','link'].every(k=>bb.some(b=>b.kind===k)),'Bathroom gets a checklist, a note, a gallery and a link by hand');
 check(bb.some(b=>b.kind==='card'&&b.data.preset==='measurement')&&bb.some(b=>b.kind==='card'&&b.data.preset==='shopping'),'and the Home Makeover measurement and shopping cards, no template needed');
 // Quick add still makes checklist items without the picker.
 await evaluate((id)=>{const i=document.querySelector(`#space-section-${id} .muse-list-quickadd input`);i.focus();},bath.id);
 await type(`#space-section-${bath.id} .muse-list-quickadd input`,'Grout cleaner');await evaluate((id)=>document.querySelector(`#space-section-${id} .muse-list-quickadd`).requestSubmit(),bath.id);await wait(800);
 check((await client.from('list_items').select('title').eq('list_id',space.id)).data.some(i=>i.title==='Grout cleaner'),'Add an item still adds a checklist item straight away');
 // Section ⋯ menu → Add content
 await evaluate((id)=>document.querySelector(`#space-section-${id} .muse-list-section-more`).click(),bath.id);await until(()=>!!document.querySelector('.muse-list-section-menu'),'section menu');
 check(await evaluate(()=>/Add content/.test(document.querySelector('.muse-list-section-menu').textContent)&&/Duplicate structure/.test(document.querySelector('.muse-list-section-menu').textContent)),'the section ⋯ menu offers Add content and both duplicates');
 await click('.muse-list-section-menu .popover-choice','Add content…');await until(()=>!!document.querySelector('.muse-space-palette'),'picker from menu');
 await evaluate(()=>[...document.querySelectorAll('.muse-space-palette-grid button')].find(x=>x.querySelector('b')?.textContent.trim()==='Heading').click());await wait(800);
 await evaluate(()=>{const i=document.querySelector('.muse-space-heading-edit input');const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;set.call(i,'Shopping');i.dispatchEvent(new Event('input',{bubbles:true}));i.form.requestSubmit();});await wait(800);
 check((await blocks(space.id)).some(b=>b.kind==='heading'&&b.data.text==='Shopping'),'Add content from the section menu uses the same picker');
 // Page-level Add content into a chosen section.
 await type('.muse-list-addsection input','Bedroom');await evaluate(()=>document.querySelector('.muse-list-addsection').requestSubmit());await wait(900);
 await click('.muse-space-page-content','');await until(()=>!!document.querySelector('#space-add-content select'),'page add dialog');
 check(await evaluate(()=>document.querySelector('#space-add-content select').selectedOptions[0].textContent==='Bedroom'),'page Add content defaults to the newest section');
 await evaluate(()=>[...document.querySelectorAll('#space-add-content .muse-space-palette-grid button')].find(x=>x.querySelector('b')?.textContent.trim()==='Photos').click());await wait(900);
 const bed=(await sectionsOf(space.id)).find(s=>s.title==='Bedroom');
 check((await blocks(space.id)).some(b=>b.kind==='images'&&b.section_id===bed.id),'and adds into that section');
 // Edit, reorder, move, persistence.
 const measure=(await blocks(space.id)).find(b=>b.data?.preset==='measurement');
 await evaluate((id)=>document.querySelector(`#space-block-${id} .muse-space-more`).click(),measure.id);await until(()=>!!document.querySelector('.muse-space-menu'),'block menu');
 await click('.muse-space-menu .popover-choice','Move up');await wait(900);
 const before=(await blocks(space.id)).filter(b=>b.section_id===bath.id).map(b=>b.id);
 check(before.indexOf(measure.id)<bb.map(b=>b.id).indexOf(measure.id)||before.indexOf(measure.id)===bb.length-2,'a hand-made block reorders');
 await evaluate((id)=>document.querySelector(`#space-block-${id} .muse-space-more`).click(),measure.id);await until(()=>!!document.querySelector('.muse-space-menu'),'block menu 2');
 await click('.muse-space-menu .popover-choice','Move to section…');await click('.muse-space-menu .popover-choice','Bedroom');await wait(900);
 check((await client.from('list_blocks').select('section_id').eq('id',measure.id).single()).data.section_id===bed.id,'and moves to another section');
 // ---- A custom Furniture details card → template ----
 const furn=(await client.from('list_blocks').insert({id:crypto.randomUUID(),list_id:space.id,section_id:bed.id,kind:'card',position:9,width:'half',data:{preset:'info',title:'Linen headboard',fields:[
  {id:'detail',label:'Detail',type:'text',value:''},{id:'notes',label:'Notes',type:'longtext',value:'Ships in 3 weeks'}]}}).select().single()).data;
 await go(`/notes?view=lists&list=${space.id}`,`!!document.querySelector("#space-block-${furn.id}")`,'reload');await wait(900);
 check(await evaluate(()=>[...document.querySelectorAll('.muse-list-section')].some(s=>/Bathroom/.test(s.textContent))&&!!document.querySelector('.muse-space-mosaic, .muse-space-drop')),'everything is still there after a reload');
 await evaluate((id)=>document.querySelector(`#space-block-${id} .muse-space-more`).click(),furn.id);await until(()=>!!document.querySelector('.muse-space-menu'),'card menu');
 await click('.muse-space-menu .popover-choice','Edit');await until(()=>!!document.querySelector('.muse-space-card-edit'),'card editor');
 const fieldAdd=async(label,typ)=>{await type('.muse-space-addfield input',label);await evaluate((t)=>{const s=document.querySelector('.muse-space-addfield select');s.value=t;s.dispatchEvent(new Event('change',{bubbles:true}));},typ);await wait(100);await click('.muse-space-addfield button','Add field');await wait(300);};
 await fieldAdd('Width','text');await fieldAdd('Price','money');await fieldAdd('Ordered','checkbox');await fieldAdd('Room','text');
 check(await evaluate(()=>document.querySelectorAll('.muse-space-field-item').length===6),'custom fields add to a card (text, amount, checkbox…)');
 // Rename a field, move Room to the top, tick the checkbox, fill values, choose preview fields and their order.
 await evaluate(()=>{const set=(el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));};
  set(document.querySelector('[aria-label="Name of the Detail field"]'),'Fabric');set(document.querySelector('.muse-space-card-edit [aria-label="Width"]'),'62 in');set(document.querySelector('.muse-space-card-edit [aria-label="Price"]'),'489');set(document.querySelector('.muse-space-card-edit [aria-label="Room"]'),'Bedroom');
  document.querySelector('.muse-space-field-item:last-child label input[type=checkbox], .muse-space-card-edit input[type=checkbox]')?.click();});await wait(200);
 for(let i=0;i<5;i++)await evaluate(()=>document.querySelector('[aria-label="Move Room up"]')?.click());
 for(const f of ['Price','Width','Room'])await evaluate((f)=>document.querySelector(`[aria-label="Show ${f} in preview"]`).click(),f);
 await evaluate(()=>document.querySelector('[aria-label="Move Room earlier in the preview"]').click());
 await evaluate(()=>[...document.querySelectorAll('.muse-space-display button')].find(b=>b.textContent==='Collapsible').click());await wait(300);
 await evaluate(()=>document.querySelector('.muse-space-card-edit').requestSubmit());await wait(1200);
 let fd=(await client.from('list_blocks').select('data').eq('id',furn.id).single()).data.data;
 check(fd.fields[0].id==='room'&&fd.fields.some(f=>f.label==='Fabric'),'fields rename and reorder');
 check(fd.fields.find(f=>f.label==='Ordered').value==='true','a checkbox field saves');
 check(JSON.stringify(fd.preview)==='["price","room","width"]'&&fd.display==='collapsible','preview fields and their order save with the card');
 check(await evaluate((id)=>{const c=document.querySelector(`#space-block-${id} .muse-space-card`);const line=c.querySelector('.muse-space-preview-line')?.textContent??'';return /Bedroom/.test(line)&&/489/.test(line)&&/62 in/.test(line)&&!/Ships in 3 weeks/.test(c.textContent);},furn.id),'collapsed, it shows only the preview fields');
 await evaluate((id)=>{const t=document.querySelector(`#space-block-${id} .muse-space-card-toggle`);t.focus();},furn.id);
 await ui.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await ui.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await wait(500);
 check(await evaluate((id)=>{const c=document.querySelector(`#space-block-${id} .muse-space-card`);return c.querySelector('.muse-space-card-toggle').getAttribute('aria-expanded')==='true'&&/Ships in 3 weeks/.test(c.textContent);},furn.id),'Enter on the header expands it to every field (keyboard)');
 await shoot('content-collapsible-open');
 // Save as card template.
 await evaluate((id)=>document.querySelector(`#space-block-${id} .muse-space-more`).click(),furn.id);await until(()=>!!document.querySelector('.muse-space-menu'),'card menu 3');
 await click('.muse-space-menu .popover-choice','Save as card template…');await until(()=>!!document.querySelector('#space-save-template input'),'save tpl');
 await type('#space-save-template input','Furniture details');await evaluate(()=>document.querySelector('#space-save-template form').requestSubmit());await wait(1000);
 const tpl=(await client.from('list_card_templates').select('*').single()).data;
 check(tpl.name==='Furniture details'&&tpl.fields.length===6&&tpl.fields.every(f=>!('value' in f))&&tpl.display.mode==='collapsible'&&tpl.display.preview.join()==='price,room,width','the template keeps fields, order, display and preview, never values');
 // Reuse in another space.
 const L2=crypto.randomUUID();await client.from('lists').insert({id:L2,title:'Wish List',preset:'project'});
 await go(`/notes?view=lists&list=${L2}`,'!!document.querySelector(".muse-space-add")','wish list');await wait(900);
 await click('.muse-space-add','Add content');await until(()=>!!document.querySelector('.muse-space-card-actions'),'picker');
 await evaluate(()=>[...document.querySelectorAll('.muse-space-card-actions button')].find(b=>/My card templates/.test(b.textContent)).click());await until(()=>!!document.querySelector('.muse-space-palette-grid[data-mine]'),'my templates');
 await shoot('content-picker');
 await evaluate(()=>[...document.querySelectorAll('.muse-space-palette-grid[data-mine] button')].find(x=>/Furniture details/.test(x.textContent)).click());await wait(1000);
 const made=(await blocks(L2)).find(b=>b.kind==='card');
 check(made&&made.data.template?.name==='Furniture details'&&made.data.fields.length===6&&made.data.fields.every(f=>!f.value),'My templates makes a new, empty card in any space');
 // Edit the template: old cards keep their fields; delete it: cards stay.
 await client.from('list_card_templates').update({fields:[...tpl.fields,{id:'finish',label:'Finish',type:'text'}]}).eq('id',tpl.id);
 check((await client.from('list_blocks').select('data').eq('id',furn.id).single()).data.data.fields.length===6,'editing a template never changes cards already made');
 await go(`/notes?view=lists&list=${L2}`,'!!document.querySelector(".muse-space-add")','wish list 2');await wait(900);
 await click('.muse-space-add','Add content');await until(()=>!!document.querySelector('.muse-space-card-actions'),'picker 2');
 await evaluate(()=>[...document.querySelectorAll('.muse-space-card-actions button')].find(b=>/My card templates/.test(b.textContent)).click());await until(()=>!!document.querySelector('.muse-space-palette-mine button'),'manage');
 await click('.muse-space-palette-mine button','Manage');await until(()=>!!document.querySelector('#space-card-templates li'),'manager');
 await click('#space-card-templates .muse-lists-mini',`Duplicate Furniture details`);await wait(900);
 check((await client.from('list_card_templates').select('name')).data.some(t=>t.name==='Furniture details copy'),'a template duplicates');
 await click('#space-card-templates .muse-button','Edit');await until(()=>!!document.querySelector('.muse-space-tpl-edit input'),'tpl editor');
 await shoot('content-template-editor');
 await evaluate(()=>{const i=document.querySelector('.muse-space-tpl-edit input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'Furniture');i.dispatchEvent(new Event('input',{bubbles:true}));i.form.requestSubmit();});await wait(900);
 check((await client.from('list_card_templates').select('name').eq('id',tpl.id).single()).data.name==='Furniture','a template renames from its editor');
 await evaluate((n)=>document.querySelector(`#space-card-templates [aria-label="Delete ${n}"]`).click(),'Furniture');await until(()=>!!document.querySelector('#space-template-delete'),'del confirm');
 await click('#space-template-delete .muse-button','Delete template');await wait(900);
 check(!(await client.from('list_card_templates').select('id').eq('id',tpl.id)).data.length&&!!(await client.from('list_blocks').select('id').eq('id',made.id).single()).data,'deleting a template leaves its cards alone');
 await evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
 check(((await other.client.from('list_card_templates').select('id')).data??[]).length===0,'another person can’t see your card templates');
 // Duplicate card copies values (distinct from a blank template card).
 await go(`/notes?view=lists&list=${space.id}`,`!!document.querySelector("#space-block-${furn.id}")`,'space again');await wait(900);
 await evaluate((id)=>document.querySelector(`#space-block-${id} .muse-space-more`).click(),furn.id);await until(()=>!!document.querySelector('.muse-space-menu'),'card menu 4');
 await click('.muse-space-menu .popover-choice','Duplicate card');await wait(1000);
 check((await blocks(space.id)).filter(b=>b.data?.title==='Linen headboard').length===2,'Duplicate card copies the card with its details');
 // Display modes from the menu: compact row.
 await evaluate((id)=>document.querySelector(`#space-block-${id} .muse-space-more`).click(),furn.id);await until(()=>!!document.querySelector('.muse-space-menu-display'),'display');
 await evaluate(()=>[...document.querySelectorAll('.muse-space-menu-display button')].find(b=>b.textContent==='Compact row').click());await wait(900);
 check(await evaluate((id)=>!!document.querySelector(`#space-block-${id} .muse-space-card-row`),furn.id)&&(await client.from('list_blocks').select('data,width').eq('id',furn.id).single()).data.data.fields.length===6,'switching to a compact row keeps every field');
 await evaluate((id)=>document.querySelector(`#space-block-${id} .muse-space-card-row`).click(),furn.id);await wait(400);
 check(await evaluate((id)=>/Ships in 3 weeks/.test(document.querySelector(`#space-block-${id}`).textContent),furn.id),'a row opens into the full card');

 // ---- A multi-day itinerary: Monday → Tuesday ----
 const T=crypto.randomUUID(),mon=crypto.randomUUID();
 await client.from('lists').insert({id:T,title:'Japan itinerary',preset:'project',section_columns:1});
 await client.from('list_sections').insert({id:mon,list_id:T,title:'Monday',position:0});
 const f=(id,label,type,value)=>({id,label,type,value});
 const chk=crypto.randomUUID();
 await client.from('list_blocks').insert([
  {id:crypto.randomUUID(),list_id:T,section_id:mon,kind:'card',position:0,width:'full',data:{preset:'flight',title:'Tokyo → Kyoto',display:'row',preview:['departs','terminal'],fields:[f('from','From','text','HND'),f('to','To','text','ITM'),f('departs','Departs','time','08:40'),f('terminal','Terminal','text','T1'),f('carrier','Airline & flight','text','JAL 103'),f('confirmation','Confirmation','text','JX4R2Q'),f('notes','Notes','longtext','Window seats')]}},
  {id:crypto.randomUUID(),list_id:T,section_id:mon,kind:'card',position:1,width:'half',data:{preset:'stay',title:'Hotel Kanra',display:'collapsible',preview:['address','checkin'],fields:[f('address','Address','text','Karasuma, Kyoto'),f('checkin','Check-in','date','2027-04-05'),f('checkout','Check-out','date','2027-04-07'),f('confirmation','Confirmation','text','HK-88')]}},
  {id:crypto.randomUUID(),list_id:T,section_id:mon,kind:'note',position:2,width:'half',data:{text:'',doc:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Fushimi Inari at dawn'}]}]}}},
  {id:crypto.randomUUID(),list_id:T,section_id:mon,kind:'link',position:3,width:'half',data:{url:'https://example.com/kyoto',title:'Kyoto guide'}},
  {id:chk,list_id:T,section_id:mon,kind:'checklist',position:4,width:'full',data:{title:'Activities'}}]);
 await client.from('list_items').insert({id:crypto.randomUUID(),list_id:T,section_id:mon,block_id:chk,title:'Tea ceremony',position:0,completed_at:new Date().toISOString(),completed_on:'2026-11-26'});
 await go(`/notes?view=lists&list=${T}`,'document.querySelectorAll(".muse-space-cell").length>=5','itinerary');await wait(900);
 check(await evaluate(()=>{const r=document.querySelector('.muse-space-card-row');return !!r&&/8:40 AM/.test(r.textContent)&&/T1/.test(r.textContent)&&!/JX4R2Q/.test(r.textContent);}),'Monday reads at a glance: the flight row shows its time and terminal, not the booking number');
 check(await evaluate(()=>{const c=document.querySelector('.muse-space-card[data-mode=collapsible]');return !!c&&/Karasuma/.test(c.textContent)&&!/HK-88/.test(c.textContent);}),'and the hotel shows its address and check-in until expanded');
 await shoot('content-itinerary');
 const dup=async(which)=>{await evaluate(()=>document.querySelector('.muse-list-section-more').click());await until(()=>!!document.querySelector('.muse-list-section-menu'),'menu');await click('.muse-list-section-menu .popover-choice',which);await wait(1300);};
 await dup('Duplicate structure');
 let secs=await sectionsOf(T);const tue=secs.find(s=>s.id!==mon);
 const tb=(await blocks(T)).filter(b=>b.section_id===tue.id);
 check(secs.length===2&&secs[1].id===tue.id&&tue.title==='Monday copy','Duplicate structure makes a new section right after Monday');
 check(tb.map(b=>b.kind).join()==='card,card,note,link,checklist'&&tb[0].data.display==='row'&&tb[0].data.preview.join()==='departs,terminal','with the same blocks, display modes and preview fields');
 check(tb.filter(b=>b.kind==='card').every(b=>!b.data.title&&b.data.fields.every(x=>!x.value))&&!tb.find(b=>b.kind==='note').data.doc&&!tb.find(b=>b.kind==='link').data.url,'and nothing personal: no values, booking numbers, notes or links');
 check(!(await client.from('list_items').select('id').eq('section_id',tue.id)).data.length&&tb.find(b=>b.kind==='checklist').data.title==='Activities','checklists keep their names but no items or ticks');
 await dup('Duplicate with content');
 secs=await sectionsOf(T);const copy=secs[1];const cb=(await blocks(T)).filter(b=>b.section_id===copy.id);
 check(cb.find(b=>b.data?.title==='Tokyo → Kyoto')?.data.fields.find(x=>x.id==='confirmation').value==='JX4R2Q','Duplicate with content copies the details');
 const ci=(await client.from('list_items').select('*').eq('section_id',copy.id)).data;
 check(ci.length===1&&!ci[0].completed_at&&ci[0].block_id===cb.find(b=>b.kind==='checklist').id,'its checklist items come unticked, in the copied checklist');
 check(!(await client.from('list_item_events').select('id').eq('list_id',T)).data.length,'no history is copied');
 // ---- Home Makeover template still works, and its pieces are all in the picker ----
 await go('/notes?view=lists','!!document.querySelector(".muse-lists-new")','library 2');await wait(900);
 await click('.muse-lists-new','');await until(()=>!!document.querySelector('.muse-space-starts'),'new 2');
 await click('.muse-space-start','Home makeover');await evaluate(()=>document.querySelector('.muse-lists-new-form').requestSubmit());
 await until(()=>document.querySelectorAll('.muse-list-section').length>=3,'makeover');await wait(800);
 check(await evaluate(()=>document.querySelectorAll('.muse-space-card-ghost').length>=3),'the Home Makeover template still lays out its cards');
 // ---- Section tiles bar: hide sits at the right edge and the tiles are whole ----
 check(await evaluate(()=>{const nav=document.querySelector('.muse-space-nav');if(!nav)return true;const n=nav.getBoundingClientRect(),h=nav.querySelector('.muse-space-nav-hide').getBoundingClientRect();const tiles=[...nav.querySelectorAll('li')].map(l=>l.getBoundingClientRect());return n.right-h.right<12&&tiles.every(t=>t.right<=h.left+1&&t.width>60);}),'the hide button sits at the right edge, never over the tiles');
 // ---- Phone ----
 await viewport(390,844,true);
 await go(`/notes?view=lists&list=${T}`,'document.querySelectorAll(".muse-space-cell").length>=5','itinerary phone');await wait(900);
 check(!(await ui.overflow()),'no sideways scrolling on a phone');
 await shoot('content-itinerary-phone',{full:true});
 check(ui.errors.length===0,`no page errors ${ui.errors.slice(0,2).join(' | ')}`);
 console.log(`\n${passed} checks passed. Screenshots: ${shots}`);
}finally{ui?.close();await removeAccount(account.userId);await removeAccount(other.userId);}
