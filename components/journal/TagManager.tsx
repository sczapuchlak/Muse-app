"use client";
import { useMemo, useState } from "react";
import { MuseModal } from "../MuseModal";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { MuseIcon } from "../MuseIcon";
import { useJournal } from "./useJournal";
import { tagKindLabel, tagKindSingular, tagLabel, type Tag, type TagKind } from "@/lib/journal/model";

/** Every category a tag can live in, including the older ones (places, themes) so they can be tidied or moved. */
const allKinds: TagKind[] = ["custom", "person", "place", "topic", "mood", "theme"];
const noun = (k: TagKind) => (k === "custom" ? "tag" : tagKindSingular[k].toLowerCase());

/**
 * One tag: rename, aliases, category, merge into another (with a plain account of what moves) or delete. Renaming
 * changes the label everywhere, never anyone's words; deleting removes the tag, never an entry. No AI.
 */
export function TagDialog({ tag, onClose, onMerged }: { tag: Tag; onClose: () => void; onMerged?: (into: string) => void }) {
  const j = useJournal();
  const [name, setName] = useState(tag.name), [aliases, setAliases] = useState(tag.aliases.join(", ")), [kind, setKind] = useState<TagKind>(tag.kind);
  const [into, setInto] = useState<string | null>(null), [keepAlias, setKeepAlias] = useState(true);
  const [removing, setRemoving] = useState(false), [suppress, setSuppress] = useState(true);
  const same = j.state.tags.filter((t) => t.kind === tag.kind && t.id !== tag.id && !t.suppressed);
  const entriesOf = (id: string) => new Set(j.state.entryTags.filter((x) => x.tagId === id).map((x) => x.conversationId));
  const mine = entriesOf(tag.id), target = into ? j.state.tags.find((t) => t.id === into) : null;
  const both = target ? [...mine].filter((c) => entriesOf(target.id).has(c)).length : 0;
  async function save() {
    let t: Tag | null | undefined = tag;
    if (kind !== tag.kind) t = await j.setTagKind(tag, kind);
    if (t) t = await j.saveTag({ ...t, name, aliases: aliases.split(",").map((a) => a.trim()).filter(Boolean) });
    if (t) onClose();
  }
  async function merge() {
    if (!target) return;
    if (await j.mergeTags(tag.id, target.id)) {
      if (!keepAlias) { const fresh = j.state.tags.find((t) => t.id === target.id) ?? target; await j.saveTag({ ...fresh, aliases: fresh.aliases.filter((a) => a.toLowerCase() !== tag.normalized) }); }
      onMerged?.(target.id); onClose();
    }
  }
  async function remove() { if (await (suppress ? j.suppressTag(tag.id) : j.deleteTag(tag.id))) onClose(); }
  return <MuseModal id="mj-tag" label="Tag" title={`${tagKindSingular[tag.kind]}: ${tagLabel(tag)}`} returnFocus={null} onClose={onClose} size="tall">
    <form className="mj-form mj-modal-scroll" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <p className="mj-note">On {mine.size} {mine.size === 1 ? "entry" : "entries"}. Changes here relabel the tag everywhere; your entries’ words never change.</p>
      <label className="editor-label">Name<input type="text" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></label>
      <label className="editor-label">Also known as (comma-separated)<input type="text" value={aliases} onChange={(e) => setAliases(e.target.value)} placeholder={tag.kind === "person" ? "Sunshine, a nickname, a dictation slip you’ve confirmed" : "Other names for this"} /></label>
      <p className="mj-note">Aliases help search and future suggestions find the same {noun(tag.kind)}. Add only names you’re sure of; Muse never guesses that two similar names are one {noun(tag.kind)}.</p>
      <label className="editor-label">Category<MuseChoiceMenu label="Category" valueLabel={tagKindLabel[kind]} selectedIds={[kind]} options={allKinds.map((k) => ({ id: k, label: tagKindLabel[k] }))} onSelect={(id) => setKind(id as TagKind)} /></label>
      {j.status.error && <p className="mj-error" role="alert">{j.status.error}</p>}
      <div className="mj-form-actions"><button type="button" className="muse-button" onClick={onClose}>Cancel</button><button type="submit" className="muse-button button-primary" disabled={!name.trim() || j.status.saving}>Save</button></div>

      {same.length > 0 && <section className="mj-tag-section" aria-label="Merge">
        <h3 className="mj-section-title">Merge into another {noun(tag.kind)}</h3>
        <p className="mj-note">For two tags that are the same {noun(tag.kind)}, like a dictation slip. The one you choose is kept.</p>
        <MuseChoiceMenu label="Merge into" searchable valueLabel={target ? tagLabel(target) : "Choose…"} selectedIds={into ? [into] : []} options={same.map((t) => ({ id: t.id, label: `${tagLabel(t)} · ${entriesOf(t.id).size}` }))} onSelect={setInto} />
        {target && <div className="mj-finish" role="group" aria-label="Confirm merge">
          <p><b>Merge “{tag.name}” into {target.name}?</b> {mine.size - both} {mine.size - both === 1 ? "entry moves" : "entries move"} to {target.name}{both ? `; ${both} already had both, so ${both === 1 ? "it keeps" : "they keep"} one` : ""}. Highlights and corrections tagged “{tag.name}” move too. No entry is deleted or rewritten.</p>
          <label className="mj-toggle muse-check-row"><input type="checkbox" checked={keepAlias} onChange={(e) => setKeepAlias(e.target.checked)} /> Keep “{tag.name}” as an alias of {target.name}, so future suggestions of it go to {target.name}</label>
          <div><button type="button" className="muse-button" onClick={() => setInto(null)}>Cancel</button><button type="button" className="muse-button button-primary" onClick={() => void merge()}>Merge</button></div>
        </div>}
      </section>}

      <section className="mj-tag-section" aria-label="Delete">
        {!removing ? <button type="button" className="muse-button button-ghost" onClick={() => setRemoving(true)}>Delete this {noun(tag.kind)}…</button>
          : <div className="mj-finish" role="group" aria-label="Confirm delete">
            <p><b>Delete “{tag.name}”?</b> It comes off {mine.size} {mine.size === 1 ? "entry" : "entries"}. The entries, their words and full-text search stay exactly as they are.</p>
            <label className="mj-toggle muse-check-row"><input type="checkbox" checked={suppress} onChange={(e) => setSuppress(e.target.checked)} /> Never suggest “{tag.name}” again (you can undo this in Manage Tags)</label>
            <div><button type="button" className="muse-button" onClick={() => setRemoving(false)}>Keep it</button><button type="button" className="muse-button button-primary" onClick={() => void remove()}>Delete tag</button></div>
          </div>}
      </section>
    </form>
  </MuseModal>;
}

/**
 * Manage Tags, tucked into Journal settings: every tag by category with how many entries use it, a search, the tags
 * you asked AI never to suggest (restorable), and the corrections it learns from (removable). No AI, no cost.
 */
export function ManageTags() {
  const j = useJournal();
  const [find, setFind] = useState(""), [open, setOpen] = useState<Tag | null>(null);
  const uses = useMemo(() => { const m = new Map<string, number>(); for (const t of j.state.entryTags) m.set(t.tagId, (m.get(t.tagId) ?? 0) + 1); return m; }, [j.state.entryTags]);
  const needle = find.trim().replace(/^#/, "").toLowerCase();
  const match = (t: Tag) => !needle || t.normalized.includes(needle) || t.aliases.some((a) => a.toLowerCase().includes(needle));
  const groups = allKinds.map((k) => ({ k, tags: j.state.tags.filter((t) => t.kind === k && !t.suppressed && match(t)).sort((a, b) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) || a.name.localeCompare(b.name)) })).filter((g) => g.tags.length);
  const hidden = j.state.tags.filter((t) => t.suppressed && match(t));
  const fixes = j.state.corrections.map((c) => ({ c, to: j.state.tags.find((t) => t.id === c.toTagId) })).filter((x) => x.to);
  return <div className="mj-form mj-manage-tags">
    <div className="mj-filter-find"><MuseIcon name="search" size={15} /><input type="search" aria-label="Find a tag" placeholder="Find a tag, person or alias…" value={find} onChange={(e) => setFind(e.target.value)} /></div>
    {groups.length ? groups.map(({ k, tags }) => <section key={k} className="mj-tag-group">
      <h3 className="mj-section-title">{tagKindLabel[k]} <span className="type-numeric">{tags.length}</span></h3>
      <ul className="mj-tag-table">{tags.map((t) => <li key={t.id}><button type="button" className="mj-tag-line" onClick={() => setOpen(t)}>
        <span className="mj-tag" data-kind={t.kind}>{tagLabel(t)}</span>
        {t.aliases.length > 0 && <small className="mj-tag-aliases">also {t.aliases.join(", ")}</small>}
        <span className="mj-tag-count type-numeric">{uses.get(t.id) ?? 0} {(uses.get(t.id) ?? 0) === 1 ? "entry" : "entries"}</span>
        <MuseIcon name="edit" size={14} />
      </button></li>)}</ul>
    </section>) : <p className="mj-note">{needle ? `No tag matches “${find.trim()}”.` : "No tags yet."}</p>}
    {hidden.length > 0 && <section className="mj-tag-group"><h3 className="mj-section-title">Never suggested again <span className="type-numeric">{hidden.length}</span></h3>
      <ul className="mj-tag-table">{hidden.map((t) => <li key={t.id} className="mj-tag-line" data-static><span className="mj-tag" data-kind={t.kind}>{tagLabel(t)}</span><small className="mj-tag-aliases">{tagKindSingular[t.kind]}</small><button type="button" className="mj-link" onClick={() => void j.restoreTag(t.id)}>Allow again</button></li>)}</ul></section>}
    {fixes.length > 0 && <section className="mj-tag-group"><h3 className="mj-section-title">Corrections Muse remembers <span className="type-numeric">{fixes.length}</span></h3>
      <p className="mj-note">From entries where you replaced a wrong tag. Future analyses treat them as hints, only when the context clearly means the same {fixes.every((x) => x.c.kind === "person") ? "person" : "thing"}.</p>
      <ul className="mj-tag-table">{fixes.map(({ c, to }) => <li key={c.id} className="mj-tag-line" data-static><span>“{c.fromName}” was <b>{to!.name}</b>{c.times > 1 ? ` · ${c.times}×` : ""}</span><button type="button" className="mj-x" aria-label={`Forget the correction from ${c.fromName}`} title="Forget this" onClick={() => void j.deleteCorrection(c.id)}>×</button></li>)}</ul></section>}
    {open && <TagDialog tag={j.state.tags.find((t) => t.id === open.id) ?? open} onClose={() => setOpen(null)} />}
  </div>;
}
