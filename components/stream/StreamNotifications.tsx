"use client";
import Link from 'next/link';
import {useCallback,useContext,useEffect,useRef,useState} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {fullTime,reactions,relativeTime,type StreamNotification,type StreamPreferences} from '@/lib/stream/model';
import {markNotificationsRead,readNotifications,readStreamPreferences,saveStreamPreferences} from '@/lib/stream/persistence';
import {publishStreamNavigation} from '@/lib/stream/navigation-preference';
import {GlassPopover} from '../GlassPopover';
import {MuseIcon} from '../MuseIcon';
import {MuseAvatar} from '../profile/MuseAvatar';
import {StreamEnvContext,useStreamEnv} from './StreamContext';

const describe=(n:StreamNotification)=>n.kind==='reaction'?`${reactions[n.reaction??'react'].verb} your post`:n.kind==='comment'?'commented on your post':n.kind==='friend-request'?'sent you a friend request':'accepted your friend request';
const href=(n:StreamNotification)=>n.postId?`/stream?post=${n.postId}`:'/friends';

/** In-app notifications only. The list is rechecked by the database every time it opens. */
export function StreamNotifications(){
 const {client}=useStreamEnv();const anchor=useRef<HTMLButtonElement>(null);
 const [open,setOpen]=useState(false);const [list,setList]=useState<StreamNotification[]|null>(null);
 const load=useCallback(()=>readNotifications(client).then(setList,()=>setList([])),[client]);
 useEffect(()=>{void load();},[load]);
 const unread=(list??[]).filter(n=>!n.read).length;
 async function toggle(){const next=!open;setOpen(next);if(next){await load();if(unread)await markNotificationsRead(client).catch(()=>{});}}
 return <>
  <button ref={anchor} type="button" className="muse-button muse-edge muse-stream-bell" aria-expanded={open} aria-controls="stream-notifications" onClick={toggle} aria-label={`Notifications${unread?`, ${unread} new`:''}`}>
   <MuseIcon name="favorite" size={16}/>Notifications{unread>0&&<span className="muse-stream-count">{unread}</span>}
  </button>
  <GlassPopover id="stream-notifications" label="Notifications" open={open} anchorRef={anchor} onClose={()=>{setOpen(false);setList(l=>l?.map(n=>({...n,read:true}))??l);}} width={360} align="end">
   {list===null?<p className="small-label" role="status">Checking…</p>:list.length===0?<p className="small-label">All quiet. Reactions, comments and friend requests will appear here.</p>:
    <ol className="muse-stream-notes">{list.map(n=><li key={n.id} data-unread={!n.read||undefined}><Link href={href(n)} onClick={()=>setOpen(false)}>
     <MuseAvatar id={n.actor.avatarId} size={32} decorative/>
     <span><strong>{n.actor.displayName}</strong> {describe(n)}{n.excerpt&&<small>“{n.excerpt}”</small>}<time dateTime={n.createdAt} title={fullTime(n.createdAt)}>{relativeTime(n.createdAt)}</time></span></Link></li>)}</ol>}
  </GlassPopover>
 </>;
}

/** Stream settings: navigation visibility and notification categories. Separate from posts and from participation. */
export function StreamSettings({compact=false}:{compact?:boolean}){
 const env=useContext(StreamEnvContext);const clientRef=useRef(env?.client??null);const [prefs,setPrefs]=useState<StreamPreferences|null>(null);const [saved,setSaved]=useState('');
 // The client is created only in the browser (never while rendering), so Settings also renders where Supabase is absent.
 useEffect(()=>{try{clientRef.current??=createMuseBrowserClient();}catch{return;}readStreamPreferences(clientRef.current).then(setPrefs,()=>{});},[]);
 if(!prefs)return null;
 async function set(patch:Partial<StreamPreferences>){const next={...prefs!,...patch};setPrefs(next);setSaved('');
  try{const result=await saveStreamPreferences(clientRef.current!,next);setPrefs(result);publishStreamNavigation(result.showInNavigation);setSaved('Saved.');}catch{setSaved('That didn’t save.');}}
 const box=(key:keyof StreamPreferences,label:string)=><label key={key} className="muse-atelier-check"><input type="checkbox" checked={prefs[key]} onChange={e=>set({[key]:e.target.checked})}/>{label}</label>;
 return <section className={compact?'muse-stream-settings':'muse-stream-settings muse-panel'} aria-label="Stream settings">
  {!compact&&<h2 className="muse-kicker">Stream settings</h2>}
  {box('showInNavigation','Show Stream in my navigation')}
  <p className="small-label">Hiding Stream only tidies your navigation. Your posts stay published to whoever you chose, and your friends stay friends. To stop sharing, unpublish posts; to step away from social features, pause participation in Friends.</p>
  <p className="small-label">Notify me in Muse about</p>
  {box('reactions','Reactions to my posts')}{box('comments','Comments on my posts')}{box('friendRequests','Friend requests')}{box('friendAccepted','Accepted friend requests')}
  <p className="small-label" role="status">{saved||'In-app only. No emails, no push, no streaks.'}</p>
 </section>;
}
