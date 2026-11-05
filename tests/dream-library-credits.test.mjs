import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {load,root} from './helpers.mjs';
const read=file=>readFileSync(root+'/'+file,'utf8');

test('the vendored dataset is unchanged and every imported entry links back to its source',()=>{
 const raw=JSON.parse(read('content/whimsy/dream-symbols-heartyearning.json'));assert.equal(raw.length,985,'kept verbatim');
 const {dreamSymbols,HEARTYEARNING}=load('lib/whimsy/dreams');
 const urls=new Set(raw.map(r=>r.url));for(const s of dreamSymbols.filter(s=>s.provider==='heartyearning'))assert.ok(urls.has(s.sourceUrl));
 assert.equal(HEARTYEARNING.site,'https://tool.heartyearning.com');
});

test('the Encyclopedia and entry pages credit HeartYearning and link to Open Source & Credits',()=>{
 const list=read('components/whimsy/Dreamscapes.tsx'),entry=read('components/whimsy/encyclopedia/DreamEncyclopediaEntry.tsx');
 for(const src of [list,entry]){assert.match(src,/powered by the <a href=\{HEARTYEARNING\.site\}/);assert.match(src,/href="\/settings#credits"/);}
 assert.match(entry,/<figcaption className="small-label">\{item\.title\} · <a href=\{item\.url\}/,'each interpretation names and links its source');
 assert.match(read('components/whimsy/dreams/DreamLibrary.tsx'),/const page=paginate\(results,pageNo,PAGE\)/,'the encyclopedia list pages instead of rendering every symbol');
 assert.match(list,/Search to find any of \$\{allSymbols\.length\} symbols\./,'the diary picker does not render every symbol');
});

test('Settings lists third-party content and software with licenses',async()=>{
 const {contentCredits,softwareCredits}=load('lib/credits');
 assert.ok(contentCredits.some(c=>c.name==='HeartYearning Dream Symbols Dataset'&&c.links.some(l=>l.href==='https://tool.heartyearning.com')));
 for(const c of [...contentCredits,...softwareCredits]){assert.ok(c.license&&c.use&&c.links.length);for(const l of c.links)assert.match(l.href,/^https:\/\//);}
 const deps=Object.keys(JSON.parse(read('package.json')).dependencies);
 for(const [dep,name] of [['next','Next.js'],['react','React'],['@supabase/supabase-js','Supabase'],['astronomy-engine','Astronomy Engine'],['recharts','Recharts'],['emojibase-data','Emojibase']])if(deps.includes(dep))assert.ok([...contentCredits,...softwareCredits].some(c=>c.name===name),`${dep} is credited`);
 const React=await import('react'),{Settings}=load('components/Settings'),{AccountPreferencesContext}=load('components/AccountPreferences');
 const status={loaded:true,pending:false,error:'',draft:{},saved:{email:'owner@example.test',profile:{id:'owner',time_zone:'UTC',time_zone_confirmed_at:null,cosmic_enabled:true,zodiac_sign:null}}};
 const html=renderToStaticMarkup(React.createElement(AccountPreferencesContext.Provider,{value:{subscribe:()=>()=>{},getSnapshot:()=>status}},React.createElement(Settings,{version:'0.1.0'})));
 assert.match(html,/id="credits"/);assert.match(html,/Open Source &amp; Credits/);assert.match(html,/HeartYearning Dream Symbols Dataset/);
});
