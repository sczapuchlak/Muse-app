"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { accentStyle, type AccentColor } from "@/lib/appearance-values";
import { markColors, markIconName, markIcons, markLinkKinds, statusLegend, type MarkIcon, type MarkLinkKind, type MuseMark, type ResolvedMark } from "@/lib/muse-marks";
import { MuseIcon, type MuseIconName } from "../MuseIcon";
import { usePlanner } from "../PlannerStore";
import { useWellness } from "../WellnessStore";
import { useWhimsyData } from "../whimsy/WhimsyData";
import { useAspirations } from "../rituals/aspirations/useAspirations";
import { useAgendaData } from "./AgendaData";

const colorNames: Record<string, string> = { primary: "Primary", secondary: "Secondary", pop: "Pop", warm: "Warm", info: "Cool" };
const iconLabel = (icon: MarkIcon) => markIcons.find((i) => i.id === icon)?.label ?? icon;

/** One Mark as a small colored symbol. The label (or the linked record's name) is always its accessible name. */
export function MarkGlyph({ mark, size = 14, onSelect }: { mark: Pick<ResolvedMark, "icon" | "color" | "title" | "linked" | "missing"> & Partial<Pick<ResolvedMark, "label">>; size?: number; onSelect?: (anchor: HTMLElement) => void }) {
  const name = `${iconLabel(mark.icon)} Mark${mark.title ? `: ${mark.title}` : ""}${mark.linked ? " (linked)" : ""}${mark.missing ? " (its linked item was removed)" : ""}`;
  const glyph = <MuseIcon name={markIconName(mark.icon) as MuseIconName} size={size} />;
  return onSelect
    ? <button type="button" className="muse-mark" data-missing={mark.missing || undefined} style={accentStyle(mark.color)} title={name} aria-label={`Edit ${name}`} onClick={(e) => onSelect(e.currentTarget)}>{glyph}</button>
    : <span className="muse-mark" data-missing={mark.missing || undefined} style={accentStyle(mark.color)} title={name} role="img" aria-label={name}>{glyph}</span>;
}

/** A row of date Marks with their labels, e.g. ✈ London. */
export function MarkStrip({ marks, onEdit, labels = true }: { marks: ResolvedMark[]; onEdit?: (mark: ResolvedMark, anchor: HTMLElement) => void; labels?: boolean }) {
  if (!marks.length) return null;
  return <ul className="muse-mark-strip" aria-label="Marks">{marks.map((m) => <li key={m.id}>
    <MarkGlyph mark={m} onSelect={onEdit ? (a) => onEdit(m, a) : undefined} />{labels && m.title && <span>{m.title}</span>}
  </li>)}</ul>;
}

type Draft = Omit<MuseMark, "revision"> & { revision?: number };
/**
 * Create or edit a Mark. On a task or event the link is fixed (the Mark rides on that record). On a date it is
 * visual-only unless the person chooses to point it at an existing record; nothing new is created either way.
 */
export function MarkEditor({ mark, date, link, onDone }: { mark?: MuseMark; date: string; link?: { kind: "event" | "task"; id: string; title: string }; onDone: () => void }) {
  const { saveMark, removeMark } = useAgendaData();
  const [draft, setDraft] = useState<Draft>(() => mark ?? { id: crypto.randomUUID(), date, icon: link?.kind === "event" ? "calendar" : "star", color: "primary", label: "", ...(link ? { linkKind: link.kind, linkId: link.id } : {}) });
  const [busy, setBusy] = useState(false), [confirming, setConfirming] = useState(false), [error, setError] = useState("");
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  async function submit(e: FormEvent) { e.preventDefault(); if (draft.linkKind && !draft.linkId) { setError("Choose what to link, or pick Nothing."); return; } setError(""); setBusy(true); const ok = await saveMark(draft); setBusy(false); if (ok) onDone(); }
  return <form className="muse-mark-editor" onSubmit={submit}>
    {link && <p className="small-label">On “{link.title}”</p>}
    <fieldset className="muse-mark-icons"><legend>Symbol</legend>
      {markIcons.map((i) => <label key={i.id} title={i.label} style={accentStyle(draft.color)}>
        <input type="radio" name="mark-icon" value={i.id} checked={draft.icon === i.id} onChange={() => set({ icon: i.id })} aria-label={i.label} />
        <span><MuseIcon name={markIconName(i.id) as MuseIconName} size={16} /></span></label>)}
    </fieldset>
    <fieldset className="muse-mark-colors"><legend>Color</legend>
      {markColors.map((c) => <label key={c} title={colorNames[c]} style={accentStyle(c)}>
        <input type="radio" name="mark-color" value={c} checked={draft.color === c} onChange={() => set({ color: c as AccentColor })} aria-label={colorNames[c]} /><span /></label>)}
    </fieldset>
    <label className="muse-mark-field"><span>Label <small>optional</small></span>
      <input id="mark-label" maxLength={40} value={draft.label} placeholder={link ? link.title : "London, Mom’s birthday…"} onChange={(e) => set({ label: e.target.value })} /></label>
    {!link && <>
      <div className="muse-mark-dates">
        <label className="muse-mark-field"><span>Date</span><input type="date" required value={draft.date} onChange={(e) => set({ date: e.target.value, endDate: draft.endDate && draft.endDate < e.target.value ? undefined : draft.endDate })} /></label>
        <label className="muse-mark-field"><span>Through <small>optional</small></span><input type="date" min={draft.date} value={draft.endDate ?? ""} onChange={(e) => set({ endDate: e.target.value && e.target.value > draft.date ? e.target.value : undefined })} /></label>
      </div>
      <LinkPicker kind={draft.linkKind} id={draft.linkId} onChange={(linkKind, linkId) => set({ linkKind, linkId })} />
    </>}
    {error && <p className="muse-agenda-warning" role="alert">{error}</p>}
    <p className="small-label">A Mark is a symbol only. It never logs activity, completes anything or counts toward progress.</p>
    <div className="editor-actions">
      <button type="submit" className="muse-button button-primary" disabled={busy}>{mark ? "Save Mark" : "Add Mark"}</button>
      <button type="button" className="muse-button button-ghost" onClick={onDone}>Cancel</button>
      {mark && (confirming
        ? <span className="muse-mark-confirm" role="group" aria-label="Confirm removing this Mark">Remove it?<button type="button" className="text-button" onClick={async () => { if (await removeMark(mark.id)) onDone(); }}>Remove</button><button type="button" className="text-button" onClick={() => setConfirming(false)}>Keep</button></span>
        : <button type="button" className="text-button" onClick={() => setConfirming(true)}>Remove Mark</button>)}
    </div>
  </form>;
}

/** Optional link to one existing record. Only records Muse already has are offered. */
function LinkPicker({ kind, id, onChange }: { kind?: MarkLinkKind; id?: string; onChange: (kind?: MarkLinkKind, id?: string) => void }) {
  const { state } = usePlanner(), wellness = useWellness(), whimsy = useWhimsyData(), aspirations = useAspirations();
  const options: Record<MarkLinkKind, { id: string; label: string }[]> = {
    event: [...state.events].sort((a, b) => a.date.localeCompare(b.date)).map((e) => ({ id: e.id, label: `${e.date} · ${e.title}` })),
    task: state.tasks.filter((t) => !t.complete).map((t) => ({ id: t.id, label: `${t.plannedDate ? `${t.plannedDate} · ` : ""}${t.title}` })),
    movement: wellness.state.types.filter((t) => !t.archived).map((t) => ({ id: t.id, label: t.name })),
    book: (whimsy.records?.books ?? []).filter((b) => !b.archivedAt).map((b) => ({ id: b.id, label: b.title })),
    aspiration: aspirations.aspirations.map((a) => ({ id: a.id, label: a.title })),
  };
  const list = kind ? options[kind] : [], [query, setQuery] = useState("");
  const chosen = list.find((o) => o.id === id), matches = list.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8);
  return <div className="muse-mark-link">
    <fieldset><legend>Link to <small>optional</small></legend>
      <div className="muse-chip-row">
        <button type="button" aria-pressed={!kind} onClick={() => onChange(undefined, undefined)}>Nothing</button>
        {markLinkKinds.map((k) => <button key={k.id} type="button" aria-pressed={kind === k.id} onClick={() => { setQuery(""); onChange(k.id, undefined); }}>{k.label}</button>)}
      </div></fieldset>
    {kind && <div className="muse-mark-link-pick">
      {chosen ? <p className="muse-mark-linked">Linked: <strong>{chosen.label}</strong> <button type="button" className="text-button" onClick={() => onChange(kind, undefined)}>Change</button></p> : <>
        <input type="search" aria-label={`Find a ${kind}`} placeholder="Find…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="popover-choice-list" role="group" aria-label={`Choose a ${kind}`}>{matches.map((o) => <button key={o.id} type="button" className="popover-choice" onClick={() => onChange(kind, o.id)}>{o.label}</button>)}</div>
        {!list.length ? <p className="small-label">Nothing to link yet.</p> : !matches.length && <p className="small-label">No matches.</p>}
      </>}
    </div>}
  </div>;
}

/** What the planner's symbols mean, in words (color is never the only signal). */
export function AgendaLegend() {
  return <div className="muse-agenda-legend"><p className="editor-label">Key</p>
    <ul>{statusLegend.map((s) => <li key={s.label}><span aria-hidden="true">{s.symbol}</span>{s.label}</li>)}
      <li><span aria-hidden="true"><MuseIcon name="favorite" size={12} /></span>Muse Mark — a symbol you chose; it never counts as activity</li></ul>
    <p className="small-label">Marks on Bookshelf, Aspirations or movement open those pages; see <Link href="/rituals?view=aspirations">Aspirations</Link> for real progress.</p>
  </div>;
}
