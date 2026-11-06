/**
 * Sound effects preference (#34): On or Off, Off by default. Independent of Muse Magic intensity and of reduced
 * motion. Stored like the Muse Magic level (per device, synced across tabs).
 */
export const SOUND_STORAGE_KEY='muse.sound';
const eventName='muse-sound-change';let session:boolean|null=null;
export const serverSound=()=>false;
export function readSound():boolean{if(session!==null)return session;try{return window.localStorage.getItem(SOUND_STORAGE_KEY)==='on';}catch{return false;}}
export function selectSound(on:boolean){session=on;try{window.localStorage.setItem(SOUND_STORAGE_KEY,on?'on':'off');}catch{/* in memory */}window.dispatchEvent(new Event(eventName));}
export function subscribeSound(update:()=>void){const storage=(event:StorageEvent)=>{if(event.key===SOUND_STORAGE_KEY||event.key===null){session=null;update();}};window.addEventListener(eventName,update);window.addEventListener('storage',storage);return()=>{window.removeEventListener(eventName,update);window.removeEventListener('storage',storage);};}
