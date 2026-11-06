"use client";
/* eslint-disable @next/next/no-img-element -- small bundled artwork; already sized and compressed. */
import {avatarSrc} from '@/lib/profile/avatars';
import {useMyIdentityChrome} from '@/lib/social/my-avatar';
import {MuseIcon} from '../MuseIcon';
import './ProfileNavIcon.css';

/** The profile row's icon: the usual icon until an avatar is chosen, then that avatar. Only the creator wears gold. */
export function ProfileNavIcon({userId,size=20}:{userId:string;size?:number}){
 const {avatarId,creator}=useMyIdentityChrome(userId);
 if(!avatarId)return <MuseIcon name="people" size={size} treatment="prismatic"/>;
 return <span className="muse-nav-avatar" data-creator={creator||undefined} style={{width:size+6,height:size+6}} aria-hidden="true"><img src={avatarSrc(avatarId)} width={size} height={size} alt="" decoding="async"/></span>;
}

/** The profile row's label: the person's @username once they have one. */
export function ProfileNavLabel({userId,fallback}:{userId:string;fallback:string}){const {username}=useMyIdentityChrome(userId);return <>{username?`@${username}`:fallback}</>;}
