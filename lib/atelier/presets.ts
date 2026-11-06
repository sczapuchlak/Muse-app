/** Starting points for new layers, plus Disco's original atmosphere as a restorable remix (no change to Disco itself). */
import {splitTopLevel} from './css-values';
import {parseLayer,MAX_CUSTOM_LAYERS,type AtelierDefinition} from './model';

const make=(definition:AtelierDefinition,source:string,id:string,name:string)=>{const layer=parseLayer(source,definition,id,name);if(!layer)throw Error(`Preset ${name} does not parse`);return layer;};
export type LayerPreset={id:string;name:string;description:string;sources:string[]};
export const layerPresets:LayerPreset[]=[
 {id:'nebula',name:'Nebula bloom',description:'A soft colour cloud with a brighter heart.',sources:['radial-gradient(ellipse 46% 34% at 30% 28%,color-mix(in srgb,var(--accent-secondary) 34%,transparent),color-mix(in srgb,var(--accent-pop) 12%,transparent) 45%,transparent 78%)']},
 {id:'glow',name:'Soft glow',description:'One gentle pool of light.',sources:['radial-gradient(ellipse 420px 320px at 70% 20svh,color-mix(in srgb,var(--accent-primary) 26%,transparent),transparent 76%)']},
 {id:'aurora',name:'Aurora band',description:'A long diagonal ribbon of colour.',sources:['linear-gradient(160deg,transparent 18%,color-mix(in srgb,var(--accent-primary) 16%,transparent) 30%,color-mix(in srgb,var(--accent-secondary) 18%,transparent) 40%,transparent 54%)']},
 {id:'streak',name:'Prismatic streak',description:'A thin refracted light beam.',sources:['linear-gradient(118deg,transparent 19%,color-mix(in srgb,var(--chart-3) 11%,transparent) 21%,color-mix(in srgb,var(--star-1) 12%,transparent) 21.4%,color-mix(in srgb,var(--chart-2) 9%,transparent) 22%,transparent 25%)']},
 {id:'glint',name:'Caustic glint',description:'A flat, bright reflection.',sources:['radial-gradient(ellipse 31% 4% at 90% 30%,color-mix(in srgb,var(--chart-3) 20%,transparent),transparent 76%)']},
 {id:'radial',name:'Blank radial',description:'Start from a plain radial gradient.',sources:['radial-gradient(ellipse 40% 30% at 50% 40%,color-mix(in srgb,var(--accent-primary) 30%,transparent),transparent 75%)']},
 {id:'linear',name:'Blank linear',description:'Start from a plain linear gradient.',sources:['linear-gradient(135deg,color-mix(in srgb,var(--accent-primary) 14%,transparent),transparent 60%)']},
];
export function presetLayer(definition:AtelierDefinition,preset:LayerPreset){
 const id=`custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
 return make(definition,preset.sources[0],id,preset.name);
}
/** + Add Glow: a soft light bloom at a point on the page (px from the top of the page, % across). */
export function newGlow(definition:AtelierDefinition,{x=50,y=420,index=1}:{x?:number;y?:number;index?:number}={}){
 const layer=make(definition,'radial-gradient(ellipse 380px 300px at 50% 0px,color-mix(in srgb,var(--accent-secondary) 42%,transparent) 0,transparent 72%)',`custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,`Glow ${index}`);
 return {...layer,x:{v:Math.round(x),u:'%' as const},y:{v:Math.round(y),u:'px' as const},blend:'screen' as const};
}
export const canAddLayer=(definition:AtelierDefinition)=>definition.custom.length<MAX_CUSTOM_LAYERS;

// Disco Damage XXXTRA! as first shipped (Oct 30–31, commits 135c811 and b8401ff), before the blacklight retune.
const originalDiscoSpill=['radial-gradient(ellipse 64% 320px at 15% 1%,color-mix(in srgb,var(--chart-3) 25%,transparent),transparent 78%)','radial-gradient(ellipse 52% 380px at 88% 8%,color-mix(in srgb,var(--chart-1) 24%,transparent),transparent 80%)','radial-gradient(ellipse 54% 12% at 7% 18%,color-mix(in srgb,var(--chart-6) 15%,transparent),transparent 80%)','radial-gradient(ellipse 50% 15% at 100% 36%,color-mix(in srgb,var(--chart-1) 24%,transparent),transparent 80%)','radial-gradient(ellipse 32% 12% at 8% 60%,color-mix(in srgb,var(--chart-8) 17%,transparent),transparent 80%)','radial-gradient(ellipse 45% 16% at 83% 79%,color-mix(in srgb,var(--chart-5) 24%,transparent),transparent 80%)','radial-gradient(ellipse 54% 15% at 21% 98%,color-mix(in srgb,var(--chart-3) 23%,transparent),transparent 80%)'];
const originalDiscoCaustics=['linear-gradient(118deg,transparent 19%,color-mix(in srgb,var(--chart-3) 11%,transparent) 21%,color-mix(in srgb,var(--star-1) 12%,transparent) 21.4%,color-mix(in srgb,var(--chart-2) 9%,transparent) 22%,transparent 25%)','linear-gradient(68deg,transparent 47%,color-mix(in srgb,var(--chart-1) 11%,transparent) 49%,color-mix(in srgb,var(--chart-5) 12%,transparent) 49.5%,transparent 52%)','radial-gradient(ellipse 31% 4% at 98% 28%,color-mix(in srgb,var(--chart-3) 20%,transparent),transparent 76%)','radial-gradient(ellipse 24% 3% at 6% 47%,color-mix(in srgb,var(--chart-1) 20%,transparent),transparent 76%)','radial-gradient(ellipse 30% 4% at 92% 67%,color-mix(in srgb,var(--chart-6) 13%,transparent),transparent 76%)','radial-gradient(ellipse 20% 3% at 19% 85%,color-mix(in srgb,var(--chart-8) 17%,transparent),transparent 76%)'];
const sharedPools='radial-gradient(ellipse 65% 22% at -8% 33%,var(--atmosphere-aqua),transparent 83%), radial-gradient(ellipse 61% 25% at 108% 43%,var(--atmosphere-blush),transparent 82%), radial-gradient(ellipse 65% 22% at 24% 62%,var(--atmosphere-blue-violet),transparent 84%), radial-gradient(ellipse 52% 23% at 99% 79%,var(--atmosphere-aqua),transparent 84%), radial-gradient(ellipse 69% 20% at 18% 99%,var(--atmosphere-lavender),transparent 83%), radial-gradient(ellipse 45% 25% at 90% 102%,var(--atmosphere-blush),transparent 85%), radial-gradient(ellipse 45% 340px at 52% 0%,var(--haze-primary),transparent 85%), radial-gradient(ellipse 55% 32% at 71% 66%,var(--haze-secondary),transparent 87%)';
const originalDiscoTokens:Record<string,string>={'--background':'#0c071a','--atmosphere-aqua':'rgba(17,223,244,.37)','--atmosphere-lavender':'rgba(163,66,255,.57)','--atmosphere-blush':'rgba(252,39,179,.50)','--atmosphere-blue-violet':'rgba(52,103,255,.32)','--bloom-size-1':'520px 460px','--bloom-size-2':'560px 440px','--bloom-size-3':'610px 440px','--bloom-size-4':'400px 340px','--hero-glow':'rgba(246,242,255,.22)','--hero-glow-size':'500px 300px','--haze-primary':'rgba(169,245,255,.15)','--haze-secondary':'rgba(252,39,179,.17)','--glass-background':'rgba(17,12,26,.64)','--page-bloom-position-1':'3% 22svh','--page-bloom-position-2':'78% 57svh','--page-bloom-position-3':'96% 9svh','--page-bloom-position-4':'10% 89svh','--page-hero-glow-position':'76% 5svh'};

/** Brings back the first Disco's prismatic streaks, caustic patches and full-page light spill. */
export function withOriginalDiscoLight(definition:AtelierDefinition):AtelierDefinition{
 const spill=originalDiscoSpill.map((source,i)=>make(definition,source,`discoSpill-${i+1}`,`Original spill ${i+1}`));
 const caustics=originalDiscoCaustics.map((source,i)=>make(definition,source,`discoCaustic-${i+1}`,i<2?`Prismatic streak ${i+1}`:`Caustic patch ${i-1}`));
 const pools=splitTopLevel(sharedPools).map((source,i)=>make(definition,source,`pool-${i+1}`,`Haze pool ${i+1}`));
 return {...definition,planes:{...definition.planes,discoSpill:spill,discoCaustic:caustics,pool:pools}};
}
/** Brings back the first Disco's violet-black base, bigger and brighter blooms, haze and more transparent glass. */
export function withOriginalDiscoAtmosphere(definition:AtelierDefinition):AtelierDefinition{
 const planes={...definition.planes};delete planes.bloom;
 return {...definition,planes,tokens:{...definition.tokens,...originalDiscoTokens}};
}
