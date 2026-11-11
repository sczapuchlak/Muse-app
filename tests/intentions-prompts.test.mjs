import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';
const L=load('lib/intentions/prompts'),M=load('lib/intentions/model'),read=f=>readFileSync(resolve(root,f),'utf8');
const periods=['week','month','quarter','year'];

test('#130 every period has its own substantial prompt library, with no prompt shared between periods',()=>{
 const minimum={week:16,month:20,quarter:18,year:20};
 for(const p of periods)assert.ok(L.promptLibrary[p].length>=minimum[p],`${p} has ${L.promptLibrary[p].length} prompts`);
 const questions=L.allLibraryPrompts.map(x=>x.question.toLowerCase()),titles=new Map();
 assert.equal(new Set(questions).size,questions.length,'no repeated question anywhere');
 for(const x of L.allLibraryPrompts){const key=`${x.period}/${x.title.toLowerCase()}`;assert.ok(!titles.has(key),`duplicate title ${key}`);titles.set(key,1);}
 assert.equal(new Set(L.allLibraryPrompts.map(x=>x.id)).size,L.allLibraryPrompts.length,'ids are unique and stable');
});

test('#130 prompts fit the section model: short titles, bounded questions, real categories, period-fitting categories',()=>{
 const cats=new Set(L.promptCategories.map(c=>c.id));
 for(const x of L.allLibraryPrompts){
  assert.ok(x.title.length>0&&x.title.length<=60,`${x.id} title`);
  assert.ok(x.question.length>10&&x.question.length<=M.MAX_QUESTION,`${x.id} question length`);
  assert.ok(cats.has(x.category)&&['writing','list'].includes(x.kind),x.id);
  assert.ok(x.id.startsWith(x.period[0]+'-'),`${x.id} is namespaced by period`);
  assert.match(x.id,/^[a-z0-9-]{1,60}$/,'ids satisfy the database key check');
 }
 for(const p of ['week','month'])assert.ok(!L.promptLibrary[p].some(x=>x.category==='vision'),`${p} stays practical, with no vision-level prompts`);
 for(const p of ['quarter','year'])assert.ok(L.promptLibrary[p].some(x=>x.category==='vision'),`${p} reaches for the bigger picture`);
 for(const p of periods)for(const id of L.featuredPromptIds[p])assert.equal(L.libraryPrompt(id)?.period,p,'featured prompts belong to their period');
 for(const p of periods)assert.ok(L.featuredPromptIds[p].length>=4);
});

test('#130 search and category filtering never mixes in other periods',()=>{
 const week=L.promptLibrary.week;
 assert.equal(L.filterPrompts(week,'all','').length,week.length);
 assert.ok(L.filterPrompts(week,'rest'.length?'body':'all','').every(x=>x.category==='body'));
 assert.ok(L.filterPrompts(week,'all','rest').every(x=>/rest/i.test(x.title+x.question)));
 assert.ok(L.filterPrompts(week,'all','sunday night').length>=1,'words match across title and question');
 assert.equal(L.filterPrompts(week,'all','zzzz').length,0);
});

test('#130 a prompt becomes an ordinary section that remembers its question, and saved pages keep it',()=>{
 const p=L.promptLibrary.month.find(x=>x.kind==='list'),w=L.promptLibrary.month.find(x=>x.kind==='writing');
 const list=M.promptSection(p,'s1'),writing=M.promptSection(w,'s2');
 assert.equal(list.type,'list');assert.deepEqual(list.content.items,[]);assert.equal(list.content.question,p.question);
 assert.equal(writing.type,'writing');assert.equal(writing.content.text,'');assert.equal(writing.content.question,w.question);
 const parsed=M.parseSections([list,writing]);
 assert.equal(parsed[0].content.question,p.question);assert.equal(parsed[1].content.question,w.question);
 // Existing sections and templates are untouched: no question appears, and old pages parse as before.
 const old=M.parseSections([{id:'a',type:'writing',title:'My intention',content:{prompt:'intention',text:'hello'}}]);
 assert.equal(old[0].content.text,'hello');assert.ok(!('question' in old[0].content));
 assert.equal(M.seedSections('month',()=>'x').some(s=>'question' in s.content),false,'templates carry no question');
 // Bounded and trimmed
 const long=M.promptSection({kind:'writing',title:'t'.repeat(90),question:'q'.repeat(500)},'z');
 assert.equal(long.title.length,60);assert.equal(long.content.question.length,M.MAX_QUESTION);
 assert.equal(M.promptSection({kind:'writing',title:'  ',question:'Hi?'},'z').title,'A question for me');
});

test('#130 editing writing in a prompt section keeps its question, and hiding or removing still follows existing rules',()=>{
 const s=M.promptSection({kind:'writing',title:'Rest',question:'Where will rest fit?'},'s1');
 assert.equal(M.hasContent(s),false);
 const written={...s,content:{...s.content,text:'Sunday morning.'}};
 assert.equal(M.hasContent(written),true);
 assert.equal(M.removeSection([written],'s1').needsConfirmation,true,'content needs confirmation to delete');
 assert.equal(M.parseSections([written])[0].content.question,'Where will rest fit?');
});

test('#130 prompt storage is owner-only, additive and bounded; the app is wired without touching other tables',()=>{
 const sql=read('supabase/migrations/20261211000100_intention_prompts.sql');
 assert.match(sql,/create table public\.intention_prompts/);assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.intention_prompts from public, anon, authenticated/);
 for(const p of ['owner_read','owner_insert','owner_update','owner_delete'])assert.match(sql,new RegExp(`create policy ${p} on public\\.intention_prompts`));
 assert.doesNotMatch(sql,/\b(drop|alter table public\.(?!intention_prompts))\b/i,'additive only');
 assert.match(sql,/unique index intention_prompts_one_favorite/);
 const store=read('lib/intentions/prompt-store.ts');
 assert.doesNotMatch(store,/\.from\('(?!intention_prompts)/);assert.doesNotMatch(store,/\.from\("(?!intention_prompts)/);
 const ui=read('components/planner/intentions/Intentions.tsx');
 assert.match(ui,/PromptLibrary/);assert.match(ui,/promptSection/);
 assert.match(read('app/api/account/export/route.ts'),/intention_prompts/,'prompts are part of Export your data');
});
