/**
 * Theme Atelier model. A remix is an official base theme plus sparse changes: token overrides, edited copies of the
 * built-in atmosphere planes, up to eight extra layers, and a few atmosphere multipliers. Applying one keeps
 * `data-theme` on the base (so materials, Disco light, birthday confetti and every theme-aware rule keep working)
 * and adds a single generated rule scoped by `data-atelier`. Official themes are never modified.
 */
import {themes,type ThemeId,isThemeId} from '@/lib/themes';
import {officialTokenValues,defaultPlaneSources} from './catalog.generated';
import {themeTokenSet,referenceableTokens,lockedTokens,frostedMapped} from './tokens';
import {splitTopLevel,splitWords,parseStops,formatStops,parseLen,formatLen,num,isSafeCssValue,parseRgba,type Len,type StopSpec,type ColorValue} from './css-values';

export const ATELIER_SCHEMA=1;
export const MAX_CUSTOM_LAYERS=8;
export const MAX_STOPS=6;

export type PlaneId='bloom'|'pool'|'haze'|'discoSpill'|'discoCaustic'|'discoReflection';
export type LayerType='radial'|'linear'|'conic';
export type BlendMode='normal'|'screen'|'lighten'|'color-dodge';
export const blendModes:BlendMode[]=['normal','screen','lighten','color-dodge'];
export type LayerSpec={id:string;name:string;on:boolean;type:LayerType;shape:'ellipse'|'circle';w:Len;h:Len;x:Len;y:Len;angle:number;stops:StopSpec[];opacity:number;blend?:BlendMode};
export type StarDensity='none'|'sparse'|'normal'|'rich';
export type Effects={glowStrength:number;glowSize:number;brightness:number;saturation:number;starOpacity:number;starGlow:number;stars:StarDensity;iconGlow:number;iconAngle:number;iconMiddle:number;vignette:{strength:number;color:string}|null};
/**
 * `frozen`: a self-contained snapshot (every token and plane written out), so later changes to the official base
 * theme no longer move it. `baseFingerprint`: what the base looked like when this was last saved, to detect drift.
 */
export type AtelierDefinition={schema:1;base:ThemeId;tokens:Record<string,string>;planes:Partial<Record<PlaneId,LayerSpec[]>>;custom:LayerSpec[];effects:Effects;frozen?:boolean;baseFingerprint?:string};
export type AtelierTheme={id:string;name:string;status:'draft'|'saved';definition:AtelierDefinition;updatedAt?:string};

export const defaultEffects:Effects={glowStrength:100,glowSize:100,brightness:100,saturation:100,starOpacity:100,starGlow:100,stars:'normal',iconGlow:100,iconAngle:45,iconMiddle:50,vignette:null};
export const planeLabels:Record<PlaneId,string>={bloom:'Blooms',pool:'Haze pools',haze:'Fine haze',discoSpill:'Disco light spill',discoCaustic:'Disco caustics',discoReflection:'Disco reflections'};
export const planeVariables:Record<PlaneId,string>={bloom:'--atmosphere-bloom-layers',pool:'--atmosphere-pool-layers',haze:'--atmosphere-haze-layers',discoSpill:'--disco-spill-layers',discoCaustic:'--disco-caustic-layers',discoReflection:'--disco-reflection-layers'};
/** Disco's own light planes only render on Disco; other bases show only the shared planes. */
export const planesFor=(base:ThemeId):PlaneId[]=>base==='disco-damage'?['discoSpill','discoCaustic','discoReflection','pool','bloom','haze']:['pool','bloom','haze'];

export const emptyDefinition=(base:ThemeId):AtelierDefinition=>({schema:1,base,tokens:{},planes:{},custom:[],effects:{...defaultEffects}});
export const themeName=(id:string)=>themes.find(theme=>theme.id===id)?.name??id;
export const themeMode=(id:ThemeId)=>themes.find(theme=>theme.id===id)?.mode??'dark';

/** The effective value of a token: the remix's override or the base theme's own value. */
export function tokenValue(definition:Pick<AtelierDefinition,'base'|'tokens'>,name:string):string{return definition.tokens[name]??officialTokenValues[definition.base]?.[name]??'';}
/** Follows var() aliases (e.g. Primary accent → Aqua) to a concrete value, within the remix. */
export function resolveToken(definition:Pick<AtelierDefinition,'base'|'tokens'>,name:string,depth=0):string{
 const value=tokenValue(definition,name);const alias=value.match(/^var\((--[\w-]+)\)$/);
 return alias&&depth<8?resolveToken(definition,alias[1],depth+1):value;
}

// ---- Built-in planes ----------------------------------------------------------------------------------------
const layerNames:Record<PlaneId,string[]>={
 bloom:['Header glow','Upper bloom','Second bloom','Third bloom','Fourth bloom'],
 pool:[],haze:['Fine haze one','Fine haze two','Fine haze three'],discoSpill:[],discoCaustic:['Horizontal glint','Vertical glint'],discoReflection:[],
};
function resolveVarWords(text:string,definition:Pick<AtelierDefinition,'base'|'tokens'>){return text.replace(/var\((--[\w-]+)\)/g,(_,name)=>resolveToken(definition,name));}
/** Parses one CSS gradient layer into editable numbers. Theme-token colours stay linked; geometry is resolved. */
export function parseLayer(source:string,definition:Pick<AtelierDefinition,'base'|'tokens'>,id:string,name:string):LayerSpec|null{
 const m=source.trim().match(/^(radial|linear|conic)-gradient\(([\s\S]*)\)$/);if(!m)return null;
 const type=m[1] as LayerType,parts=splitTopLevel(m[2]);let prelude=parts[0]??'';
 const layer:LayerSpec={id,name,on:true,type,shape:'ellipse',w:{v:50,u:'%'},h:{v:50,u:'%'},x:{v:50,u:'%'},y:{v:50,u:'%'},angle:180,stops:[],opacity:100};
 const startsWithColor=/^(#|rgba?\(|hsla?\(|var\(|color-mix\(|transparent)/.test(prelude);
 if(startsWithColor)prelude='';else parts.shift();
 const words=splitWords(resolveVarWords(prelude,definition));
 const at=words.indexOf('at'),position=at>=0?words.slice(at+1):[];
 if(position.length===2){const x=parseLen(position[0]),y=parseLen(position[1]);if(!x||!y)return null;layer.x=x;layer.y=y;}
 if(type==='radial'){
  const shape=words[0]==='circle'?'circle':'ellipse';layer.shape=shape;const size=words.slice(words[0]==='ellipse'||words[0]==='circle'?1:0,at>=0?at:undefined);
  if(size.length>=1){const w=parseLen(size[0]),h=parseLen(size[1]??size[0]);if(!w||!h)return null;layer.w=w;layer.h=h;}
 }else if(type==='linear'){const deg=words[0]?.match(/^(-?[\d.]+)deg$/);if(deg)layer.angle=parseFloat(deg[1]);}
 else{const from=words.indexOf('from');const deg=from>=0?words[from+1]?.match(/^(-?[\d.]+)deg$/):null;if(deg)layer.angle=parseFloat(deg[1]);}
 const stops=parseStops(parts);if(!stops||stops.length<2)return null;layer.stops=stops;
 return layer;
}
export function planeSource(plane:PlaneId,base:ThemeId){
 if(plane==='pool'&&base==='disco-damage')return defaultPlaneSources.discoPool;
 // #111: themes with their own atmospheric composition define the plane's layer list in their theme block.
 return officialTokenValues[base]?.[planeVariables[plane]]??defaultPlaneSources[plane];
}
/** The official layers of a plane for this base, as editable specs. */
export function builtInLayers(plane:PlaneId,definition:Pick<AtelierDefinition,'base'|'tokens'>):LayerSpec[]{
 const names=layerNames[plane];
 return splitTopLevel(planeSource(plane,definition.base)).map((source,i)=>parseLayer(source,definition,`${plane}-${i+1}`,names[i]??`${planeLabels[plane].replace(/s$/,'')} ${i+1}`)).filter((layer):layer is LayerSpec=>!!layer);
}
export const planeLayers=(plane:PlaneId,definition:AtelierDefinition)=>definition.planes[plane]??builtInLayers(plane,definition);
/** Overall glow strength and size apply to every built-in light layer (not to a person's own layers). */
export function effectivePlaneLayers(plane:PlaneId,definition:AtelierDefinition):LayerSpec[]{
 const {glowStrength=100,glowSize=100}=definition.effects;const layers=planeLayers(plane,definition);
 if(glowStrength===100&&glowSize===100)return layers;
 const k=glowSize/100,scale=(len:Len):Len=>({...len,v:Math.round(len.v*k*10)/10});
 return layers.map(layer=>({...layer,opacity:Math.min(400,layer.opacity*glowStrength/100),...(layer.type==='radial'?{w:scale(layer.w),h:scale(layer.h)}:{})}));
}
export const glowEffectsActive=(definition:AtelierDefinition)=>(definition.effects.glowStrength??100)!==100||(definition.effects.glowSize??100)!==100;

/** Circle radii are absolute; a percentage width is read against a 1280px page. */
export const circleRadius=(len:Len):Len=>len.u==='%'?{v:Math.round(len.v*12.8),u:'px'}:len;
export function formatLayer(layer:LayerSpec):string{
 const stops=formatStops(layer.stops,layer.opacity);
 if(layer.type==='linear')return `linear-gradient(${num(layer.angle)}deg,${stops})`;
 if(layer.type==='conic')return `conic-gradient(from ${num(layer.angle)}deg at ${formatLen(layer.x)} ${formatLen(layer.y)},${stops})`;
 // A circle takes one radius, and CSS only accepts an absolute length for it.
 if(layer.shape==='circle')return `radial-gradient(circle ${formatLen(circleRadius(layer.w))} at ${formatLen(layer.x)} ${formatLen(layer.y)},${stops})`;
 return `radial-gradient(ellipse ${formatLen(layer.w)} ${formatLen(layer.h)} at ${formatLen(layer.x)} ${formatLen(layer.y)},${stops})`;
}
export const formatLayers=(layers:LayerSpec[])=>{const visible=layers.filter(layer=>layer.on);return visible.length?visible.map(formatLayer).join(','):'none';};

// ---- Compile -----------------------------------------------------------------------------------------------
const scopePattern=/^[a-z0-9-]{1,40}$/;
export type CompiledTheme={css:string;stars:StarDensity;iconAngle:number;iconMiddle:number};
/** One rule for the remix, one for Frosted (to keep the material's surface swap), nothing else. */
export function compileTheme(definition:AtelierDefinition,scope:string):CompiledTheme{
 if(!scopePattern.test(scope))throw Error('Invalid theme scope');
 const decls:string[]=[];
 for(const [name,value] of Object.entries(definition.tokens))if(themeTokenSet.has(name)&&!lockedTokens.has(name)&&isSafeCssValue(value,referenceableTokens))decls.push(`${name}:${value}`);
 const planes=glowEffectsActive(definition)?planesFor(definition.base):Object.keys(definition.planes) as PlaneId[];
 for(const plane of planes)decls.push(`${planeVariables[plane]}:${formatLayers(effectivePlaneLayers(plane,definition))}`);
 if(definition.custom.length){decls.push(`--atmosphere-custom-layers:${formatLayers(definition.custom)}`);const visible=definition.custom.filter(layer=>layer.on);if(visible.some(layer=>layer.blend&&layer.blend!=='normal'))decls.push(`--atmosphere-custom-blend:${visible.map(layer=>layer.blend??'normal').join(',')}`);}
 const e=definition.effects;
 const vignette=e.vignette&&parseRgba(e.vignette.color);
 if(vignette&&e.vignette!.strength>0)decls.push(`--atmosphere-vignette:radial-gradient(ellipse 120% 100% at 50% 45%,transparent 52%,rgba(${vignette.r},${vignette.g},${vignette.b},${num(Math.min(1,e.vignette!.strength/100))}))`);
 if(e.brightness!==100||e.saturation!==100)decls.push(`--atmosphere-filter:brightness(${num(e.brightness/100)}) saturate(${num(e.saturation/100)})`);
 if(e.starOpacity!==100)decls.push(`--atmosphere-star-opacity:${num(e.starOpacity/100)}`);
 if(e.starGlow!==100)decls.push(`--atmosphere-star-glow:${num(e.starGlow/100)}`);
 if(e.iconGlow!==100)decls.push(`--icon-glow:${num(e.iconGlow/100)}`);
 const selector=`:root[data-theme][data-atelier="${scope}"]`;
 let css=decls.length?`${selector}{${decls.join(';')}}`:'';
 const frosted=Object.keys(frostedMapped).filter(name=>name in definition.tokens);
 if(frosted.length)css+=`\n${selector}[data-material="frosted"]{${frosted.map(name=>`${name}:var(${frostedMapped[name]})`).join(';')}}`;
 return {css,stars:e.stars,iconAngle:e.iconAngle,iconMiddle:e.iconMiddle};
}

// ---- Validation (saved rows, imports) -------------------------------------------------------------------------
const finite=(value:unknown,min:number,max:number,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
const units=new Set(['%','px','svh']);
function validLen(value:unknown,fallback:Len):Len{const v=value as Len;return v&&typeof v==='object'&&units.has(v.u)?{v:finite(v.v,-400,4000,fallback.v),u:v.u}:fallback;}
function validColor(value:unknown):ColorValue|null{
 const c=value as ColorValue;if(!c||typeof c!=='object')return null;
 if(c.k==='none')return {k:'none'};
 if(c.k==='token')return typeof c.t==='string'&&referenceableTokens.has(c.t)?{k:'token',t:c.t,m:finite(c.m,0,100,100)}:null;
 if(c.k==='rgba')return {k:'rgba',r:Math.round(finite(c.r,0,255,0)),g:Math.round(finite(c.g,0,255,0)),b:Math.round(finite(c.b,0,255,0)),a:finite(c.a,0,1,1)};
 return null;
}
function validLayer(value:unknown,index:number):LayerSpec|null{
 const l=value as LayerSpec;if(!l||typeof l!=='object'||!['radial','linear','conic'].includes(l.type)||!Array.isArray(l.stops))return null;
 const stops=l.stops.slice(0,MAX_STOPS).map(stop=>{const c=validColor(stop?.c);return c&&Array.isArray(stop.p)?{c,p:stop.p.slice(0,2).map(p=>finite(p,-100,200,0))}:null;});
 if(stops.length<2||stops.some(stop=>!stop))return null;
 const name=typeof l.name==='string'?l.name.trim().slice(0,40):'';
 return {id:typeof l.id==='string'&&/^[\w-]{1,60}$/.test(l.id)?l.id:`layer-${index+1}`,name:name||`Layer ${index+1}`,on:l.on!==false,type:l.type,shape:l.shape==='circle'?'circle':'ellipse',w:validLen(l.w,{v:50,u:'%'}),h:validLen(l.h,{v:50,u:'%'}),x:validLen(l.x,{v:50,u:'%'}),y:validLen(l.y,{v:50,u:'%'}),angle:finite(l.angle,-720,720,180),stops:stops as StopSpec[],opacity:finite(l.opacity,0,100,100),...(blendModes.includes(l.blend as BlendMode)&&l.blend!=='normal'?{blend:l.blend}:{})};
}
export type ValidationResult={ok:true;definition:AtelierDefinition;dropped:string[]}|{ok:false;error:string};
/** Accepts only known keys and typed values; unsafe or unknown entries are dropped and reported, never executed. */
export function validateDefinition(input:unknown):ValidationResult{
 const d=input as AtelierDefinition;
 if(!d||typeof d!=='object'||Array.isArray(d))return {ok:false,error:'This is not a Muse theme.'};
 if(d.schema!==ATELIER_SCHEMA)return {ok:false,error:'This theme was made with a version of Theme Atelier that Muse cannot read.'};
 if(typeof d.base!=='string'||!isThemeId(d.base))return {ok:false,error:'The theme is based on a Muse theme that does not exist here.'};
 const dropped:string[]=[];const tokens:Record<string,string>={};
 for(const [name,value] of Object.entries(d.tokens&&typeof d.tokens==='object'?d.tokens:{})){
  if(themeTokenSet.has(name)&&!lockedTokens.has(name)&&isSafeCssValue(value,referenceableTokens))tokens[name]=value.trim();else dropped.push(name);
 }
 const planes:Partial<Record<PlaneId,LayerSpec[]>>={};
 for(const plane of Object.keys(planeVariables) as PlaneId[]){const list=(d.planes as Record<string,unknown>|undefined)?.[plane];if(Array.isArray(list)){const layers=list.slice(0,24).map(validLayer).filter((l):l is LayerSpec=>!!l);planes[plane]=layers;if(layers.length<list.length)dropped.push(planeLabels[plane]);}}
 const custom=(Array.isArray(d.custom)?d.custom:[]).slice(0,MAX_CUSTOM_LAYERS).map(validLayer).filter((l):l is LayerSpec=>!!l);
 const e=(d.effects??{}) as Partial<Effects>;
 const vignette=e.vignette&&typeof e.vignette==='object'&&typeof e.vignette.color==='string'&&parseRgba(e.vignette.color)?{strength:finite(e.vignette.strength,0,100,0),color:e.vignette.color}:null;
 const effects:Effects={glowStrength:finite(e.glowStrength,0,400,100),glowSize:finite(e.glowSize,25,300,100),brightness:finite(e.brightness,40,180,100),saturation:finite(e.saturation,0,220,100),starOpacity:finite(e.starOpacity,0,300,100),starGlow:finite(e.starGlow,0,400,100),stars:(['none','sparse','normal','rich'] as const).includes(e.stars as StarDensity)?e.stars as StarDensity:'normal',iconGlow:finite(e.iconGlow,0,400,100),iconAngle:finite(e.iconAngle,0,359,45),iconMiddle:finite(e.iconMiddle,5,95,50),vignette};
 const fingerprint=typeof d.baseFingerprint==='string'&&/^[0-9a-f]{8}$/.test(d.baseFingerprint)?{baseFingerprint:d.baseFingerprint}:{};
 return {ok:true,definition:{schema:1,base:d.base,tokens,planes,custom,effects,...(d.frozen===true?{frozen:true}:{}),...fingerprint},dropped};
}

// ---- Base fingerprints and freezing ---------------------------------------------------------------------------
/** A short, stable hash of an official theme's tokens and default layers, so a remix can tell when its base changed. */
export function baseFingerprint(base:ThemeId):string{
 const text=JSON.stringify([officialTokenValues[base],planesFor(base).map(plane=>planeSource(plane,base))]);
 let hash=0x811c9dc5;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,0x01000193)>>>0;}
 return hash.toString(16).padStart(8,'0');
}
export const baseChanged=(definition:AtelierDefinition)=>!definition.frozen&&!!definition.baseFingerprint&&definition.baseFingerprint!==baseFingerprint(definition.base);
/**
 * Writes out every effective token and every atmosphere plane, so the appearance no longer inherits from the
 * official base. Base-specific effects that are not tokens (Disco's glitter stars and foil hover, birthday
 * confetti) still come from the base theme's id.
 */
export function freezeDefinition(definition:AtelierDefinition):AtelierDefinition{
 const tokens:Record<string,string>={};
 for(const name of themeTokenSet)if(!lockedTokens.has(name)){const value=tokenValue(definition,name);if(value)tokens[name]=value;}
 const planes:Partial<Record<PlaneId,LayerSpec[]>>={};for(const plane of planesFor(definition.base))planes[plane]=planeLayers(plane,definition).map(layer=>({...layer}));
 return {...definition,tokens,planes,frozen:true,baseFingerprint:baseFingerprint(definition.base)};
}

// ---- Portable file -------------------------------------------------------------------------------------------
/** Special effects that belong to particular official themes; a new theme opts into each explicitly. */
export const specialEffects=[{id:'disco-light',label:'Disco light',detail:'Light spill, caustics and reflections'},{id:'disco-glitter',label:'Disco glitter',detail:'The 72 official glitter stars'},{id:'disco-foil',label:'Disco foil and chrome glass',detail:'Holographic hover and chrome card edges'},{id:'birthday-confetti',label:'Birthday confetti',detail:'Candy sprinkles from the ISSYA BDAY themes'}] as const;
export type SpecialEffect=typeof specialEffects[number]['id'];
export type Handoff={intent:'remix'}|{intent:'new-theme';name:string;subtitle:string;mode:'light'|'dark';effects:SpecialEffect[]}|{intent:'update-theme';target:ThemeId;frozenRemixes:string[];keptOriginal:string|null};
/** Everything needed to reproduce the look exactly, independent of later changes to the base theme. */
export function resolvedSnapshot(definition:AtelierDefinition){
 const frozen=freezeDefinition(definition);
 return {base:definition.base,baseFingerprint:baseFingerprint(definition.base),mode:themeMode(definition.base),tokens:frozen.tokens,
  planes:Object.fromEntries(Object.entries(frozen.planes).map(([plane,layers])=>[plane,formatLayers(layers!)])),
  custom:formatLayers(definition.custom),customBlend:definition.custom.filter(l=>l.on).map(l=>l.blend??'normal'),
  effects:definition.effects,css:compileTheme(frozen,'export').css};
}
export type ThemeFile={'muse-theme':1;name:string;exportedAt?:string;handoff?:Handoff;definition:AtelierDefinition;resolved?:ReturnType<typeof resolvedSnapshot>};
export const exportTheme=(name:string,definition:AtelierDefinition,handoff:Handoff={intent:'remix'}):string=>JSON.stringify({'muse-theme':1,name,exportedAt:new Date().toISOString(),handoff,definition,resolved:resolvedSnapshot(definition)} satisfies ThemeFile,null,2);
export function importTheme(text:string):{ok:true;name:string;definition:AtelierDefinition;dropped:string[]}|{ok:false;error:string}{
 if(text.length>400_000)return {ok:false,error:'That file is too large to be a Muse theme.'};
 let parsed:unknown;try{parsed=JSON.parse(text);}catch{return {ok:false,error:'That file is not valid JSON.'};}
 const file=parsed as ThemeFile;
 if(!file||typeof file!=='object'||file['muse-theme']!==1)return {ok:false,error:'That file is not a Muse theme export.'};
 const result=validateDefinition(file.definition);if(!result.ok)return result;
 const name=typeof file.name==='string'&&file.name.trim()?file.name.trim().slice(0,60):'Imported theme';
 return {ok:true,name,definition:result.definition,dropped:result.dropped};
}
export const isDirty=(a:AtelierDefinition,b:AtelierDefinition)=>JSON.stringify(a)!==JSON.stringify(b);
export const changeCount=(definition:AtelierDefinition)=>Object.keys(definition.tokens).length+Object.keys(definition.planes).length+definition.custom.length+Object.entries(definition.effects).filter(([key,value])=>JSON.stringify(value)!==JSON.stringify(defaultEffects[key as keyof Effects])).length;
