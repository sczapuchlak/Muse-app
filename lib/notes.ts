import {isNoteAccent,type NoteAccent} from './mindspace';
import type { JSONContent } from '@tiptap/react';
export type NoteDocument=JSONContent;
export type NoteStatus='active'|'archived'|'trashed';
export type Note={accent?:NoteAccent;id:string;title:string;document:NoteDocument;plainText:string;status:NoteStatus;trashedFrom?:Exclude<NoteStatus,'trashed'>;pinned:boolean;createdAt:string;updatedAt:string;revision:number};
export const noteTagIcons=['tag','home','notes','meals','calendar'] as const;
export type NoteTag={id:string;path:string;pinned:boolean;icon:typeof noteTagIcons[number]};
export type NoteTagLink={noteId:string;tagId:string};
export type NoteDraft=Pick<Note,'title'|'document'|'plainText'|'updatedAt'|'revision'>;
export type NotesState={notes:Note[];tags:NoteTag[];links:NoteTagLink[];drafts:Record<string,NoteDraft>};
export type NotesFilter={view:'all'|'pinned'|'archive'|'trash'|'tag';tagId?:string;query:string;searchAll:boolean;includeArchived:boolean;sort:'edited'|'created'|'title'|'pinned'};
export const initialNotesFilter:NotesFilter={view:'all',query:'',searchAll:false,includeArchived:false,sort:'edited'};
export function normalizeTagPath(path:string):string {return path.trim().replace(/^#+/,'').split('/').map((part)=>part.trim().toLocaleLowerCase('en-US').replace(/\s+/g,'-').replace(/[^\p{L}\p{N}_-]/gu,'')).filter(Boolean).join('/');}
export function tagPaths(path:string):string[]{const parts=normalizeTagPath(path).split('/').filter(Boolean);return parts.map((_,index)=>parts.slice(0,index+1).join('/'));}
export const emptyNoteDocument=():NoteDocument=>({type:'doc',content:[{type:'paragraph'}]});
export function newNote(id:string,now:string):Note {return {id,title:'',document:emptyNoteDocument(),plainText:'',status:'active',pinned:false,createdAt:now,updatedAt:now,revision:0};}
export function resolvedNote(state:NotesState,note:Note):Note {return {...note,...state.drafts[note.id]};}
export function displayNoteTitle(note:Pick<Note,'title'|'plainText'>):string {return note.title.trim()||note.plainText.split('\n').map((line)=>line.trim()).find(Boolean)?.slice(0,80)||'Untitled note';}
export function tagsForNote(state:NotesState,noteId:string):NoteTag[]{const ids=new Set(state.links.filter((link)=>link.noteId===noteId).map((link)=>link.tagId));return state.tags.filter((tag)=>ids.has(tag.id));}
export function visibleNotes(state:NotesState,filter:NotesFilter):Note[]{
 const selected=state.tags.find((tag)=>tag.id===filter.tagId),query=filter.query.trim().toLocaleLowerCase('en-US').replace(/^#/,''),allScope=!!query&&filter.searchAll&&filter.view!=='trash';
 const tagIds=new Set(selected?state.tags.filter((tag)=>tag.path===selected.path||tag.path.startsWith(`${selected.path}/`)).map((tag)=>tag.id):[]);
 const matchingIds=new Set(state.links.filter((link)=>tagIds.has(link.tagId)).map((link)=>link.noteId));
 return state.notes.map((note)=>resolvedNote(state,note)).filter((note)=>{
  if(filter.view==='trash'){if(note.status!=='trashed')return false;}
  else if(note.status==='trashed')return false;
  else if(!allScope&&filter.view==='archive'){if(note.status!=='archived')return false;}
  else if(note.status==='archived'&&!filter.includeArchived&&filter.view!=='archive')return false;
  if(!allScope&&filter.view==='pinned'&&!note.pinned)return false;
  if(!allScope&&filter.view==='tag'&&!matchingIds.has(note.id))return false;
  return !query||[note.title,note.plainText,...tagsForNote(state,note.id).map((tag)=>tag.path)].some((text)=>text.toLocaleLowerCase('en-US').includes(query));
 }).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||(filter.sort==='title'?displayNoteTitle(a).localeCompare(displayNoteTitle(b),'en'):filter.sort==='created'?b.createdAt.localeCompare(a.createdAt):b.updatedAt.localeCompare(a.updatedAt))||a.id.localeCompare(b.id));
}
export function tagRenameError(state:NotesState,id:string,raw:string):string|null {const tag=state.tags.find((item)=>item.id===id),path=normalizeTagPath(raw);if(!tag||!path)return 'Enter a tag name.';if(path.length>120)return 'Keep the tag path under 120 characters.';if(path.startsWith(`${tag.path}/`))return 'A tag cannot move inside itself.';const branch=state.tags.filter((item)=>item.path===tag.path||item.path.startsWith(`${tag.path}/`));const destinations=new Set(branch.map((item)=>path+item.path.slice(tag.path.length)));return state.tags.some((item)=>!branch.includes(item)&&destinations.has(item.path))?'That tag path already exists.':null;}
export type NotesAction=
 |{type:'note/create';note:Note;tagId?:string}
 |{type:'note/draft';id:string;patch:Partial<Pick<NoteDraft,'title'|'document'|'plainText'>>;now:string}
 |{type:'note/commit';id:string;revision:number}
 |{type:'note/pin';id:string}
 |{type:'note/accent';id:string;accent?:NoteAccent}
 |{type:'note/status';id:string;status:NoteStatus|'restore'}
 |{type:'note/delete';id:string}
 |{type:'note/duplicate';id:string;newId:string;now:string}
 |{type:'tag/create';path:string;id:string;ancestorIds:string[];icon?:NoteTag['icon'];noteId?:string}
 |{type:'tag/rename';id:string;path:string;ancestorIds:string[];icon?:NoteTag['icon']}
 |{type:'tag/delete';id:string}
 |{type:'tag/pin';id:string}
 |{type:'tag/toggle';noteId:string;tagId:string};
export function notesReducer(state:NotesState,action:NotesAction):NotesState {
 switch(action.type){
 case 'note/create':return state.notes.some((note)=>note.id===action.note.id)?state:{...state,notes:[...state.notes,action.note],links:action.tagId&&state.tags.some((tag)=>tag.id===action.tagId)?[...state.links,{noteId:action.note.id,tagId:action.tagId}]:state.links};
 case 'note/draft':{const base=state.notes.find((note)=>note.id===action.id);if(!base||base.status==='trashed')return state;const current=resolvedNote(state,base);return {...state,drafts:{...state.drafts,[action.id]:{title:current.title,document:current.document,plainText:current.plainText,...action.patch,updatedAt:action.now,revision:current.revision+1}}};}
 case 'note/commit':{const draft=state.drafts[action.id];if(!draft||draft.revision!==action.revision)return state;const drafts={...state.drafts};delete drafts[action.id];return {...state,drafts,notes:state.notes.map((note)=>note.id===action.id?{...note,...draft}:note)};}
 case 'note/accent':return action.accent!==undefined&&!isNoteAccent(action.accent)?state:{...state,notes:state.notes.map(note=>note.id===action.id?{...note,accent:action.accent}:note)};
 case 'note/pin':return {...state,notes:state.notes.map((note)=>note.id===action.id?{...note,pinned:!note.pinned}:note)};
 case 'note/status':return {...state,notes:state.notes.map((note)=>note.id!==action.id?note:{...note,status:action.status==='restore'?note.status==='trashed'?(note.trashedFrom??'active'):'active':action.status,trashedFrom:action.status==='trashed'&&note.status!=='trashed'?note.status:note.trashedFrom})};
 case 'note/delete':{const drafts={...state.drafts};delete drafts[action.id];return state.notes.find((note)=>note.id===action.id)?.status!=='trashed'?state:{...state,drafts,notes:state.notes.filter((note)=>note.id!==action.id),links:state.links.filter((link)=>link.noteId!==action.id)};}
 case 'note/duplicate':{const base=state.notes.find((note)=>note.id===action.id);if(!base||state.notes.some((note)=>note.id===action.newId))return state;const current=resolvedNote(state,base),copy={...structuredClone(current),id:action.newId,title:`${displayNoteTitle(current)} · copy`,status:'active' as const,trashedFrom:undefined,createdAt:action.now,updatedAt:action.now,revision:0};return {...state,notes:[...state.notes,copy],links:[...state.links,...state.links.filter((link)=>link.noteId===action.id).map((link)=>({...link,noteId:action.newId}))]};}
 case 'tag/create':{const path=normalizeTagPath(action.path);if(!path||path.length>120)return state;const tags=[...state.tags];const paths=tagPaths(path);paths.forEach((value,index)=>{if(!tags.some((tag)=>tag.path===value)){const id=index===paths.length-1?action.id:action.ancestorIds[index];if(id&&!tags.some((tag)=>tag.id===id))tags.push({id,path:value,pinned:false,icon:action.icon??'tag'});}});const tag=tags.find((tag)=>tag.path===path);if(!tag)return state;const linked=!!action.noteId&&state.notes.some((note)=>note.id===action.noteId)&&!state.links.some((link)=>link.noteId===action.noteId&&link.tagId===tag.id);return {...state,tags,links:linked?[...state.links,{noteId:action.noteId!,tagId:tag.id}]:state.links};}
 case 'tag/rename':{if(tagRenameError(state,action.id,action.path))return state;const old=state.tags.find((tag)=>tag.id===action.id)!,path=normalizeTagPath(action.path);const tags=state.tags.map((tag)=>tag.path===old.path||tag.path.startsWith(`${old.path}/`)?{...tag,path:path+tag.path.slice(old.path.length),icon:tag.id===old.id?(action.icon??tag.icon):tag.icon}:tag);tagPaths(path).slice(0,-1).forEach((value,index)=>{const id=action.ancestorIds[index];if(id&&!tags.some((tag)=>tag.path===value||tag.id===id))tags.push({id,path:value,pinned:false,icon:'tag'});});return {...state,tags};}
 case 'tag/delete':{const target=state.tags.find((tag)=>tag.id===action.id);if(!target)return state;const ids=new Set(state.tags.filter((tag)=>tag.path===target.path||tag.path.startsWith(`${target.path}/`)).map((tag)=>tag.id));return {...state,tags:state.tags.filter((tag)=>!ids.has(tag.id)),links:state.links.filter((link)=>!ids.has(link.tagId))};}
 case 'tag/pin':return {...state,tags:state.tags.map((tag)=>tag.id===action.id?{...tag,pinned:!tag.pinned}:tag)};
 case 'tag/toggle':if(!state.notes.some((note)=>note.id===action.noteId)||!state.tags.some((tag)=>tag.id===action.tagId))return state;return {...state,links:state.links.some((link)=>link.noteId===action.noteId&&link.tagId===action.tagId)?state.links.filter((link)=>link.noteId!==action.noteId||link.tagId!==action.tagId):[...state.links,{noteId:action.noteId,tagId:action.tagId}]};
 }
}
