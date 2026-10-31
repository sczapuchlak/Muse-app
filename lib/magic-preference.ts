export const magicLevels=['quiet','magical','extra'] as const;
export type MuseMagic=typeof magicLevels[number];
export const MAGIC_STORAGE_KEY='muse.magic';
const eventName='muse-magic-change';let session:MuseMagic|null=null;
export const serverMagic=():MuseMagic=>'magical';
export function readMagic():MuseMagic {if(session)return session;try{const value=window.localStorage.getItem(MAGIC_STORAGE_KEY);return magicLevels.includes(value as MuseMagic)?value as MuseMagic:'magical';}catch{return 'magical';}}
export function selectMagic(value:MuseMagic){session=value;try{window.localStorage.setItem(MAGIC_STORAGE_KEY,value);}catch{/* Usable in memory when storage is unavailable. */}window.dispatchEvent(new Event(eventName));}
export function subscribeMagic(update:()=>void){const storage=(event:StorageEvent)=>{if(event.key===MAGIC_STORAGE_KEY||event.key===null){session=null;update();}};window.addEventListener(eventName,update);window.addEventListener('storage',storage);return()=>{window.removeEventListener(eventName,update);window.removeEventListener('storage',storage);};}
/** Call at the action boundary. OS reduced motion always wins over Extra. */
export function allowsMagic():boolean {return typeof window!=='undefined'&&readMagic()!=='quiet'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;}
