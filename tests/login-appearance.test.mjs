import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load,root} from './helpers.mjs';

test('entry dark fallback is read-only and preserves every valid saved theme without changing app defaults',()=>{
 const previous=globalThis.window;let saved=null,writes=0;
 globalThis.window={localStorage:{getItem:()=>saved,setItem:()=>writes++,removeItem:()=>writes++}};
 try{
  const {readLoginTheme,serverLoginTheme}=load('lib/auth/login-appearance'),{readThemePreference,serverThemePreference}=load('lib/theme-preference'),{themes}=load('lib/themes');
  assert.equal(serverLoginTheme(),'disco-damage');assert.equal(readLoginTheme(),'disco-damage');
  assert.equal(readThemePreference(),'iridescent');assert.equal(serverThemePreference(),'iridescent');
  for(const theme of themes){saved=theme.id;assert.equal(readLoginTheme(),theme.id);assert.equal(readThemePreference(),theme.id);}
  saved='invalid';assert.equal(readLoginTheme(),'disco-damage');assert.equal(readThemePreference(),'iridescent');
  globalThis.window.localStorage.getItem=()=>{throw Error('Storage unavailable');};assert.equal(readLoginTheme(),'disco-damage');assert.equal(writes,0);
 }finally{globalThis.window=previous;}
});

test('login renders its own starfield without shared Disco fragments or rectangular confetti',()=>{
 const {LoginAtmosphere}=load('components/auth/LoginAtmosphere'),{MUSE_STAR_PATH}=load('components/MuseStar');
 for(const neon of [true,false]){const html=renderToStaticMarkup(React.createElement(LoginAtmosphere,{neon}));assert.ok(html.includes(`data-neon="${neon}"`));assert.ok(html.includes(MUSE_STAR_PATH));assert.equal((html.match(/class="muse-login-sparkle"/g)||[]).length,12);assert.ok(html.includes('aria-hidden="true"'));assert.ok(!/muse-galaxy-candy|muse-disco-reflections|muse-disco-environment/.test(html));}
 const css=readFileSync(resolve(root,'components/auth/LoginAtmosphere.css'),'utf8');assert.ok(css.includes('#050507'));assert.ok(css.includes('prefers-reduced-motion'));assert.ok(!/\banimation\s*:(?!none)/.test(css));
 const auth=readFileSync(resolve(root,'components/auth/AuthAtmosphere.tsx'),'utf8');assert.ok(auth.includes('readLoginTheme,serverLoginTheme'));assert.ok(!auth.includes('selectTheme'));
});
