"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { MuseMark, type MuseMarkIcon } from "@/components/design/MuseHeading";
import { MuseIcon } from "../MuseIcon";
import { dayLabel, fieldValue, presetOf, sectionGlyph, type CardData, type ListBlock } from "@/lib/lists/blocks";
import type { ListItem, ListSection, MuseList } from "@/lib/lists/model";
import { shiftDate } from "@/lib/dates";
import { SpaceImg, usePhotoUpload } from "./SpaceMedia";
import { releaseImages, updateList } from "./ListsStore";

type Tone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const sectionAnchor = (id: string | null) => `space-section-${id ?? "top"}`;
export const blockAnchor = (id: string) => `space-block-${id}`;
const jump = (id: string) => { const el = document.getElementById(id); if (!el) return; el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); el.classList.add("muse-space-flash"); window.setTimeout(() => el.classList.remove("muse-space-flash"), 1400); };

/**
 * Section tiles: shortcuts down the same page (never separate pages). They stay within reach while scrolling and
 * light the section you're in. Shown once a space has three or more sections.
 */
export function SpaceNav({ sections, blocks, items }: { sections: ListSection[]; blocks: ListBlock[]; items: ListItem[] }) {
  const [current, setCurrent] = useState<string | null>(null);
  const ids = sections.map((s) => s.id).join("|");
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(sectionAnchor(s.id))).filter((x): x is HTMLElement => !!x);
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const seen = new Map<string, number>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : Infinity);
      const top = [...seen.entries()].filter(([, y]) => y !== Infinity).sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]))[0];
      if (top) setCurrent(top[0].replace("space-section-", ""));
    }, { rootMargin: "-90px 0px -55% 0px" });
    els.forEach((el) => io.observe(el)); return () => io.disconnect();
  }, [ids]); // eslint-disable-line react-hooks/exhaustive-deps
  return <nav className="muse-space-nav" aria-label="Sections in this space">
    <ol>{sections.map((s, i) => {
      const its = items.filter((x) => x.sectionId === s.id), bl = blocks.filter((b) => b.sectionId === s.id && !b.virtual);
      const count = its.length + bl.filter((b) => b.kind !== "checklist" && b.kind !== "heading").length;
      return <li key={s.id}><button type="button" aria-current={current === s.id ? "location" : undefined} onClick={() => jump(sectionAnchor(s.id))}>
        <MuseMark icon={sectionGlyph(bl, its.length) as MuseMarkIcon} tone={((i % 8) + 1) as Tone} size="sm" />
        <span>{s.title}</span>{count > 0 && <small>{count}</small>}
      </button></li>;
    })}</ol>
  </nav>;
}

type Mark = { id: string; day: string; icon: MuseMarkIcon; tone: Tone; label: string };
/**
 * The trip at a glance, drawn from the cards' own dates (nothing new is stored): where you sleep each night, rides and
 * reservations on their days, and the nights that have no stay yet. Appears once two or more cards carry dates.
 */
export function JourneyRibbon({ list, blocks }: { list: MuseList; blocks: ListBlock[] }) {
  const cards = blocks.filter((b) => b.kind === "card").map((b) => ({ b, c: b.data as CardData }));
  const iso = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
  const stays = cards.filter(({ c }) => c.preset === "stay").map(({ b, c }) => ({ id: b.id, from: iso(fieldValue(c, "checkin")), to: iso(fieldValue(c, "checkout")), label: c.title || "Stay" })).filter((s) => s.from && s.to && s.to > s.from);
  const marks: Mark[] = cards.flatMap(({ b, c }): Mark[] => {
    const p = presetOf(c.preset), day = iso(fieldValue(c, c.preset === "place" ? "when" : "date"));
    if (!day || c.preset === "stay") return [];
    const label = p.shape === "route" ? `${fieldValue(c, "from") || "?"} → ${fieldValue(c, "to") || "?"}` : c.title || p.label;
    return [{ id: b.id, day, icon: p.icon as MuseMarkIcon, tone: p.tone as Tone, label }];
  });
  const days = [...stays.flatMap((s) => [s.from, s.to]), ...marks.map((m) => m.day), list.startDate ?? "", list.endDate ?? ""].filter(Boolean).sort();
  if (stays.length + marks.length < 2 || !days.length) return null;
  const start = days[0], end = days[days.length - 1], span = Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86400000) + 1;
  if (span < 2 || span > 60) return null;
  // Two grid columns per day, so a stay runs from the middle of its check-in day to the middle of its check-out day.
  const all = Array.from({ length: span }, (_, i) => shiftDate(start, i)), col = (d: string) => all.indexOf(d) * 2 + 1;
  // Nights between the first arrival and the last departure with no stay covering them.
  const firstNight = stays.length ? stays.map((s) => s.from).sort()[0] : null, lastNight = stays.length ? stays.map((s) => s.to).sort().at(-1)! : null;
  const tripEnd = list.endDate && lastNight && list.endDate > lastNight ? list.endDate : lastNight;
  const open = firstNight && tripEnd ? all.filter((d) => d >= firstNight && d < tripEnd && !stays.some((s) => d >= s.from && d < s.to)) : [];
  return <section className="muse-space-journey" aria-label="Trip timeline" style={{ "--days": span } as CSSProperties}>
    <header><MuseMark icon="calendar" tone={3} size="sm" /><strong>Your trip, day by day</strong><small>{dayLabel(start, { month: "short", day: "numeric" })} – {dayLabel(end, { month: "short", day: "numeric" })} · {span} days{open.length > 0 && <> · <span className="muse-space-journey-warn">{open.length} night{open.length === 1 ? "" : "s"} without a stay</span></>}</small></header>
    <div className="muse-space-journey-scroll">
      <div className="muse-space-journey-grid">
        {all.map((d, i) => <span key={d} className="muse-space-journey-day" style={{ gridColumn: `${i * 2 + 1} / span 2` }} data-weekend={[0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay()) || undefined}>
          <small>{dayLabel(d, { weekday: "narrow" })}</small><b>{Number(d.slice(8))}</b>{(i === 0 || d.endsWith("-01")) && <em>{dayLabel(d, { month: "short" })}</em>}</span>)}
        {stays.map((s, i) => <button key={s.id} type="button" className="muse-space-journey-stay" data-alt={i % 2 || undefined} style={{ gridColumn: `${col(s.from) + 1} / ${col(s.to) + 1}` }} onClick={() => jump(blockAnchor(s.id))} title={s.label}><MuseIcon name="moon" size={11} /><span>{s.label}</span></button>)}
        {open.map((d) => <span key={`o${d}`} className="muse-space-journey-open" style={{ gridColumn: `${col(d) + 1} / span 2` }} title={`No stay on the night of ${dayLabel(d)}`} aria-label={`No stay on the night of ${dayLabel(d)}`} />)}
        {all.map((d) => { const here = marks.filter((m) => m.day === d); return here.length ? <span key={`m${d}`} className="muse-space-journey-marks" style={{ gridColumn: `${col(d)} / span 2` }}>
          {here.map((m) => <button key={m.id} type="button" onClick={() => jump(blockAnchor(m.id))} title={`${m.label} · ${dayLabel(m.day)}`} aria-label={`${m.label}, ${dayLabel(m.day)}`}><MuseMark icon={m.icon} tone={m.tone} size="sm" /></button>)}
        </span> : null; })}
      </div>
    </div>
  </section>;
}

/** Days until a dated space begins, or which day of it this is. */
export function countdown(list: MuseList, today: string) {
  if (!list.startDate) return null;
  const d = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
  const until = d(today, list.startDate);
  if (until > 1) return `in ${until} days`;
  if (until === 1) return "tomorrow";
  if (list.endDate && today <= list.endDate) return `day ${d(list.startDate, today) + 1} of ${d(list.startDate, list.endDate) + 1}`;
  if (!list.endDate && until === 0) return "today";
  return null;
}

/** Cover photo controls for List settings: add, change, frame (up/down) and remove. */
export function CoverSettings({ list }: { list: MuseList }) {
  const cover = list.cover;
  const up = usePhotoUpload(list.id, ([img]) => { const old = list.cover?.image; void updateList(list.id, { cover: { image: img, focus: 50 } }).then(() => old && releaseImages([old])); });
  if (cover === undefined) return null;
  return <div className="muse-space-cover-settings" {...up.dropProps}>
    {up.picker}
    <p className="editor-label">Cover photo</p>
    {cover ? <>
      <div className="muse-space-cover-preview" style={{ "--focus": `${cover.focus}%` } as CSSProperties}><SpaceImg image={cover.image} thumb alt="" /></div>
      <label className="muse-space-focus">Framing<input type="range" min={0} max={100} value={cover.focus} onChange={(e) => void updateList(list.id, { cover: { ...cover, focus: Number(e.target.value) } })} /></label>
      <span className="muse-space-edit-foot"><button type="button" className="muse-button button-ghost" onClick={up.choose}><MuseIcon name="photo" size={14} /> {up.busy ? "Adding…" : "Change"}</button>
        <button type="button" className="muse-button button-ghost" onClick={() => { const old = cover.image; void updateList(list.id, { cover: null }).then(() => releaseImages([old])); }}><MuseIcon name="close" size={13} /> Remove</button></span>
    </> : <button type="button" className="muse-button button-ghost" onClick={up.choose}><MuseIcon name="photo" size={14} /> {up.busy ? "Adding…" : "Add a cover photo"}</button>}
    {up.error && <p className="field-error" role="alert">{up.error}</p>}
  </div>;
}
