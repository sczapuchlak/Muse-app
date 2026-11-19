import { MUSE_STAR_PATH } from "../MuseStar";
import { weekdayShort } from "./format";
import "./JournalArt.css";

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

/**
 * MonthSky: a month as a small calendar of stars, weekday letters on top (Monday first) like any calendar. Days you
 * wrote are lit stars; written days side by side in the same week are joined, so a streak draws a constellation. Today
 * wears a ring, and the day the review opens (the last day) a dashed goal ring while it's still ahead.
 */
export function MonthSky({ start, end, written, today, goal }: { start: string; end: string; written: ReadonlySet<string>; today: string; goal: boolean }) {
  const first = new Date(`${start}T12:00:00Z`), n = Number(end.slice(8, 10)), offset = (first.getUTCDay() + 6) % 7;
  const days = Array.from({ length: n }, (_, i) => `${start.slice(0, 8)}${String(i + 1).padStart(2, "0")}`);
  const at = (i: number) => { const k = offset + i; return { x: 14 + (k % 7) * 30, y: 30 + Math.floor(k / 7) * 20 }; };
  const rows = Math.ceil((offset + n) / 7), lit = days.map((d, i) => ({ d, i, on: written.has(d) })).filter((x) => x.on);
  return <svg className="mj-constellation mj-sky" viewBox={`0 0 212 ${rows * 20 + 26}`} role="img" aria-label={`${lit.length} of ${n} days written`}>
    {["M", "T", "W", "T", "F", "S", "S"].map((w, k) => <text key={k} x={14 + k * 30} y={9} textAnchor="middle">{w}</text>)}
    <line x1="2" y1="16" x2="210" y2="16" className="mj-sky-rule" />
    {lit.slice(1).map((x, k) => { const prev = lit[k]; if (x.i !== prev.i + 1) return null; const a = at(prev.i), b = at(x.i); if (a.y !== b.y) return null;
      return <line key={x.d} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="mj-constellation-line" data-lit />; })}
    {days.map((d, i) => { const { x, y } = at(i), on = written.has(d), h = on ? 15 : 8;
      return <g key={d} className="mj-constellation-star" data-lit={on || undefined} style={{ "--i": i % 12 } as React.CSSProperties}>
        {d === today && <circle cx={x} cy={y} r={8} className="mj-constellation-today" />}
        {goal && d === end && d !== today && <circle cx={x} cy={y} r={8} className="mj-sky-goal" />}
        <path d={MUSE_STAR_PATH} transform={`translate(${x - h * 0.3} ${y - h / 2}) scale(${h / 40})`} />
      </g>; })}
  </svg>;
}

/** YearSky: twelve months rising across an arc, each star sized by how much you wrote; this month ringed. */
export function YearSky({ year, counts, today, goal }: { year: string; counts: number[]; today: string; goal: boolean }) {
  const max = Math.max(1, ...counts), pts = counts.map((_, i) => ({ x: 12 + i * 17.8, y: 40 - Math.sin((i / 11) * Math.PI) * 22 + (i % 2 ? 3 : -2) }));
  const nowMonth = today.slice(0, 4) === year ? Number(today.slice(5, 7)) - 1 : -1;
  return <svg className="mj-constellation mj-sky" viewBox="0 0 220 64" role="img" aria-label={`${counts.filter(Boolean).length} of 12 months written in ${year}`}>
    {pts.slice(1).map((p, i) => <line key={i} x1={pts[i].x} y1={pts[i].y} x2={p.x} y2={p.y} className="mj-constellation-line" data-lit={(counts[i] && counts[i + 1]) || undefined} />)}
    {counts.map((c, i) => { const { x, y } = pts[i], h = c ? 8 + Math.round((c / max) * 10) : 6;
      return <g key={i} className="mj-constellation-star" data-lit={c > 0 || undefined} style={{ "--i": i } as React.CSSProperties}>
        {i === nowMonth && <circle cx={x} cy={y} r={9} className="mj-constellation-today" />}
        {goal && i === 11 && i !== nowMonth && <circle cx={x} cy={y} r={9} className="mj-sky-goal" />}
        <path d={MUSE_STAR_PATH} transform={`translate(${x - h * 0.3} ${y - h / 2}) scale(${h / 40})`} />
        <text x={x} y={62} textAnchor="middle">{"JFMAMJJASOND"[i]}</text>
      </g>; })}
  </svg>;
}

/** A fine-line flourish: two hairlines and a small star, for section breaks and quiet empty states. */
export function StarRule({ className = "" }: { className?: string }) {
  return <span className={`mj-star-rule ${className}`.trim()} aria-hidden="true">
    <span /><svg viewBox="0 0 24 40" width="9" height="15"><path d={MUSE_STAR_PATH} /></svg><span />
  </span>;
}

/** A compact empty state: a tiny constellation, a short line, and an optional action. Never a big illustration. */
export function QuietEmpty({ title, line, kicker, children }: { title: string; line: string; kicker?: string; children?: React.ReactNode }) {
  // A small constellation in the theme's star colours (the same sparkle as the week), centered with one line of words.
  const pts = [{ x: 10, y: 30 }, { x: 34, y: 14 }, { x: 60, y: 22 }, { x: 86, y: 8 }, { x: 110, y: 26 }], size = [9, 15, 10, 18, 8];
  return <div className="mj-quiet">
    <svg className="mj-constellation mj-quiet-sky" viewBox="0 0 120 40" aria-hidden="true">
      {pts.slice(1).map((p, i) => <line key={i} x1={pts[i].x} y1={pts[i].y} x2={p.x} y2={p.y} className="mj-constellation-line" data-lit={i % 2 === 0 || undefined} />)}
      {pts.map((p, i) => <g key={i} className="mj-constellation-star" data-lit style={{ "--i": i } as React.CSSProperties}><path d={MUSE_STAR_PATH} transform={`translate(${p.x - size[i] * 0.3} ${p.y - size[i] / 2}) scale(${size[i] / 40})`} /></g>)}
    </svg>
    {kicker && <p className="mj-quiet-kicker type-meta">{kicker}</p>}
    <p className="mj-quiet-title type-quote">{title}</p>
    <p className="mj-quiet-line">{line}</p>
    {children && <div className="mj-quiet-action">{children}</div>}
  </div>;
}
