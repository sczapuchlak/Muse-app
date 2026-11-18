"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { MuseIcon } from "../MuseIcon";
import { newId, useJournal } from "./useJournal";
import { formatShort } from "./format";
import { entryTitle, memoryKindLabel, memoryKinds, memoryOverlap, normalizeMemory, type Memory, type MemoryKind } from "@/lib/journal/model";

const scopeLabel = { shared: "Shares memory", journal: "Keeps memory to itself", off: "No memory" } as const;

/**
 * One memory, pending or known: its words (editable), category, where it applies, where it came from, and the actions
 * that fit its state. A pending suggestion that looks like something already known says so, and offers to replace it.
 * Nothing here calls AI.
 */
export function MemoryCard({ m, compact }: { m: Memory; compact?: boolean }) {
  const j = useJournal();
  const pending = m.status === "suggested";
  const [editing, setEditing] = useState(false), [text, setText] = useState(m.body), [removing, setRemoving] = useState(false);
  const source = m.sourceConversationId ? j.state.conversations.find((c) => c.id === m.sourceConversationId) : null;
  const journal = j.state.journals.find((x) => x.id === m.journalId);
  const known = j.state.memories.filter((x) => x.status === "confirmed" && x.id !== m.id);
  const same = pending ? known.find((x) => normalizeMemory(x.body) === normalizeMemory(m.body)) : undefined;
  const similar = pending && !same ? known.map((x) => ({ x, o: memoryOverlap(x.body, m.body) })).filter((r) => r.o >= 0.6).sort((a, b) => b.o - a.o)[0]?.x : undefined;
  const save = (p: Partial<Memory>) => j.saveMemory({ ...m, ...p });
  return <li className="mj-mem" data-status={m.status} data-pinned={m.pinned || undefined} data-compact={compact || undefined}>
    {editing ? <form className="mj-mem-edit" onSubmit={(e) => { e.preventDefault(); if (text.trim()) void save({ body: text.trim() }).then((ok) => ok && setEditing(false)); }}>
      <textarea rows={2} aria-label="Memory" value={text} maxLength={1000} autoFocus onChange={(e) => setText(e.target.value)} />
      <span className="mj-mem-actions"><button type="button" className="mj-link" onClick={() => { setText(m.body); setEditing(false); }}>Cancel</button><button type="submit" className="muse-button" disabled={!text.trim()}>Save</button></span>
    </form> : <p className="mj-mem-body">{m.pinned && <span className="mj-mem-pin" title="Pinned: comes first when it fits"><MuseIcon name="pin" size={13} /></span>}{m.body}</p>}
    <p className="mj-mem-meta type-meta">
      <MuseChoiceMenu label="Category" valueLabel={memoryKindLabel[m.kind] ?? "Other"} selectedIds={[m.kind]} options={memoryKinds.map((k) => ({ id: k, label: memoryKindLabel[k] }))} onSelect={(id) => void save({ kind: id as MemoryKind })} />
      <MuseChoiceMenu label="Where it applies" valueLabel={journal ? `Only ${journal.name}` : "Every shared journal"} selectedIds={[m.journalId ?? ""]} options={[{ id: "", label: "Every shared journal" }, ...j.state.journals.map((x) => ({ id: x.id, label: `Only ${x.name}` }))]} onSelect={(id) => void save({ journalId: id || null })} />
      {source ? <Link href={`/journal?entry=${source.id}`}>{m.source === "ai" ? "Suggested from" : "From"} “{entryTitle(source)}” · {formatShort(source.localDate)}</Link> : <span>{m.source === "ai" ? "Suggested by AI" : "Added by you"}</span>}
    </p>
    {same && <p className="mj-mem-hint" role="note">Muse already knows this, word for word.</p>}
    {similar && <p className="mj-mem-hint" role="note">Close to something Muse already knows: “{similar.body}”.
      <button type="button" className="mj-link" onClick={() => void j.saveMemory({ ...similar, body: (editing ? text : m.body).trim() }).then((ok) => ok && j.deleteMemory(m.id))}>Replace it with this</button></p>}
    <span className="mj-mem-actions">
      {pending ? <>
        <button type="button" className="muse-button button-primary" disabled={Boolean(same)} onClick={() => void save({ body: (editing ? text : m.body).trim(), status: "confirmed" })}>Remember</button>
        {!editing && <button type="button" className="muse-button" onClick={() => setEditing(true)}>Edit</button>}
        <button type="button" className="muse-button button-ghost" onClick={() => void j.dismissMemory(m)}>Dismiss</button>
      </> : <>
        <button type="button" className="mj-icon-toggle" aria-pressed={Boolean(m.pinned)} aria-label={m.pinned ? "Unpin" : "Pin"} title={m.pinned ? "Pinned: comes first when it fits. Unpin" : "Pin: comes first when it fits"} onClick={() => void save({ pinned: !m.pinned })}><MuseIcon name="pin" size={15} /></button>
        {!editing && <button type="button" className="mj-link" onClick={() => setEditing(true)}>Edit</button>}
        {removing ? <span className="mj-mem-confirm">Forget this? <button type="button" className="mj-link" onClick={() => void j.deleteMemory(m.id)}>Forget</button><button type="button" className="mj-link" onClick={() => setRemoving(false)}>Keep</button></span>
          : <button type="button" className="mj-link" onClick={() => setRemoving(true)}>Remove</button>}
      </>}
    </span>
  </li>;
}

/**
 * Memory Studio, in Journal settings: what Muse wants to remember (pending, never used until you approve), what your
 * companion knows (approved, grouped by category, pinned first), and plainly how memory works. One place; no AI.
 */
export function MemoryStudio() {
  const j = useJournal();
  const [find, setFind] = useState(""), [kind, setKind] = useState<MemoryKind | "">(""), [adding, setAdding] = useState(""), [addKind, setAddKind] = useState<MemoryKind>("fact");
  const needle = normalizeMemory(find);
  const match = (m: Memory) => (!needle || normalizeMemory(m.body).includes(needle)) && (!kind || m.kind === kind);
  const pending = j.state.memories.filter((m) => m.status === "suggested" && match(m));
  const known = j.state.memories.filter((m) => m.status === "confirmed");
  const groups = useMemo(() => memoryKinds.map((k) => ({ k, items: known.filter((m) => m.kind === k && match(m)).sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.updatedAt.localeCompare(a.updatedAt)) })).filter((g) => g.items.length), [known, needle, kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = j.state.memories.length;
  const add = (e: React.FormEvent) => { e.preventDefault(); if (!adding.trim()) return; void j.saveMemory({ id: newId(), body: adding.trim(), kind: addKind, pinned: false, status: "confirmed", source: "user", journalId: null, sourceConversationId: null, revision: 0, createdAt: "", updatedAt: "" }).then((ok) => ok && setAdding("")); };
  return <div className="mj-form mj-studio-mem">
    <label className="mj-toggle muse-check-row mj-guided-switch"><input type="checkbox" checked={j.state.prefs.memoryEnabled} onChange={(e) => void j.savePrefs({ ...j.state.prefs, memoryEnabled: e.target.checked })} />
      <span><b>Let companions use my journal history and memories</b><small>{j.state.prefs.memoryEnabled ? "On: conversations may draw on what’s below, recent entries and related older ones, within each journal’s setting." : "Off: no memories or past entries are used in any conversation. Nothing is deleted."}</small></span></label>
    <details className="mj-mem-how"><summary>How memory works</summary>
      <ul>
        <li><b>Pending</b> memories are only suggestions. Muse never uses one until you choose Remember.</li>
        <li><b>Known</b> memories are what you’ve approved or added. Your words are authoritative; new suggestions never change them.</li>
        <li><b>Pinned</b> memories come first when there’s room. Muse still sends only what fits, never everything.</li>
        <li><b>Removing</b> a memory means it’s no longer used anywhere. Dismissing a suggestion stops that entry proposing the same words again.</li>
        <li>Each journal decides what it shares: {j.state.journals.filter((x) => !x.archivedAt).map((x, i) => <span key={x.id}>{i > 0 && ", "}{x.name} ({scopeLabel[x.memoryScope].toLowerCase()})</span>)}. Change it in that journal’s settings.</li>
      </ul>
    </details>
    {total > 6 && <div className="mj-mem-tools">
      <div className="mj-filter-find"><MuseIcon name="search" size={15} /><input type="search" aria-label="Search memories" placeholder="Search what Muse knows…" value={find} onChange={(e) => setFind(e.target.value)} /></div>
      <ul className="mj-chip-list" aria-label="Category">{memoryKinds.filter((k) => j.state.memories.some((m) => m.kind === k)).map((k) => <li key={k}><button type="button" className="mj-filter-chip" aria-pressed={kind === k} onClick={() => setKind(kind === k ? "" : k)}>{memoryKindLabel[k]}</button></li>)}</ul>
    </div>}

    <section className="mj-mem-section" aria-labelledby="mj-mem-pending">
      <h3 id="mj-mem-pending" className="mj-mem-title type-title">What Muse wants to remember {pending.length > 0 && <span className="mj-filter-count type-numeric">{pending.length}</span>}</h3>
      {pending.length ? <ul className="mj-mem-list">{pending.map((m) => <MemoryCard key={m.id} m={m} />)}</ul>
        : <p className="mj-note">Nothing waiting. After an entry, any detail worth keeping shows up here for you to approve, edit or dismiss.</p>}
    </section>

    <section className="mj-mem-section" aria-labelledby="mj-mem-known">
      <h3 id="mj-mem-known" className="mj-mem-title type-title">What your companion knows <span className="type-numeric mj-mem-count">{known.length}</span></h3>
      <form className="mj-mem-add" onSubmit={add}>
        <input type="text" aria-label="Add a memory" placeholder="Add something worth remembering, e.g. “Sun is my director”" value={adding} maxLength={1000} onChange={(e) => setAdding(e.target.value)} />
        <MuseChoiceMenu label="Category" valueLabel={memoryKindLabel[addKind]} selectedIds={[addKind]} options={memoryKinds.map((k) => ({ id: k, label: memoryKindLabel[k] }))} onSelect={(id) => setAddKind(id as MemoryKind)} />
        <button type="submit" className="muse-button" disabled={!adding.trim()}>Add</button>
      </form>
      {groups.length ? groups.map(({ k, items }) => <div key={k} className="mj-mem-group"><h4 className="type-meta">{memoryKindLabel[k]} <span className="type-numeric">{items.length}</span></h4><ul className="mj-mem-list">{items.map((m) => <MemoryCard key={m.id} m={m} />)}</ul></div>)
        : <p className="mj-note">{needle || kind ? "No memory matches." : "Nothing yet. Approve a suggestion or add one yourself."}</p>}
    </section>
  </div>;
}
