"use client";
import { useState, useSyncExternalStore } from "react";
import { MuseMark, type MuseMarkIcon } from "@/components/design/MuseHeading";
import { MuseIcon } from "../MuseIcon";
import { MuseModal } from "../MuseModal";
import { cardFromTemplate, cardPresets, newCard, presetOf, type BlockData, type BlockKind, type BlockWidth, type CardPreset, type CardTemplate } from "@/lib/lists/blocks";
import { createCardTemplate, deleteCardTemplate, duplicateCardTemplate, updateCardTemplate, useLists } from "./ListsStore";
import { AppearanceEditor, AsideChoice, CardLook, FieldsEditor } from "./SpaceCards";

type Tone = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type AddChoice = { kind: BlockKind; data: BlockData; width: BlockWidth };

const basics: { id: string; label: string; detail: string; icon: MuseMarkIcon; tone: Tone; make: () => AddChoice }[] = [
  { id: "checklist", label: "Checklist", detail: "Boxes to tick", icon: "checklist", tone: 2, make: () => ({ kind: "checklist", data: {}, width: "full" }) },
  { id: "note", label: "Note", detail: "Formatted writing", icon: "quill", tone: 6, make: () => ({ kind: "note", data: { text: "" }, width: "full" }) },
  { id: "images", label: "Photos", detail: "A gallery", icon: "photo", tone: 1, make: () => ({ kind: "images", data: { images: [] }, width: "full" }) },
  { id: "link", label: "Link", detail: "A saved page", icon: "link", tone: 5, make: () => ({ kind: "link", data: { url: "" }, width: "half" }) },
  { id: "heading", label: "Heading", detail: "A title or line", icon: "letter", tone: 3, make: () => ({ kind: "heading", data: { text: "", style: "title" }, width: "full" }) },
  { id: "divider", label: "Divider", detail: "A quiet break", icon: "minus", tone: 8, make: () => ({ kind: "heading", data: { text: "", style: "divider" }, width: "full" }) },
];
/** Built-in presets, grouped (labels only; the presets and their stored ids are unchanged). */
const presetGroups: { title: string; ids: CardPreset[] }[] = [
  { title: "Travel", ids: ["flight", "transit", "stay", "place", "reservation"] },
  { title: "Home & shopping", ids: ["shopping", "measurement"] },
  { title: "Personal", ids: ["gift"] },
];
const cardChoice = (data: ReturnType<typeof newCard>): AddChoice => ({ kind: "card", data, width: data.display === "row" ? "full" : presetOf(data.preset).width });

/* A tiny shared switch so any picker can open the template manager (which lives once per page). */
let managing: { open: boolean; editId: string | null } = { open: false, editId: null };
const subs = new Set<() => void>();
export function openTemplateManager(editId: string | null = null) { managing = { open: true, editId }; subs.forEach((f) => f()); }
function closeTemplateManager() { managing = { open: false, editId: null }; subs.forEach((f) => f()); }
const useManaging = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => managing, () => managing);

/**
 * The one content picker (section "+ Add content", the section ⋯ menu and the page's Add content all use it).
 * Write & collect: the six basics. Information cards: Create custom card (the card builder), My card templates, and
 * Browse presets (built-in starting points, grouped). Templates and presets open in the same panel, with a way back.
 */
export function ContentPicker({ onPick, onManage }: { onPick: (c: AddChoice) => void; onManage?: () => void }) {
  const { cardTemplates, templatesReady } = useLists();
  const [view, setView] = useState<"main" | "templates" | "presets">("main");
  const mine = [...cardTemplates].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  const focusFirst = (el: HTMLDivElement | null) => { if (el && view !== "main") el.querySelector<HTMLButtonElement>("button:not(.muse-space-palette-back)")?.focus(); };
  if (view !== "main") return <div className="muse-space-palette" data-view={view} ref={focusFirst}>
    <button type="button" className="muse-space-palette-back text-button" onClick={() => setView("main")}><span className="muse-list-icon-left"><MuseIcon name="arrow" size={13} /></span>Add content</button>
    {view === "presets" ? presetGroups.map((g) => <div key={g.title} className="muse-space-palette-group">
      <p className="editor-label">{g.title}</p>
      <div className="muse-space-palette-grid" data-cards>{g.ids.map((id) => { const p = presetOf(id); return <button key={id} type="button" onClick={() => onPick(cardChoice(newCard(id)))}><MuseMark icon={p.icon as MuseMarkIcon} tone={p.tone as Tone} size="sm" /><span><b>{p.label}</b><small>{p.detail}</small></span></button>; })}</div>
    </div>) : <>
      <p className="editor-label muse-space-palette-mine">My card templates {mine.length > 0 && onManage && <button type="button" className="text-button" onClick={onManage}>Manage</button>}</p>
      {mine.length ? <div className="muse-space-palette-grid" data-mine>{mine.map((t) => { const p = presetOf(t.preset); return <button key={t.id} type="button" onClick={() => onPick(cardChoice(cardFromTemplate(t)))}>
        <MuseMark icon={(t.icon ?? p.icon) as MuseMarkIcon} tone={p.tone as Tone} size="sm" /><span><b>{t.name}</b><small>{t.fields.length} field{t.fields.length === 1 ? "" : "s"}</small></span></button>; })}</div>
        : <div className="muse-space-palette-empty"><MuseMark icon="bookmark" tone={3} size="md" /><p><b>No card templates yet.</b> Build a card your way, then choose <b>Save as card template</b> in its ⋯ menu. It appears here, in every space.</p>
          <button type="button" className="muse-button button-ghost" onClick={() => onPick(cardChoice(newCard("info")))}>Create a custom card</button></div>}
    </>}
  </div>;
  return <div className="muse-space-palette" data-view="main">
    <p className="editor-label">Write &amp; collect</p>
    <div className="muse-space-palette-grid">{basics.map((b) => <button key={b.id} type="button" onClick={() => onPick(b.make())}><MuseMark icon={b.icon} tone={b.tone} size="sm" /><span><b>{b.label}</b><small>{b.detail}</small></span></button>)}</div>
    <p className="editor-label">Information cards</p>
    <div className="muse-space-card-actions">
      <button type="button" data-primary onClick={() => onPick(cardChoice(newCard("info")))}><MuseMark icon="sparkle" tone={6} size="md" /><span><b>Create custom card</b><small>Build a card with your own fields and layout.</small></span></button>
      {templatesReady && <button type="button" onClick={() => setView("templates")}><MuseMark icon="bookmark" tone={3} size="md" /><span><b>My card templates</b><small>{mine.length ? `${mine.length} saved: ${mine.slice(0, 2).map((t) => t.name).join(", ")}${mine.length > 2 ? "…" : ""}` : "Cards you’ve saved to reuse."}</small></span><MuseIcon name="chevron" size={14} /></button>}
      <button type="button" onClick={() => setView("presets")}><MuseMark icon="compass" tone={5} size="md" /><span><b>Browse presets</b><small>Flight, accommodation, shopping, measurement…</small></span><MuseIcon name="chevron" size={14} /></button>
    </div>
  </div>;
}

/** Modal for adding content from the page level: choose the section, then the content. */
export function AddContentDialog({ sections, defaultSection, onAdd, onClose }: { sections: { id: string | null; title: string }[]; defaultSection: string | null; onAdd: (sectionId: string | null, c: AddChoice) => void; onClose: () => void }) {
  const [target, setTarget] = useState<string | null>(defaultSection);
  return <MuseModal id="space-add-content" label="Add content" title="Add content" returnFocus={null} onClose={onClose}>
    <label className="muse-space-field muse-space-add-where"><span>Into</span>
      <select value={target ?? ""} onChange={(e) => setTarget(e.target.value || null)}>{sections.map((s) => <option key={s.id ?? "top"} value={s.id ?? ""}>{s.title}</option>)}</select></label>
    <ContentPicker onPick={(c) => onAdd(target, c)} onManage={() => { onClose(); openTemplateManager(); }} />
  </MuseModal>;
}

/** My card templates: rename, edit fields and preview, duplicate, delete. Lives once on the page. */
export function TemplateManager() {
  const state = useManaging(), { cardTemplates } = useLists();
  const [confirm, setConfirm] = useState<CardTemplate | null>(null);
  if (!state.open) return null;
  const editing = state.editId ? cardTemplates.find((t) => t.id === state.editId) : null;
  return <MuseModal id="space-card-templates" label="My card templates" title={editing ? `Edit “${editing.name}”` : "My card templates"} returnFocus={null} onClose={closeTemplateManager} size={editing ? "tall" : "auto"}>
    {editing ? <TemplateEditor key={editing.id} template={editing} onDone={() => openTemplateManager(null)} />
      : <div className="muse-space-tpl-list">
        <p className="small-label">Cards made from a template keep their own fields. Editing or deleting a template only changes future cards.</p>
        {cardTemplates.length ? <ul>{cardTemplates.map((t) => { const p = presetOf(t.preset); return <li key={t.id}>
          <MuseMark icon={(t.icon ?? p.icon) as MuseMarkIcon} tone={p.tone as Tone} size="sm" />
          <span><strong>{t.name}</strong><small>{t.fields.map((f) => f.label).slice(0, 5).join(" · ")}{t.fields.length > 5 ? " …" : ""}</small></span>
          <button type="button" className="muse-button button-ghost" onClick={() => openTemplateManager(t.id)}>Edit</button>
          <button type="button" className="muse-lists-mini" aria-label={`Duplicate ${t.name}`} title="Duplicate" onClick={() => void duplicateCardTemplate(t.id)}><MuseIcon name="sparkle" size={14} /></button>
          <button type="button" className="muse-lists-mini" aria-label={`Delete ${t.name}`} title="Delete" onClick={() => setConfirm(t)}><MuseIcon name="trash" size={14} /></button>
        </li>; })}</ul> : <p className="small-label">No card templates yet. Choose <b>Save as card template</b> in any card’s ⋯ menu.</p>}
      </div>}
    {confirm && <MuseModal id="space-template-delete" label="Delete template?" returnFocus={null} onClose={() => setConfirm(null)}>
      <h2>Delete “{confirm.name}”?</h2><p>Cards you already made from it stay exactly as they are.</p>
      <div className="muse-lists-modal-actions"><button type="button" className="muse-button" onClick={() => { void deleteCardTemplate(confirm.id); setConfirm(null); }}>Delete template</button><button type="button" className="muse-button button-ghost" onClick={() => setConfirm(null)}>Keep it</button></div>
    </MuseModal>}
  </MuseModal>;
}

/** Edit a template's name, look, fields (order, types, choices) and preview; changes apply to future cards. */
function TemplateEditor({ template, onDone }: { template: CardTemplate; onDone: () => void }) {
  const [draft, setDraft] = useState(template), p = presetOf(draft.preset);
  const save = () => { void updateCardTemplate(template.id, { name: draft.name.trim() || template.name, preset: draft.preset, icon: draft.icon, fields: draft.fields, display: draft.display, preview: draft.preview, aside: draft.aside, look: draft.look }); onDone(); };
  return <form className="muse-space-tpl-edit" onSubmit={(e) => { e.preventDefault(); save(); }}>
    <label className="muse-space-field" data-wide><span>Name</span><input autoFocus value={draft.name} maxLength={80} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
    <label className="muse-space-field" data-wide><span>Reads like</span>
      <select value={draft.preset} onChange={(e) => setDraft({ ...draft, preset: e.target.value as CardTemplate["preset"] })}>{cardPresets.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
    <CardLook icon={draft.icon ?? p.icon} display={draft.display} onIcon={(icon) => setDraft((d) => ({ ...d, icon }))} onDisplay={(display) => setDraft((d) => ({ ...d, display }))} />
    <AppearanceEditor look={draft.look ?? undefined} onChange={(look) => setDraft((d) => ({ ...d, look: look ?? null }))} />
    <AsideChoice fields={draft.fields} value={draft.aside} onChange={(aside) => setDraft((d) => ({ ...d, aside: aside ?? null }))} />
    <FieldsEditor idBase={`tpl-${template.id}`} preset={draft.preset} fields={draft.fields} preview={draft.preview} onChange={(update) => setDraft((d) => { const r = update(d.fields, d.preview); return { ...d, fields: r.fields, preview: r.preview }; })} />
    <div className="muse-space-edit-foot"><button type="button" className="muse-button button-ghost" onClick={onDone}>Cancel</button><button type="submit" className="muse-button muse-space-done">Save template</button></div>
  </form>;
}

/** Ask for a name, then save a card's structure as a reusable template. */
export function SaveTemplateDialog({ suggested, onSave, onClose }: { suggested: string; onSave: (name: string) => Promise<unknown>; onClose: () => void }) {
  const [name, setName] = useState(suggested), [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <MuseModal id="space-save-template" label="Save as card template" title="Save as card template" returnFocus={null} onClose={onClose}>
    <form className="muse-space-tpl-edit" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await onSave(name.trim() || suggested); onClose(); } catch { setError("That template didn’t save. Please try again."); setBusy(false); } }}>
      <p className="small-label">Saves this card’s fields, their order and layout, its icon, appearance and how it displays, never what you’ve written in it. Find it under <b>My templates</b> when you add content, in any space.</p>
      <label className="muse-space-field" data-wide><span>Template name</span><input autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Furniture details" /></label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="muse-space-edit-foot"><button type="button" className="muse-button button-ghost" onClick={onClose}>Cancel</button><button type="submit" className="muse-button muse-space-done" disabled={busy}>{busy ? "Saving…" : "Save template"}</button></div>
    </form>
  </MuseModal>;
}
export { createCardTemplate };
