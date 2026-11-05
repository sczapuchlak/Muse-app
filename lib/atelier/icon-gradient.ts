/**
 * Icon gradient geometry (Theme Atelier). SVG gradient endpoints and stop offsets are attributes, not CSS, so the
 * applied theme (or the Atelier preview) publishes them here and every PrismaticSvg reads them. The default
 * reproduces the original diagonal exactly: x1=0% y1=0% x2=100% y2=100%, middle stop at .5.
 */
export type IconGradientGeometry={angle:number;middle:number};
export const defaultIconGeometry:IconGradientGeometry={angle:45,middle:50};
let current=defaultIconGeometry;
const listeners=new Set<()=>void>();
export const readIconGeometry=()=>current;
export const serverIconGeometry=()=>defaultIconGeometry;
export function subscribeIconGeometry(update:()=>void){listeners.add(update);return()=>{listeners.delete(update);};}
export function setIconGeometry(next:IconGradientGeometry|null){
 const value=next&&Number.isFinite(next.angle)&&Number.isFinite(next.middle)?{angle:((Math.round(next.angle)%360)+360)%360,middle:Math.min(95,Math.max(5,Math.round(next.middle)))}:defaultIconGeometry;
 if(value.angle===current.angle&&value.middle===current.middle)return;
 current=value;listeners.forEach(update=>update());
}
const pct=(value:number)=>`${Math.round(value*100)/100}%`;
/** Angle 0° runs left→right and 90° top→bottom (SVG y grows downward); endpoints sit on the icon's bounding box. */
export function iconGradientAttributes({angle,middle}:IconGradientGeometry){
 const radians=angle*Math.PI/180,cos=Math.cos(radians),sin=Math.sin(radians),scale=50/Math.max(Math.abs(cos),Math.abs(sin)),dx=Math.abs(cos*scale)<1e-9?0:cos*scale,dy=Math.abs(sin*scale)<1e-9?0:sin*scale;
 return {x1:pct(50-dx),y1:pct(50-dy),x2:pct(50+dx),y2:pct(50+dy),middle:middle===50?'.5':String(middle/100)};
}
