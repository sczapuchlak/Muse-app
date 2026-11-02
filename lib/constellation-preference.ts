import {boardPreferences,type BoardFilter} from './constellation-board';
const key='muse.constellations.layout',event='muse-constellations-layout';
let memory:string|null=null;
export function readBoardPreferences(){if(memory!==null)return memory;try{return localStorage.getItem(key);}catch{return null;}}
export const serverBoardPreferences=()=>null;
export function saveBoardPreferences(preferences:Pick<BoardFilter,'sort'|'layout'>){memory=JSON.stringify(boardPreferences(JSON.stringify(preferences)));try{localStorage.setItem(key,memory);}catch{}window.dispatchEvent(new Event(event));}
export function subscribeBoardPreferences(update:()=>void){const storage=(e:StorageEvent)=>{if(e.key===key||e.key===null){memory=null;update();}};window.addEventListener(event,update);window.addEventListener('storage',storage);return()=>{window.removeEventListener(event,update);window.removeEventListener('storage',storage);};}
