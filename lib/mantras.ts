import { todayInTimeZone } from './dates';
import { mockProfile } from './mock-profile';
/** Daily editorial rotation for Daily Edit and Insights (21 lines each, #53). Fixed module identity lives in page-header.ts. */
export const mantraLibrary = {
 daily: ['Make today a little more yours.','Ordinary days are where the magic lives.','A little structure. A lot of possibility.',"You don't have to do it all to make today count.","There's beauty in the becoming.",
  'A good day can be a quiet one.','Start where you are. That is the whole trick.','Small things, done kindly.','Today has room for one brave thing.','Leave a little space for the unplanned.',
  'Not every day is a headline. Some are footnotes worth keeping.','The ordinary is doing more than it lets on.','Pick the next right thing. Then the one after.','Gentle counts as progress.','Make it lovely, or make it done.',
  'A slow morning is still a morning.','Some days are for planting, not picking.','Your attention is the most interesting thing you own.','A little more you than yesterday.','Begin with what is already working.','The day is a draft. Edit freely.'],
 insights: ['The story behind your days.','See the patterns. Keep the perspective.','Progress has more than one shape.','Look back. Notice what grew.','A little perspective looks good on you.',
  'Patterns are just stories that repeat.','What you track, you get to understand.','Data, but make it gentle.','Missing days are just blank pages.','Notice first. Decide later.',
  'The long view is kinder.','Every chart is a little autobiography.','Look closer. It is more interesting than it seems.','Some progress only shows from a distance.','Your rhythms, rendered.',
  'The quiet trends are worth a look too.','Not a scorecard. A mirror with good lighting.','Curiosity over judgment, always.','A few numbers, a lot of context.','What grew while you weren’t watching?','Hindsight, nicely formatted.'],
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
