import type {CSSProperties} from 'react';
export const accentPresets=['primary','secondary','pop','warm','info'] as const;
export type AccentPreset=typeof accentPresets[number];
export type AccentColor=AccentPreset|`#${string}`;
export type CustomGradient={colors:[`#${string}`,`#${string}`,(`#${string}`)?];angle:number};
export function isHexColor(value:string):value is `#${string}`{return /^#[\da-f]{6}$/i.test(value);}
export function validAccent(value:string):value is AccentColor{return isHexColor(value)||(accentPresets as readonly string[]).includes(value);}
export const accentCss=(value:AccentColor)=>isHexColor(value)?value:`var(--${value==='info'?'information-accent':`accent-${value}`})`;
export function accentStyle(value:AccentColor|undefined):CSSProperties|undefined{return value?{'--organization-accent':accentCss(value),'--money-accent':accentCss(value),'--item-accent':accentCss(value),...(isHexColor(value)?{'--custom-accent-ink':`color-mix(in srgb, ${value} 35%, var(--foreground))`}:{})} as CSSProperties:undefined;}
/** Resolve theme presets only at an explicit user save/selection; stored custom values remain stable. */
export function pinAccent(value:AccentColor):`#${string}`{if(isHexColor(value))return value;const token=value==='info'?'information-accent':`accent-${value}`,raw=getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim();return isHexColor(raw)?raw:'#8050cf';}
export function validGradient(value:CustomGradient){return value.colors.length>=2&&value.colors.length<=3&&value.colors.every((color)=>!!color&&isHexColor(color))&&[45,90,135,180].includes(value.angle);}
export function customGradientCss(value:CustomGradient){return `linear-gradient(${value.angle}deg,${value.colors.filter(Boolean).join(',')})`;}
