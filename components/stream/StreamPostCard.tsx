"use client";
import Link from 'next/link';
import {useState,type ReactNode} from 'react';
import {activityVerb,audienceOptions,BODY_MAX,cardTone,decorationById,decorations,fullTime,relativeTime,reportReasons,shortcutById,type StreamAudience,type StreamPost} from '@/lib/stream/model';
import {deletePost,editPost,friendlyError,reactTo,reportPost} from '@/lib/stream/persistence';
import {MuseAvatar} from '../profile/MuseAvatar';
import {ItemCard} from '../profile/ShowcaseView';
import {MuseIcon} from '../MuseIcon';
import {MuseSegmented} from '../design/MuseSegmented';
import {StreamReaction} from './StreamReaction';
import {StreamComments} from './StreamComments';
import {FriendPicker} from './FriendPicker';
import {useStreamEnv} from './StreamContext';
import '../profile/Profile.css';

/** The words of a post, hidden behind a deliberate reveal when the author marked spoilers. */
function Spoiler({active,children}:{active:boolean;children:ReactNode}){
 const [shown,setShown]=useState(false);
 if(!active||shown)return <>{children}</>;
 return <div className="muse-stream-spoiler"><p>Spoilers inside.</p><button type="button" className="muse-button muse-edge" onClick={()=>setShown(true)}><MuseIcon name="sparkle" size={14}/>Reveal spoiler</button></div>;
}

/**
 * One cohesive card for every post, presented for its context: literary (reading, watching), mystical (dreams and
 * Whimsy), celebratory (milestones), feeling (moods) or the classic status. `preview` renders the exact card friends
 * will see, without actions.
 */
export function StreamPostCard({post,onChange,onRemove,preview=false,headingLevel=2}:{post:StreamPost;onChange?:(next:StreamPost)=>void;onRemove?:(id:string)=>void;preview?:boolean;headingLevel?:2|3}){
 const {client}=useStreamEnv();
 const [commentsOpen,setCommentsOpen]=useState(false);const [commentCount,setCommentCount]=useState(post.commentCount);
 const [menu,setMenu]=useState(false);const [editing,setEditing]=useState(false);const [confirmDelete,setConfirmDelete]=useState(false);
 const [reporting,setReporting]=useState(false);const [notice,setNotice]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const tone=cardTone(post),decoration=decorationById(post.decoration),display=post.display,Heading=`h${headingLevel}` as 'h2'|'h3';
 const name=post.mine?'You':post.author.displayName,shortcut=shortcutById(post.category);
 const headline=post.kind==='status'?<><strong>{post.author.displayName}</strong> is…</>
  :<><strong>{post.author.displayName}</strong> {activityVerb(post.category,display)} {display?<em>{display.title}</em>:<em>something</em>}</>;
 async function react(on:boolean){try{const next=await reactTo(client,post.id,on);onChange?.(next);return true;}catch(e){setError(friendlyError(e,'That reaction didn’t land. Try again.'));return false;}}
 async function patch(changes:Partial<{body:string;decoration:string|null;spoiler:boolean;audience:StreamAudience;members:string[]|null;commentsEnabled:boolean}>,message:string){
  setBusy(true);setError('');setNotice('');
  try{const next=await editPost(client,post.id,{body:post.body,decoration:post.decoration,spoiler:post.spoiler,...changes});onChange?.(next);setNotice(message);setEditing(false);setMenu(false);}
  catch(e){setError(friendlyError(e,'That change didn’t save.'));}finally{setBusy(false);}}
 async function remove(){setBusy(true);setError('');try{await deletePost(client,post.id);onRemove?.(post.id);}catch(e){setError(friendlyError(e,'That post couldn’t be deleted.'));setBusy(false);}}
 async function report(reason:string){try{await reportPost(client,post.id,reason);setNotice('Thanks for telling us. The Muse team will take a look.');}catch(e){setError(friendlyError(e,'That report didn’t send.'));}setReporting(false);setMenu(false);}

 return <article className="muse-stream-post" data-tone={tone} data-spoiler={post.spoiler||undefined} aria-labelledby={`post-${post.id}`}>
  <header className="muse-stream-post-head">
   {post.mine?<MuseAvatar id={post.author.avatarId} size={44} decorative creator={post.author.creator}/>:<Link href={`/people/${post.author.username}`} aria-label={`${post.author.displayName}’s profile`} tabIndex={preview?-1:undefined}><MuseAvatar id={post.author.avatarId} size={44} decorative creator={post.author.creator}/></Link>}
   <div className="muse-stream-post-who">
    <Heading id={`post-${post.id}`} className="muse-stream-headline">{headline}</Heading>
    <p className="muse-stream-post-meta">
     {!post.mine&&<Link href={`/people/${post.author.username}`} tabIndex={preview?-1:undefined}>@{post.author.username}</Link>}
     <time dateTime={post.createdAt} title={fullTime(post.createdAt)}>{relativeTime(post.createdAt)}</time>
     {post.editedAt&&<span>edited</span>}
     {post.mine&&post.audience&&<span className="muse-stream-audience" data-audience={post.audience}><MuseIcon name={post.audience==='private'?'focus':'people'} size={12}/>{audienceOptions.find(a=>a.id===post.audience)?.label}{post.audience==='selected'&&post.members?` · ${post.members.length}`:''}</span>}
     {shortcut&&<span className="muse-stream-kind"><MuseIcon name={shortcut.icon} size={12}/>{shortcut.label}</span>}
    </p>
   </div>
   {!preview&&<div className="muse-stream-options">
    <button type="button" className="muse-icon-button" aria-label="Post options" aria-expanded={menu} onClick={()=>{setMenu(v=>!v);setConfirmDelete(false);setReporting(false);}}><MuseIcon name="more" size={18}/></button>
    {menu&&<div className="muse-stream-menu muse-panel" role="group" aria-label="Post options">
     {post.mine?<>
      <button type="button" onClick={()=>{setEditing(true);setMenu(false);}}><MuseIcon name="edit" size={14}/>Edit post</button>
      <button type="button" disabled={busy} onClick={()=>patch({commentsEnabled:!post.commentsEnabled},post.commentsEnabled?'Comments are off for this post.':'Comments are on again.')}><MuseIcon name="notes" size={14}/>{post.commentsEnabled?'Turn comments off':'Turn comments on'}</button>
      {post.audience!=='private'&&<button type="button" disabled={busy} onClick={()=>patch({audience:'private'},'Unpublished. Only you can see it now.')}><MuseIcon name="focus" size={14}/>Unpublish to Only me</button>}
      {confirmDelete?<div className="muse-stream-confirm"><p className="small-label">Delete this post? Its reactions and comments go too. {post.kind==='activity'?'The record it came from stays safe in Muse.':''}</p><button type="button" className="muse-button muse-edge" disabled={busy} onClick={remove}>Delete post</button><button type="button" className="text-button" onClick={()=>setConfirmDelete(false)}>Keep it</button></div>
       :<button type="button" onClick={()=>setConfirmDelete(true)}><MuseIcon name="trash" size={14}/>Delete…</button>}
     </>:<>
      <Link href={`/people/${post.author.username}`}><MuseIcon name="people" size={14}/>View profile</Link>
      {reporting?<div className="muse-stream-confirm"><p className="small-label">What’s wrong with this post?</p>{reportReasons.map(r=><button key={r.id} type="button" onClick={()=>report(r.id)}>{r.label}</button>)}<button type="button" className="text-button" onClick={()=>setReporting(false)}>Cancel</button></div>
       :<button type="button" onClick={()=>setReporting(true)}><MuseIcon name="info" size={14}/>Report…</button>}
      <Link href="/friends"><MuseIcon name="close" size={14}/>Block or remove in Friends</Link>
     </>}
    </div>}
   </div>}
  </header>

  {editing?<EditPost post={post} busy={busy} onCancel={()=>setEditing(false)} onSave={changes=>patch(changes,'Saved.')}/>:<>
   {decoration&&<p className="muse-stream-decoration"><span aria-hidden="true">{decoration.emoji}</span>{decoration.label}</p>}
   {post.sourceMissing&&post.mine&&<p className="muse-accent-note">The record this post shared was removed, so friends no longer see it. You can delete the post.</p>}
   {post.kind==='status'?<Spoiler active={post.spoiler}><p className="muse-stream-status-text">{post.body}</p></Spoiler>:<>
    {display&&<div className="muse-stream-activity">
     <ItemCard item={{id:post.id,display:{...display,...(post.spoiler?{progress:undefined}:{})}}} variant={display.image?'feature':'card'}/>
     {display.excerpt&&<Spoiler active={post.spoiler}><blockquote className="muse-stream-excerpt">{display.excerpt}</blockquote></Spoiler>}
    </div>}
    {post.body&&<Spoiler active={post.spoiler}><p className="muse-stream-commentary">{post.body}</p></Spoiler>}
   </>}
  </>}

  {!preview&&!editing&&<footer className="muse-stream-actions">
   <StreamReaction kind={post.primaryReaction} count={post.reactionCount} reacted={post.reacted} onToggle={react}/>
   <button type="button" className="muse-stream-comment-toggle muse-edge" aria-expanded={commentsOpen} onClick={()=>setCommentsOpen(v=>!v)}>
    <MuseIcon name="notes" size={16}/>{post.commentsEnabled||commentCount?'Comment':'Comments off'}{commentCount>0&&<span className="muse-stream-count">{commentCount}</span>}
   </button>
  </footer>}
  {commentsOpen&&!preview&&<StreamComments postId={post.id} enabled={post.commentsEnabled} isAuthor={post.mine} onCount={setCommentCount}/>}
  {(error||notice)&&<p className={error?'field-error':'small-label muse-stream-notice'} role={error?'alert':'status'}>{error||notice}</p>}
  {preview&&<p className="sr-only">{name} preview</p>}
 </article>;
}

function EditPost({post,busy,onCancel,onSave}:{post:StreamPost;busy:boolean;onCancel:()=>void;onSave:(c:{body:string;decoration:string|null;spoiler:boolean;audience:StreamAudience;members:string[]|null;commentsEnabled:boolean})=>void}){
 const [body,setBody]=useState(post.body);const [decoration,setDecoration]=useState(post.decoration);const [spoiler,setSpoiler]=useState(post.spoiler);
 const [audience,setAudience]=useState<StreamAudience>(post.audience??'private');const [members,setMembers]=useState<string[]>((post.members??[]).map(m=>m.id));const [comments,setComments]=useState(post.commentsEnabled);
 const invalid=(post.kind==='status'&&!body.trim())||(audience==='selected'&&!members.length);
 return <form className="muse-stream-edit" onSubmit={e=>{e.preventDefault();if(!invalid)onSave({body,decoration,spoiler,audience,members:audience==='selected'?members:null,commentsEnabled:comments});}}>
  <label className="muse-field-label"><span className="small-label">{post.kind==='status'?`${post.author.displayName} is…`:'Your words'}</span><textarea rows={3} maxLength={BODY_MAX} value={body} onChange={e=>setBody(e.target.value)}/></label>
  {post.kind==='status'&&<div className="muse-chip-row" role="group" aria-label="Flourish">{decorations.map(d=><button key={d.id} type="button" aria-pressed={decoration===d.id} onClick={()=>setDecoration(decoration===d.id?null:d.id)}><span aria-hidden="true">{d.emoji}</span>{d.label}</button>)}</div>}
  <MuseSegmented label="Who can see it" value={audience} options={audienceOptions.map(a=>({id:a.id,label:a.label}))} onChange={setAudience}/>
  {audience==='selected'&&<FriendPicker value={members} onChange={setMembers}/>}
  <label className="muse-atelier-check"><input type="checkbox" checked={spoiler} onChange={e=>setSpoiler(e.target.checked)}/>Contains spoilers</label>
  <label className="muse-atelier-check"><input type="checkbox" checked={comments} onChange={e=>setComments(e.target.checked)}/>Allow comments</label>
  <p className="small-label">The shared snapshot stays exactly as you published it.</p>
  <div className="muse-stream-row"><button type="submit" className="muse-button button-primary muse-edge" disabled={busy||invalid}>{busy?'Saving…':'Save changes'}</button><button type="button" className="text-button" onClick={onCancel}>Cancel</button></div>
 </form>;
}
