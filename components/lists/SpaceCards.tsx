"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MuseMark } from "@/components/design/MuseHeading";
import type { MuseMarkIcon } from "@/components/design/MuseHeading";
import { MuseIcon } from "../MuseIcon";
import { BLOCK_LIMITS, cardIsEmpty, clock, dayLabel, fieldValue, money, nextDay, nightsBetween, placeholderFor, presetOf, safeHref, siteName, type CardData, type CardField, type CardFieldType } from "@/lib/lists/blocks";
import { SpaceImg, usePhotoUpload } from "./SpaceMedia";

type Tone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
const fieldTypes: { id: CardFieldType; label: string }[] = [{ id: "text", label: "Text" }, { id: "longtext", label: "Long text" }, { id: "date", label: "Date" }, { id: "time", label: "Time" },
  { id: "number", label: "Number" }, { id: "money", label: "Amount" }, { id: "url", label: "Link" }, { id: "choice", label: "Status" }];

/** How a field's value reads. Links open only when they are real web addresses. */
function Value({ f }: { f: CardField }) {
  const v = f.value.trim();
  if (f.type === "date") return <>{dayLabel(v)}</>;
  if (f.type === "time") return <>{clock(v)}</>;
  if (f.type === "money") return <>{money(v)}</>;
  if (f.type === "url") { const href = safeHref(v); return href ? <a href={href} target="_blank" rel="noopener noreferrer">{siteName(href)} <MuseIcon name="arrow" size={10} /></a> : <>{v}</>; }
  if (f.type === "choice") return <span className="muse-space-status" data-status={v.toLowerCase().replace(/\s+/g, "-")}>{v}</span>;
  return <>{v}</>;
}

/**
 * One information card. Reading shows the card's shape (a route reads like a boarding pass, a stay shows its nights,
 * a measurement is drawn); anything the shape doesn't place is listed as labelled details, so custom fields always show.
 */
export function SpaceCard({ blockId, data, editing, number, onSave, onEditing }: { blockId: string; data: CardData; editing: boolean; /** Places are numbered in order. */ number?: number; onSave: (d: CardData) => unknown; onEditing: (v: boolean) => void }) {
  if (editing) return <CardEditor blockId={blockId} data={data} onSave={onSave} onDone={() => onEditing(false)} />;
  const p = presetOf(data.preset);
  if (cardIsEmpty(data)) return <button type="button" className="muse-space-card-ghost" onClick={() => onEditing(true)} data-shape={p.shape}>
    <MuseMark icon={p.icon as MuseMarkIcon} tone={p.tone as Tone} size="md" /><span><strong>Add {p.add.toLowerCase()} details</strong><small>{p.detail}</small></span><MuseIcon name="plus" size={16} />
  </button>;
  const v = (id: string) => fieldValue(data, id), used = new Set<string>();
  const take = (...ids: string[]) => { ids.forEach((i) => used.add(i)); return ids.map(v); };
  let body: ReactNode = null;
  if (p.shape === "route") {
    const [from, fromPlace, to, toPlace, date, departs, arrives, carrier] = take("from", "fromPlace", "to", "toPlace", "date", "departs", "arrives", "carrier");
    body = <div className="muse-space-route">
      <div className="muse-space-route-ends">
        <span><b>{from || "—"}</b>{fromPlace && <small>{fromPlace}</small>}</span>
        <span className="muse-space-route-path" aria-hidden="true"><i /><MuseIcon name={data.preset === "flight" ? "plane" : "arrow"} size={15} /><i /></span>
        <span><b>{to || "—"}</b>{toPlace && <small>{toPlace}</small>}</span>
      </div>
      {(date || departs || arrives) && <p className="muse-space-route-when">{date && <span>{dayLabel(date)}</span>}{(departs || arrives) && <span>{clock(departs)}{arrives && <> — {clock(arrives)}{nextDay(departs, arrives) && <sup>+1</sup>}</>}</span>}</p>}
      {carrier && <p className="muse-space-carrier">{carrier}</p>}
    </div>;
  } else if (p.shape === "stay") {
    const [address, checkin, checkout] = take("address", "checkin", "checkout"), nights = nightsBetween(checkin, checkout);
    body = <>{address && <p className="muse-space-address"><MuseIcon name="map-pin" size={13} />{address}</p>}
      {(checkin || checkout) && <div className="muse-space-stay">
        <span><small>Check-in</small><b>{checkin ? dayLabel(checkin, { weekday: "short" }) : "—"}</b><em>{checkin ? dayLabel(checkin, { month: "short", day: "numeric" }) : ""}</em></span>
        <span className="muse-space-nights" aria-label={nights > 0 ? `${nights} night${nights === 1 ? "" : "s"}` : undefined}>{nights > 0 && <>{Array.from({ length: Math.min(nights, 7) }, (_, i) => <i key={i} aria-hidden="true" />)}<small>{nights} night{nights === 1 ? "" : "s"}</small></>}</span>
        <span><small>Check-out</small><b>{checkout ? dayLabel(checkout, { weekday: "short" }) : "—"}</b><em>{checkout ? dayLabel(checkout, { month: "short", day: "numeric" }) : ""}</em></span>
      </div>}</>;
  } else if (p.shape === "event") {
    const [date, time, address] = take("date", "time", "address");
    body = <div className="muse-space-event">{date && <span className="muse-space-datetile"><small>{dayLabel(date, { month: "short" })}</small><b>{dayLabel(date, { day: "numeric" })}</b><small>{dayLabel(date, { weekday: "short" })}</small></span>}
      <span>{time && <b>{clock(time)}</b>}{address && <span className="muse-space-address"><MuseIcon name="map-pin" size={13} />{address}</span>}</span></div>;
  } else if (p.shape === "measure") {
    const [w, hgt, d] = take("width", "height", "depth");
    body = <div className="muse-space-measure"><svg viewBox="0 0 120 80" aria-hidden="true" focusable="false"><rect x="22" y="12" width="80" height="50" rx="3" /><path d="M22 72h80M22 69v6M102 69v6M10 12v50M7 12h6M7 62h6" /></svg>
      <dl>{w && <div><dt>W</dt><dd>{w}</dd></div>}{hgt && <div><dt>H</dt><dd>{hgt}</dd></div>}{d && <div><dt>D</dt><dd>{d}</dd></div>}</dl></div>;
  } else if (p.shape === "place") {
    const [about, address] = take("about", "address");
    body = <>{about && <p className="muse-space-about">{about}</p>}{address && <p className="muse-space-address"><MuseIcon name="map-pin" size={13} />{address}</p>}</>;
  } else if (p.shape === "item") {
    const [price, status] = take("price", "status");
    body = (price || status) ? <p className="muse-space-price">{price && <b>{money(price)}</b>}{status && <span className="muse-space-status" data-status={status.toLowerCase().replace(/\s+/g, "-")}>{status}</span>}</p> : null;
  }
  const costField = data.fields.find((f) => f.type === "money" && !used.has(f.id) && f.value.trim() && (f.id === "cost" || f.id === "price"));
  if (costField) used.add(costField.id);
  const notes = data.fields.filter((f) => f.type === "longtext" && !used.has(f.id) && f.value.trim());
  notes.forEach((f) => used.add(f.id));
  const rest = data.fields.filter((f) => !used.has(f.id) && f.value.trim());
  const ticket = p.shape === "route";
  // A titled card with nothing filled in yet names what it's waiting for.
  const waiting = !body && !rest.length && !notes.length && !data.image ? data.fields.filter((f) => !f.value.trim()).slice(0, 4) : [];
  return <div className="muse-space-card" data-shape={p.shape} data-photo={!!data.image || undefined} onDoubleClick={() => onEditing(true)}>
    {data.image && <div className="muse-space-card-photo"><SpaceImg image={data.image} thumb={p.shape !== "place"} alt={data.title} />{number !== undefined && <span className="muse-space-pin"><b>{number}</b></span>}</div>}
    <div className="muse-space-card-body">
      <header className="muse-space-card-head">
        {!data.image && number !== undefined ? <span className="muse-space-pin" data-inline><b>{number}</b></span> : <MuseMark icon={p.icon as MuseMarkIcon} tone={p.tone as Tone} size="sm" />}
        <span className="muse-space-card-titles"><small>{p.label}</small>{data.title && <strong>{data.title}</strong>}</span>
        {costField && <span className="muse-space-cost">{money(costField.value)}</span>}
      </header>
      {body}
      {ticket && (rest.length > 0 || notes.length > 0) && <hr className="muse-space-perf" />}
      {waiting.length > 0 && <button type="button" className="muse-space-card-todo" onClick={() => onEditing(true)}><MuseIcon name="plus" size={12} />Add {waiting.map((f) => f.label.toLowerCase()).join(", ")}</button>}
      {rest.length > 0 && <dl className="muse-space-details">{rest.map((f) => <div key={f.id}><dt>{f.label}</dt><dd><Value f={f} /></dd></div>)}</dl>}
      {notes.map((f) => <div key={f.id} className="muse-space-card-notes"><small>{f.label}</small><p>{f.value}</p></div>)}
    </div>
  </div>;
}

/** Editing a card: the title, each labelled field (rename, change, remove), new fields, and an optional photo. Saves as you type. */
function CardEditor({ blockId, data, onSave, onDone }: { blockId: string; data: CardData; onSave: (d: CardData) => unknown; onDone: () => void }) {
  const p = presetOf(data.preset), [draft, setDraft] = useState(data), timer = useRef<number | null>(null), latest = useRef(data);
  const [adding, setAdding] = useState({ label: "", type: "text" as CardFieldType });
  const flush = () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null; void onSave(latest.current); } };
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const change = (next: CardData, now = false) => { setDraft(next); latest.current = next; if (timer.current) window.clearTimeout(timer.current); if (now) { timer.current = null; void onSave(next); } else timer.current = window.setTimeout(flush, 500); };
  const setField = (id: string, patch: Partial<CardField>) => change({ ...draft, fields: draft.fields.map((f) => f.id === id ? { ...f, ...patch } : f) });
  const up = usePhotoUpload(blockId, ([img]) => change({ ...latest.current, image: img }, true));
  const addField = () => {
    const label = adding.label.trim(); if (!label || draft.fields.length >= BLOCK_LIMITS.fields) return;
    const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "field";
    const id = draft.fields.some((f) => f.id === base) ? `${base}-${draft.fields.length + 1}` : base;
    change({ ...draft, fields: [...draft.fields, { id, label: label.slice(0, BLOCK_LIMITS.fieldLabel), type: adding.type, value: "", ...(adding.type === "choice" ? { options: ["To do", "Done"] } : {}) }] }, true);
    setAdding({ label: "", type: "text" });
  };
  return <form className="muse-space-card-edit" onSubmit={(e) => { e.preventDefault(); flush(); onDone(); }} {...up.dropProps}>
    {up.picker}
    <header className="muse-space-card-head"><MuseMark icon={p.icon as MuseMarkIcon} tone={p.tone as Tone} size="sm" /><span className="muse-space-card-titles"><small>{p.label}</small></span></header>
    <label className="muse-space-field" data-wide><span>{p.titleLabel}</span><input autoFocus value={draft.title} maxLength={BLOCK_LIMITS.title} placeholder={p.titlePlaceholder} onChange={(e) => change({ ...draft, title: e.target.value })} /></label>
    <div className="muse-space-fields">
      {draft.fields.map((f) => <div key={f.id} className="muse-space-field" data-wide={f.type === "longtext" || undefined}>
        <input className="muse-space-field-label" value={f.label} maxLength={BLOCK_LIMITS.fieldLabel} aria-label={`Name of the ${f.label} field`} onChange={(e) => setField(f.id, { label: e.target.value })} />
        <span className="muse-space-field-row">
          {f.type === "longtext" ? <textarea rows={2} value={f.value} maxLength={BLOCK_LIMITS.longValue} placeholder={placeholderFor(draft.preset, f.id)} aria-label={f.label} onChange={(e) => setField(f.id, { value: e.target.value })} />
            : <input type={f.type === "date" ? "date" : f.type === "time" ? "time" : f.type === "number" ? "number" : f.type === "url" ? "url" : "text"} inputMode={f.type === "money" ? "decimal" : undefined}
              list={f.type === "choice" ? `${blockId}-${f.id}-options` : undefined} value={f.value} maxLength={BLOCK_LIMITS.fieldValue} placeholder={placeholderFor(draft.preset, f.id) ?? (f.type === "money" ? "0.00" : f.type === "url" ? "https://…" : "")} aria-label={f.label}
              onChange={(e) => setField(f.id, { value: e.target.value })} />}
          {f.type === "choice" && <datalist id={`${blockId}-${f.id}-options`}>{(f.options ?? []).map((o) => <option key={o} value={o} />)}</datalist>}
          <button type="button" className="muse-lists-mini" aria-label={`Remove the ${f.label} field`} onClick={() => change({ ...draft, fields: draft.fields.filter((x) => x.id !== f.id) }, true)}><MuseIcon name="close" size={12} /></button>
        </span>
      </div>)}
    </div>
    {draft.fields.length < BLOCK_LIMITS.fields && <div className="muse-space-addfield">
      <input value={adding.label} maxLength={BLOCK_LIMITS.fieldLabel} placeholder="Add a field (Seat, Gate, Colour…)" aria-label="New field name" onChange={(e) => setAdding({ ...adding, label: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addField(); } }} />
      <select value={adding.type} aria-label="New field type" onChange={(e) => setAdding({ ...adding, type: e.target.value as CardFieldType })}>{fieldTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
      <button type="button" className="muse-button button-ghost" disabled={!adding.label.trim()} onClick={addField}>Add</button>
    </div>}
    <div className="muse-space-edit-foot">
      {draft.image ? <span className="muse-space-edit-photo"><SpaceImg image={draft.image} thumb alt="" /><button type="button" className="muse-button button-ghost" onClick={() => change({ ...draft, image: undefined }, true)}><MuseIcon name="close" size={13} /> Remove photo</button></span>
        : <button type="button" className="muse-button button-ghost" onClick={up.choose}><MuseIcon name="photo" size={14} /> {up.busy ? "Adding…" : "Add a photo"}</button>}
      <button type="submit" className="muse-button muse-space-done">Done</button>
    </div>
    {up.error && <p className="field-error" role="alert">{up.error}</p>}
  </form>;
}
