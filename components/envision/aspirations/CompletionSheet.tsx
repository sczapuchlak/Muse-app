'use client';
import {useMemo,useState} from 'react';
import {MuseModal} from '@/components/MuseModal';
import {MuseStar} from '@/components/MuseStar';
import type {Aspiration,Completion} from '@/lib/aspirations/models';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {uploadBoardImage,removeBoardImages} from '@/lib/data/constellation-images';
import {BucketPhoto} from '../bucket/BucketViews';

const prompts:{key:keyof Completion;label:string}[]=[
 {key:'meaningful',label:'What made this moment meaningful?'},
 {key:'learned',label:'What did you learn about yourself?'},
 {key:'feels',label:'How does it feel to have done this?'},
];

/**
 * After an aspiration is achieved (already saved, never blocked by this form): optional words, the real date if it
 * happened earlier, and an optional keepsake photo, stored privately like the cover.
 */
export function CompletionSheet({a,today,busy,error,onSave,onClose}:{a:Aspiration;today:string;busy:boolean;error:string;onSave:(a:Aspiration)=>Promise<Aspiration|null>;onClose:()=>void}){
 const [words,setWords]=useState<Completion>(a.completion??{}),[on,setOn]=useState(a.completedOn??today);
 const [photoBusy,setPhotoBusy]=useState(false),[photoError,setPhotoError]=useState(''),client=useMemo(()=>createMuseBrowserClient(),[]);
 async function keepsake(file:File|null){setPhotoBusy(true);setPhotoError('');
  try{let image=null;if(file){const auth=await client.auth.getUser();if(auth.error||!auth.data.user)throw Error('Sign in to add a keepsake.');image=await uploadBoardImage(auth.data.user.id,a.id,file,{allowJpeg:true});}
   const saved=await onSave({...a,keepsake:image});if(!saved)throw Error('The keepsake was not saved. Please retry.');
   if(a.keepsake&&a.keepsake.path!==image?.path){try{await removeBoardImages([a.keepsake]);}catch{setPhotoError('Saved, but the previous photo could not be removed from storage.');}}}
  catch(e){setPhotoError(e instanceof Error?e.message:'The keepsake could not be saved.');}
  setPhotoBusy(false);}
 return <MuseModal id="aspiration-achieved" label={`${a.title} achieved`} returnFocus={null} onClose={onClose}>
  <form className="muse-lifeatlas-achieved" onSubmit={e=>{e.preventDefault();void onSave({...a,completion:words,completedOn:on&&on<=today?on:a.completedOn}).then(s=>{if(s)onClose();});}}>
   <div className="muse-lifeatlas-achieved-burst" aria-hidden="true"><MuseStar size={34} prismatic/><span/><span/><span/></div>
   <p className="muse-kicker">Achieved</p>
   <h2>{a.title}</h2>
   <p className="muse-lifeatlas-achieved-lede">You did this. It stays in your Atlas as part of your story. If you’d like, keep a few words with it.</p>
   {prompts.map(p=><label key={p.key}><span>{p.label}</span><textarea rows={2} maxLength={2000} value={words[p.key]??''} onChange={e=>setWords(w=>({...w,[p.key]:e.target.value}))}/></label>)}
   <div className="muse-lifeatlas-achieved-row">
    <label><span>Achieved on</span><input type="date" value={on} max={today} onChange={e=>setOn(e.target.value)}/></label>
    <div className="muse-lifeatlas-achieved-photo"><span>A keepsake <small className="small-label">· optional photo</small></span>
     {a.keepsake&&<BucketPhoto image={a.keepsake} className="muse-lifeatlas-keepsake-photo"/>}
     <span className="muse-lifeatlas-achieved-photo-actions"><label className="text-button">{a.keepsake?'Change photo':'Add a photo'}<input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy||photoBusy} onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void keepsake(f);}}/></label>
      {a.keepsake&&<button type="button" className="text-button" disabled={busy||photoBusy} onClick={()=>void keepsake(null)}>Remove</button>}</span>
     {photoBusy&&<p className="small-label" role="status">Saving your keepsake…</p>}{photoError&&<p role="alert" className="muse-aspiration-error">{photoError}</p>}</div>
   </div>
   {error&&<p role="alert" className="muse-aspiration-error">{error}</p>}
   <div className="muse-aspiration-actions"><button type="submit" className="muse-button button-primary" disabled={busy}>Keep these words</button><button type="button" className="text-button" onClick={onClose}>Maybe later</button></div>
  </form>
 </MuseModal>;
}
