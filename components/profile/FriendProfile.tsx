"use client";
import Link from 'next/link';
import {useParams} from 'next/navigation';
import {useEffect,useMemo,useState} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {useThemeOverride} from '@/lib/theme-override';
import {lookupProfile,readFriendView,type FriendView} from '@/lib/profile/persistence';
import {normalizeSections} from '@/lib/profile/model';
import {MuseIcon} from '../MuseIcon';
import {MuseStar} from '../MuseStar';
import {ProfileView} from './ProfileView';
import './Profile.css';

/** A friend's profile, in their theme. Unavailable profiles look the same whether they are private, missing or blocked. */
export function FriendProfile(){
 const {username}=useParams<{username:string}>();const client=useMemo(()=>createMuseBrowserClient(),[]);
 const [view,setView]=useState<FriendView|null|undefined>(undefined);
 useEffect(()=>{let cancelled=false;lookupProfile(client,decodeURIComponent(username)).then(id=>id?readFriendView(client,id):null).then(v=>{if(!cancelled)setView(v);},()=>{if(!cancelled)setView(null);});return()=>{cancelled=true;};},[client,username]);
 useThemeOverride(view?.profile.theme??null);
 if(view===undefined)return <main className="muse-page" aria-busy="true"><p className="small-label" role="status">Knocking gently…</p></main>;
 if(!view)return <main className="muse-page"><div className="muse-empty-state" data-variant="editorial"><MuseStar size={24}/><h1>This profile isn’t available</h1><p>It may be private, or you may not be friends yet.</p><Link className="muse-button muse-edge" href="/friends"><MuseIcon name="people" size={16}/>Friends</Link></div></main>;
 return <main className="muse-page muse-profile-page">
  <div className="muse-profile-status"><Link className="muse-button muse-edge" href="/friends"><MuseIcon name="arrow" size={16}/>Friends</Link><span>You’re visiting {view.identity.displayName}’s Muse. It’s shown in their theme.</span></div>
  <ProfileView data={{displayName:view.identity.displayName,username:view.identity.username,avatarId:view.identity.avatarId,tagline:view.profile.tagline,bio:view.profile.bio,bannerGradient:view.profile.bannerGradient,sections:normalizeSections(view.profile.sections),badges:view.profile.badges,showcases:view.showcases.map(s=>({...s,items:s.items.map(i=>({id:i.id,display:i.display,note:i.note}))}))}}
   emptyShowcases={<p className="muse-atelier-hint">Nothing on display yet.</p>}/>
 </main>;
}
