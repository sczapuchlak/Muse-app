"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { accentStyle, customGradientCss } from "@/lib/appearance-values";
import { markCollections, newLibraryId, paintAccent, type MarkStyle, type Paint } from "@/lib/planner-customization";
import { MusePaintPicker, paintSwatchStyle } from "../MusePaintPicker";
import { markIconName, markIcons, markLinkKinds, statusLegend, type MarkIcon, type MarkLinkKind, type MuseMark, type ResolvedMark } from "@/lib/muse-marks";
import { MuseIcon, type MuseIconName } from "../MuseIcon";
import { usePlanner } from "../PlannerStore";
import { useWellness } from "../WellnessStore";
import { useWhimsyData } from "../whimsy/WhimsyData";
import { useAspirations } from "../rituals/aspirations/useAspirations";
import { useAgendaData } from "./AgendaData";

const iconLabel = (icon: MarkIcon) => markIcons.find((i) => i.id === icon)?.label ?? icon;

/** One Mark as a small colored symbol (solid or gradient). The label, meaning or linked record's name is always its accessible name. */
export function MarkGlyph({ mark, size = 14, onSelect }: { mark: Pick<ResolvedMark, "icon" | "color" | "title" | "linked" | "missing"> & Partial<Pick<ResolvedMark, "label" | "gradient" | "meaning">>; size?: number; onSelect?: (anchor: HTMLElement) => void }) {
  const name = `${iconLabel(mark.icon)} Mark${mark.title ? `: ${mark.title}` : ""}${mark.meaning ? ` — ${mark.meaning}` : ""}${mark.linked ? " (linked)" : ""}${mark.missing ? " (its linked item was removed)" : ""}`;
  const glyph = <MuseIcon name={markIconName(mark.icon) as MuseIconName} size={size} />;
  const style = { ...accentStyle(mark.color), ...(mark.gradient ? { "--mark-gradient": customGradientCss(mark.gradient) } : {}) } as CSSProperties;
  const paint = mark.gradient ? "gradient" : undefined;
  return onSelect
    ? <button type="button" className="muse-mark" data-paint={paint} data-missing={mark.missing || undefined} style={style} title={name} aria-label={`Edit ${name}`} onClick={(e) => onSelect(e.currentTarget)}>{glyph}</button>
    : <span className="muse-mark" data-paint={paint} data-missing={mark.missing || undefined} style={style} title={name} role="img" aria-label={name}>{glyph}</span>;
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
  const { library, changeLibrary } = useAgendaData();
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const paint: Paint = draft.gradient ? { kind: "gradient", gradient: draft.gradient } : { kind: "solid", color: draft.color };
  const setPaint = (p: Paint | undefined) => { if (!p) return; set(p.kind === "solid" ? { color: p.color, gradient: undefined } : { color: paintAccent(p), gradient: p.gradient }); };
  const apply = (style: Omit<MarkStyle, "id">) => set({ icon: style.icon, label: link ? draft.label : style.name, meaning: style.meaning, ...(style.paint.kind === "solid" ? { color: style.paint.color, gradient: undefined } : { color: paintAccent(style.paint), gradient: style.paint.gradient }) });
  const existing = library.markStyles.find((m) => m.icon === draft.icon && JSON.stringify(m.paint) === JSON.stringify(paint) && m.name === (draft.label.trim() || iconLabel(draft.icon)));
  const [keep, setKeep] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (draft.linkKind && !draft.linkId) { setError("Choose what to link, or pick Nothing."); return; } setError(""); setBusy(true);
    if (keep && !existing) changeLibrary({ type: "mark/save", style: { id: newLibraryId("mark"), name: (draft.label.trim() || iconLabel(draft.icon)).slice(0, 40), icon: draft.icon, paint, ...(draft.meaning?.trim() ? { meaning: draft.meaning.trim() } : {}) } });
    const ok = await saveMark({ ...draft, meaning: draft.meaning?.trim() || undefined }); setBusy(false); if (ok) onDone();
  }
  return <form className="muse-mark-editor" onSubmit={submit}>
    {link && <p className="small-label">On “{link.title}”</p>}
    <MarkQuickPick saved={library.markStyles} onPick={apply} />
    <fieldset className="muse-mark-icons"><legend>Symbol</legend>
      {markIcons.map((i) => <label key={i.id} title={i.label} style={accentStyle(draft.color)} data-paint={draft.gradient ? "gradient" : undefined}>
        <input type="radio" name="mark-icon" value={i.id} checked={draft.icon === i.id} onChange={() => set({ icon: i.id })} aria-label={i.label} />
        <span style={draft.gradient && draft.icon === i.id ? paintSwatchStyle(paint) : undefined}><MuseIcon name={markIconName(i.id) as MuseIconName} size={16} /></span></label>)}
    </fieldset>
    <MusePaintPicker label="Color" value={paint} onChange={setPaint} palette={library.palette}
      onSaveColor={(color) => changeLibrary({ type: "palette/color", color })} onSaveGradient={(gradient) => changeLibrary({ type: "palette/gradient", gradient })}
      onForget={(x) => changeLibrary("color" in x ? { type: "palette/remove-color", color: x.color } : { type: "palette/remove-gradient", gradient: x.gradient })} />
    <label className="muse-mark-field"><span>Label <small>optional</small></span>
      <input id="mark-label" maxLength={40} value={draft.label} placeholder={link ? link.title : "London, Mom’s birthday…"} onChange={(e) => set({ label: e.target.value })} /></label>
    <label className="muse-mark-field"><span>Meaning <small>optional · shown in the key and on hover</small></span>
      <input maxLength={200} value={draft.meaning ?? ""} placeholder="e.g. Pink suitcase = vacation" onChange={(e) => set({ meaning: e.target.value })} /></label>
    {existing ? <p className="small-label">In My Marks as “{existing.name}”.</p>
      : <label className="muse-agenda-check"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /> Save this style to My Marks</label>}
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

/** My Marks and themed collections: one tap fills symbol, color, name and meaning. Only the style is copied. */
function MarkQuickPick({ saved, onPick }: { saved: MarkStyle[]; onPick: (style: Omit<MarkStyle, "id">) => void }) {
  const tabs = [...(saved.length ? [{ id: "mine", label: "My Marks" }] : []), ...markCollections.map((c) => ({ id: c.id, label: c.label }))];
  const [tab, setTab] = useState(tabs[0].id);
  const list: Omit<MarkStyle, "id">[] = tab === "mine" ? saved : markCollections.find((c) => c.id === tab)?.marks ?? [];
  return <div className="muse-mark-quick">
    <p className="editor-label">Start from</p>
    <div className="muse-chip-row" role="group" aria-label="Mark collections">{tabs.map((t) => <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>
    <ul className="muse-mark-quick-list">{list.map((m, i) => <li key={`${tab}-${i}`}><button type="button" onClick={() => onPick(m)} title={m.meaning}>
      <MarkGlyph mark={{ icon: m.icon, color: paintAccent(m.paint), gradient: m.paint.kind === "gradient" ? m.paint.gradient : undefined, title: "", linked: false, missing: false }} size={13} />
      <span>{m.name}</span></button></li>)}</ul>
  </div>;
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
    <MyMarksKey />
    <p className="small-label">Marks on Bookshelf, Aspirations or movement open those pages; see <Link href="/rituals?view=aspirations">Aspirations</Link> for real progress.</p>
  </div>;
}

/** The person's own Marks with their meanings, so color is never the only signal. Removing one keeps placed Marks. */
function MyMarksKey() {
  const { library, changeLibrary } = useAgendaData();
  const [confirm, setConfirm] = useState<string | null>(null);
  if (!library.markStyles.length) return null;
  return <div className="muse-mark-key"><p className="editor-label">My Marks</p>
    <ul>{library.markStyles.map((m) => <li key={m.id}>
      <MarkGlyph mark={{ icon: m.icon, color: paintAccent(m.paint), gradient: m.paint.kind === "gradient" ? m.paint.gradient : undefined, title: "", linked: false, missing: false }} size={12} />
      <span><strong>{m.name}</strong>{m.meaning ? ` — ${m.meaning}` : ""}</span>
      {confirm === m.id
        ? <span className="muse-mark-confirm">Remove from My Marks? Placed Marks stay.<button type="button" className="text-button" onClick={() => { changeLibrary({ type: "mark/remove", id: m.id }); setConfirm(null); }}>Remove</button><button type="button" className="text-button" onClick={() => setConfirm(null)}>Keep</button></span>
        : <button type="button" className="text-button" aria-label={`Remove ${m.name} from My Marks`} onClick={() => setConfirm(m.id)}>×</button>}
    </li>)}</ul></div>;
}
