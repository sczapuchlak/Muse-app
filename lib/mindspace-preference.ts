import {mindspaceView,type MindspaceView} from './mindspace';
const key='muse.mindspace.view',event='muse-mindspace-view';let memory:MindspaceView|undefined;
export function readMindspaceView():MindspaceView{if(memory)return memory;try{return mindspaceView(localStorage.getItem(key));}catch{return 'constellations';}}
export const serverMindspaceView=():MindspaceView=>'constellations';
export function selectMindspaceView(value:MindspaceView){memory=value;try{localStorage.setItem(key,value);}catch{}window.dispatchEvent(new Event(event));}
export function subscribeMindspaceView(update:()=>void){const storage=(e:StorageEvent)=>{if(e.key===key||e.key===null){memory=undefined;update();}};window.addEventListener(event,update);window.addEventListener('storage',storage);return()=>{window.removeEventListener(event,update);window.removeEventListener('storage',storage);};}
