import { mantraLibrary } from './mantras';
/** Compatibility for date-based consumers; all editorial content now has one source. */
export const dailyMantras=mantraLibrary.daily;
/** @deprecated UI rotation uses MuseMantra and the profile-local daily clock. */
export function supportingMantra(date:string):string {
 const day=Math.floor(Date.parse(`${date}T12:00:00Z`)/86400000);
 return dailyMantras[Number.isFinite(day)?((day%dailyMantras.length)+dailyMantras.length)%dailyMantras.length:0];
}
