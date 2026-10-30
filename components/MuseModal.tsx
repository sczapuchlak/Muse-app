"use client";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMuseDialog } from "./useMuseDialog";
import "./MuseModal.css";

/** Large dataset picker shell. Children own fixed controls and one scrolling results region. */
export function MuseModal({id,label,returnFocus,onClose,children}:{id:string;label:string;returnFocus:HTMLElement|null;onClose:()=>void;children:ReactNode}) {
  const ref=useMuseDialog(returnFocus);
  return createPortal(<dialog ref={ref} id={id} className="muse-modal" aria-label={label} aria-modal="true" onCancel={(event)=>{event.preventDefault();onClose();}} onClick={(event)=>{if(event.target!==event.currentTarget)return;const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)onClose();}}>{children}</dialog>,document.body);
}
