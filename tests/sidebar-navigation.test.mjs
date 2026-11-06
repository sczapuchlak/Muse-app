import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load,root} from './helpers.mjs';

const read=file=>readFileSync(resolve(root,file),'utf8');
const {navigation,desktopGroups,isActiveItem}=load('lib/navigation');
const group=name=>navigation.filter(item=>item.group===name).map(item=>[item.label,item.href,item.icon]);

test('sidebar groups match the approved Everyday / Life / Whimsy structure and icons',()=>{
 assert.deepEqual(desktopGroups,['Everyday','Life','Whimsy']);
 assert.deepEqual(group('Everyday'),[['Daily Edit','/','home'],['Planner','/planner','calendar'],['Rituals','/rituals','flame'],['Wellness','/nourish','heart-pulse'],['Insights','/insights','chart']]);
 assert.deepEqual(group('Life'),[['Money','/money','money'],['Mindspace','/notes','brain'],['Collections','/collections','bookshelf']]);
 assert.deepEqual(group('Whimsy'),[['Astrology','/whimsy/observatory','orbit'],['Tarot','/whimsy/tarot','tarot'],['Dreams','/whimsy/dreamscapes','dreams'],['Fortune & Fun','/whimsy/side-quests','wand']]);
 assert.equal(navigation.find(item=>item.id==='settings').icon,'gear');
 assert.ok(!navigation.some(item=>/Reflect|Weekly Side Quests|Fortunes & Nonsense|^Whimsy$|^Mood$/.test(item.group+' '+item.label)));
 const icons=read('components/MuseIcon.tsx');
 for(const name of ['flame','chart','bookshelf','orbit','tarot','dreams','wand','themes','gear'])assert.match(icons,new RegExp(`\\n  ${name}: `),name);
});

test('active destinations cover nested and grouped routes',()=>{
 const active=path=>navigation.filter(item=>isActiveItem(path,item)).map(item=>item.id);
 assert.deepEqual(active('/whimsy/side-quests'),['fortune-fun']);
 assert.deepEqual(active('/whimsy/fortunes'),['fortune-fun']);
 assert.deepEqual(active('/whimsy/tarot/the-fool'),['tarot']);
 assert.deepEqual(active('/whimsy/dreamscapes/encyclopedia/water'),['dreams']);
 assert.deepEqual(active('/whimsy/observatory'),['astrology']);
 assert.deepEqual(active('/whimsy/fortunes-other'),[]);
 assert.deepEqual(active('/'),['daily']);
});

test('sign-in return destinations are unchanged by the sidebar reorganization',()=>{
 const {safeReturnPath}=load('lib/auth/paths');
 for(const path of ['/','/planner','/rituals','/nourish','/insights','/money','/notes','/collections','/appearance','/settings','/mood','/whimsy/observatory','/whimsy/tarot','/whimsy/side-quests','/whimsy/dreamscapes','/whimsy/fortunes','/whimsy/bookshelf'])assert.equal(safeReturnPath(path),path,path);
 assert.equal(safeReturnPath('/whimsy'),'/');
});

test('Fortune & Fun is one tab bar: Side Quests and each fortune experience, with old links still resolving',()=>{
 const {FortuneFunNavigation,fortuneFunTabs,fortuneFunHref}=load('components/whimsy/WhimsyFoundation');
 assert.deepEqual(fortuneFunTabs.map(tab=>tab.id),['side-quests','cookie','oracle','prophecy','curiosity','collection']);
 const html=renderToStaticMarkup(React.createElement(FortuneFunNavigation,{current:'side-quests'}));
 assert.match(html,/<nav class="muse-whimsy-navigation" aria-label="Fortune &amp; Fun">/);
 assert.match(html,/aria-current="page" href="\/whimsy\/side-quests">/);
 for(const [id,label] of [['cookie','Fortune Cookie'],['oracle','The Oracle'],['prophecy','Tiny Prophecies'],['curiosity','Curiosities']])assert.match(html,new RegExp(`href="/whimsy/fortunes\\?view=${id}">.*?${label}</a>`));
 assert.equal(fortuneFunHref('side-quests'),'/whimsy/side-quests');
 assert.match(read('components/whimsy/WeeklySideQuests.tsx'),/<FortuneFunNavigation current="side-quests"\/>/);
 const fortunes=read('components/whimsy/FortunesExperience.tsx');
 assert.match(fortunes,/<FortuneFunNavigation current=\{section\} onSelect=\{selectSection\}/);
 assert.doesNotMatch(fortunes,/muse-fortune-tabs/,'no second, nested tab row');
 assert.match(fortunes,/requested==='oracle'\|\|requested==='prophecy'\|\|requested==='curiosity'\|\|requested==='collection'\?requested:'cookie'/,'old /whimsy/fortunes links open Fortune Cookie; ?view= links open their tab');
 for(const file of ['components/astrology/CosmicObservatory.tsx','components/whimsy/TarotExperience.tsx','components/whimsy/Dreamscapes.tsx','components/whimsy/WeeklySideQuests.tsx','components/whimsy/FortunesExperience.tsx'])assert.ok(!read(file).includes('aria-label="Whimsy experiences"'),file);
 assert.match(read('components/astrology/CosmicObservatory.tsx'),/sections\.find\(\(\[id\]\)=>id===requestedView\)\?\.\[0\]\?\?'forecast'/,'Astrology opens on Horoscopes');
});

test('sidebar shell keeps the Whimsy sparkle, Themes utility, and labeled bottom utilities',()=>{
 const shell=read('components/AppShell.tsx');
 assert.match(shell,/group === "Whimsy" && <MuseStar size=\{11\} className="muse-nav-group-star" \/>/);
 assert.match(shell,/<div className="muse-rail-dock" role="group" aria-label="Account controls"/,"Themes, Settings and Sign out live in the account dock");
 assert.match(shell,/<ThemeSwitcher variant="dock"\/>/);assert.match(shell,/<LogoutButton compact variant="dock"\/>/);assert.match(shell,/aria-label="Settings" title="Settings"/);
 assert.match(shell,/<ProfileNavLabel userId=\{userId\} fallback=\{item\.label\} \/>/,"the profile row shows the @username");
 assert.match(shell,/<NavDestination key=\{item\.id\} item=\{item\} path=\{path\} userId=\{profile\.id\} compact=\{collapsed\} \/>/);
 assert.match(shell,/item\.id === "profile" \? <ProfileNavIcon userId=\{userId\} \/>/,"My Profile shows the chosen avatar");
 assert.match(read('components/ThemeSwitcher.tsx'),/aria-label=\{`Theme: \$\{active\.name\}\. Change theme or material`\}/);
});
