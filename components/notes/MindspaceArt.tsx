"use client";
import { useId } from "react";

/**
 * Mindspace hero art: atmosphere, not objects. "thoughts" (Sticky Board) is a soft nebula with drifting orbs, a comet and
 * a scatter of stars; "lists" (Lists) is layered aurora ribbons under a crescent moon with a rising arc of stars. Colours
 * are the theme's chart inks, so both suit every theme. Decorative only.
 */
export function MindspaceArt({ kind }: { kind: "thoughts" | "lists" }) {
  const id = useId().replace(/:/g, ""), g = (n: string) => `${id}-${n}`;
  const stars: [number, number, number][] = kind === "thoughts"
    ? [[28, 22, 1.4], [62, 70, 1], [96, 16, 1.8], [150, 84, 1.1], [188, 20, 1.3], [232, 60, 1], [262, 26, 1.6], [214, 92, 1.2], [120, 48, .9], [40, 88, 1.1]]
    : [[24, 30, 1.2], [70, 14, 1], [110, 40, .9], [176, 18, 1.1], [248, 34, 1.3], [272, 12, 1], [206, 50, .9]];
  return <svg className="muse-mindspace-art" data-kind={kind} viewBox="0 0 300 110" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id={g("glow")} cx="50%" cy="50%" r="50%"><stop offset="0" style={{ stopColor: "var(--chart-5)", stopOpacity: .55 }} /><stop offset="1" style={{ stopColor: "var(--chart-5)", stopOpacity: 0 }} /></radialGradient>
      <radialGradient id={g("glow2")} cx="50%" cy="50%" r="50%"><stop offset="0" style={{ stopColor: "var(--chart-1)", stopOpacity: .45 }} /><stop offset="1" style={{ stopColor: "var(--chart-1)", stopOpacity: 0 }} /></radialGradient>
      <radialGradient id={g("orb")} cx="35%" cy="30%" r="70%"><stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset=".35" style={{ stopColor: "var(--chart-2)" }} /><stop offset="1" style={{ stopColor: "var(--chart-5)", stopOpacity: .2 }} /></radialGradient>
      <radialGradient id={g("orb2")} cx="35%" cy="30%" r="70%"><stop offset="0" stopColor="#fff" stopOpacity=".9" /><stop offset=".4" style={{ stopColor: "var(--chart-3)" }} /><stop offset="1" style={{ stopColor: "var(--chart-1)", stopOpacity: .15 }} /></radialGradient>
      <linearGradient id={g("comet")} x1="0" y1="0" x2="1" y2="0"><stop offset="0" style={{ stopColor: "var(--chart-1)", stopOpacity: 0 }} /><stop offset="1" stopColor="#fff" stopOpacity=".9" /></linearGradient>
      <linearGradient id={g("band1")} x1="0" y1="0" x2="1" y2="0"><stop offset="0" style={{ stopColor: "var(--chart-1)", stopOpacity: 0 }} /><stop offset=".5" style={{ stopColor: "var(--chart-1)", stopOpacity: .75 }} /><stop offset="1" style={{ stopColor: "var(--chart-5)", stopOpacity: .1 }} /></linearGradient>
      <linearGradient id={g("band2")} x1="0" y1="0" x2="1" y2="0"><stop offset="0" style={{ stopColor: "var(--chart-5)", stopOpacity: .1 }} /><stop offset=".55" style={{ stopColor: "var(--chart-5)", stopOpacity: .7 }} /><stop offset="1" style={{ stopColor: "var(--chart-2)", stopOpacity: 0 }} /></linearGradient>
      <linearGradient id={g("band3")} x1="0" y1="0" x2="1" y2="0"><stop offset="0" style={{ stopColor: "var(--chart-2)", stopOpacity: 0 }} /><stop offset=".4" style={{ stopColor: "var(--chart-2)", stopOpacity: .6 }} /><stop offset="1" style={{ stopColor: "var(--chart-3)", stopOpacity: .2 }} /></linearGradient>
      <filter id={g("soft")} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" /></filter>
    </defs>
    {kind === "thoughts" ? <>
      <ellipse cx="172" cy="56" rx="120" ry="54" fill={`url(#${g("glow")})`} />
      <ellipse cx="96" cy="44" rx="80" ry="40" fill={`url(#${g("glow2")})`} />
      <path d="M44 34 L102 20" stroke={`url(#${g("comet")})`} strokeWidth="2" strokeLinecap="round" />
      <circle cx="102" cy="20" r="2.4" fill="#fff" />
      <g filter={`url(#${g("soft")})`} opacity=".55"><circle cx="196" cy="58" r="22" style={{ fill: "var(--chart-2)" }} /><circle cx="140" cy="70" r="14" style={{ fill: "var(--chart-3)" }} /></g>
      <circle cx="196" cy="56" r="20" fill={`url(#${g("orb")})`} className="muse-mindspace-orb" />
      <circle cx="142" cy="70" r="12" fill={`url(#${g("orb2")})`} className="muse-mindspace-orb" data-i="1" />
      <circle cx="246" cy="78" r="8" fill={`url(#${g("orb2")})`} className="muse-mindspace-orb" data-i="2" />
      <circle cx="236" cy="34" r="5" fill={`url(#${g("orb")})`} className="muse-mindspace-orb" data-i="3" />
      <path d="M196 56 L142 70 M196 56 L246 78 M196 56 L236 34" stroke="#fff" strokeOpacity=".22" strokeWidth=".8" strokeDasharray="2 3" />
    </> : <>
      <path d="M-10 74 C 50 48, 110 92, 170 66 S 270 44, 320 70 L 320 80 C 270 56, 220 92, 170 80 S 50 64, -10 88 Z" fill={`url(#${g("band1")})`} className="muse-mindspace-band" />
      <path d="M-10 60 C 60 34, 120 76, 180 52 S 280 30, 320 52 L 320 60 C 280 40, 230 74, 180 64 S 60 48, -10 72 Z" fill={`url(#${g("band2")})`} className="muse-mindspace-band" data-i="1" />
      <path d="M-10 90 C 60 70, 140 104, 200 86 S 280 70, 320 88 L 320 96 C 280 80, 220 106, 200 98 S 60 84, -10 100 Z" fill={`url(#${g("band3")})`} className="muse-mindspace-band" data-i="2" />
      <ellipse cx="232" cy="30" rx="34" ry="26" fill={`url(#${g("glow")})`} />
      <path d="M240 14 a16 16 0 1 0 8 30 a13 13 0 1 1 -8 -30 Z" fill="#fff" fillOpacity=".92" />
      {[[52, 58], [84, 46], [118, 38], [152, 34], [186, 36]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.2 + i * .25} fill="#fff" opacity={.5 + i * .1} />)}
    </>}
    {stars.map(([x, y, r], i) => <path key={i} className="muse-mindspace-star" data-i={i % 4} d={`M${x} ${y - r * 2.6} C${x + r * .4} ${y - r * .4} ${x + r * .4} ${y - r * .4} ${x + r * 2.6} ${y} C${x + r * .4} ${y + r * .4} ${x + r * .4} ${y + r * .4} ${x} ${y + r * 2.6} C${x - r * .4} ${y + r * .4} ${x - r * .4} ${y + r * .4} ${x - r * 2.6} ${y} C${x - r * .4} ${y - r * .4} ${x - r * .4} ${y - r * .4} ${x} ${y - r * 2.6}Z`} fill="#fff" />)}
  </svg>;
}
