import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {load} from './helpers.mjs';
const {safeReturnPath,isPublicAuthPath,validLoginEmail,authNoticeMessage}=load('lib/auth/paths');
test('auth return targets stay inside actual application destinations and reject redirect tricks',()=>{
 for(const input of ['https://other.test/','//other.test/','/\\other.test','/auth/logout','/login','/../login','/mood\nLocation: elsewhere','/%2f%2fother.test','/missing',undefined,['/notes']])assert.equal(safeReturnPath(input),'/');
 for(const input of ['/','/mood?date=2026-10-29','/planner?date=2026-11-01','/notes#draft'])assert.equal(safeReturnPath(input),input);
 assert.equal(safeReturnPath('/notes?x='+'x'.repeat(3000)),'/');
});
test('only intended entry routes are public and email/notice parsing cannot expose arbitrary object members',()=>{
 for(const path of ['/login','/login-preview','/auth/link','/auth/verify','/auth/logout','/auth/confirm'])assert.equal(isPublicAuthPath(path),true);
 for(const path of ['/','/mood','/settings','/login/anything','/auth/admin'])assert.equal(isPublicAuthPath(path),false);
 assert.ok(validLoginEmail(' local@example.test '));for(const input of ['bad','x@',null,'a@b.test\r\nX: yes','x'.repeat(255)+'@example.test'])assert.equal(validLoginEmail(input),false);
 assert.equal(authNoticeMessage('__proto__'),undefined);assert.equal(authNoticeMessage('constructor'),undefined);assert.ok(authNoticeMessage('link-expired').includes('expired'));
});
test('live login reuses approved branding and glass structure, while preview remains explicitly non-sending',()=>{
 const {MuseLogin}=load('components/auth/MuseLogin'),{LoginPreview}=load('components/LoginPreview');
 const render=component=>renderToStaticMarkup(React.createElement(component));
 for(const html of [render(MuseLogin),render(LoginPreview)])for(const token of ['muse-login-story','muse-login-glass','muse-login-logo','muse-star-cluster','Welcome to Muse.'])assert.ok(html.includes(token),token);
 const live=render(MuseLogin);assert.ok(!live.includes('No email is sent'));
 // The live email form submits through fetch rather than a native form action.
 const loginSource=readFileSync(new URL('../components/auth/MuseLogin.tsx',import.meta.url),'utf8');
 assert.match(loginSource,/fetch\("\/auth\/link",\s*\{\s*method:\s*"POST"/);
 const {museBrand}=load('lib/brand');
 for(const copy of [museBrand.mantra,museBrand.support,'You are the muse. You are the artist. Your life is the masterpiece.','YOUR OWN LITTLE CORNER OF THE UNIVERSE','Welcome to Muse.',"For everything you are and everything you're becoming."]){
   assert.ok(live.replace(/&#x27;|&apos;/g,"'").includes(copy),copy);
 }
 assert.ok(!/STREY|City Concierge/i.test(live));
 assert.ok(!live.includes('For the plans, the passions, the possibilities'));
 assert.ok(render(LoginPreview).includes('Design preview only. No email is sent'));
 const expired=renderToStaticMarkup(React.createElement(MuseLogin,{notice:'link-expired'}));assert.ok(expired.includes('expired or has already been used'));
});
test('public entry metadata identifies Muse without inheriting the Daily Edit title',()=>{
 const {metadata}=load('app/(entry)/layout');
 assert.equal(metadata.title,'Welcome to Muse.');
 assert.equal(metadata.description,"For everything you are and everything you're becoming.");
});
