import library from '@/content/whimsy/dream-symbols.json';
import heartYearning from '@/content/whimsy/dream-symbols-heartyearning.json';
import type {DreamEntry} from './models';

/** An interpretation from an outside source, always shown with its attribution and link. */
export type SourcedInterpretation={title:string;text:string;source:string;url:string};
export type DreamSymbol={id:string;name:string;category:string;aliases:string[];description:string;associations:string[];context:string;question:string;version:number;source:string;sourceUrl?:string;provider:'muse'|'heartyearning'|'personal';interpretations:SourcedInterpretation[];icon?:string};
/** A picture for each of Muse's own symbols (presentation only; HeartYearning entries bring their own). */
const museIcons:Record<string,string>={'dream-dog':'🐕','dream-bird':'🐦','dream-snake':'🐍','dream-forest':'🌲','dream-mountain':'⛰️','dream-storm':'⛈️','dream-ocean':'🌊','dream-river':'🏞️','dream-flood':'💧','dream-stranger':'👤','dream-childhood-friend':'🧒','dream-family-member':'👪','dream-house':'🏠','dream-school':'🏫','dream-bridge':'🌉','dream-key':'🗝️','dream-mirror':'🪞','dream-phone':'📱','dream-train':'🚆','dream-car':'🚗','dream-airplane':'✈️','dream-teeth':'🦷','dream-hands':'🤲','dream-voice':'🗣️','dream-laughter':'😂','dream-crying':'😢','dream-fear':'😨','dream-falling':'🍂','dream-flying':'🕊️','dream-running':'🏃','dream-ghost':'👻','dream-portal':'🌀','dream-magic':'✨','dream-being-late':'⏰','dream-getting-lost':'🧭','dream-taking-an-exam':'📝'};

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
 const muse:DreamSymbol[]=library.map(item=>({...item,provider:'muse' as const,interpretations:[],icon:museIcons[item.id]}));
 const byKey=new Map<string,DreamSymbol>();for(const item of muse)for(const name of [item.name,...item.aliases])byKey.set(symbolKey(name),item);
 const seen=new Set<string>(),imported:DreamSymbol[]=[];
 for(const entry of heartYearning as HeartYearningEntry[]){
  const category=categoryMap[entry.category],key=symbolKey(entry.keyword);
  if(!category||!entry.summary?.trim()||!key||seen.has(key)||seen.has(`slug:${entry.slug}`))continue;
  seen.add(key);seen.add(`slug:${entry.slug}`);
  const interpretation={title:entry.keyword,text:entry.summary.trim(),source:HEARTYEARNING.name,url:entry.url};
  const existing=byKey.get(key);
  if(existing){existing.interpretations.push(interpretation);continue;}
  imported.push({id:`hy-${entry.slug}`,name:entry.keyword,category,aliases:[],description:entry.summary.trim(),associations:[],context:'',question:'',version:1,source:HEARTYEARNING.name,sourceUrl:entry.url,provider:'heartyearning',interpretations:[interpretation],...(entry.icon?{icon:entry.icon}:{})});
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

// ---------- Presentation helpers (deterministic, from saved records only) ----------
export type Page<T>={items:T[];page:number;pages:number;total:number;start:number;end:number};
/** One page of a list; out-of-range pages clamp to the nearest real page. */
export function paginate<T>(items:T[],page:number,size:number):Page<T>{const pages=Math.max(1,Math.ceil(items.length/size)),p=Math.min(Math.max(0,Math.floor(page)||0),pages-1),start=p*size;return {items:items.slice(start,start+size),page:p,pages,total:items.length,start:items.length?start+1:0,end:Math.min(items.length,start+size)};}
/** Page numbers to show: always first and last, the current page and its neighbours, with gaps marked. */
export function pageWindow(page:number,pages:number):(number|'gap')[]{const keep=new Set([0,pages-1,page-1,page,page+1].filter(p=>p>=0&&p<pages));const sorted=[...keep].sort((a,b)=>a-b),out:(number|'gap')[]=[];sorted.forEach((p,i)=>{if(i&&p-sorted[i-1]>1)out.push('gap');out.push(p);});return out;}
/** The dream's title, or its first sentence (trimmed at a word) when untitled. */
export function dreamDisplayTitle(entry:Pick<DreamEntry,'title'|'text'>,max=72){const title=entry.title?.trim();if(title)return title;const first=(entry.text.trim().split(/(?<=[.!?…])\s+|\n/)[0]??'').trim();if(first.length<=max)return first||'Untitled dream';const cut=first.slice(0,max);return `${cut.slice(0,Math.max(cut.lastIndexOf(' '),max*0.6)).trim()}…`;}
/** Dreams grouped by the month of their dream date, in the order given. */
export function dreamsByMonth(entries:DreamEntry[]){const groups:{month:string;dreams:DreamEntry[]}[]=[];for(const entry of entries){const month=entry.date.slice(0,7),last=groups.at(-1);if(last?.month===month)last.dreams.push(entry);else groups.push({month,dreams:[entry]});}return groups;}
/** How many dreams each symbol appears in (once per dream). */
export function symbolDreamCounts(entries:DreamEntry[]){const counts=new Map<string,number>();for(const entry of entries)for(const id of new Set(entry.symbolIds))counts.set(id,(counts.get(id)??0)+1);return counts;}
/**
 * Recurring symbols and the pairs that actually share dreams. Nodes are symbols in at least two dreams (most
 * frequent first, up to `limit`); a link joins two nodes only when they appear together in at least `minShared`
 * dreams. Nothing is inferred beyond co-occurrence in saved records.
 */
export function symbolConstellation(entries:DreamEntry[],limit=12,minShared=2){
 const counts=symbolDreamCounts(entries),nodes=[...counts].filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit).map(([id,count])=>({id,count}));
 const ids=new Set(nodes.map(n=>n.id)),pairs=new Map<string,number>();
 for(const entry of entries){const present=[...new Set(entry.symbolIds)].filter(id=>ids.has(id)).sort();for(let i=0;i<present.length;i++)for(let j=i+1;j<present.length;j++){const key=`${present[i]}|${present[j]}`;pairs.set(key,(pairs.get(key)??0)+1);}}
 const links=[...pairs].filter(([,n])=>n>=minShared).map(([key,count])=>{const [a,b]=key.split('|');return {a,b,count};}).sort((x,y)=>y.count-x.count||x.a.localeCompare(y.a)||x.b.localeCompare(y.b));
 return {nodes,links};
}
/** Emotion pairs recorded in the same dream at least `min` times. */
export function emotionPairs(entries:DreamEntry[],min=2){const pairs=new Map<string,number>();for(const entry of entries){const e=[...new Set(entry.emotions)].sort();for(let i=0;i<e.length;i++)for(let j=i+1;j<e.length;j++){const key=`${e[i]}|${e[j]}`;pairs.set(key,(pairs.get(key)??0)+1);}}return [...pairs].filter(([,n])=>n>=min).map(([key,count])=>{const [a,b]=key.split('|');return {a,b,count};}).sort((x,y)=>y.count-x.count||x.a.localeCompare(y.a));}
/** Dream counts for the last `months` months ending with the month of `today`, zeros included. */
export function dreamMonths(entries:DreamEntry[],today:string,months=12){const counts=new Map<string,number>();for(const e of entries)counts.set(e.date.slice(0,7),(counts.get(e.date.slice(0,7))??0)+1);const y=Number(today.slice(0,4)),m=Number(today.slice(5,7));return Array.from({length:months},(_,i)=>{const d=new Date(Date.UTC(y,m-1-(months-1-i),1)),key=d.toISOString().slice(0,7);return {month:key,count:counts.get(key)??0};});}
/** Dreams per weekday (Monday first), by dream date. */
export function dreamWeekdays(entries:DreamEntry[]){const out=[0,0,0,0,0,0,0];for(const e of entries)out[(new Date(`${e.date}T12:00:00Z`).getUTCDay()+6)%7]++;return out;}
/** A small glyph and theme tone per dream type; recognizable without dominating. */
export const dreamTypeMeta:Record<string,{glyph:string;tone:'primary'|'secondary'|'pop'|'warm'|'neutral'}>={Lucid:{glyph:'◐',tone:'secondary'},Nightmare:{glyph:'☾',tone:'pop'},Recurring:{glyph:'↻',tone:'warm'},Vivid:{glyph:'✦',tone:'primary'},Ordinary:{glyph:'·',tone:'neutral'},'Dream fragment':{glyph:'❍',tone:'neutral'},Daydream:{glyph:'☼',tone:'warm'}};
