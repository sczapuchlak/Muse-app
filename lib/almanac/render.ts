/**
 * Renders an Almanac variant from a signal's facts (#53). Pure and deterministic. Facts are already-computed values;
 * this only formats them. Missing facts are never invented: a section whose required facts are null is omitted, and
 * a variable whose fact is missing makes the variant unrenderable (null), so it is never shown half-filled.
 */
import type {AlmanacEntry,Condition,Section,Variant,VariableSpec} from './types';

type Facts=Record<string,number|string|boolean|null|undefined>;
const nf=new Intl.NumberFormat('en-US');
const months=['January','February','March','April','May','June','July','August','September','October','November','December'];

export function formatHour(hour:number){const h=((Math.round(hour)%24)+24)%24;return h===0?'midnight':h===12?'noon':`${h%12} ${h<12?'am':'pm'}`;}
export function formatDuration(seconds:number){const m=Math.round(seconds/60);if(m<60)return `${m} ${m===1?'minute':'minutes'}`;const h=seconds/3600;return h<10&&Math.abs(h-Math.round(h))>.05?`${h.toFixed(1)} hours`:`${Math.round(h)} ${Math.round(h)===1?'hour':'hours'}`;}
export function formatOrdinal(n:number){const v=n%100;return `${n}${v>=11&&v<=13?'th':({1:'st',2:'nd',3:'rd'} as Record<number,string>)[n%10]??'th'}`;}
export function formatDate(iso:string){const [y,m,d]=iso.split('-').map(Number);return y&&m&&d?`${months[m-1]} ${d}`:iso;}

/** One variable's display text, or null when its fact is missing. */
export function formatVariable(spec:VariableSpec,facts:Facts):string|null{
 const v=facts[spec.fact];if(v===null||v===undefined)return null;
 const n=typeof v==='number'?v:Number(v);
 switch(spec.format){
  case 'count':{const text=nf.format(Math.round(n));return spec.plural?`${text} ${Math.round(n)===1?spec.plural[0]:spec.plural[1]}`:text;}
  case 'number':return new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(n);
  case 'percent':return `${Math.round(n*100)}%`;
  case 'hour':return formatHour(n);
  case 'duration':return formatDuration(n);
  case 'date':return formatDate(String(v));
  case 'money':return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
  case 'ordinal':return formatOrdinal(Math.round(n));
  case 'label':return String(v);
 }
}

/** Every {name} placeholder used in a piece of text. */
export const placeholders=(text:string)=>[...text.matchAll(/\{([a-zA-Z][\w]*)\}/g)].map(m=>m[1]);

function fill(text:string,entry:AlmanacEntry,facts:Facts):string|null{
 let missing=false;
 const out=text.replace(/\{([a-zA-Z][\w]*)\}/g,(_,name:string)=>{const spec=entry.variables[name];const value=spec?formatVariable(spec,facts):null;if(value===null)missing=true;return value??'';});
 return missing?null:out;
}
/** Collapse whitespace left by omitted pieces. */
const tidy=(s:string)=>s.replace(/\s+/g,' ').trim();

export type Rendered={title?:string;sections:{heading?:string;text:string}[]};
/** Renders one variant, or null if any fact it needs is missing. */
export function renderVariant(entry:AlmanacEntry,variant:Variant,facts:Facts):Rendered|null{
 const title=variant.title!==undefined?fill(variant.title,entry,facts):undefined;if(title===null)return null;
 const sections:Section[]=typeof variant.body==='string'?[{text:variant.body}]:variant.body;
 const out:Rendered['sections']=[];
 for(const s of sections){
  if(s.requires?.some(f=>facts[f]===null||facts[f]===undefined)||!conditionsHold(s.when,facts))continue;
  const text=fill(s.text,entry,facts),heading=s.heading!==undefined?fill(s.heading,entry,facts):undefined;
  if(text===null||heading===null)return null;
  out.push({...(heading!==undefined?{heading:tidy(heading)}:{}),text:tidy(text)});
 }
 if(!out.length)return null;
 return {...(title!==undefined?{title:tidy(title)}:{}),sections:out};
}

/** Whether a trigger's conditions hold for these facts. */
export function conditionsHold(conditions:Condition[]|undefined,facts:Facts){
 return (conditions??[]).every(([fact,op,value])=>{const v=facts[fact];
  if(op==='present')return v!==null&&v!==undefined;if(op==='absent')return v===null||v===undefined;if(v===null||v===undefined)return false;
  switch(op){case '=':return v===value;case '!=':return v!==value;case '>':return Number(v)>Number(value);case '>=':return Number(v)>=Number(value);case '<':return Number(v)<Number(value);case '<=':return Number(v)<=Number(value);}
 });
}
