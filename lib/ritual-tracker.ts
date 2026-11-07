/**
 * Habit trackers (#85): week, month and year views over the SAME Rituals state. Nothing here stores anything; every
 * square is `ritualCell` (the one status rule the week grid uses) for a habit and a date, so all views agree.
 */
import {ritualCell,ritualOpportunity,weeklyValue,type RitualDefinition,type RitualState} from './rituals';
import {shiftDate,weekDates} from './dates';

export type TrackerPeriod='week'|'month'|'year';
export type TrackerLayout='grid'|'focus';
export const trackerPeriods:{id:TrackerPeriod;label:string}[]=[{id:'week',label:'Week'},{id:'month',label:'Month'},{id:'year',label:'Year'}];
export const trackerLayouts:{id:TrackerLayout;label:string}[]=[{id:'grid',label:'Grid'},{id:'focus',label:'Focus'}];

const pad=(n:number)=>String(n).padStart(2,'0');
export const daysInMonth=(year:number,month:number)=>new Date(Date.UTC(year,month,0)).getUTCDate();
/** Every date in the month of `date` (1-based month). */
export function monthDates(date:string){const y=Number(date.slice(0,4)),m=Number(date.slice(5,7));return Array.from({length:daysInMonth(y,m)},(_,i)=>`${y}-${pad(m)}-${pad(i+1)}`);}
export const monthKeys=(date:string)=>Array.from({length:12},(_,i)=>`${date.slice(0,4)}-${pad(i+1)}`);
export const shiftMonth=(date:string,delta:number)=>{const y=Number(date.slice(0,4)),m=Number(date.slice(5,7))-1+delta,ny=y+Math.floor(m/12),nm=((m%12)+12)%12+1;return `${ny}-${pad(nm)}-01`;};
export const shiftYear=(date:string,delta:number)=>`${Number(date.slice(0,4))+delta}-${date.slice(5,7)}-01`;
/** Monday-first calendar rows for a month: leading blanks are null. */
export function calendarWeeks(date:string):(string|null)[][]{
 const days=monthDates(date),lead=(new Date(`${days[0]}T12:00:00Z`).getUTCDay()+6)%7,cells=[...Array(lead).fill(null),...days];
 while(cells.length%7)cells.push(null);
 return Array.from({length:cells.length/7},(_,i)=>cells.slice(i*7,i*7+7));
}
export function periodDates(period:TrackerPeriod,date:string){
 if(period==='week')return weekDates(date);
 if(period==='month')return monthDates(date);
 const y=date.slice(0,4);return monthKeys(date).flatMap(k=>monthDates(`${k}-01`)).filter(d=>d.startsWith(y));
}
export const shiftPeriod=(period:TrackerPeriod,date:string,delta:number)=>period==='week'?shiftDate(date,7*delta):period==='month'?shiftMonth(date,delta):shiftYear(date,delta);
export function periodTitle(period:TrackerPeriod,date:string){
 if(period==='year')return date.slice(0,4);
 if(period==='month')return new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${date.slice(0,7)}-15T12:00:00Z`));
 const w=weekDates(date),f=(d:string,o:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('en-US',{...o,timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));
 return `${f(w[0],{month:'short',day:'numeric'})} – ${f(w[6],{month:'short',day:'numeric',year:'numeric'})}`;
}

/** One habit's slice of the state: the same records, indexed so a year of squares stays fast. */
export function habitState(state:RitualState,ritual:RitualDefinition):RitualState{return {...state,entries:state.entries.filter(e=>e.ritualId===ritual.id)};}

export type Square={date:string;status:ReturnType<typeof ritualCell>['status'];value:number|null;level:0|1|2|3|4;category?:string|null};
/**
 * A square for a habit and date. Level is how full it is: complete = 4, partial = 1–3 by share of the goal, everything
 * else 0 (with its status kept, so missed, unknown, upcoming and not-scheduled stay distinct).
 */
export function square(state:RitualState,ritual:RitualDefinition,date:string,today:string):Square{
 const cell=ritualCell(state,ritual,date,today);
 const entry=state.entries.find(e=>e.date===date);
 let level:Square['level']=0;
 if(cell.status==='complete'||(ritual.type==='category'&&cell.recorded&&cell.status!=='missed'))level=4;
 else if(cell.status==='partial'&&cell.value!==null&&ritual.goal>0)level=Math.max(1,Math.min(3,Math.ceil(cell.value/ritual.goal*3))) as 1|2|3;
 else if(cell.status==='logged')level=2;
 return {date,status:cell.status,value:cell.value,level,category:entry?.category??null};
}

/** A habit's share of goals met in a set of dates (decided opportunities only; open/upcoming/unknown aren't failures). */
export function share(state:RitualState,ritual:RitualDefinition,dates:string[],today:string){
 if(ritual.type==='weekly-target'){
  const mondays=[...new Set(dates.map(d=>weekDates(d)[0]))].filter(m=>m<=today&&weekDates(m).some(d=>ritualOpportunity(state,ritual,d)));
  const finished=mondays.filter(m=>shiftDate(m,6)<today||weeklyValue(state,ritual,m)>=ritual.goal);
  const met=finished.filter(m=>weeklyValue(state,ritual,m)>=ritual.goal).length;
  return {met,decided:finished.length,ratio:finished.length?met/finished.length:null};
 }
 let met=0,decided=0;
 // Categorical habits have no goal to meet: report coverage (days logged out of scheduled days so far), never pass/fail.
 if(ritual.type==='category'){for(const d of dates){if(d>today)continue;const sq=square(state,ritual,d,today);if(sq.status==='unscheduled'||sq.status==='open')continue;decided++;if(sq.level===4)met++;}return {met,decided,ratio:decided?met/decided:null};}
 for(const d of dates){if(d>today)continue;const s=square(state,ritual,d,today);
  if(s.status==='unscheduled'||s.status==='open'||s.status==='upcoming'||s.status==='unknown')continue;
  decided++;if(s.level===4)met++;}
 return {met,decided,ratio:decided?met/decided:null};
}
export const ratioLevel=(ratio:number|null):Square['level']=>ratio===null?0:ratio>=1?4:ratio>=.66?3:ratio>=.33?2:ratio>0?1:0;

/** Plain-language status for screen readers and tooltips. */
export function squareLabel(ritual:RitualDefinition,s:Square,categoryLabel?:string){
 switch(s.status){
  case 'unscheduled':return 'not scheduled';
  case 'upcoming':return 'upcoming';
  case 'missed':return 'explicitly missed';
  case 'unknown':return 'not logged';
  case 'open':return 'not logged yet';
  case 'available':return 'available toward the weekly goal';
  case 'logged':return `${s.value} ${ritual.unit} toward the weekly goal`;
  case 'partial':return `partial: ${s.value} of ${ritual.goal} ${ritual.unit}`;
  default:return ritual.type==='category'?(categoryLabel??'logged'):ritual.type==='checkbox'?'complete':`complete: ${s.value} ${ritual.unit}`;
 }
}
