"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { MuseCloseButton } from "./MuseIconButton";
import { createPortal } from "react-dom";
import "./GlassPopover.css";
import { popoverBounds,placePopover } from "@/lib/popover-layout";

const activePanels:HTMLDivElement[]=[];

type GlassPopoverProps = {
  id: string;
  label: string;
  title?: ReactNode;
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  align?: "start" | "end";
  role?: "dialog" | "menu";
  scrollMode?: "panel" | "content";
  /** Simple choice lists: no visible header (the trigger already names the field); Escape and outside clicks still close. */
  bare?: boolean;
};

/** Escape card containment; stay inside the active native modal focus boundary when present. */
function GlassPopoverLayer({ id, label, title, open, anchorRef, onClose, children, width = 340, align = "start", role = "dialog", scrollMode = "panel", bare = false }: GlassPopoverProps) {
  const [host,setHost]=useState<Element|null>(null);
  useLayoutEffect(()=>{const owner=anchorRef.current?.closest('dialog[open]')??document.body;const frame=requestAnimationFrame(()=>setHost(owner));return()=>cancelAnimationFrame(frame);},[anchorRef]);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useLayoutEffect(() => { closeRef.current = onClose; }, [onClose]);

  useLayoutEffect(() => {
    if (!open || !host) return;
    const panel = panelRef.current;
    const anchor = anchorRef.current;
    if (!panel || !anchor) return;
    activePanels.push(panel);
    function position() {
      if (!panel || !anchor) return;
      const box=anchor.getBoundingClientRect(),host=anchor.closest('dialog[open]'),hostBox=host?.getBoundingClientRect(),viewport=window.visualViewport;
      const bounds=popoverBounds({left:viewport?.offsetLeft??0,top:viewport?.offsetTop??0,right:(viewport?.offsetLeft??0)+(viewport?.width??window.innerWidth),bottom:(viewport?.offsetTop??0)+(viewport?.height??window.innerHeight)},hostBox);
      panel.style.maxWidth=`${Math.max(1,bounds.right-bounds.left)}px`;
      // Phones: span the usable width so choices are never squeezed beside the trigger.
      panel.style.width=bounds.right-bounds.left<480?`${Math.max(1,bounds.right-bounds.left)}px`:'';
      const placement=placePopover(box,bounds,panel.offsetWidth,panel.scrollHeight+2,align);
      panel.style.maxHeight=`${placement.maxHeight}px`;
      panel.style.left=`${placement.left-(hostBox?.left??0)}px`;
      panel.style.top=`${placement.top-(hostBox?.top??0)}px`;
    }
    position();
    const resize = new ResizeObserver(position);
    resize.observe(panel);
    resize.observe(anchor);
    const frame = requestAnimationFrame(() => {
      // On touch screens a focused search field opens the keyboard and hides the choices; focus the panel instead.
      const touch=window.matchMedia?.('(pointer: coarse)').matches;
      const focusTarget = panel.querySelector<HTMLElement>('[data-popover-autofocus]')??(touch?null:panel.querySelector<HTMLElement>('input'))??(touch?null:panel.querySelector<HTMLElement>('button:not(:disabled), [tabindex="0"]'));
      (focusTarget ?? panel).focus();
    });
    function outside(event: PointerEvent) {
      if(activePanels.at(-1)!==panel)return;
      if (event.target instanceof Node && !panel?.contains(event.target) && !anchor?.contains(event.target)) closeRef.current();
    }
    function keydown(event: KeyboardEvent) {
      if(activePanels.at(-1)!==panel||event.defaultPrevented)return;
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); anchor?.focus(); }
    }
    function focusout(event: FocusEvent) {
      if(activePanels.at(-1)!==panel)return;
      if (event.relatedTarget instanceof Node && !panel?.contains(event.relatedTarget) && !anchor?.contains(event.relatedTarget)) closeRef.current();
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keydown);
    panel.addEventListener("focusout", focusout);
    window.visualViewport?.addEventListener("resize",position);
    window.visualViewport?.addEventListener("scroll",position);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      const index=activePanels.indexOf(panel);if(index>=0)activePanels.splice(index,1);
      cancelAnimationFrame(frame);
      resize.disconnect();
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keydown);
      panel.removeEventListener("focusout", focusout);
      window.visualViewport?.removeEventListener("resize",position);
      window.visualViewport?.removeEventListener("scroll",position);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, anchorRef, align, host]);

  if (!open || !host) return null;
  return createPortal(<div ref={panelRef} id={id} data-bare={bare||undefined} className={`muse-popover-panel${scrollMode === "content" ? " muse-popover-content-scroll" : ""}`} role={role} aria-label={label} tabIndex={-1}
    style={{ "--popover-width": `${width}px` } as CSSProperties}>{role==="dialog"&&!bare&&<div className="muse-popover-close"><p className="muse-popover-title">{title??label}</p><MuseCloseButton onClose={()=>{onClose();anchorRef.current?.focus();}} label={`Close ${label}`}/></div>}{children}</div>, host);
}

export function GlassPopover(props:GlassPopoverProps){return props.open?<GlassPopoverLayer {...props}/>:null;}
