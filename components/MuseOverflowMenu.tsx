"use client";
import { useEffect,useId,useRef,useState } from "react";
import { GlassPopover } from "./GlassPopover";
import { MuseIcon } from "./MuseIcon";
import "./MuseOverflowMenu.css";
export type OverflowAction={id:string;label:string;onSelect?:()=>void;href?:string;destructive?:boolean};

export function MuseOverflowMenu({label,actions}:{label:string;actions:OverflowAction[]}) {
  const [pending,setPending]=useState<OverflowAction|null>(null),cancelRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(pending)cancelRef.current?.focus();},[pending]);
  const [open,setOpen]=useState(false),anchor=useRef<HTMLButtonElement>(null),id=useId();
  function close(){setPending(null);setOpen(false);anchor.current?.focus();}
  return <><button ref={anchor} className="muse-overflow-trigger muse-edge" type="button" aria-label={`More options for ${label}`} aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={()=>{setPending(null);setOpen((value)=>!value);}} onKeyDown={(event)=>{if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();setOpen(true);}}}><MuseIcon name="more" size={18}/></button>
    <GlassPopover id={id} label={`Options for ${label}`} role={pending?"dialog":"menu"} open={open} anchorRef={anchor} onClose={()=>setOpen(false)} width={230} align="end">
      {pending?<div className="muse-inline-editor"><p>{pending.label}?</p><div className="editor-actions"><button ref={cancelRef} className="muse-button" type="button" onClick={()=>setPending(null)}>Keep it</button><button className="muse-button" type="button" onClick={()=>{const action=pending;close();action.onSelect?.();}}>{pending.label}</button></div></div>:<div className="muse-overflow-actions" onKeyDown={(event)=>{
        if(event.key==="Tab"){setOpen(false);return;}
        if(!["ArrowDown","ArrowUp","Home","End"].includes(event.key))return;
        event.preventDefault();const options=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
        const index=options.indexOf(document.activeElement as HTMLElement),next=event.key==="Home"?0:event.key==="End"?options.length-1:(index+(event.key==="ArrowDown"?1:-1)+options.length)%options.length;options[next]?.focus();
      }}>{actions.map((action,index)=>action.href?<a key={action.id} className="popover-choice" role="menuitem" data-popover-autofocus={index===0?true:undefined} tabIndex={-1} href={action.href} target="_blank" rel="noreferrer" onClick={close}>{action.label}</a>:<button key={action.id} className="popover-choice" type="button" role="menuitem" data-popover-autofocus={index===0?true:undefined} tabIndex={-1} data-destructive={action.destructive||undefined} onClick={()=>{if(action.destructive){setPending(action);return;}close();action.onSelect?.();}}>{action.label}</button>)}</div>}
    </GlassPopover>
  </>;
}
