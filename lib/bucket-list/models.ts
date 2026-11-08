/**
 * Bucket List (#84): one long-running list of dreams in Rituals, inspired by a handwritten bullet-journal list with a
 * color key — every year gets a color, and a dream completed in that year is highlighted in it. The list's settings
 * (title, horizon, year colors, completion treatment) live on one `bucket_lists` row; each dream is a `bucket_entries`
 * row. Year colors are stored hex values, never theme tokens, so the record of a year looks the same in every theme.
 */
import type {Tables} from '@/lib/database.types';
import type {BoardImage} from '@/lib/constellation-board';

export type BucketStatus='dreaming'|'planned'|'in_progress'|'completed';
export type CompletionStyle='highlight'|'strike'|'stamp';
export type BucketLink=
 |{kind:'url';url:string;label?:string}
 /** Future Constellations/Pinboard connection: the card's id only, never a copy of the card. */
 |{kind:'constellation';id:string;label?:string};
export type BucketCompletion={story?:string;location?:string;memory?:string;photos?:BoardImage[]};
export type PastCompletion={completedOn:string;reopenedOn:string};

export type BucketList={title:string;horizonStart:number;horizonEnd:number;yearColors:Record<string,string>;completionStyle:CompletionStyle;showNumbers:boolean;revision:number};
export type BucketEntry={
 id:string;number:number|null;position:number;title:string;notes:string|null;category:string|null;tags:string[];icon:string|null;
 status:BucketStatus;targetYear:number|null;links:BucketLink[];cover:BoardImage|null;aspirationId:string|null;
 completedOn:string|null;completion:BucketCompletion;history:PastCompletion[];archivedAt:string|null;
 revision:number;createdAt:string;updatedAt:string;
};

export const statusLabels:Record<BucketStatus,string>={dreaming:'Dreaming',planned:'Planned',in_progress:'In progress',completed:'Completed'};
export const openStatuses:BucketStatus[]=['dreaming','planned','in_progress'];
export const completionStyles:{id:CompletionStyle;label:string;detail:string}[]=[
 {id:'highlight',label:'Highlight',detail:'The row is washed in that year’s color'},
 {id:'strike',label:'Cross off',detail:'A line through it in that year’s color'},
 {id:'stamp',label:'Stamp',detail:'A small year stamp in that year’s color'},
];
export const bucketCategories=['Travel','Adventure','Creative','Learning','Skills','Food','Experiences','Challenges','Home','Just for fun'] as const;

export type BucketListRow=Tables<'bucket_lists'>;
export type BucketEntryRow=Tables<'bucket_entries'>;

const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const isImage=(v:unknown):v is BoardImage=>{const o=obj(v);return typeof o.id==='string'&&typeof o.path==='string'&&typeof o.thumbnailPath==='string';};
const str=(v:unknown)=>typeof v==='string'&&v.trim()?v:undefined;
function asLinks(v:unknown):BucketLink[]{
 if(!Array.isArray(v))return [];
 return v.flatMap((l):BucketLink[]=>{const o=obj(l);
  if(o.kind==='url'&&typeof o.url==='string')return [{kind:'url',url:o.url,...(str(o.label)?{label:str(o.label)}:{})}];
  if(o.kind==='constellation'&&typeof o.id==='string')return [{kind:'constellation',id:o.id,...(str(o.label)?{label:str(o.label)}:{})}];
  return [];});
}
function asCompletion(v:unknown):BucketCompletion{const o=obj(v);
 return {...(str(o.story)?{story:str(o.story)}:{}),...(str(o.location)?{location:str(o.location)}:{}),...(str(o.memory)?{memory:str(o.memory)}:{}),
  ...(Array.isArray(o.photos)&&o.photos.some(isImage)?{photos:o.photos.filter(isImage)}:{})};}
const asHistory=(v:unknown):PastCompletion[]=>Array.isArray(v)?v.filter((h):h is PastCompletion=>typeof obj(h).completedOn==='string'&&typeof obj(h).reopenedOn==='string'):[];
const asColors=(v:unknown):Record<string,string>=>Object.fromEntries(Object.entries(obj(v)).filter(([y,c])=>/^\d{4}$/.test(y)&&typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)) as [string,string][]);

export function listFromRow(r:BucketListRow):BucketList{
 return {title:r.title,horizonStart:r.horizon_start,horizonEnd:r.horizon_end,yearColors:asColors(r.year_colors),completionStyle:r.completion_style as CompletionStyle,showNumbers:r.show_numbers,revision:r.revision};
}
export function listToRow(l:BucketList){
 return {title:l.title.trim()||'Bucket List',horizon_start:l.horizonStart,horizon_end:l.horizonEnd,year_colors:l.yearColors,completion_style:l.completionStyle,show_numbers:l.showNumbers};
}
export function entryFromRow(r:BucketEntryRow):BucketEntry{
 return {id:r.id,number:r.number,position:r.position,title:r.title,notes:r.notes,category:r.category,tags:r.tags,icon:r.icon,status:r.status as BucketStatus,targetYear:r.target_year,
  links:asLinks(r.links),cover:isImage(r.cover)?r.cover:null,aspirationId:r.aspiration_id,completedOn:r.completed_on,completion:asCompletion(r.completion),history:asHistory(r.history),
  archivedAt:r.archived_at,revision:r.revision,createdAt:r.created_at,updatedAt:r.updated_at};
}
export function entryToRow(e:BucketEntry){
 const completed=e.status==='completed'&&!!e.completedOn;
 return {id:e.id,number:e.number,position:e.position,title:e.title.trim(),notes:e.notes?.trim()||null,category:e.category?.trim()||null,
  tags:[...new Set(e.tags.map(t=>t.trim().replace(/^#/,'')).filter(Boolean))].slice(0,20),icon:e.icon||null,status:completed?'completed':e.status==='completed'?'dreaming':e.status,
  target_year:e.targetYear,links:e.links,cover:e.cover,aspiration_id:e.aspirationId,completed_on:completed?e.completedOn:null,completion:e.completion,history:e.history,archived_at:e.archivedAt};
}

/**
 * #104 §10: how a photo sits in its card frame — a focal point (0–100%) and zoom (1–3). Stored beside the image in
 * the same JSON; the original upload is never cropped, so the frame can be changed any time.
 */
export type PhotoFrame={x:number;y:number;zoom:number};
export const defaultFrame:PhotoFrame={x:50,y:50,zoom:1};
const clamp=(n:unknown,lo:number,hi:number,d:number)=>typeof n==='number'&&Number.isFinite(n)?Math.min(hi,Math.max(lo,n)):d;
export function photoFrame(image:unknown):PhotoFrame{const f=(image as {frame?:Partial<PhotoFrame>}|null)?.frame;return f&&typeof f==='object'?{x:clamp(f.x,0,100,50),y:clamp(f.y,0,100,50),zoom:clamp(f.zoom,1,3,1)}:defaultFrame;}
export function withFrame<T extends object>(image:T,frame:PhotoFrame):T&{frame:PhotoFrame}{return {...image,frame:{x:Math.round(frame.x*10)/10,y:Math.round(frame.y*10)/10,zoom:Math.round(frame.zoom*100)/100}};}
