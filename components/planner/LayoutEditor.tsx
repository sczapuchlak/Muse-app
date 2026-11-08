"use client";
import { useState, type CSSProperties } from "react";
import { hasContent, isPermanent, MAX_SECTIONS, newSectionId, overlappingTaskSections, readingMetrics, repeatable, sectionSizes, sectionTypes, sectionWorkspaces, type AgendaSection, type CompletedChoice, type ReadingMetric, type SectionSize, type SectionType } from "@/lib/agenda-layout";
import { markIcons, markIconName, type MarkIcon } from "@/lib/muse-marks";
import { accentCss } from "@/lib/appearance-values";
import { DEFAULT_OPACITY, dividerStyles, filterSaved, headerStyles, MAX_OPACITY, MAX_STARTER, MIN_OPACITY, newLibraryId, paintCss, parseStarter, stickerGlyph, stickers, type DividerStyle, type HeaderStyle, type SavedSection, type SavedSectionType, type SectionStyle, type StickerId } from "@/lib/planner-customization";
import { usePlanner } from "../PlannerStore";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { MuseColorPicker } from "../MuseColorPicker";
import { MusePaintPicker } from "../MusePaintPicker";
import { MuseIcon, type MuseIconName } from "../MuseIcon";
import { useAgendaData } from "./AgendaData";

const typeLabel = (t: SectionType) => sectionTypes.find((x) => x.id === t)!.label;
const completedChoices = [{ id: "inherit", label: "Follow the Agenda setting" }, { id: "show", label: "Always show" }, { id: "hide", label: "Always hide" }];
const isSavable = (s: AgendaSection): s is AgendaSection & { type: SavedSectionType } => hasContent(s.type);

/**
 * Customize layout (#79 §3.7–3.9, #87): one template for all seven days. Reorder by dragging or with the Move up/down
 * buttons, choose a size, rename, style, hide, duplicate, configure, add, save as a reusable section, or remove.
 * Events and the first Tasks section stay. Removing or hiding a section never touches the records it showed; only
 * "Delete section and its content" (confirmed) erases what was written in a custom section.
 */
export function LayoutEditor({ onClose }: { onClose: () => void }) {
  const { layout, changeLayout, status } = useAgendaData();
  const { state } = usePlanner();
  const [dragId, setDragId] = useState<string | null>(null), [over, setOver] = useState<number | null>(null), [confirmReset, setConfirmReset] = useState(false);
  const [announce, setAnnounce] = useState("");
  const sections = layout.sections, workspaceIds = state.workspaces.map((w) => w.id), full = sections.length >= MAX_SECTIONS;
  const available = sectionTypes.filter((t) => repeatable(t.id) || !sections.some((s) => s.type === t.id));
  const overlaps = overlappingTaskSections(sections, workspaceIds);
  const move = (s: AgendaSection, to: number) => { changeLayout({ type: "move", id: s.id, to }); setAnnounce(`${s.title} moved to position ${Math.max(1, Math.min(sections.length, to + 1))} of ${sections.length}, in every day.`); };

  return <section className="muse-layout-editor" aria-label="Customize weekly layout">
    <header><div><h3>Weekly layout</h3><p className="small-label">One layout for every day. Changes apply to Monday through Sunday at once. Tip: drag the bottom edge of any section in the week to size it.</p></div>
      <button type="button" className="muse-button button-primary" onClick={onClose}>Done</button></header>
    <ol className="muse-layout-list" onDragOver={(e) => { if (dragId) e.preventDefault(); }}>
      {sections.map((s, i) => <li key={s.id} className="muse-layout-row" draggable data-hidden={s.hidden || undefined} data-dragging={dragId === s.id || undefined} data-over={over === i || undefined}
        onDragStart={(e) => { if ((e.target as Element).closest("input,select,textarea,button:not(.muse-layout-grip),details,fieldset")) { e.preventDefault(); return; } setDragId(s.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", s.id); }}
        onDragEnd={() => { setDragId(null); setOver(null); }}
        onDragOver={(e) => { if (dragId) { e.preventDefault(); setOver(i); } }}
        onDrop={(e) => { e.preventDefault(); const moved = sections.find((x) => x.id === dragId); if (moved) move(moved, i); setDragId(null); setOver(null); }}>
        <SectionRow section={s} index={i} count={sections.length} full={full} workspaceIds={workspaceIds} onMove={move} announce={setAnnounce} />
      </li>)}
    </ol>
    {overlaps.length > 0 && <p className="small-label" role="note">Heads up: {overlaps.map(([a, b]) => `“${a}” and “${b}”`).join(", ")} share a workspace, so some tasks show in both. They’re still one task.</p>}
    <div className="muse-layout-add">
      <span>Add a section</span>
      <MuseChoiceMenu label="Add a section" valueLabel={full ? "Layout is full" : "Choose a section…"} options={available.map((t) => ({ id: t.id, label: `${t.label} — ${t.hint}` }))} selectedIds={[]}
        onSelect={(id) => { const type = id as SectionType; if (full) return; changeLayout({ type: "add", section: { id: newSectionId(type), type, ...(type === "tasks" ? { workspaceIds: [], completed: "inherit" } : {}) } }); setAnnounce(`${typeLabel(type)} added to every day.`); }} />
    </div>
    <SavedSectionsPicker full={full} announce={setAnnounce} />
    <div className="muse-layout-reset">{confirmReset
      ? <span role="group" aria-label="Confirm reset">Go back to just Events and Tasks? Your notes, lists, Marks, saved sections and records stay. <button type="button" className="text-button" onClick={() => { changeLayout({ type: "reset" }); setConfirmReset(false); setAnnounce("Layout reset to Events and Tasks."); }}>Reset layout</button><button type="button" className="text-button" onClick={() => setConfirmReset(false)}>Keep mine</button></span>
      : <button type="button" className="text-button" onClick={() => setConfirmReset(true)}>Reset to default…</button>}</div>
    <p className="sr-only" role="status" aria-live="polite">{announce}</p>
    {status && <p className="small-label" role="status">{status}</p>}
  </section>;
}

function SectionRow({ section: s, index: i, count, full, workspaceIds, onMove, announce }: { section: AgendaSection; index: number; count: number; full: boolean; workspaceIds: string[]; onMove: (s: AgendaSection, to: number) => void; announce: (m: string) => void }) {
  const { changeLayout, deleteContent, library, changeLibrary } = useAgendaData();
  const { state } = usePlanner();
  const [panel, setPanel] = useState<null | "style" | "save" | "remove">(null), [saveName, setSaveName] = useState(s.title), [withStarter, setWithStarter] = useState(true);
  const update = (patch: Partial<Omit<AgendaSection, "id" | "type">>) => changeLayout({ type: "update", id: s.id, patch });
  const scope = s.type === "tasks" ? sectionWorkspaces(s, workspaceIds) : null;
  const linked = s.savedFrom ? library.savedSections.find((x) => x.id === s.savedFrom) : undefined;
  const toggle = (p: typeof panel) => setPanel(panel === p ? null : p);
  function save(asCopy: boolean) {
    if (!isSavable(s)) return;
    const id = !asCopy && linked ? linked.id : newLibraryId("saved");
    const saved: SavedSection = { id, name: (saveName.trim() || s.title).slice(0, 40), type: s.type, title: s.title, size: s.size, ...(s.height ? { height: s.height } : {}), ...(s.icon ? { icon: s.icon } : {}), ...(s.style ? { style: s.style } : {}),
      starter: withStarter ? s.starter ?? [] : [], ...(withStarter && s.starterBody ? { starterBody: s.starterBody } : {}) };
    changeLibrary({ type: "section/save", section: saved }); update({ savedFrom: id }); setPanel(null);
    announce(`${saved.name} ${!asCopy && linked ? "updated in" : "saved to"} My Saved Sections.`);
  }
  return <>
    <span className="muse-layout-grip" aria-hidden="true">⋮⋮</span>
    <div className="muse-layout-main">
      <div className="muse-layout-line">
        <span className="muse-layout-swatch" style={sectionPreviewStyle(s.style)} aria-hidden="true">{s.icon ? <MuseIcon name={markIconName(s.icon) as MuseIconName} size={13} /> : s.style?.sticker ? stickerGlyph(s.style.sticker) : null}</span>
        <label className="muse-layout-title"><span className="sr-only">Title of section {i + 1}</span>
          <input value={s.title} maxLength={32} onChange={(e) => update({ title: e.target.value || typeLabel(s.type) })} /></label>
        <span className="small-label">{typeLabel(s.type)}{isPermanent(s) ? " · always shown" : ""}{s.hidden ? " · hidden" : ""}</span>
      </div>
      <div className="muse-layout-line">
        <span className="muse-layout-choice"><span>Height</span><MuseChoiceMenu label={`Height of ${s.title}`} valueLabel={s.height ? `Custom · ${s.height}px` : sectionSizes.find((z) => z.id === s.size)!.label} options={sectionSizes.map((z) => ({ id: z.id, label: z.label }))} selectedIds={[s.size]} onSelect={(id) => update({ size: id as SectionSize, height: undefined })} /></span>
        <span className="muse-layout-choice"><span>Icon</span><MuseChoiceMenu label={`Icon for ${s.title}`} valueLabel={markIcons.find((m) => m.id === s.icon)?.label ?? "None"} options={[{ id: "none", label: "None" }, ...markIcons.map((m) => ({ id: m.id, label: m.label }))]} selectedIds={[s.icon ?? "none"]} onSelect={(id) => update({ icon: id === "none" ? undefined : id as MarkIcon })} /></span>
        {s.type === "reading" && <span className="muse-layout-choice"><span>Show</span><MuseChoiceMenu label={`What ${s.title} shows`} valueLabel={readingMetrics.find((m) => m.id === s.metric)?.label ?? "Minutes read that day"} options={readingMetrics.map((m) => ({ id: m.id, label: m.label }))} selectedIds={[s.metric ?? "minutes"]} onSelect={(id) => update({ metric: id as ReadingMetric })} /></span>}
        {s.type === "tasks" && <span className="muse-layout-choice"><span>Completed</span><MuseChoiceMenu label={`Completed tasks in ${s.title}`} valueLabel={completedChoices.find((c) => c.id === (s.completed ?? "inherit"))!.label} options={completedChoices} selectedIds={[s.completed ?? "inherit"]} onSelect={(id) => update({ completed: id as CompletedChoice })} /></span>}
      </div>
      {scope && <fieldset className="muse-layout-workspaces"><legend>Workspaces</legend>
        <label><input type="checkbox" checked={!s.workspaceIds?.length} onChange={(e) => update({ workspaceIds: e.target.checked ? [] : [workspaceIds[0]].filter(Boolean) })} /> All workspaces</label>
        {state.workspaces.map((w) => { const chosen = s.workspaceIds ?? [], on = chosen.includes(w.id), last = on && scope.ids.length === 1;
          // Unchecking the last chosen workspace would silently mean "all"; choose All explicitly instead.
          return <label key={w.id} title={last ? "Keep at least one, or choose All workspaces" : undefined}><input type="checkbox" disabled={!chosen.length || last} checked={on}
            onChange={(e) => update({ workspaceIds: e.target.checked ? [...chosen, w.id] : chosen.filter((x) => x !== w.id) })} /> {w.name}</label>; })}
        {scope.missing.length > 0 && <p className="muse-agenda-warning" role="note">{scope.missing.length === 1 ? "One workspace" : `${scope.missing.length} workspaces`} chosen here no longer exist. Pick again, or choose All.</p>}
      </fieldset>}
      {(s.type === "checklist" || s.type === "list") && <label className="muse-layout-starter"><span>Starter items <small>one per line · fills each new day; days you’ve edited keep their own</small></span>
        <StarterField value={s.starter ?? []} onCommit={(starter) => update({ starter })} placeholder={s.type === "checklist" ? "Passport\nCharger\nSunscreen" : "Café on Main St\nThe botanical garden"} /></label>}
      {s.type === "notes" && <label className="muse-layout-starter"><span>Starter prompt <small>optional · shown in empty days, never saved as your writing</small></span>
        <input maxLength={200} value={s.starterBody ?? ""} placeholder="What made today good?" onChange={(e) => update({ starterBody: e.target.value || undefined })} /></label>}
      <div className="muse-layout-tools" role="group" aria-label={`More for ${s.title}`}>
        <button type="button" className="text-button" aria-expanded={panel === "style"} onClick={() => toggle("style")}>Style</button>
        {!isPermanent(s) && <button type="button" className="text-button" aria-pressed={!!s.hidden} onClick={() => { update({ hidden: !s.hidden }); announce(`${s.title} ${s.hidden ? "shown" : "hidden"}. Its content is kept.`); }}>{s.hidden ? "Show" : "Hide"}</button>}
        {repeatable(s.type) && <button type="button" className="text-button" disabled={full} onClick={() => { changeLayout({ type: "duplicate", id: s.id, newId: newSectionId(s.type) }); announce(`${s.title} duplicated. The copy starts empty.`); }}>Duplicate</button>}
        {isSavable(s) && <button type="button" className="text-button" aria-expanded={panel === "save"} onClick={() => { setSaveName(linked?.name ?? s.title); toggle("save"); }}>Save as section…</button>}
        {!isPermanent(s) && <button type="button" className="text-button" aria-expanded={panel === "remove"} onClick={() => toggle("remove")}>Remove…</button>}
      </div>
      {panel === "style" && <StylePanel section={s} onChange={(style) => update({ style })} />}
      {panel === "save" && isSavable(s) && <div className="muse-layout-panel" role="group" aria-label={`Save ${s.title} as a reusable section`}>
        <label className="muse-layout-starter"><span>Name in My Saved Sections</span><input maxLength={40} value={saveName} onChange={(e) => setSaveName(e.target.value)} /></label>
        <label className="muse-agenda-check"><input type="checkbox" checked={withStarter} onChange={(e) => setWithStarter(e.target.checked)} /> Include starter {s.type === "notes" ? "prompt" : "items"}</label>
        <p className="small-label">Saves its type, style, icon and size. Sections you insert later are independent copies.</p>
        <div className="editor-actions">
          {linked ? <><button type="button" className="muse-button button-primary" onClick={() => save(false)}>Update “{linked.name}”</button><button type="button" className="muse-button" onClick={() => save(true)}>Save as a new copy</button></>
            : <button type="button" className="muse-button button-primary" onClick={() => save(true)}>Save section</button>}
          <button type="button" className="muse-button button-ghost" onClick={() => setPanel(null)}>Cancel</button></div>
      </div>}
      {panel === "remove" && <div className="muse-layout-panel" role="alertdialog" aria-label={`Remove ${s.title}`}>
        {hasContent(s.type) ? <>
          <p>Remove “{s.title}” from every day?</p>
          <div className="editor-actions">
            <button type="button" className="muse-button" onClick={() => { changeLayout({ type: "remove", id: s.id }); announce(`${s.title} removed. What you wrote is still saved.`); }}>Remove, keep what I wrote</button>
            <button type="button" className="muse-button" data-destructive onClick={async () => { if (await deleteContent(s.id)) { changeLayout({ type: "remove", id: s.id }); announce(`${s.title} and everything written in it were deleted.`); } }}>Delete section and its content</button>
            <button type="button" className="muse-button button-ghost" onClick={() => setPanel(null)}>Cancel</button></div>
          <p className="small-label">Deleting erases every day’s {s.type === "notes" ? "writing" : "items"} in this section for good. To keep it out of sight instead, use Hide.</p>
        </> : <>
          <p>Remove “{s.title}”? Nothing it shows is deleted.</p>
          <div className="editor-actions"><button type="button" className="muse-button" onClick={() => { changeLayout({ type: "remove", id: s.id }); announce(`${s.title} removed from the layout. Nothing it showed was deleted.`); }}>Remove</button>
            <button type="button" className="muse-button button-ghost" onClick={() => setPanel(null)}>Cancel</button></div>
        </>}
      </div>}
    </div>
    <div className="muse-layout-actions">
      <button type="button" className="muse-button button-ghost" disabled={i === 0} aria-label={`Move ${s.title} up`} onClick={() => onMove(s, i - 1)}>↑</button>
      <button type="button" className="muse-button button-ghost" disabled={i === count - 1} aria-label={`Move ${s.title} down`} onClick={() => onMove(s, i + 1)}>↓</button>
    </div>
  </>;
}

/** Edits a multi-line list but only saves when focus leaves, so typing never fights the layout save. */
function StarterField({ value, onCommit, placeholder }: { value: string[]; onCommit: (v: string[]) => void; placeholder: string }) {
  const [text, setText] = useState(value.join("\n"));
  return <textarea rows={3} value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onBlur={() => { const next = parseStarter(text.split("\n")); if (next.join("\n") !== value.join("\n")) onCommit(next); }} aria-describedby={undefined} data-max={MAX_STARTER} />;
}

/** Section look (#87): background (solid/gradient + opacity), accent, header style, divider and a sticker. */
function StylePanel({ section, onChange }: { section: AgendaSection; onChange: (style: SectionStyle | undefined) => void }) {
  const { library, changeLibrary } = useAgendaData();
  const style = section.style ?? {};
  const set = (patch: Partial<SectionStyle>) => { const next = { ...style, ...patch }; for (const k of Object.keys(next) as (keyof SectionStyle)[]) if (next[k] === undefined) delete next[k]; onChange(Object.keys(next).length ? next : undefined); };
  return <div className="muse-layout-panel muse-layout-style" role="group" aria-label={`Style for ${section.title}`}>
    <div className="muse-layout-style-preview" aria-hidden="true"><SectionPreview title={section.title} icon={section.icon} style={section.style} lines={["First item", "Second item"]} /></div>
    <MusePaintPicker label="Background" allowDefault value={style.background} onChange={(background) => set({ background })} palette={library.palette}
      onSaveColor={(color) => changeLibrary({ type: "palette/color", color })} onSaveGradient={(gradient) => changeLibrary({ type: "palette/gradient", gradient })}
      onForget={(x) => changeLibrary("color" in x ? { type: "palette/remove-color", color: x.color } : { type: "palette/remove-gradient", gradient: x.gradient })} />
    {style.background && <label className="muse-layout-opacity"><span>Strength <small>{style.opacity ?? DEFAULT_OPACITY}%</small></span>
      <input type="range" min={MIN_OPACITY} max={MAX_OPACITY} step={1} value={style.opacity ?? DEFAULT_OPACITY} onChange={(e) => set({ opacity: Number(e.target.value) })} /></label>}
    <div className="muse-layout-accent">
      <div className="muse-chip-row" role="group" aria-label="Accent"><span className="small-label">Accent (header, icon, divider)</span>
        <button type="button" aria-pressed={!style.accent} onClick={() => set({ accent: undefined })}>Theme default</button></div>
      <MuseColorPicker label="Accent color" value={style.accent ?? "primary"} onChange={(accent) => set({ accent })} />
    </div>
    <div className="muse-layout-line">
      <span className="muse-layout-choice"><span>Header</span><MuseChoiceMenu label={`Header style for ${section.title}`} valueLabel={headerStyles.find((h) => h.id === (style.header ?? "classic"))!.label} options={headerStyles.map((h) => ({ id: h.id, label: h.label }))} selectedIds={[style.header ?? "classic"]} onSelect={(id) => set({ header: id === "classic" ? undefined : id as HeaderStyle })} /></span>
      <span className="muse-layout-choice"><span>Divider</span><MuseChoiceMenu label={`Divider above ${section.title}`} valueLabel={dividerStyles.find((d) => d.id === (style.divider ?? "line"))!.label} options={dividerStyles.map((d) => ({ id: d.id, label: d.label }))} selectedIds={[style.divider ?? "line"]} onSelect={(id) => set({ divider: id === "line" ? undefined : id as DividerStyle })} /></span>
    </div>
    <fieldset className="muse-layout-stickers"><legend>Sticker <small>decoration only — not a Muse Mark</small></legend>
      <label><input type="radio" name={`sticker-${section.id}`} checked={!style.sticker} onChange={() => set({ sticker: undefined })} /><span>None</span></label>
      {stickers.map((x) => <label key={x.id} title={x.label}><input type="radio" name={`sticker-${section.id}`} checked={style.sticker === x.id} onChange={() => set({ sticker: x.id as StickerId })} aria-label={x.label} /><span aria-hidden="true">{x.glyph}</span></label>)}
    </fieldset>
    <button type="button" className="text-button" disabled={!section.style} onClick={() => onChange(undefined)}>Reset to theme default</button>
  </div>;
}

function sectionPreviewStyle(style?: SectionStyle): CSSProperties {
  return { ...(style?.background ? { "--section-paint": paintCss(style.background), "--section-paint-opacity": `${(style.opacity ?? DEFAULT_OPACITY) / 100}` } : {}), ...(style?.accent ? { "--section-accent": accentCss(style.accent) } : {}) } as CSSProperties;
}
/** A small, static band that looks like the real one: used for the style panel and Saved Section cards. */
function SectionPreview({ title, icon, style, lines, checklist = true }: { title: string; icon?: MarkIcon; style?: SectionStyle; lines: string[]; checklist?: boolean }) {
  return <div className="muse-agenda-section muse-section-preview" data-flow="auto" data-painted={style?.background?.kind} data-header={style?.header} data-divider={style?.divider} style={sectionPreviewStyle(style)}>
    {style?.sticker && <span className="muse-agenda-sticker">{stickerGlyph(style.sticker)}</span>}
    <div className="muse-agenda-section-head"><h3>{icon && <span className="muse-agenda-section-icon"><MuseIcon name={markIconName(icon) as MuseIconName} size={12} /></span>}{title}</h3></div>
    <ul className="muse-agenda-items muse-section-preview-lines">{lines.slice(0, 3).map((l, i) => <li key={i}><span className="muse-section-preview-box" data-kind={checklist ? "check" : "dash"} />{l}</li>)}{lines.length > 3 && <li className="small-label">+{lines.length - 3} more</li>}</ul>
  </div>;
}

/** My Saved Sections (#87): reusable templates. Inserting makes an independent copy; deleting a template never touches the Planner. */
function SavedSectionsPicker({ full, announce }: { full: boolean; announce: (m: string) => void }) {
  const { library, changeLibrary, changeLayout, layout } = useAgendaData();
  const [query, setQuery] = useState(""), [blank, setBlank] = useState(false), [editing, setEditing] = useState<string | null>(null), [confirm, setConfirm] = useState<string | null>(null);
  const list = filterSaved(library.savedSections, query);
  if (!library.savedSections.length) return <details className="muse-saved-sections"><summary>My Saved Sections</summary><p className="small-label">Nothing saved yet. Style a Checklist, Simple List or Freeform Notes section, then choose “Save as section…” to reuse it any week.</p></details>;
  function insert(t: SavedSection) {
    if (full) return;
    const id = newSectionId(t.type);
    changeLayout({ type: "insert", section: { id, type: t.type, title: t.title, size: (sectionSizes.find((z) => z.id === t.size)?.id ?? "standard"), ...(t.height ? { height: t.height } : {}), ...(t.icon ? { icon: t.icon } : {}), ...(t.style ? { style: t.style } : {}),
      ...(!blank && t.starter.length ? { starter: t.starter } : {}), ...(!blank && t.starterBody ? { starterBody: t.starterBody } : {}), savedFrom: t.id } });
    announce(`${t.name} added to every day${blank ? ", starting blank" : ""}.`);
  }
  return <details className="muse-saved-sections" open><summary>My Saved Sections <span className="small-label">· {library.savedSections.length}</span></summary>
    <div className="muse-saved-tools">
      {library.savedSections.length > 4 && <input type="search" aria-label="Find a saved section" placeholder="Find…" value={query} onChange={(e) => setQuery(e.target.value)} />}
      <label className="muse-agenda-check"><input type="checkbox" checked={blank} onChange={(e) => setBlank(e.target.checked)} /> Insert blank (skip starter content)</label>
    </div>
    <ul className="muse-saved-grid">{list.map((t) => {
      const inLayout = layout.sections.some((s) => s.savedFrom === t.id);
      return <li key={t.id} className="muse-saved-card">
        <SectionPreview title={t.title} icon={t.icon} style={t.style} checklist={t.type === "checklist"} lines={t.type === "notes" ? [t.starterBody || "Freeform notes"] : t.starter.length ? t.starter : [t.type === "checklist" ? "Empty checklist" : "Empty list"]} />
        {editing === t.id ? <SavedEditor saved={t} onDone={() => setEditing(null)} />
          : <div className="muse-saved-meta"><strong>{t.name}</strong><span className="small-label">{typeLabel(t.type)}{inLayout ? " · in your layout" : ""}</span></div>}
        {confirm === t.id
          ? <div className="muse-mark-confirm" role="alertdialog" aria-label={`Delete ${t.name}`}>Delete this template? Sections already in your Planner stay.
              <button type="button" className="text-button" onClick={() => { changeLibrary({ type: "section/remove", id: t.id }); setConfirm(null); announce(`${t.name} deleted from My Saved Sections.`); }}>Delete</button>
              <button type="button" className="text-button" onClick={() => setConfirm(null)}>Keep</button></div>
          : editing !== t.id && <div className="muse-saved-actions">
              <button type="button" className="muse-button button-primary" disabled={full} onClick={() => insert(t)}>Insert</button>
              <button type="button" className="text-button" onClick={() => setEditing(t.id)}>Edit</button>
              <button type="button" className="text-button" onClick={() => { changeLibrary({ type: "section/duplicate", id: t.id, newId: newLibraryId("saved") }); announce(`${t.name} duplicated.`); }}>Duplicate</button>
              <button type="button" className="text-button" onClick={() => setConfirm(t.id)}>Delete…</button></div>}
      </li>;
    })}</ul>
    {!list.length && <p className="small-label">No saved sections match.</p>}
  </details>;
}

function SavedEditor({ saved, onDone }: { saved: SavedSection; onDone: () => void }) {
  const { changeLibrary } = useAgendaData();
  const [name, setName] = useState(saved.name), [title, setTitle] = useState(saved.title), [starter, setStarter] = useState(saved.starter.join("\n")), [body, setBody] = useState(saved.starterBody ?? "");
  return <form className="muse-saved-editor" onSubmit={(e) => { e.preventDefault(); changeLibrary({ type: "section/save", section: { ...saved, name: name.trim() || saved.name, title: title.trim() || saved.title, starter: parseStarter(starter.split("\n")), ...(body.trim() ? { starterBody: body.trim() } : { starterBody: undefined }) } }); onDone(); }}>
    <label>Name<input maxLength={40} value={name} onChange={(e) => setName(e.target.value)} /></label>
    <label>Section title<input maxLength={32} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
    {saved.type === "notes" ? <label>Starter prompt<input maxLength={200} value={body} onChange={(e) => setBody(e.target.value)} /></label>
      : <label>Starter items <small>one per line</small><textarea rows={4} value={starter} onChange={(e) => setStarter(e.target.value)} /></label>}
    <p className="small-label">Edits change the template only, never sections already in your Planner.</p>
    <div className="editor-actions"><button type="submit" className="muse-button button-primary">Save</button><button type="button" className="muse-button button-ghost" onClick={onDone}>Cancel</button></div>
  </form>;
}
