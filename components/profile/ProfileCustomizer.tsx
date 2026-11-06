"use client";
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useState,type CSSProperties} from 'react';
import {themes,type ThemeId} from '@/lib/themes';
import {useThemeOverride} from '@/lib/theme-override';
import {changeUsername,updateIdentity,usernameStatus,usernameHint,localUsernameStatus,type UsernameStatus} from '@/lib/social/identity';
import {saveProfileDetails} from '@/lib/profile/persistence';
import {sectionLabels,type ProfileDetails} from '@/lib/profile/model';
import {profileBadges,badgeCategories,MAX_BADGES,normalizeBadges} from '@/lib/profile/badges';
import {AvatarPicker} from './AvatarPicker';
import {offeredGradients,familyLabels,gradientCss,type GradientFamily} from '@/lib/profile/gradients';
import {MuseIcon} from '../MuseIcon';
import {ProfileView} from './ProfileView';
import {useMyProfile} from './useMyProfile';
import './Profile.css';

/** Profile customisation with a live preview in the chosen profile theme. Saves only when asked. */
export function ProfileCustomizer(){
 const me=useMyProfile();const router=useRouter();
 const [draft,setDraft]=useState<ProfileDetails|null>(null);const [name,setName]=useState('');const [avatarId,setAvatarId]=useState('');const [username,setUsername]=useState('');
 const [remote,setRemote]=useState<{name:string;status:UsernameStatus}|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [saved,setSaved]=useState('');
 const loaded=me.loaded&&!!me.details&&!!me.identity;
 if(loaded&&!draft){setDraft(me.details);setName(me.identity!.displayName);setAvatarId(me.identity!.avatarId);setUsername(me.identity!.username);}
 useThemeOverride(draft?.theme??me.details?.theme??null);
 useEffect(()=>{if(me.loaded&&(!me.identity||!me.details))router.replace('/profile');},[me.loaded,me.identity,me.details,router]);
 const usernameChanged=!!me.identity&&username!==me.identity.username;
 const local=usernameChanged?localUsernameStatus(username):null;
 useEffect(()=>{if(!usernameChanged||local)return;const t=setTimeout(()=>usernameStatus(me.client,username).then(status=>setRemote({name:username,status}),()=>{}),350);return()=>clearTimeout(t);},[username,usernameChanged,local,me.client]);
 const status=local??(remote?.name===username?remote.status:null);
 if(!draft||!me.identity)return <main className="muse-page" aria-busy="true"><p className="small-label" role="status">Laying out your fabrics…</p></main>;
 const set=(patch:Partial<ProfileDetails>)=>{setDraft({...draft,...patch});setSaved('');};
 const dirty=JSON.stringify(draft)!==JSON.stringify(me.details)||name!==me.identity.displayName||avatarId!==me.identity.avatarId||usernameChanged;
 const canSave=dirty&&name.trim().length>0&&(!usernameChanged||status==='available');
 async function save(){if(!canSave||busy)return;setBusy(true);setError('');try{
  await saveProfileDetails(me.client,me.userId,{...draft!,badges:normalizeBadges(draft!.badges)});
  if(name!==me.identity!.displayName||avatarId!==me.identity!.avatarId)await updateIdentity(me.client,me.userId,{displayName:name,avatarId});
  if(usernameChanged)await changeUsername(me.client,username);
  await me.reload();setSaved('Saved. Your profile is updated.');}catch(cause){setError(cause instanceof Error&&/taken|reserved|invalid/.test(cause.message)?'That username isn’t available. Try another.':'That didn’t save. Please try again.');}finally{setBusy(false);}}
 const sections=draft.sections,moveSection=(i:number,by:number)=>{const list=[...sections];let j=i+by;while(list[j]?.id==='badges')j+=by;if(j<0||j>=list.length)return;[list[i],list[j]]=[list[j],list[i]];set({sections:list});};
 const families=Object.keys(familyLabels) as GradientFamily[];
 const chosen=normalizeBadges(draft.badges);
 return <main className="muse-page muse-customizer">
  <header className="muse-customizer-bar">
   <Link className="muse-button muse-edge" href="/profile"><MuseIcon name="arrow" size={16}/>My profile</Link>
   <h1 className="type-heading">Customize profile</h1>
   <span className="muse-customizer-state" aria-live="polite">{saved||(dirty?'Unsaved changes':'')}</span>
   <button type="button" className="muse-button button-primary muse-edge" disabled={!canSave||busy} onClick={save}>{busy?'Saving…':'Save profile'}</button>
  </header>
  {error&&<p className="field-error" role="alert">{error}</p>}
  <div className="muse-customizer-layout">
   <div className="muse-customizer-controls">
    <section className="muse-panel"><h2 className="muse-kicker">Your portrait</h2>
     <AvatarPicker value={avatarId} size={58} onChange={id=>{setAvatarId(id);setSaved('');}}/>
    </section>
    <section className="muse-panel muse-customizer-fields"><h2 className="muse-kicker">Name and words</h2>
     <label className="muse-field-label"><span className="small-label">Display name</span><input type="text" maxLength={60} value={name} onChange={e=>{setName(e.target.value);setSaved('');}}/></label>
     <label className="muse-field-label"><span className="small-label">Username</span><span className="muse-username-input"><span aria-hidden="true">@</span><input type="text" maxLength={30} value={username} autoCapitalize="none" spellCheck={false} aria-describedby="username-hint" onChange={e=>{setUsername(e.target.value.toLowerCase());setSaved('');}}/></span><small id="username-hint" className={!usernameChanged?'muse-atelier-hint':status==='available'?'muse-username-ok':status?'field-error':'muse-atelier-hint'} aria-live="polite">{!usernameChanged?'Friends find you by this. Changing it keeps your friendships.':status?usernameHint[status]:'Checking…'}</small></label>
     <label className="muse-field-label"><span className="small-label">Tagline</span><input type="text" maxLength={120} value={draft.tagline} placeholder="Collector of small wonders" onChange={e=>set({tagline:e.target.value})}/></label>
     <label className="muse-field-label"><span className="small-label">About me</span><textarea rows={4} maxLength={600} value={draft.bio} placeholder="A few lines for your friends." onChange={e=>set({bio:e.target.value})}/><small className="muse-atelier-hint">{draft.bio.length}/600</small></label>
    </section>
    <section className="muse-panel"><h2 className="muse-kicker">Profile theme</h2><p className="muse-atelier-hint">Friends see your profile in this theme; your own Muse keeps its theme.</p>
     <div className="muse-customizer-themes" role="radiogroup" aria-label="Profile theme">{themes.map(t=><button key={t.id} type="button" role="radio" aria-checked={draft.theme===t.id} onClick={()=>set({theme:t.id as ThemeId})}><span className="muse-customizer-orb" style={{background:t.preview}} aria-hidden="true"/><span>{t.name}</span></button>)}</div>
    </section>
    <section className="muse-panel"><h2 className="muse-kicker">Banner</h2>
     <div className="muse-gradient-gallery" role="radiogroup" aria-label="Banner gradient">{families.map(f=><div key={f} className="muse-gradient-family"><p className="small-label">{familyLabels[f]}</p><div>{offeredGradients.filter(g=>g.family===f).map(g=><button key={g.id} type="button" role="radio" aria-checked={draft.bannerGradient===g.id} aria-label={g.name} title={g.name} style={{'--swatch':gradientCss(g.id)} as CSSProperties} onClick={()=>set({bannerGradient:g.id})}/>)}</div></div>)}</div>
    </section>
    <section className="muse-panel"><h2 className="muse-kicker">Badges</h2><p className="muse-atelier-hint">Pick up to {MAX_BADGES} that are painfully, specifically you. They sit beside your name, and they’re decorative: never earned or tracked. <span aria-live="polite">{chosen.length}/{MAX_BADGES} chosen.</span></p>
     <div className="muse-badge-picker">{badgeCategories.map(c=><fieldset key={c.id} className="muse-badge-category" style={{'--badge':c.accent} as CSSProperties}><legend>{c.label}</legend><div className="muse-badge-list">{profileBadges.filter(b=>b.category===c.id).map(b=>{const on=chosen.includes(b.id);return <button key={b.id} type="button" className="muse-badge" aria-pressed={on} disabled={!on&&chosen.length>=MAX_BADGES} onClick={()=>set({badges:on?chosen.filter(x=>x!==b.id):[...chosen,b.id]})}><MuseIcon name={b.icon} size={14}/>{b.label}{on&&<MuseIcon name="check" size={13}/>}</button>;})}</div></fieldset>)}</div>
    </section>
    <section className="muse-panel"><h2 className="muse-kicker">Arrangement</h2>
     <ol className="muse-customizer-sections">{sections.map((s,i)=>s.id==='badges'?null:<li key={s.id}><span>{sectionLabels[s.id]}</span>
      <button type="button" className="muse-icon-button" aria-label={`Move ${sectionLabels[s.id]} up`} disabled={i===sections.findIndex(x=>x.id!=='badges')} onClick={()=>moveSection(i,-1)}>↑</button>
      <button type="button" className="muse-icon-button" aria-label={`Move ${sectionLabels[s.id]} down`} disabled={i===sections.findLastIndex(x=>x.id!=='badges')} onClick={()=>moveSection(i,1)}>↓</button>
      <label className="muse-atelier-check"><input type="checkbox" checked={!s.hidden} onChange={e=>set({sections:sections.map(x=>x.id===s.id?{...x,hidden:!e.target.checked}:x)})}/>Show</label></li>)}</ol>
     <label className="muse-atelier-check"><input type="checkbox" checked={!sections.find(x=>x.id==='badges')?.hidden} onChange={e=>set({sections:sections.map(x=>x.id==='badges'?{...x,hidden:!e.target.checked}:x)})}/>Show my badges beside my name</label>
    </section>
    <section className="muse-panel"><h2 className="muse-kicker">Sharing</h2>
     <div className="muse-segmented" role="group" aria-label="Who can see your profile"><button type="button" aria-pressed={draft.visibility==='private'} onClick={()=>set({visibility:'private'})}>Only me</button><button type="button" aria-pressed={draft.visibility==='friends'} onClick={()=>set({visibility:'friends'})}>Share with friends</button></div>
     <p className="muse-atelier-hint">{draft.visibility==='friends'?'Friends see your profile and the Showcases you mark for friends. Drafts and private Showcases stay with you.':'Nobody else can see your profile. Your Showcases stay private too.'} Muse never has a public directory.</p>
    </section>
   </div>
   <div className="muse-customizer-preview" aria-label="Live preview"><p className="small-label">Live preview · how friends will see it</p>
    <ProfileView data={{displayName:name||'Your name',username,avatarId,tagline:draft.tagline,bio:draft.bio,bannerGradient:draft.bannerGradient,sections:draft.sections,badges:draft.badges,showcases:me.showcases.filter(s=>s.visibility==='friends').map(s=>({id:s.id,title:s.title,description:s.description,icon:s.icon,gradient:s.gradient,layout:s.layout,items:s.items.filter(i=>i.sourceState==='ok').map(i=>({id:i.id,display:i.display,note:i.note}))}))}}
     emptyShowcases={<p className="muse-atelier-hint">Showcases you share with friends appear here.</p>}/>
   </div>
  </div>
 </main>;
}
