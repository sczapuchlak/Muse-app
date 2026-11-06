/**
 * The Muse sound palette (#34): a few original, synthesized chimes. No audio files, no dependencies.
 *
 * - Plays only when the person has turned Sound effects on (lib/sound-preference), only when an action asks for it
 *   (never on page load), and only after the action succeeded: callers play from their success path.
 * - Never overlaps: a more important sound interrupts a lesser one; a lesser one waits its turn by being skipped.
 * - Browsers that block audio until a gesture are handled by resuming the context on first use; if audio is
 *   unavailable the call is a silent no-op. Sound never carries meaning on its own.
 * - Reusable by any module (Stream reactions included) through `playSound`.
 */
import {readSound} from './sound-preference';

export type MuseSound='confirm'|'complete'|'reveal'|'seal'|'celebrate'|'book';
type Note={f:number;at:number;len:number;gain?:number;partial?:number};
const priority:Record<MuseSound,number>={confirm:1,complete:2,reveal:2,seal:2,celebrate:3,book:4};
// Frequencies in Hz; times in seconds. Soft bells: a fundamental plus a quiet inharmonic partial.
const C5=523.25,D5=587.33,E5=659.25,G5=783.99,A5=880,C6=1046.5,E6=1318.5,G6=1568,A4=440,E4=329.63;
const palette:Record<MuseSound,Note[]>={
 confirm:[{f:E6,at:0,len:.12,gain:.5},{f:A5*2,at:.05,len:.16,gain:.35}],
 complete:[{f:C5,at:0,len:.5},{f:E5,at:.07,len:.5},{f:G5,at:.14,len:.6,gain:.9}],
 reveal:[{f:A4,at:0,len:.9,gain:.55,partial:1.5},{f:E5,at:.12,len:.8,gain:.4,partial:1.5},{f:C6,at:.3,len:.7,gain:.22}],
 seal:[{f:E4,at:0,len:.18,gain:.8,partial:2},{f:G5,at:.1,len:.5,gain:.6},{f:C6,at:.18,len:.55,gain:.4}],
 celebrate:[{f:C5,at:0,len:.45},{f:D5,at:.08,len:.45},{f:E5,at:.16,len:.45},{f:G5,at:.24,len:.5},{f:A5,at:.32,len:.55},{f:C6,at:.42,len:.8,gain:.8},{f:E6,at:.5,len:.7,gain:.25}],
 book:[{f:G5,at:0,len:.6},{f:E5,at:.16,len:.6},{f:C5,at:.32,len:.8},{f:C6,at:.62,len:1.1,gain:.75},{f:G6,at:.7,len:1,gain:.3},{f:E6,at:.82,len:.9,gain:.25}],
};
const duration=(name:MuseSound)=>Math.max(...palette[name].map(n=>n.at+n.len));

let context:AudioContext|null=null;let bus:GainNode|null=null;
let current:{name:MuseSound;until:number;out:GainNode}|null=null;let lastAt=0;let lastName:MuseSound|null=null;
function ensure(){
 if(typeof window==='undefined')return null;
 const Ctor=window.AudioContext??(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!Ctor)return null;
 if(!context){context=new Ctor();const compressor=context.createDynamicsCompressor();bus=context.createGain();bus.gain.value=.16;bus.connect(compressor).connect(context.destination);}
 if(context.state==='suspended')void context.resume().catch(()=>{});
 return context;
}

/** Play one palette sound if the person allows it. Returns whether it played. */
export function playSound(name:MuseSound):boolean{
 if(!readSound())return false;
 let ctx:AudioContext|null;try{ctx=ensure();}catch{return false;}if(!ctx||!bus)return false;
 const now=ctx.currentTime;
 if(lastName===name&&now-lastAt<.12)return false; // rapid repeats collapse into one
 if(current&&now<current.until){
  if(priority[name]<=priority[current.name])return false; // never overlap: lesser sounds wait their turn
  const out=current.out;out.gain.cancelScheduledValues(now);out.gain.setTargetAtTime(0,now,.03); // a bigger moment gently takes over
 }
 const out=ctx.createGain();out.connect(bus);
 for(const note of palette[name]){
  const start=now+note.at,peak=(note.gain??.7);
  for(const [ratio,level] of [[1,1],[note.partial??2.76,.18]] as const){
   const osc=ctx.createOscillator(),env=ctx.createGain();osc.type=ratio===1?'sine':'triangle';osc.frequency.value=note.f*ratio;
   env.gain.setValueAtTime(0,start);env.gain.linearRampToValueAtTime(peak*level,start+.012);env.gain.exponentialRampToValueAtTime(.0001,start+note.len);
   osc.connect(env).connect(out);osc.start(start);osc.stop(start+note.len+.05);
  }
 }
 current={name,until:now+duration(name),out};lastAt=now;lastName=name;
 return true;
}
/** For tests and settings previews: how long a palette sound lasts, in seconds. */
export const soundDuration=duration;
export const soundNames=Object.keys(palette) as MuseSound[];
