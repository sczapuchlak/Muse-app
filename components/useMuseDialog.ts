"use client";
import { useLayoutEffect,useRef } from "react";

/** Shared native-modal lifecycle: top-layer focus containment, scroll lock and focus return. */
export function useMuseDialog(returnFocus?:HTMLElement|null) {
  const ref=useRef<HTMLDialogElement>(null);
  useLayoutEffect(()=>{
    const dialog=ref.current;dialog?.showModal();
    dialog?.querySelector<HTMLElement>("[data-dialog-autofocus], [data-drawer-autofocus], [data-popover-autofocus]")?.focus();
    const priorOverflow=document.body.style.overflow;document.body.style.overflow="hidden";
    return ()=>{dialog?.close();document.body.style.overflow=priorOverflow;if(returnFocus?.isConnected)returnFocus.focus();else document.getElementById("muse-main-content")?.focus();};
  },[returnFocus]);
  return ref;
}
