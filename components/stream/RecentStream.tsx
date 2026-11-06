"use client";
import Link from 'next/link';
import {useEffect,useState} from 'react';
import type {StreamPost} from '@/lib/stream/model';
import {readFeed} from '@/lib/stream/persistence';
import {StreamEnvContext} from './StreamContext';
import {StreamPostCard} from './StreamPostCard';
import {useStreamEnvironment} from './Stream';
import './Stream.css';

/** A friend's latest Stream posts on their profile: the same audience rules as the feed, nothing extra. */
export function RecentStream({authorId,name}:{authorId:string;name:string}){
 const {env}=useStreamEnvironment();const [posts,setPosts]=useState<StreamPost[]>([]);
 useEffect(()=>{if(!env||env.me.participation==='paused')return;let cancelled=false;readFeed(env.client,{author:authorId,limit:3}).then(p=>{if(!cancelled)setPosts(p);},()=>{});return()=>{cancelled=true;};},[env,authorId]);
 if(!env||!posts.length)return null;
 return <StreamEnvContext.Provider value={env}><section className="muse-stream-recent" aria-label={`Recently in Stream from ${name}`}>
  <h2 className="muse-kicker">Recently in Stream</h2>
  <ol className="muse-stream-feed">{posts.map(p=><li key={p.id}><StreamPostCard post={p} headingLevel={3} onChange={next=>setPosts(list=>list.map(x=>x.id===next.id?next:x))}/></li>)}</ol>
  <Link className="text-button" href="/stream">Open Stream</Link>
 </section></StreamEnvContext.Provider>;
}
