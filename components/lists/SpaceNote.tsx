"use client";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import { NoteToolbar } from "@/components/notes/NoteToolbar";
import { GlassPopover } from "../GlassPopover";
import { MuseIcon } from "../MuseIcon";
import { BLOCK_LIMITS, docText, type NoteData } from "@/lib/lists/blocks";
import { Glow, Tone, tones } from "./richMarks";

const extensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: true, autolink: true, defaultProtocol: "https", protocols: ["http", "https", "mailto"] } }),
  TaskList, TaskItem.configure({ nested: true }),
  Table.configure({ resizable: false }), TableRow, TableHeader, TableCell,
  Tone, Glow,
  Placeholder.configure({ placeholder: ({ node }) => node.type.name === "heading" ? "Heading" : "Write anything. # for a heading, - for a list, [] for a checkbox", showOnlyCurrent: true }),
];
const empty = (doc?: JSONContent) => !doc || !docText(doc).trim() && !JSON.stringify(doc).includes('"table"');

/**
 * A Spaces note: formatted writing in the same TipTap format as Notes and Inner Compass, with heading levels, theme
 * colours, highlights and tables. It reads as typeset prose; editing (toolbar + autosave) opens on request.
 */
export function SpaceNote({ data, editing, label, onEditing, onSave }: { data: NoteData; editing: boolean; label: string; onEditing: (v: boolean) => void; onSave: (d: NoteData) => Promise<unknown> | void }) {
  const [full, setFull] = useState(false), timer = useRef<number | null>(null), pending = useRef<NoteData | null>(null);
  const flush = () => { if (timer.current) window.clearTimeout(timer.current); timer.current = null; const p = pending.current; pending.current = null; if (p) void onSave(p); };
  const editor = useEditor({
    extensions, content: data.doc ?? { type: "doc", content: [{ type: "paragraph" }] }, editable: editing, immediatelyRender: false,
    editorProps: { attributes: { class: "muse-space-prose", ...(editing ? { role: "textbox", "aria-multiline": "true", "aria-label": label } : {}) } },
    onUpdate: ({ editor: e }) => {
      const doc = e.getJSON(), size = JSON.stringify(doc).length, over = size > BLOCK_LIMITS.noteJson;
      setFull(over); if (over) return;
      pending.current = { ...data, doc, text: docText(doc).slice(0, 20000) };
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, 600);
    },
  });
  // Save what's typed when editing closes or the block goes away.
  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (editor.isEditable !== editing) {
      editor.setOptions({ editorProps: { attributes: { class: "muse-space-prose", ...(editing ? { role: "textbox", "aria-multiline": "true", "aria-label": label } : {}) } } });
      editor.setEditable(editing);
      if (editing) editor.commands.focus("end"); else flush();
    }
  }, [editor, editing, label]); // eslint-disable-line react-hooks/exhaustive-deps
  const blank = !editing && empty(data.doc);
  return <div className="muse-space-note" data-editing={editing || undefined}>
    {editing && <div className="muse-space-note-tools"><NoteToolbar editor={editor} levels extra={editor && <RichExtras editor={editor} />} /><button type="button" className="muse-button muse-space-done" onClick={() => onEditing(false)}>Done</button></div>}
    {blank ? <button type="button" className="muse-space-note-empty" onClick={() => onEditing(true)}><MuseIcon name="edit" size={15} /> Write something here</button> : null}
    <div hidden={blank} onDoubleClick={() => { if (!editing) onEditing(true); }}><EditorContent editor={editor} /></div>
    {full && <p className="field-error" role="alert">That’s more than one note can hold, so the latest changes aren’t saved. Start another note for the rest.</p>}
  </div>;
}

/** Colour, highlight and table controls (Spaces only). */
function RichExtras({ editor }: { editor: Editor }) {
  const st = useEditorState({ editor, selector: ({ editor: e }) => ({ tone: e.getAttributes("museTone").tone as string | undefined, glow: e.isActive("museGlow"), table: e.isActive("table") }) });
  const [open, setOpen] = useState<null | "tone" | "glow" | "table">(null);
  const toneRef = useRef<HTMLButtonElement>(null), glowRef = useRef<HTMLButtonElement>(null), tableRef = useRef<HTMLButtonElement>(null);
  const run = (fn: () => void) => { fn(); setOpen(null); };
  const keep = (e: React.MouseEvent) => e.preventDefault();
  return <>
    <button ref={toneRef} type="button" className="muse-note-format muse-space-format-tone" data-tone={st?.tone} aria-label="Text colour" title="Text colour" aria-expanded={open === "tone"} onMouseDown={keep} onClick={() => setOpen(open === "tone" ? null : "tone")}>A</button>
    <button ref={glowRef} type="button" className="muse-note-format muse-space-format-glow" aria-pressed={!!st?.glow} aria-label="Highlight" title="Highlight" aria-expanded={open === "glow"} onMouseDown={keep} onClick={() => setOpen(open === "glow" ? null : "glow")}><span>ab</span></button>
    <button ref={tableRef} type="button" className="muse-note-format" aria-pressed={!!st?.table} aria-label={st?.table ? "Table options" : "Insert a table"} title={st?.table ? "Table options" : "Insert a table"} aria-expanded={open === "table"} onMouseDown={keep}
      onClick={() => st?.table ? setOpen(open === "table" ? null : "table") : editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><MuseIcon name="columns" size={16} /></button>
    <GlassPopover id="space-note-tone" label="Text colour" open={open === "tone"} anchorRef={toneRef} onClose={() => setOpen(null)} width={236} bare>
      <div className="muse-space-swatches" role="group" aria-label="Text colour">
        <button type="button" aria-label="Default colour" data-default onMouseDown={keep} onClick={() => run(() => editor.chain().focus().unsetTone().run())}>A</button>
        {tones.map((t) => <button key={t} type="button" data-tone={t} aria-label={`Colour ${t}`} aria-pressed={st?.tone === t} onMouseDown={keep} onClick={() => run(() => editor.chain().focus().setTone(t).run())}>A</button>)}
      </div>
    </GlassPopover>
    <GlassPopover id="space-note-glow" label="Highlight" open={open === "glow"} anchorRef={glowRef} onClose={() => setOpen(null)} width={236} bare>
      <div className="muse-space-swatches" role="group" aria-label="Highlight">
        <button type="button" aria-label="No highlight" data-default onMouseDown={keep} onClick={() => run(() => editor.chain().focus().unsetGlow().run())}><MuseIcon name="close" size={12} /></button>
        {tones.map((t) => <button key={t} type="button" data-glow={t} aria-label={`Highlight ${t}`} onMouseDown={keep} onClick={() => run(() => editor.chain().focus().setGlow(t).run())}>ab</button>)}
      </div>
    </GlassPopover>
    <GlassPopover id="space-note-table" label="Table options" open={open === "table"} anchorRef={tableRef} onClose={() => setOpen(null)} width={220} bare>
      <div className="popover-choice-list">
        {([["Add a row", () => editor.chain().focus().addRowAfter().run()], ["Add a column", () => editor.chain().focus().addColumnAfter().run()], ["Remove this row", () => editor.chain().focus().deleteRow().run()],
          ["Remove this column", () => editor.chain().focus().deleteColumn().run()], ["Header row on/off", () => editor.chain().focus().toggleHeaderRow().run()], ["Delete table", () => editor.chain().focus().deleteTable().run()]] as [string, () => void][])
          .map(([l, fn]) => <button key={l} type="button" className="popover-choice" data-destructive={l === "Delete table" || undefined} onMouseDown={keep} onClick={() => run(fn)}><span>{l}</span></button>)}
      </div>
    </GlassPopover>
  </>;
}
