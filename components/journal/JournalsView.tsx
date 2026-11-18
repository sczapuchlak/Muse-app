"use client";
import { useState } from "react";
import { MuseMark, type MuseMarkIcon, type MuseTone } from "../design/MuseHeading";
import { MuseInviteCard } from "../design/MuseJournal";
import { MuseModal } from "../MuseModal";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { MuseOverflowMenu } from "../MuseOverflowMenu";
import { EmptyPageArt } from "./JournalArt";
import { newId, useJournal } from "./useJournal";
import { covers, journalIcons, journalPresets, companionPresets } from "@/lib/journal/presets";
import { isListed, type Companion, type Journal, type MemoryScope } from "@/lib/journal/model";

const scopeLabel: Record<MemoryScope, string> = { shared: "Shares memory with your other journals", journal: "Remembers only this journal", off: "No memory" };
const blankJournal = (position: number): Journal => ({ id: newId(), name: "", description: "", icon: "journal", tone: 5, cover: "dusk", defaultCompanionId: null, instructions: "", morningInstructions: "", eveningInstructions: "", memoryScope: "shared", presetKey: null, position, archivedAt: null, revision: 0, createdAt: "" });
export const blankCompanion = (position: number): Companion => ({ id: newId(), name: "", description: "", icon: "sparkle", tone: 6, instructions: "", conversationPrefs: "", openingStyle: "", presetKey: null, preferredJournalId: null, version: 1, position, archivedAt: null, revision: 0, createdAt: "", updatedAt: "" });

/** Journals and Companions (Journal V1 §5–7): spaces for conversations, and the personalities you talk with. */
export function JournalsView({ openStudio }: { openStudio: (companionId: string | "new") => void }) {
  const j = useJournal();
  const { state, ai } = j;
  const [editing, setEditing] = useState<Journal | null>(null);
  const journals = state.journals.filter((x) => !x.archivedAt), archived = state.journals.filter((x) => x.archivedAt);
  const companions = state.companions.filter((c) => !c.archivedAt);
  const count = (id: string) => state.conversations.filter((c) => c.journalId === id && isListed(c)).length;
  const missingPresets = journalPresets.filter((p) => !state.journals.some((x) => x.presetKey === p.key));
  const missingCompanions = companionPresets.filter((p) => !state.companions.some((x) => x.presetKey === p.key));
  return <div className="mj-journals">
    <section className="muse-journal-archive" aria-labelledby="mj-journals-title">
      <div className="mj-row-between"><h2 id="mj-journals-title" className="mj-view-title">Journals</h2>
        <button type="button" className="muse-button button-primary" onClick={() => setEditing(blankJournal(state.journals.length))}>New journal</button></div>
      <div className="mj-cards mj-journal-grid">
        {journals.map((x) => { const c = state.companions.find((k) => k.id === x.defaultCompanionId); return <article key={x.id} className="mj-journal-card" data-cover={x.cover} style={{ "--card-ink": `var(--chart-${x.tone})`, "--card-ink-b": `var(--chart-${(x.tone % 8) + 1})` } as React.CSSProperties}>
          <div className="mj-journal-cover" aria-hidden="true"><MuseMark icon={x.icon as MuseMarkIcon} tone={x.tone} size="lg" /></div>
          <div className="mj-journal-copy"><h3>{x.name}</h3>{x.description && <p>{x.description}</p>}
            <p className="mj-journal-facts"><span>{count(x.id)} {count(x.id) === 1 ? "entry" : "entries"}</span>{ai.enabled && c && <span>with {c.name}</span>}<span>{scopeLabel[x.memoryScope]}</span></p></div>
          <div className="mj-journal-actions"><a className="muse-button" href={`/journal?view=history&journal=${x.id}`}>Entries</a><button type="button" className="muse-button button-ghost" onClick={() => setEditing(x)}>Edit</button></div>
        </article>; })}
        <MuseInviteCard count={journals.length} title="Another journal" note="Spanish practice, a tarot journey, a project: any kind of conversation can have its own space." cta="New journal" art={<EmptyPageArt />} onClick={() => setEditing(blankJournal(state.journals.length))} />
      </div>
      {missingPresets.length > 0 && <p className="mj-note">Starters you haven’t added: {missingPresets.map((p, i) => <span key={p.key}>{i > 0 && ", "}<button type="button" className="mj-link" onClick={() => void j.addStarters([p.key], [])}>{p.name}</button></span>)}.</p>}
      {archived.length > 0 && <details className="mj-history"><summary>Archived journals ({archived.length})</summary><ul className="mj-chip-list">{archived.map((x) => <li key={x.id} className="mj-tag"><button type="button" className="mj-link" onClick={() => setEditing(x)}>{x.name}</button></li>)}</ul></details>}
    </section>

    <section className="muse-journal-archive" aria-labelledby="mj-companions-title">
      <div className="mj-row-between"><div><h2 id="mj-companions-title" className="mj-view-title">Companions</h2><p className="mj-note">The personality you talk with. Rewrite any of them completely, and try changes in the studio before you keep them.</p></div>
        <button type="button" className="muse-button button-primary" onClick={() => openStudio("new")}>New companion</button></div>
      {!ai.enabled && <p className="mj-note" data-soft>AI isn’t on for your account, so companions won’t reply yet. You can still shape them.</p>}
      <div className="mj-cards">
        {companions.map((c) => <article key={c.id} className="mj-companion-card" style={{ "--card-ink": `var(--chart-${c.tone})` } as React.CSSProperties}>
          <div className="mj-companion-head"><MuseMark icon={c.icon as MuseMarkIcon} tone={c.tone} size="md" /><div><h3>{c.name}</h3><small>Version {c.version}{c.presetKey ? " · starter" : ""}</small></div>
            <MuseOverflowMenu label={`${c.name} options`} actions={[
              { id: "dup", label: "Duplicate", onSelect: () => void j.duplicateCompanion(c) },
              { id: "del", label: "Delete", destructive: true, onSelect: () => void j.deleteCompanion(c.id) },
            ]} /></div>
          <p>{c.description || c.instructions.slice(0, 160)}</p>
          <div className="mj-journal-actions"><button type="button" className="muse-button" onClick={() => openStudio(c.id)}>Open studio</button></div>
        </article>)}
      </div>
      {missingCompanions.length > 0 && <p className="mj-note">Starter companions you haven’t added: {missingCompanions.map((p, i) => <span key={p.key}>{i > 0 && ", "}<button type="button" className="mj-link" onClick={() => void j.addStarters([], [p.key])}>{p.name}</button></span>)}.</p>}
    </section>
    {editing && <JournalEditor journal={editing} onClose={() => setEditing(null)} />}
  </div>;
}

function JournalEditor({ journal, onClose }: { journal: Journal; onClose: () => void }) {
  const j = useJournal();
  const [d, setD] = useState(journal);
  const [deleting, setDeleting] = useState(false), [moveTo, setMoveTo] = useState<string | null>(null);
  const set = (p: Partial<Journal>) => setD((x) => ({ ...x, ...p }));
  const others = j.state.journals.filter((x) => x.id !== journal.id);
  const entries = j.state.conversations.filter((c) => c.journalId === journal.id).length;
  return <MuseModal id="mj-journal-editor" label="Journal" title={journal.revision ? `Edit ${journal.name}` : "New journal"} returnFocus={null} onClose={onClose} size="tall">
    <form className="mj-form" onSubmit={async (e) => { e.preventDefault(); if (await j.saveJournal(d)) onClose(); }}>
      <label className="editor-label">Name<input type="text" value={d.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} required autoFocus placeholder="Spanish practice" /></label>
      <label className="editor-label">What it’s for<textarea rows={2} value={d.description} maxLength={600} onChange={(e) => set({ description: e.target.value })} placeholder="Practising conversational Spanish about my day" /></label>
      <div className="mj-form-row">
        <span className="editor-label">Icon<span className="mj-icon-pick">{journalIcons.map((i) => <button type="button" key={i} aria-pressed={d.icon === i} aria-label={i} onClick={() => set({ icon: i })}><MuseMark icon={i as MuseMarkIcon} tone={d.tone} size="sm" /></button>)}</span></span>
      </div>
      <div className="mj-form-row">
        <span className="editor-label">Colour<span className="mj-tone-pick">{([1, 2, 3, 4, 5, 6, 7, 8] as MuseTone[]).map((t) => <button type="button" key={t} aria-pressed={d.tone === t} aria-label={`Colour ${t}`} style={{ background: `linear-gradient(135deg,var(--chart-${t}),var(--chart-${(t % 8) + 1}))` }} onClick={() => set({ tone: t })} />)}</span></span>
        <label className="editor-label">Cover<MuseChoiceMenu label="Cover" valueLabel={covers.find((c) => c.id === d.cover)?.label ?? "Dusk"} selectedIds={[d.cover]} options={covers.map((c) => ({ id: c.id, label: c.label }))} onSelect={(id) => set({ cover: id })} /></label>
      </div>
      <div className="mj-form-row">
        <label className="editor-label">Default companion<MuseChoiceMenu label="Default companion" valueLabel={j.state.companions.find((c) => c.id === d.defaultCompanionId)?.name ?? "None"} selectedIds={d.defaultCompanionId ? [d.defaultCompanionId] : []} options={[{ id: "", label: "None" }, ...j.state.companions.map((c) => ({ id: c.id, label: c.name }))]} onSelect={(id) => set({ defaultCompanionId: id || null })} /></label>
        <label className="editor-label">Memory<MuseChoiceMenu label="Memory" valueLabel={scopeLabel[d.memoryScope]} selectedIds={[d.memoryScope]} options={(["shared", "journal", "off"] as MemoryScope[]).map((m) => ({ id: m, label: scopeLabel[m] }))} onSelect={(id) => set({ memoryScope: id as MemoryScope })} /></label>
      </div>
      <p className="mj-note">“Remembers only this journal” keeps, say, a work journal from bringing in personal context, and keeps its entries out of your other journals’ conversations.</p>
      <label className="editor-label">Instructions for this journal (optional)<textarea className="mj-prompt" rows={4} value={d.instructions} onChange={(e) => set({ instructions: e.target.value })} placeholder="Reply in Spanish, gently correct my grammar at the end of each reply." /></label>
      <details className="mj-history"><summary>Morning and evening conversations</summary>
        <label className="editor-label">Morning intention, in this journal<textarea rows={3} value={d.morningInstructions} onChange={(e) => set({ morningInstructions: e.target.value })} placeholder="Ask what one thing would make today feel good." /></label>
        <label className="editor-label">Evening reflection, in this journal<textarea rows={3} value={d.eveningInstructions} onChange={(e) => set({ eveningInstructions: e.target.value })} placeholder="Ask about one conversation from today worth unpacking." /></label>
      </details>
      {j.status.error && <p className="mj-error" role="alert">{j.status.error}</p>}
      <div className="mj-form-actions">
        {journal.revision > 0 && <button type="button" className="muse-button button-ghost" onClick={async () => { if (await j.saveJournal({ ...d, archivedAt: d.archivedAt ? null : new Date().toISOString() })) onClose(); }}>{d.archivedAt ? "Unarchive" : "Archive"}</button>}
        {journal.revision > 0 && <button type="button" className="muse-button button-ghost" onClick={() => setDeleting(true)}>Delete…</button>}
        <button type="button" className="muse-button" onClick={onClose}>Cancel</button><button type="submit" className="muse-button button-primary" disabled={!d.name.trim() || j.status.saving}>Save</button>
      </div>
      {deleting && <div className="mj-finish" role="group" aria-label="Delete journal">
        {entries ? <><p><b>{journal.name} has {entries} {entries === 1 ? "entry" : "entries"}.</b> Move them to another journal, or delete them with it. Deleting can’t be undone.</p>
          {others.length > 0 && <MuseChoiceMenu label="Move entries to" valueLabel={others.find((o) => o.id === moveTo)?.name ?? "Move entries to…"} selectedIds={moveTo ? [moveTo] : []} options={others.map((o) => ({ id: o.id, label: o.name }))} onSelect={setMoveTo} />}
          <div><button type="button" className="muse-button" disabled={!moveTo} onClick={async () => { if (await j.deleteJournal(journal.id, moveTo, false)) onClose(); }}>Move entries, then delete</button>
            <button type="button" className="muse-button button-primary" onClick={async () => { if (window.confirm(`Delete ${journal.name} and all ${entries} entries permanently?`) && await j.deleteJournal(journal.id, null, true)) onClose(); }}>Delete with entries</button></div></>
          : <><p>Delete {journal.name}? It has no entries.</p><div><button type="button" className="muse-button" onClick={() => setDeleting(false)}>Keep it</button><button type="button" className="muse-button button-primary" onClick={async () => { if (await j.deleteJournal(journal.id, null, false)) onClose(); }}>Delete</button></div></>}
      </div>}
    </form>
  </MuseModal>;
}
