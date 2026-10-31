"use client";
import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./MuseDrawer.css";
import { MuseCloseButton } from "./MuseIconButton";
import { useMuseDialog } from "./useMuseDialog";

/** Native modal dialog provides focus containment, Escape, and an inert background. */
export function MuseDrawer({ title, onClose, children, returnFocus }: { title: string; onClose: () => void; children: ReactNode; returnFocus?: HTMLElement | null }) {
  const ref=useMuseDialog(returnFocus);
  return createPortal(<dialog ref={ref} className="muse-drawer" aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose(); } }}>
    <div className="muse-drawer-header"><h2>{title}</h2><MuseCloseButton onClose={onClose} label={`Close ${title}`}/></div>
    <div className="muse-drawer-content">{children}</div>
  </dialog>, document.body);
}
