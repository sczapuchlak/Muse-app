import {parseCosmicPreferences,type CosmicPreferences} from './cosmic-forecast';
export const COSMIC_STORAGE_KEY='muse-cosmic-preferences';
const changeEvent='muse-cosmic-preferences-change';
let sessionValue:string|null=null;
export function readCosmicPreference():string|null {if(sessionValue!==null)return sessionValue;try{return window.localStorage.getItem(COSMIC_STORAGE_KEY);}catch{return null;}}
export const serverCosmicPreference=()=>null;
export function changeCosmicPreference(patch:Partial<CosmicPreferences>){sessionValue=JSON.stringify({...parseCosmicPreferences(readCosmicPreference()),...patch});try{window.localStorage.setItem(COSMIC_STORAGE_KEY,sessionValue);}catch{/* Like theme/material, the preference remains usable in this session. */}window.dispatchEvent(new Event(changeEvent));}
export function subscribeCosmicPreference(update:()=>void){const storage=(event:StorageEvent)=>{if(event.key===COSMIC_STORAGE_KEY||event.key===null){sessionValue=null;update();}};window.addEventListener('storage',storage);window.addEventListener(changeEvent,update);return ()=>{window.removeEventListener('storage',storage);window.removeEventListener(changeEvent,update);};}
