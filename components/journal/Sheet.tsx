"use client";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * A responsive full-screen sheet (the Companion Studio opens in one): portalled to the document so it sits above the
 * app shell, full screen on phones and a large centred panel on wider screens. Escape closes it (the Studio asks
 * first if there are unsaved changes); the page behind doesn't scroll while it's open.
 */
export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", key); };
  }, [onClose]);
  // Rendered only in the browser (after the journal loads), so the document is always there.
  if (typeof document === "undefined") return null;
  return createPortal(<div className="mj-sheet" role="dialog" aria-modal="true" aria-label={label}><div className="mj-sheet-inner">{children}</div></div>, document.body);
}
