import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load,root} from './helpers.mjs';
import {readFileSync} from 'node:fs';

const prefs=load('lib/collections/preferences'),genres=load('components/collections/GenrePicker'),books=load('lib/whimsy/books');

test('Collections preferences default safely and persist for the current account',async()=>{
 assert.deepEqual(prefs.parseCollectionsPreferences(null),{mode:'board',kind:'all',showInProgress:true});
 assert.deepEqual(prefs.parseCollectionsPreferences({mode:'wrong',kind:'unknown',showInProgress:'false'}),{mode:'board',kind:'all',showInProgress:true});
 let metadata={existing:'kept'},writes=0;
 const client={auth:{getUser:async()=>({data:{user:{id:'owner',user_metadata:metadata}},error:null}),updateUser:async({data})=>{writes++;metadata={...metadata,...data};return {error:null};}}};
 const desired={mode:'library',kind:'book',showInProgress:false};
 assert.deepEqual(await prefs.saveCollectionsPreferences(client,'owner',desired),desired);
 assert.deepEqual(await prefs.readCollectionsPreferences(client,'owner'),desired);
 assert.equal(metadata.existing,'kept');assert.equal(writes,1);
 await assert.rejects(()=>prefs.saveCollectionsPreferences(client,'other',desired),/signed-in account/);
 assert.equal(writes,1);
});

test('genre presets and picker retain previously entered values',()=>{
 for(const kind of ['book','movie','tv','game'])assert.ok(genres.genrePresets[kind].length>=15);
 const html=renderToStaticMarkup(createElement(genres.GenrePicker,{kind:'book',value:'Fantasy, Custom Myth, Fantasy',onChange(){}}));
 assert.match(html,/2 selected/);assert.match(html,/Custom Myth/);
 assert.deepEqual(genres.splitGenres('Fantasy, Custom Myth, Fantasy'),['Fantasy','Custom Myth']);
});

test('multi-genre books remain visible in each Reading Atlas genre',()=>{
 const record={id:'one',status:'finished',genre:'Fantasy, Romantasy'};
 assert.deepEqual(books.genreReadingStats([record],[]).map(row=>row.genre),['Fantasy','Romantasy']);
});

test('Collections keeps old deep links, contextual Reading Atlas, and one filter owner',()=>{
 const source=readFileSync(root+'/components/collections/Collections.tsx','utf8');
 assert.doesNotMatch(source,/muse-collections-nav/);
 assert.match(source,/initialTab=\{query\?\.get\('section'\)==='atlas'/);
 assert.match(source,/initialBookId=\{query\?\.get\('book'\)\}/);
 assert.match(source,/initialItemId=\{query\?\.get\('item'\)\}/);
 assert.match(source,/aria-expanded=\{advancedOpen\}/);
 assert.match(source,/setAdvancedOpen\(value=>!value\)/);
 assert.match(source,/preferences\.showInProgress&&inProgress\.length>0/);
});
