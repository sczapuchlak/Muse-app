import { MUSE_STAR_PATH } from "../MuseStar";
import { weekdayShort } from "./format";

/**
 * Journal's only drawings, in the shared fine-line star vocabulary. No book, no clip art: the art is information.
 *
 * WeekConstellation: the seven days of this week as stars. A day you wrote is a lit Muse star; consecutive written
 * days are joined by a fine line, so a streak literally draws a constellation. Today wears a soft ring.
 */
export function WeekConstellation({ days, written, today }: { days: string[]; written: ReadonlySet<string>; today: string }) {
  // A gentle arc, like stars rising across the sky.
  const pts = days.map((_, i) => ({ x: 14 + i * 32, y: 40 - Math.sin((i / 6) * Math.PI) * 22 + (i % 2 ? 4 : -2) }));
  const lit = days.map((d) => written.has(d));
  const label = `This week: ${days.filter((d) => written.has(d)).length} of 7 days written`;
  return <svg className="mj-constellation" viewBox="0 0 220 64" role="img" aria-label={label}>
    {pts.slice(1).map((p, i) => <line key={i} x1={pts[i].x} y1={pts[i].y} x2={p.x} y2={p.y} className="mj-constellation-line" data-lit={(lit[i] && lit[i + 1]) || undefined} />)}
    {days.map((d, i) => {
      const { x, y } = pts[i], on = lit[i], h = on ? 15 : 7;
      return <g key={d} className="mj-constellation-star" data-lit={on || undefined} data-today={d === today || undefined} style={{ "--i": i } as React.CSSProperties}>
        {d === today && <circle cx={x} cy={y} r={9} className="mj-constellation-today" />}
        <path d={MUSE_STAR_PATH} transform={`translate(${x - h * 0.3} ${y - h / 2}) scale(${h / 40})`} />
        <text x={x} y={62} textAnchor="middle">{weekdayShort(d).slice(0, 1)}</text>
      </g>;
    })}
  </svg>;
}

/** A fine-line flourish: two hairlines and a small star, for section breaks and quiet empty states. */
export function StarRule({ className = "" }: { className?: string }) {
  return <span className={`mj-star-rule ${className}`.trim()} aria-hidden="true">
    <span /><svg viewBox="0 0 24 40" width="9" height="15"><path d={MUSE_STAR_PATH} /></svg><span />
  </span>;
}

/** A compact empty state: a tiny constellation, a short line, and an optional action. Never a big illustration. */
export function QuietEmpty({ title, line, children }: { title: string; line: string; children?: React.ReactNode }) {
  return <div className="mj-quiet">
    <svg className="mj-quiet-stars" viewBox="0 0 64 28" aria-hidden="true">
      <line x1="8" y1="20" x2="30" y2="8" /><line x1="30" y1="8" x2="56" y2="16" />
      <path d={MUSE_STAR_PATH} transform="translate(5 14) scale(.3)" /><path d={MUSE_STAR_PATH} transform="translate(26 1) scale(.38)" /><path d={MUSE_STAR_PATH} transform="translate(53 11) scale(.24)" />
    </svg>
    <div><p className="mj-quiet-title type-title">{title}</p><p className="mj-quiet-line">{line}</p></div>
    {children && <div className="mj-quiet-action">{children}</div>}
  </div>;
}
