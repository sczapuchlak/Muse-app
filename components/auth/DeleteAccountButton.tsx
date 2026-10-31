'use client';
import {useState,useEffect,useRef,type FormEvent} from 'react';
import {MuseDrawer} from '../MuseDrawer';
import {endBrowserSession,holdAccountDeletionExit} from '@/lib/auth/client-session';
export function DeleteAccountButton(){
  const [open,setOpen]=useState(false),[confirmation,setConfirmation]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState('');
  const releaseExit=useRef<(()=>void)|null>(null);
  useEffect(()=>()=>releaseExit.current?.(),[]);
  const [anchor,setAnchor]=useState<HTMLButtonElement|null>(null);
  async function submit(event:FormEvent){
    event.preventDefault();if(pending||confirmation!=='DELETE')return;setPending(true);setError('');releaseExit.current=holdAccountDeletionExit();
    try{
      const response=await fetch('/api/account/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmation})});
      if(response.status===401){endBrowserSession('session-expired');return;}
      const result=await response.json();
      if(!response.ok||result.ok!==true||result.notice!=='account-deleted')throw Error(result.error||'Account deletion was not confirmed. Retry or reload to check your session.');
      endBrowserSession('account-deleted');
    }catch(reason){releaseExit.current?.();releaseExit.current=null;setError(reason instanceof Error?reason.message:'Account deletion was not confirmed. Retry or reload to check your session.');setPending(false);}
  }
  return <><p className="card-description">Permanently delete your account and all saved Muse records. Export your data first if you want to keep a copy.</p><button type="button" className="muse-button" onClick={event=>{setAnchor(event.currentTarget);setConfirmation('');setError('');setOpen(true);}}>Delete account</button>{open&&<MuseDrawer title="Delete your account" returnFocus={anchor} onClose={()=>{if(!pending)setOpen(false);}}><form className="muse-settings-fields" onSubmit={submit} aria-busy={pending}><p className="card-description">This permanently deletes your account, daily entries, emotional check-ins, Planner, Notes, Wellness, Rituals and Money records. This cannot be undone.</p><p className="small-label">Unsaved drafts will also be lost. Retained backups are managed separately under the deployment’s retention policy.</p><label className="editor-label">Type DELETE to confirm<input autoComplete="off" autoCapitalize="off" spellCheck={false} value={confirmation} disabled={pending} onChange={event=>setConfirmation(event.target.value)} aria-describedby="account-deletion-warning"/></label><p id="account-deletion-warning" className="small-label">Only your currently signed-in account will be deleted.</p>{error&&<p role="alert" className="field-error">{error}</p>}<div className="editor-actions"><button type="submit" className="muse-button" disabled={pending||confirmation!=='DELETE'}>{pending?'Deleting account…':'Permanently delete my account'}</button><button type="button" className="muse-button button-ghost" disabled={pending} onClick={()=>setOpen(false)}>Cancel</button></div></form></MuseDrawer>}</>;
}
