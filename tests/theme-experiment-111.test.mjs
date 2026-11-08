import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {load,root} from './helpers.mjs';
const read=p=>readFileSync(resolve(root,p),'utf8');
const {themes,themeExperiments,allThemes,isThemeId,isExperimentalTheme,themeEntry}=load('lib/themes');
const css=read('app/themes.css'),surfaces=read('app/surfaces.css');
const block=id=>Object.fromEntries([...css.split(`:root[data-theme="${id}"] {`)[1].split('}')[0].matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()]));
const ROLE=['prism-noir','nightbloom','astral','dreamstorm-lab','bubblegum-baby','hot-summer-nights','booze-pinata','northern-lights-out'];

test('renovated themes keep their names and ids; new themes join the official list; Dreamstorm stays in the lab',()=>{
 const names=Object.fromEntries(themes.map(t=>[t.id,t.name]));
 assert.equal(names['prism-noir'],'Curses!');assert.equal(names.nightbloom,'Pretty Toxic!');assert.equal(names.astral,'Midnight Ballerina!');
 for(const id of ['bubblegum-baby','hot-summer-nights','booze-pinata','northern-lights-out'])assert.ok(names[id],id);
 assert.deepEqual(themeExperiments.map(t=>t.id),['dreamstorm-lab']);assert.equal(themeExperiments[0].variantOf,'astral');
 assert.ok(!themes.some(t=>t.id==='dreamstorm-lab'),'experiments never appear in the regular pickers');
 assert.ok(isThemeId('dreamstorm-lab')&&isExperimentalTheme('dreamstorm-lab')&&!isExperimentalTheme('astral'));
 assert.equal(themeEntry('dreamstorm-lab').name,'Midnight Ballerina!');assert.equal(allThemes.length,themes.length+themeExperiments.length);
 assert.match(read('lib/appearance-prepaint.ts'),/allThemes\.map/,'a saved lab theme paints before hydration');
});
test('the regular theme picker lists only official themes',async()=>{
 const {ThemeChoices}=load('components/AppearanceChoices');const html=renderToStaticMarkup(React.createElement(ThemeChoices));
 assert.ok(!html.includes('Dreamstorm'));assert.equal((html.match(/muse-appearance-theme muse-edge/g)||[]).length,themes.length);
});
test('surface roles: every role theme supplies distinct sidebar, alternate and featured tones, in Crystal and Frosted',()=>{
 for(const id of ROLE){const t=block(id);
  for(const n of ['--tone-sidebar','--tone-alt','--tone-alt-2','--tone-featured','--frosted-tone-sidebar','--frosted-tone-alt','--frosted-tone-alt-2','--frosted-tone-featured','--tone-featured-ink','--tone-featured-muted','--tone-featured-accent'])assert.ok(t[n],`${id} ${n}`);
  const rgb=v=>v.match(/rgba\((\d+),(\d+),(\d+)/).slice(1).join(',');
  assert.equal(new Set([t['--glass-background'],t['--tone-alt'],t['--tone-alt-2'],t['--tone-featured']].map(rgb)).size,4,`${id}: four different card hues`);
  assert.ok(surfaces.includes(`[data-theme="${id}"]`),`${id} opts into role assignment`);
 }
 // Themes without tones keep their established look: they are not in the role list.
 for(const t of themes.filter(t=>!ROLE.includes(t.id)))assert.ok(!surfaces.includes(`[data-theme="${t.id}"]`),t.id);
 assert.match(surfaces,/--surface-sidebar: var\(--tone-sidebar, var\(--glass-background\)\)/);
 assert.match(read('components/AppShell.css'),/background: var\(--surface-sidebar\)/);
});
test('featured surfaces re-point text and nested tints so light cards stay readable inside dark themes',()=>{
 for(const n of ['--foreground','--text-muted','--ink-purple','--link-ink','--surface-subtle','--surface-control','--divider','--glass-border'])assert.match(surfaces,new RegExp(`${n}: `),n);
 assert.match(surfaces,/color: var\(--surface-featured-ink\)/);
});
test('each role theme has its own gradient-only atmosphere composition',()=>{
 const seen=new Set();
 for(const id of ROLE){const t=block(id);for(const n of ['--atmosphere-bloom-layers','--atmosphere-pool-layers','--atmosphere-haze-layers']){assert.ok(t[n],`${id} ${n}`);assert.doesNotMatch(t[n],/url\(/,`${id}: gradients only`);}seen.add(t['--atmosphere-bloom-layers']);}
 assert.equal(seen.size,ROLE.length,'no shared template with swapped colours');
});
test('theme review is a temporary session that restores the earlier theme',()=>{
 const src=read('lib/theme-review.ts');assert.match(src,/sessionStorage/);assert.match(src,/selectTheme\(session\.returnTo\)/);
 const {REVIEW_THEME_IDS}=load('lib/theme-review');assert.deepEqual([...REVIEW_THEME_IDS].sort(),[...ROLE].sort());
 assert.match(read('components/AppShell.tsx'),/<ThemeReviewBar \/>/);
});
