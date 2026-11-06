"use client";
import Link from 'next/link';
import {useCallback,useEffect,useMemo,useState,type ReactNode} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {readMyIdentity,searchPeople,socialOverview,sendRequest,acceptRequest,declineRequest,cancelRequest,removeFriend,blockPerson,unblockPerson,updateIdentity,type IdentityCard,type MyIdentity,type SocialOverview} from '@/lib/social/identity';
import {MuseIcon} from '../MuseIcon';
import {MuseSearch} from '../design/MuseSearch';
import {MuseSegmented} from '../design/MuseSegmented';
import {MuseEmptyState} from '../design/MuseEmptyState';
import {MusePageHeader} from '../MusePageHeader';
import {MuseAvatar} from '../profile/MuseAvatar';
import {useDailyData} from '../daily/DailyData';
import './Friends.css';

type Tab='friends'|'requests'|'find'|'blocked';
const empty:SocialOverview={friends:[],incoming:[],outgoing:[],blocked:[]};

/** Muse Social (#16): friends, requests, discovery and blocking. People appear only as name, username and avatar. */
export function Friends(){
 const {profile}=useDailyData();const client=useMemo(()=>createMuseBrowserClient(),[]);
 const [me,setMe]=useState<MyIdentity|null|undefined>(undefined);const [overview,setOverview]=useState<SocialOverview>(empty);
 const [tab,setTab]=useState<Tab>('friends');const [query,setQuery]=useState('');const [found,setFound]=useState<{query:string;list:IdentityCard[]}>({query:'',list:[]});
 const [busy,setBusy]=useState<string|null>(null);const [notice,setNotice]=useState('');const [confirm,setConfirm]=useState<{id:string;action:'remove'|'block'}|null>(null);
 const refresh=useCallback(async()=>{const [identity,next]=await Promise.all([readMyIdentity(client,profile.id),socialOverview(client).catch(()=>empty)]);setMe(identity);setOverview(next);},[client,profile.id]);
 useEffect(()=>{let cancelled=false;Promise.all([readMyIdentity(client,profile.id),socialOverview(client).catch(()=>empty)]).then(([identity,next])=>{if(cancelled)return;setMe(identity);setOverview(next);if(next.incoming.length)setTab('requests');},()=>{if(!cancelled)setMe(null);});return()=>{cancelled=true;};},[client,profile.id]);
 const term=query.trim(),searchable=term.replace(/^@/,'').length>=3;
 useEffect(()=>{if(!searchable)return;const t=setTimeout(()=>{searchPeople(client,term).then(list=>setFound({query:term,list}),()=>setFound({query:term,list:[]}));},300);return()=>clearTimeout(t);},[term,searchable,client]);
 const results=searchable&&found.query===term?found.list:[],searching=searchable&&found.query!==term;
 async function act(id:string,work:()=>Promise<void>,message:string){setBusy(id);setNotice('');try{await work();await refresh();if(searchable)setFound({query:term,list:await searchPeople(client,term)});setNotice(message);}catch{setNotice('That didn’t work. Please try again.');}finally{setBusy(null);setConfirm(null);}}
 if(me===undefined)return <main className="muse-page" aria-busy="true"><p className="small-label" role="status">Finding your people…</p></main>;
 if(me===null)return <main className="muse-page"><MusePageHeader title="Friends" description="Muse is private first. Friends are optional and always mutual."/><MuseEmptyState title="Create your profile first" headingLevel={2} action={<Link className="muse-button button-primary muse-edge" href="/profile">Create my profile</Link>}>Friends find you by your username, so you’ll pick one along with your avatar.</MuseEmptyState></main>;
 const card=(person:IdentityCard,actions:ReactNode,detail?:string)=><li key={person.id} className="muse-friend-card muse-panel" aria-busy={busy===person.id}>
  <MuseAvatar id={person.avatarId} size={56} decorative/>
  <span className="muse-friend-name"><strong>{person.displayName}</strong><small>@{person.username}{detail?` · ${detail}`:''}</small></span>
  <span className="muse-friend-actions">{confirm?.id===person.id?<><span className="small-label">{confirm.action==='block'?'Block? They won’t be able to find you or see anything you share.':'Remove this friend?'}</span><button type="button" className="muse-button muse-edge muse-atelier-danger" onClick={()=>act(person.id,()=>confirm.action==='block'?blockPerson(client,person.id):removeFriend(client,person.id),confirm.action==='block'?`Blocked ${person.displayName}.`:`Removed ${person.displayName}.`)}>{confirm.action==='block'?'Block':'Remove'}</button><button type="button" className="muse-button muse-edge" onClick={()=>setConfirm(null)}>Cancel</button></>:actions}</span>
 </li>;
 const requestCount=overview.incoming.length;
 return <main className="muse-page muse-friends">
  <MusePageHeader title="Friends" description="Muse is private first. Friends are mutual, and only see what you choose to share."/>
  <div className="muse-friends-bar"><Link className="muse-button muse-edge" href="/profile"><MuseIcon name="arrow" size={16}/>My profile</Link>
   <MuseSegmented label="Friends sections" value={tab} onChange={v=>{setTab(v);setNotice('');}} options={[{id:'friends',label:`Friends${overview.friends.length?` · ${overview.friends.length}`:''}`},{id:'requests',label:`Requests${requestCount?` · ${requestCount}`:''}`},{id:'find',label:'Find people'},{id:'blocked',label:'Blocked'}]}/></div>
  <p className="muse-friends-notice" aria-live="polite">{notice}</p>
  {tab==='friends'&&(overview.friends.length?<ul className="muse-friend-list">{overview.friends.map(p=>card(p,<><Link className="muse-button muse-edge" href={`/people/${p.username}`}>View profile</Link><button type="button" className="muse-button muse-edge" onClick={()=>setConfirm({id:p.id,action:'remove'})}>Remove</button><button type="button" className="muse-button muse-edge" onClick={()=>setConfirm({id:p.id,action:'block'})}>Block</button></>))}</ul>
   :<MuseEmptyState title="Your circle is waiting" headingLevel={2} action={<button type="button" className="muse-button button-primary muse-edge" onClick={()=>setTab('find')}>Find people</button>}>Add someone by their username. Friendships are always mutual.</MuseEmptyState>)}
  {tab==='requests'&&<div className="muse-friend-requests">
   <section aria-labelledby="incoming"><h2 id="incoming" className="muse-kicker">Waiting for you</h2>{overview.incoming.length?<ul className="muse-friend-list">{overview.incoming.map(p=>card(p,<><button type="button" className="muse-button button-primary muse-edge" onClick={()=>act(p.id,()=>acceptRequest(client,p.id).then(()=>undefined),`You and ${p.displayName} are friends now.`)}>Accept</button><button type="button" className="muse-button muse-edge" onClick={()=>act(p.id,()=>declineRequest(client,p.id),'Request declined.')}>Decline</button><button type="button" className="muse-button muse-edge" onClick={()=>setConfirm({id:p.id,action:'block'})}>Block</button></>))}</ul>:<p className="muse-atelier-hint">No requests right now.</p>}</section>
   <section aria-labelledby="outgoing"><h2 id="outgoing" className="muse-kicker">You asked</h2>{overview.outgoing.length?<ul className="muse-friend-list">{overview.outgoing.map(p=>card(p,<button type="button" className="muse-button muse-edge" onClick={()=>act(p.id,()=>cancelRequest(client,p.id),'Request cancelled.')}>Cancel request</button>,'pending'))}</ul>:<p className="muse-atelier-hint">Nothing pending.</p>}</section>
  </div>}
  {tab==='find'&&<section className="muse-friend-find">
   <MuseSearch label="Find people by username" value={query} onChange={setQuery} placeholder="@username" count={query.trim().length>=3?results.length:undefined} noun={['person','people']}/>
   <p className="muse-atelier-hint">Only people who chose to be findable appear, and only by username. There is no directory.</p>
   {searching?<p className="small-label" role="status">Looking…</p>:query.trim().replace(/^@/,'').length>=3&&!results.length?<p className="muse-atelier-hint">Nobody findable by that username.</p>:<ul className="muse-friend-list">{results.map(p=>card(p,p.relationship==='friends'?<span className="muse-tone-pill">Friends</span>:p.relationship==='outgoing'?<span className="muse-tone-pill">Requested</span>:p.relationship==='incoming'?<button type="button" className="muse-button button-primary muse-edge" onClick={()=>act(p.id,()=>acceptRequest(client,p.id).then(()=>undefined),`You and ${p.displayName} are friends now.`)}>Accept request</button>:<button type="button" className="muse-button button-primary muse-edge" onClick={()=>act(p.id,()=>sendRequest(client,p.id),`Request sent to ${p.displayName}.`)}><MuseIcon name="plus" size={14}/>Add friend</button>))}</ul>}
  </section>}
  {tab==='blocked'&&(overview.blocked.length?<ul className="muse-friend-list">{overview.blocked.map(p=>card(p,<button type="button" className="muse-button muse-edge" onClick={()=>act(p.id,()=>unblockPerson(client,p.id),`Unblocked ${p.displayName}.`)}>Unblock</button>))}</ul>:<p className="muse-atelier-hint">You haven’t blocked anyone.</p>)}
  <section className="muse-panel muse-friend-settings" aria-labelledby="social-settings"><h2 id="social-settings" className="muse-kicker">Your social settings</h2>
   <label className="muse-atelier-check"><input type="checkbox" checked={me.discoverable} onChange={e=>act('settings',()=>updateIdentity(client,profile.id,{discoverable:e.target.checked}),e.target.checked?'People can now find you by your username.':'You are no longer findable. Existing friends stay.')}/>Let people find me by my username (@{me.username})</label>
   <label className="muse-atelier-check"><input type="checkbox" checked={me.participation==='paused'} onChange={e=>act('settings',()=>updateIdentity(client,profile.id,{participation:e.target.checked?'paused':'active'}),e.target.checked?'Social is paused. Friends can’t see your profile until you resume.':'Welcome back. Your friends can see what you share again.')}/>Pause social for now (friends stay, but see nothing)</label>
  </section>
 </main>;
}
