"use client";
import { useMemo, useState } from "react";
import { MuseSegmented } from "@/components/design/MuseSegmented";
import { MuseChoiceMenu } from "@/components/MuseChoiceMenu";
import { categoryInfo } from "@/lib/inner-compass/categories";
import { seeded, sortDiscoveries, type Discovery, type Version } from "@/lib/inner-compass/model";
import type { Compass } from "./useInnerCompass";
import { CategoryMark, EvolvedRing, ink, plural, shortDate } from "./parts";

type Event = { id: string; date: string; kind: "added" | "evolved"; d: Discovery | null; v?: Version; label: string };
const monthLabel = (iso: string) => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));

/**
 * Personal evolution: every discovery as it arrived and every recorded change in understanding, newest first,
 * grouped by month. Earlier words are shown as earlier, never as wrong.
 */
export function Evolution({ compass, onOpen, onEvolve }: { compass: Compass; onOpen: (id: string) => void; onEvolve: (id: string) => void }) {
  const [show, setShow] = useState<"all" | "evolved">("all");
  const events = useMemo(() => {
    const byId = new Map(compass.discoveries.map((d) => [d.id, d]));
    const out: Event[] = [
      ...compass.versions.map((v) => ({ id: v.id, date: v.evolvedOn, kind: "evolved" as const, d: byId.get(v.discoveryId) ?? null, v, label: v.nextTitle })),
      ...(show === "all" ? compass.discoveries.map((d) => ({ id: `a-${d.id}`, date: d.createdAt.slice(0, 10), kind: "added" as const, d, label: compass.versions.filter((v) => v.discoveryId === d.id).sort((a, b) => a.evolvedOn.localeCompare(b.evolvedOn))[0]?.title ?? d.title })) : []),
    ];
    return out.sort((a, b) => b.date.localeCompare(a.date) || (a.kind === "evolved" ? -1 : 1));
  }, [compass.discoveries, compass.versions, show]);
  const months = useMemo(() => { const m = new Map<string, Event[]>(); for (const e of events) { const k = e.date.slice(0, 7); m.set(k, [...(m.get(k) ?? []), e]); } return [...m.entries()]; }, [events]);
  const current = compass.discoveries.filter((d) => !d.archivedAt);
  const firstMonth = [...compass.discoveries].map((d) => d.createdAt.slice(0, 7)).sort()[0];
  const evolvable = sortDiscoveries(current, "recent");
  return <div className="muse-compass-evo">
    <section className="muse-compass-evo-hero" aria-labelledby="compass-evolution-title">
      <div className="muse-compass-evo-hero-copy">
        <p className="muse-kicker"><EvolvedRing /> Personal evolution</p>
        <h2 id="compass-evolution-title">How I’ve been changing</h2>
        <p className="muse-compass-evo-lede">Each discovery as it arrived, and each time your understanding moved. Growth isn’t a straight line, so this isn’t one either.</p>
        <dl className="muse-compass-evo-stats">
          <div><dt>Discoveries</dt><dd className="type-numeric">{current.length}</dd></div>
          <div><dt>Changes of heart</dt><dd className="type-numeric">{compass.versions.length}</dd></div>
          <div><dt>Since</dt><dd className="type-numeric">{firstMonth ? monthLabel(firstMonth) : "Today"}</dd></div>
        </dl>
        {evolvable.length > 0 ? <div className="muse-compass-evo-action">
          <MuseChoiceMenu label="Record an evolution" valueLabel="Record an evolution…" variant="chip" icon="sparkle" searchable selectedIds={[]}
            options={evolvable.map((d) => ({ id: d.id, label: `${categoryInfo[d.category].title.replace("My ", "")} · ${d.title}` }))} onSelect={onEvolve} />
          <p className="muse-compass-quiet">Choose what has changed. Your earlier words stay, exactly as written.</p>
        </div> : <p className="muse-compass-quiet">Your history begins with your first discovery.</p>}
      </div>
      <TimeRings compass={compass} />
    </section>

    <section className="muse-compass-evolution" aria-label="Timeline">
    <header className="muse-compass-evo-archive-head">
      <h3 className="muse-compass-subhead">The timeline</h3>
      <MuseSegmented label="Show" value={show} onChange={setShow} options={[{ id: "all", label: "Everything" }, { id: "evolved", label: `Evolutions · ${compass.versions.length}` }]} />
    </header>
    {!events.length ? <p className="muse-compass-empty-quiet">{show === "evolved" ? "When a belief, a value or a principle changes for you, use Record evolution on it. The earlier words will be kept here." : "Your history begins with your first discovery."}</p>
      : <div className="muse-compass-timeline">{months.map(([k, list]) => <section key={k}>
        <h3 className="muse-compass-timeline-month">{monthLabel(k)} <small className="type-numeric">{plural(list.length, "moment")}</small></h3>
        <ol>{list.map((e) => <li key={e.id} data-kind={e.kind} style={e.d ? ink(e.d.category) : undefined}>
          <span className="muse-compass-timeline-dot" aria-hidden="true">{e.kind === "evolved" ? <EvolvedRing /> : null}</span>
          <div className="muse-compass-timeline-body">
            <p className="muse-compass-timeline-meta">{e.d && <CategoryMark category={e.d.category} />}<span>{e.kind === "evolved" ? "Evolved" : "Discovered"}</span><span className="type-numeric">{shortDate(e.date)}</span>{e.d && <span>{categoryInfo[e.d.category].title}</span>}</p>
            {e.kind === "evolved" && e.v ? <>
              <p className="muse-compass-history-words" data-earlier>{e.v.title}</p>
              <p className="muse-compass-timeline-arrow" aria-hidden="true">became</p>
              {e.d ? <button type="button" className="muse-compass-timeline-open" onClick={() => onOpen(e.d!.id)}><span className="muse-compass-history-words">{e.v.nextTitle}</span></button> : <p className="muse-compass-history-words">{e.v.nextTitle}</p>}
              {e.v.reason && <p className="muse-compass-history-reason"><span>What changed</span> {e.v.reason}</p>}
            </> : e.d ? <button type="button" className="muse-compass-timeline-open" onClick={() => onOpen(e.d!.id)}><span className="muse-compass-history-words">{e.label}</span>{e.d.archivedAt ? <small className="muse-compass-quiet"> · archived</small> : null}</button> : <p className="muse-compass-history-words">{e.label}</p>}
          </div>
        </li>)}</ol>
      </section>)}</div>}
    </section>
  </div>;
}

/**
 * Rings of time: the last months as concentric rings (the newest outermost), each discovery a small star on the ring
 * of the month it arrived and each recorded evolution a ringed star. Decorative, drawn from real dates; never a score.
 */
function TimeRings({ compass }: { compass: Compass }) {
  const marks = useMemo(() => [
    ...compass.discoveries.map((d) => ({ id: d.id, month: d.createdAt.slice(0, 7), evolved: false, tone: categoryInfo[d.category].tone })),
    ...compass.versions.map((v) => { const d = compass.discoveries.find((x) => x.id === v.discoveryId); return { id: v.id, month: v.evolvedOn.slice(0, 7), evolved: true, tone: d ? categoryInfo[d.category].tone : 2 }; }),
  ], [compass.discoveries, compass.versions]);
  // The last six months, always: evenly spaced rings (the newest outermost), labelled even when quiet.
  const latest = [...marks.map((m) => m.month)].sort().at(-1) ?? new Date().toISOString().slice(0, 7);
  const months = Array.from({ length: 6 }, (_, i) => { const [y, mo] = latest.split("-").map(Number), d = new Date(Date.UTC(y, mo - 1 - (5 - i), 1)); return d.toISOString().slice(0, 7); });
  const C = 160, inner = 40, step = 22;
  const r = (m: string) => inner + months.indexOf(m) * step;
  return <figure className="muse-compass-evo-rings" aria-hidden="true">
    <svg viewBox="0 0 320 320">
      <defs><radialGradient id="muse-evo-glow"><stop offset="0" stopColor="var(--accent-secondary)" stopOpacity=".35" /><stop offset="1" stopColor="var(--accent-secondary)" stopOpacity="0" /></radialGradient></defs>
      <circle cx={C} cy={C} r="158" fill="url(#muse-evo-glow)" />
      {months.map((m, i) => { const rad = r(m), busy = marks.some((x) => x.month === m); return <g key={m}>
        <circle cx={C} cy={C} r={rad} className="muse-compass-evo-ring" data-latest={i === months.length - 1 || undefined} data-busy={busy || undefined} />
        <text x={C} y={C - rad - 3} textAnchor="middle" className="muse-compass-evo-ring-label">{monthLabel(m).slice(0, 3)}</text>
      </g>; })}
      {marks.filter((m) => months.includes(m.month)).map((m) => { const a = -Math.PI / 2 + 0.45 + seeded(m.id) * (Math.PI * 2 - 0.9), rad = r(m.month), x = C + Math.cos(a) * rad, y = C + Math.sin(a) * rad;
        return <g key={m.id} transform={`translate(${x} ${y})`} style={{ ["--star-ink" as string]: `var(--chart-${m.tone})` }} className="muse-compass-evo-star">
          <circle r={m.evolved ? 7 : 4.5} className="muse-compass-evo-star-halo" />
          <path d={m.evolved ? "M0-7C.8-.8.8-.8 7 0C.8.8.8.8 0 7C-.8.8-.8.8-7 0C-.8-.8-.8-.8 0-7Z" : "M0-4.4C.5-.5.5-.5 4.4 0C.5.5.5.5 0 4.4C-.5.5-.5.5-4.4 0C-.5-.5-.5-.5 0-4.4Z"} />
          {m.evolved && <circle r="10.5" className="muse-compass-evo-star-ring" />}
        </g>; })}
      <path transform={`translate(${C} ${C})`} className="muse-compass-evo-core" d="M0-16C1.4-2.4 2.4-1.4 16 0C2.4 1.4 1.4 2.4 0 16C-1.4 2.4-2.4 1.4-16 0C-2.4-1.4-1.4-2.4 0-16Z" />
    </svg>
  </figure>;
}
