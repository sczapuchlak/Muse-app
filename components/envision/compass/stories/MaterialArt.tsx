"use client";
import { useId, type CSSProperties, type ReactNode } from "react";
import { materialLook, type ArtLook } from "@/lib/inner-compass/material-art";

const PEBBLE = "M9 27c0-9.5 7-16 15.5-16S39 17.5 39 26s-6.5 13-15 13S9 36 9 27Z";
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** The drawing for one look, in a 48×48 box. `g` holds this instance's gradient ids. */
function draw(look: ArtLook, g: { fill: string; lin: string; clip: string }): ReactNode {
  const { light, dark, accent } = look, a = accent ?? dark, shine = <ellipse cx="18.5" cy="19.5" rx="5.5" ry="3" fill="#fff" opacity=".45" transform="rotate(-25 18.5 19.5)" />;
  const stem = (d: string) => <path d={d} fill="none" stroke={dark} strokeWidth="1.6" strokeLinecap="round" />;
  switch (look.shape) {
    case "tumbled": return <><path d={PEBBLE} fill={`url(#${g.fill})`} />{accent && <path d="M13 30c6-3 15-3 23 1" fill="none" stroke={accent} strokeWidth="2" opacity=".45" />}{shine}</>;
    case "banded": return <><clipPath id={g.clip}><path d={PEBBLE} /></clipPath><path d={PEBBLE} fill={`url(#${g.fill})`} />
      <g clipPath={`url(#${g.clip})`} fill="none" stroke={a} strokeWidth="2.2" opacity=".6">{[16, 22, 28, 34].map((y, i) => <path key={y} d={`M6 ${y + i}c10-${4 + i} 24-${2 + i} 36 ${1 + i}`} />)}</g>{shine}</>;
    case "flecked": return <><path d={PEBBLE} fill={`url(#${g.fill})`} />{[[17, 26], [24, 20], [30, 29], [21, 33], [33, 22], [27, 34], [14, 21]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 1.1 : 1.6} fill={a} opacity=".9" />)}{shine}</>;
    case "point": case "clear": return <g opacity={look.shape === "clear" ? .85 : 1}>
      <path d="M15 41V15l9-10 9 10v26Z" fill={`url(#${g.lin})`} stroke={dark} strokeWidth=".8" strokeLinejoin="round" />
      <path d="M15 15l9-10 9 10-9 4Z" fill="#fff" opacity=".35" /><path d="M24 19v22" stroke="#fff" strokeWidth="1" opacity=".5" /><path d="M18 22v15" stroke="#fff" strokeWidth="1.4" opacity=".35" strokeLinecap="round" /></g>;
    case "sphere": return <><circle cx="24" cy="25" r="14" fill={`url(#${g.fill})`} /><ellipse cx="19" cy="19" rx="5" ry="3.2" fill="#fff" opacity=".55" transform="rotate(-30 19 19)" /></>;
    case "chunk": return <><path d="M11 24l8-12 13 1 6 12-7 13H17Z" fill={`url(#${g.lin})`} stroke={dark} strokeWidth=".8" strokeLinejoin="round" />
      <path d="M19 12l5 11 14 2M24 23l-7 15M24 23l7 15M11 24l13-1" fill="none" stroke="#fff" strokeWidth=".8" opacity=".45" /></>;
    case "leaf": return <><path d="M24 43C11 34 9 17 24 5c15 12 13 29 0 38Z" fill={`url(#${g.lin})`} />{stem("M24 44V9")}{[14, 20, 26, 32].map((y) => <path key={y} d={`M24 ${y + 4}l-6-4M24 ${y + 4}l6-4`} stroke={dark} strokeWidth="1" opacity=".5" strokeLinecap="round" />)}{accent && <><circle cx="35" cy="10" r="2.6" fill={accent} /><circle cx="38.5" cy="14" r="2.2" fill={accent} /></>}</>;
    case "sprig": return <>{stem("M24 44C24 30 23 18 25 5")}{range(8).map((i) => { const y = 9 + i * 4.2; return <g key={i} stroke={light} strokeWidth="2.4" strokeLinecap="round"><path d={`M24.5 ${y}l-7 3`} /><path d={`M24.5 ${y + 2}l7 3`} /></g>; })}
      {accent && [[19, 12], [30, 18], [18, 25], [31, 31]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2" fill={accent} />)}</>;
    case "spike": return <>{stem("M24 44V12")}<path d="M24 34l-6-5M24 30l6-5" stroke="#6f9a5a" strokeWidth="1.6" strokeLinecap="round" />{range(7).map((i) => <ellipse key={i} cx={i % 2 ? 26.5 : 21.5} cy={6 + i * 3.2} rx="3" ry="2.2" fill={i % 2 ? light : dark} />)}</>;
    case "flower": return <><g transform="translate(24 23)">{range(8).map((i) => <ellipse key={i} cx="0" cy="-10" rx="5" ry="9" fill={light} stroke={dark} strokeWidth=".6" strokeOpacity=".5" transform={`rotate(${i * 45})`} />)}</g><circle cx="24" cy="23" r="6.5" fill={dark} />{stem("M24 30v14")}</>;
    case "cluster": return <>{stem("M24 44V24")}<path d="M24 26l-8-6M24 26l8-6M24 26v-6" stroke="#6f9a5a" strokeWidth="1.2" />{[[16, 16], [21, 12], [27, 12], [32, 16], [18, 21], [24, 17], [30, 21], [24, 9], [13, 20], [35, 20]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.2" fill={light} stroke={dark} strokeWidth=".7" />)}</>;
    case "stick": return <>{[0, 7].map((o) => <g key={o} transform={`rotate(-35 24 24) translate(${o - 3} 0)`}><rect x="17" y="7" width="7" height="34" rx="3" fill={`url(#${g.lin})`} /><ellipse cx="20.5" cy="8" rx="3.5" ry="1.8" fill={dark} /><path d="M20.5 8m-1.6 0a1.6 1 0 1 0 3.2 0" fill="none" stroke={light} strokeWidth=".8" /></g>)}</>;
    case "star": return <><g transform="translate(24 24)">{range(8).map((i) => <path key={i} d="M0 0L-4 -6 0 -17 4 -6Z" fill={`url(#${g.lin})`} stroke={dark} strokeWidth=".6" transform={`rotate(${i * 45})`} />)}</g>{range(8).map((i) => <circle key={i} cx={24 + 8 * Math.sin(i * Math.PI / 4)} cy={24 - 8 * Math.cos(i * Math.PI / 4)} r="1.6" fill="#f3c98f" />)}<circle cx="24" cy="24" r="2.2" fill={dark} /></>;
    case "bud": return <><rect x="21.5" y="20" width="5" height="23" rx="2.5" fill={`url(#${g.lin})`} /><path d="M17 20l7-6 7 6-7 3Z" fill={dark} /><circle cx="24" cy="12" r="5.5" fill={light} stroke={dark} strokeWidth=".8" /></>;
    case "root": return <><path d="M8 28c2-6 8-7 12-5 1-6 7-9 11-6 4-3 10 0 9 6 3 3 1 9-4 9-2 4-9 5-12 1-5 3-12 1-12-3-3 0-5-1-4-2Z" fill={`url(#${g.lin})`} stroke={dark} strokeWidth=".8" /><path d="M15 27c4 1 9 1 13-1M30 20c1 3 1 6-1 9" fill="none" stroke={dark} strokeWidth=".8" opacity=".5" /></>;
    case "peel": return <><path d="M10 30c2-10 12-16 22-12 8 3 8 13 1 16-6 2-11-3-8-8" fill="none" stroke={light} strokeWidth="6" strokeLinecap="round" /><path d="M10 30c2-10 12-16 22-12 8 3 8 13 1 16-6 2-11-3-8-8" fill="none" stroke={dark} strokeWidth="1.2" strokeLinecap="round" opacity=".6" transform="translate(1 2)" /></>;
    case "grass": return <>{[[-9, 6], [-4, 3], [0, 0], [4, 4], [9, 7]].map(([dx, top], i) => <path key={i} d={`M24 44C${24 + dx / 3} 30 ${24 + dx} 18 ${24 + dx * 1.4} ${5 + top}`} fill="none" stroke={i % 2 ? dark : light} strokeWidth="3" strokeLinecap="round" />)}</>;
    case "grains": return <>{[[16, 30], [22, 26], [28, 31], [33, 25], [19, 36], [26, 37], [31, 35], [24, 20], [14, 24]].map(([x, y], i) => <rect key={i} x={x - 2.6} y={y - 2.6} width="5.2" height="5.2" rx="1" fill={light} stroke={dark} strokeWidth=".8" transform={`rotate(${i * 23} ${x} ${y})`} />)}</>;
    case "candle": return <><rect x="16" y="18" width="16" height="25" rx="2" fill={`url(#${g.lin})`} /><path d="M16 22h16" stroke={dark} strokeWidth=".8" opacity=".4" /><path d="M24 18v-3" stroke="#3a2a1a" strokeWidth="1.2" /><path d="M24 4c4 5 4 9 0 11-4-2-4-6 0-11Z" fill="#ffb627" /><path d="M24 8c2 3 2 5 0 6-2-1-2-3 0-6Z" fill="#fff4c2" /></>;
    case "feather": return <><path d="M12 42C14 26 24 10 38 6c-2 14-12 28-26 36Z" fill={`url(#${g.lin})`} /><path d="M10 44C18 32 27 18 36 8" fill="none" stroke={dark} strokeWidth="1.4" strokeLinecap="round" />{[14, 20, 26, 32].map((y) => <path key={y} d={`M${40 - y} ${y}l7 2`} stroke={dark} strokeWidth=".7" opacity=".5" />)}</>;
    case "shell": return <><path d="M24 41L8 20c4-9 28-9 32 0Z" fill={`url(#${g.lin})`} stroke={dark} strokeWidth=".8" strokeLinejoin="round" />{[-12, -6, 0, 6, 12].map((dx) => <path key={dx} d={`M24 41L${24 + dx * 1.2} ${15 + Math.abs(dx) / 3}`} stroke={dark} strokeWidth=".8" opacity=".55" />)}<path d="M19 41h10l-2 3h-6Z" fill={dark} /></>;
    case "scroll": return <><rect x="11" y="12" width="26" height="24" rx="2" fill={`url(#${g.lin})`} /><rect x="9" y="9" width="30" height="5" rx="2.5" fill={dark} /><rect x="9" y="34" width="30" height="5" rx="2.5" fill={dark} />{[19, 23, 27].map((y) => <path key={y} d={`M16 ${y}h16`} stroke={dark} strokeWidth="1" opacity=".5" />)}</>;
    case "heart": return <><path d="M24 40C10 30 8 22 11 16c3-6 11-6 13 0 2-6 10-6 13 0 3 6 1 14-13 24Z" fill={`url(#${g.lin})`} />{shine}</>;
    case "brush": return <><rect x="21" y="16" width="6" height="28" rx="3" fill={dark} transform="rotate(20 24 30)" /><path d="M20 4c6 2 9 7 8 13l-7-1c-1-4-2-8-1-12Z" fill={light} transform="rotate(20 24 30)" /><circle cx="35" cy="34" r="4" fill={look.accent ?? light} /></>;
    case "sparkle": return <path d="M24 6c1.5 10 4 12.5 14 14-10 1.5-12.5 4-14 14-1.5-10-4-12.5-14-14 10-1.5 12.5-4 14-14Z" fill={`url(#${g.lin})`} />;
  }
}

/**
 * A material's small picture: the library material's own look, or its category's for one the person named. Decorative
 * (the name sits beside it), so it is hidden from screen readers.
 */
export function MaterialArt({ refKey, category, size = 44, className = "muse-stories-material-art" }: { refKey?: string; category?: string; size?: number; className?: string }) {
  const id = useId().replace(/:/g, ""), look = materialLook(refKey, category), g = { fill: `${id}f`, lin: `${id}l`, clip: `${id}c` };
  return <span className={className} style={{ "--art-light": look.light, "--art-dark": look.dark } as CSSProperties} aria-hidden="true">
    <svg viewBox="0 0 48 48" width={size} height={size} focusable="false">
      <defs>
        <radialGradient id={g.fill} cx="38%" cy="32%" r="75%"><stop offset="0" stopColor={look.light} /><stop offset="1" stopColor={look.dark} /></radialGradient>
        <linearGradient id={g.lin} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={look.light} /><stop offset="1" stopColor={look.dark} /></linearGradient>
      </defs>
      {draw(look, g)}
    </svg>
  </span>;
}
