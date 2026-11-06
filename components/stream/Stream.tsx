"use client";
import Link from 'next/link';
import {useSearchParams,useRouter} from 'next/navigation';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {readMyIdentity,socialOverview,type IdentityCard,type MyIdentity} from '@/lib/social/identity';
import {feedFilters,shortcuts,type StreamCategory,type StreamPost,type StreamSourceKind} from '@/lib/stream/model';
import {streamAdapters} from '@/lib/stream/adapters';
import {readFeed,readPost} from '@/lib/stream/persistence';
import {MusePageHeader} from '../MusePageHeader';
import {MuseEmptyState} from '../design/MuseEmptyState';
import {MuseIcon} from '../MuseIcon';
import {MuseStar} from '../MuseStar';
import {useDailyData} from '../daily/DailyData';
import {StreamEnvContext,type StreamEnv} from './StreamContext';
import {StreamComposer,type ShareSource} from './StreamComposer';
import {StreamPostCard} from './StreamPostCard';
import {StreamNotifications,StreamSettings} from './StreamNotifications';
import './Stream.css';

const PAGE=20;
/** `?share=<kind>:<id>` (from Share to Stream links) opens the composer on that saved record. */
function parseShare(value:string|null):ShareSource|undefined{
 if(!value)return undefined;const [kind,id]=value.split(':');
 return kind in streamAdapters&&id&&/^[A-Za-z0-9_-]{1,200}$/.test(id)?{kind:kind as StreamSourceKind,id}:undefined;
}

/** Hook up the signed-in person's identity and friends, the shared environment every Stream piece uses. */
export function useStreamEnvironment(){
 const {profile}=useDailyData();const client=useMemo(()=>createMuseBrowserClient(),[]);
 const [me,setMe]=useState<MyIdentity|null|undefined>(undefined);const [friends,setFriends]=useState<IdentityCard[]>([]);
 useEffect(()=>{let cancelled=false;Promise.all([readMyIdentity(client,profile.id),socialOverview(client).then(o=>o.friends,()=>[])]).then(([identity,list])=>{if(!cancelled){setMe(identity);setFriends(list);}},()=>{if(!cancelled)setMe(null);});return()=>{cancelled=true;};},[client,profile.id]);
 const env=useMemo<StreamEnv|null>(()=>me?{client,me,friends}:null,[client,me,friends]);
 return {me,env};
}

/** Stream of Consciousness (#27): a chronological, friends-first feed. Optional, private by default, never ranked. */
export function Stream(){
 const {me,env}=useStreamEnvironment();const search=useSearchParams();const router=useRouter();
 const share=parseShare(search.get('share'));const focusId=search.get('post');
 const [filter,setFilter]=useState<string|null>(null);const [posts,setPosts]=useState<StreamPost[]|null>(null);
 const [more,setMore]=useState(false);const [loadingMore,setLoadingMore]=useState(false);const [error,setError]=useState('');
 const [focus,setFocus]=useState<StreamPost|'gone'|undefined>(undefined);const [showSettings,setShowSettings]=useState(false);const [writing,setWriting]=useState(false);
 const load=useCallback(async(next:string|null)=>{if(!env)return;setError('');
  try{const page=await readFeed(env.client,{category:next,limit:PAGE});setPosts(page);setMore(page.length===PAGE);}catch{setPosts([]);setError('Stream couldn’t load. Please try again.');}},[env]);
 useEffect(()=>{if(!env)return;let cancelled=false;readFeed(env.client,{category:filter,limit:PAGE}).then(page=>{if(!cancelled){setPosts(page);setMore(page.length===PAGE);}},()=>{if(!cancelled){setPosts([]);setError('Stream couldn’t load. Please try again.');}});return()=>{cancelled=true;};},[env,filter]);
 useEffect(()=>{if(!env||!focusId)return;let cancelled=false;readPost(env.client,focusId).then(p=>{if(!cancelled)setFocus(p??'gone');},()=>{if(!cancelled)setFocus('gone');});return()=>{cancelled=true;};},[env,focusId]);
 async function older(){if(!env||!posts?.length)return;setLoadingMore(true);try{const page=await readFeed(env.client,{category:filter,before:posts[posts.length-1],limit:PAGE});setPosts([...posts,...page]);setMore(page.length===PAGE);}finally{setLoadingMore(false);}}
 const replace=(next:StreamPost)=>{setPosts(list=>list?.map(p=>p.id===next.id?next:p)??list);if(focus&&focus!=='gone'&&focus.id===next.id)setFocus(next);};
 const removed=(id:string)=>{setPosts(list=>list?.filter(p=>p.id!==id)??list);if(focus&&focus!=='gone'&&focus.id===id)setFocus('gone');};

 if(me===undefined)return <main className="muse-page" aria-busy="true"><p className="small-label" role="status">Tuning into the stream…</p></main>;
 if(me===null||!env)return <main className="muse-page muse-stream">
  <MusePageHeader title="Stream of Consciousness" description="A little window into your friends’ universes. Optional, private first, never a performance."/>
  <MuseEmptyState title="Stream starts with your profile" headingLevel={2} glyph={<MuseStar size={22}/>} action={<Link className="muse-button button-primary muse-edge" href="/profile">Create my profile</Link>}>Stream is entirely optional. Create a profile to share little moments with friends you choose. Everything else in Muse stays exactly as private as it is now.</MuseEmptyState>
 </main>;
 if(me.participation==='paused')return <main className="muse-page muse-stream">
  <MusePageHeader title="Stream of Consciousness" description="A little window into your friends’ universes."/>
  <MuseEmptyState title="Social features are paused" headingLevel={2} action={<Link className="muse-button muse-edge" href="/friends">Open Friends</Link>}>You paused participation, so Stream is resting. Resume in Friends whenever you like; your posts and friendships are waiting.</MuseEmptyState>
 </main>;

 return <StreamEnvContext.Provider value={env}><main className="muse-page muse-stream">
  <MusePageHeader title="Stream of Consciousness" description="A little window into your friends’ universes. Chronological, private first, never a performance.">
   <div className="muse-stream-header-actions"><StreamNotifications/>
    <button type="button" className="muse-button muse-edge" aria-expanded={showSettings} onClick={()=>setShowSettings(v=>!v)}><MuseIcon name="gear" size={16}/>Settings</button></div>
  </MusePageHeader>
  {showSettings&&<StreamSettings/>}

  {focusId&&focus!==undefined&&<section className="muse-stream-focus" aria-label="Post from your notifications">
   {focus==='gone'?<p className="muse-accent-note">That post isn’t available anymore. It may have been unpublished, deleted, or shared with a different audience.</p>
    :<StreamPostCard post={focus} onChange={replace} onRemove={removed}/>}
   <button type="button" className="text-button" onClick={()=>{setFocus(undefined);router.replace('/stream',{scroll:false});}}>Back to the whole stream</button>
  </section>}

  <StreamComposer key={share?`${share.kind}:${share.id}`:'composer'} initial={share} autoFocus={writing} onPublished={post=>{setPosts(list=>[post,...(list??[]).filter(p=>p.id!==post.id)]);if(share)router.replace('/stream',{scroll:false});}}/>

  <div className="muse-chip-row muse-stream-filters" role="group" aria-label="Show">{feedFilters.map(f=><button key={f.id??'all'} type="button" aria-pressed={filter===f.id} onClick={()=>{setFilter(f.id);setPosts(null);}}>{f.label}</button>)}</div>

  {error&&<p className="field-error" role="alert">{error} <button type="button" className="text-button" onClick={()=>load(filter)}>Retry</button></p>}
  {posts===null?<p className="small-label" role="status">Listening for little moments…</p>:posts.length===0?
   <MuseEmptyState title="Quiet in the universe today" headingLevel={2} glyph={<MuseStar size={22}/>} action={<div className="muse-stream-row">
     <button type="button" className="muse-button button-primary muse-edge" onClick={()=>{setWriting(true);window.scrollTo({top:0,behavior:'smooth'});}}>Write a status</button>
     <Link className="muse-button muse-edge" href="/friends">Find your friends</Link>
     <Link className="muse-button muse-edge" href={shortcuts[0].home.href}>Visit your {shortcuts[0].home.label}</Link></div>}>
    {filter?'Nothing here under this filter yet.':env.friends.length?'Nobody has shared anything with you yet. Share a little moment and it might start a conversation.':'Stream shows posts from friends you choose. Add a friend, or write something just for you.'}
   </MuseEmptyState>:
   <ol className="muse-stream-feed">{posts.map(p=><li key={p.id}><StreamPostCard post={p} onChange={replace} onRemove={removed}/></li>)}</ol>}
  {posts&&more&&<button type="button" className="muse-button muse-edge muse-stream-older" disabled={loadingMore} onClick={older}>{loadingMore?'Loading…':'Show earlier moments'}</button>}
  {posts&&posts.length>0&&!more&&<p className="small-label muse-stream-end"><MuseStar size={12}/> You’re all caught up.</p>}
 </main></StreamEnvContext.Provider>;
}

export type {StreamCategory};
