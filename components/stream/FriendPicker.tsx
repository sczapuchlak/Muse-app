"use client";
import Link from 'next/link';
import {MuseAvatar} from '../profile/MuseAvatar';
import {useStreamEnv} from './StreamContext';

/** An explicit list of current friends for a Selected friends audience. New friends are never added later. */
export function FriendPicker({value,onChange}:{value:string[];onChange:(ids:string[])=>void}){
 const {friends}=useStreamEnv();
 if(!friends.length)return <p className="small-label">You don’t have friends in Muse yet. <Link href="/friends">Find people</Link></p>;
 return <fieldset className="muse-stream-friends"><legend className="small-label">Choose friends ({value.length} selected)</legend>
  <ul>{friends.map(f=>{const on=value.includes(f.id);return <li key={f.id}><label data-on={on||undefined}>
   <input type="checkbox" checked={on} onChange={e=>onChange(e.target.checked?[...value,f.id]:value.filter(x=>x!==f.id))}/>
   <MuseAvatar id={f.avatarId} size={28} decorative/><span>{f.displayName}<small>@{f.username}</small></span></label></li>;})}</ul>
 </fieldset>;
}
