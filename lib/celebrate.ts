/**
 * The celebration orchestrator (#34). Modules ask for a moment here, from their success path, instead of building
 * their own animation logic. One moment shows at a time (a second waits briefly); each `key` celebrates once per
 * device and session, so rerenders, remounts, retries and reopened records never replay it. Visuals follow Muse
 * Magic and reduced motion; the message is always announced, so feedback never depends on animation; sound follows
 * its own preference.
 */
import {allowsMagic,readMagic} from './magic-preference';
import {playSound,type MuseSound} from './muse-sound';
import {motion} from './motion';

export type CelebrationKind='book'|'constellation'|'starburst';
export type CelebrationRequest={kind:CelebrationKind;message:string;detail?:string;stars?:number;cover?:string|null;tier?:'small'|'medium'|'large';sound?:MuseSound;key?:string};
export type Celebration=CelebrationRequest&{id:number;visual:boolean;duration:number};

let active:Celebration|null=null;let queued:Celebration|null=null;let announcement='';let sequence=0;let timer:ReturnType<typeof setTimeout>|null=null;
const listeners=new Set<()=>void>();const seen=new Set<string>();
const emit=()=>listeners.forEach(l=>l());
export const subscribeCelebrations=(l:()=>void)=>{listeners.add(l);return()=>{listeners.delete(l);};};
export const readCelebration=()=>active;export const readAnnouncement=()=>announcement;

function already(key:string){if(seen.has(key))return true;try{const all=JSON.parse(window.sessionStorage.getItem('muse.celebrated')??'[]') as string[];if(all.includes(key)){seen.add(key);return true;}
 window.sessionStorage.setItem('muse.celebrated',JSON.stringify([...all.slice(-80),key]));}catch{/* memory only */}seen.add(key);return false;}
function lengthFor(r:CelebrationRequest){const extra=readMagic()==='extra'?1.2:1;
 return Math.round((r.kind==='book'?motion.scene:r.kind==='constellation'?(r.tier==='large'?motion.scene:motion.milestone):motion.milestone*.7)*extra);}
function show(next:Celebration){active=next;announcement=next.message;emit();if(timer)clearTimeout(timer);timer=setTimeout(dismissCelebration,next.duration);}

/** Ask for a moment. Call only after the action has been saved successfully. Returns false when skipped as a repeat. */
export function celebrate(request:CelebrationRequest):boolean{
 if(typeof window==='undefined')return false;
 if(request.key&&already(request.key))return false;
 if(request.sound)playSound(request.sound);
 const next:Celebration={...request,id:++sequence,visual:allowsMagic(),duration:lengthFor(request)};
 if(!next.visual){announcement=next.message;emit();return true;} // essential feedback without motion
 if(active){queued=next;return true;}
 show(next);return true;
}
/** Skip or finish the current moment (Escape, the Skip button, or its own timer). */
export function dismissCelebration(){if(timer){clearTimeout(timer);timer=null;}active=null;emit();if(queued){const next=queued;queued=null;setTimeout(()=>show(next),120);}}
/** Tests and sign-out: forget everything. */
export function resetCelebrations(){active=null;queued=null;announcement='';seen.clear();if(timer)clearTimeout(timer);timer=null;emit();}
