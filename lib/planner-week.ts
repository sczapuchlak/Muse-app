/** The Weekly Agenda planning column (#79): content per week in `planner_week_sections`, its title/type on the account. */
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from './database.types';
import {defaultLayout,LAYOUT_SCHEMA_VERSION,parseLayout,type AgendaLayout} from './agenda-layout';
import {markFromRow,markToRow,type MuseMark} from './muse-marks';
import {emptyLibrary,LIBRARY_VERSION,parseItems,parseLibrary,type Library,type SectionItem} from './planner-customization';
import {parsePlanningConfig,parsePlanningItems,type PlanningConfig,type PlanningItem} from './agenda';

type Client=SupabaseClient<Database>;
export type WeekSection={weekStart:string;notes:string;items:PlanningItem[];revision:number};
const metadataKey='muse_agenda_planning';

export async function readPlanningConfig(client:Client){const {data}=await client.auth.getUser();return parsePlanningConfig(data.user?.user_metadata?.[metadataKey]);}
export async function savePlanningConfig(client:Client,config:PlanningConfig){const parsed=parsePlanningConfig(config);const {error}=await client.auth.updateUser({data:{[metadataKey]:parsed}});if(error)throw error;return parsed;}

export async function readWeekSection(client:Client,userId:string,weekStart:string):Promise<WeekSection>{
 const {data,error}=await client.from('planner_week_sections').select('week_start,notes,items,revision').eq('user_id',userId).eq('week_start',weekStart).maybeSingle();
 if(error)throw error;
 return data?{weekStart,notes:data.notes,items:parsePlanningItems(data.items),revision:data.revision}:{weekStart,notes:'',items:[],revision:0};
}
/** Insert the first time, then update only if nobody changed it since (revision check). */
export async function saveWeekSection(client:Client,userId:string,s:WeekSection):Promise<WeekSection>{
 const row={notes:s.notes.slice(0,5000),items:s.items.slice(0,40)};
 const result=s.revision===0
  ?await client.from('planner_week_sections').insert({user_id:userId,week_start:s.weekStart,...row}).select('week_start,notes,items,revision').single()
  :await client.from('planner_week_sections').update(row).eq('user_id',userId).eq('week_start',s.weekStart).eq('revision',s.revision).select('week_start,notes,items,revision').maybeSingle();
 if(result.error)throw result.error;
 if(!result.data)throw Error('This week changed on another device. Reload to see the latest.');
 return {weekStart:s.weekStart,notes:result.data.notes,items:parsePlanningItems(result.data.items),revision:result.data.revision};
}

// ---------- Shared weekly template, Muse Marks and day notes (#79) ----------
/** The person's weekly section template; the default until they customize it. */
export async function readAgendaLayout(client:Client,userId:string):Promise<{layout:AgendaLayout;revision:number}>{
 const {data,error}=await client.from('planner_agenda_layouts').select('schema_version,sections,revision').eq('user_id',userId).maybeSingle();
 if(error)throw error;
 return data?{layout:parseLayout({sections:data.sections}),revision:data.revision}:{layout:defaultLayout(),revision:0};
}
export async function saveAgendaLayout(client:Client,userId:string,layout:AgendaLayout,revision:number):Promise<{layout:AgendaLayout;revision:number}>{
 const row={schema_version:LAYOUT_SCHEMA_VERSION,sections:parseLayout(layout).sections as unknown as NonNullable<Json>};
 const result=revision===0
  ?await client.from('planner_agenda_layouts').insert({user_id:userId,...row}).select('sections,revision').single()
  :await client.from('planner_agenda_layouts').update(row).eq('user_id',userId).eq('revision',revision).select('sections,revision').maybeSingle();
 if(result.error)throw result.error;
 if(!result.data)throw Error('Your layout changed on another device. Reload to see the latest.');
 return {layout:parseLayout({sections:result.data.sections}),revision:result.data.revision};
}

const markColumns='id,local_date,end_date,icon,color,gradient,meaning,label,link_kind,link_id,revision';
/** Marks touching a date window (ranges included). Linked event/task Marks are read regardless of their stored date. */
export async function readMarks(client:Client,userId:string,start:string,end:string):Promise<MuseMark[]>{
 const [dated,items]=await Promise.all([
  client.from('planner_marks').select(markColumns).eq('user_id',userId).lte('local_date',end).or(`end_date.gte.${start},and(end_date.is.null,local_date.gte.${start})`).limit(1000),
  client.from('planner_marks').select(markColumns).eq('user_id',userId).in('link_kind',['event','task']).limit(2000),
 ]);
 if(dated.error||items.error)throw dated.error??items.error;
 const byId=new Map<string,MuseMark>();
 for(const row of [...dated.data,...items.data]){const m=markFromRow(row);if(m)byId.set(m.id,m);}
 return [...byId.values()];
}
export async function saveMark(client:Client,userId:string,mark:MuseMark|Omit<MuseMark,'revision'>&{revision?:number}):Promise<MuseMark>{
 const row=markToRow(mark),revision=mark.revision??0;
 const result=revision===0
  ?await client.from('planner_marks').insert({user_id:userId,...row}).select(markColumns).single()
  :await client.from('planner_marks').update(row).eq('user_id',userId).eq('id',mark.id).eq('revision',revision).select(markColumns).maybeSingle();
 if(result.error)throw result.error;
 const saved=result.data?markFromRow(result.data):null;
 if(!saved)throw Error('This Mark changed on another device. Reload to see the latest.');
 return saved;
}
/** Removing a Mark removes only the Mark, never the record it pointed at. */
export async function deleteMark(client:Client,userId:string,id:string){const {error}=await client.from('planner_marks').delete().eq('user_id',userId).eq('id',id);if(error)throw error;}

export type DayNote={sectionId:string;date:string;body:string;items:SectionItem[];revision:number};
const noteColumns='section_id,local_date,body,items,revision';
const noteFrom=(r:{section_id:string;local_date:string;body:string;items:unknown;revision:number}):DayNote=>({sectionId:r.section_id,date:r.local_date,body:r.body,items:parseItems(r.items),revision:r.revision});
export async function readDayNotes(client:Client,userId:string,start:string,end:string):Promise<DayNote[]>{
 const {data,error}=await client.from('planner_day_notes').select(noteColumns).eq('user_id',userId).gte('local_date',start).lte('local_date',end).limit(2000);
 if(error)throw error;
 return data.map(noteFrom);
}
export async function saveDayNote(client:Client,userId:string,note:DayNote):Promise<DayNote>{
 const row={body:note.body.slice(0,5000),items:parseItems(note.items) as unknown as NonNullable<Json>};
 const result=note.revision===0
  ?await client.from('planner_day_notes').insert({user_id:userId,section_id:note.sectionId,local_date:note.date,...row}).select(noteColumns).single()
  :await client.from('planner_day_notes').update(row).eq('user_id',userId).eq('section_id',note.sectionId).eq('local_date',note.date).eq('revision',note.revision).select(noteColumns).maybeSingle();
 if(result.error)throw result.error;
 if(!result.data)throw Error('This section changed on another device. Reload to see the latest.');
 return noteFrom(result.data);
}
/** Permanently deletes everything written in one custom section (every day). Only after the person confirms. */
export async function deleteSectionContent(client:Client,userId:string,sectionId:string){const {error}=await client.from('planner_day_notes').delete().eq('user_id',userId).eq('section_id',sectionId);if(error)throw error;}

// ---------- Customization library (#87) ----------
export async function readLibrary(client:Client,userId:string):Promise<{library:Library;revision:number}>{
 const {data,error}=await client.from('planner_customizations').select('library,revision').eq('user_id',userId).maybeSingle();
 if(error)throw error;
 return data?{library:parseLibrary(data.library),revision:data.revision}:{library:emptyLibrary(),revision:0};
}
export async function saveLibrary(client:Client,userId:string,library:Library,revision:number):Promise<{library:Library;revision:number}>{
 const row={schema_version:LIBRARY_VERSION,library:parseLibrary(library) as unknown as NonNullable<Json>};
 const result=revision===0
  ?await client.from('planner_customizations').insert({user_id:userId,...row}).select('library,revision').single()
  :await client.from('planner_customizations').update(row).eq('user_id',userId).eq('revision',revision).select('library,revision').maybeSingle();
 if(result.error)throw result.error;
 if(!result.data)throw Error('Your saved styles changed on another device. Reload to see the latest.');
 return {library:parseLibrary(result.data.library),revision:result.data.revision};
}

// ---------- Running List manual order (#81) ----------
export async function readRunningOrder(client:Client,userId:string):Promise<{ids:string[];revision:number}>{
 const {data,error}=await client.from('planner_running_orders').select('task_ids,revision').eq('user_id',userId).maybeSingle();
 if(error)throw error;
 const ids=Array.isArray(data?.task_ids)?(data!.task_ids as unknown[]).filter((x):x is string=>typeof x==='string').slice(0,5000):[];
 return {ids,revision:data?.revision??0};
}
/** Insert the first time, then a revision-checked update, like every other owner record. */
export async function saveRunningOrder(client:Client,userId:string,ids:string[],revision:number):Promise<number>{
 const task_ids=[...new Set(ids)].slice(0,5000);
 const r=revision===0
  ?await client.from('planner_running_orders').insert({user_id:userId,task_ids}).select('revision').single()
  :await client.from('planner_running_orders').update({task_ids}).eq('user_id',userId).eq('revision',revision).select('revision').maybeSingle();
 if(r.error)throw r.error;if(!r.data)throw Error('Your list order changed on another device. Reload to see it.');
 return r.data.revision;
}
