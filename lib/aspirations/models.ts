/**
 * Aspirations (#54): longer-term goals beside Habits in Rituals. An aspiration owns its target, milestones and journal.
 * Connected progress is read from the authoritative module (progress engine, Reading Challenge) at display time and
 * never stored here; habit and task links are ids only.
 */
import type {Tables} from '@/lib/database.types';
import type {ProgressMetric} from '@/lib/progress/engine';
import type {MovementCategory} from '@/lib/progress/movement';
import type {WaterUnit} from '@/lib/water';

export type AspirationStatus='planned'|'active'|'paused'|'completed'|'archived';
export type Timeframe='month'|'quarter'|'year'|'custom'|'someday';
export type ProgressKind='numeric'|'manual'|'milestones'|'binary'|'connected';
export type Milestone={id:string;title:string;description?:string;targetDate?:string;completedOn?:string;notes?:string;weight?:number;taskId?:string};
export type AspirationConnection=
 |{kind:'metric';metric:ProgressMetric;category?:MovementCategory;unit?:WaterUnit}
 |{kind:'reading-challenge';year:string};

export type AspirationRow=Tables<'aspirations'>;
export type AspirationUpdate={id:string;aspirationId:string;recordedOn:string;value:number|null;note:string|null;milestoneId:string|null;createdAt:string};
export type Aspiration={
 id:string;title:string;description:string|null;motivation:string|null;category:string;icon:string|null;accent:string|null;
 startDate:string;targetDate:string|null;timeframe:Timeframe;status:AspirationStatus;progressKind:ProgressKind;
 target:number|null;unit:string|null;connection:AspirationConnection|null;milestones:Milestone[];
 ritualIds:string[];taskIds:string[];reflection:string|null;completedOn:string|null;celebrated:string[];position:number;
 /** The aspiration this one renews (a new period); the earlier one keeps its own history. */
 renewedFrom:string|null;
 revision:number;createdAt:string;updatedAt:string;
};

export const aspirationCategories=['Creative','Learning','Career','Health & Fitness','Financial','Personal','Adventure','Home','Other'] as const;
export const statusLabels:Record<AspirationStatus,string>={planned:'Planned',active:'Active',paused:'Paused',completed:'Completed',archived:'Archived'};
export const timeframeLabels:Record<Timeframe,string>={month:'This month',quarter:'This quarter',year:'This year',custom:'Custom dates',someday:'Someday'};
export const progressKindLabels:Record<ProgressKind,{label:string;detail:string}>={
 milestones:{label:'Milestones',detail:'Progress follows the steps you check off'},
 numeric:{label:'A number',detail:'Like 36 books or $3,000; you record where you are'},
 manual:{label:'A percentage',detail:'You update it as you go'},
 binary:{label:'Done or not yet',detail:'One finish line'},
 connected:{label:'From Muse',detail:'Counted from records Muse already has'},
};

const asMilestones=(v:unknown):Milestone[]=>Array.isArray(v)?v.filter((m):m is Milestone=>!!m&&typeof m==='object'&&typeof (m as Milestone).id==='string'&&typeof (m as Milestone).title==='string'):[];
const asConnection=(v:unknown):AspirationConnection|null=>{if(!v||typeof v!=='object')return null;const c=v as Record<string,unknown>;
 if(c.kind==='reading-challenge'&&typeof c.year==='string')return {kind:'reading-challenge',year:c.year};
 if(c.kind==='metric'&&typeof c.metric==='string')return c as unknown as AspirationConnection;return null;};

export function fromRow(r:AspirationRow):Aspiration{
 return {id:r.id,title:r.title,description:r.description,motivation:r.motivation,category:r.category,icon:r.icon,accent:r.accent,startDate:r.start_date,targetDate:r.target_date,
  timeframe:r.timeframe as Timeframe,status:r.status as AspirationStatus,progressKind:r.progress_kind as ProgressKind,target:r.target,unit:r.unit,connection:asConnection(r.connection),
  milestones:asMilestones(r.milestones),ritualIds:r.ritual_ids,taskIds:r.task_ids,reflection:r.reflection,completedOn:r.completed_on,celebrated:r.celebrated,position:r.position,renewedFrom:r.renewed_from,
  revision:r.revision,createdAt:r.created_at,updatedAt:r.updated_at};
}
export function toRow(a:Aspiration){
 return {id:a.id,title:a.title.trim(),description:a.description?.trim()||null,motivation:a.motivation?.trim()||null,category:a.category.trim()||'Personal',icon:a.icon||null,accent:a.accent||null,
  start_date:a.startDate,target_date:a.targetDate||null,timeframe:a.timeframe,status:a.status,progress_kind:a.progressKind,target:a.target,unit:a.unit?.trim()||null,
  connection:a.connection,milestones:a.milestones,ritual_ids:a.ritualIds,task_ids:a.taskIds,reflection:a.reflection?.trim()||null,completed_on:a.status==='completed'||a.status==='archived'?(a.completedOn??null):null,
  celebrated:a.celebrated,position:a.position,renewed_from:a.renewedFrom};
}
