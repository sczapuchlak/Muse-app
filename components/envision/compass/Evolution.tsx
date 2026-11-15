"use client";
import { useMemo, useState } from "react";
import { MuseSegmented } from "@/components/design/MuseSegmented";
import { categoryInfo } from "@/lib/inner-compass/categories";
import type { Discovery, Version } from "@/lib/inner-compass/model";
import type { Compass } from "./useInnerCompass";
import { CategoryMark, EvolvedRing, ink, plural, shortDate } from "./parts";

type Event = { id: string; date: string; kind: "added" | "evolved"; d: Discovery | null; v?: Version; label: string };
const monthLabel = (iso: string) => new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T12:00:00Z`));

/**
 * Personal evolution: every discovery as it arrived and every recorded change in understanding, newest first,
 * grouped by month. Earlier words are shown as earlier, never as wrong.
 */
export function Evolution({ compass, onOpen }: { compass: Compass; onOpen: (id: string) => void }) {
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
  return <section className="muse-compass-evolution" aria-labelledby="compass-evolution-title">
    <header className="muse-compass-collection-head">
      <div><p className="muse-kicker"><EvolvedRing /> Personal evolution</p><h2 id="compass-evolution-title" className="muse-compass-collection-title">How I’ve been changing</h2>
        <p className="muse-compass-collection-line">Each discovery as it arrived, and each time your understanding moved. Growth isn’t a straight line, so this isn’t one either.</p></div>
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
  </section>;
}
