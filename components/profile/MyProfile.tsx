"use client";
import Link from 'next/link';
import {useEffect,useMemo,useState,useSyncExternalStore,type CSSProperties} from 'react';
import {readThemePreference,serverThemePreference,subscribeThemePreference} from '@/lib/theme-preference';
import {useThemeOverride} from '@/lib/theme-override';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {createIdentity,usernameStatus,suggestUsername,usernameHint,localUsernameStatus,socialOverview,updateIdentity,type UsernameStatus} from '@/lib/social/identity';
import {saveProfileDetails,readFriendView,reorderShowcases,markMissing,type Showcase} from '@/lib/profile/persistence';
import {defaultProfile,starterIdeas,visibilityLabels} from '@/lib/profile/model';
import {defaultAvatar} from '@/lib/profile/avatars';
import {AvatarPicker} from './AvatarPicker';
import {ThemeSelect} from '../ThemeOptions';
import {MuseIcon} from '../MuseIcon';
import {MuseStar} from '../MuseStar';
import {MuseAvatar} from './MuseAvatar';
import {ProfileView,type ProfileViewData} from './ProfileView';
import type {ShowcaseViewData} from './ShowcaseView';
import {useMyProfile} from './useMyProfile';
import {useShowcaseSources,sourceStates} from './useShowcaseSources';
import './Profile.css';

const toView=(s:Showcase,friendView=false):ShowcaseViewData=>({id:s.id,title:s.title,description:s.description,icon:s.icon,gradient:s.gradient,layout:s.layout,items:s.items.filter(i=>!friendView||i.sourceState==='ok').map(i=>({id:i.id,display:i.display,note:i.note,missing:i.sourceState==='missing'}))});

export function MyProfile(){
 const me=useMyProfile();
 const appTheme=useSyncExternalStore(subscribeThemePreference,readThemePreference,serverThemePreference);
 const [preview,setPreview]=useState(false);const [friendView,setFriendView]=useState<ProfileViewData|null|'private'>(null);
 const [requests,setRequests]=useState(0);const [notice,setNotice]=useState('');
 // Your own museum wears your own theme; only "Preview as a friend" shows the theme visitors see.
 useThemeOverride(preview?me.details?.theme??null:null);
 const {bundle,loaded}=useShowcaseSources();
 const {client,userId,showcases,setShowcases}=me;
 // Quietly hide items whose source was deleted (and restore any that came back) whenever the owner visits.
 useEffect(()=>{if(!loaded||!me.loaded||!showcases.length)return;const {missing,restored}=sourceStates(showcases,bundle);if(!missing.length&&!restored.length)return;
  Promise.all([markMissing(client,userId,missing,'missing'),markMissing(client,userId,restored,'ok')]).then(()=>setShowcases(showcases.map(s=>({...s,items:s.items.map(i=>missing.includes(i.id)?{...i,sourceState:'missing' as const}:restored.includes(i.id)?{...i,sourceState:'ok' as const}:i)}))),()=>{});
 },[loaded,me.loaded,bundle,showcases,client,userId,setShowcases]);
 useEffect(()=>{if(!me.identity)return;let cancelled=false;socialOverview(client).then(o=>{if(!cancelled)setRequests(o.incoming.length);},()=>{});return()=>{cancelled=true;};},[client,me.identity]);
 useEffect(()=>{if(!preview||!me.identity)return;let cancelled=false;readFriendView(client,me.identity.publicId).then(view=>{if(cancelled)return;if(!view){setFriendView('private');return;}setFriendView({creator:view.identity.creator,displayName:view.identity.displayName,username:view.identity.username,avatarId:view.identity.avatarId,tagline:view.profile.tagline,bio:view.profile.bio,bannerGradient:view.profile.bannerGradient,sections:(me.details?.sections??[]),badges:view.profile.badges,showcases:view.showcases.map(s=>({...s,items:s.items.map(i=>({id:i.id,display:i.display,note:i.note}))}))});},()=>setFriendView('private'));return()=>{cancelled=true;};},[preview,client,me.identity,me.details]);

 if(!me.loaded)return <main className="muse-page" aria-busy="true"><p className="small-label" role="status">Opening your little museum…</p></main>;
 if(me.error)return <main className="muse-page"><p className="field-error" role="alert">{me.error}</p><button type="button" className="muse-button muse-edge" onClick={me.reload}>Try again</button></main>;
 if(!me.identity||!me.details)return <ProfileSetup firstName={me.firstName} appTheme={appTheme} hasIdentity={!!me.identity} onCreate={async(username,displayName,avatarId,theme)=>{if(!me.identity){await createIdentity(client,username,displayName);await updateIdentity(client,userId,{avatarId});}await saveProfileDetails(client,userId,defaultProfile(theme));await me.reload();}}/>;

 const identity=me.identity,details=me.details;
 const data:ProfileViewData={creator:identity.creator,displayName:identity.displayName,username:identity.username,avatarId:identity.avatarId,tagline:details.tagline,bio:details.bio,bannerGradient:details.bannerGradient,sections:details.sections,badges:details.badges,showcases:showcases.map(s=>toView(s))};
 const move=async(id:string,by:number)=>{const list=[...showcases];const i=list.findIndex(s=>s.id===id),j=i+by;if(j<0||j>=list.length)return;[list[i],list[j]]=[list[j],list[i]];const next=list.map((s,position)=>({...s,position}));setShowcases(next);try{await reorderShowcases(client,userId,next.map(s=>s.id));}catch{setNotice('That order did not save. Please try again.');}};
 const toolbar=<>
  <Link className="muse-button muse-edge" href="/profile/showcases/new"><MuseIcon name="plus" size={16}/>New Showcase</Link>
  <Link className="muse-button muse-edge" href="/friends"><MuseIcon name="people" size={16}/>Friends{requests>0&&<span className="muse-profile-count" aria-label={`${requests} friend request${requests===1?'':'s'}`}>{requests}</span>}</Link>
  <button type="button" className="muse-button muse-edge" aria-pressed={preview} onClick={()=>{setPreview(v=>!v);setFriendView(null);}}>{preview?'Back to editing view':'Preview as a friend'}</button>
 </>;
 return <main className="muse-page muse-profile-page">
  <div className="muse-profile-status" role="status">
   <span className="muse-tone-pill" style={{'--tone':details.visibility==='friends'?'var(--accent-secondary)':'var(--text-muted)'} as CSSProperties}>{details.visibility==='friends'?'Shared with friends':'Private: only you can see it'}</span>
   {preview&&<span>You are seeing exactly what a friend would see.</span>}{notice&&<span className="field-error">{notice}</span>}
  </div>
  {preview?(friendView==='private'?<div className="muse-empty-state" data-variant="editorial"><MuseStar size={22}/><h2>Friends can’t see your profile yet</h2><p>It’s private. Choose “Share with friends” in Customize profile when you’re ready.</p><button type="button" className="muse-button muse-edge" onClick={()=>setPreview(false)}>Back to editing view</button></div>
   :friendView?<ProfileView data={friendView} toolbar={toolbar} emptyShowcases={<p className="muse-atelier-hint">No Showcases are shared with friends yet.</p>}/>:<p className="small-label" role="status">Looking through a friend’s eyes…</p>)
  :<ProfileView data={data} toolbar={toolbar} bannerAction={<Link className="muse-banner-action muse-edge" href="/profile/customize" aria-label="Customize profile" title="Customize profile"><MuseIcon name="wand" size={18}/><span>Customize</span></Link>} hiddenNote
    showcaseActions={id=>{const s=showcases.find(x=>x.id===id)!;const index=showcases.indexOf(s);return <span className="muse-showcase-owner">
     <span className="muse-tone-pill" title={visibilityLabels[s.visibility].detail}>{visibilityLabels[s.visibility].label}</span>
     <button type="button" className="muse-icon-button" aria-label={`Move ${s.title} up`} disabled={index===0} onClick={()=>move(id,-1)}>↑</button>
     <button type="button" className="muse-icon-button" aria-label={`Move ${s.title} down`} disabled={index===showcases.length-1} onClick={()=>move(id,1)}>↓</button>
     <Link className="muse-button muse-edge" href={`/profile/showcases/${id}`}>Edit</Link></span>;}}
    emptyShowcases={<FirstShowcase/>}/>}
 </main>;
}

/** The invitation shown before any Showcase exists. */
function FirstShowcase(){
 return <div className="muse-empty-state muse-profile-first" data-variant="editorial">
  <MuseStar size={26} prismatic/><h2>Create your first Showcase</h2><p>“A little collection of things that make you, you.”</p>
  <div className="muse-profile-starters">{starterIdeas.map(idea=><Link key={idea.id} className="muse-profile-starter muse-edge" href={`/profile/showcases/new?starter=${idea.id}`}><MuseIcon name={idea.icon} size={20} treatment="prismatic"/><strong>{idea.title}</strong><small>{idea.line}</small></Link>)}</div>
  <Link className="muse-button button-primary muse-edge" href="/profile/showcases/new">Start from scratch</Link>
 </div>;
}

function ProfileSetup({firstName,appTheme,hasIdentity,onCreate}:{firstName:string;appTheme:string;hasIdentity:boolean;onCreate:(username:string,displayName:string,avatarId:string,theme:string)=>Promise<void>}){
 const [displayName,setDisplayName]=useState(firstName||'');const [username,setUsername]=useState(suggestUsername(firstName));
 const [avatarId,setAvatarId]=useState(defaultAvatar);const [theme,setTheme]=useState(appTheme);
 const [remote,setRemote]=useState<{name:string;status:UsernameStatus}|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const client=useMemo(()=>createMuseBrowserClient(),[]);
 // Instant checks are derived; only the debounced database answer is stored.
 const local=hasIdentity?null:localUsernameStatus(username);
 useEffect(()=>{if(hasIdentity||local)return;const timer=setTimeout(()=>{usernameStatus(client,username).then(status=>setRemote({name:username,status}),()=>{});},350);return()=>clearTimeout(timer);},[username,client,hasIdentity,local]);
 const status=local??(remote?.name===username?remote.status:null);
 const ready=displayName.trim().length>0&&(hasIdentity||status==='available');
 return <main className="muse-page muse-profile-setup">
  <section className="muse-hero">
   <p className="muse-kicker">My Profile</p><h1 className="type-display">Your own little museum</h1>
   <p>A curated corner of Muse for the things that make you, you. It’s private until you choose to share it with friends, and nothing appears here unless you put it here.</p>
  </section>
  <form className="muse-panel muse-profile-setup-form" onSubmit={async event=>{event.preventDefault();if(!ready||busy)return;setBusy(true);setError('');try{await onCreate(username,displayName,avatarId,theme);}catch(cause){setError(cause instanceof Error&&/taken/.test(cause.message)?'Someone just took that username. Try another.':'That didn’t save. Please try again.');}finally{setBusy(false);}}}>
   <fieldset className="muse-profile-avatar-field"><legend className="editor-label">Pick your avatar</legend>
    <AvatarPicker value={avatarId} onChange={setAvatarId}/>
   </fieldset>
   <div className="muse-profile-setup-fields">
    <MuseAvatar id={avatarId} size={112} label="Your avatar"/>
    <label className="muse-field-label"><span className="small-label">Display name</span><input type="text" required maxLength={60} value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="What friends will call you"/></label>
    {!hasIdentity&&<label className="muse-field-label"><span className="small-label">Username</span><span className="muse-username-input"><span aria-hidden="true">@</span><input type="text" required maxLength={30} value={username} onChange={e=>setUsername(e.target.value.toLowerCase())} aria-describedby="username-status" autoCapitalize="none" spellCheck={false}/></span><small id="username-status" className={status==='available'?'muse-username-ok':status?'field-error':'muse-atelier-hint'} aria-live="polite">{status?usernameHint[status]:'Checking…'}</small></label>}
    <div className="muse-field-label"><span className="small-label">Profile theme</span><ThemeSelect label="Profile theme" value={theme} onChange={setTheme}/><small className="muse-atelier-hint">Visitors see this theme. Your own Muse keeps its theme.</small></div>
    {error&&<p className="field-error" role="alert">{error}</p>}
    <button type="submit" className="muse-button button-primary muse-edge" disabled={!ready||busy}>{busy?'Opening the doors…':'Create my profile'}</button>
   </div>
  </form>
 </main>;
}
