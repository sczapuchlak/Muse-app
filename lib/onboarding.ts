/**
 * First-run onboarding (#29). A profile needs onboarding only when the server says so: the `onboarded_at` column
 * exists and is null. Before the migration the column is absent, so nobody is sent through onboarding; every
 * account that existed when the migration ran was marked onboarded by it.
 */
export function needsOnboarding(profile:Record<string,unknown>|null|undefined){
 return !!profile&&Object.prototype.hasOwnProperty.call(profile,'onboarded_at')&&profile.onboarded_at===null;
}
/** Whether this database stores display names and onboarding (the #29 migration is applied). */
export const supportsProfileSetup=(profile:Record<string,unknown>|null|undefined)=>!!profile&&Object.prototype.hasOwnProperty.call(profile,'onboarded_at');

export const DISPLAY_NAME_MAX=80;
export function displayNameError(value:string){const name=value.trim();if(!name)return 'Tell Muse what to call you.';if(name.length>DISPLAY_NAME_MAX)return `Keep it to ${DISPLAY_NAME_MAX} characters.`;return '';}

/** The browser's own timezone, when it reports a usable IANA name; otherwise UTC. */
export function detectedTimeZone(){
 try{const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;return zone&&timeZoneIds().includes(zone)?zone:'UTC';}catch{return 'UTC';}
}
export function timeZoneIds(extra:string[]=[]){
 let ids:string[]=[];try{ids=Intl.supportedValuesOf('timeZone');}catch{ids=[];}
 return [...new Set(['UTC',...ids,...extra.filter(Boolean)])].sort();
}
/** Shared by Settings and onboarding so both offer the same list and labels. */
export function timeZoneOptions(extra:string[]=[]){
 return timeZoneIds(extra).map(id=>({id,label:id==='UTC'?'UTC · Coordinated Universal Time':`${id.split('/').at(-1)!.replaceAll('_',' ')} · ${id}`}));
}
