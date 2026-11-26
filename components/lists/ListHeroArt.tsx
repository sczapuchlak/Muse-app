"use client";
import type { CSSProperties } from "react";
import { MUSE_STAR_PATH } from "../MuseStar";

export type ListStar = { label: string; done: number; total: number };

/**
 * The list hero's art (Nov 25, second pass): the list as a small constellation. Each section is a star joined to the
 * next by a fine thread; a finished section's star is lit (with a glow), one under way is half lit, an untouched one
 * is an outline. The shape is stable per list (seeded by its id), so it reads as "this list's" sky.
 */
/** A small seeded random source, so a list's sky keeps its shape between visits. */
function seeded(seed: string) {
  let h = 7; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
}

export function ListHeroArt({ stars, seed }: { stars: ListStar[]; seed: string }) {
  const n = Math.max(1, Math.min(stars.length, 10)), shown = stars.slice(0, n), rand = seeded(seed);
  const W = 440, H = 110, phase = rand() * 6;
  const pts = shown.map((s, i) => {
    const x = n === 1 ? W / 2 : 26 + (i * (W - 52)) / (n - 1) + (rand() - .5) * 14;
    const y = H / 2 + Math.sin(i * 1.35 + phase) * 28 + (rand() - .5) * 12;
    const state = s.total > 0 && s.done >= s.total ? "lit" : s.done > 0 ? "half" : "dim";
    return { x, y, state, s, size: .66 + rand() * .24 + (state === "lit" ? .16 : 0) };
  });
  const dust = Array.from({ length: 24 }, () => ({ x: rand() * W, y: rand() * H, r: .5 + rand() * 1.1, d: rand() * 4 }));
  return <svg className="muse-list-art" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="muse-list-star-glow"><stop offset="0" className="muse-list-art-glow-in" /><stop offset="1" className="muse-list-art-glow-out" /></radialGradient>
    </defs>
    {dust.map((d, i) => <circle key={`d${i}`} className="muse-list-art-dust" cx={d.x} cy={d.y} r={d.r} style={{ animationDelay: `${-(d.d * 3).toFixed(2)}s` } as CSSProperties} />)}
    {pts.slice(1).map((p, i) => { const a = pts[i]; return <line key={`l${i}`} className="muse-list-art-thread" data-lit={(a.state === "lit" && p.state === "lit") || undefined} x1={a.x} y1={a.y} x2={p.x} y2={p.y} />; })}
    {pts.map((p, i) => <g key={i} className="muse-list-art-star" data-state={p.state} style={{ animationDelay: `${-(i * 3.7).toFixed(1)}s` } as CSSProperties}>
      <title>{`${p.s.label} · ${p.s.done}/${p.s.total}`}</title>
      {p.state !== "dim" && <circle className="muse-list-art-halo" cx={p.x} cy={p.y} r={p.state === "lit" ? 22 : 14} fill="url(#muse-list-star-glow)" />}
      <path d={MUSE_STAR_PATH} transform={`translate(${p.x - 12 * p.size} ${p.y - 20 * p.size}) scale(${p.size})`} />
    </g>)}
  </svg>;
}
