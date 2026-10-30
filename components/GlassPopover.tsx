"use client";

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import "./GlassPopover.css";

type GlassPopoverProps = {
  id: string;
  label: string;
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  align?: "start" | "end";
  role?: "dialog" | "menu";
  scrollMode?: "panel" | "content";
};

/** Escape card containment; stay inside the active native modal focus boundary when present. */
export function GlassPopover({ id, label, open, anchorRef, onClose, children, width = 340, align = "start", role = "dialog", scrollMode = "panel" }: GlassPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useLayoutEffect(() => { closeRef.current = onClose; }, [onClose]);

  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const anchor = anchorRef.current;
    if (!panel || !anchor) return;
    function position() {
      if (!panel || !anchor) return;
      const box = anchor.getBoundingClientRect();
      const host=anchor.closest("dialog[open]");
      const hostBox=host?.getBoundingClientRect();
      panel.style.maxWidth=`${(hostBox?.width??window.innerWidth)-24}px`;
      const panelWidth = panel.offsetWidth;
      const left = align === "end" ? box.right - panelWidth : box.left;
      const edge=hostBox?.left??0;
      const right=hostBox?.right??window.innerWidth;
      panel.style.left = `${Math.max(edge+12, Math.min(left, right-panelWidth-12))-edge}px`;
      const roomBelow = window.innerHeight - box.bottom - 20;
      const above = roomBelow < 220 && box.top > roomBelow;
      panel.style.maxHeight = `${Math.max(140, Math.min(560, above ? box.top - 20 : roomBelow))}px`;
      panel.style.top = `${(above ? Math.max(12, box.top - panel.offsetHeight - 8) : box.bottom + 8)-(hostBox?.top??0)}px`;
    }
    position();
    const resize = new ResizeObserver(position);
    resize.observe(panel);
    resize.observe(anchor);
    const frame = requestAnimationFrame(() => {
      const focusTarget = panel.querySelector<HTMLElement>('[data-popover-autofocus], input, button:not(:disabled), [tabindex="0"]');
      (focusTarget ?? panel).focus();
    });
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !panel?.contains(event.target) && !anchor?.contains(event.target)) closeRef.current();
    }
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); anchor?.focus(); }
    }
    function focusout(event: FocusEvent) {
      if (event.relatedTarget instanceof Node && !panel?.contains(event.relatedTarget) && !anchor?.contains(event.relatedTarget)) closeRef.current();
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keydown);
    panel.addEventListener("focusout", focusout);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keydown);
      panel.removeEventListener("focusout", focusout);
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, anchorRef, align]);

  if (!open) return null;
  return createPortal(<div ref={panelRef} id={id} className={`muse-popover-panel${scrollMode === "content" ? " muse-popover-content-scroll" : ""}`} role={role} aria-label={label} tabIndex={-1}
    style={{ "--popover-width": `${width}px` } as CSSProperties}>{children}</div>, document.activeElement?.closest("dialog[open]")??document.body);
}
