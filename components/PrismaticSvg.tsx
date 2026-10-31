"use client";

import { useId, type ReactNode } from 'react';
import './PrismaticSvg.css';

export type PrismaticTone = 'primary' | 'secondary' | 'tertiary';
/** Each SVG owns its paint server: repeated icons and streamed headers never share IDs. */
export function PrismaticSvg({width,height,viewBox,paint='stroke',tone='primary',className='',children}:{width:number;height:number;viewBox:string;paint?:'stroke'|'fill';tone?:PrismaticTone;className?:string;children:ReactNode}) {
  const id=`muse-prism-${useId()}`;
  return <svg width={width} height={height} viewBox={viewBox} className={`muse-prismatic-svg ${className}`} data-prism-tone={tone} fill={paint==='fill'?`url(#${id})`:'none'} stroke={paint==='stroke'?`url(#${id})`:undefined} strokeWidth={paint==='stroke'?1.6:undefined} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <defs><linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%"><stop stopColor="var(--icon-paint-start)"/><stop offset=".5" stopColor="var(--icon-paint-middle)"/><stop offset="1" stopColor="var(--icon-paint-end)"/></linearGradient></defs>
    {children}
  </svg>;
}
