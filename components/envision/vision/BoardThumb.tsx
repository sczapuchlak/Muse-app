"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { VisionBoard } from "@/lib/vision-boards/model";
import "./VisionBoards.css";

// Konva only loads in the browser, and only where a board is actually shown.
const BoardPreview = dynamic(() => import("./BoardCanvas").then((m) => m.BoardPreview), { ssr: false });

/** Draws a board's preview only once its card scrolls near the screen. */
export function LazyPreview({ board }: { board: Pick<VisionBoard, "size" | "background" | "elements"> }) {
  const ref = useRef<HTMLDivElement>(null), [width, setWidth] = useState(0), [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { rootMargin: "200px" });
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    io.observe(el); ro.observe(el);
    return () => { io.disconnect(); ro.disconnect(); };
  }, []);
  return <div ref={ref} className="muse-vision-preview" data-size={board.size}>
    {seen && width > 0 && <BoardPreview board={board} width={width} />}
    {!board.elements.length && <span className="muse-vision-preview-empty">An empty canvas</span>}
  </div>;
}

