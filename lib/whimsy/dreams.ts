import library from '@/content/whimsy/dream-symbols.json';
import heartYearning from '@/content/whimsy/dream-symbols-heartyearning.json';
import type {DreamEntry} from './models';

/** An interpretation from an outside source, always shown with its attribution and link. */
export type SourcedInterpretation={title:string;text:string;source:string;url:string};
export type DreamSymbol={id:string;name:string;category:string;aliases:string[];description:string;associations:string[];context:string;question:string;version:number;source:string;sourceUrl?:string;provider:'muse'|'heartyearning'|'personal';interpretations:SourcedInterpretation[]};

/** HeartYearning Dream Symbols Dataset (985 entries, JSON, github.com/ljt-one/dream-symbols-dataset). Its terms ask
 * for attribution with a link to tool.heartyearning.com; every imported entry and the Encyclopedia footer carry it. */
export const HEARTYEARNING={name:'HeartYearning Dream Symbols Dataset',site:'https://tool.heartyearning.com',repository:'https://github.com/ljt-one/dream-symbols-dataset'} as const;
type HeartYearningEntry={slug:string;keyword:string;icon?:string;category:string;summary:string;date?:string;url:string};
/** Their categories mapped onto Muse's; zodiac, angel-number and crystal entries are not dream symbols and are left out. */
const categoryMap:Record<string,string>={body:'Body and Health',spirit:'Supernatural and Fantasy',nature:'Nature and Elements',animals:'Animals',people:'People and Relationships',life:'Common Dream Scenarios'};
const symbolKey=(text:string)=>text.toLocaleLowerCase('en').replace(/[^a-z ]/g,'').trim().replace(/\s+/g,' ').replace(/s$/,'');

/**
 * Muse's own 36 entries stay as written. A HeartYearning entry with the same name (or a Muse alias) adds its
 * interpretation to the Muse entry instead of duplicating it; the rest become entries of their own. Repeated
 * HeartYearning names or slugs keep the first. Ids are stable (`hy-<slug>`), so saved dreams and personal meanings
 * keep working when the dataset is updated.
 */
function buildLibrary(){
 const muse:DreamSymbol[]=library.map(item=>({...item,provider:'muse' as const,interpretations:[]}));
 const byKey=new Map<string,DreamSymbol>();for(const item of muse)for(const name of [item.name,...item.aliases])byKey.set(symbolKey(name),item);
 const seen=new Set<string>(),imported:DreamSymbol[]=[];
 for(const entry of heartYearning as HeartYearningEntry[]){
  const category=categoryMap[entry.category],key=symbolKey(entry.keyword);
  if(!category||!entry.summary?.trim()||!key||seen.has(key)||seen.has(`slug:${entry.slug}`))continue;
  seen.add(key);seen.add(`slug:${entry.slug}`);
  const interpretation={title:entry.keyword,text:entry.summary.trim(),source:HEARTYEARNING.name,url:entry.url};
  const existing=byKey.get(key);
  if(existing){existing.interpretations.push(interpretation);continue;}
  imported.push({id:`hy-${entry.slug}`,name:entry.keyword,category,aliases:[],description:entry.summary.trim(),associations:[],context:'',question:'',version:1,source:HEARTYEARNING.name,sourceUrl:entry.url,provider:'heartyearning',interpretations:[interpretation]});
 }
 return [...muse,...imported.sort((a,b)=>a.name.localeCompare(b.name))];
}
export const dreamSymbols:DreamSymbol[]=buildLibrary();
/** Entries that are variations of a symbol: other entries whose name contains it as a whole word (e.g. Green Snake for Snake). */
export function dreamVariations(symbol:Pick<DreamSymbol,'id'|'name'|'aliases'>,limit=24){
 const words=[symbol.name,...symbol.aliases].map(symbolKey).filter(w=>w.length>2);
 if(!words.length)return [];
 const pattern=new RegExp(`\\b(${words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})s?\\b`,'i');
 return dreamSymbols.filter(item=>item.id!==symbol.id&&pattern.test(item.name)).slice(0,limit);
}
export const dreamCategories=[...new Set(dreamSymbols.map(item=>item.category))];
export const dreamClassifications=['Ordinary','Lucid','Nightmare','Recurring','Dream fragment','Vivid','Daydream'];
export function dreamSymbol(id:string){return dreamSymbols.find(item=>item.id===id);}
export function dreamSearch(dreams:DreamEntry[],query:string,filters:{classification?:string;symbol?:string;emotion?:string;tag?:string;from?:string;to?:string}){const q=query.trim().toLocaleLowerCase();return dreams.filter(d=>{const haystack=[d.title,d.text,d.interpretation,d.notes,...(d.people??[]),...(d.places??[]),...(d.themes??[]),...(d.tags??[]),...(d.symbolIds??[]).map(id=>dreamSymbol(id)?.name??id)].filter(Boolean).join(' ').toLocaleLowerCase();return (!q||haystack.includes(q))&&(!filters.classification||d.classifications?.includes(filters.classification))&&(!filters.symbol||d.symbolIds.includes(filters.symbol))&&(!filters.emotion||d.emotions.includes(filters.emotion))&&(!filters.tag||d.tags?.includes(filters.tag))&&(!filters.from||d.date>=filters.from)&&(!filters.to||d.date<=filters.to);});}
export function dreamCounts(dreams:DreamEntry[]){const count=(values:string[])=>[...values.reduce((map,value)=>map.set(value,(map.get(value)??0)+1),new Map<string,number>())].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));return {total:dreams.length,symbols:count(dreams.flatMap(d=>[...new Set(d.symbolIds)])),emotions:count(dreams.flatMap(d=>[...new Set(d.emotions)])),classifications:count(dreams.flatMap(d=>[...new Set(d.classifications??[])])),months:count(dreams.map(d=>d.date.slice(0,7))),lucid:dreams.filter(d=>d.lucid||d.classifications?.includes('Lucid')).length};}
export function dreamTrends(dreams:DreamEntry[]){const group=(key:(dream:DreamEntry)=>string)=>[...dreams.reduce((map,dream)=>{const k=key(dream);map.set(k,(map.get(k)??0)+1);return map;},new Map<string,number>())].sort((a,b)=>a[0].localeCompare(b[0]));const weekday=(date:string)=>new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));return {monthly:group(d=>d.date.slice(0,7)),weekly:group(d=>{const day=new Date(`${d.date}T12:00:00Z`),offset=(day.getUTCDay()+6)%7;day.setUTCDate(day.getUTCDate()-offset);return day.toISOString().slice(0,10);}),weekdays:group(d=>weekday(d.date)),lucidByMonth:group(d=>(d.lucid||d.classifications?.includes('Lucid'))?d.date.slice(0,7):'' ).filter(([month])=>!!month)};}
export function dreamSeriesSummary(dreams:DreamEntry[]){const sorted=[...dreams].sort((a,b)=>a.date.localeCompare(b.date));const symbols=dreamCounts(sorted).symbols;return {count:sorted.length,first:sorted[0]?.date??null,last:sorted.at(-1)?.date??null,commonSymbols:symbols.filter(([,count])=>count>1),emotionalPath:sorted.map(d=>({date:d.date,emotions:d.emotions,feeling:d.overallFeeling??''})),reflections:sorted.filter(d=>d.interpretation).map(d=>({date:d.date,text:d.interpretation}))};}
