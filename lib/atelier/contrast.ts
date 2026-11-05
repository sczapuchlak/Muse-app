/** WCAG 2.x contrast on composited colours. Theme Atelier warns; it never changes a creative choice. */
import type {Rgba} from './css-values';
export const composite=(top:Rgba,bottom:Rgba):Rgba=>{const a=top.a+bottom.a*(1-top.a);if(a<=0)return {r:0,g:0,b:0,a:0};return {r:(top.r*top.a+bottom.r*bottom.a*(1-top.a))/a,g:(top.g*top.a+bottom.g*bottom.a*(1-top.a))/a,b:(top.b*top.a+bottom.b*bottom.a*(1-top.a))/a,a};};
const channel=(value:number)=>{const v=value/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
export const luminance=({r,g,b}:Rgba)=>.2126*channel(r)+.7152*channel(g)+.0722*channel(b);
export const contrastRatio=(a:Rgba,b:Rgba)=>{const l1=luminance(a),l2=luminance(b);return Math.round(((Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05))*100)/100;};
export type ContrastCheck={id:string;label:string;ratio:number;minimum:number;token:string;kind:'text'|'large'|'graphic'};
export const contrastLevel=(check:Pick<ContrastCheck,'ratio'|'minimum'>)=>check.ratio>=check.minimum?'pass':check.ratio>=check.minimum*.8?'close':'fail';
