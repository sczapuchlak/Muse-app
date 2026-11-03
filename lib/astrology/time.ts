import {validDate,validTimeZone,shiftDate} from '@/lib/dates';

function civilParts(instant:number,zone:string){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(instant);return Object.fromEntries(parts.map(p=>[p.type,p.value]));}
/** Resolve using real zone offsets, including historical second offsets; never today's offset. */
export function civilTimeCandidates(date:string,time:string,zone:string):string[]{
 if(!validDate(date)||!validTimeZone(zone)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Enter a valid birth date, local time and IANA timezone.');
 const target=`${date}T${time}:00`,nominal=Date.parse(target+'Z'),offsets=new Set<number>();
 for(let hours=-48;hours<=48;hours+=3){const instant=nominal+hours*3600000,p=civilParts(instant,zone);offsets.add(Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`)-instant);}
 return [...offsets].map(offset=>nominal-offset).filter(instant=>{const p=civilParts(instant,zone);return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`===target;}).sort((a,b)=>a-b).map(value=>new Date(value).toISOString());
}
export function resolveBirthInstant(date:string,time:string,zone:string,fold?:'earlier'|'later'){
 const candidates=civilTimeCandidates(date,time,zone);
 if(!candidates.length)throw Error('That local time did not exist because the clocks changed. Check the birth record and timezone.');
 if(candidates.length>1&&!fold)throw Error('That time occurred twice. Choose the earlier or later occurrence from the birth record.');
 return fold==='later'?candidates.at(-1)!:candidates[0];
}
/** Unknown time covers the actual local civil day, including 23/25-hour DST days. */
export function birthDayBounds(date:string,zone:string){
 const startOf=(day:string)=>{for(let minute=0;minute<360;minute++){const time=`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`,values=civilTimeCandidates(day,time,zone);if(values.length)return Date.parse(values[0]);}throw Error('This civil date cannot be resolved in that timezone. Check the date and place.');};
 return {start:startOf(date),end:startOf(shiftDate(date,1))-1};
}
