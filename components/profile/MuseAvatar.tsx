"use client";
/* eslint-disable @next/next/no-img-element -- small bundled artwork; already sized and compressed. */
import type {CSSProperties} from 'react';
import {avatarById,avatarSrc} from '@/lib/profile/avatars';
import './MuseAvatar.css';

/**
 * A bundled Muse illustration. The artwork ships with Muse; only its id is ever stored. `creator` adds the
 * one-of-one gold sparkle ring worn only by the Muse creator (a database-protected mark, never self-assigned).
 */
export function MuseAvatar({id,size=48,label,decorative=false,className='',creator=false}:{id:string|null|undefined;size?:number;label?:string;decorative?:boolean;className?:string;creator?:boolean}){
 const info=avatarById(id);
 const image=<span className={`muse-avatar ${creator?'':className}`} style={{width:size,height:size}}><img src={avatarSrc(info.id)} width={size} height={size} alt={decorative?'':label??info.name} loading="lazy" decoding="async"/></span>;
 if(!creator)return image;
 return <span className={`muse-creator-ring ${className}`} style={{'--avatar-px':`${size}px`} as CSSProperties} title="Muse creator">{image}<span className="muse-creator-spark" aria-hidden="true">✦</span>{!decorative&&<span className="sr-only">Muse creator</span>}</span>;
}
