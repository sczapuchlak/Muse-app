import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';
const require=createRequire(import.meta.url),notes=load('lib/notes'),{notesSample}=load('lib/notes-sample');
const fresh=()=>structuredClone(notesSample);

test('one-action notes can be untitled, inherit a tag and derive display titles without rewriting their documents',()=>{
 let state=fresh(),note=notes.newNote('new','2026-10-30T20:00:00Z');state=notes.notesReducer(state,{type:'note/create',note,tagId:'tag-paris'});
 assert.equal(notes.displayNoteTitle(note),'Untitled note');assert.deepEqual(notes.tagsForNote(state,note.id).map((tag)=>tag.path),['travel/paris']);
 const document={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'An unexpected idea'}]}]};state=notes.notesReducer(state,{type:'note/draft',id:'new',patch:{document,plainText:'An unexpected idea'},now:'later'});
 assert.equal(notes.displayNoteTitle(notes.resolvedNote(state,note)),'An unexpected idea');assert.deepEqual(state.drafts.new.document,document);assert.equal(note.title,'');
});

test('per-note draft revisions prevent stale autosaves from overwriting newer edits or another note',()=>{
 let state=fresh();const a='note-muse',b='note-reading';
 state=notes.notesReducer(state,{type:'note/draft',id:a,patch:{title:'First draft'},now:'first'});const older=state.drafts[a].revision;
 state=notes.notesReducer(state,{type:'note/draft',id:b,patch:{title:'Other note'},now:'second'});
 state=notes.notesReducer(state,{type:'note/draft',id:a,patch:{title:'Newer draft'},now:'third'});const latest=state.drafts[a].revision;
 assert.equal(notes.notesReducer(state,{type:'note/commit',id:a,revision:older}),state);
 state=notes.notesReducer(state,{type:'note/commit',id:a,revision:latest});assert.equal(state.notes.find((note)=>note.id===a).title,'Newer draft');assert.equal(state.drafts[a],undefined);assert.equal(state.drafts[b].title,'Other note');
});

test('tag paths deduplicate case/formatting, retain stable identities on branch rename and never delete notes',()=>{
 let state=fresh();state=notes.notesReducer(state,{type:'tag/create',path:' # TRAVEL / PARIS ',id:'unused',ancestorIds:['unused-parent'],noteId:'note-muse'});assert.equal(state.tags.filter((tag)=>tag.path==='travel/paris').length,1);assert.ok(state.links.some((link)=>link.noteId==='note-muse'&&link.tagId==='tag-paris'));
 state=notes.notesReducer(state,{type:'tag/rename',id:'tag-travel',path:'adventures',ancestorIds:[]});assert.equal(state.tags.find((tag)=>tag.id==='tag-paris').path,'adventures/paris');assert.ok(state.links.some((link)=>link.tagId==='tag-paris'));
 assert.equal(notes.notesReducer(state,{type:'tag/rename',id:'tag-travel',path:'adventures/inside',ancestorIds:['x']}),state);
 const before=state.notes.map((note)=>note.id);state=notes.notesReducer(state,{type:'tag/delete',id:'tag-travel'});assert.deepEqual(state.notes.map((note)=>note.id),before);assert.ok(!state.links.some((link)=>['tag-travel','tag-paris','tag-london'].includes(link.tagId)));
});

test('tag creation makes explicit ancestors, multi-tag parent filtering returns one note, and search respects scopes',()=>{
 let state=fresh();state=notes.notesReducer(state,{type:'tag/create',path:'Ideas / After Hours',id:'leaf',ancestorIds:['parent'],noteId:'note-muse'});assert.equal(state.tags.find((tag)=>tag.id==='parent').path,'ideas');
 const travel=notes.visibleNotes(state,{...notes.initialNotesFilter,view:'tag',tagId:'tag-travel'});assert.equal(travel.filter((note)=>note.id==='note-travel').length,1);
 assert.equal(notes.visibleNotes(state,{...notes.initialNotesFilter,view:'tag',tagId:'tag-travel',query:'serious tool'}).length,0);
 assert.ok(notes.visibleNotes(state,{...notes.initialNotesFilter,view:'tag',tagId:'tag-travel',query:'serious tool',searchAll:true}).some((note)=>note.id==='note-muse'));
 assert.ok(notes.visibleNotes(state,{...notes.initialNotesFilter,query:'#projects/muse'}).some((note)=>note.id==='note-muse'));
 assert.equal(notes.visibleNotes(state,{...notes.initialNotesFilter,query:'another season'}).length,0);assert.equal(notes.visibleNotes(state,{...notes.initialNotesFilter,includeArchived:true,query:'another season'}).length,1);
});

test('pin, archive, trash, restore, duplicate and permanent deletion preserve the other notes and relationships',()=>{
 let state=fresh();const id='note-muse';state=notes.notesReducer(state,{type:'note/status',id,status:'archived'});assert.ok(notes.visibleNotes(state,{...notes.initialNotesFilter,view:'archive'}).some((note)=>note.id===id));
 state=notes.notesReducer(state,{type:'note/status',id,status:'trashed'});assert.ok(!notes.visibleNotes(state,notes.initialNotesFilter).some((note)=>note.id===id));state=notes.notesReducer(state,{type:'note/status',id,status:'restore'});assert.equal(state.notes.find((note)=>note.id===id).status,'archived');
 state=notes.notesReducer(state,{type:'note/draft',id,patch:{title:'Draft to duplicate'},now:'now'});state=notes.notesReducer(state,{type:'note/duplicate',id,newId:'copy',now:'later'});assert.equal(state.notes.find((note)=>note.id==='copy').title,'Draft to duplicate · copy');assert.deepEqual(notes.tagsForNote(state,'copy'),notes.tagsForNote(state,id));
 assert.equal(notes.notesReducer(state,{type:'note/delete',id:'copy'}),state,'only Trash can be permanently deleted');state=notes.notesReducer(state,{type:'note/status',id:'copy',status:'trashed'});state=notes.notesReducer(state,{type:'note/delete',id:'copy'});assert.ok(!state.notes.some((note)=>note.id==='copy'));assert.ok(!state.links.some((link)=>link.noteId==='copy'));assert.ok(state.notes.some((note)=>note.id===id));
});

test('official rich-text schema roundtrips sample formatting/checklists and ProseMirror history supports undo/redo',()=>{
 const {getSchema}=require('@tiptap/core'),StarterKit=require('@tiptap/starter-kit').default,{TaskList,TaskItem}=require('@tiptap/extension-list'),{EditorState}=require('@tiptap/pm/state'),{history,undo,redo}=require('@tiptap/pm/history');
 const schema=getSchema([StarterKit,TaskList,TaskItem.configure({nested:true})]);for(const note of notesSample.notes){const doc=schema.nodeFromJSON(note.document);doc.check();assert.deepEqual(doc.toJSON(),schema.nodeFromJSON(doc.toJSON()).toJSON());}
 const checklist=schema.nodeFromJSON(notesSample.notes.find((note)=>note.id==='note-everyday').document);assert.equal(checklist.child(1).child(0).attrs.checked,true);assert.equal(checklist.child(1).child(1).attrs.checked,false);
 let state=EditorState.create({schema,doc:schema.nodeFromJSON(notes.emptyNoteDocument()),plugins:[history()]});state=state.apply(state.tr.insertText('A thought'));state=state.apply(state.tr.addMark(1,10,schema.marks.bold.create()));assert.equal(state.doc.child(0).child(0).marks[0].type.name,'bold');assert.ok(undo(state,(tr)=>state=state.apply(tr)));assert.ok(redo(state,(tr)=>state=state.apply(tr)));assert.ok(state.doc.textContent.includes('A thought'));
});

test('notes panes remember independent collapse/focus preferences and tolerate restricted browser storage',()=>{
 const data=new Map(),events=new EventTarget();globalThis.window={localStorage:{getItem:(key)=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)},addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events),dispatchEvent:events.dispatchEvent.bind(events)};
 try{let pref=load('lib/notes-preference',true);pref.changeNotesPanes({tagsVisible:false});pref.changeNotesPanes({focus:true});assert.deepEqual(pref.parseNotesPanes(pref.readNotesPanes()),{tagsVisible:false,focus:true});pref=load('lib/notes-preference',true);assert.equal(pref.parseNotesPanes(pref.readNotesPanes()).focus,true);window.localStorage.setItem=()=>{throw Error('blocked');};pref.changeNotesPanes({focus:false});assert.deepEqual(pref.parseNotesPanes(pref.readNotesPanes()),{tagsVisible:false,focus:false});}finally{delete globalThis.window;}
});

test('compact Notes list and nested tag navigation expose selected state and avoid folder dashboards',()=>{
 const {NotesList}=load('components/notes/NotesList'),{NotesTagRail}=load('components/notes/NotesTagRail');
 const html=renderToStaticMarkup(React.createElement(NotesList,{notes:notes.visibleNotes(notesSample,notes.initialNotesFilter),selectedId:'note-muse',filter:notes.initialNotesFilter,heading:'All Notes',onFilter(){},onSelect(){},onNew(){},onTags(){},searchRef:{current:null}}));assert.ok(html.includes('role="listbox"'));assert.equal((html.match(/aria-selected="true"/g)??[]).length,1);assert.ok(html.includes('Search notes'));assert.ok(!html.includes('muse-card'));
 const rail=renderToStaticMarkup(React.createElement(NotesTagRail,{state:notesSample,filter:notes.initialNotesFilter,dispatch(){},onFilter(){},onCreate(){},onRename(){},onDelete(){},onCollapse(){}}));for(const label of ['All Notes','Archive','Trash','Pinned','Expand','travel'])assert.ok(rail.includes(label)||label==='Expand'&&rail.includes('Collapse'),label);
});

test('approved theme labels are registry-only renames and Disco adds a ninth stable saved preference',()=>{
 const {themes,isThemeId}=load('lib/themes');assert.equal(themes.length,9);assert.deepEqual(themes.slice(0,6).map((theme)=>[theme.id,theme.name]),[['iridescent','Glitter!'],['astral','Midnight Ballerina!'],['nightbloom','Pretty Toxic!'],['solstice','Sunburnt & Sinful!'],['prism-noir','Curses!'],['afterglow','Neon Hangover!']]);assert.ok(isThemeId('disco-damage'));assert.ok(isThemeId('astral'));assert.equal(themes.find((theme)=>theme.id==='issya-bday').name,'ISSYA BDAY!');
 const css=readFileSync(resolve(root,'app/themes.css'),'utf8');assert.match(css,/:root\[data-theme="disco-damage"\][\s\S]*--background: #0c071a;/);assert.match(css,/:root\[data-theme="disco-damage"\][\s\S]*--star-color-1: #f6f2ff;/);
});

test('Daily Edit and all module headers share one normal-flow signature zone and have no hero illustration or theme picker',()=>{
 const {MuseHeader}=load('components/MuseHeader'),{MusePageHeader}=load('components/MusePageHeader'),{mockProfile}=load('lib/mock-profile');
 const render=(node)=>renderToStaticMarkup(node);const daily=render(React.createElement(MuseHeader,{date:{iso:'2026-10-29',label:''},greeting:'Make room for a little magic.',profile:mockProfile,onDateChange(){}}));assert.ok(daily.includes('Stephanie.'));assert.ok(daily.includes('muse-header-layout'));assert.equal((daily.match(/muse-mantra-standard/g)??[]).length,1);assert.equal((daily.match(/class="muse-week-day"/g)??[]).length,7);assert.ok(!daily.includes('muse-page-celestial'));assert.ok(!daily.includes('muse-theme'));
 for(const title of ['Planner','Rituals','Wellness','Mood','Money','Notes','Whimsy','Insights','Settings','Appearance']){const html=render(React.createElement(MusePageHeader,{title,description:'A supporting line.'}));assert.equal((html.match(/viewBox="0 0 24 40"/g)??[]).length,3,title);assert.ok(html.includes('muse-header-signature'));assert.ok(!html.includes('muse-section-eyebrow'));const {pageMantra}=load('lib/page-header'),line=pageMantra(title);if(line){assert.ok(html.includes(render(React.createElement('p',{className:'muse-mantra muse-page-mantra'},line))),title);assert.ok(!html.includes('A supporting line.'));}else if(title!=='Insights')assert.ok(html.includes('A supporting line.'));}
 const source=readFileSync(resolve(root,'components/AppShell.tsx'),'utf8');assert.equal((source.match(/<ThemeSwitcher/g)??[]).length,1,'only the sidebar picker; mobile uses Appearance');const header=readFileSync(resolve(root,'components/MusePageHeader.css'),'utf8');assert.ok(header.includes('align-items:start'));assert.ok(!header.includes('position:absolute'));
});

test('note timestamp labels honor the profile timezone while financial due dates remain calendar dates',()=>{
 const {shortTimestamp,shortDate}=load('lib/display-date');assert.equal(shortTimestamp('2026-10-31T02:00:00Z','America/Los_Angeles'),'Oct 30');assert.equal(shortDate('2026-10-31'),'Oct 31');
});
