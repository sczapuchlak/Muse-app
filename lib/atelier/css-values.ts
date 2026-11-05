/**
 * Theme Atelier value grammar. Every value the Atelier writes into CSS is either produced here from numbers and
 * colours, or checked by `isSafeCssValue`, a closed allow-list grammar: no url(), strings, @-rules, braces,
 * semicolons, escapes or unknown functions can ever reach a stylesheet, including from imported theme files.
 */
export type Rgba={r:number;g:number;b:number;a:number};
/** A colour in a layer or gradient stop: a theme token (optionally thinned with color-mix), a literal, or transparent. */
export type ColorValue={k:'token';t:string;m:number}|({k:'rgba'}&Rgba)|{k:'none'};
export type Len={v:number;u:'%'|'px'|'svh'};
export type StopSpec={c:ColorValue;p:number[]};

const clamp=(value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));
const round=(value:number,places=3)=>{const f=10**places;return Math.round(value*f)/f;};
export const num=(value:number)=>String(round(value)).replace(/^0\./,'.').replace(/^-0\./,'-.');

export function splitTopLevel(text:string,separator=','){
 const parts:string[]=[];let depth=0,start=0;
 for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='(')depth++;else if(ch===')')depth--;else if(ch===separator&&depth===0){parts.push(text.slice(start,i).trim());start=i+1;}}
 const last=text.slice(start).trim();if(last)parts.push(last);return parts;
}
/** Splits on whitespace outside parentheses. */
export function splitWords(text:string){
 const parts:string[]=[];let depth=0,current='';
 for(const ch of text.trim()){if(ch==='(')depth++;if(ch===')')depth--;if(/\s/.test(ch)&&depth===0){if(current)parts.push(current);current='';}else current+=ch;}
 if(current)parts.push(current);return parts;
}

export function parseHex(value:string):Rgba|null{
 const m=value.trim().match(/^#([\da-f]{3,8})$/i);if(!m||![3,4,6,8].includes(m[1].length))return null;
 const h=m[1].length<5?m[1].split('').map(c=>c+c).join(''):m[1];
 return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16),a:h.length===8?round(parseInt(h.slice(6,8),16)/255):1};
}
export function parseRgba(value:string):Rgba|null{
 const hex=parseHex(value);if(hex)return hex;
 const m=value.trim().match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i);if(!m)return null;
 const alpha=m[4]===undefined?1:m[4].endsWith('%')?parseFloat(m[4])/100:parseFloat(m[4]);
 const values=[m[1],m[2],m[3]].map(Number);if(values.some(v=>!Number.isFinite(v))||!Number.isFinite(alpha))return null;
 return {r:clamp(Math.round(values[0]),0,255),g:clamp(Math.round(values[1]),0,255),b:clamp(Math.round(values[2]),0,255),a:clamp(round(alpha),0,1)};
}
const hex2=(value:number)=>clamp(Math.round(value),0,255).toString(16).padStart(2,'0');
export const rgbaToHex=({r,g,b}:Rgba)=>`#${hex2(r)}${hex2(g)}${hex2(b)}`;
export function formatRgba(color:Rgba){return color.a>=1?rgbaToHex(color):`rgba(${Math.round(color.r)},${Math.round(color.g)},${Math.round(color.b)},${num(clamp(color.a,0,1))})`;}

export function parseColorValue(text:string):ColorValue|null{
 const value=text.trim();
 if(value==='transparent')return {k:'none'};
 const token=value.match(/^var\((--[\w-]+)\)$/);if(token)return {k:'token',t:token[1],m:100};
 const mix=value.match(/^color-mix\(\s*in srgb\s*,\s*var\((--[\w-]+)\)\s+([\d.]+)%\s*,\s*transparent\s*\)$/);if(mix)return {k:'token',t:mix[1],m:clamp(parseFloat(mix[2]),0,100)};
 const rgba=parseRgba(value);return rgba?{k:'rgba',...rgba}:null;
}
/** Serialises a colour with an extra opacity multiplier (0–100), keeping token links live. */
/**
 * Serialises a colour with an opacity multiplier. Up to 100% it thins the colour; above 100% (glow strength) it
 * raises the colour's own alpha with relative colour syntax, capped at fully opaque. Token links stay live.
 */
export function formatColorValue(color:ColorValue,opacity=100):string{
 const factor=clamp(opacity,0,400)/100;
 if(color.k==='none')return 'transparent';
 if(color.k==='token'){
  const mix=round(color.m*factor,2);
  if(mix<=100)return mix>=100?`var(${color.t})`:`color-mix(in srgb,var(${color.t}) ${num(mix)}%,transparent)`;
  return `rgb(from var(${color.t}) r g b / min(1,calc(alpha * ${num(mix/100)})))`;
 }
 return formatRgba({...color,a:Math.min(1,color.a*factor)});
}

const isColorStart=(word:string)=>/^(#|rgba?\(|hsla?\(|var\(|color-mix\(|transparent$)/.test(word);
const parsePercent=(word:string)=>{if(word==='0')return 0;const m=word.match(/^(-?[\d.]+)%$/);return m?parseFloat(m[1]):null;};
export function parseStops(parts:string[]):StopSpec[]|null{
 const stops:StopSpec[]=[];
 for(const part of parts){
  const words=splitWords(part);if(!words.length||!isColorStart(words[0]))return null;
  const c=parseColorValue(words[0]);if(!c)return null;
  const p=words.slice(1).map(parsePercent);if(p.some(v=>v===null)||p.length>2)return null;
  stops.push({c,p:p as number[]});
 }
 return stops;
}
export const formatStops=(stops:StopSpec[],opacity=100)=>stops.map(stop=>[formatColorValue(stop.c,opacity),...stop.p.map(p=>p===0?'0':`${num(p)}%`)].join(' ')).join(',');

export function parseLen(word:string):Len|null{const m=word.match(/^(-?[\d.]+)(%|px|svh)?$/);if(!m)return null;const v=parseFloat(m[1]);if(!Number.isFinite(v))return null;return {v,u:(m[2]as Len['u'])??(v===0?'%':'px')};}
export const formatLen=(len:Len)=>`${num(len.v)}${len.u}`;

/** A simple linear gradient token (e.g. the selected-state wash): angle plus stops. */
export type LinearGradient={angle:number;stops:StopSpec[]};
export function parseLinearGradient(text:string):LinearGradient|null{
 const m=text.trim().match(/^linear-gradient\(([\s\S]*)\)$/);if(!m)return null;
 const parts=splitTopLevel(m[1]);let angle=180;
 const first=parts[0]?.match(/^(-?[\d.]+)deg$/);if(first){angle=parseFloat(first[1]);parts.shift();}
 const stops=parseStops(parts);return stops&&stops.length>=2?{angle,stops}:null;
}
export const formatLinearGradient=(gradient:LinearGradient)=>`linear-gradient(${num(gradient.angle)}deg,${formatStops(gradient.stops)})`;

// ---- Safe value grammar -------------------------------------------------------------------------------------
const functions=new Set(['rgb','rgba','hsl','hsla','color-mix','var','calc','linear-gradient','radial-gradient','conic-gradient','repeating-linear-gradient','repeating-radial-gradient']);
const keywords=new Set(['in','srgb','oklab','oklch','transparent','at','ellipse','circle','from','to','top','bottom','left','right','center','closest-side','closest-corner','farthest-side','farthest-corner','inset','light','dark','none','currentcolor','white','black']);
/**
 * True when `value` is made only of numbers with units, hex colours, allowed keywords and allowed functions,
 * and every var() names a known token. Rejects everything else (url, strings, escapes, ; { } < > @ ! \ etc.).
 */
export function isSafeCssValue(value:unknown,knownTokens:ReadonlySet<string>):value is string{
 if(typeof value!=='string')return false;
 const text=value.trim();if(!text||text.length>600)return false;
 if(!/^[a-zA-Z0-9#%.,()\s\-+*/]+$/.test(text))return false;
 let depth=0;
 const re=/(#[\da-fA-F]{3,8}\b)|(--[\w-]+)|([a-zA-Z][a-zA-Z-]*)(\()?|(-?[\d.]+(?:%|px|deg|svh|vh|vw|em|rem|turn)?)|([(),\s+*/-])/g;
 let match:RegExpExecArray|null,consumed=0,previousFunction='';
 while((match=re.exec(text))){
  if(match.index!==consumed)return false;consumed=re.lastIndex;
  const [,hex,custom,word,call,number,punct]=match;
  if(hex||number)continue;
  if(custom){if(previousFunction!=='var'||!knownTokens.has(custom))return false;previousFunction='';continue;}
  if(word){const lower=word.toLowerCase();if(call){if(!functions.has(lower))return false;depth++;previousFunction=lower;}else if(!keywords.has(lower))return false;continue;}
  if(punct===')'){depth--;if(depth<0)return false;}
  if(punct==='('){return false;}
 }
 return consumed===text.length&&depth===0;
}
