import type { CSSProperties,ReactNode } from "react";
import { MuseStar } from "../MuseStar";
export type CelestialTone="aqua"|"purple"|"pink";

export function CelestialStar({x,y,size=16,tone="aqua",delay=0}:{x:number;y:number;size?:number;tone?:CelestialTone;delay?:number}) {
  return <g className="muse-celestial-node" style={{"--celestial-delay":`${delay}s`} as CSSProperties} transform={`translate(${x-size*.3} ${y-size*.5})`}><MuseStar size={size} color={tone}/></g>;
}
export function CelestialPath({d,tone="aqua",faint=false}:{d:string;tone?:CelestialTone;faint?:boolean}) {
  return <path d={d} className={`muse-celestial-line star-${tone}${faint?" muse-celestial-distant":""}`}/>;
}
export function CelestialPoints({points}:{points:[number,number][]}) {
  return <g className="muse-celestial-points">{points.map(([x,y],index)=><circle key={index} cx={x} cy={y} r={index%3===0?1.3:.8}/>)}</g>;
}
export function CelestialCanvas({children}:{children:ReactNode}) {
  return <svg viewBox="0 0 800 220" preserveAspectRatio="xMidYMid slice" focusable="false" aria-hidden="true">{children}</svg>;
}
