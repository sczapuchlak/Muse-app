"use client";
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {addComment,deleteComment,editComment,friendlyError,readComments,reportPost} from '@/lib/stream/persistence';
import {COMMENT_MAX,fullTime,relativeTime,reportReasons,type StreamComment} from '@/lib/stream/model';
import {MuseAvatar} from '../profile/MuseAvatar';
import {useStreamEnv} from './StreamContext';

/** Simple chronological comments (no threads). Authors of a post can remove any comment on it. */
export function StreamComments({postId,enabled,isAuthor,onCount}:{postId:string;enabled:boolean;isAuthor:boolean;onCount:(n:number)=>void}){
 const {client}=useStreamEnv();
 const [list,setList]=useState<StreamComment[]|null>(null);const [draft,setDraft]=useState('');const [pendingId,setPendingId]=useState(()=>crypto.randomUUID());
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [editing,setEditing]=useState<{id:string;body:string}|null>(null);
 const [confirm,setConfirm]=useState<string|null>(null);const [reporting,setReporting]=useState<string|null>(null);const [notice,setNotice]=useState('');
 useEffect(()=>{let cancelled=false;readComments(client,postId).then(l=>{if(!cancelled)setList(l);},e=>{if(!cancelled){setList([]);setError(friendlyError(e,'Comments couldn’t load.'));}});return()=>{cancelled=true;};},[client,postId]);
 const update=(next:StreamComment[])=>{setList(next);onCount(next.length);};
 async function send(){const body=draft.trim();if(!body||busy)return;setBusy(true);setError('');
  try{const c=await addComment(client,postId,pendingId,body);update([...(list??[]).filter(x=>x.id!==c.id),c]);setDraft('');setPendingId(crypto.randomUUID());}
  catch(e){setError(friendlyError(e,'That comment didn’t post. Your words are still here.'));}finally{setBusy(false);}}
 async function saveEdit(){if(!editing||!editing.body.trim())return;setBusy(true);setError('');
  try{const c=await editComment(client,editing.id,editing.body.trim());update((list??[]).map(x=>x.id===c.id?c:x));setEditing(null);}catch(e){setError(friendlyError(e,'That edit didn’t save.'));}finally{setBusy(false);}}
 async function remove(id:string){setBusy(true);setError('');try{await deleteComment(client,id);update((list??[]).filter(x=>x.id!==id));setConfirm(null);}catch(e){setError(friendlyError(e,'That comment couldn’t be removed.'));}finally{setBusy(false);}}
 async function report(id:string,reason:string){try{await reportPost(client,postId,reason,'',id);setNotice('Thanks. The Muse team will take a look.');}catch(e){setError(friendlyError(e,'That report didn’t send.'));}setReporting(null);}
 return <section className="muse-stream-comments" aria-label="Comments">
  {list===null?<p className="small-label" role="status">Gathering the conversation…</p>:list.length===0?<p className="small-label">{enabled?'No comments yet. Say something kind.':'Comments are off for this post.'}</p>:
  <ol>{list.map(c=><li key={c.id}>
   <MuseAvatar id={c.author.avatarId} size={30} decorative/>
   <div className="muse-stream-comment-body">
    <p className="muse-stream-comment-meta">{c.mine?<strong>You</strong>:<Link href={`/people/${c.author.username}`}><strong>{c.author.displayName}</strong></Link>} <time dateTime={c.createdAt} title={fullTime(c.createdAt)}>{relativeTime(c.createdAt)}</time>{c.editedAt&&<span> · edited</span>}</p>
    {editing?.id===c.id?<div className="muse-stream-inline-edit"><textarea rows={2} maxLength={COMMENT_MAX} value={editing.body} aria-label="Edit your comment" onChange={e=>setEditing({id:c.id,body:e.target.value})}/><div className="muse-stream-row"><button type="button" className="muse-button button-primary muse-edge" disabled={busy} onClick={saveEdit}>Save</button><button type="button" className="text-button" onClick={()=>setEditing(null)}>Cancel</button></div></div>
     :<p className="muse-stream-comment-text">{c.body}</p>}
    {editing?.id!==c.id&&<div className="muse-stream-comment-actions">
     {c.mine&&<button type="button" className="text-button" onClick={()=>setEditing({id:c.id,body:c.body})}>Edit</button>}
     {c.canRemove&&(confirm===c.id?<><span className="small-label">Remove this comment?</span><button type="button" className="text-button" disabled={busy} onClick={()=>remove(c.id)}>Remove</button><button type="button" className="text-button" onClick={()=>setConfirm(null)}>Keep</button></>
      :<button type="button" className="text-button" onClick={()=>setConfirm(c.id)}>{c.mine?'Delete':'Remove'}</button>)}
     {!c.mine&&(reporting===c.id?<span className="muse-stream-report">{reportReasons.map(r=><button key={r.id} type="button" className="text-button" onClick={()=>report(c.id,r.id)}>{r.label}</button>)}<button type="button" className="text-button" onClick={()=>setReporting(null)}>Cancel</button></span>
      :<button type="button" className="text-button" onClick={()=>setReporting(c.id)}>Report</button>)}
    </div>}
   </div>
  </li>)}</ol>}
  {enabled&&<form className="muse-stream-comment-form" onSubmit={e=>{e.preventDefault();void send();}}>
   <label className="sr-only" htmlFor={`comment-${postId}`}>Add a comment</label>
   <textarea id={`comment-${postId}`} rows={1} maxLength={COMMENT_MAX} value={draft} placeholder={isAuthor?'Reply to your friends…':'Add a kind word…'} onChange={e=>setDraft(e.target.value)}
    onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();void send();}}}/>
   <button type="submit" className="muse-button muse-edge" disabled={busy||!draft.trim()}>{busy?'Sending…':'Comment'}</button>
  </form>}
  {(error||notice)&&<p className={error?'field-error':'small-label'} role={error?'alert':'status'}>{error||notice}</p>}
 </section>;
}
