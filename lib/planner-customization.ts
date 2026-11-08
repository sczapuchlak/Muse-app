/**
 * Planner Customization (#87): paints (solid or gradient), curated palettes, Mark collections, section styling and
 * the person's library (saved Marks, saved colors/gradients and Saved Sections). Pure and versioned like the layout:
 * unknown fields are dropped and anything broken falls back to a safe default, never to lost content.
 *
 * Decoration (stickers, dividers, header styles) is deliberately separate from Muse Marks: Marks are functional
 * metadata on dates and records; decoration only dresses a section.
 */
import {accentCss,customGradientCss,isHexColor,validAccent,validGradient,type AccentColor,type CustomGradient} from './appearance-values';
import {markIcons,type MarkIcon} from './muse-marks';

export const LIBRARY_VERSION=1;
type Hex=`#${string}`;

// ---------- Paint: one solid color or one gradient, used by Marks and section backgrounds ----------
export type Paint={kind:'solid';color:AccentColor}|{kind:'gradient';gradient:CustomGradient};
export const gradientAngles=[45,90,135,180] as const;
export function parseGradient(value:unknown):CustomGradient|undefined{
 if(!value||typeof value!=='object')return undefined;const v=value as Record<string,unknown>;
 const colors=Array.isArray(v.colors)?v.colors.filter((c):c is Hex=>typeof c==='string'&&isHexColor(c)).slice(0,3):[];
 const angle=typeof v.angle==='number'&&(gradientAngles as readonly number[]).includes(v.angle)?v.angle:135;
 const g={colors:colors as CustomGradient['colors'],angle};
 return colors.length>=2&&validGradient(g)?g:undefined;
}
export function parsePaint(value:unknown):Paint|undefined{
 if(!value||typeof value!=='object')return undefined;const v=value as Record<string,unknown>;
 if(v.kind==='solid'&&typeof v.color==='string'&&validAccent(v.color))return {kind:'solid',color:v.color};
 if(v.kind==='gradient'){const gradient=parseGradient(v.gradient);if(gradient)return {kind:'gradient',gradient};}
 return undefined;
}
export const paintCss=(p:Paint)=>p.kind==='solid'?accentCss(p.color):customGradientCss(p.gradient);
/** A solid stand-in for places that need one color (icons, rings): the color itself or the gradient's first stop. */
export const paintAccent=(p:Paint):AccentColor=>p.kind==='solid'?p.color:p.gradient.colors[0];
export const samePaint=(a?:Paint,b?:Paint)=>JSON.stringify(a??null)===JSON.stringify(b??null);

/** Curated gradients: soft, editorial blends that read well under text at low opacity in light and dark themes. */
export const curatedGradients:{id:string;label:string;gradient:CustomGradient}[]=[
 {id:'tropical',label:'Tropical',gradient:{colors:['#2ec4b6','#ffd166','#ff7aa2'],angle:135}},
 {id:'sunset',label:'Sunset',gradient:{colors:['#ff9a62','#f45cad'],angle:135}},
 {id:'lavender',label:'Lavender haze',gradient:{colors:['#b8a1ff','#f7b2e6'],angle:135}},
 {id:'seaglass',label:'Sea glass',gradient:{colors:['#7fd8c9','#8fb8ff'],angle:135}},
 {id:'rosegold',label:'Rose gold',gradient:{colors:['#f4c2a1','#e98aa7'],angle:90}},
 {id:'twilight',label:'Twilight',gradient:{colors:['#5b5fd6','#b05bd6','#f07ab3'],angle:135}},
 {id:'matcha',label:'Matcha',gradient:{colors:['#a8d08d','#e7f0b3'],angle:180}},
 {id:'citrus',label:'Citrus',gradient:{colors:['#ffd166','#ff9a62'],angle:45}},
];
/** Curated solids beyond the five theme accents (which always come first and follow the theme). */
export const curatedSolids:Hex[]=['#e85d75','#f4a259','#e9c46a','#7cb518','#2ec4b6','#4d96ff','#8050cf','#c77dff','#8d6e63','#64748b'];

// ---------- Mark styles: saved favorites and themed collections ----------
export type MarkStyle={id:string;name:string;icon:MarkIcon;paint:Paint;meaning?:string;collection?:string};
export const markCollections:{id:string;label:string;marks:Omit<MarkStyle,'id'|'collection'>[]}[]=[
 {id:'vacation',label:'Vacation',marks:[
  {name:'Vacation',icon:'suitcase',paint:{kind:'gradient',gradient:{colors:['#ff7aa2','#ffd166'],angle:135}},meaning:'Time off and trips for fun'},
  {name:'Flight',icon:'plane',paint:{kind:'solid',color:'#4d96ff'},meaning:'Travel day'},
  {name:'Beach day',icon:'sun',paint:{kind:'gradient',gradient:{colors:['#2ec4b6','#ffd166'],angle:135}}},
 ]},
 {id:'work',label:'Work',marks:[
  {name:'Work trip',icon:'suitcase',paint:{kind:'solid',color:'#4d96ff'},meaning:'Travel for work'},
  {name:'Deadline',icon:'flame',paint:{kind:'solid',color:'#e85d75'},meaning:'Something is due'},
  {name:'Meeting day',icon:'briefcase',paint:{kind:'solid',color:'#64748b'}},
  {name:'Launch',icon:'trophy',paint:{kind:'gradient',gradient:{colors:['#8050cf','#f45cad'],angle:135}}},
 ]},
 {id:'wellness',label:'Wellness',marks:[
  {name:'Rest day',icon:'moon',paint:{kind:'solid',color:'#c77dff'},meaning:'Take it easy'},
  {name:'Workout',icon:'dumbbell',paint:{kind:'solid',color:'#f4a259'}},
  {name:'Appointment',icon:'medicine',paint:{kind:'solid',color:'#2ec4b6'},meaning:'Doctor, dentist or therapy'},
  {name:'Yoga',icon:'yoga',paint:{kind:'gradient',gradient:{colors:['#a8d08d','#7fd8c9'],angle:135}}},
 ]},
 {id:'cozy',label:'Cozy',marks:[
  {name:'Reading day',icon:'book',paint:{kind:'solid',color:'#8d6e63'}},
  {name:'Movie night',icon:'moon',paint:{kind:'gradient',gradient:{colors:['#5b5fd6','#b05bd6'],angle:135}}},
  {name:'Bake',icon:'cake',paint:{kind:'solid',color:'#f4a259'}},
  {name:'Garden',icon:'flower',paint:{kind:'solid',color:'#7cb518'}},
 ]},
 {id:'personal',label:'Personal',marks:[
  {name:'Birthday',icon:'cake',paint:{kind:'gradient',gradient:{colors:['#f45cad','#ffd166'],angle:135}},meaning:'Someone to celebrate'},
  {name:'Family',icon:'people',paint:{kind:'solid',color:'#e85d75'}},
  {name:'Pet care',icon:'paw',paint:{kind:'solid',color:'#8d6e63'}},
  {name:'Date night',icon:'heart',paint:{kind:'solid',color:'#e85d75'}},
 ]},
];
const idPattern=/^[A-Za-z0-9-]{1,64}$/;
const text=(v:unknown,max:number)=>typeof v==='string'?v.trim().slice(0,max):'';
export function parseMarkStyle(value:unknown):MarkStyle|null{
 if(!value||typeof value!=='object')return null;const v=value as Record<string,unknown>;
 const icon=markIcons.find(i=>i.id===v.icon)?.id,paint=parsePaint(v.paint),name=text(v.name,40);
 if(typeof v.id!=='string'||!idPattern.test(v.id)||!icon||!paint||!name)return null;
 const meaning=text(v.meaning,200),collection=text(v.collection,40);
 return {id:v.id,name,icon,paint,...(meaning?{meaning}:{}),...(collection?{collection}:{})};
}

// ---------- Section styling and decoration ----------
export const headerStyles=[
 {id:'classic',label:'Classic small caps'},{id:'serif',label:'Editorial serif'},{id:'pill',label:'Tinted label'},{id:'underline',label:'Underlined'},
] as const;
export type HeaderStyle=typeof headerStyles[number]['id'];
export const dividerStyles=[
 {id:'line',label:'Fine line'},{id:'dotted',label:'Dotted'},{id:'dashed',label:'Dashed'},{id:'double',label:'Double'},{id:'flourish',label:'Flourish'},{id:'none',label:'None'},
] as const;
export type DividerStyle=typeof dividerStyles[number]['id'];
/** Decorative stickers: typographic ornaments, never Muse icons, so they can't be mistaken for Marks. */
export const stickers=[
 {id:'sparkle',glyph:'✦',label:'Sparkle'},{id:'twinkle',glyph:'✧',label:'Twinkle'},{id:'blossom',glyph:'✿',label:'Blossom'},{id:'flower',glyph:'❀',label:'Flower'},
 {id:'moon',glyph:'☾',label:'Moon'},{id:'sun',glyph:'☼',label:'Sun'},{id:'heart',glyph:'♡',label:'Heart'},{id:'star',glyph:'✶',label:'Star'},
 {id:'snow',glyph:'❋',label:'Snowflake'},{id:'note',glyph:'♪',label:'Music note'},{id:'cloud',glyph:'☁',label:'Cloud'},{id:'leaf',glyph:'❦',label:'Leaf'},
] as const;
export type StickerId=typeof stickers[number]['id'];
export const stickerGlyph=(id:StickerId)=>stickers.find(s=>s.id===id)!.glyph;
/** Background opacity is capped so text keeps its contrast in every theme. */
export const MIN_OPACITY=5,MAX_OPACITY=60,DEFAULT_OPACITY=18;
export type SectionStyle={background?:Paint;opacity?:number;accent?:AccentColor;header?:HeaderStyle;divider?:DividerStyle;sticker?:StickerId};
export function parseSectionStyle(value:unknown):SectionStyle|undefined{
 if(!value||typeof value!=='object')return undefined;const v=value as Record<string,unknown>,s:SectionStyle={};
 const background=parsePaint(v.background);if(background)s.background=background;
 if(typeof v.opacity==='number'&&Number.isFinite(v.opacity))s.opacity=Math.round(Math.max(MIN_OPACITY,Math.min(MAX_OPACITY,v.opacity)));
 if(typeof v.accent==='string'&&validAccent(v.accent))s.accent=v.accent;
 const header=headerStyles.find(h=>h.id===v.header)?.id;if(header&&header!=='classic')s.header=header;
 const divider=dividerStyles.find(d=>d.id===v.divider)?.id;if(divider&&divider!=='line')s.divider=divider;
 const sticker=stickers.find(x=>x.id===v.sticker)?.id;if(sticker)s.sticker=sticker;
 return Object.keys(s).length?s:undefined;
}

// ---------- Custom section content (Planner-only) ----------
export type SectionItem={id:string;text:string;done:boolean};
export const MAX_ITEMS=60,MAX_ITEM_TEXT=200,MAX_STARTER=30;
export function parseItems(value:unknown):SectionItem[]{
 if(!Array.isArray(value))return [];const seen=new Set<string>(),out:SectionItem[]=[];
 for(const raw of value){if(!raw||typeof raw!=='object')continue;const v=raw as Record<string,unknown>;
  if(typeof v.id!=='string'||!idPattern.test(v.id)||seen.has(v.id))continue;const t=text(v.text,MAX_ITEM_TEXT);if(!t)continue;
  seen.add(v.id);out.push({id:v.id,text:t,done:v.done===true});if(out.length>=MAX_ITEMS)break;}
 return out;
}
export const parseStarter=(value:unknown)=>Array.isArray(value)?value.map(v=>text(v,MAX_ITEM_TEXT)).filter(Boolean).slice(0,MAX_STARTER):[];
/** A fresh copy of starter items for one day: new ids, nothing checked. */
export const starterItems=(starter:readonly string[],makeId:()=>string=()=>crypto.randomUUID()):SectionItem[]=>starter.map(t=>({id:makeId(),text:t,done:false}));
export const uncheckAll=(items:SectionItem[])=>items.map(i=>i.done?{...i,done:false}:i);

// ---------- Saved Sections (templates) ----------
export const savedSectionTypes=['checklist','list','notes'] as const;
export type SavedSectionType=typeof savedSectionTypes[number];
export type SavedSection={id:string;name:string;type:SavedSectionType;title:string;size?:string;height?:number;icon?:MarkIcon;style?:SectionStyle;starter:string[];starterBody?:string};

// ---------- The library ----------
export type Palette={colors:Hex[];gradients:CustomGradient[]};
export type Library={version:number;markStyles:MarkStyle[];palette:Palette;savedSections:SavedSection[]};
export const MAX_MARK_STYLES=60,MAX_PALETTE=24,MAX_SAVED_SECTIONS=40;
export const emptyLibrary=():Library=>({version:LIBRARY_VERSION,markStyles:[],palette:{colors:[],gradients:[]},savedSections:[]});
function parseSavedSection(value:unknown):SavedSection|null{
 if(!value||typeof value!=='object')return null;const v=value as Record<string,unknown>;
 const type=savedSectionTypes.find(t=>t===v.type),name=text(v.name,40);
 if(typeof v.id!=='string'||!idPattern.test(v.id)||!type||!name)return null;
 const s:SavedSection={id:v.id,name,type,title:text(v.title,32)||name.slice(0,32),starter:parseStarter(v.starter)};
 if(typeof v.size==='string')s.size=v.size;
 if(typeof v.height==='number'&&Number.isFinite(v.height))s.height=Math.round(Math.max(44,Math.min(720,v.height)));
 const icon=markIcons.find(i=>i.id===v.icon)?.id;if(icon)s.icon=icon;
 const style=parseSectionStyle(v.style);if(style)s.style=style;
 const body=text(v.starterBody,2000);if(body)s.starterBody=body;
 return s;
}
function uniqueBy<T>(list:T[],key:(x:T)=>string){const seen=new Set<string>();return list.filter(x=>{const k=key(x);if(seen.has(k))return false;seen.add(k);return true;});}
export function parseLibrary(value:unknown):Library{
 const v=value&&typeof value==='object'?value as Record<string,unknown>:{};
 const palette=v.palette&&typeof v.palette==='object'?v.palette as Record<string,unknown>:{};
 return {version:LIBRARY_VERSION,
  markStyles:uniqueBy((Array.isArray(v.markStyles)?v.markStyles:[]).map(parseMarkStyle).filter((x):x is MarkStyle=>!!x),x=>x.id).slice(0,MAX_MARK_STYLES),
  palette:{
   colors:uniqueBy((Array.isArray(palette.colors)?palette.colors:[]).filter((c):c is Hex=>typeof c==='string'&&isHexColor(c)).map(c=>c.toLowerCase() as Hex),c=>c).slice(0,MAX_PALETTE),
   gradients:uniqueBy((Array.isArray(palette.gradients)?palette.gradients:[]).map(parseGradient).filter((g):g is CustomGradient=>!!g),g=>JSON.stringify(g)).slice(0,MAX_PALETTE)},
  savedSections:uniqueBy((Array.isArray(v.savedSections)?v.savedSections:[]).map(parseSavedSection).filter((x):x is SavedSection=>!!x),x=>x.id).slice(0,MAX_SAVED_SECTIONS)};
}
export type LibraryChange=
 |{type:'mark/save';style:MarkStyle}|{type:'mark/remove';id:string}
 |{type:'palette/color';color:Hex}|{type:'palette/gradient';gradient:CustomGradient}
 |{type:'palette/remove-color';color:Hex}|{type:'palette/remove-gradient';gradient:CustomGradient}
 |{type:'section/save';section:SavedSection}|{type:'section/remove';id:string}
 |{type:'section/duplicate';id:string;newId:string};
/** Every library edit goes through here so limits and shapes always hold. Newest saved things come first. */
export function changeLibrary(lib:Library,c:LibraryChange):Library{
 const next=(patch:Partial<Library>)=>parseLibrary({...lib,...patch});
 switch(c.type){
  case 'mark/save':{const i=lib.markStyles.findIndex(m=>m.id===c.style.id);const list=[...lib.markStyles];if(i>=0)list[i]=c.style;else list.unshift(c.style);return next({markStyles:list});}
  case 'mark/remove':return next({markStyles:lib.markStyles.filter(m=>m.id!==c.id)});
  case 'palette/color':return next({palette:{...lib.palette,colors:[c.color.toLowerCase() as Hex,...lib.palette.colors]}});
  case 'palette/gradient':return next({palette:{...lib.palette,gradients:[c.gradient,...lib.palette.gradients]}});
  case 'palette/remove-color':return next({palette:{...lib.palette,colors:lib.palette.colors.filter(x=>x!==c.color.toLowerCase())}});
  case 'palette/remove-gradient':return next({palette:{...lib.palette,gradients:lib.palette.gradients.filter(g=>JSON.stringify(g)!==JSON.stringify(c.gradient))}});
  case 'section/save':{const i=lib.savedSections.findIndex(s=>s.id===c.section.id);const list=[...lib.savedSections];if(i>=0)list[i]=c.section;else list.unshift(c.section);return next({savedSections:list});}
  case 'section/remove':return next({savedSections:lib.savedSections.filter(s=>s.id!==c.id)});
  case 'section/duplicate':{const src=lib.savedSections.find(s=>s.id===c.id);if(!src)return lib;const i=lib.savedSections.indexOf(src);const list=[...lib.savedSections];list.splice(i+1,0,{...src,id:c.newId,name:`${src.name} copy`.slice(0,40)});return next({savedSections:list});}
 }
}
export const newLibraryId=(prefix:string)=>`${prefix}-${Math.random().toString(36).slice(2,10)}`;
export const filterSaved=(list:SavedSection[],query:string)=>{const q=query.trim().toLowerCase();return q?list.filter(s=>`${s.name} ${s.title} ${s.type} ${s.starter.join(' ')}`.toLowerCase().includes(q)):list;};
