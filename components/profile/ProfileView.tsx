"use client";
import type {CSSProperties,ReactNode} from 'react';
import {gradientCss} from '@/lib/profile/gradients';
import type {ProfileSection} from '@/lib/profile/model';
import {badgeById,badgeAccent,normalizeBadges,type ProfileBadge} from '@/lib/profile/badges';
import {MuseIcon} from '../MuseIcon';
import {MuseStar} from '../MuseStar';
import {MuseAvatar} from './MuseAvatar';
import {ShowcaseView,type ShowcaseViewData} from './ShowcaseView';
import './Profile.css';

export type ProfileViewData={creator?:boolean;displayName:string;username:string;avatarId:string;tagline:string;bio:string;bannerGradient:string;sections:ProfileSection[];badges:string[];showcases:ShowcaseViewData[]};

/** The creator's mark beside her name: gold foil, a crown and a slow shimmer. One of one. */
function CreatorTag(){return <span className="muse-creator-tag" title="The creator of Muse"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8.5 7.5 12 12 5l4.5 7L21 8.5 19 18H5Z"/><circle cx="3" cy="8" r="1.6"/><circle cx="12" cy="4.4" r="1.6"/><circle cx="21" cy="8" r="1.6"/></svg><span>Creator</span><i aria-hidden="true">✦</i></span>;}

/** The profile as a little museum: banner, portrait, an introduction, badges and the Showcases themselves. */
export function ProfileView({data,toolbar,bannerAction,showcaseActions,emptyShowcases,hiddenNote=false}:{data:ProfileViewData;toolbar?:ReactNode;bannerAction?:ReactNode;showcaseActions?:(id:string)=>ReactNode;emptyShowcases?:ReactNode;hiddenNote?:boolean}){
 const sections=data.sections.filter(s=>!s.hidden||hiddenNote);
 const badges=normalizeBadges(data.badges).map(id=>badgeById(id)).filter((b):b is ProfileBadge=>!!b);
 const badgeSection=data.sections.find(s=>s.id==='badges');const showBadges=badges.length>0&&(!badgeSection?.hidden||hiddenNote);
 const block=(section:ProfileSection)=>{
  const muted=section.hidden?' muse-profile-hidden-section':'';
  if(section.id==='about')return (data.bio||section.hidden)&&<section key="about" className={`muse-profile-about${muted}`} aria-label="About me">{section.hidden&&<p className="muse-profile-hidden-label">Hidden from friends</p>}{data.bio?<p className="type-reading">{data.bio}</p>:<p className="muse-atelier-hint">No introduction yet.</p>}</section>;
  if(section.id==='badges')return null; // Badges live in the identity area, beside the name and tagline.
  return <section key="showcases" className={`muse-profile-showcases${muted}`} aria-label="Showcases">{section.hidden&&<p className="muse-profile-hidden-label">Hidden from friends</p>}
   {data.showcases.length?data.showcases.map(showcase=><ShowcaseView key={showcase.id} showcase={showcase} actions={showcaseActions?.(showcase.id)}/>):emptyShowcases}
  </section>;
 };
 return <article className="muse-profile" aria-label={`${data.displayName}'s profile`}>
  <header className="muse-profile-hero">
   <div className="muse-profile-banner" style={{'--banner':gradientCss(data.bannerGradient)} as CSSProperties} aria-hidden="true"><MuseStar size={16}/><MuseStar size={10}/><MuseStar size={22}/></div>
   {bannerAction&&<div className="muse-profile-banner-action">{bannerAction}</div>}
   <div className="muse-profile-identity">
    <MuseAvatar id={data.avatarId} size={124} label={`${data.displayName}'s avatar`} className="muse-profile-portrait" creator={data.creator}/>
    <div className="muse-profile-names">
     <div className="muse-profile-nameline"><h1 className="type-display">{data.displayName}</h1>{data.creator&&<CreatorTag/>}</div>
     <p className="muse-profile-handle">@{data.username}</p>
     {data.tagline&&<p className="muse-profile-tagline type-quote">{data.tagline}</p>}

    </div>
    {/* Badges get their own row under the portrait and name, so nothing leaves a gap beside the avatar. */}
    {showBadges&&<ul className={`muse-profile-badges muse-badge-list${badgeSection?.hidden?' muse-profile-hidden-section':''}`} aria-label={badgeSection?.hidden?'Badges (hidden from friends)':'Badges'}>{badges.map(b=><li key={b.id} className="muse-badge" style={{'--badge':badgeAccent(b.category)} as CSSProperties}><MuseIcon name={b.icon} size={16} treatment="prismatic"/>{b.label}</li>)}</ul>}
    {toolbar&&<div className="muse-profile-toolbar">{toolbar}</div>}
   </div>
  </header>
  <div className="muse-profile-body">{sections.map(block)}</div>
 </article>;
}
