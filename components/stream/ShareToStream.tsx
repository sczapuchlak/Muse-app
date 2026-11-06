"use client";
import Link from 'next/link';
import {useRef,useState} from 'react';
import type {StreamCategory,StreamSourceKind} from '@/lib/stream/model';
import {MuseIcon} from '../MuseIcon';
import {StreamEnvContext} from './StreamContext';
import {StreamComposer} from './StreamComposer';
import {useStreamEnvironment} from './Stream';
import './Stream.css';

function ShareDialogBody({kind,id,category,onDone}:{kind:StreamSourceKind;id:string;category?:StreamCategory;onDone:(message:string)=>void}){
 const {me,env}=useStreamEnvironment();
 if(me===undefined)return <p className="small-label" role="status">Opening Stream…</p>;
 if(!env)return <p className="small-label">Sharing to Stream starts with a profile. <Link href="/profile">Create my profile</Link></p>;
 return <StreamEnvContext.Provider value={env}><StreamComposer initial={{kind,id,category}} autoFocus onCancel={()=>onDone('')}
  onPublished={post=>onDone(post.audience==='private'?'Saved to Stream, just for you.':'Shared to Stream.')}/></StreamEnvContext.Provider>;
}

/**
 * Optional "Share to Stream" for a record that is already saved privately. Opens the composer over the current page,
 * so the person never loses their place; nothing is shared until they choose details, audience, preview and publish.
 */
export function ShareToStream({kind,id,category,label='Share to Stream',className='muse-button muse-edge'}:{kind:StreamSourceKind;id:string;category?:StreamCategory;label?:string;className?:string}){
 const dialog=useRef<HTMLDialogElement>(null);const [open,setOpen]=useState(false);const [notice,setNotice]=useState('');
 const close=(message:string)=>{dialog.current?.close();setOpen(false);setNotice(message);};
 return <>
  <button type="button" className={className} onClick={()=>{setNotice('');setOpen(true);requestAnimationFrame(()=>dialog.current?.showModal());}}><MuseIcon name="sparkle" size={15}/>{label}</button>
  {notice&&<span className="small-label" role="status">{notice} <Link href="/stream">Open Stream</Link></span>}
  <dialog ref={dialog} className="muse-stream-dialog" aria-label="Share to Stream" onClose={()=>setOpen(false)} onCancel={()=>setOpen(false)}>
   <div className="muse-stream-dialog-head"><h2 className="type-heading">Share to Stream</h2><button type="button" className="muse-icon-button" aria-label="Close" onClick={()=>close('')}><MuseIcon name="close" size={18}/></button></div>
   {open&&<ShareDialogBody kind={kind} id={id} category={category} onDone={close}/>}
  </dialog>
 </>;
}
