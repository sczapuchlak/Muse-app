/**
 * An unconfirmed reading-timer change kept on this device only (for example, a pause tapped while offline).
 * It is never treated as saved: the server timer stays the source of truth. On reconnect the exact same command
 * (same id, same payload, same expected revision) is retried, so the server either applies it once or reports
 * that it already did; it can never add a second segment.
 */
import type {ReadingTimer} from './books';

export type PendingTimerCommand={key:string;id:string;payload:Omit<ReadingTimer,'revision'|'updatedAt'>|null;revision:number;recordedAt:string};
const storageKey=(userId:string)=>`muse.reading.pending-timer.${userId}`;

export function loadPendingTimer(userId:string):PendingTimerCommand|null{
 try{const raw=localStorage.getItem(storageKey(userId));if(!raw)return null;const value=JSON.parse(raw) as PendingTimerCommand;
  return value&&typeof value.key==='string'&&typeof value.id==='string'&&typeof value.revision==='number'?value:null;}catch{return null;}
}
export function storePendingTimer(userId:string,command:PendingTimerCommand){try{localStorage.setItem(storageKey(userId),JSON.stringify(command));}catch{/* Memory copy still protects this tab. */}}
export function clearPendingTimer(userId:string){try{localStorage.removeItem(storageKey(userId));}catch{}}

/** Server rejections carry a Postgres/PostgREST code; network failures do not and may be retried later. */
export function isRetryableTimerError(error:unknown){
 if(typeof navigator!=='undefined'&&navigator.onLine===false)return true;
 if(!error||typeof error!=='object')return true;
 const e=error as {code?:unknown;name?:unknown;message?:unknown};
 if(typeof e.code==='string'&&e.code.length>0)return false;
 return e.name==='TypeError'||e.name==='AuthRetryableFetchError'||/fetch|network|load failed|timed out/i.test(String(e.message??''));
}

/**
 * What to do with a stored command once the server timer is known.
 * retry: the server is still at the revision the command expected.
 * done: the server moved exactly one revision on for this same session, so the command most likely landed.
 * stale: the session changed elsewhere; the device copy must not overwrite it.
 */
export function reconcilePendingTimer(pending:PendingTimerCommand,server:ReadingTimer|null):'retry'|'done'|'stale'{
 const sessionId=pending.payload?.sessionId;
 if(!server)return pending.revision===0&&pending.payload?'retry':pending.payload===null?'done':'stale';
 if(sessionId&&server.sessionId!==sessionId)return 'stale';
 if(server.revision===pending.revision)return 'retry';
 if(server.revision===pending.revision+1&&pending.payload&&server.phase===pending.payload.phase)return 'done';
 return 'stale';
}
