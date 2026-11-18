"use client";
import { useEffect, useState } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { NoteToolbar } from "@/components/notes/NoteToolbar";
import { isRichDoc, richText, type RichDoc, type Value } from "@/lib/inner-compass/modules";

/** Plain text written before rich text existed: one paragraph per line, so nothing runs together. */
function toDoc(v: Value): JSONContent {
  if (isRichDoc(v)) return v as JSONContent;
  const text = typeof v === "string" ? v : "";
  return { type: "doc", content: text.split(/\r?\n/).map((line) => line ? { type: "paragraph", content: [{ type: "text", text: line }] } : { type: "paragraph" }) };
}
const extensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: true, autolink: true, defaultProtocol: "https", protocols: ["http", "https", "mailto"] } }),
  TaskList, TaskItem.configure({ nested: true }),
];

/**
 * Formatted writing for a module field (Notes, Discussion notes): the same editor and toolbar as Notes. Reading shows
 * the words as typeset prose with no box or scrollbar; editing adds the toolbar. Pasted formatting (headings, lists,
 * emphasis) is kept. Saves the TipTap document. Past what one module can hold, it stops saving and says so, rather than
 * letting the server drop the whole document.
 */
export function RichText({ value, editable, label, max, onChange }: { value: Value; editable: boolean; label: string; max?: number; onChange?: (v: RichDoc | undefined) => void }) {
  const [full, setFull] = useState(false);
  const editor = useEditor({
    extensions, content: toDoc(value), editable, immediatelyRender: false,
    editorProps: { attributes: { class: "muse-stories-prose", ...(editable ? { role: "textbox", "aria-multiline": "true", "aria-label": label } : {}) } },
    onUpdate: ({ editor: e }) => {
      if (!onChange) return;
      const doc = e.getJSON() as RichDoc, words = richText(doc);
      const over = (!!max && words.length > max) || JSON.stringify(doc).length > 140000;
      setFull(over);
      if (!over) onChange(words.trim() ? doc : undefined);
    },
  });
  useEffect(() => {
    if (!editor || editor.isDestroyed || editor.isEditable === editable) return;
    editor.setOptions({ editorProps: { attributes: { class: "muse-stories-prose", ...(editable ? { role: "textbox", "aria-multiline": "true", "aria-label": label } : {}) } } });
    editor.setEditable(editable);
  }, [editor, editable, label]);
  return <div className="muse-stories-rich" data-editing={editable || undefined}>
    {editable && <NoteToolbar editor={editor} />}
    <EditorContent editor={editor} />
    {full && <p className="field-error" role="alert">That’s more than one Notes section can hold, so the latest changes aren’t saved. Move some of it into another Notes section.</p>}
  </div>;
}
