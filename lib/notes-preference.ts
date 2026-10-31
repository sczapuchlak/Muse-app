export type NotesPanes={tagsVisible:boolean;focus:boolean};
const key='muse.notes.panes',eventName='muse-notes-panes-change';let session:string|null=null;
export function parseNotesPanes(raw:string|null):NotesPanes{try{const data=JSON.parse(raw??'null');return {tagsVisible:data?.tagsVisible!==false,focus:data?.focus===true};}catch{return {tagsVisible:true,focus:false};}}
export function readNotesPanes(){if(session!==null)return session;try{return window.localStorage.getItem(key);}catch{return null;}}
export const serverNotesPanes=()=>null;
export function changeNotesPanes(patch:Partial<NotesPanes>){session=JSON.stringify({...parseNotesPanes(readNotesPanes()),...patch});try{window.localStorage.setItem(key,session);}catch{/* Keep the panes usable in memory. */}window.dispatchEvent(new Event(eventName));}
export function subscribeNotesPanes(update:()=>void){const storage=(event:StorageEvent)=>{if(event.key===key||event.key===null){session=null;update();}};window.addEventListener('storage',storage);window.addEventListener(eventName,update);return ()=>{window.removeEventListener('storage',storage);window.removeEventListener(eventName,update);};}
