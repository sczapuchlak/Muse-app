"use client";
import { useState } from "react";
import Link from "next/link";
import { useJournal } from "./useJournal";
import { tagKindLabel, type Tag, type TagKind } from "@/lib/journal/model";

const placeholder: Record<TagKind, string> = { person: "Add a person", place: "Add a place", topic: "Add a topic", theme: "Add a theme", mood: "Add a mood" };

/**
 * People, places, topics or themes on one entry. AI suggestions show dashed until you keep them (✓) or remove them
 * (×, remembered so a new analysis doesn't add them back). Each chip opens every entry with that tag. No AI needed.
 */
export function TagEditor({ conversationId, kind, tags }: { conversationId: string; kind: TagKind; tags: (Tag & { source: "user" | "ai" })[] }) {
  const j = useJournal();
  const [text, setText] = useState("");
  const known = j.state.tags.filter((t) => t.kind === kind && !tags.some((x) => x.id === t.id));
  const listId = `mj-tags-${kind}-${conversationId}`;
  return <div className="mj-tag-editor">
    <h3 className="mj-section-title">{tagKindLabel[kind]}</h3>
    <ul className="mj-chip-list">
      {tags.map((t) => <li key={t.id} className="mj-tag" data-kind={kind} data-ai={t.source === "ai" || undefined}>
        <Link href={`/journal?view=history&tag=${t.id}`} title={t.source === "ai" ? "Suggested by AI" : undefined}>{t.name}</Link>
        {t.source === "ai" && <button type="button" className="mj-x" aria-label={`Keep ${t.name}`} onClick={() => void j.confirmTag(conversationId, t.id)}>✓</button>}
        <button type="button" className="mj-x" aria-label={`Remove ${t.name}`} onClick={() => void j.untagEntry(conversationId, t)}>×</button>
      </li>)}
      {!tags.length && <li className="mj-note">None yet.</li>}
    </ul>
    <form className="mj-tag-add" onSubmit={(e) => { e.preventDefault(); if (text.trim()) void j.tagEntry(conversationId, kind, text).then(() => setText("")); }}>
      <input type="text" aria-label={placeholder[kind]} placeholder={placeholder[kind]} value={text} list={listId} maxLength={80} onChange={(e) => setText(e.target.value)} />
      <datalist id={listId}>{known.map((t) => <option key={t.id} value={t.name} />)}</datalist>
      <button type="submit" className="muse-button" disabled={!text.trim()}>Add</button>
    </form>
  </div>;
}
