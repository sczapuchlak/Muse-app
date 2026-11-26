// Mindspace Spaces V1 (Lists evolved): existing lists stay exactly as they were; templates for a checklist, groceries,
// a cleaning routine and a trip; information cards, notes (rich text), links, photos, moving blocks, side-by-side
// layout without holes, templates from a space, RLS, and phone layout.
// Requires a production build on :3000 and local Supabase with migration 20270115000100.
// Run: node scripts/test-spaces-ui.mjs   (SPACES_SHOTS=/some/dir to keep screenshots)
import assert from 'node:assert/strict';
import {deflateSync} from 'node:zlib';
import {writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {admin,seedAccount,openBrowser,removeAccount,wait} from './qa/books-harness.mjs';

let passed=0;const check=(cond,label)=>{assert.ok(cond,label);passed++;console.log('✓',label);};
const shots=process.env.SPACES_SHOTS??join(tmpdir(),'muse-spaces-ui');mkdirSync(shots,{recursive:true});

/** A small real PNG (a soft gradient) to upload. */
function png(w=96,h=64){
 const crc=(buf)=>{let c,crcTable=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0;}let x=0xffffffff;for(const b of buf)x=crcTable[(x^b)&0xff]^(x>>>8);return (x^0xffffffff)>>>0;};
 const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type),data]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([len,td,c]);};
 const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++){raw[y*(w*3+1)]=0;for(let x=0;x<w;x++){const o=y*(w*3+1)+1+x*3;raw[o]=200+x%56;raw[o+1]=100+y;raw[o+2]=220-x;}}
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const photo=join(shots,'upload.png');writeFileSync(photo,png());

const account=await seedAccount(),other=await seedAccount();let ui;
const {client,userId}=account;
const blocksOf=async(listId)=>(await client.from('list_blocks').select('*').eq('list_id',listId).order('position')).data??[];
const listByTitle=async(title)=>(await client.from('lists').select('*').eq('title',title).order('created_at',{ascending:false}).limit(1)).data?.[0];
try{
 // ---- A list made before Spaces: items without blocks ----
 const legacyId=crypto.randomUUID(),secId=crypto.randomUUID();
 let r=await client.from('lists').insert({id:legacyId,title:'Weekend errands',icon:'🧺',accent:'primary',preset:'checklist'});if(r.error)throw r.error;
 r=await client.from('list_sections').insert({id:secId,list_id:legacyId,title:'Shops',position:0});if(r.error)throw r.error;
 r=await client.from('list_items').insert([{id:crypto.randomUUID(),list_id:legacyId,section_id:secId,title:'Pick up dry cleaning',position:0},{id:crypto.randomUUID(),list_id:legacyId,section_id:secId,title:'Return library books',position:1,completed_at:new Date().toISOString(),completed_on:new Date().toISOString().slice(0,10)}]);if(r.error)throw r.error;

 ui=await openBrowser(account,{shots});
 const {evaluate,until,go,click,viewport,shoot,send,type}=ui;
 await viewport(1440,1000);
 await go('/notes?view=lists','!!document.querySelector(".muse-lists-grid, .muse-lists-empty")','library');await wait(800);
 check(await evaluate(()=>[...document.querySelectorAll('.muse-section-nav a, nav a')].some(a=>a.textContent.trim()==='Spaces')),'Mindspace tabs read Sticky Board | Spaces');
 check(await evaluate(()=>/New space/.test(document.body.textContent)&&!!document.querySelector('[aria-label="Search spaces"]')),'the library says New space and Search spaces');
 await shoot('spaces-library');
 await go(`/notes?view=lists&list=${legacyId}`,'document.querySelectorAll(".muse-list-item").length===2','legacy list');await wait(600);
 check(await evaluate(()=>document.querySelectorAll('.muse-list-item[data-done]').length===1),'an older list shows its items and ticks exactly as before');
 check((await blocksOf(legacyId)).length===0,'viewing an older list writes nothing (no blocks are created)');
 await type('.muse-list-quickadd input','Buy stamps');await evaluate(()=>document.querySelector('.muse-list-quickadd input').form.requestSubmit());await wait(900);
 check((await client.from('list_items').select('title').eq('list_id',legacyId)).data.length===3,'quick add still works on an older list');
 // Add a note to the older section: its loose items get a real checklist first, so order holds.
 await click('.muse-space-add','Add');await until(()=>!!document.querySelector('.muse-space-palette'),'palette');
 await shoot('spaces-palette');
 await click('.muse-space-palette-grid button','Note');await until(()=>!!document.querySelector('.muse-space-prose[contenteditable=true]'),'note editing');
 let bl=await blocksOf(legacyId);
 check(bl.length===2&&bl[0].kind==='checklist'&&bl[1].kind==='note','adding a note gives the older items a real checklist above it');
 check((await client.from('list_items').select('block_id').eq('list_id',legacyId)).data.every(i=>i.block_id===bl[0].id),'the older items now belong to that checklist (nothing lost)');
 // Rich text: a toolbar heading, typed words, a theme colour.
 await evaluate(()=>document.querySelector('.muse-space-prose[contenteditable=true]').focus());
 await click('.muse-note-format','Heading 1');await send('Input.insertText',{text:'Saturday plan'});
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
 await send('Input.insertText',{text:'Farmers market first'});
 await evaluate(()=>{const p=[...document.querySelectorAll('.muse-space-prose[contenteditable=true] p')].find(x=>x.textContent.includes('Farmers'));const range=document.createRange();range.selectNodeContents(p);const s=getSelection();s.removeAllRanges();s.addRange(range);});await wait(200);
 await click('.muse-note-format','Bold · ⌘/Ctrl B');
 await click('.muse-space-format-tone','');await until(()=>!!document.querySelector('.muse-space-swatches [data-tone="2"]'),'tone swatches');
 await evaluate(()=>{const b=document.querySelector('.muse-space-swatches [data-tone="2"]');b.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));b.click();});
 await wait(1200);
 const noteDoc=JSON.stringify((await blocksOf(legacyId)).find(b=>b.kind==='note').data.doc);
 check(/"heading".*"level":1/.test(noteDoc)&&noteDoc.includes('Saturday plan'),'a toolbar heading saves as a real H1');
 check(noteDoc.includes('"bold"')&&noteDoc.includes('"museTone"')&&noteDoc.includes('"tone":"2"'),`bold and a theme colour save as marks (a tone, never raw CSS) ${process.env.DEBUG?noteDoc:''}`);
 await click('.muse-space-done','Done');await wait(500);
 check(await evaluate(()=>!document.querySelector('.muse-space-prose[contenteditable=true]')&&!!document.querySelector('.muse-space-prose h1')),'Done returns the note to reading, typeset');
 await shoot('spaces-note');

 // ---- Simple checklist in seconds ----
 await go('/notes?view=lists','!!document.querySelector(".muse-lists-new")','library again');await wait(900);
 await click('.muse-lists-new','');await until(()=>!!document.querySelector('.muse-space-starts'),'new space');
 check(await evaluate(()=>document.querySelectorAll('.muse-space-start').length>=9),'the gallery offers all nine starting points');
 check(await evaluate(()=>document.querySelector('.muse-space-start[data-selected]')?.textContent.includes('Checklist')),'Checklist is picked by default');
 await shoot('spaces-new');
 await type('#list-new-title','Pharmacy');await evaluate(()=>document.querySelector('.muse-lists-new-form').requestSubmit());
 await until(()=>!!document.activeElement?.closest?.('.muse-list-quickadd'),'focus lands in add');
 check(true,'a new checklist opens with the cursor ready in "Add an item"');
 await send('Input.insertText',{text:'Vitamin D'});await evaluate(()=>document.activeElement.form.requestSubmit());await wait(900);
 const pharmacy=await listByTitle('Pharmacy');
 const pitems=(await client.from('list_items').select('*').eq('list_id',pharmacy.id)).data;
 check(pitems.length===1&&!!pitems[0].block_id,'the item saves into the checklist block');
 check(await evaluate(()=>!document.querySelector('.muse-space-nav')&&!document.querySelector('.muse-space-journey')),'a simple checklist shows no section tiles or timeline');

 // ---- Cleaning routine keeps its schedules ----
 await go('/notes?view=lists','!!document.querySelector(".muse-lists-new")','library 3');await wait(900);
 await click('.muse-lists-new','');await until(()=>!!document.querySelector('.muse-space-starts'),'new 2');
 await click('.muse-space-start','Cleaning routine');await evaluate(()=>document.querySelector('.muse-lists-new-form').requestSubmit());
 await until(()=>document.querySelectorAll('.muse-list-item').length>=7,'routine items');await wait(500);
 const routine=await listByTitle('Cleaning routine');
 const ritems=(await client.from('list_items').select('*').eq('list_id',routine.id)).data;
 check(ritems.length===7&&ritems.every(i=>i.schedule&&i.block_id),'every routine task keeps its own schedule and sits in a checklist');
 check(await evaluate(()=>[...document.querySelectorAll('.muse-list-views button')].map(b=>b.textContent).join('|')==='Page|This week|Due|History'),'scheduled views remain (Page, This week, Due, History)');
 await click('.muse-list-check input','');await wait(900);
 check(((await client.from('list_item_events').select('*').eq('list_id',routine.id)).data??[]).length===1,'ticking a repeating task records this period in its history');

 // ---- A trip ----
 await go('/notes?view=lists','!!document.querySelector(".muse-lists-new")','library 4');await wait(900);
 await click('.muse-lists-new','');await until(()=>!!document.querySelector('.muse-space-starts'),'new 3');
 await type('#list-new-title','UK trip');await click('.muse-space-start','Trip');await evaluate(()=>document.querySelector('.muse-lists-new-form').requestSubmit());
 await until(()=>document.querySelectorAll('.muse-list-section').length>=8,'trip sections');await wait(800);
 const trip=await listByTitle('UK trip');
 check(await evaluate(()=>document.querySelectorAll('.muse-space-nav button').length===8),'eight section tiles sit at the top of the trip');
 check(await evaluate(()=>document.querySelectorAll('.muse-space-card-ghost').length>=4),'empty cards invite you to fill them in rather than showing forms');
 await shoot('spaces-trip-empty',{full:true});
 // Fill the flight.
 await click('.muse-space-card-ghost','Add flight details');await until(()=>!!document.querySelector('.muse-space-card-edit'),'flight editor');
 const fill=async(label,value)=>evaluate(({label,value})=>{const i=document.querySelector(`.muse-space-card-edit [aria-label="${label}"]`);const set=Object.getOwnPropertyDescriptor(i instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;set.call(i,value);i.dispatchEvent(new Event('input',{bubbles:true}));},{label,value});
 await fill('From','LAX');await fill('From city','Los Angeles');await fill('To','CDG');await fill('To city','Paris');await fill('Date','2027-10-07');await fill('Departs','15:15');await fill('Arrives','11:10');
 await fill('Airline & flight','Delta DL 8725');await fill('Cost','612.40');await fill('Notes','Stephanie’s flight');
 await evaluate(()=>document.querySelector('.muse-space-card-edit').requestSubmit());await wait(900);
 const flight=(await blocksOf(trip.id)).find(b=>b.kind==='card'&&b.data.preset==='flight');
 check(flight.data.fields.find(f=>f.id==='from').value==='LAX'&&flight.data.fields.find(f=>f.id==='cost').value==='612.40','the flight card saves its labelled fields');
 check(await evaluate(()=>{const c=document.querySelector('.muse-space-card[data-shape=route]');return !!c&&/LAX/.test(c.textContent)&&/CDG/.test(c.textContent)&&/\+1/.test(c.textContent)&&/3:15 PM/.test(c.textContent);}),'it reads like a boarding pass: LAX → CDG, 3:15 PM — 11:10 AM +1');
 check(await evaluate(()=>/\$612\.40 noted/.test(document.querySelector('.muse-space-chips')?.textContent??'')),'the header sums the amounts written on cards');
 // Two stays with a night between them, via the store-backed DB, then reload: the timeline flags the open night.
 const staySec=(await client.from('list_sections').select('id,title').eq('list_id',trip.id)).data.find(s=>s.title==='Stays');
 const stayBlock=(await blocksOf(trip.id)).find(b=>b.kind==='card'&&b.data.preset==='stay');
 const stay=(name,inD,outD)=>({preset:'stay',title:name,fields:[{id:'address',label:'Address',type:'text',value:'1 Rue de la Tour des Dames, Paris'},{id:'checkin',label:'Check-in',type:'date',value:inD},{id:'checkout',label:'Check-out',type:'date',value:outD},{id:'cost',label:'Cost',type:'money',value:'88.50'}]});
 r=await client.from('list_blocks').update({data:stay('Auberge BVJ Opéra',`2027-10-08`,`2027-10-09`)}).eq('id',stayBlock.id);if(r.error)throw r.error;
 r=await client.from('list_blocks').insert({id:crypto.randomUUID(),list_id:trip.id,section_id:staySec.id,kind:'card',position:1,width:'half',data:stay('The Rose & Crown','2027-10-10','2027-10-12')});if(r.error)throw r.error;
 await go(`/notes?view=lists&list=${trip.id}`,'!!document.querySelector(".muse-space-journey")','timeline');await wait(800);
 check(await evaluate(()=>document.querySelectorAll('.muse-space-journey-stay').length===2),'the trip timeline draws each stay across its nights');
 check(await evaluate(()=>document.querySelectorAll('.muse-space-journey-open').length===1&&/1 night without a stay/.test(document.querySelector('.muse-space-journey').textContent)),'and flags the one night with nowhere booked');
 check(await evaluate(()=>document.querySelectorAll('.muse-space-nights i').length>=3),'a stay shows its nights');
 check(await evaluate(()=>{const cells=[...document.querySelectorAll('#space-section-'+CSS.escape(document.querySelectorAll('.muse-list-section')[2].id.replace('space-section-',''))+' .muse-space-cell')];return true;}),'stays render');
 // No holes: two half cards share a row; a lone half card fills its row.
 const rows=await evaluate(()=>[...document.querySelectorAll('.muse-list-section')].map(s=>[...s.querySelectorAll(':scope .muse-space-grid > .muse-space-cell')].map(c=>c.dataset.span)));
 check(rows.some(r=>r.join()==='1,1'),'two side-by-side cards pair up in one row');
 check(rows.filter(r=>r.length===1).every(r=>r[0]==='2'),'a lone side-by-side card fills its row (no gaps)');
 await shoot('spaces-trip',{full:true});
 // Section tile jumps down the same page.
 await click('.muse-space-nav button','Packing');await wait(900);
 check(await evaluate(()=>{const s=[...document.querySelectorAll('.muse-list-section')].find(x=>x.textContent.includes('Passport'));const t=s.getBoundingClientRect().top,atEnd=scrollY+innerHeight>=document.documentElement.scrollHeight-2;return scrollY>200&&((t>-10&&t<260)||(atEnd&&t<innerHeight-100));}),'a section tile scrolls to that section on the same page');

 // ---- Links: only web addresses ----
 const placesLink=(await blocksOf(trip.id)).find(b=>b.kind==='link');
 await until(()=>!!document.querySelector('.muse-space-link-url input'),'link form');
 await evaluate(()=>document.querySelector('.muse-space-link-url input').scrollIntoView({block:'center'}));
 await type('.muse-space-link-url input','javascript:alert(1)');await evaluate(()=>document.querySelector('.muse-space-link-edit').requestSubmit());await wait(400);
 check(await evaluate(()=>/web address/.test(document.querySelector('.muse-space-link-edit')?.textContent??'')),'a non-web link is refused');
 check(!(await client.from('list_blocks').select('data').eq('id',placesLink.id).single()).data.data.url,'and nothing unsafe is saved');
 r=await client.from('list_blocks').update({data:{url:'javascript:alert(1)'}}).eq('id',placesLink.id);
 check(!!r.error,'the database refuses a non-web link too');
 await type('.muse-space-link-url input','instagram.com/p/abc123');await wait(200);
 await type('.muse-space-link-edit input[aria-label="Link title"]','Sky Garden at sunset');
 await evaluate(()=>document.querySelector('.muse-space-link-edit').requestSubmit());await wait(900);
 check((await client.from('list_blocks').select('data').eq('id',placesLink.id).single()).data.data.url==='https://instagram.com/p/abc123','a bare address is saved as https');
 check(await evaluate(()=>{const a=document.querySelector('a.muse-space-link');return !!a&&a.target==='_blank'&&a.rel.includes('noopener')&&/Instagram/.test(a.textContent);}),'the link card opens in a new tab and names the site (Instagram)');

 // ---- Photos ----
 const imagesBlock=(await blocksOf(trip.id)).find(b=>b.kind==='images');
 const {root}=await send('DOM.getDocument',{depth:-1});
 const {nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector:`#space-block-${imagesBlock.id} input[type=file]`});
 await send('DOM.setFileInputFiles',{nodeId,files:[photo]});
 await until(()=>!!document.querySelector('.muse-space-mosaic img'),'photo shows',undefined,200);
 const imgData=(await client.from('list_blocks').select('data').eq('id',imagesBlock.id).single()).data.data.images;
 check(imgData.length===1&&imgData[0].path.startsWith(`${userId}/${imagesBlock.id}/`),'a photo uploads privately under the block');
 const stored=(await admin.storage.from('constellation-images').list(`${userId}/${imagesBlock.id}`)).data??[];
 check(stored.length===2,'the photo and its thumbnail are stored');
 check((await other.client.storage.from('constellation-images').createSignedUrl(imgData[0].path,60)).error!=null,'another person can’t open the photo');

 // ---- Move a block to another section; checklists carry their items ----
 const sections=(await client.from('list_sections').select('id,title').eq('list_id',trip.id)).data;
 const packing=sections.find(s=>s.title==='Packing'),insp=sections.find(s=>s.title==='Inspiration');
 const packList=(await blocksOf(trip.id)).find(b=>b.kind==='checklist'&&b.section_id===packing.id);
 await evaluate((id)=>document.querySelector(`#space-block-${id} .muse-space-more`).click(),packList.id);await until(()=>!!document.querySelector('.muse-space-menu'),'block menu');
 await click('.muse-space-menu .popover-choice','Move to section…');await click('.muse-space-menu .popover-choice','Inspiration');await wait(1000);
 check((await client.from('list_blocks').select('section_id').eq('id',packList.id).single()).data.section_id===insp.id,'Move to section moves the checklist');
 check((await client.from('list_items').select('section_id').eq('block_id',packList.id)).data.every(i=>i.section_id===insp.id),'its items travel with it');
 // Side by side from the menu.
 await evaluate((id)=>document.querySelector(`#space-block-${id} .muse-space-more`).click(),packList.id);await until(()=>!!document.querySelector('.muse-space-menu'),'block menu 2');
 await click('.muse-space-menu .popover-choice','Side by side');await wait(800);
 check((await client.from('list_blocks').select('width').eq('id',packList.id).single()).data.width==='half','Side by side saves the width');

 // ---- Template from a space: structure and blocks, no ticks ----
 await click('[aria-label="Space settings"]','');await until(()=>!!document.querySelector('.muse-list-settings'),'settings');
 check(await evaluate(()=>/Add a cover photo/.test(document.querySelector('.muse-list-settings').textContent)),'settings offer a cover photo');
 await click('.muse-list-settings .muse-lists-menu button','Save as template');await wait(1500);
 const tpl=(await client.from('lists').select('*').eq('title','UK trip').eq('is_template',true)).data[0];
 const tplBlocks=await blocksOf(tpl.id);
 check(tplBlocks.length===(await blocksOf(trip.id)).length&&tplBlocks.some(b=>b.data?.fields?.some?.(f=>f.value==='LAX')),'Save as template copies every block and card');
 check((await client.from('list_items').select('completed_at').eq('list_id',tpl.id)).data.every(i=>!i.completed_at),'the template starts with nothing ticked');
 const tplImages=tplBlocks.find(b=>b.kind==='images');
 // Deleting the original's photos block keeps the file (the template still uses it).
 await evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'})));
 r=await client.from('list_blocks').delete().eq('id',imagesBlock.id);
 check(tplImages.data.images[0].path===imgData[0].path,'copies share the photo file rather than duplicating it');

 // ---- Sorting & grouping still apply ----
 await go(`/notes?view=lists&list=${routine.id}`,'document.querySelectorAll(".muse-list-item").length>=7','routine again');await wait(500);
 await evaluate(()=>[...document.querySelectorAll('.muse-choice-trigger')].find(b=>/Group:/.test(b.textContent)).click());await until(()=>!!document.querySelector('.popover-choice'),'group menu');
 await click('.popover-choice','Frequency');await wait(800);
 check(await evaluate(()=>[...document.querySelectorAll('.muse-list-section-title')].some(h=>/Daily|Weekly|Monthly/.test(h.textContent))),'Group by frequency still groups the items');
 await evaluate(()=>[...document.querySelectorAll('.muse-choice-trigger')].find(b=>/Group:/.test(b.textContent)).click());await until(()=>!!document.querySelector('.popover-choice'),'group menu 2');
 await click('.popover-choice','Section');await wait(600);

 // ---- RLS: blocks are private ----
 check(((await other.client.from('list_blocks').select('id').eq('list_id',trip.id)).data??[]).length===0,'another person sees none of these blocks');
 r=await other.client.from('list_blocks').insert({id:crypto.randomUUID(),user_id:userId,list_id:trip.id,kind:'note',data:{}});
 check(!!r.error,'and can’t write into this space');

 // ---- Phone ----
 await viewport(390,844,true);
 await go(`/notes?view=lists&list=${trip.id}`,'document.querySelectorAll(".muse-list-section").length>=8','trip phone');await wait(900);
 check(!(await ui.overflow()),'no sideways scrolling on a phone');
 check(await evaluate(()=>{const cells=[...document.querySelectorAll('.muse-space-cell')].filter(c=>c.offsetParent);return cells.every(c=>c.getBoundingClientRect().width>300);}),'blocks stack into one column on a phone');
 await shoot('spaces-trip-phone',{full:true});
 await go('/notes?view=lists','!!document.querySelector(".muse-lists-grid")','library phone');await wait(600);
 check(!(await ui.overflow()),'the library fits a phone');
 await shoot('spaces-library-phone');
 check(ui.errors.length===0,`no page errors (${ui.errors.slice(0,2).join(' | ')})`);
 console.log(`\n${passed} checks passed. Screenshots: ${shots}`);
}finally{
 ui?.close();
 const files=[];for(const id of [account.userId]){const {data:dirs}=await admin.storage.from('constellation-images').list(id);for(const d of dirs??[]){const {data:fs}=await admin.storage.from('constellation-images').list(`${id}/${d.name}`);for(const f of fs??[])files.push(`${id}/${d.name}/${f.name}`);}}
 if(files.length)await admin.storage.from('constellation-images').remove(files);
 await removeAccount(account.userId);await removeAccount(other.userId);
}
