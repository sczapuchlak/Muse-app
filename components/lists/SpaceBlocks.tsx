"use client";
import { useRef, useState, type CSSProperties, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import { GlassPopover } from "../GlassPopover";
import { MuseIcon } from "../MuseIcon";
import { MuseModal } from "../MuseModal";
import { BLOCK_LIMITS, cardDisplays, newCard, presetOf, type BlockKind, type BlockWidth, type CardData, type CardDisplay, type HeadingData, type ListBlock } from "@/lib/lists/blocks";
import { ContentPicker, openTemplateManager, type AddChoice } from "./SpaceTemplates";
export type { AddChoice };
import type { ListSection } from "@/lib/lists/model";

export type BlockDrag = { active: boolean; over: boolean; offset?: { x: number; y: number }; register: (el: HTMLElement | null) => void; down: (e: ReactPointerEvent) => void; move: (e: ReactPointerEvent) => void; up: (e: ReactPointerEvent) => void };
export type BlockActions = {
  edit?: () => void; width: (w: BlockWidth) => void; move: (by: -1 | 1) => void; moveTo: (sectionId: string | null) => void; duplicate?: () => void;
  rename?: (title: string) => void; remove: () => void;
  /** Cards: how it displays, and saving its structure as a reusable template. */ display?: (d: CardDisplay) => void; saveTemplate?: () => void;
};
const kindName: Record<BlockKind, string> = { checklist: "checklist", note: "note", images: "photos", link: "link", heading: "heading", card: "card" };

/**
 * The frame around every block: its content first, with a quiet handle and one ⋯ menu (edit, side by side / full
 * width, move, duplicate, delete) that appear on hover, focus or touch. No buttons on every card.
 */
export function BlockShell({ block, span, label, first, last, sections, itemCount, editing, actions, drag, children }: {
  block: ListBlock; span: 1 | 2; label: string; first: boolean; last: boolean; sections: ListSection[]; itemCount: number; editing: boolean;
  actions: BlockActions; drag?: BlockDrag; children: ReactNode;
}) {
  const [menu, setMenu] = useState(false), [moving, setMoving] = useState(false), [confirm, setConfirm] = useState<HTMLElement | null>(null), [naming, setNaming] = useState(false);
  const more = useRef<HTMLButtonElement>(null);
  const isCard = block.kind === "card", style = drag?.offset ? { transform: `translate(${drag.offset.x}px, ${drag.offset.y}px)` } as CSSProperties : undefined;
  const title = block.kind === "checklist" ? (block.data as { title?: string }).title : undefined;
  const close = (fn: () => void) => () => { setMenu(false); setMoving(false); fn(); };
  const preset = isCard ? presetOf((block.data as CardData).preset) : null;
  return <article ref={drag?.register} className="muse-space-block" data-kind={block.kind} data-shape={preset?.shape} data-span={span} data-editing={editing || undefined}
    data-dragging={drag?.active || undefined} data-over={drag?.over || undefined} style={style} aria-label={label}>
    {(title || naming) && <ChecklistTitle value={title ?? ""} editing={naming} onSave={(t) => { setNaming(false); actions.rename?.(t); }} onEdit={() => setNaming(true)} />}
    {children}
    {!editing && <div className="muse-space-block-tools">
      {drag && <button type="button" className="muse-space-grip" aria-label={`Drag to move this ${kindName[block.kind]}. Or use Move up and Move down in its menu.`} title="Drag to move"
        onPointerDown={drag.down} onPointerMove={drag.move} onPointerUp={drag.up} onPointerCancel={drag.up}
        onKeyDown={(e) => { if (e.key === "ArrowUp" && !first) { e.preventDefault(); actions.move(-1); } else if (e.key === "ArrowDown" && !last) { e.preventDefault(); actions.move(1); } }}><MuseIcon name="grip" size={13} /></button>}
      <button ref={more} type="button" className="muse-space-more" aria-label={`Options for this ${kindName[block.kind]}`} aria-haspopup="dialog" aria-expanded={menu} onClick={() => setMenu((v) => !v)}><MuseIcon name="more" size={15} /></button>
    </div>}
    <GlassPopover id={`block-menu-${block.id}`} label={`Options for this ${kindName[block.kind]}`} open={menu} anchorRef={more} onClose={() => { setMenu(false); setMoving(false); }} width={240} align="end" bare>
      {moving ? <div className="popover-choice-list muse-space-menu">
        <button type="button" className="popover-choice" onClick={() => setMoving(false)}><span><span className="muse-list-icon-left"><MuseIcon name="arrow" size={14} /></span>Move to…</span></button>
        {[{ id: null as string | null, title: sections.length ? "Top of the page" : "This page" }, ...sections].map((s) => <button key={s.id ?? "root"} type="button" className="popover-choice" disabled={s.id === block.sectionId} onClick={close(() => actions.moveTo(s.id))}><span>{s.title}</span></button>)}
      </div> : <div className="popover-choice-list muse-space-menu">
        {actions.edit && <button type="button" className="popover-choice" onClick={close(actions.edit)}><span><MuseIcon name="edit" size={15} />Edit</span></button>}
        {block.kind === "checklist" && actions.rename && <button type="button" className="popover-choice" onClick={close(() => setNaming(true))}><span><MuseIcon name="edit" size={15} />{title ? "Rename checklist" : "Name this checklist"}</span></button>}
        {block.kind !== "heading" && <button type="button" className="popover-choice" onClick={close(() => actions.width(block.width === "half" ? "full" : "half"))}><span><MuseIcon name="columns" size={15} />{block.width === "half" ? "Full width" : "Side by side"}</span></button>}
        {!first && <button type="button" className="popover-choice" onClick={close(() => actions.move(-1))}><span><span className="muse-list-icon-up"><MuseIcon name="arrow" size={15} /></span>Move up</span></button>}
        {!last && <button type="button" className="popover-choice" onClick={close(() => actions.move(1))}><span><span className="muse-list-icon-down"><MuseIcon name="arrow" size={15} /></span>Move down</span></button>}
        <button type="button" className="popover-choice" onClick={() => setMoving(true)}><span><MuseIcon name="sort" size={15} />Move to section…</span></button>
        {actions.display && <div className="muse-space-menu-display" role="group" aria-label="Shows as">{cardDisplays.map((d) => <button key={d.id} type="button" aria-pressed={((block.data as CardData).display ?? "card") === d.id} title={d.detail} onClick={close(() => actions.display!(d.id))}>{d.label}</button>)}</div>}
        {actions.duplicate && <button type="button" className="popover-choice" onClick={close(actions.duplicate)}><span><MuseIcon name="sparkle" size={15} />{isCard ? "Duplicate card (with its details)" : "Duplicate"}</span></button>}
        {actions.saveTemplate && <button type="button" className="popover-choice" onClick={close(actions.saveTemplate)}><span><MuseIcon name="bookmark" size={15} />Save as card template…</span></button>}
        <button type="button" className="popover-choice" data-destructive onClick={() => { setMenu(false); setConfirm(more.current); }}><span><MuseIcon name="trash" size={15} />Delete…</span></button>
      </div>}
    </GlassPopover>
    {confirm && <MuseModal id={`block-delete-${block.id}`} label={`Delete this ${kindName[block.kind]}?`} returnFocus={confirm} onClose={() => setConfirm(null)}>
      <h2>Delete this {kindName[block.kind]}?</h2>
      <p>{block.kind === "checklist" ? (itemCount ? `Its ${itemCount} item${itemCount === 1 ? "" : "s"} and their history are deleted too. Linked Planner tasks stay in the Planner.` : "It’s empty, so nothing else goes with it.")
        : block.kind === "images" ? "Its photos are removed from this space." : "This can’t be undone."}</p>
      <div className="muse-lists-modal-actions"><button type="button" className="muse-button" onClick={() => { setConfirm(null); actions.remove(); }}>Delete</button><button type="button" className="muse-button button-ghost" onClick={() => setConfirm(null)}>Keep it</button></div>
    </MuseModal>}
  </article>;
}

function ChecklistTitle({ value, editing, onSave, onEdit }: { value: string; editing: boolean; onSave: (v: string) => void; onEdit: () => void }) {
  const [draft, setDraft] = useState(value);
  if (!editing) return <button type="button" className="muse-space-block-title muse-inline-text" onClick={onEdit}>{value}</button>;
  return <input className="muse-space-block-title muse-inline-input" autoFocus value={draft} maxLength={BLOCK_LIMITS.title} placeholder="Checklist name" aria-label="Checklist name"
    onChange={(e) => setDraft(e.target.value)} onBlur={() => onSave(draft.trim())} onKeyDown={(e) => { if (e.key === "Enter") onSave(draft.trim()); if (e.key === "Escape") onSave(value); }} />;
}

/** A heading, a line of text, or a divider, to organise a section without a whole note. */
export function HeadingBlock({ data, editing, onSave, onEditing }: { data: HeadingData; editing: boolean; onSave: (d: HeadingData) => unknown; onEditing: (v: boolean) => void }) {
  const [draft, setDraft] = useState(data);
  if (editing) return <form className="muse-space-heading-edit" onSubmit={(e) => { e.preventDefault(); void onSave({ ...draft, text: draft.text.trim() }); onEditing(false); }}>
    <div className="muse-segmented" role="group" aria-label="Style">{(["title", "text", "divider"] as const).map((s) => <button key={s} type="button" aria-pressed={draft.style === s} onClick={() => setDraft({ ...draft, style: s })}>{s === "title" ? "Heading" : s === "text" ? "Text" : "Divider"}</button>)}</div>
    {draft.style !== "divider" && <input autoFocus value={draft.text} maxLength={BLOCK_LIMITS.heading} placeholder={draft.style === "title" ? "Day one: Paris" : "A short line of explanation"} aria-label="Heading text" onChange={(e) => setDraft({ ...draft, text: e.target.value })} />}
    <button type="submit" className="muse-button muse-space-done">Done</button>
  </form>;
  if (data.style === "divider") return <div className="muse-space-divider" role="separator">{data.text && <span>{data.text}</span>}</div>;
  if (!data.text) return <button type="button" className="muse-space-note-empty" onClick={() => onEditing(true)}><MuseIcon name="edit" size={15} /> Add a heading</button>;
  return data.style === "title" ? <h4 className="muse-space-heading" onDoubleClick={() => onEditing(true)}>{data.text}</h4> : <p className="muse-space-text" onDoubleClick={() => onEditing(true)}>{data.text}</p>;
}

/**
 * "+ Add content" at the end of a section: the shared picker (blocks, information cards, My templates). Cards of a kind
 * already here get an "Another …" shortcut. `open`/`onOpenChange` let the section ⋯ menu open the same picker.
 */
export function AddBlock({ blocks, onAdd, empty, open: openProp, onOpenChange }: { blocks: ListBlock[]; onAdd: (c: AddChoice) => void; /** The section has nothing yet: say what can go here. */ empty?: boolean; open?: boolean; onOpenChange?: (v: boolean) => void }) {
  const [own, setOwn] = useState(false), open = openProp ?? own, setOpen = (v: boolean) => { setOwn(v); onOpenChange?.(v); };
  const anchor = useRef<HTMLButtonElement>(null);
  const here = [...new Set(blocks.filter((b) => b.kind === "card" && !(b.data as CardData).template).map((b) => (b.data as CardData).preset))].slice(0, 2);
  const pick = (c: AddChoice) => { setOpen(false); onAdd(c); };
  return <>
    <span className="muse-space-add-row" data-empty={empty || undefined}>
      <button ref={anchor} type="button" className="muse-space-add" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}><MuseIcon name="plus" size={14} />Add content</button>
      {empty ? <small className="muse-space-add-hint">A checklist, note, photos, a link or an info card.</small>
        : here.map((id) => <button key={id} type="button" className="muse-space-add-quick" onClick={() => pick({ kind: "card", data: newCard(id), width: presetOf(id).width })}><MuseIcon name="plus" size={13} />Another {presetOf(id).add.toLowerCase()}</button>)}
    </span>
    <GlassPopover id="space-add" label="Add content to this section" open={open} anchorRef={anchor} onClose={() => setOpen(false)} width={460}>
      {open && <ContentPicker onPick={pick} onManage={() => { setOpen(false); openTemplateManager(); }} />}
    </GlassPopover>
  </>;
}
