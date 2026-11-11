import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {root} from './helpers.mjs';

const css=readFileSync(resolve(root,'app/globals.css'),'utf8');
const tabs=['.muse-page-tabs','.muse-section-nav','.muse-whimsy-navigation','.muse-cosmic-navigation','.muse-books-tabs','.muse-tarot-tabs','.muse-dream-tabs','.muse-fortune-tabs'];
const list=`.muse-page :is(${tabs.join(',')})`;

test('secondary page navigation shares the Books / Reading Atlas tab treatment',()=>{
 assert.ok(css.includes(`${list}{display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding-bottom:10px;border-bottom:1px solid var(--glass-border)}`));
 assert.ok(css.includes(`${list}>:is(a,button){display:inline-flex;`)&&css.includes('border-radius:var(--control-radius)'));
 assert.ok(css.includes(`${list}>:is(a,button):is([aria-current="page"],[aria-pressed="true"]){background:color-mix(in srgb,var(--accent-primary) 12%,var(--surface-control));border-color:var(--selected-border);color:var(--foreground);box-shadow:inset 0 -2px var(--accent-secondary)}`));
 assert.ok(css.includes(`${list}>:is(a,button):is([aria-current="page"],[aria-pressed="true"])::before{opacity:1}`),'active tab shows the prismatic edge');
 assert.ok(css.includes(`${list}>:is(a,button):focus-visible{outline:2px solid var(--focus-ring);outline-offset:2px}`));
 assert.match(css,new RegExp(`@media\\(max-width:600px\\)\\{${list.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\{flex-wrap:nowrap;overflow-x:auto`));
});

test('filters and view selectors stay outside page-tab styling',()=>{
 for(const filter of ['muse-collections-chips','muse-collections-modes','muse-books-actions','muse-tarot-filters'])assert.ok(!list.includes(filter),filter);
 assert.ok(!/:is\([^)]*muse-mindspace-views[^)]*muse-section-nav|:is\(\.muse-section-nav,\.muse-mindspace-views/.test(css),'section nav left the legacy pill group');
});

test('page tabs keep navigation semantics and current-page state',()=>{
 const section=readFileSync(resolve(root,'components/MuseSectionNav.tsx'),'utf8');
 assert.match(section,/<nav className="muse-section-nav" aria-label=\{label\}>/);assert.match(section,/aria-current=\{current===item\.id\?"page":undefined\}/);
 const books=readFileSync(resolve(root,'components/whimsy/BookPage.tsx'),'utf8');
 assert.match(books,/<nav className="muse-page-tabs muse-book-page-tabs" aria-label="Your time with this book">/);assert.match(books,/aria-current=\{tab===id\?'page':undefined\}/);
 const whimsy=readFileSync(resolve(root,'components/whimsy/WhimsyFoundation.tsx'),'utf8');
 assert.match(whimsy,/<nav className="muse-whimsy-navigation" aria-label="Whimsy experiences">/);
});
