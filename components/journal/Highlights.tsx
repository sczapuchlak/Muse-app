"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MuseModal } from "../MuseModal";
import { MuseIcon } from "../MuseIcon";
import { useJournal } from "./useJournal";
import { formatShort } from "./format";
import { entryTitle, tagLabel, type Bookmark, type Message, type Tag } from "@/lib/journal/model";

/** Scrolls to a highlight (or, if it can't be placed any more, its message) and makes it glow briefly. */
export function jumpToHighlight(h: Pick<Bookmark, "id" | "messageId">) {
  const el = document.getElementById(`hl-${h.id}`) ?? document.querySelector<HTMLElement>(`[data-hl~="${h.id}"]`) ?? (h.messageId ? document.getElementById(`m-${h.messageId}`) : null);
  if (!el) return false;
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  el.setAttribute("data-flash", ""); window.setTimeout(() => el.removeAttribute("data-flash"), 1800);
  return true;
}

type Selected = { messageId: string; start: number; end: number; text: string; x: number; y: number };
/**
 * Select words in a saved conversation and a small "Save highlight" button appears just under the selection. It
 * reads exact positions from the paragraphs (`data-start`), never changes the text, and leaves native copy alone.
 */
export function SelectionHighlighter({ root, messages, onSave }: { root: HTMLElement | null; messages: Message[]; onSave: (p: { messageId: string; start: number; end: number; text: string }) => void }) {
  const [pick, setPick] = useState<Selected | null>(null);
  useEffect(() => {
    if (!root) return;
    let t = 0;
    const read = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) { setPick(null); return; }
      const range = sel.getRangeAt(0), el = (n: Node) => (n.nodeType === 1 ? n as Element : n.parentElement);
      const a = el(range.startContainer)?.closest(".mj-message-body"), b = el(range.endContainer)?.closest(".mj-message-body");
      if (!a || a !== b || !root.contains(a)) { setPick(null); return; }
      const id = a.closest<HTMLElement>("[data-message-id]")?.dataset.messageId, msg = messages.find((m) => m.id === id);
      if (!msg) { setPick(null); return; }
      const pos = (node: Node, offset: number) => { const p = el(node)?.closest<HTMLElement>("p[data-start]"); if (!p) return null; const r = document.createRange(); r.setStart(p, 0); r.setEnd(node, offset); return Number(p.dataset.start) + r.toString().length; };
      let s = pos(range.startContainer, range.startOffset), e = pos(range.endContainer, range.endOffset);
      if (s == null || e == null) { setPick(null); return; }
      while (s < e && /\s/.test(msg.body[s])) s++;
      while (e > s && /\s/.test(msg.body[e - 1])) e--;
      if (e - s < 2) { setPick(null); return; }
      const rect = range.getBoundingClientRect();
      setPick({ messageId: msg.id, start: s, end: e, text: msg.body.slice(s, e), x: rect.left + rect.width / 2, y: rect.bottom });
    };
    const onChange = () => { window.clearTimeout(t); t = window.setTimeout(read, 180); };
    document.addEventListener("selectionchange", onChange);
    return () => { document.removeEventListener("selectionchange", onChange); window.clearTimeout(t); };
  }, [root, messages]);
  if (!pick) return null;
  const left = Math.min(Math.max(pick.x, 90), window.innerWidth - 90), top = Math.min(pick.y + 10, window.innerHeight - 60);
  return <div className="mj-hl-toolbar" style={{ left, top }} role="toolbar" aria-label="Selection">
    <button type="button" className="muse-button button-primary" onPointerDown={(e) => e.preventDefault() /* keep the selection */}
      onClick={() => { onSave(pick); window.getSelection()?.removeAllRanges(); setPick(null); }}>
      <MuseIcon name="bookmark" size={15} />Save highlight
    </button>
  </div>;
}

/** One saved highlight: the quote as captured, your note and My tags, and where it came from. */
export function HighlightCard({ h, placed = true, showSource, onJump, onEdit }: { h: Bookmark; placed?: boolean; showSource?: boolean; onJump?: () => void; onEdit: () => void }) {
  const j = useJournal();
  const c = j.state.conversations.find((x) => x.id === h.conversationId);
  const tags = j.state.highlightTags.filter((t) => t.highlightId === h.id).map((t) => j.state.tags.find((x) => x.id === t.tagId)).filter((t): t is Tag => Boolean(t));
  return <li className="mj-hl-card" id={`hl-card-${h.id}`}>
    <blockquote className="type-quote">{h.excerpt}</blockquote>
    {h.note && <p className="mj-hl-note">{h.note}</p>}
    {tags.length > 0 && <span className="mj-card-tags">{tags.map((t) => <span key={t.id} className="mj-tag" data-kind={t.kind}>{tagLabel(t)}</span>)}</span>}
    {!placed && <p className="mj-note" data-soft>This message was corrected after you saved it; your quote is kept exactly as it was.</p>}
    <div className="mj-hl-foot">
      {showSource && c && <span className="type-meta">{entryTitle(c)} · {formatShort(c.localDate)}</span>}
      <span className="mj-hl-actions">
        {showSource ? <Link className="mj-link" href={`/journal?entry=${h.conversationId}&hl=${h.id}`}>Open at this passage →</Link>
          : onJump && <button type="button" className="mj-link" onClick={onJump}>Jump to it</button>}
        <button type="button" className="mj-link" onClick={onEdit}>Note & tags</button>
        <button type="button" className="mj-link" onClick={() => { if (window.confirm("Remove this highlight? The conversation stays exactly as it is.")) void j.deleteBookmark(h.id); }}>Remove</button>
      </span>
    </div>
  </li>;
}

/** Edit a highlight's note and My tags (existing ones, or a new one by name). No AI. */
export function HighlightEditor({ h, onClose }: { h: Bookmark; onClose: () => void }) {
  const j = useJournal();
  const [note, setNote] = useState(h.note), [newTag, setNewTag] = useState("");
  const mine = useMemo(() => j.state.tags.filter((t) => t.kind === "custom"), [j.state.tags]);
  const on = new Set(j.state.highlightTags.filter((t) => t.highlightId === h.id).map((t) => t.tagId));
  return <MuseModal id="mj-hl-edit" label="Highlight" title="Highlight" returnFocus={null} onClose={onClose}>
    <form className="mj-form" onSubmit={async (e) => { e.preventDefault(); if (note.trim() !== h.note) await j.saveBookmarkNote(h.id, note.trim()); onClose(); }}>
      <blockquote className="type-quote mj-hl-quote">{h.excerpt}</blockquote>
      <label className="editor-label">Why it matters (optional)<textarea rows={3} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} placeholder="A note for future you" /></label>
      <div className="editor-label">My tags
        <ul className="mj-chip-list">{mine.map((t) => <li key={t.id}><button type="button" className="mj-filter-chip" data-kind="custom" aria-pressed={on.has(t.id)} onClick={() => void (on.has(t.id) ? j.untagHighlight(h.id, t.id) : j.tagHighlight(h.id, { id: t.id }))}>{tagLabel(t)}</button></li>)}</ul>
        <span className="mj-tag-add"><input type="text" aria-label="New tag" placeholder="#WorthRevisiting" value={newTag} maxLength={80} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (newTag.trim()) void j.tagHighlight(h.id, { name: newTag }).then(() => setNewTag("")); } }} />
          <button type="button" className="muse-button" disabled={!newTag.trim()} onClick={() => void j.tagHighlight(h.id, { name: newTag }).then(() => setNewTag(""))}>Add tag</button></span>
      </div>
      <div className="mj-form-actions"><button type="button" className="muse-button" onClick={onClose}>Cancel</button><button type="submit" className="muse-button button-primary">Save</button></div>
    </form>
  </MuseModal>;
}
