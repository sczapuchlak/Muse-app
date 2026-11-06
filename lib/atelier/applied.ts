/**
 * The Theme Atelier remix applied to the real app (per browser, synced across devices by lib/atelier/sync.ts).
 * Editing never touches this: only an explicit Apply writes it. Choosing an official theme clears it.
 */
import {ATELIER_EVENT,ATELIER_STORAGE_KEY,selectTheme} from '@/lib/theme-preference';
import {validateDefinition,type AtelierDefinition} from './model';

export type AppliedAtelier={id:string;name:string;definition:AtelierDefinition};
let cacheRaw:string|null|undefined,cacheValue:AppliedAtelier|null=null;
export const serverApplied=():AppliedAtelier|null=>null;
export function parseApplied(raw:string|null):AppliedAtelier|null{
 if(!raw)return null;
 try{const value=JSON.parse(raw) as AppliedAtelier;const result=validateDefinition(value?.definition);if(!result.ok||typeof value.id!=='string'||typeof value.name!=='string')return null;return {id:value.id,name:value.name.slice(0,60),definition:result.definition};}catch{return null;}
}
/** Stable identity while the stored value is unchanged (useSyncExternalStore requirement). */
export function readApplied():AppliedAtelier|null{
 let raw:string|null=null;try{raw=window.localStorage.getItem(ATELIER_STORAGE_KEY);}catch{/* storage unavailable */}
 if(raw!==cacheRaw){cacheRaw=raw;cacheValue=parseApplied(raw);}
 return cacheValue;
}
export function subscribeApplied(update:()=>void){
 const storage=(event:StorageEvent)=>{if(event.key===ATELIER_STORAGE_KEY||event.key===null)update();};
 window.addEventListener('storage',storage);window.addEventListener(ATELIER_EVENT,update);
 return()=>{window.removeEventListener('storage',storage);window.removeEventListener(ATELIER_EVENT,update);};
}
/** Explicit Apply: the base theme becomes active and the remix layers on top of it. */
export function applyAtelier(theme:AppliedAtelier){
 selectTheme(theme.definition.base,{keepAtelier:true});
 try{window.localStorage.setItem(ATELIER_STORAGE_KEY,JSON.stringify({id:theme.id,name:theme.name,definition:theme.definition}));}catch{/* in-memory only */}
 window.dispatchEvent(new Event(ATELIER_EVENT));
}
export function clearApplied(){try{window.localStorage.removeItem(ATELIER_STORAGE_KEY);}catch{/* nothing stored */}window.dispatchEvent(new Event(ATELIER_EVENT));}
