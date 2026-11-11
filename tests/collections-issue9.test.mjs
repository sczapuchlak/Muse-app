import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load,root} from './helpers.mjs';
import {readFileSync} from 'node:fs';

const prefs=load('lib/collections/preferences'),genres=load('components/collections/GenrePicker'),books=load('lib/whimsy/books');

test('Collections preferences default safely and persist for the current account',async()=>{
 assert.deepEqual(prefs.parseCollectionsPreferences(null),{mode:'board',kind:'all',showInProgress:true,sort:'recent'});
 assert.deepEqual(prefs.parseCollectionsPreferences({mode:'wrong',kind:'unknown',showInProgress:'false',sort:'nope'}),{mode:'board',kind:'all',showInProgress:true,sort:'recent'});
 assert.equal(prefs.parseCollectionsPreferences({sort:'title'}).sort,'title','a remembered sort order is restored');
 let metadata={existing:'kept'},writes=0;
 const client={auth:{getUser:async()=>({data:{user:{id:'owner',user_metadata:metadata}},error:null}),updateUser:async({data})=>{writes++;metadata={...metadata,...data};return {error:null};}}};
 const desired={mode:'library',kind:'book',showInProgress:false,sort:'rating'};
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
 assert.match(source,/router\.replace\(book\?bookHref\(book\):section==='atlas'\?'\/collections\/reading-atlas'/,'old Books deep links resolve to the book page or Reading Atlas (#136)');
 assert.match(source,/initialItemId=\{query\?\.get\('item'\)\}/);
 assert.match(source,/aria-expanded=\{advancedOpen\}/);
 assert.match(source,/setAdvancedOpen\(value=>!value\)/);
 assert.match(source,/preferences\.showInProgress&&inProgress\.length>0/);
});

test('Collections restoration keeps one compact active shelf and direct add actions',()=>{
 const source=readFileSync(root+'/components/collections/Collections.tsx','utf8');
 const css=readFileSync(root+'/components/collections/Collections.css','utf8');
 assert.match(source,/kindFilter==='book'\?'Currently Reading'/);
 assert.match(source,/kindFilter==='game'\?'Currently Playing'/);
 assert.match(source,/aria-label=\{activeLabel\}/);
 assert.match(source,/muse-collections-active-card/);
 assert.match(source,/groups\.filter\(\(\[label\]\)=>!\(preferences\.showInProgress/);
 assert.match(source,/aria-label="Full library"/);
 assert.match(source,/muse-collections-search-add/);
 assert.match(source,/role="menu" open=\{addOpen\}/);
 assert.match(source,/onClick=\{\(\)=>id==='books'\?openAddBook\(\):go\(id,\{add:true\}\)\}/);
 assert.doesNotMatch(source,/What are you adding\?/);
 assert.match(source,/emptyCopy\[kindFilter\]/);
 assert.match(css,/\.muse-collections-active-card\{display:grid;grid-template-columns:64px minmax\(0,1fr\)/);
 const media=readFileSync(root+'/components/collections/MediaLibrary.tsx','utf8');
 assert.match(media,/!items\.length&&<button type="button" className="muse-button button-primary"/);
});

test('Collections restoration coexists with series deep links and scrolling editors from main',()=>{
 const source=readFileSync(root+'/components/collections/Collections.tsx','utf8');
 assert.match(source,/params\.delete\('series'\)/);
 assert.match(source,/<SeriesLibrary key=\{query\?\.get\('series'\)\?\?''\} initialSeriesId=\{query\?\.get\('series'\)\}/);
 assert.match(source,/className="muse-collections-back"/);
 for(const heading of ['Series in Progress','My Curated Collections'])assert.ok(source.includes(`<section className="muse-collections-board-section"><div className="muse-collections-board-heading"><h3>${heading}</h3></div>`),heading);
 const media=readFileSync(root+'/components/collections/MediaLibrary.tsx','utf8');
 assert.equal(media.match(/muse-collections-sticky-footer/g)?.length,1);
 assert.equal(media.match(/\{error&&<p role="alert">\{error\}<\/p>\}/g)?.length,1);
 assert.match(media,/className="muse-collections-editor-body"/);
 assert.match(media,/sticky-footer"><button type="button" className="muse-button button-ghost" onClick=\{\(\)=>setForm\(null\)\}>Cancel<\/button><button type="submit" className="muse-button button-primary"/);
 const books=readFileSync(root+'/components/whimsy/Bookshelf.tsx','utf8');
 assert.match(books,/void saveBook\(\);\}\}><div className="muse-books-form-body">/);
 assert.match(books,/<\/div>\{\(books\.some\(b=>b\.id===bookForm\.id\)\|\|addStage==='form'\)&&<div className="muse-books-actions muse-books-form-footer"><button className="muse-button button-ghost" type="button" onClick=\{\(\)=>setBookForm\(null\)\}>Cancel<\/button><button className="muse-button button-primary" type="submit"/);
});
