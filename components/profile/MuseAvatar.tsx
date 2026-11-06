"use client";
import {useMemo} from 'react';
import {avatarById,avatarSvg} from '@/lib/profile/avatars';

/** A bundled Muse illustration. The artwork is static and ships with Muse; only its id is ever stored. */
export function MuseAvatar({id,size=48,label,decorative=false,className=''}:{id:string|null|undefined;size?:number;label?:string;decorative?:boolean;className?:string}){
 const svg=useMemo(()=>avatarSvg(avatarById(id).id,{title:label}),[id,label]);
 return <span className={`muse-avatar ${className}`} style={{width:size,height:size}} aria-hidden={decorative||undefined} role={decorative?undefined:'img'} aria-label={decorative?undefined:label??avatarById(id).name} dangerouslySetInnerHTML={{__html:svg}}/>;
}
