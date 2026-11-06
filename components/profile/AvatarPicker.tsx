"use client";
import type {CSSProperties} from 'react';
import {avatarGroups,museAvatars} from '@/lib/profile/avatars';
import {MuseAvatar} from './MuseAvatar';

/** Choose a Muse character, grouped so a long cast stays easy to browse. */
export function AvatarPicker({value,onChange,size=64}:{value:string;onChange:(id:string)=>void;size?:number}){
 return <div className="muse-avatar-picker">{avatarGroups.map(group=><div key={group} className="muse-avatar-group" role="radiogroup" aria-label={group}>
  <p className="small-label">{group}</p>
  <div className="muse-avatar-grid" style={{'--avatar-size':`${size}px`} as CSSProperties}>{museAvatars.filter(a=>a.group===group).map(a=><button key={a.id} type="button" role="radio" aria-checked={value===a.id} aria-label={a.name} title={a.name} onClick={()=>onChange(a.id)}><MuseAvatar id={a.id} size={size} decorative/></button>)}</div>
 </div>)}</div>;
}
