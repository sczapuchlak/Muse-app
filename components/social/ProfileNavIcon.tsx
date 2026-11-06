"use client";
/* eslint-disable @next/next/no-img-element -- small bundled artwork; already sized and compressed. */
import {avatarSrc} from '@/lib/profile/avatars';
import {useMyAvatar} from '@/lib/social/my-avatar';
import {MuseIcon} from '../MuseIcon';
import './ProfileNavIcon.css';

/** My Profile's nav icon: the usual icon until an avatar is chosen, then that avatar in a sparkling gold ring. */
export function ProfileNavIcon({userId,size=20}:{userId:string;size?:number}){
 const avatarId=useMyAvatar(userId);
 if(!avatarId)return <MuseIcon name="people" size={size} treatment="prismatic"/>;
 return <span className="muse-nav-avatar" style={{width:size+6,height:size+6}} aria-hidden="true"><img src={avatarSrc(avatarId)} width={size} height={size} alt="" decoding="async"/></span>;
}
