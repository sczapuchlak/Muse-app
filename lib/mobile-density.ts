/**
 * Phone layout density (#101): Comfortable (default) or Compact. A per-device choice, like Muse Magic, because it is
 * about this screen; it only changes phone-width layouts and never desktop.
 */
export const mobileDensities=['comfortable','compact'] as const;
export type MobileDensity=typeof mobileDensities[number];
export const MOBILE_DENSITY_STORAGE_KEY='muse.mobileDensity';
const eventName='muse-mobile-density-change';let session:MobileDensity|null=null;
export const serverMobileDensity=():MobileDensity=>'comfortable';
export function parseMobileDensity(value:unknown):MobileDensity{return mobileDensities.includes(value as MobileDensity)?value as MobileDensity:'comfortable';}
export function readMobileDensity():MobileDensity{if(session)return session;try{return parseMobileDensity(window.localStorage.getItem(MOBILE_DENSITY_STORAGE_KEY));}catch{return 'comfortable';}}
export function selectMobileDensity(value:MobileDensity){session=value;try{window.localStorage.setItem(MOBILE_DENSITY_STORAGE_KEY,value);}catch{/* Usable in memory when storage is unavailable. */}window.dispatchEvent(new Event(eventName));}
export function subscribeMobileDensity(update:()=>void){const storage=(event:StorageEvent)=>{if(event.key===MOBILE_DENSITY_STORAGE_KEY||event.key===null){session=null;update();}};window.addEventListener(eventName,update);window.addEventListener('storage',storage);return()=>{window.removeEventListener(eventName,update);window.removeEventListener('storage',storage);};}
