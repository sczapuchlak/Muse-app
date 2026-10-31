import { todayInTimeZone } from './dates';
import { mockProfile } from './mock-profile';
/** Remaining daily editorial rotation. Fixed module identity lives in page-header.ts. */
export const mantraLibrary = {
 daily: ['Make today a little more yours.','Ordinary days are where the magic lives.','A little structure. A lot of possibility.',"You don't have to do it all to make today count.","There's beauty in the becoming."],
 insights: ['The story behind your days.','See the patterns. Keep the perspective.','Progress has more than one shape.','Look back. Notice what grew.','A little perspective looks good on you.'],
} as const;
export type MantraModule=keyof typeof mantraLibrary;
/** One selection per profile-local civil day; route visits never advance it. */
export function mantraWindow(now:Date,timeZone=mockProfile.timeZone):number {return Math.floor(Date.parse(`${todayInTimeZone(timeZone,now)}T12:00:00Z`)/86400000);}
/** Find the next civil midnight, including short/long daylight-saving days. */
export function nextMantraBoundary(now:Date,timeZone=mockProfile.timeZone):Date {
 const day=mantraWindow(now,timeZone);let low=now.getTime(),high=low+36*3600000;
 while(high-low>1){const middle=Math.floor((low+high)/2);if(mantraWindow(new Date(middle),timeZone)===day)low=middle;else high=middle;}
 return new Date(high);
}
export function selectMantra(module:MantraModule,window:number|null):string {
 // Preserve each remaining collection’s previous daily sequence after removing retired copy.
 const lines=mantraLibrary[module],offset=({daily:0,insights:14} as const)[module];
 if(window===null)return lines[0];
 return lines[((window+offset)%lines.length+lines.length)%lines.length];
}
