/**
 * Bucket List (#84) pure logic: year colors and patterns, completing and reopening, ordering, numbering, search and
 * filters, the timeline, and look-back summaries for Insights and (later) Reflections. No I/O.
 */
import type {BucketEntry,BucketList,BucketStatus} from './models';

/** Stable default year colors. A year's default depends only on the year, never the theme or the list. */
export const yearPalette=['#e0457b','#f08a24','#e8c22c','#4cb944','#1fb5a8','#2f8fe0','#6c5ce7','#b84fd6','#ef6f6c','#8a9a2b'] as const;
/** Patterns pair with colors so years differ by more than hue (color-blind friendly); they're also named in text. */
export const yearPatterns=['solid','stripes','dots','grid','waves','cross'] as const;
export type YearPattern=typeof yearPatterns[number];
const mod=(n:number,m:number)=>((n%m)+m)%m;
export const defaultYearColor=(year:number)=>yearPalette[mod(year,yearPalette.length)];
export const yearPattern=(year:number):YearPattern=>yearPatterns[mod(year,yearPatterns.length)];
export const yearColor=(list:Pick<BucketList,'yearColors'>,year:number)=>list.yearColors[String(year)]??defaultYearColor(year);
export const yearOf=(date:string|null|undefined)=>date?Number(date.slice(0,4)):null;
export const shortYear=(year:number)=>`’${String(year).slice(-2)}`;

export function defaultList(today:string,years=10):BucketList{
 const start=Number(today.slice(0,4)),end=start+years-1;
 return {title:'Bucket List',horizonStart:start,horizonEnd:end,yearColors:Object.fromEntries(range(start,end).map(y=>[String(y),defaultYearColor(y)])),completionStyle:'highlight',showNumbers:true,revision:0};
}
export const range=(a:number,b:number)=>Array.from({length:Math.max(0,b-a+1)},(_,i)=>a+i);

/** Legend years: the horizon, plus any year something was actually completed in (history is never hidden). */
export function legendYears(list:BucketList,entries:BucketEntry[]){
 const years=new Set(range(list.horizonStart,list.horizonEnd));
 for(const e of entries){const y=yearOf(e.completedOn);if(y)years.add(y);}
 return [...years].sort((a,b)=>a-b);
}
/** Saving a year's color the first time it's used, so a later palette change can't recolor that year's record. */
export function withYearColor(list:BucketList,year:number):BucketList|null{
 return list.yearColors[String(year)]?null:{...list,yearColors:{...list.yearColors,[String(year)]:defaultYearColor(year)}};
}

export const isOpen=(e:Pick<BucketEntry,'status'>)=>e.status!=='completed';

/** Completing records the actual date (its year picks the color). Any earlier story is kept and can be added to. */
export function completeEntry(e:BucketEntry,completedOn:string,story:Partial<BucketEntry['completion']>={}):BucketEntry{
 return {...e,status:'completed',completedOn,completion:{...e.completion,...story}};
}
/** Reopening moves the completion into history (nothing is lost) and returns the dream to the list. */
export function reopenEntry(e:BucketEntry,today:string):BucketEntry{
 if(!e.completedOn)return e;
 return {...e,status:e.targetYear?'planned':'dreaming',completedOn:null,history:[...e.history,{completedOn:e.completedOn,reopenedOn:today}].slice(-50)};
}

/** Next permanent number: one more than the largest ever used in this list (deleted numbers are not reused). */
export const nextNumber=(entries:Pick<BucketEntry,'number'>[])=>Math.max(0,...entries.map(e=>e.number??0))+1;
export const nextPosition=(entries:Pick<BucketEntry,'position'>[])=>entries.length?Math.max(...entries.map(e=>e.position))+1:1;
/** Your order: by position, then number, then creation. */
export const byPosition=(a:BucketEntry,b:BucketEntry)=>a.position-b.position||(a.number??Infinity)-(b.number??Infinity)||a.createdAt.localeCompare(b.createdAt);

/**
 * Moving one entry within `ordered` (the full manual order) to `toIndex`: one write, a position between its new
 * neighbors. Returns every entry that needs saving (all of them only in the rare case positions have run out of room).
 */
export function moveEntry(ordered:BucketEntry[],id:string,toIndex:number):BucketEntry[]{
 const from=ordered.findIndex(e=>e.id===id);if(from<0)return [];
 const rest=ordered.filter(e=>e.id!==id),to=Math.max(0,Math.min(rest.length,toIndex));
 if(to===from)return [];
 const before=rest[to-1],after=rest[to],moving=ordered[from];
 const position=before&&after?(before.position+after.position)/2:before?before.position+1:after?after.position-1:1;
 if(before&&after&&(after.position-before.position<1e-6)){
  const next=[...rest.slice(0,to),moving,...rest.slice(to)];
  return next.flatMap((e,i)=>e.position===i+1&&e.id!==id?[]:[{...e,position:i+1}]);
 }
 return [{...moving,position}];
}

export type BucketSort='custom'|'number'|'target'|'completed'|'recent'|'title';
export const bucketSorts:{id:BucketSort;label:string}[]=[{id:'custom',label:'Your order'},{id:'number',label:'Number'},{id:'target',label:'Target year'},{id:'completed',label:'Recently completed'},{id:'recent',label:'Recently added'},{id:'title',label:'A–Z'}];
export function sortEntries(list:BucketEntry[],sort:BucketSort){
 const out=[...list];
 const cmp:Record<BucketSort,(a:BucketEntry,b:BucketEntry)=>number>={
  custom:byPosition,
  number:(a,b)=>(a.number??Infinity)-(b.number??Infinity)||byPosition(a,b),
  target:(a,b)=>(a.targetYear??Infinity)-(b.targetYear??Infinity)||byPosition(a,b),
  completed:(a,b)=>(b.completedOn??'').localeCompare(a.completedOn??'')||byPosition(a,b),
  recent:(a,b)=>b.createdAt.localeCompare(a.createdAt),
  title:(a,b)=>a.title.localeCompare(b.title,undefined,{sensitivity:'base'}),
 };
 return out.sort(cmp[sort]);
}

export type BucketFilter={query:string;statuses:BucketStatus[];categories:string[];tags:string[];years:number[];archived:boolean};
export const emptyFilter=():BucketFilter=>({query:'',statuses:[],categories:[],tags:[],years:[],archived:false});
export const activeFilterCount=(f:BucketFilter)=>f.statuses.length+f.categories.length+f.tags.length+f.years.length;
export function matches(e:BucketEntry,f:BucketFilter){
 if(!!e.archivedAt!==f.archived)return false;
 if(f.statuses.length&&!f.statuses.includes(e.status))return false;
 if(f.categories.length&&!f.categories.includes(e.category??''))return false;
 if(f.tags.length&&!f.tags.some(t=>e.tags.includes(t)))return false;
 if(f.years.length){const y=yearOf(e.completedOn);if(!y||!f.years.includes(y))return false;}
 const q=f.query.trim().toLowerCase();
 if(q){const hay=[e.title,e.notes,e.category,e.icon,e.number?`#${e.number} ${e.number}`:'',e.completion.story,e.completion.location,e.completion.memory,...e.tags.map(t=>`#${t} ${t}`)].filter(Boolean).join(' ').toLowerCase();if(!q.split(/\s+/).every(w=>hay.includes(w)))return false;}
 return true;
}
export const allCategories=(entries:BucketEntry[])=>[...new Set(entries.map(e=>e.category).filter((c):c is string=>!!c))].sort((a,b)=>a.localeCompare(b));
export const allTags=(entries:BucketEntry[])=>[...new Set(entries.flatMap(e=>e.tags))].sort((a,b)=>a.localeCompare(b));

/**
 * The timeline: one band per year with what was completed that year and what's hoped for it, then Someday.
 * Nothing is forced into a year: open dreams without a target year stay in Someday.
 */
export type TimelineYear={year:number;completed:BucketEntry[];hoped:BucketEntry[]};
export function timeline(entries:BucketEntry[],years:number[]):{years:TimelineYear[];someday:BucketEntry[]}{
 const live=entries.filter(e=>!e.archivedAt),all=new Set(years);
 for(const e of live){const y=e.status==='completed'?yearOf(e.completedOn):e.targetYear;if(y)all.add(y);}
 return {years:[...all].sort((a,b)=>a-b).map(year=>({year,
  completed:sortEntries(live.filter(e=>yearOf(e.completedOn)===year),'completed').reverse(),
  hoped:sortEntries(live.filter(e=>isOpen(e)&&e.targetYear===year),'custom')})),
  someday:sortEntries(live.filter(e=>isOpen(e)&&!e.targetYear),'custom')};
}

/** Counts for the header and legend. Gentle: no completion percentage of the whole list. */
export function bucketStats(entries:BucketEntry[]){
 const live=entries.filter(e=>!e.archivedAt),byYear=new Map<number,number>();
 for(const e of live){const y=yearOf(e.completedOn);if(y)byYear.set(y,(byYear.get(y)??0)+1);}
 return {total:live.length,completed:live.filter(e=>e.status==='completed').length,inProgress:live.filter(e=>e.status==='in_progress').length,byYear};
}

/** Completed between two dates (inclusive): for Insights now and monthly/yearly Reflections later (#83). */
export function completedBetween(entries:BucketEntry[],start:string,end:string){
 return entries.filter(e=>e.completedOn&&e.completedOn>=start&&e.completedOn<=end).sort((a,b)=>a.completedOn!.localeCompare(b.completedOn!));
}
export function bucketTrends(entries:BucketEntry[],start:string,end:string){
 const done=completedBetween(entries,start,end),cats=new Map<string,number>(),years=new Map<number,number>();
 for(const e of done){cats.set(e.category??'Uncategorized',(cats.get(e.category??'Uncategorized')??0)+1);const y=yearOf(e.completedOn)!;years.set(y,(years.get(y)??0)+1);}
 return {completed:done,byCategory:[...cats].map(([category,count])=>({category,count})).sort((a,b)=>b.count-a.count||a.category.localeCompare(b.category)),
  byYear:[...years].map(([year,count])=>({year,count})).sort((a,b)=>a.year-b.year)};
}

