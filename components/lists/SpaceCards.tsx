"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MuseMark } from "@/components/design/MuseHeading";
import type { MuseMarkIcon } from "@/components/design/MuseHeading";
import { MuseIcon } from "../MuseIcon";
import { lookAttrs } from "./cardLook";
import { EmojiPicker } from "../EmojiPicker";
import { MusePaintPicker } from "../MusePaintPicker";
import { BLOCK_LIMITS, PREVIEW_MAX, applyLookPreset, lookPresets, placeBlocks, type CardLook, cardDisplays, cardIcons, cardIsEmpty, previewFields, type CardDisplay, clock, dayLabel, fieldValue, money, nextDay, nightsBetween, placeholderFor, presetOf, safeHref, siteName, type CardData, type CardField, type CardFieldType, type CardPreset } from "@/lib/lists/blocks";
import { SpaceImg, usePhotoUpload } from "./SpaceMedia";

type Tone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
const fieldTypes: { id: CardFieldType; label: string }[] = [{ id: "text", label: "Text" }, { id: "longtext", label: "Long text" }, { id: "date", label: "Date" }, { id: "time", label: "Time" },
  { id: "number", label: "Number" }, { id: "money", label: "Amount" }, { id: "url", label: "Link" }, { id: "choice", label: "Status" }, { id: "checkbox", label: "Checkbox" }];

/** How a field's value reads. Links open only when they are real web addresses. */
function Value({ f, plain }: { f: CardField; /** Inside a button: no nested link. */ plain?: boolean }) {
  const v = f.value.trim();
  if (f.type === "checkbox") return <span className="muse-space-yes"><MuseIcon name="check" size={11} />Yes</span>;
  if (f.type === "date") return <>{dayLabel(v)}</>;
  if (f.type === "time") return <>{clock(v)}</>;
  if (f.type === "money") return <>{money(v)}</>;
  if (f.type === "url") { const href = safeHref(v); return href && plain ? <>{siteName(href)}</> : href ? <a href={href} target="_blank" rel="noopener noreferrer">{siteName(href)} <MuseIcon name="arrow" size={10} /></a> : <>{v}</>; }
  if (f.type === "choice") return <span className="muse-space-status" data-status={v.toLowerCase().replace(/\s+/g, "-")}>{v}</span>;
  return <>{v}</>;
}

/**
 * One information card. Reading shows the card's shape (a route reads like a boarding pass, a stay shows its nights,
 * a measurement is drawn); anything the shape doesn't place is listed as labelled details, so custom fields always show.
 * Display (Nov 26): a full card; a collapsible card (header + preview fields; the header expands it); or a compact row
 * (one line that opens into the full card). All three are the same record; nothing is lost switching between them.
 */
export function SpaceCard({ blockId, data, editing, number, onSave, onEditing }: { blockId: string; data: CardData; editing: boolean; /** Places are numbered in order. */ number?: number; onSave: (d: CardData) => unknown; onEditing: (v: boolean) => void }) {
  const [open, setOpen] = useState(false);
  if (editing) return <CardEditor blockId={blockId} data={data} onSave={onSave} onDone={() => onEditing(false)} />;
  const p = presetOf(data.preset), icon = data.icon ?? p.icon, kicker = data.template?.name || p.label;
  if (cardIsEmpty(data)) return <button type="button" className="muse-space-card-ghost" onClick={() => onEditing(true)} data-shape={p.shape}>
    <CardIcon icon={icon === "none" ? p.icon : icon} tone={p.tone} size="md" /><span><strong>Add {data.template ? data.template.name : p.add.toLowerCase()} details</strong><small>{data.template ? "From your template" : p.detail}</small></span><MuseIcon name="plus" size={16} />
  </button>;
  // Only offer to expand when something is actually hidden while collapsed.
  const shown = new Set([...previewFields(data).map((b) => b.id), ...(data.aside ? [data.aside] : [])]);
  const hasMore = !!data.image || data.fields.some((f) => f.value.trim() && !shown.has(f.id) && !(shown.has("route") && (f.id === "from" || f.id === "to")));
  const mode = data.display ?? "card", toggle = mode === "card" ? undefined : { open, onToggle: hasMore ? () => setOpen((v) => !v) : undefined };
  if (mode === "row" && !open) return <CompactRow data={data} icon={icon} kicker={kicker} onOpen={hasMore ? () => setOpen(true) : undefined} />;
  return <FullCard data={data} number={number} icon={icon} kicker={kicker} toggle={toggle} onEditing={onEditing} />;
}

/** The card's icon: a Muse icon (gradient tile), an emoji (on its own soft tile), or none. */
export function CardIcon({ icon, tone, size = "sm" }: { icon: string; tone: number; size?: "sm" | "md" }) {
  if (icon === "none") return null;
  if ((cardIcons as readonly string[]).includes(icon)) return <MuseMark icon={icon as MuseMarkIcon} tone={tone as Tone} size={size} />;
  return <span className="muse-space-emoji" data-size={size} aria-hidden="true">{icon}</span>;
}
/** Preview values in one line, joined by dots (labels stay available on hover). */
function PreviewLine({ data, onClick }: { data: CardData; onClick?: () => void }) {
  const bits = previewFields(data).filter((b) => b.id !== data.aside);
  if (!bits.length) return null;
  return <p className="muse-space-preview-line" onClick={onClick ? (e) => { if (!(e.target as HTMLElement).closest("a, input, button, label")) onClick(); } : undefined}>
    {bits.map((b, i) => <span key={b.id} title={b.label}>{i > 0 && <i aria-hidden="true"> · </i>}{b.field ? <Value f={b.field} plain /> : b.text}</span>)}
  </p>;
}
function Aside({ data }: { data: CardData }) {
  const f = data.aside ? data.fields.find((x) => x.id === data.aside && x.value.trim()) : undefined;
  return f ? <span className="muse-space-aside" title={f.label}><Value f={f} plain /></span> : null;
}

/** The callout row: icon, title, a line of preview values, the header field on the right; the whole row opens the card. */
function CompactRow({ data, icon, kicker, onOpen }: { data: CardData; icon: string; kicker: string; onOpen?: () => void }) {
  const p = presetOf(data.preset), inner = <>
    <CardIcon icon={icon} tone={p.tone} />
    <span className="muse-space-row-main"><strong>{data.title || kicker}</strong><PreviewLine data={data} /></span>
    <Aside data={data} />
    {onOpen && <span className="muse-space-chev" aria-hidden="true"><MuseIcon name="chevron" size={14} /></span>}
  </>;
  return onOpen ? <button type="button" className="muse-space-card-row" {...lookAttrs(data)} aria-expanded={false} onClick={onOpen} aria-label={`${data.title || kicker}. Show details`}>{inner}</button>
    : <div className="muse-space-card-row" {...lookAttrs(data)}>{inner}</div>;
}

function FullCard({ data, number, icon, kicker, toggle, onEditing }: { data: CardData; number?: number; icon: string; kicker: string; toggle?: { open: boolean; onToggle?: () => void }; onEditing: (v: boolean) => void }) {
  const p = presetOf(data.preset), collapsed = !!toggle && !toggle.open;
  // The header field (right of the title) is shown once, there; the card body skips it.
  const v = (id: string) => id === data.aside ? "" : fieldValue(data, id), used = new Set<string>(data.aside ? [data.aside] : []);
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
  const costField = data.aside ? undefined : data.fields.find((f) => f.type === "money" && !used.has(f.id) && f.value.trim() && (f.id === "cost" || f.id === "price"));
  if (costField) used.add(costField.id);
  const notes = data.fields.filter((f) => f.type === "longtext" && !used.has(f.id) && f.value.trim());
  notes.forEach((f) => used.add(f.id));
  const rest = data.fields.filter((f) => !used.has(f.id) && f.value.trim());
  const ticket = p.shape === "route";
  // A titled card with nothing filled in yet names what it's waiting for.
  const waiting = !body && !rest.length && !notes.length && !data.image ? data.fields.filter((f) => !f.value.trim()).slice(0, 4) : [];
  const head = <>
    {!data.image && number !== undefined ? <span className="muse-space-pin" data-inline><b>{number}</b></span> : <CardIcon icon={icon} tone={p.tone} />}
    <span className="muse-space-card-titles"><small>{kicker}</small>{data.title && <strong>{data.title}</strong>}</span>
    <Aside data={data} />
    {costField && <span className="muse-space-cost">{money(costField.value)}</span>}
    {toggle?.onToggle && <span className="muse-space-chev" data-open={toggle.open || undefined} aria-hidden="true"><MuseIcon name="chevron" size={14} /></span>}
  </>;
  // Your field layout: "half" fields pair up side by side (a lone one fills its row); unset keeps the automatic grid.
  const laidOut = rest.some((f) => f.width), cells = laidOut ? placeBlocks(rest.filter((f) => f.type !== "checkbox" || f.value).map((f) => ({ ...f, width: f.width === "half" ? "half" as const : "full" as const }))) : [];
  return <div className="muse-space-card" {...lookAttrs(data)} data-shape={p.shape} data-mode={data.display ?? "card"} data-open={toggle?.open || undefined} data-photo={(!!data.image && !collapsed) || undefined} onDoubleClick={() => onEditing(true)}>
    {data.image && !collapsed && <div className="muse-space-card-photo"><SpaceImg image={data.image} thumb={p.shape !== "place"} alt={data.title} />{number !== undefined && <span className="muse-space-pin"><b>{number}</b></span>}</div>}
    <div className="muse-space-card-body">
      {toggle?.onToggle ? <button type="button" className="muse-space-card-head muse-space-card-toggle" aria-expanded={toggle.open} onClick={toggle.onToggle} aria-label={`${data.title || kicker}. ${toggle.open ? "Hide details" : "Show details"}`}>{head}</button>
        : <header className="muse-space-card-head">{head}</header>}
      {collapsed ? <PreviewLine data={data} onClick={toggle?.onToggle} />
        : <div className={toggle ? "muse-space-card-more" : undefined}>
          {body}
          {ticket && (rest.length > 0 || notes.length > 0) && <hr className="muse-space-perf" />}
          {waiting.length > 0 && <button type="button" className="muse-space-card-todo" onClick={() => onEditing(true)}><MuseIcon name="plus" size={12} />Add {waiting.map((f) => f.label.toLowerCase()).join(", ")}</button>}
          {rest.length > 0 && (laidOut ? <dl className="muse-space-details" data-layout>{cells.map((f) => <div key={f.id} data-span={f.span}><dt>{f.label}</dt><dd><Value f={f} /></dd></div>)}</dl>
            : <dl className="muse-space-details">{rest.map((f) => <div key={f.id}><dt>{f.label}</dt><dd><Value f={f} /></dd></div>)}</dl>)}
          {notes.map((f) => <div key={f.id} className="muse-space-card-notes"><small>{f.label}</small><p>{f.value}</p></div>)}
        </div>}
    </div>
  </div>;
}

/** Editing a card: title, icon, how it displays, each field (rename, retype, reorder, fill in, show in preview, remove), new fields and an optional photo. Saves as you type. */
function CardEditor({ blockId, data, onSave, onDone }: { blockId: string; data: CardData; onSave: (d: CardData) => unknown; onDone: () => void }) {
  const p = presetOf(data.preset), [draft, setDraft] = useState(data), timer = useRef<number | null>(null), latest = useRef(data);
  const flush = () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null; void onSave(latest.current); } };
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const change = (next: CardData, now = false) => { setDraft(next); latest.current = next; if (timer.current) window.clearTimeout(timer.current); if (now) { timer.current = null; void onSave(next); } else timer.current = window.setTimeout(flush, 500); };
  const up = usePhotoUpload(blockId, ([img]) => change({ ...latest.current, image: img }, true));
  return <form className="muse-space-card-edit" onSubmit={(e) => { e.preventDefault(); flush(); onDone(); }} {...up.dropProps}>
    {up.picker}
    <header className="muse-space-card-head"><CardIcon icon={draft.icon ?? p.icon} tone={p.tone} /><span className="muse-space-card-titles"><small>{draft.template?.name || p.label}</small></span></header>
    {/* Live preview: exactly how the card reads while collapsed (or in full). */}
    {!cardIsEmpty(draft) && <div className="muse-space-live" aria-label="Preview"><small>Preview</small><SpaceCard blockId={`${blockId}-preview`} data={draft} editing={false} onSave={() => undefined} onEditing={() => undefined} /></div>}
    <label className="muse-space-field" data-wide><span>{p.titleLabel}</span><input autoFocus value={draft.title} maxLength={BLOCK_LIMITS.title} placeholder={p.titlePlaceholder} onChange={(e) => change({ ...latest.current, title: e.target.value })} /></label>
    <CardLook icon={draft.icon ?? p.icon} display={draft.display ?? "card"} onIcon={(icon) => change({ ...latest.current, icon }, true)} onDisplay={(display) => change({ ...latest.current, display: display === "card" ? undefined : display }, true)} />
    <AppearanceEditor look={draft.look} onChange={(look) => change({ ...latest.current, look }, true)} />
    <AsideChoice fields={draft.fields} value={draft.aside} onChange={(aside) => change({ ...latest.current, aside }, true)} />
    <FieldsEditor idBase={blockId} preset={draft.preset} fields={draft.fields} preview={draft.preview ?? []} withValues
      onChange={(update, structural) => { const cur = latest.current, r = update(cur.fields, cur.preview ?? []); change({ ...cur, fields: r.fields, preview: r.preview.length ? r.preview : undefined }, structural); }} />
    <div className="muse-space-edit-foot">
      {draft.image ? <span className="muse-space-edit-photo"><SpaceImg image={draft.image} thumb alt="" /><button type="button" className="muse-button button-ghost" onClick={() => change({ ...latest.current, image: undefined }, true)}><MuseIcon name="close" size={13} /> Remove photo</button></span>
        : <button type="button" className="muse-button button-ghost" onClick={up.choose}><MuseIcon name="photo" size={14} /> {up.busy ? "Adding…" : "Add a photo"}</button>}
      <button type="submit" className="muse-button muse-space-done">Done</button>
    </div>
    {up.error && <p className="field-error" role="alert">{up.error}</p>}
  </form>;
}

/** The card's icon (a Muse icon, an emoji, or none) and how it displays: full card, collapsible, or compact row. */
export function CardLook({ icon, display, onIcon, onDisplay }: { icon: string; display: CardDisplay; onIcon: (icon: string) => void; onDisplay: (d: CardDisplay) => void }) {
  const [picking, setPicking] = useState(false), [emoji, setEmoji] = useState(false), emojiAnchor = useRef<HTMLButtonElement>(null);
  return <div className="muse-space-look">
    <div className="muse-space-field"><span>Shows as</span>
      <div className="muse-segmented muse-space-display" role="group" aria-label="Shows as">{cardDisplays.map((d) => <button key={d.id} type="button" title={d.detail} aria-pressed={display === d.id} onClick={() => onDisplay(d.id)}>{d.label}</button>)}</div></div>
    <div className="muse-space-field"><span>Icon</span>
      <span className="muse-space-icon-row">
        <button type="button" className="muse-space-icon-pick" aria-expanded={picking} aria-label="Choose a Muse icon" onClick={() => setPicking((v) => !v)}>{icon === "none" ? <span className="muse-space-icon-none">None</span> : <CardIcon icon={icon} tone={3} />}<MuseIcon name="chevron" size={12} /></button>
        <button ref={emojiAnchor} type="button" className="muse-button button-ghost muse-space-emoji-pick" aria-label="Use an emoji" onClick={() => setEmoji(true)}>😊 Emoji</button>
        <button type="button" className="text-button" aria-pressed={icon === "none"} onClick={() => onIcon("none")}>No icon</button>
      </span></div>
    {picking && <div className="muse-space-icon-grid" role="group" aria-label="Icons">{cardIcons.map((i) => <button key={i} type="button" aria-pressed={icon === i} aria-label={i} onClick={() => { onIcon(i); setPicking(false); }}><MuseMark icon={i as MuseMarkIcon} tone={((cardIcons.indexOf(i) % 8) + 1) as Tone} size="sm" /></button>)}</div>}
    <EmojiPicker open={emoji} anchorRef={emojiAnchor} onClose={() => setEmoji(false)} onSelect={(e) => { setEmoji(false); if (e) onIcon(e); }} label="Card emoji" />
  </div>;
}

/**
 * Appearance: a starting preset, then the background (theme, colour or gradient from Muse's shared paint picker, with
 * a strength for soft callout tints), the border on its own (left stripe, full outline or none, any colour or
 * gradient), the emoji tile's background, and the title style. Text contrast follows the background automatically.
 */
export function AppearanceEditor({ look, onChange }: { look: CardLook | undefined; onChange: (look: CardLook | undefined) => void }) {
  const l = look ?? {}, set = (patch: Partial<CardLook>) => { const next: CardLook = { ...l, ...patch }; for (const k of Object.keys(next) as (keyof CardLook)[]) if (next[k] === undefined) delete next[k]; onChange(Object.keys(next).length ? next : undefined); };
  const placement = l.border ? l.placement ?? "left" : "none";
  return <details className="muse-space-appearance" open={!!look || undefined}>
    <summary><MuseIcon name="themes" size={14} />Appearance</summary>
    <div className="muse-space-look-presets" role="group" aria-label="Appearance presets">
      {lookPresets.map((p) => <button key={p} type="button" data-look={p} aria-pressed={l.preset === p} onClick={() => onChange(applyLookPreset(p, l))}><i aria-hidden="true" />{p[0].toUpperCase() + p.slice(1)}</button>)}
    </div>
    <MusePaintPicker label="Background" allowDefault defaultLabel="Theme" value={l.bg} onChange={(bg) => set({ bg, preset: undefined })} />
    {l.bg && <label className="muse-space-strength"><span>Strength <small>{l.strength ?? 100}%</small></span><input type="range" min={8} max={100} value={l.strength ?? 100} onChange={(e) => set({ strength: Number(e.target.value) })} /></label>}
    <div className="muse-space-field"><span>Border</span>
      <div className="muse-segmented" role="group" aria-label="Border placement">{([["left", "Left stripe"], ["full", "Full outline"], ["none", "None"]] as const).map(([v, label]) => <button key={v} type="button" aria-pressed={placement === v}
        onClick={() => set(v === "none" ? { placement: "none", border: undefined } : { placement: v, border: l.border ?? { kind: "solid", color: "primary" }, preset: undefined })}>{label}</button>)}</div></div>
    {placement !== "none" && <MusePaintPicker label="Border colour" value={l.border} onChange={(border) => set({ border: border ?? undefined, preset: undefined })} />}
    <MusePaintPicker label="Emoji tile" allowDefault defaultLabel="Soft" value={l.iconBg} onChange={(iconBg) => set({ iconBg })} />
    <div className="muse-space-field"><span>Title</span>
      <div className="muse-segmented" role="group" aria-label="Title style">{(["standard", "editorial"] as const).map((t) => <button key={t} type="button" aria-pressed={(l.title ?? "standard") === t} onClick={() => set({ title: t === "editorial" ? "editorial" : undefined })}>{t === "standard" ? "Standard" : "Editorial"}</button>)}</div></div>
  </details>;
}

/** The field shown on the right of the header (a date, time, price, status…). */
export function AsideChoice({ fields, value, onChange }: { fields: { id: string; label: string; type: CardFieldType }[]; value: string | undefined | null; onChange: (id: string | undefined) => void }) {
  return <label className="muse-space-field muse-space-aside-choice"><span>Right of the title</span>
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)}><option value="">Nothing</option>{fields.filter((f) => f.type !== "longtext").map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select></label>;
}

type EditField = Omit<CardField, "value"> & { value?: string };
/**
 * A card's (or template's) fields: name, type, options for a status, the value (cards only), reorder, remove, and
 * "Show in preview". The preview list underneath keeps its own order (up to six fields).
 */
type FieldsUpdate<F> = (fields: F[], preview: string[]) => { fields: F[]; preview: string[] };
/** `onChange` receives an update applied to the latest fields, so quick successive edits never overwrite each other. */
export function FieldsEditor<F extends EditField>({ idBase, preset, fields, preview, withValues, onChange }: { idBase: string; preset: CardPreset; fields: F[]; preview: string[]; withValues?: boolean; onChange: (update: FieldsUpdate<F>, structural: boolean) => void }) {
  const [adding, setAdding] = useState({ label: "", type: "text" as CardFieldType });
  const set = (id: string, patch: Partial<EditField>, structural = false) => onChange((fs, pv) => ({ fields: fs.map((f) => f.id === id ? { ...f, ...patch } : f), preview: pv }), structural);
  const swap = <T,>(xs: T[], i: number, j: number) => { const c = [...xs]; if (j < 0 || j >= c.length) return c; [c[i], c[j]] = [c[j], c[i]]; return c; };
  const move = (id: string, by: -1 | 1) => onChange((fs, pv) => { const i = fs.findIndex((f) => f.id === id); return { fields: swap(fs, i, i + by), preview: pv }; }, true);
  const movePreview = (id: string, by: -1 | 1) => onChange((fs, pv) => { const i = pv.indexOf(id); return { fields: fs, preview: swap(pv, i, i + by) }; }, true);
  const togglePreview = (id: string) => onChange((fs, pv) => ({ fields: fs, preview: pv.includes(id) ? pv.filter((x) => x !== id) : pv.length >= PREVIEW_MAX ? pv : [...pv, id] }), true);
  const addField = () => {
    const label = adding.label.trim(); if (!label || fields.length >= BLOCK_LIMITS.fields) return;
    const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "field";
    const id = fields.some((f) => f.id === base) ? `${base}-${Date.now().toString(36).slice(-4)}` : base;
    const made = { id, label: label.slice(0, BLOCK_LIMITS.fieldLabel), type: adding.type, ...(withValues ? { value: "" } : {}), ...(adding.type === "choice" ? { options: ["To do", "Done"] } : {}) } as F;
    onChange((fs, pv) => ({ fields: [...fs, made], preview: pv }), true);
    setAdding({ label: "", type: "text" });
  };
  const byId = new Map(fields.map((f) => [f.id, f]));
  return <div className="muse-space-fieldset">
    <ol className="muse-space-fields-list">{fields.map((f, i) => <li key={f.id} className="muse-space-field-item" data-wide={f.type === "longtext" || undefined}>
      <div className="muse-space-field-top">
        <input className="muse-space-field-label" value={f.label} maxLength={BLOCK_LIMITS.fieldLabel} aria-label={`Name of the ${f.label} field`} onChange={(e) => set(f.id, { label: e.target.value })} />
        <select className="muse-space-field-type" value={f.type} aria-label={`Type of the ${f.label} field`} onChange={(e) => set(f.id, { type: e.target.value as CardFieldType, ...(e.target.value === "choice" && !f.options ? { options: ["To do", "Done"] } : {}), ...(withValues ? { value: "" } : {}) }, true)}>
          {fieldTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
        {f.type !== "longtext" && <button type="button" className="muse-space-width-toggle" aria-pressed={f.width === "half"} title={f.width === "half" ? "Side by side with its neighbour" : "Full width"} aria-label={`Show ${f.label} side by side`} onClick={() => set(f.id, { width: f.width === "half" ? "full" : "half" }, true)}><MuseIcon name="columns" size={13} /></button>}
        <button type="button" className="muse-space-preview-toggle" aria-pressed={preview.includes(f.id)} title={preview.includes(f.id) ? "Shown in preview" : "Show in preview"} aria-label={`Show ${f.label} in preview`} onClick={() => togglePreview(f.id)}><MuseIcon name="eye" size={13} /></button>
        <button type="button" className="muse-lists-mini" aria-label={`Move ${f.label} up`} disabled={i === 0} onClick={() => move(f.id, -1)}><span className="muse-list-icon-up"><MuseIcon name="arrow" size={12} /></span></button>
        <button type="button" className="muse-lists-mini" aria-label={`Move ${f.label} down`} disabled={i === fields.length - 1} onClick={() => move(f.id, 1)}><span className="muse-list-icon-down"><MuseIcon name="arrow" size={12} /></span></button>
        <button type="button" className="muse-lists-mini" aria-label={`Remove the ${f.label} field`} onClick={() => onChange((fs, pv) => ({ fields: fs.filter((x) => x.id !== f.id), preview: pv.filter((x) => x !== f.id) }), true)}><MuseIcon name="close" size={12} /></button>
      </div>
      {f.type === "choice" && <input className="muse-space-field-options" value={(f.options ?? []).join(", ")} aria-label={`Choices for ${f.label}`} placeholder="Choices, comma separated"
        onChange={(e) => set(f.id, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean).slice(0, 12) })} />}
      {withValues && (f.type === "longtext" ? <textarea rows={2} value={f.value ?? ""} maxLength={BLOCK_LIMITS.longValue} placeholder={placeholderFor(preset, f.id)} aria-label={f.label} onChange={(e) => set(f.id, { value: e.target.value })} />
        : f.type === "checkbox" ? <label className="muse-check-row"><input type="checkbox" checked={f.value === "true"} onChange={(e) => set(f.id, { value: e.target.checked ? "true" : "" })} />{f.label}</label>
        : <input type={f.type === "date" ? "date" : f.type === "time" ? "time" : f.type === "number" ? "number" : f.type === "url" ? "url" : "text"} inputMode={f.type === "money" ? "decimal" : undefined}
          list={f.type === "choice" ? `${idBase}-${f.id}-options` : undefined} value={f.value ?? ""} maxLength={BLOCK_LIMITS.fieldValue} placeholder={placeholderFor(preset, f.id) ?? (f.type === "money" ? "0.00" : f.type === "url" ? "https://…" : "")} aria-label={f.label}
          onChange={(e) => set(f.id, { value: e.target.value })} />)}
      {f.type === "choice" && <datalist id={`${idBase}-${f.id}-options`}>{(f.options ?? []).map((o) => <option key={o} value={o} />)}</datalist>}
    </li>)}</ol>
    {fields.length < BLOCK_LIMITS.fields && <div className="muse-space-addfield">
      <input value={adding.label} maxLength={BLOCK_LIMITS.fieldLabel} placeholder="Add a field (Terminal, Gate, Colour…)" aria-label="New field name" onChange={(e) => setAdding({ ...adding, label: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addField(); } }} />
      <select value={adding.type} aria-label="New field type" onChange={(e) => setAdding({ ...adding, type: e.target.value as CardFieldType })}>{fieldTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
      <button type="button" className="muse-button button-ghost" disabled={!adding.label.trim()} onClick={addField}>Add field</button>
    </div>}
    <div className="muse-space-preview-order">
      <p className="small-label muse-space-layout-hint"><MuseIcon name="columns" size={11} /> pairs a field with its neighbour, side by side · <MuseIcon name="eye" size={11} /> shows it while collapsed</p>
      <p className="editor-label">Preview <small>{preview.length ? "Shown while collapsed, in this order" : "Tap the eye on a field to show it while collapsed. Until then, the card picks for you."}</small></p>
      {preview.length > 0 && <ol>{preview.map((id, i) => <li key={id}><span>{byId.get(id)?.label ?? id}</span>
        <button type="button" className="muse-lists-mini" aria-label={`Move ${byId.get(id)?.label} earlier in the preview`} disabled={i === 0} onClick={() => movePreview(id, -1)}><span className="muse-list-icon-left"><MuseIcon name="arrow" size={12} /></span></button>
        <button type="button" className="muse-lists-mini" aria-label={`Move ${byId.get(id)?.label} later in the preview`} disabled={i === preview.length - 1} onClick={() => movePreview(id, 1)}><MuseIcon name="arrow" size={12} /></button></li>)}</ol>}
    </div>
  </div>;
}
