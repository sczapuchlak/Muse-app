'use client';
export const logoutSignal='muse.auth.logout';
export const sessionExitReleased='muse.auth.exit-released';
let deletionPending=false;
export function isAccountDeletionPending(){return deletionPending;}
/** Let the confirmed destructive response own its final navigation, without hiding failed drafts. */
export function holdAccountDeletionExit(){
  deletionPending=true;let released=false;
  return ()=>{if(released)return;released=true;deletionPending=false;window.dispatchEvent(new Event(sessionExitReleased));};
}
/** Only ephemeral signals leave this tab. Full navigation disposes private providers/router memory. */
export function endBrowserSession(notice:'signed-out'|'signed-out-local'|'account-deleted'|'session-expired'){
  try{localStorage.setItem(logoutSignal,crypto.randomUUID());localStorage.removeItem(logoutSignal);}catch{}
  try{const channel=new BroadcastChannel(logoutSignal);channel.postMessage(notice);channel.close();}catch{}
  window.location.replace(`/login?notice=${notice}`);
}
