import { isValidElement, type ReactNode } from "react";
import { museIconShapes } from "../../MuseIcon";
import { extendedIconShapes } from "../../ExtendedMuseIcon";
import { markIconName, markIcons, type MarkIcon } from "@/lib/muse-marks";

/**
 * Muse Marks as board stickers: the same icon drawings Muse uses everywhere (24×24, stroked), turned into one SVG
 * path so the canvas can draw them at any size. Circles, ellipses and rounded rectangles become arcs.
 */
const n = (v: unknown) => Number(v ?? 0);
function toPath(node: ReactNode, out: string[]) {
  if (Array.isArray(node)) { for (const c of node) toPath(c, out); return; }
  if (!isValidElement(node)) return;
  const p = node.props as Record<string, unknown>;
  switch (node.type) {
    case "path": if (typeof p.d === "string") out.push(p.d); break;
    case "circle": { const cx = n(p.cx), cy = n(p.cy), r = n(p.r); out.push(`M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`); break; }
    case "ellipse": { const cx = n(p.cx), cy = n(p.cy), rx = n(p.rx), ry = n(p.ry); out.push(`M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`); break; }
    case "rect": {
      const x = n(p.x), y = n(p.y), w = n(p.width), h = n(p.height), r = Math.min(n(p.rx), w / 2, h / 2);
      out.push(r ? `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}Z` : `M${x} ${y}h${w}v${h}h${-w}Z`);
      break;
    }
    case "line": out.push(`M${n(p.x1)} ${n(p.y1)}L${n(p.x2)} ${n(p.y2)}`); break;
    default: toPath(p.children as ReactNode, out);
  }
}
const memo = new Map<string, string | null>();
export function iconPathData(name: string): string | null {
  if (memo.has(name)) return memo.get(name)!;
  const shape = (museIconShapes as Record<string, ReactNode>)[name] ?? (extendedIconShapes as Record<string, ReactNode>)[name];
  const out: string[] = [];
  if (shape) toPath(shape, out);
  const d = out.length ? out.join(" ") : null;
  memo.set(name, d);
  return d;
}
/** Muse Marks offered as stickers, in the Planner's own order. */
export const markStickers = markIcons.map((m) => ({ id: `mark:${m.id}`, label: m.label, icon: markIconName(m.id as MarkIcon) }));
export const markIconFor = (stickerId: string) => markStickers.find((m) => m.id === stickerId)?.icon;
