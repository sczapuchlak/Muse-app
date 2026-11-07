/**
 * Muse Marks (#79 §4): small planner symbols. A Mark is visual by default; it may *point at* one existing record
 * (event, task, movement type, book or Aspiration) but never copies it and never counts as activity, completion or
 * progress. Linked event and task Marks follow their record's current date; if the record is gone the Mark stays,
 * marked as unlinked, rather than disappearing or inventing data.
 */
import type {AccentColor} from './appearance-values';
import {validAccent} from './appearance-values';
import {validDate} from './dates';
import type {DayEvent,PlannedTask} from './models';

/** A small, curated library from Muse's own icon set (no uploads, no marketplace). */
export const markIcons=[
 {id:'star',label:'Star'},{id:'heart',label:'Heart'},{id:'plane',label:'Travel'},{id:'suitcase',label:'Trip'},
 {id:'dumbbell',label:'Strength'},{id:'yoga',label:'Yoga'},{id:'run',label:'Run'},{id:'bike',label:'Ride'},
 {id:'book',label:'Book'},{id:'calendar',label:'Appointment'},{id:'cake',label:'Celebration'},{id:'people',label:'People'},
 {id:'briefcase',label:'Work'},{id:'study',label:'Study'},{id:'medicine',label:'Health'},{id:'paw',label:'Pet'},
 {id:'music',label:'Music'},{id:'flower',label:'Flower'},{id:'sun',label:'Sun'},{id:'moon',label:'Moon'},
 {id:'sparkle',label:'Sparkle'},{id:'flame',label:'Focus'},{id:'pin',label:'Pin'},{id:'trophy',label:'Milestone'},
] as const;
export type MarkIcon=typeof markIcons[number]['id'];
export const markColors:AccentColor[]=['primary','secondary','pop','warm','info'];
export const markLinkKinds=[
 {id:'event',label:'Event'},{id:'task',label:'Task'},{id:'movement',label:'Movement type'},{id:'book',label:'Book'},{id:'aspiration',label:'Aspiration'},
] as const;
export type MarkLinkKind=typeof markLinkKinds[number]['id'];

export type MuseMark={id:string;date:string;endDate?:string;icon:MarkIcon;color:AccentColor;label:string;linkKind?:MarkLinkKind;linkId?:string;revision:number};
export type MarkRow={id:string;local_date:string;end_date:string|null;icon:string;color:string;label:string;link_kind:string|null;link_id:string|null;revision:number};

export function markFromRow(r:MarkRow):MuseMark|null{
 if(!validDate(r.local_date)||!markIcons.some(i=>i.id===r.icon))return null;
 const kind=markLinkKinds.find(k=>k.id===r.link_kind)?.id;
 return {id:r.id,date:r.local_date,...(r.end_date&&r.end_date>r.local_date?{endDate:r.end_date}:{}),icon:r.icon as MarkIcon,color:validAccent(r.color)?r.color as AccentColor:'primary',label:r.label.slice(0,40),
  ...(kind&&r.link_id?{linkKind:kind,linkId:r.link_id}:{}),revision:r.revision};
}
export const markToRow=(m:Omit<MuseMark,'revision'>)=>({id:m.id,local_date:m.date,end_date:m.endDate&&m.endDate>m.date?m.endDate:null,icon:m.icon,color:m.color,label:m.label.trim().slice(0,40),link_kind:m.linkKind??null,link_id:m.linkKind?m.linkId??null:null});

export type MarkSources={events:DayEvent[];tasks:PlannedTask[];movementTypes:{id:string;name:string}[];books:{id:string;title:string}[];aspirations:{id:string;title:string}[]};
export type ResolvedMark=MuseMark&{start:string;end:string;title:string;linked:boolean;missing:boolean;href?:string};
/**
 * Where and how a Mark shows. Event and task Marks sit on the record's *current* date (so rescheduling moves the
 * Mark too); other links keep the Mark's own date and borrow only the source's name.
 */
export function resolveMark(m:MuseMark,s:MarkSources):ResolvedMark{
 const base={...m,start:m.date,end:m.endDate??m.date,title:m.label,linked:false,missing:false};
 if(!m.linkKind||!m.linkId)return base;
 if(m.linkKind==='event'){const e=s.events.find(x=>x.id===m.linkId);if(!e)return {...base,missing:true};return {...base,start:e.date,end:e.endDate??e.date,title:m.label||e.title,linked:true};}
 if(m.linkKind==='task'){const t=s.tasks.find(x=>x.id===m.linkId);if(!t)return {...base,missing:true};return {...base,start:t.plannedDate??m.date,end:t.plannedDate??m.date,title:m.label||t.title,linked:true};}
 const list=m.linkKind==='movement'?s.movementTypes.map(x=>({id:x.id,title:x.name})):m.linkKind==='book'?s.books:s.aspirations;
 const found=list.find(x=>x.id===m.linkId);if(!found)return {...base,missing:true};
 return {...base,title:m.label||found.title,linked:true,href:m.linkKind==='book'?'/whimsy/bookshelf':m.linkKind==='aspiration'?'/rituals?view=aspirations':'/'};
}
/** Marks to draw on one day: date Marks (incl. ranges), not the ones riding on a specific task or event row. */
export function dayMarks(marks:ResolvedMark[],day:string){return marks.filter(m=>m.linkKind!=='event'&&m.linkKind!=='task'&&m.start<=day&&day<=m.end);}
export const itemMark=(marks:ResolvedMark[],kind:'event'|'task',id:string)=>marks.find(m=>m.linkKind===kind&&m.linkId===id);

/** The bullet-journal status key, reusing only states Muse already has. Every symbol also has words. */
export const statusLegend=[
 {symbol:'•',label:'Open task'},{symbol:'✓',label:'Completed task'},{symbol:'›',label:'Overdue — migrate it when you are ready'},
 {symbol:'★',label:'One of the day’s three priorities'},{symbol:'○',label:'Event'},{symbol:'?',label:'Tentative event'},{symbol:'×',label:'Canceled event'},
] as const;
/** Mark ids are stable words; this is the Muse icon each one draws with. */
export const markIconName=(icon:MarkIcon)=>icon==='star'?'favorite':icon;
