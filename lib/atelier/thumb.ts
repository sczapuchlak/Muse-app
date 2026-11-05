/**
 * Theme cards in the library are miniature pages styled by the theme's own tokens. Custom properties inherit, so a
 * block that re-declares the full token set (and the atmosphere layer lists, which must resolve against it) on the
 * card makes everything inside it render in that theme, without touching the page's own theme.
 */
import {officialTokenValues} from './catalog.generated';
import {referenceableTokens,themeTokenSet} from './tokens';
import {isSafeCssValue} from './css-values';
import {formatLayers,planeSource,planeVariables,effectivePlaneLayers,glowEffectsActive,type AtelierDefinition,type PlaneId} from './model';

export function thumbCss(definition:AtelierDefinition,scope:string){
 if(!/^[a-z0-9-]{1,60}$/.test(scope))throw Error('Invalid thumbnail scope');
 const base=officialTokenValues[definition.base]??{};const decls:string[]=[];
 for(const name of themeTokenSet){const override=definition.tokens[name];const value=override&&isSafeCssValue(override,referenceableTokens)?override:base[name];if(value)decls.push(`${name}:${value}`);}
 const planes:PlaneId[]=['bloom','pool','discoSpill'];
 for(const plane of planes){const disco=plane==='discoSpill'&&definition.base!=='disco-damage';decls.push(`${planeVariables[plane]}:${disco?'none':definition.planes[plane]||glowEffectsActive(definition)?formatLayers(effectivePlaneLayers(plane,definition)):planeSource(plane,definition.base)}`);}
 decls.push(`--atmosphere-custom-layers:${definition.custom.length?formatLayers(definition.custom):'none'}`);
 const e=definition.effects;decls.push(`--atmosphere-filter:${e.brightness!==100||e.saturation!==100?`brightness(${e.brightness/100}) saturate(${e.saturation/100})`:'none'}`);
 return `.muse-atelier-thumb[data-thumb="${scope}"]{${decls.join(';')}}`;
}
