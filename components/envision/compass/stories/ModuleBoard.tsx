"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { GlassPopover } from "@/components/GlassPopover";
import { MuseMark } from "@/components/design/MuseHeading";
import { MuseIcon } from "@/components/MuseIcon";
import { MuseOverflowMenu } from "@/components/MuseOverflowMenu";
import { blankItem, copyContent, emptyContent, groups, itemHeadline, moduleHasContent, modules, modulesFor, pairFields, type Content, type Item, type ModuleType, type Owner, type Value } from "@/lib/inner-compass/modules";
import { reorder, type Module } from "@/lib/inner-compass/stories";
import type { Stories } from "./useStories";
import { FieldInput, FieldView, MaterialReference, RefsInput, type Sources } from "./Fields";

const toneStyle = (t: number) => ({ "--mod-ink": `var(--chart-${t})`, "--mod-ink-b": `var(--chart-${t % 8 + 1})` }) as CSSProperties;

/**
 * The modular body of a Chapter or an Experience. Nothing appears by default: the person adds only what fits, in any
 * order. Each module saves on its own (a moment after typing stops). Reorder by dragging on desktop or with Move
 * up/down anywhere (touch and keyboard). Removing a module with content asks first.
 */
export function ModuleBoard({ owner, ownerId, ownerLabel, stories, sources, linked, onSaveDiscovery, addLabel }: {
  owner: Owner; ownerId: string; ownerLabel: string; stories: Stories; sources: Sources; addLabel: string;
  /** Renders the "linked" module types (Experiences, Reflections) whose content lives in its own records. */
  linked: (type: ModuleType) => ReactNode;
  onSaveDiscovery?: (text: string) => void;
}) {
  const list = stories.modulesOf(owner, ownerId);
  const [dragging, setDragging] = useState<string | null>(null), [over, setOver] = useState<number | null>(null);
  const move = (m: Module, to: number) => void stories.orderModules(reorder(list, m.id, to));
  const add = async (type: ModuleType) => {
    const m: Module = { id: crypto.randomUUID(), owner: { kind: owner, id: ownerId }, type, position: list.length, title: "", collapsed: false, content: emptyContent(type), revision: 0, updatedAt: "" };
    if (modules[type].shape === "items") m.content = { items: [blankItem()] };
    await stories.saveModule(m);
    window.setTimeout(() => document.getElementById(`module-${m.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  };
  return <section className="muse-stories-board" aria-label={`${ownerLabel}: contents`}>
    {list.length === 0 && <div className="muse-stories-board-empty"><p>Nothing here yet, and nothing needs to be. Add only what belongs.</p></div>}
    <ol className="muse-stories-modules">{list.map((m, i) => <li key={m.id} id={`module-${m.id}`} data-drop={over === i && dragging !== m.id ? "before" : undefined}
      onDragOver={(e) => { if (dragging) { e.preventDefault(); setOver(i); } }} onDrop={(e) => { e.preventDefault(); const from = list.find((x) => x.id === dragging); if (from) move(from, i); setDragging(null); setOver(null); }}>
      <ModuleCard m={m} index={i} count={list.length} stories={stories} sources={sources} linked={linked} onSaveDiscovery={onSaveDiscovery}
        onMove={(to) => move(m, to)} onDragStart={() => setDragging(m.id)} onDragEnd={() => { setDragging(null); setOver(null); }}
        onDuplicate={modules[m.type].single ? undefined : () => void stories.saveModule({ ...m, id: crypto.randomUUID(), position: list.length, revision: 0, content: copyContent(m.type, m.content) })} />
    </li>)}</ol>
    <AddMenu owner={owner} label={addLabel} present={new Set(list.map((m) => m.type))} onAdd={(t) => void add(t)} />
  </section>;
}

function AddMenu({ owner, label, present, onAdd }: { owner: Owner; label: string; present: Set<ModuleType>; onAdd: (t: ModuleType) => void }) {
  const anchor = useRef<HTMLButtonElement>(null), [open, setOpen] = useState(false);
  const available = modulesFor(owner).filter((d) => !(d.single && present.has(d.type)));
  return <div className="muse-stories-add">
    <button ref={anchor} type="button" className="muse-button button-primary" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}><MuseIcon name="plus" size={15} /> {label}</button>
    <GlassPopover id="muse-stories-add" label={label} open={open} anchorRef={anchor} onClose={() => setOpen(false)} width={520} scrollMode="content">
      <div className="muse-stories-add-menu">{groups.map((g) => { const items = available.filter((d) => d.group === g.id); return items.length ? <section key={g.id}>
        <h3>{g.label}</h3>
        <div>{items.map((d) => <button key={d.type} type="button" style={toneStyle(d.tone)} onClick={() => { setOpen(false); onAdd(d.type); }}>
          <MuseMark icon={d.glyph} tone={d.tone} size="sm" /><span><b>{d.label}</b><small>{d.hint}</small></span></button>)}</div>
      </section> : null; })}</div>
    </GlassPopover>
  </div>;
}

function ModuleCard({ m, index, count, stories, sources, linked, onMove, onDuplicate, onDragStart, onDragEnd, onSaveDiscovery }: {
  m: Module; index: number; count: number; stories: Stories; sources: Sources; linked: (t: ModuleType) => ReactNode; onMove: (to: number) => void; onDuplicate?: () => void;
  onDragStart: () => void; onDragEnd: () => void; onSaveDiscovery?: (text: string) => void;
}) {
  const def = modules[m.type];
  const [content, setContent] = useState<Content>(m.content), [title, setTitle] = useState(m.title), [confirm, setConfirm] = useState(false), [dirty, setDirty] = useState(false);
  // Autosave a moment after the last change; the hook queues saves so each builds on the last.
  useEffect(() => {
    if (!dirty) return;
    const t = window.setTimeout(() => { void stories.saveModule({ ...m, content, title }).then(() => setDirty(false)); }, 800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, title, dirty]);
  const change = (c: Content) => { setContent(c); setDirty(true); };
  const actions = [
    ...(index > 0 ? [{ id: "up", label: "Move up", onSelect: () => onMove(index - 1) }] : []),
    ...(index < count - 1 ? [{ id: "down", label: "Move down", onSelect: () => onMove(index + 1) }] : []),
    ...(onDuplicate ? [{ id: "dup", label: "Duplicate", onSelect: onDuplicate }] : []),
    { id: "remove", label: def.shape === "linked" ? "Remove from this page" : "Remove…", destructive: true, onSelect: () => moduleHasContent(m.type, content) ? setConfirm(true) : void stories.removeModule(m) },
  ];
  return <article className="muse-stories-module" data-type={m.type} data-collapsed={m.collapsed || undefined} style={toneStyle(def.tone)}>
    <header draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }} onDragEnd={onDragEnd}>
      <span className="muse-stories-grip" aria-hidden="true" title="Drag to reorder"><MuseIcon name="grip" size={14} /></span>
      <MuseMark icon={def.glyph} tone={def.tone} size="sm" />
      <input className="muse-stories-module-title" aria-label="Module title" maxLength={80} value={title} placeholder={def.label} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} />
      {dirty && <small className="muse-stories-saving" aria-live="polite">Saving…</small>}
      <button type="button" className="muse-stories-collapse" aria-expanded={!m.collapsed} aria-label={m.collapsed ? `Expand ${title || def.label}` : `Collapse ${title || def.label}`} onClick={() => void stories.saveModule({ ...m, content, title, collapsed: !m.collapsed })}>
        <MuseIcon name="chevron" size={14} /></button>
      <MuseOverflowMenu label={`${title || def.label} options`} actions={actions} />
    </header>
    {confirm && <div className="muse-compass-confirm" role="alertdialog" aria-label="Remove this module?"><p>Remove “{title || def.label}” and what’s in it? Linked records (discoveries, Visions, readings) are not affected.</p>
      <div><button type="button" className="muse-button" onClick={() => setConfirm(false)}>Keep it</button><button type="button" className="muse-button muse-compass-danger" onClick={() => void stories.removeModule(m)}>Remove</button></div></div>}
    {!m.collapsed && <div className="muse-stories-module-body">
      {def.shape === "linked" ? linked(m.type)
        : def.shape === "refs" ? <RefsInput value={content.refs ?? []} source={sources[def.ref!]} label={def.label} onChange={(refs) => change({ ...content, refs })} />
        : def.shape === "fields" ? <div className="muse-stories-fields">{def.fields!.map((f) => <FieldInput key={f.key} field={f} value={content[f.key] as Value} sources={sources} onChange={(v) => change({ ...content, [f.key]: v })} />)}</div>
        : def.shape === "pair" ? <Pair content={content} sources={sources} onChange={change} onSaveDiscovery={onSaveDiscovery} />
        : <Items type={m.type} items={content.items ?? []} sources={sources} onChange={(items) => change({ ...content, items })} onSaveDiscovery={onSaveDiscovery} />}
    </div>}
  </article>;
}

/** A list of entries; each shows compactly and opens into its fields when you edit it. */
function Items({ type, items, sources, onChange, onSaveDiscovery }: { type: ModuleType; items: Item[]; sources: Sources; onChange: (i: Item[]) => void; onSaveDiscovery?: (text: string) => void }) {
  const def = modules[type];
  const [editing, setEditing] = useState<string | null>(() => items.length === 1 && !itemHeadline(type, items[0]) ? items[0].id : null), [ref, setRef] = useState<string | null>(null);
  const set = (id: string, patch: Record<string, Value>) => onChange(items.map((i) => {
    if (i.id !== id) return i;
    const next: Item = { ...i, ...patch };
    for (const k of Object.keys(patch)) if (patch[k] === undefined) delete next[k];
    return next;
  }));
  // One primary guiding word at a time.
  const setPrimary = (id: string, on: boolean) => onChange(items.map((i) => { const n = { ...i }; if (i.id === id) { if (on) n.primary = true; else delete n.primary; } else if (on) delete n.primary; return n; }));
  return <div className="muse-stories-items" data-type={type}>
    <ul>{items.map((it) => { const head = itemHeadline(type, it); return <li key={it.id} data-editing={editing === it.id || undefined} data-primary={it.primary === true || undefined}>
      {editing === it.id ? <div className="muse-stories-item-form">
        {def.fields!.map((f) => <FieldInput key={f.key} field={f} value={it[f.key]} item={it} sources={sources} onChange={(v, extra) => f.key === "primary" ? setPrimary(it.id, v === true) : set(it.id, { [f.key]: v, ...(extra ?? {}) })} />)}
        {type === "materials" && typeof it.refKey === "string" && <MaterialReference refKey={it.refKey} />}
        <div className="muse-compass-form-actions">
          <button type="button" className="text-button muse-compass-danger-text" onClick={() => { onChange(items.filter((x) => x.id !== it.id)); setEditing(null); }}>Remove</button>
          <button type="button" className="muse-button" onClick={() => setEditing(null)}>Done</button>
        </div>
      </div> : <ItemView type={type} it={it} sources={sources} onEdit={() => setEditing(it.id)} showRef={ref === it.id} onRef={() => setRef(ref === it.id ? null : it.id)}
        onSaveDiscovery={onSaveDiscovery && head ? () => onSaveDiscovery(head) : undefined} />}
    </li>; })}</ul>
    {items.length < (def.maxItems ?? 20) && <button type="button" className="text-button muse-stories-additem" onClick={() => { const b = blankItem(); onChange([...items, b]); setEditing(b.id); }}><MuseIcon name="plus" size={13} /> {def.addLabel ?? "Add"}</button>}
  </div>;
}

function ItemView({ type, it, sources, onEdit, onSaveDiscovery, showRef, onRef }: { type: ModuleType; it: Item; sources: Sources; onEdit: () => void; onSaveDiscovery?: () => void; showRef: boolean; onRef: () => void }) {
  const def = modules[type], head = itemHeadline(type, it), headField = def.fields!.find((f) => f.kind === "text" || f.kind === "textarea" || f.kind === "material")!;
  const rest = def.fields!.filter((f) => f !== headField && f.key !== "primary" && f.key !== "featured" && f.key !== "kind" && f.key !== "category" && f.key !== "image");
  const image = it.image as Item["image"];
  return <div className="muse-stories-item">
    {type === "symbols" && image ? <FieldView field={{ key: "image", kind: "image", label: "" }} value={image} sources={sources} /> : null}
    <div className="muse-stories-item-main">
      <p className="muse-stories-item-head">
        {head ? (type === "mantras" ? <q>{head}</q> : head) : <span className="muse-compass-quiet">Untitled</span>}
      </p>
      <p className="muse-stories-item-chips">
        {it.primary === true && <span className="muse-compass-chip" data-on>Primary</span>}
        {it.featured === true && <span className="muse-compass-chip" data-on>On the Daily Edit</span>}
        {(["kind", "category"] as const).map((k) => { const f = def.fields!.find((x) => x.key === k); return f ? <FieldView key={k} field={f} value={it[k]} sources={sources} /> : null; })}
        {typeof it.attribution === "string" && <span className="muse-compass-card-credit">— {it.attribution}</span>}
        {Array.isArray(it.from) && (it.from as { label: string }[])[0] && <span className="muse-compass-chip" data-quiet>Carried from {(it.from as { label: string }[])[0].label}</span>}
      </p>
      <div className="muse-stories-item-rest">{rest.filter((f) => f.key !== "attribution").map((f) => <FieldView key={f.key} field={f} value={it[f.key]} sources={sources} />)}</div>
      {type !== "symbols" && image && <FieldView field={{ key: "image", kind: "image", label: "" }} value={image} sources={sources} />}
      {showRef && typeof it.refKey === "string" && <MaterialReference refKey={it.refKey} />}
    </div>
    <div className="muse-stories-item-tools">
      {type === "materials" && typeof it.refKey === "string" && <button type="button" className="text-button" aria-expanded={showRef} onClick={onRef}><MuseIcon name="info" size={13} /> About</button>}
      {onSaveDiscovery && <button type="button" className="text-button" onClick={onSaveDiscovery} title="Save as an Inner World discovery"><MuseIcon name="sparkle" size={13} /> Save as discovery</button>}
      <button type="button" className="text-button" onClick={onEdit}><MuseIcon name="edit" size={13} /> Edit</button>
    </div>
  </div>;
}

/** Embracing & Releasing: two short lists side by side, and an optional reflection. Releasing is loosening, not erasing. */
function Pair({ content, sources, onChange, onSaveDiscovery }: { content: Content; sources: Sources; onChange: (c: Content) => void; onSaveDiscovery?: (text: string) => void }) {
  const side = (key: "embracing" | "releasing", label: string, hint: string) => {
    const items = content[key] ?? [];
    return <section className="muse-stories-pair-side" data-side={key}>
      <h4>{label}</h4><p className="muse-compass-quiet">{hint}</p>
      <ul>{items.map((it) => <li key={it.id}>
        <input aria-label={`${label}: entry`} maxLength={200} value={typeof it.text === "string" ? it.text : ""} onChange={(e) => onChange({ ...content, [key]: items.map((x) => x.id === it.id ? { ...x, text: e.target.value } : x) })} />
        <details><summary>More</summary>{pairFields.slice(1).map((f) => <FieldInput key={f.key} field={f} value={it[f.key]} sources={sources} onChange={(v) => onChange({ ...content, [key]: items.map((x) => x.id === it.id ? { ...x, [f.key]: v } : x) })} />)}
          {onSaveDiscovery && typeof it.text === "string" && it.text.trim() && <button type="button" className="text-button" onClick={() => onSaveDiscovery(it.text as string)}><MuseIcon name="sparkle" size={13} /> Save as discovery</button>}</details>
        <button type="button" className="muse-compass-x" aria-label="Remove entry" onClick={() => onChange({ ...content, [key]: items.filter((x) => x.id !== it.id) })}>×</button>
      </li>)}</ul>
      <button type="button" className="text-button" onClick={() => onChange({ ...content, [key]: [...items, blankItem()] })}><MuseIcon name="plus" size={13} /> Add</button>
    </section>;
  };
  return <div className="muse-stories-pair">
    {side("embracing", "What I’m embracing", "Ideas, feelings and ways of being to welcome.")}
    {side("releasing", "What I’m releasing", "Expectations and pressures to loosen. Not feelings to suppress.")}
    <label className="muse-stories-pair-reflect"><span>Reflection <small className="small-label">· optional</small></span><textarea rows={2} maxLength={6000} value={typeof content.reflection === "string" ? content.reflection : ""} onChange={(e) => onChange({ ...content, reflection: e.target.value || undefined })} /></label>
  </div>;
}
