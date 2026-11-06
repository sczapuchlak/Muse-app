"use client";
/* eslint-disable @next/next/no-img-element -- small bundled artwork; already sized and compressed. */
import {avatarById,avatarSrc} from '@/lib/profile/avatars';

/** A bundled Muse illustration. The artwork ships with Muse; only its id is ever stored. */
export function MuseAvatar({id,size=48,label,decorative=false,className=''}:{id:string|null|undefined;size?:number;label?:string;decorative?:boolean;className?:string}){
 const info=avatarById(id);
 return <span className={`muse-avatar ${className}`} style={{width:size,height:size}}><img src={avatarSrc(info.id)} width={size} height={size} alt={decorative?'':label??info.name} loading="lazy" decoding="async"/></span>;
}
