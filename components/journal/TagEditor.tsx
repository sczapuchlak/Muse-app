"use client";
import { useState } from "react";
import Link from "next/link";
import { useJournal } from "./useJournal";
import { tagKindLabel, tagKindSingular, tagLabel, type Tag, type TagKind } from "@/lib/journal/model";

/**
 * One row of an entry's My tags, people, topics or moods. Each chip opens every entry with that tag. AI
 * suggestions show dashed until you keep them (✓) or remove them (×, remembered so a new analysis doesn't add them
 * back). "+ Add" opens an inline field only when asked. No AI is needed for any of it.
 */
export function TagEditor({ conversationId, kind, tags }: { conversationId: string; kind: TagKind; tags: (Tag & { source: "user" | "ai" })[] }) {
  const j = useJournal();
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [replacing, setReplacing] = useState<Tag | null>(null), [swap, setSwap] = useState("");
  const known = j.state.tags.filter((t) => t.kind === kind && !t.suppressed && !tags.some((x) => x.id === t.id));
  const listId = `mj-tags-${kind}-${conversationId}`;
  const noun = tagKindSingular[kind].toLowerCase(), mine = kind === "custom";
  return <div className="mj-tag-editor" data-kind={kind}>
    <h3 className="mj-tag-kind type-meta">{tagKindLabel[kind]}</h3>
    <ul className="mj-chip-list">
      {tags.map((t) => <li key={t.id} className="mj-tag" data-kind={kind} data-ai={t.source === "ai" || undefined}>
        <Link href={`/journal?view=history&tag=${t.id}`} title={t.source === "ai" ? "Suggested by AI. Open every entry with this tag" : "Open every entry with this tag"}>{tagLabel(t)}</Link>
        {t.source === "ai" && <button type="button" className="mj-x" aria-label={`Keep ${t.name}`} onClick={() => void j.confirmTag(conversationId, t.id)}>✓</button>}
        <button type="button" className="mj-x mj-x-edit" aria-label={`Replace ${t.name} on this entry`} title="Wrong one? Replace it on this entry only" onClick={() => { setReplacing(t); setSwap(""); }}>↺</button>
        <button type="button" className="mj-x" aria-label={`Remove ${t.name}`} onClick={() => void j.untagEntry(conversationId, t)}>×</button>
      </li>)}
      {replacing && <li className="mj-tag-add-slot mj-tag-replace">
        <form className="mj-tag-add" onSubmit={(e) => { e.preventDefault(); if (swap.trim()) void j.replaceEntryTag(conversationId, replacing, swap).then(() => { setReplacing(null); setSwap(""); }); }}>
          <span className="type-meta">Replace “{replacing.name}” here with</span>
          <input type="text" aria-label={`Replace ${replacing.name} with`} placeholder={`The right ${noun}`} value={swap} list={`${listId}-swap`} maxLength={80} autoFocus onChange={(e) => setSwap(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setReplacing(null); }} />
          <datalist id={`${listId}-swap`}>{j.state.tags.filter((t) => t.kind === kind && !t.suppressed && t.id !== replacing.id).map((t) => <option key={t.id} value={t.name} />)}</datalist>
          <button type="submit" className="muse-button" disabled={!swap.trim()}>Replace</button><button type="button" className="mj-link" onClick={() => setReplacing(null)}>Cancel</button>
        </form>
        <small className="mj-note">Only this entry changes; “{replacing.name}” stays a separate {noun} elsewhere.</small>
      </li>}
      <li className="mj-tag-add-slot">
        {adding ? <form className="mj-tag-add" onSubmit={(e) => { e.preventDefault(); if (text.trim()) void j.tagEntry(conversationId, kind, text).then(() => { setText(""); setAdding(false); }); }}>
          <input type="text" aria-label={`Add a ${noun}`} placeholder={mine ? "#LifeMoments, #WorthRevisiting…" : `Add a ${noun}`} value={text} list={listId} maxLength={80} autoFocus onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") { setAdding(false); setText(""); } }} />
          <datalist id={listId}>{known.map((t) => <option key={t.id} value={mine ? `#${t.name}` : t.name} />)}</datalist>
          <button type="submit" className="muse-button" disabled={!text.trim()}>Add</button>
        </form> : <button type="button" className="mj-tag-plus" onClick={() => setAdding(true)} aria-label={`Add a ${noun}`}>{mine && !tags.length ? "+ Add your own tag" : "+ Add"}</button>}
      </li>
    </ul>
  </div>;
}
