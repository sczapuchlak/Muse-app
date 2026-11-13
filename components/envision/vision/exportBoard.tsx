"use client";
import { createRoot } from "react-dom/client";
import { createRef } from "react";
import type Konva from "konva";
import { boardBox, type VisionBoard } from "@/lib/vision-boards/model";
import { libraryItem } from "@/lib/vision-boards/library";
import { ensureBoardFonts } from "@/lib/vision-boards/fonts";
import { BoardPreview } from "./BoardCanvas";
import { loadBoardImage, loadPublicImage } from "./images";

/** The largest canvas every supported browser draws reliably (iPhone Safari's limit is ~16.7 million pixels). */
const MAX_PIXELS = 16_000_000;
export const exportScale = (b: Pick<VisionBoard, "size" | "canvas">, wanted: number) => { const c = boardBox(b); return Math.max(0.25, Math.min(wanted, Math.sqrt(MAX_PIXELS / (c.w * c.h)))); };

/** Everything a board needs before it can be drawn exactly: full-resolution photos, library art and fonts. */
async function preload(board: Pick<VisionBoard, "elements" | "background">) {
  const json = JSON.stringify([board.elements, board.background]);
  const paths = [...json.matchAll(/"path":"([^"]+)"/g)].map((m) => m[1]);
  const pieces = [...json.matchAll(/"(?:piece|id)":"([a-z]+\/[a-z0-9-]+\/[a-z0-9-]+)"/g)].map((m) => libraryItem(m[1])?.src).filter((s): s is string => !!s);
  await Promise.all([
    ...[...new Set(paths)].map((p) => loadBoardImage(p).catch(() => null)),
    ...[...new Set(pieces)].map((s) => loadPublicImage(s).catch(() => null)),
    ensureBoardFonts(board.elements as never),
  ]);
  await document.fonts?.ready;
}
const frames = (n: number) => new Promise<void>((r) => { const step = (k: number) => (k ? requestAnimationFrame(() => step(k - 1)) : r()); step(n); });

/**
 * Renders the whole board, at its own dimensions times `scale`, to an image. Independent of the editor's zoom and
 * scroll, never includes the pasteboard, never animates (finishes are drawn still), and waits for every asset first.
 */
export async function exportBoard(board: Pick<VisionBoard, "size" | "canvas" | "elements" | "background">, opts: { scale?: number; type?: "image/png" | "image/jpeg" } = {}): Promise<Blob> {
  await preload(board);
  const box = boardBox(board), host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-100000px;top:0;pointer-events:none;opacity:0";
  document.body.appendChild(host);
  const root = createRoot(host), ref = createRef<Konva.Stage>();
  try {
    root.render(<BoardPreview board={board} width={box.w} quality="full" stageRef={ref} />);
    for (let i = 0; i < 40 && !ref.current; i++) await frames(1);
    await frames(3); await new Promise((r) => setTimeout(r, 120)); await frames(2);
    const stage = ref.current;
    if (!stage) throw Error("The board couldn’t be drawn for export.");
    const pixelRatio = exportScale(board, opts.scale ?? 2);
    const blob = await stage.toBlob({ pixelRatio, mimeType: opts.type ?? "image/png", quality: 0.92 }) as Blob | null;
    if (!blob) throw Error("The image couldn’t be created. Try a smaller export size.");
    return blob;
  } finally { root.unmount(); host.remove(); }
}
