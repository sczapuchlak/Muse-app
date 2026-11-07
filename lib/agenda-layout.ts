/**
 * The Weekly Agenda's shared section template (#79 §3.6–3.9, §14, Workstream A). ONE ordered list of sections is
 * shared by all seven day columns, so order and height always line up across the week. Events and the first Tasks
 * section are permanent. Optional sections only *display* existing records; removing one deletes no data.
 * Pure and versioned: unknown fields and types are dropped, and a broken template falls back to the default.
 */
export const LAYOUT_SCHEMA_VERSION=1;
export const MAX_SECTIONS=16;

export const sectionTypes=[
 {id:'events',label:'Events',hint:'Native Muse events for the day.'},
 {id:'tasks',label:'Tasks',hint:'Tasks planned for the day, from all or chosen workspaces.'},
 {id:'movement',label:'Movement',hint:'Planned movement from Dayview, with what you actually did.'},
 {id:'reading',label:'Reading',hint:'Bookshelf reading sessions for the day.'},
 {id:'meals',label:'Meals',hint:'Meals already planned on Dayview.'},
 {id:'water',label:'Water',hint:'Hydration you logged that day.'},
 {id:'notes',label:'Custom notes',hint:'A short note per day, for anything else.'},
] as const;
export type SectionType=typeof sectionTypes[number]['id'];
export const sectionSizes=[
 {id:'collapsed',label:'Collapsed',rem:2.25},
 {id:'compact',label:'Compact',rem:4.75},
 {id:'standard',label:'Standard',rem:9.5},
 {id:'tall',label:'Tall',rem:16},
] as const;
export type SectionSize=typeof sectionSizes[number]['id'];
/** Reading has two kinds of numbers, never mixed: what happened that day, and where the book stood that day. */
export const readingMetrics=[
 {id:'minutes',label:'Minutes read that day'},
 {id:'pages',label:'Pages read that day'},
 {id:'position',label:'Page reached that day'},
] as const;
export type ReadingMetric=typeof readingMetrics[number]['id'];
export type CompletedChoice='inherit'|'show'|'hide';

export type AgendaSection={
 id:string;type:SectionType;title:string;size:SectionSize;
 /** Tasks only: the workspaces shown. Empty means all workspaces. */
 workspaceIds?:string[];
 /** Tasks only: overrides the Agenda's "Show completed" when not 'inherit'. */
 completed?:CompletedChoice;
 /** Reading only. */
 metric?:ReadingMetric;
};
export type AgendaLayout={version:number;sections:AgendaSection[]};

const defaultTitles:Record<SectionType,string>={events:'Events',tasks:'Tasks',movement:'Movement',reading:'Reading',meals:'Meals',water:'Water',notes:'Notes'};
const defaultSizes:Record<SectionType,SectionSize>={events:'standard',tasks:'tall',movement:'compact',reading:'compact',meals:'compact',water:'collapsed',notes:'compact'};
export const EVENTS_ID='events',TASKS_ID='tasks';
export const defaultLayout=():AgendaLayout=>({version:LAYOUT_SCHEMA_VERSION,sections:[
 {id:EVENTS_ID,type:'events',title:'Events',size:'standard'},
 {id:TASKS_ID,type:'tasks',title:'Tasks',size:'tall',workspaceIds:[],completed:'inherit'},
]});
/** Events and the original Tasks section can be resized, renamed and moved, never removed. */
export const isPermanent=(s:Pick<AgendaSection,'id'>)=>s.id===EVENTS_ID||s.id===TASKS_ID;
/** Only one of each connected section makes sense; Tasks and notes may repeat (e.g. Work and Personal). */
export const repeatable=(type:SectionType)=>type==='tasks'||type==='notes';
export const sectionRem=(size:SectionSize)=>sectionSizes.find(s=>s.id===size)!.rem;

const idPattern=/^[A-Za-z0-9-]{1,64}$/;
function parseSection(value:unknown):AgendaSection|null{
 if(!value||typeof value!=='object')return null;const v=value as Record<string,unknown>;
 const type=sectionTypes.find(t=>t.id===v.type)?.id;if(!type||typeof v.id!=='string'||!idPattern.test(v.id))return null;
 if(v.id===EVENTS_ID&&type!=='events'||v.id===TASKS_ID&&type!=='tasks')return null;
 const size=sectionSizes.find(s=>s.id===v.size)?.id??defaultSizes[type];
 const title=typeof v.title==='string'&&v.title.trim()?v.title.trim().slice(0,32):defaultTitles[type];
 const section:AgendaSection={id:v.id,type,title,size};
 if(type==='tasks'){section.workspaceIds=Array.isArray(v.workspaceIds)?[...new Set(v.workspaceIds.filter((x):x is string=>typeof x==='string'&&x.length<=80))].slice(0,20):[];section.completed=v.completed==='show'||v.completed==='hide'?v.completed:'inherit';}
 if(type==='reading')section.metric=readingMetrics.find(m=>m.id===v.metric)?.id??'minutes';
 return section;
}
/** Saved template → a valid one. Permanent sections are restored if missing; duplicates and extras are dropped. */
export function parseLayout(value:unknown):AgendaLayout{
 const v=value&&typeof value==='object'?value as Record<string,unknown>:{};
 const raw=Array.isArray(v.sections)?v.sections:Array.isArray(value)?value:null;if(!raw)return defaultLayout();
 const seen=new Set<string>(),types=new Set<SectionType>(),sections:AgendaSection[]=[];
 for(const item of raw){const s=parseSection(item);if(!s||seen.has(s.id)||(!repeatable(s.type)&&types.has(s.type)))continue;seen.add(s.id);types.add(s.type);sections.push(s);}
 const base=defaultLayout().sections;
 for(const p of base)if(!seen.has(p.id))sections.splice(p.id===EVENTS_ID?0:Math.min(1,sections.length),0,p);
 return {version:LAYOUT_SCHEMA_VERSION,sections:sections.slice(0,MAX_SECTIONS)};
}

export type LayoutChange=
 |{type:'add';section:Omit<AgendaSection,'title'|'size'>&Partial<Pick<AgendaSection,'title'|'size'>>}
 |{type:'remove';id:string}
 |{type:'move';id:string;to:number}
 |{type:'update';id:string;patch:Partial<Omit<AgendaSection,'id'|'type'>>}
 |{type:'reset'};
/** Every layout edit goes through here, so permanent sections and limits hold no matter which control was used. */
export function changeLayout(layout:AgendaLayout,change:LayoutChange):AgendaLayout{
 const sections=layout.sections;
 if(change.type==='reset')return defaultLayout();
 if(change.type==='add'){
  if(sections.length>=MAX_SECTIONS||sections.some(s=>s.id===change.section.id)||(!repeatable(change.section.type)&&sections.some(s=>s.type===change.section.type)))return layout;
  const s=parseSection({...change.section,title:change.section.title||defaultTitles[change.section.type],size:change.section.size??defaultSizes[change.section.type]});
  return s?{...layout,sections:[...sections,s]}:layout;
 }
 if(change.type==='remove'){const target=sections.find(s=>s.id===change.id);return !target||isPermanent(target)?layout:{...layout,sections:sections.filter(s=>s.id!==change.id)};}
 if(change.type==='move'){
  const from=sections.findIndex(s=>s.id===change.id);if(from<0)return layout;
  const to=Math.max(0,Math.min(sections.length-1,change.to));if(to===from)return layout;
  const next=[...sections];const [moved]=next.splice(from,1);next.splice(to,0,moved);return {...layout,sections:next};
 }
 const next=sections.map(s=>s.id===change.id?parseSection({...s,...change.patch,id:s.id,type:s.type})??s:s);
 return {...layout,sections:next};
}
export const newSectionId=(type:SectionType)=>`${type}-${Math.random().toString(36).slice(2,10)}`;

/** Tasks a Tasks section shows on a day. Missing workspaces are reported, never silently widened to "all". */
export function sectionWorkspaces(section:Pick<AgendaSection,'workspaceIds'>,workspaceIds:readonly string[]){
 const chosen=section.workspaceIds??[];
 if(!chosen.length)return {all:true,ids:[...workspaceIds],missing:[] as string[]};
 return {all:false,ids:chosen.filter(id=>workspaceIds.includes(id)),missing:chosen.filter(id=>!workspaceIds.includes(id))};
}
/** Overlapping Tasks sections are allowed (a task then shows twice, still one record); this names them for a gentle note. */
export function overlappingTaskSections(sections:AgendaSection[],workspaceIds:readonly string[]){
 const tasks=sections.filter(s=>s.type==='tasks').map(s=>({s,ids:new Set(sectionWorkspaces(s,workspaceIds).ids)}));
 const pairs:[string,string][]=[];
 for(let i=0;i<tasks.length;i++)for(let j=i+1;j<tasks.length;j++)if([...tasks[i].ids].some(id=>tasks[j].ids.has(id)))pairs.push([tasks[i].s.title,tasks[j].s.title]);
 return pairs;
}
export const showCompletedFor=(section:Pick<AgendaSection,'completed'>,global:boolean)=>section.completed==='show'?true:section.completed==='hide'?false:global;
