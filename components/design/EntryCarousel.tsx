"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MuseIcon } from "../MuseIcon";
import "./EntryCarousel.css";

/**
 * A compact, paged carousel for dated entries (#105): Little Moments, Bright Days, Intentions. Height stays stable
 * however many entries there are; only the current page and its neighbours are mounted, so a year of entries stays
 * light. Arrows, swipe, horizontal trackpad scroll and ←/→ on the focused region all move one page. The page never
 * scrolls sideways. Items keep their own design; this only arranges and navigates them.
 */
export function EntryCarousel<T>({ items, label, render, itemKey, describe, minWidth = 200, startAtEnd = false }: {
  items: T[]; label: string; render: (item: T) => ReactNode; itemKey: (item: T) => string; describe: (item: T) => string; minWidth?: number; startAtEnd?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null), [perPage, setPerPage] = useState(3), [page, setPage] = useState<number | null>(null);
  // #104: the region keeps the tallest height it has shown, so paging never shortens it and moves the page up.
  const [minH, setMinH] = useState(0), lastWidth = useRef(0);
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(([e]) => {
    const w = e.contentRect.width; if (Math.abs(w - lastWidth.current) > 1) { lastWidth.current = w; setMinH(0); }
    setPerPage(Math.max(1, Math.floor((w + 12) / (minWidth + 12)))); setMinH((h) => Math.max(h, e.borderBoxSize?.[0]?.blockSize ?? e.contentRect.height)); }); ro.observe(el); return () => ro.disconnect(); }, [minWidth]);
  const pages = Math.max(1, Math.ceil(items.length / perPage)), current = Math.min(page ?? (startAtEnd ? pages - 1 : 0), pages - 1);
  const go = (p: number) => setPage(Math.max(0, Math.min(pages - 1, p)));
  const touch = useRef<{ x: number; y: number } | null>(null), wheel = useRef(0), wheelAt = useRef(0);
  const first = current * perPage, shown = items.slice(first, first + perPage);
  const position = items.length ? `${first + 1}${shown.length > 1 ? `–${first + shown.length}` : ""} of ${items.length}` : "";
  const range = shown.length ? `${describe(shown[0])}${shown.length > 1 ? ` – ${describe(shown[shown.length - 1])}` : ""}` : "";
  return <div className="muse-entry-carousel" role="region" aria-roledescription="carousel" aria-label={label}>
    <div className="muse-entry-carousel-bar">
      <span className="muse-entry-carousel-where" aria-live="polite">{range}{position && <small> · {position}</small>}</span>
      {pages > 1 && <span className="muse-entry-carousel-arrows">
        <button type="button" aria-label={`Previous ${label}`} disabled={current === 0} onClick={() => go(current - 1)}><MuseIcon name="chevron" size={14} /></button>
        <button type="button" aria-label={`Next ${label}`} disabled={current === pages - 1} onClick={() => go(current + 1)}><MuseIcon name="chevron" size={14} /></button>
      </span>}
    </div>
    <div ref={box} className="muse-entry-carousel-track" tabIndex={pages > 1 ? 0 : -1} aria-label={`${label}: ${position}. Use the left and right arrow keys to browse.`}
      style={{ gridTemplateColumns: `repeat(${perPage}, minmax(0, 1fr))`, minHeight: minH || undefined }}
      onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === "ArrowRight") { e.preventDefault(); go(current + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); go(current - 1); } if (e.key === "Home") { e.preventDefault(); go(0); } if (e.key === "End") { e.preventDefault(); go(pages - 1); } }}
      onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
      onTouchEnd={(e) => { const s = touch.current; touch.current = null; if (!s) return; const dx = e.changedTouches[0].clientX - s.x, dy = e.changedTouches[0].clientY - s.y; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) go(current + (dx < 0 ? 1 : -1)); }}
      onWheel={(e) => { if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || pages < 2) return; wheel.current += e.deltaX; const now = Date.now(); if (Math.abs(wheel.current) > 60 && now - wheelAt.current > 350) { wheelAt.current = now; go(current + (wheel.current > 0 ? 1 : -1)); wheel.current = 0; } }}>
      {shown.map((item) => <div key={itemKey(item)} className="muse-entry-carousel-item">{render(item)}</div>)}
    </div>
    {pages > 1 && pages <= 12 && <div className="muse-entry-carousel-dots" aria-hidden="true">{Array.from({ length: pages }, (_, i) => <i key={i} data-on={i === current || undefined} />)}</div>}
  </div>;
}
