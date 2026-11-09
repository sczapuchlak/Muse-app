import type {Note,NoteDocument} from './notes';
/** Mindspace views: Sticky Board (internally `constellations`, the default), Lists (#110), and the hidden Notes editor (`?view=notes`, kept for existing links and data). */
export type MindspaceView='notes'|'constellations'|'lists';
export function mindspaceView(raw:string|null):MindspaceView{return raw==='notes'?'notes':raw==='lists'?'lists':'constellations';}
export function captureNoteContent(text:string):{document:NoteDocument;plainText:string}{const plainText=text.trim();return {plainText,document:{type:'doc',content:plainText.split('\n').map(line=>({type:'paragraph',...(line?{content:[{type:'text',text:line}]}:{})}))}};}
export type ChecklistPreview={path:number[];text:string;checked:boolean};
function textOf(node:NoteDocument):string{return node.text??(node.content??[]).map(textOf).join(node.type==='paragraph'?'':' ');}
export function checklistPreview(document:NoteDocument):ChecklistPreview[]{const items:ChecklistPreview[]=[];function visit(node:NoteDocument,path:number[]){if(node.type==='taskItem')items.push({path,text:(node.content??[]).filter(n=>n.type!=='taskList').map(textOf).join(' ').trim(),checked:node.attrs?.checked===true});node.content?.forEach((child,i)=>visit(child,[...path,i]));}visit(document,[]);return items;}
/** Patch one structured checklist node; never flatten formatting or nested content. */
export function toggleChecklist(document:NoteDocument,path:number[],checked:boolean):NoteDocument{if(!path.length)return document;const [index,...rest]=path,child=document.content?.[index];if(!child)return document;const next=rest.length?toggleChecklist(child,rest,checked):child.type==='taskItem'?{...child,attrs:{...child.attrs,checked}}:child;if(next===child)return document;return {...document,content:document.content!.map((node,i)=>i===index?next:node)};}
export const noteAccents=['primary','secondary','pop','warm','info'] as const;
export type NoteAccent=typeof noteAccents[number];
export function isNoteAccent(value:unknown):value is NoteAccent{return typeof value==='string'&&(noteAccents as readonly string[]).includes(value);}
export function previewText(note:Note){return note.plainText.slice(0,500);}
