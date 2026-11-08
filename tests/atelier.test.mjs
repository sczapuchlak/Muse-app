import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {root,load} from './helpers.mjs';
import {renderCatalog} from '../scripts/generate-atelier-catalog.mjs';

const read=path=>readFileSync(join(root,path),'utf8');
const model=load('lib/atelier/model'),values=load('lib/atelier/css-values'),tokens=load('lib/atelier/tokens'),{themes,allThemes}=load('lib/themes');

test('the catalog is generated from the CSS that renders the official themes',()=>{
 assert.equal(read('lib/atelier/catalog.generated.ts'),renderCatalog(),'run node scripts/generate-atelier-catalog.mjs');
 const {officialTokenValues}=load('lib/atelier/catalog.generated');
 assert.deepEqual(Object.keys(officialTokenValues).sort(),allThemes.map(t=>t.id).sort(),'every registry theme (and Theme Lab palette) has tokens');
 const names=JSON.stringify(Object.keys(officialTokenValues.iridescent));
 const roleOnly=n=>/^--(frosted-)?tone-/.test(n)||/^--atmosphere-(bloom|pool|haze)-layers$/.test(n);
 for(const theme of themes)assert.equal(JSON.stringify(Object.keys(officialTokenValues[theme.id]).filter(n=>!roleOnly(n))),names,`${theme.id} defines the shared token set (plus optional #111 surface tones)`);
});

test('Theme Atelier only reaches theme colour and atmosphere tokens, never the universal design system',()=>{
 const editable=Object.keys(tokens.tokenInfo);
 assert.ok(editable.length>=130);
 for(const name of editable)assert.doesNotMatch(name,/radius|space|spacing|font|size-(xs|sm|md|lg)|touch-target|type-|dl-radius|dl-pad/,`${name} must stay universal`);
 assert.equal('--color-scheme' in tokens.tokenInfo,false,'light/dark scheme follows the base theme');
 assert.equal(tokens.tokenInfo['--mood-red'].section,'advanced','mood colours live in Advanced');
 assert.match(tokens.tokenInfo['--mood-red'].hint,/meaning/);
});

test('every built-in atmosphere layer of every official theme round-trips through the editor',()=>{
 let count=0;
 for(const theme of themes){const definition=model.emptyDefinition(theme.id);
  for(const plane of model.planesFor(theme.id)){
   const sources=values.splitTopLevel(model.planeSource(plane,theme.id)),layers=model.builtInLayers(plane,definition);
   assert.equal(layers.length,sources.length,`${theme.id} ${plane}`);
   const norm=s=>s.replace(/var\((--[\w-]+)\)/g,(x,n)=>/size|position/.test(n)?model.resolveToken(definition,n):x).replace(/\s+/g,' ').replace(/, /g,',').replace(/\b0\./g,'.');
   layers.forEach((layer,i)=>{count++;assert.equal(norm(model.formatLayer(layer)),norm(sources[i]),`${theme.id} ${plane} ${i}`);});
  }}
 assert.ok(count>=150,`${count} layers`);
});

test('an untouched remix compiles to nothing, so official themes render exactly as before',()=>{
 for(const theme of themes)assert.equal(model.compileTheme(model.emptyDefinition(theme.id),'applied').css,'');
});

test('values are allow-listed: no url, rules, strings or unknown tokens can reach CSS',()=>{
 const known=tokens.referenceableTokens;
 for(const ok of ['#ff159b','rgba(0,238,255,.25)','linear-gradient(115deg,rgba(0,238,255,.18),var(--accent-pink) 48%)','color-mix(in srgb,var(--chart-2) 48%,transparent)','0 8px 26px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.08)','520px 460px','3% 22svh'])assert.ok(values.isSafeCssValue(ok,known),ok);
 for(const bad of ['url(https://x)','red;}body{background:red','red}','"quoted"',"'x'",'@import x','expression(alert(1))','var(--not-a-token)','image-set(x)','red !important','\\61','javascript:1','<script>'])assert.equal(values.isSafeCssValue(bad,known),false,bad);
 const compiled=model.compileTheme({...model.emptyDefinition('disco-damage'),tokens:{'--foreground':'url(x)','--glass-background':'rgba(14,15,17,.74)','--not-real':'#fff','--color-scheme':'light'}},'preview');
 assert.equal(compiled.css.includes('url('),false);assert.equal(compiled.css.includes('--not-real'),false);assert.equal(compiled.css.includes('color-scheme'),false);
 assert.match(compiled.css,/:root\[data-theme\]\[data-atelier="preview"\]\{--glass-background:rgba\(14,15,17,\.74\)\}/);
 assert.match(compiled.css,/\[data-material="frosted"\]\{--glass-background:var\(--frosted-glass-background\)\}/,'Frosted keeps its own surfaces');
 assert.throws(()=>model.compileTheme(model.emptyDefinition('astral'),'x"]{}body{'),/scope/);
});

test('saved and imported themes are validated, clamped and limited',()=>{
 assert.equal(model.validateDefinition(null).ok,false);
 assert.equal(model.validateDefinition({schema:2,base:'astral'}).ok,false);
 assert.equal(model.validateDefinition({schema:1,base:'not-a-theme'}).ok,false);
 const glow=load('lib/atelier/presets').newGlow(model.emptyDefinition('astral'));
 const result=model.validateDefinition({schema:1,base:'astral',tokens:{'--accent-pink':'#ff00aa','--evil':'red','--foreground':'url(x)'},custom:Array.from({length:12},()=>({...glow,opacity:500,blend:'exclusion'})),effects:{brightness:9999,stars:'galaxy'},planes:{bloom:[{type:'radial',stops:[]}]}});
 assert.ok(result.ok);
 assert.deepEqual(result.definition.tokens,{'--accent-pink':'#ff00aa'});
 assert.deepEqual(result.dropped.sort(),['--evil','--foreground','Blooms'].sort());
 assert.equal(result.definition.custom.length,model.MAX_CUSTOM_LAYERS);
 assert.equal(result.definition.custom[0].opacity,100);assert.equal(result.definition.custom[0].blend,undefined);
 assert.equal(result.definition.effects.brightness,180);assert.equal(result.definition.effects.stars,'normal');
});

test('theme files export and import without executing anything',()=>{
 const definition={...model.emptyDefinition('prism-noir'),tokens:{'--accent-pink':'#ff66cc'}};
 const back=model.importTheme(model.exportTheme('Hex Remix',definition));
 assert.ok(back.ok);assert.equal(back.name,'Hex Remix');assert.deepEqual(back.definition,definition);
 assert.equal(model.importTheme('{"muse-theme":2}').ok,false);assert.equal(model.importTheme('not json').ok,false);
 assert.equal(model.importTheme('x'.repeat(400_001)).ok,false);
});

test('glows: circles take one absolute radius, blends compile per visible layer',()=>{
 const {newGlow}=load('lib/atelier/presets');const base=model.emptyDefinition('afterglow');
 const glow=newGlow(base,{x:30,y:500});
 assert.match(model.formatLayer(glow),/^radial-gradient\(ellipse 380px 300px at 30% 500px,/);
 assert.match(model.formatLayer({...glow,shape:'circle',w:{v:20,u:'%'}}),/^radial-gradient\(circle 256px at 30% 500px,/);
 const css=model.compileTheme({...base,custom:[glow,{...glow,id:'b',blend:undefined},{...glow,id:'c',on:false,blend:'lighten'}]},'preview').css;
 assert.match(css,/--atmosphere-custom-blend:screen,normal;?/);
 assert.match(read('app/atmosphere.css'),/background-blend-mode:var\(--atmosphere-custom-blend,normal\)/);
});

test('Disco can be restored in a remix without touching Disco itself',()=>{
 const {withOriginalDiscoLight,withOriginalDiscoAtmosphere}=load('lib/atelier/presets');
 const restored=withOriginalDiscoAtmosphere(withOriginalDiscoLight(model.emptyDefinition('disco-damage')));
 assert.equal(restored.planes.discoSpill.length,7);assert.equal(restored.planes.discoCaustic.length,6);
 assert.equal(restored.planes.discoCaustic[0].type,'linear');assert.equal(restored.tokens['--background'],'#0c071a');
 assert.match(model.compileTheme(restored,'preview').css,/--disco-caustic-layers:linear-gradient\(118deg/);
 const themesCss=read('app/themes.css');assert.match(themesCss,/--background: #050507/,'official Disco is unchanged');
});

test('the atmosphere refactor keeps every official layer in one token per plane',()=>{
 const css=read('app/atmosphere.css'),disco=read('components/DiscoAtmosphere.css');
 for(const name of ['--atmosphere-bloom-layers','--atmosphere-pool-layers','--atmosphere-haze-layers','--disco-reflection-layers','--atmosphere-star-opacity:1','--atmosphere-star-glow:1','--atmosphere-filter:none','--atmosphere-custom-layers:none','--atmosphere-vignette:none'])assert.ok(css.includes(name),name);
 assert.match(css,/:root\[data-theme="disco-damage"\] \{ --atmosphere-pool-layers:/);
 for(const name of ['--disco-spill-layers','--disco-caustic-layers','calc(3px * var(--atmosphere-star-glow))'])assert.ok(disco.includes(name),name);
 assert.match(read('components/PrismaticSvg.css'),/calc\(3px \* var\(--icon-glow, 1\)\)/);
});

test('icon gradient geometry defaults to the original diagonal',()=>{
 const icon=load('lib/atelier/icon-gradient');
 assert.deepEqual(icon.iconGradientAttributes(icon.defaultIconGeometry),{x1:'0%',y1:'0%',x2:'100%',y2:'100%',middle:'.5'});
 assert.deepEqual(icon.iconGradientAttributes({angle:0,middle:30}),{x1:'0%',y1:'50%',x2:'100%',y2:'50%',middle:'0.3'});
 assert.deepEqual(icon.iconGradientAttributes({angle:90,middle:50}),{x1:'50%',y1:'0%',x2:'50%',y2:'100%',middle:'.5'});
});

test('undo history merges a drag into one step and redoes it',()=>{
 const h=load('lib/atelier/history');let s=h.startHistory('a');
 s=h.record(s,'b','slider',1000);s=h.record(s,'c','slider',1300);s=h.record(s,'d','other',1400);
 assert.deepEqual(s.past,['a','c']);s=h.undo(s);assert.equal(s.present,'c');s=h.undo(s);assert.equal(s.present,'a');s=h.redo(s);assert.equal(s.present,'c');
 s=h.record(s,'x','slider',99999);assert.deepEqual(s.future,[],'a new edit clears redo');
});

test('contrast uses WCAG luminance on composited colours',()=>{
 const c=load('lib/atelier/contrast');
 assert.equal(c.contrastRatio({r:0,g:0,b:0,a:1},{r:255,g:255,b:255,a:1}),21);
 const half=c.composite({r:255,g:255,b:255,a:.5},{r:0,g:0,b:0,a:1});assert.equal(Math.round(half.r),128);
 assert.equal(c.contrastLevel({ratio:4.6,minimum:4.5}),'pass');assert.equal(c.contrastLevel({ratio:3.8,minimum:4.5}),'close');assert.equal(c.contrastLevel({ratio:2,minimum:4.5}),'fail');
});

test('theme storage is private: owner-only RLS, bounded rows, additive migration',()=>{
 const sql=read('supabase/migrations/20261108000100_theme_atelier.sql');
 for(const table of ['atelier_themes','appearance_preferences']){assert.match(sql,new RegExp(`create table public\\.${table}`));}
 assert.match(sql,/enable row level security/);assert.match(sql,/revoke all on public\.%I from anon, authenticated/);
 for(const policy of ['owner_read','owner_insert','owner_update'])assert.match(sql,new RegExp(`create policy ${policy} on public\\.%I .*\\(select auth\\.uid\\(\\)\\) = user_id`));
 assert.match(sql,/create policy owner_delete on public\.atelier_themes/);assert.doesNotMatch(sql,/delete on public\.appearance_preferences/);
 assert.match(sql,/pg_column_size\(definition\) <= 65536/);assert.match(sql,/>= 200/);
 assert.doesNotMatch(sql,/\b(drop|truncate|delete from)\b/i,'nothing existing is removed');
});

test('applying a remix is explicit and choosing an official theme leaves it',()=>{
 const pref=read('lib/theme-preference.ts');assert.match(pref,/if \(!keepAtelier && window\.localStorage\.getItem\(ATELIER_STORAGE_KEY\) !== null\)/);
 const studio=read('components/atelier/AtelierStudio.tsx');assert.match(studio,/applyAtelier\(\{id:result\.id/);
 assert.doesNotMatch(read('components/atelier/AtelierPreview.tsx'),/AppearanceBridge userId|applyAtelier|selectTheme/,'the preview never changes the real appearance');
 assert.match(read('components/atelier/PreviewFrame.tsx'),/event\.origin!==window\.location\.origin\|\|event\.source!==frame\.current\?\.contentWindow/,'messages are same-origin and from our frame only');
 assert.match(read('components/atelier/AtelierPreview.tsx'),/event\.origin!==window\.location\.origin\|\|event\.source!==window\.parent/);
});

test('freezing writes out the whole appearance so official updates cannot move it',()=>{
 const {newGlow}=load('lib/atelier/presets');
 const remix={...model.emptyDefinition('disco-damage'),tokens:{'--accent-pink':'#ff66cc'},custom:[newGlow(model.emptyDefinition('disco-damage'))]};
 const frozen=model.freezeDefinition(remix);
 assert.equal(frozen.frozen,true);assert.equal(frozen.baseFingerprint,model.baseFingerprint('disco-damage'));
 for(const name of Object.keys(tokens.tokenInfo))assert.equal(model.resolveToken(frozen,name),model.resolveToken(remix,name),name);
 assert.deepEqual(Object.keys(frozen.planes).sort(),model.planesFor('disco-damage').slice().sort(),'every plane is written out');
 assert.equal(frozen.tokens['--accent-pink'],'#ff66cc');assert.deepEqual(frozen.custom,remix.custom);
 assert.equal(model.validateDefinition(frozen).ok&&model.validateDefinition(frozen).definition.frozen,true,'frozen survives save and load');
});

test('a remix notices when its official base has changed',()=>{
 const fp=model.baseFingerprint('astral');assert.match(fp,/^[0-9a-f]{8}$/);assert.equal(fp,model.baseFingerprint('astral'),'stable');assert.notEqual(fp,model.baseFingerprint('afterglow'));
 assert.equal(model.baseChanged({...model.emptyDefinition('astral'),baseFingerprint:fp}),false);
 assert.equal(model.baseChanged({...model.emptyDefinition('astral'),baseFingerprint:'deadbeef'}),true);
 assert.equal(model.baseChanged({...model.emptyDefinition('astral'),baseFingerprint:'deadbeef',frozen:true}),false,'frozen themes are unaffected');
 assert.equal(model.baseChanged(model.emptyDefinition('astral')),false,'unsaved remixes have nothing to compare');
});

test('exports carry the handoff and a complete resolved appearance, and still import',()=>{
 const definition={...model.emptyDefinition('prism-noir'),tokens:{'--background':'#0a0612'}};
 const file=JSON.parse(model.exportTheme('Moon Witch',definition,{intent:'new-theme',name:'Moon Witch!',subtitle:'Moonlit glass.',mode:'dark',effects:['disco-glitter']}));
 assert.equal(file.handoff.intent,'new-theme');assert.deepEqual(file.handoff.effects,['disco-glitter']);
 assert.equal(Object.keys(file.resolved.tokens).length,Object.keys(tokens.tokenInfo).length,'every editable token');
 assert.equal(file.resolved.tokens['--background'],'#0a0612');assert.equal(file.resolved.baseFingerprint,model.baseFingerprint('prism-noir'));
 assert.ok(file.resolved.planes.bloom&&file.resolved.planes.pool&&file.resolved.css.includes('--atmosphere-bloom-layers'));
 const back=model.importTheme(JSON.stringify(file));assert.ok(back.ok);assert.deepEqual(back.definition,definition);
 assert.deepEqual(model.specialEffects.map(e=>e.id),['disco-light','disco-glitter','disco-foil','birthday-confetti']);
});

test('the integration script turns exports into theme code without editing anything',async()=>{
 const {execFileSync}=await import('node:child_process');const {mkdtempSync,writeFileSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');
 const dir=mkdtempSync(join(tmpdir(),'atelier-'));
 try{
  const definition={...model.emptyDefinition('disco-damage'),tokens:{'--background':'#0c071a'}};
  writeFileSync(join(dir,'new.json'),model.exportTheme('Night Swim',definition,{intent:'new-theme',name:'Night Swim!',subtitle:'Dark water, bright light.',mode:'dark',effects:[]}));
  writeFileSync(join(dir,'update.json'),model.exportTheme('Disco Bright',definition,{intent:'update-theme',target:'disco-damage',frozenRemixes:['Old'],keptOriginal:'Disco (Nov 5)'}));
  const run=file=>execFileSync(process.execPath,[join(root,'scripts/atelier-integrate.mjs'),join(dir,file)],{encoding:'utf8',cwd:root});
  const created=run('new.json');
  assert.match(created,/id: "night-swim"/);assert.match(created,/:root\[data-theme="night-swim"\] \{\n {2}--icon-gradient-start/);assert.match(created,/--background: #0c071a;/);
  assert.match(created,/--atmosphere-pool-layers:/,'a Disco-based theme keeps Disco\'s own pools');assert.match(created,/none \(no theme-specific effects\)/);
  const updated=run('update.json');
  assert.match(updated,/--background: #050507 {2}→ {2}#0c071a/);assert.match(updated,/Token changes for :root\[data-theme="disco-damage"\] \(app\/themes\.css\) — 1\n/);assert.match(updated,/Frozen remixes: Old/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('overall glow strength and size act on every built-in light, never on the person\'s own layers',()=>{
 assert.equal(values.formatColorValue({k:'token',t:'--chart-2',m:48},200),'color-mix(in srgb,var(--chart-2) 96%,transparent)');
 assert.equal(values.formatColorValue({k:'token',t:'--chart-2',m:48},300),'rgb(from var(--chart-2) r g b / min(1,calc(alpha * 1.44)))','beyond the token, alpha is raised and capped');
 assert.equal(values.formatColorValue({k:'rgba',r:0,g:238,b:255,a:.25},300),'rgba(0,238,255,.75)');
 const {newGlow}=load('lib/atelier/presets');const base=model.emptyDefinition('disco-damage');
 const definition={...base,custom:[newGlow(base)],effects:{...base.effects,glowStrength:250,glowSize:150}};
 const css=model.compileTheme(definition,'preview').css;
 for(const plane of model.planesFor('disco-damage'))assert.ok(css.includes(model.planeVariables[plane]),plane);
 const spill=model.effectivePlaneLayers('discoSpill',definition)[0],original=model.builtInLayers('discoSpill',definition)[0];
 assert.equal(spill.w.v,original.w.v*1.5);assert.equal(spill.opacity,250);
 assert.match(css,/--atmosphere-custom-layers:radial-gradient\(ellipse 380px 300px/,'own glows keep their own size');
 assert.equal(model.validateDefinition(definition).definition.effects.glowStrength,250);
});
