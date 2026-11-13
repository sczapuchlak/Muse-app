"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { canvasOf, type VisionBoard } from "@/lib/vision-boards/model";
import "./VisionBoards.css";

// Konva only loads in the browser, and only where a board is actually shown.
const BoardPreview = dynamic(() => import("./BoardCanvas").then((m) => m.BoardPreview), { ssr: false });

/** Draws a board's preview only once its card scrolls near the screen. */
/**
 * Presets keep their card shapes; a custom board's card follows its proportions within portrait 3:4 and wide 16:9 (so
 * library rows stay even), and anything more extreme is fitted whole inside that card.
 */
export function LazyPreview({ board }: { board: Pick<VisionBoard, "size" | "canvas" | "background" | "elements"> }) {
  const ref = useRef<HTMLDivElement>(null), [box, setBox] = useState({ w: 0, h: 0 }), [seen, setSeen] = useState(false);
  const c = canvasOf(board), ratio = c.w / c.h, card = Math.min(16 / 9, Math.max(3 / 4, ratio));
  const width = box.h && ratio < card ? Math.round(box.h * ratio) : box.w;
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { rootMargin: "200px" });
    const ro = new ResizeObserver(([e]) => setBox({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    io.observe(el); ro.observe(el);
    return () => { io.disconnect(); ro.disconnect(); };
  }, []);
  return <div ref={ref} className="muse-vision-preview" data-size={board.size} style={board.size === "custom" ? { aspectRatio: String(card) } : undefined}>
    {seen && width > 0 && <BoardPreview board={board} width={width} />}
    {!board.elements.length && <span className="muse-vision-preview-empty">An empty canvas</span>}
  </div>;
}

