"use client";
import {useState,type CSSProperties} from 'react';
import {reactions,type ReactionId} from '@/lib/stream/model';

/** Particles per reaction: each reaction has its own small, one-shot gesture. */
const burst:Record<ReactionId,string[]>={
 react:['✦','✧','✦','✧'],
 love:['💗','💕','💗'],
 joy:['🌼','✿','🌼','✿','🌼','✿'],
 cheer:['〰','〰','〰'],
 celebrate:['▮','●','▲','▮','●','▲','▮','●'],
};

/**
 * The post's one primary reaction. The animation plays once, only after the database confirms the reaction, and
 * only when the viewer's Muse Magic and reduced-motion settings allow (CSS gates it; Quiet or reduced motion = none).
 */
export function StreamReaction({kind,count,reacted,disabled,onToggle}:{kind:ReactionId;count:number;reacted:boolean;disabled?:boolean;onToggle:(on:boolean)=>Promise<boolean>}){
 const meta=reactions[kind];const [busy,setBusy]=useState(false);const [play,setPlay]=useState(0);
 async function toggle(){if(busy||disabled)return;setBusy(true);const next=!reacted;const ok=await onToggle(next);setBusy(false);if(ok&&next)setPlay(n=>n+1);}
 return <button type="button" className="muse-stream-reaction muse-edge" data-kind={kind} aria-pressed={reacted} disabled={disabled||busy} onClick={toggle}
  aria-label={`${reacted?meta.given:meta.label}${count?`, ${count}`:''}`}>
  <span className="muse-stream-reaction-emoji" aria-hidden="true" key={`e${play}`} data-played={play>0||undefined}>{meta.emoji}</span>
  <span>{reacted?meta.given:meta.label}</span>{count>0&&<span className="muse-stream-count" aria-hidden="true">{count}</span>}
  {play>0&&<span className="muse-stream-burst" data-kind={kind} key={play} aria-hidden="true">{burst[kind].map((p,i)=><i key={i} style={{'--i':i,'--n':burst[kind].length} as CSSProperties}>{p}</i>)}</span>}
 </button>;
}
