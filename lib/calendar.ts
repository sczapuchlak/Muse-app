import {shiftDate,weekDates} from './dates';

/** Civil-date arithmetic only: profile-local today is supplied by the caller. */
export function calendarDays(date:string):string[]{
  const start=weekDates(`${date.slice(0,7)}-01`)[0];
  return Array.from({length:42},(_,index)=>shiftDate(start,index));
}
export function shiftCalendarMonth(date:string,months:number):string{
  const first=new Date(`${date.slice(0,7)}-01T12:00:00Z`);
  first.setUTCMonth(first.getUTCMonth()+months);
  if(first.getUTCFullYear()<1||first.getUTCFullYear()>9999)return date;
  const last=new Date(first);last.setUTCMonth(last.getUTCMonth()+1);last.setUTCDate(0);
  first.setUTCDate(Math.min(Number(date.slice(8)),last.getUTCDate()));
  return first.toISOString().slice(0,10);
}
export function calendarKey(date:string,key:string,shift=false):string|null{
  if(key==='ArrowLeft')return shiftDate(date,-1);
  if(key==='ArrowRight')return shiftDate(date,1);
  if(key==='ArrowUp')return shiftDate(date,-7);
  if(key==='ArrowDown')return shiftDate(date,7);
  if(key==='Home')return weekDates(date)[0];
  if(key==='End')return weekDates(date)[6];
  if(key==='PageUp'||key==='PageDown')return shiftCalendarMonth(date,(key==='PageUp'?-1:1)*(shift?12:1));
  return null;
}
