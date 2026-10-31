import {shiftDate,validDate} from '../dates';
export type InsightRange={start:string;end:string};
export type RangePreset='7'|'30'|'90'|'year'|'custom';
export function rangeDays(range:InsightRange):string[]{if(!validDate(range.start)||!validDate(range.end)||range.end<range.start)return [];const count=Math.floor((Date.parse(`${range.end}T12:00:00Z`)-Date.parse(`${range.start}T12:00:00Z`))/86400000)+1;if(count>732)return [];return Array.from({length:count},(_,i)=>shiftDate(range.start,i));}
export function rangeFor(preset:Exclude<RangePreset,'custom'>,anchor:string):InsightRange{return {start:preset==='year'?`${anchor.slice(0,4)}-01-01`:shiftDate(anchor,-(Number(preset)-1)),end:anchor};}
export function previousRange(range:InsightRange):InsightRange{const length=rangeDays(range).length;return {start:shiftDate(range.start,-length),end:shiftDate(range.start,-1)};}
export const within=(date:string|undefined,range:InsightRange)=>!!date&&validDate(date)&&date>=range.start&&date<=range.end;
export function localTimestampDate(timestamp:string|undefined,timeZone:string):string|undefined{if(!timestamp)return; if(timestamp.length===10&&validDate(timestamp))return timestamp;if(!validDate(timestamp.slice(0,10)))return;const date=new Date(timestamp);if(!Number.isFinite(date.getTime()))return;const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);const get=(key:string)=>parts.find((part)=>part.type===key)?.value;return `${get('year')}-${get('month')}-${get('day')}`;}
/** No percentage is manufactured against missing or zero comparison data. */
export function compareCounts(current:number,previous:number,previousHasData:boolean){return {difference:previousHasData?current-previous:null,percent:previousHasData&&previous>0?(current-previous)/previous*100:null};}
