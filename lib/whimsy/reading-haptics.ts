const key='muse.reading.haptics';
const eventName='muse-reading-haptics-change';
let current:boolean|null=null;
export function readReadingHaptics(){if(current!==null)return current;try{return window.localStorage.getItem(key)==='on';}catch{return false;}}
export function selectReadingHaptics(on:boolean){current=on;try{window.localStorage.setItem(key,on?'on':'off');}catch{}window.dispatchEvent(new Event(eventName));}
export function subscribeReadingHaptics(update:()=>void){const storage=(event:StorageEvent)=>{if(event.key===key||event.key===null){current=null;update();}};window.addEventListener(eventName,update);window.addEventListener('storage',storage);return()=>{window.removeEventListener(eventName,update);window.removeEventListener('storage',storage);};}
export const serverReadingHaptics=()=>false;
export function gentleReadingHaptic(){if(!readReadingHaptics()||typeof navigator==='undefined'||typeof navigator.vibrate!=='function'||document.visibilityState!=='visible')return false;try{return navigator.vibrate(24);}catch{return false;}}
