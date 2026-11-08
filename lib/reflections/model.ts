/**
 * Planner → Reflections (#99): a modular memory book. Pure and versioned. A review is a period (week, month or
 * year), one of six starter layouts, and an ordered list of modules holding the person's own content. Reflections
 * never read from or write to other modules' records; a song or book mentioned here is the review's own memory.
 *
 * Safety: parsing drops unknown fields but never content it understands; switching layouts keeps every module that
 * has content (merging into a matching module or carrying it over), so nothing is silently lost.
 */
export const periods=[{id:'week',label:'Week'},{id:'month',label:'Month'},{id:'year',label:'Year'}] as const;
export type ReflectionPeriod=typeof periods[number]['id'];

// ---------- Images (private Muse storage, or an https artwork link) ----------
export type ReflectionImage={id:string;path:string;thumbnailPath:string;alt:string;width:number;height:number}|{id:string;url:string;alt:string};
const imgOk=(v:unknown):v is ReflectionImage=>{if(!v||typeof v!=='object')return false;const o=v as Record<string,unknown>;if(typeof o.id!=='string')return false;
 if(typeof o.url==='string')return /^https:\/\/\S{3,500}$/.test(o.url);return typeof o.path==='string'&&typeof o.thumbnailPath==='string'&&o.path.length<300&&o.thumbnailPath.length<300;};
const img=(v:unknown):ReflectionImage|undefined=>{if(!imgOk(v))return undefined;const o=v as Record<string,unknown>;const alt=str(o.alt,300);
 return typeof o.url==='string'?{id:o.id as string,url:o.url,alt}:{id:o.id as string,path:o.path as string,thumbnailPath:o.thumbnailPath as string,alt,width:num(o.width,1,16000)??1,height:num(o.height,1,16000)??1};};
const imgs=(v:unknown,max:number)=>Array.isArray(v)?v.map(img).filter((x):x is ReflectionImage=>!!x).slice(0,max):[];
export const storedImages=(list:ReflectionImage[])=>list.filter((i):i is Extract<ReflectionImage,{path:string}>=>'path' in i);

// ---------- Field helpers ----------
const str=(v:unknown,max:number)=>typeof v==='string'?v.slice(0,max):'';
const num=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)?Math.min(max,Math.max(min,Math.round(v))):undefined;
const date=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v:undefined;
const link=(v:unknown)=>typeof v==='string'&&/^https:\/\/\S{3,500}$/.test(v)?v:undefined;
const idOk=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9-]{1,64}$/.test(v);

// ---------- Modules ----------
export type MemoryItem={id:string;title:string;text:string;date?:string;caption:string;photos:ReflectionImage[]};
export type PhotoItem={id:string;caption:string;photo?:ReflectionImage};
export type SongItem={id:string;title:string;artist:string;note:string;link?:string;art?:ReflectionImage};
export type BookItem={id:string;title:string;author:string;note:string;rating?:number;cover?:ReflectionImage};
export type WatchItem={id:string;title:string;kind:'movie'|'show';note:string;rating?:number;poster?:ReflectionImage};
export type FavoriteItem={id:string;name:string;category:string;description:string;image?:ReflectionImage};
export type HighlightItem={id:string;text:string;kind:'win'|'achievement'|'experience'|'moment'|'milestone'};
export type Entry={id:string;text:string};
export const guidedPrompts=[
 {id:'gratitude',label:'Gratitude',question:'What am I grateful for?'},
 {id:'lessons',label:'Lessons learned',question:'What did I learn?'},
 {id:'challenges',label:'Challenges',question:'What was hard, and how did I meet it?'},
 {id:'growth',label:'Personal growth',question:'How did I grow?'},
 {id:'happy',label:'What made me happy',question:'What made me happy?'},
 {id:'intentions',label:'Intentions',question:'What do I want to carry forward?'},
 {id:'custom',label:'Your own question',question:''},
] as const;
export type GuidedPrompt=typeof guidedPrompts[number]['id'];
export type ModuleContent={
 memories:{items:MemoryItem[]};photos:{variant:'single'|'pair'|'gallery';items:PhotoItem[]};music:{items:SongItem[]};books:{items:BookItem[]};
 watching:{items:WatchItem[]};favorites:{items:FavoriteItem[]};highlights:{items:HighlightItem[]};guided:{prompt:GuidedPrompt;question:string;entries:Entry[]};
 writing:{text:string};level10:Record<string,never>;
};
export type ModuleType=keyof ModuleContent;
export const moduleSizes=['full','wide','half','third'] as const;
export type ModuleSize=typeof moduleSizes[number];
export type ReflectionModule<T extends ModuleType=ModuleType>={id:string;type:T;title:string;size:ModuleSize;hidden?:boolean;content:ModuleContent[T]};

export const moduleTypes:{id:ModuleType;label:string;emoji:string;hint:string;defaultTitle:string;size:ModuleSize;repeatable:boolean}[]=[
 {id:'memories',label:'Memories',emoji:'💌',hint:'Little stories with a date and photos.',defaultTitle:'Little memories',size:'wide',repeatable:true},
 {id:'photos',label:'Photo moments',emoji:'📸',hint:'A single photo, a pair or a small gallery.',defaultTitle:'Photo moments',size:'wide',repeatable:true},
 {id:'music',label:'On repeat',emoji:'🎧',hint:'Songs and artists you kept coming back to.',defaultTitle:'On repeat',size:'half',repeatable:true},
 {id:'books',label:'Books & stories',emoji:'📚',hint:'What you read, with a note or rating.',defaultTitle:'Books & stories',size:'half',repeatable:true},
 {id:'watching',label:'Watching',emoji:'🎬',hint:'Movies and shows worth remembering.',defaultTitle:'What I watched',size:'half',repeatable:true},
 {id:'favorites',label:'Favorites',emoji:'💖',hint:'Anything you loved: food, places, finds.',defaultTitle:'Favorite things',size:'half',repeatable:true},
 {id:'highlights',label:'Highlights',emoji:'🏆',hint:'Wins, milestones and meaningful moments.',defaultTitle:'Highlights',size:'half',repeatable:true},
 {id:'guided',label:'Guided reflection',emoji:'🌱',hint:'Gratitude, lessons, intentions or your own question.',defaultTitle:'Gratitude',size:'half',repeatable:true},
 {id:'writing',label:'Freeform writing',emoji:'✍️',hint:'Write anything, in your own words.',defaultTitle:'Notes to self',size:'full',repeatable:true},
 {id:'level10',label:'Level 10 Life',emoji:'🌈',hint:'Rate ten areas of life from 1 to 10.',defaultTitle:'Level 10 Life',size:'full',repeatable:false},
];
export const moduleType=(t:ModuleType)=>moduleTypes.find(m=>m.id===t)!;

export function emptyContent<T extends ModuleType>(type:T,opts:{prompt?:GuidedPrompt;variant?:'single'|'pair'|'gallery'}={}):ModuleContent[T]{
 const c:Record<ModuleType,unknown>={memories:{items:[]},photos:{variant:opts.variant??'gallery',items:[]},music:{items:[]},books:{items:[]},watching:{items:[]},favorites:{items:[]},highlights:{items:[]},
  guided:{prompt:opts.prompt??'gratitude',question:'',entries:[]},writing:{text:''},level10:{}};
 return c[type] as ModuleContent[T];
}
export function newModule<T extends ModuleType>(type:T,id:string,opts:{title?:string;size?:ModuleSize;prompt?:GuidedPrompt;variant?:'single'|'pair'|'gallery'}={}):ReflectionModule<T>{
 const meta=moduleType(type),prompt=opts.prompt?guidedPrompts.find(p=>p.id===opts.prompt):undefined;
 return {id,type,title:(opts.title??(type==='guided'&&prompt&&prompt.id!=='custom'?prompt.label:meta.defaultTitle)).slice(0,60),size:opts.size??meta.size,content:emptyContent(type,opts)};
}

function parseContent(type:ModuleType,v:unknown):ModuleContent[ModuleType]{
 const o=v&&typeof v==='object'?v as Record<string,unknown>:{},list=(max:number)=>(Array.isArray(o.items)?o.items:[]).filter((x):x is Record<string,unknown>=>!!x&&typeof x==='object'&&idOk((x as Record<string,unknown>).id)).slice(0,max);
 switch(type){
  case 'memories':return {items:list(30).map(x=>({id:x.id as string,title:str(x.title,120),text:str(x.text,4000),...(date(x.date)?{date:date(x.date)}:{}),caption:str(x.caption,200),photos:imgs(x.photos,8)}))};
  case 'photos':return {variant:o.variant==='single'||o.variant==='pair'?o.variant:'gallery',items:list(12).map(x=>({id:x.id as string,caption:str(x.caption,200),...(img(x.photo)?{photo:img(x.photo)}:{})}))};
  case 'music':return {items:list(30).map(x=>({id:x.id as string,title:str(x.title,160),artist:str(x.artist,160),note:str(x.note,600),...(link(x.link)?{link:link(x.link)}:{}),...(img(x.art)?{art:img(x.art)}:{})}))};
  case 'books':return {items:list(30).map(x=>({id:x.id as string,title:str(x.title,200),author:str(x.author,160),note:str(x.note,600),...(num(x.rating,1,5)?{rating:num(x.rating,1,5)}:{}),...(img(x.cover)?{cover:img(x.cover)}:{})}))};
  case 'watching':return {items:list(30).map(x=>({id:x.id as string,title:str(x.title,200),kind:x.kind==='show'?'show' as const:'movie' as const,note:str(x.note,600),...(num(x.rating,1,5)?{rating:num(x.rating,1,5)}:{}),...(img(x.poster)?{poster:img(x.poster)}:{})}))};
  case 'favorites':return {items:list(30).map(x=>({id:x.id as string,name:str(x.name,120),category:str(x.category,60),description:str(x.description,600),...(img(x.image)?{image:img(x.image)}:{})}))};
  case 'highlights':return {items:list(40).map(x=>({id:x.id as string,text:str(x.text,400),kind:(['win','achievement','experience','moment','milestone'] as const).find(k=>k===x.kind)??'moment'}))};
  case 'guided':{const prompt=guidedPrompts.find(p=>p.id===o.prompt)?.id??'gratitude';return {prompt,question:str(o.question,200),entries:(Array.isArray(o.entries)?o.entries:[]).filter((x):x is Record<string,unknown>=>!!x&&typeof x==='object'&&idOk((x as Record<string,unknown>).id)).slice(0,40).map(x=>({id:x.id as string,text:str(x.text,1000)}))};}
  case 'writing':return {text:str(o.text,20000)};
  case 'level10':return {};
 }
}
export function parseModules(v:unknown):ReflectionModule[]{
 const seen=new Set<string>(),out:ReflectionModule[]=[];let level10=false;
 for(const raw of Array.isArray(v)?v:[]){if(!raw||typeof raw!=='object')continue;const o=raw as Record<string,unknown>;
  const type=moduleTypes.find(m=>m.id===o.type)?.id;if(!type||!idOk(o.id)||seen.has(o.id))continue;
  if(type==='level10'){if(level10)continue;level10=true;}seen.add(o.id);
  out.push({id:o.id,type,title:str(o.title,60)||moduleType(type).defaultTitle,size:moduleSizes.find(s=>s===o.size)??moduleType(type).size,...(o.hidden===true?{hidden:true}:{}),content:parseContent(type,o.content)});
  if(out.length>=40)break;}
 return out;
}
/** Whether a module holds anything the person wrote or added (level10 ratings live in their own table). */
export function hasContent(m:ReflectionModule):boolean{
 const c=m.content as Record<string,unknown>;
 if(m.type==='writing')return !!(c.text as string).trim();
 if(m.type==='guided')return (c.entries as Entry[]).some(e=>e.text.trim())||!!(c.question as string).trim();
 if(m.type==='level10')return false;
 return ((c.items as {[k:string]:unknown}[])??[]).some(it=>Object.entries(it).some(([k,val])=>k!=='id'&&k!=='kind'&&(typeof val==='string'?!!val.trim():Array.isArray(val)?val.length>0:val!==undefined)));
}
export function moduleImages(m:ReflectionModule):ReflectionImage[]{
 const c=m.content as unknown as Record<string,unknown>,items=(Array.isArray(c.items)?c.items:[]) as Record<string,unknown>[];
 return items.flatMap(it=>[...(Array.isArray(it.photos)?it.photos as ReflectionImage[]:[]),...['photo','art','cover','poster','image'].map(k=>it[k] as ReflectionImage|undefined).filter((x):x is ReflectionImage=>!!x)]);
}

// ---------- Layouts ----------
export type LayoutId='little-moments'|'weekly-favorites'|'monthly-highlights'|'monthly-edit'|'year-in-moments'|'yearbook';
type Seed={type:ModuleType;title?:string;size?:ModuleSize;prompt?:GuidedPrompt;variant?:'single'|'pair'|'gallery'};
export const layouts:{id:LayoutId;period:ReflectionPeriod;name:string;tagline:string;mood:string;seeds:Seed[]}[]=[
 {id:'little-moments',period:'week',name:'Little Moments',tagline:'A cozy weekly journal.',mood:'cozy',seeds:[
  {type:'memories',title:'Favorite moment',size:'full'},{type:'highlights',title:'Weekly wins',size:'half'},{type:'guided',prompt:'gratitude',size:'half'},
  {type:'memories',title:'Little memories',size:'wide'},{type:'guided',prompt:'lessons',size:'third'},{type:'guided',prompt:'intentions',title:'Next week’s intentions',size:'half'},{type:'level10',size:'full'}]},
 {id:'weekly-favorites',period:'week',name:'Weekly Favorites',tagline:'A playful, visual weekly recap.',mood:'playful',seeds:[
  {type:'photos',title:'This week in pictures',variant:'gallery',size:'full'},{type:'music',title:'Song of the week',size:'third'},{type:'watching',title:'What I watched',size:'third'},{type:'books',title:'What I read',size:'third'},
  {type:'highlights',title:'Weekly highlights',size:'half'},{type:'favorites',title:'Things that made me happy',size:'half'},{type:'level10',size:'full'}]},
 {id:'monthly-highlights',period:'month',name:'Monthly Highlights',tagline:'A colorful editorial recap.',mood:'editorial',seeds:[
  {type:'memories',title:'Favorite memories',size:'wide'},{type:'photos',title:'In pictures',variant:'pair',size:'third'},{type:'highlights',title:'Biggest wins',size:'half'},
  {type:'guided',prompt:'challenges',title:'Challenges & lessons',size:'half'},{type:'guided',prompt:'gratitude',title:'Things I’m grateful for',size:'half'},{type:'favorites',title:'Favorite discoveries',size:'half'},{type:'level10',size:'full'}]},
 {id:'monthly-edit',period:'month',name:'The Monthly Edit',tagline:'A magazine-inspired month.',mood:'magazine',seeds:[
  {type:'music',title:'Songs on repeat',size:'half'},{type:'books',title:'Books & stories',size:'half'},{type:'watching',title:'Movies & shows',size:'third'},
  {type:'photos',title:'Favorite photos',variant:'gallery',size:'wide'},{type:'favorites',title:'Personal favorites',size:'half'},{type:'memories',title:'Memorable moments',size:'half'},{type:'level10',size:'full'}]},
 {id:'year-in-moments',period:'year',name:'My Year in Moments',tagline:'A sentimental annual keepsake.',mood:'sentimental',seeds:[
  {type:'memories',title:'Month by month',size:'full'},{type:'highlights',title:'Biggest milestones',size:'half'},{type:'memories',title:'Favorite experiences',size:'half'},
  {type:'photos',title:'Meaningful photos',variant:'gallery',size:'full'},{type:'guided',prompt:'growth',size:'full'},{type:'level10',size:'full'}]},
 {id:'yearbook',period:'year',name:'The Yearbook',tagline:'A playful annual favorites collection.',mood:'yearbook',seeds:[
  {type:'music',title:'Songs & albums of the year',size:'third'},{type:'books',title:'Favorite books',size:'third'},{type:'watching',title:'Movies & shows',size:'third'},
  {type:'favorites',title:'Favorite experiences',size:'half'},{type:'favorites',title:'Personal discoveries',size:'half'},{type:'highlights',title:'Biggest wins',size:'half'},
  {type:'guided',prompt:'intentions',title:'Lessons & intentions',size:'half'},{type:'level10',size:'full'}]},
];
export const layoutsFor=(p:ReflectionPeriod)=>layouts.filter(l=>l.period===p);
export const layoutById=(id:string)=>layouts.find(l=>l.id===id);
export function seedModules(layout:LayoutId,makeId:()=>string=()=>crypto.randomUUID()):ReflectionModule[]{
 return layoutById(layout)!.seeds.map(s=>newModule(s.type,makeId(),{title:s.title,size:s.size,prompt:s.prompt,variant:s.variant}));
}
/**
 * Switching layouts never drops content. The new layout's modules come first; any old module with content fills an
 * empty new module of the same type (and same guided prompt), otherwise it is carried over after them, marked.
 * Returns the new modules plus what moved, for a preview before confirming.
 */
export function switchLayout(current:ReflectionModule[],to:LayoutId,makeId:()=>string=()=>crypto.randomUUID()){
 const next=seedModules(to,makeId),kept:ReflectionModule[]=[],merged:string[]=[];
 for(const m of current){if(!hasContent(m))continue;
  const slot=next.find(n=>n.type===m.type&&!hasContent(n)&&!merged.includes(n.id)&&(m.type!=='guided'||(n.content as ModuleContent['guided']).prompt===(m.content as ModuleContent['guided']).prompt));
  if(slot){const i=next.indexOf(slot);next[i]={...m,size:slot.size};merged.push(m.id);}else kept.push(m);}
 const level10=current.some(m=>m.type==='level10')&&!next.some(m=>m.type==='level10');
 return {modules:[...next,...kept],carried:kept.map(m=>m.title),merged:merged.length,level10Kept:level10};
}

// ---------- Level 10 Life ----------
export const defaultLifeAreas=[
 {label:'Health & fitness',color:'#2ec4b6'},{label:'Career',color:'#4d96ff'},{label:'Finances',color:'#7cb518'},{label:'Family',color:'#f4a259'},
 {label:'Friends',color:'#ffd166'},{label:'Romance',color:'#e85d75'},{label:'Personal growth',color:'#8050cf'},{label:'Fun & recreation',color:'#f45cad'},
 {label:'Home & environment',color:'#8d6e63'},{label:'Spirituality',color:'#c77dff'},
];
export type LifeArea={id:string;label:string;color:string;position:number;archived:boolean;revision:number};
export type LifeRating={id?:string;areaId:string;rating:number;note:string;revision:number};
