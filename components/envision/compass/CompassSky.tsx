"use client";
import { useMemo } from "react";
import { categories, categoryInfo, type Category } from "@/lib/inner-compass/categories";
import { seeded, type Discovery } from "@/lib/inner-compass/model";

/**
 * The Inner World as a star chart (#210): a celestial-cartography disc split into six sectors, one per collection.
 * Every current discovery is one star in its sector, placed by its id (stable, nothing stored). Favourites burn a
 * little brighter, evolved ones wear a fine ring, and connections the person made are drawn as constellation lines.
 * It is decoration over real data, never a score: no sector is "fuller" in any sense the person is judged by.
 */
const R = 150, C = 160, SECTOR = (Math.PI * 2) / 6;
const angleOf = (i: number) => -Math.PI / 2 + i * SECTOR;
function place(d: Discovery, i: number) {
  const a = angleOf(i) - SECTOR / 2 + (0.12 + seeded(d.id, 1) * 0.76) * SECTOR;
  const r = 34 + Math.sqrt(seeded(d.id, 2)) * (R - 48);
  return { x: C + Math.cos(a) * r, y: C + Math.sin(a) * r };
}
/** A label path along the rim of sector i, drawn left-to-right so the words always read upright. */
const labelArc = (i: number, r: number) => {
  const mid = angleOf(i), a0 = mid - SECTOR / 2 + 0.06, a1 = mid + SECTOR / 2 - 0.06, lower = Math.sin(mid) > 0.01;
  const [s0, s1] = lower ? [a1, a0] : [a0, a1];
  return `M${C + Math.cos(s0) * r} ${C + Math.sin(s0) * r} A${r} ${r} 0 0 ${lower ? 0 : 1} ${C + Math.cos(s1) * r} ${C + Math.sin(s1) * r}`;
};
const arc = (i: number, r: number) => {
  const a0 = angleOf(i) - SECTOR / 2, a1 = a0 + SECTOR;
  return `M${C + Math.cos(a0) * r} ${C + Math.sin(a0) * r} A${r} ${r} 0 0 1 ${C + Math.cos(a1) * r} ${C + Math.sin(a1) * r}`;
};

export function CompassSky({ discoveries, links, onPick, focus }: { discoveries: Discovery[]; links: { a: string; b: string }[]; onPick: (c: Category) => void; focus?: Category | null }) {
  const stars = useMemo(() => discoveries.filter((d) => !d.archivedAt).map((d) => ({ d, ...place(d, categories.indexOf(d.category)) })), [discoveries]);
  const at = useMemo(() => new Map(stars.map((s) => [s.d.id, s])), [stars]);
  const lines = links.flatMap((l) => { const a = at.get(l.a), b = at.get(l.b); return a && b ? [{ key: `${l.a}-${l.b}`, a, b }] : []; });
  const count = (c: Category) => stars.filter((s) => s.d.category === c).length;
  return <figure className="muse-compass-sky" data-focus={focus ?? undefined}>
    <svg viewBox="-12 -12 344 344" role="img" aria-labelledby="muse-compass-sky-title">
      <title id="muse-compass-sky-title">{`Your Inner World: ${categories.map((c) => `${count(c)} ${categoryInfo[c].title.replace("My ", "").toLowerCase()}`).join(", ")}.`}</title>
      <defs>
        <radialGradient id="muse-compass-disc" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="var(--compass-core)" stopOpacity=".55" />
          <stop offset=".7" stopColor="var(--compass-core)" stopOpacity=".08" />
          <stop offset="1" stopColor="var(--compass-core)" stopOpacity="0" />
        </radialGradient>
        <filter id="muse-compass-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" /></filter>
      </defs>
      <circle cx={C} cy={C} r={R + 6} fill="url(#muse-compass-disc)" />
      {/* Graticule: rings and spokes, like an old star atlas. */}
      <g className="muse-compass-graticule" aria-hidden="true">
        {[R, R * 0.74, R * 0.48, R * 0.22].map((r) => <circle key={r} cx={C} cy={C} r={r} />)}
        <circle cx={C} cy={C} r={R + 6} className="muse-compass-rim" />
        {categories.map((_, i) => { const a = angleOf(i) - SECTOR / 2; return <line key={i} x1={C + Math.cos(a) * 14} y1={C + Math.sin(a) * 14} x2={C + Math.cos(a) * (R + 6)} y2={C + Math.sin(a) * (R + 6)} />; })}
        {Array.from({ length: 72 }, (_, k) => { const a = (k / 72) * Math.PI * 2, long = k % 6 === 0; return <line key={`t${k}`} className="muse-compass-tick" x1={C + Math.cos(a) * (R + 6)} y1={C + Math.sin(a) * (R + 6)} x2={C + Math.cos(a) * (R + (long ? 13 : 9))} y2={C + Math.sin(a) * (R + (long ? 13 : 9))} />; })}
      </g>
      {/* Sectors open each collection by pointer; the labelled legend below is the keyboard and screen-reader way in. */}
      {categories.map((c, i) => <g key={c} className="muse-compass-sector" data-category={c} style={{ ["--sector-ink" as string]: `var(--chart-${categoryInfo[c].tone})` }} onClick={() => onPick(c)}>
        <path d={`M${C} ${C} L${C + Math.cos(angleOf(i) - SECTOR / 2) * R} ${C + Math.sin(angleOf(i) - SECTOR / 2) * R} ${arc(i, R).replace(/^M[^A]+/, "")} Z`} className="muse-compass-wedge" />
        <path d={arc(i, R + 3)} className="muse-compass-arc" />
        <path id={`muse-compass-label-${c}`} d={labelArc(i, Math.sin(angleOf(i)) > 0.01 ? R + 22 : R + 17)} fill="none" stroke="none" />
        <text className="muse-compass-label" aria-hidden="true"><textPath href={`#muse-compass-label-${c}`} startOffset="50%" textAnchor="middle">{categoryInfo[c].title.replace("My ", "").toUpperCase()}<tspan className="muse-compass-label-n" dx="6">{count(c)}</tspan></textPath></text>
      </g>)}
      <g aria-hidden="true" className="muse-compass-lines">{lines.map((l) => <line key={l.key} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} />)}</g>
      <g aria-hidden="true" className="muse-compass-stars">
        {stars.map(({ d, x, y }, n) => <g key={d.id} transform={`translate(${x} ${y})`} className="muse-compass-star" data-favorite={d.favorite || undefined} data-evolved={!!d.evolvedAt || undefined} style={{ ["--star-ink" as string]: `var(--chart-${categoryInfo[d.category].tone})`, ["--n" as string]: n % 9 }}>
          <circle r={d.favorite ? 5 : 3.2} className="muse-compass-star-halo" filter="url(#muse-compass-glow)" />
          <path d={d.favorite ? "M0-6.5C.8-.8.8-.8 6.5 0C.8.8.8.8 0 6.5C-.8.8-.8.8-6.5 0C-.8-.8-.8-.8 0-6.5Z" : "M0-4C.5-.5.5-.5 4 0C.5.5.5.5 0 4C-.5.5-.5.5-4 0C-.5-.5-.5-.5 0-4Z"} className="muse-compass-star-core" />
          {d.evolvedAt && <circle r={8} className="muse-compass-star-ring" />}
        </g>)}
      </g>
      {/* The compass rose at the centre: four long points, four short, in the Muse star shape. */}
      <g aria-hidden="true" className="muse-compass-rose" transform={`translate(${C} ${C})`}>
        <path d="M0-26C2.2-4 4-2.2 26 0C4 2.2 2.2 4 0 26C-2.2 4-4 2.2-26 0C-4-2.2-2.2-4 0-26Z" />
        <path d="M0-26C2.2-4 4-2.2 26 0C4 2.2 2.2 4 0 26C-2.2 4-4 2.2-26 0C-4-2.2-2.2-4 0-26Z" transform="rotate(45) scale(.55)" className="muse-compass-rose-minor" />
        <circle r="3" />
      </g>
    </svg>
  </figure>;
}
