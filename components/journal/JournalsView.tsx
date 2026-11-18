"use client";
import { useState } from "react";
import { MuseMark, type MuseMarkIcon, type MuseTone } from "../design/MuseHeading";
import { MuseModal } from "../MuseModal";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
import { MuseOverflowMenu } from "../MuseOverflowMenu";
import { MuseIcon } from "../MuseIcon";
import { useJournalUi } from "./ui";
import { choiceInk } from "./Workspace";
import { newId, useJournal } from "./useJournal";
import { covers, journalIcons, journalPresets, companionPresets } from "@/lib/journal/presets";
import { isListed, type Companion, type Journal, type MemoryScope } from "@/lib/journal/model";

const scopeLabel: Record<MemoryScope, string> = { shared: "Shares memory with your other journals", journal: "Remembers only this journal", off: "No memory" };
export const blankJournal = (position: number): Journal => ({ id: newId(), name: "", description: "", icon: "journal", tone: 5, cover: "dusk", defaultCompanionId: null, instructions: "", morningInstructions: "", eveningInstructions: "", memoryScope: "shared", presetKey: null, position, archivedAt: null, revision: 0, createdAt: "" });
export const blankCompanion = (position: number): Companion => ({ id: newId(), name: "", description: "", icon: "sparkle", tone: 6, instructions: "", conversationPrefs: "", openingStyle: "", presetKey: null, preferredJournalId: null, version: 1, position, archivedAt: null, revision: 0, createdAt: "", updatedAt: "" });

/**
 * Manage journals and companions (opened from the workspace toolbar; there is no management page). Your journals and
 * companions as compact rows with their actions, and any starters you haven't added as small tiles. Editing a journal
 * opens its editor; a companion opens in the Studio sheet.
 */
export function JournalManager({ onClose }: { onClose: () => void }) {
  const j = useJournal(), ui = useJournalUi();
  const { state, ai } = j;
  const [editing, setEditing] = useState<Journal | null>(null);
  const journals = state.journals.filter((x) => !x.archivedAt), archived = state.journals.filter((x) => x.archivedAt);
  const companions = state.companions.filter((c) => !c.archivedAt);
  const primary = journals.find((x) => x.id === state.prefs.defaultJournalId) ?? journals[0];
  const count = (id: string) => state.conversations.filter((c) => c.journalId === id && isListed(c)).length;
  const missingPresets = journalPresets.filter((p) => !state.journals.some((x) => x.presetKey === p.key));
  const missingCompanions = companionPresets.filter((p) => !state.companions.some((x) => x.presetKey === p.key));
  return <MuseModal id="mj-manager" label="Journals and companions" title="Journals & companions" returnFocus={null} onClose={onClose} size="tall">
    <div className="mj-manager mj-modal-scroll">
      <section className="mj-manager-section" aria-labelledby="mj-man-journals">
        <div className="mj-row-between"><h3 id="mj-man-journals" className="mj-section-title">Journals</h3><button type="button" className="muse-button" onClick={() => setEditing(blankJournal(state.journals.length))}><MuseIcon name="plus" size={15} />New journal</button></div>
        <ul className="mj-manage-list">{journals.map((x) => { const n = count(x.id); return <li key={x.id} className="mj-manage-row" style={choiceInk(x.tone)}>
          <MuseMark icon={x.icon as MuseMarkIcon} tone={x.tone} size="md" />
          <div className="mj-choice-copy"><span className="mj-choice-name type-heading">{x.name}{x.id === primary?.id && <span className="mj-pill">Main</span>}</span><span className="mj-choice-line type-meta">{n} {n === 1 ? "entry" : "entries"} · {scopeLabel[x.memoryScope]}{ai.enabled && state.companions.find((c) => c.id === x.defaultCompanionId) ? ` · with ${state.companions.find((c) => c.id === x.defaultCompanionId)!.name}` : ""}</span></div>
          <span className="mj-manage-actions">
            <button type="button" className="muse-button button-ghost" onClick={() => setEditing(x)}>Edit</button>
            <MuseOverflowMenu label={`${x.name} options`} actions={[
              ...(x.id !== primary?.id ? [{ id: "main", label: "Make this my main journal", onSelect: () => void j.savePrefs({ ...state.prefs, defaultJournalId: x.id }) }] : []),
              { id: "entries", label: "See its entries", href: `/journal?view=history&journal=${x.id}` },
            ]} />
          </span>
        </li>; })}</ul>
        {missingPresets.length > 0 && <details className="mj-history"><summary>Ideas for another journal</summary><div className="mj-starter-tiles">{missingPresets.map((p) => <article key={p.key} className="mj-starter-tile" style={choiceInk(p.tone)}>
          <MuseMark icon={p.icon as MuseMarkIcon} tone={p.tone} size="md" /><div className="mj-choice-copy"><h4 className="mj-choice-name type-heading">{p.name}</h4><p className="mj-choice-line">{p.description}</p></div>
          <button type="button" className="muse-button" disabled={j.status.saving} onClick={() => void j.addStarters([p.key], [])}>Add</button></article>)}</div></details>}
        {archived.length > 0 && <details className="mj-history"><summary>Archived journals ({archived.length})</summary><ul className="mj-chip-list">{archived.map((x) => <li key={x.id} className="mj-tag"><button type="button" className="mj-link" onClick={() => setEditing(x)}>{x.name}</button></li>)}</ul></details>}
      </section>

      <section className="mj-manager-section" aria-labelledby="mj-man-companions">
        <div className="mj-row-between"><h3 id="mj-man-companions" className="mj-section-title">Companions</h3><button type="button" className="muse-button" onClick={() => ui.openStudio("new")}><MuseIcon name="plus" size={15} />New companion</button></div>
        {!ai.enabled && <p className="mj-note" data-soft>AI isn’t on for your account, so companions won’t reply yet. You can still shape them.</p>}
        <ul className="mj-manage-list">{companions.map((c) => <li key={c.id} className="mj-manage-row" style={choiceInk(c.tone)}>
          <MuseMark icon={c.icon as MuseMarkIcon} tone={c.tone} size="md" />
          <div className="mj-choice-copy"><span className="mj-choice-name type-heading">{c.name}{c.id === primary?.defaultCompanionId && <span className="mj-pill">Default</span>}</span><span className="mj-choice-line">{c.description || c.instructions.slice(0, 120)}</span></div>
          <span className="mj-manage-actions">
            <button type="button" className="muse-button button-ghost" onClick={() => ui.openStudio(c.id)}>Customize</button>
            <MuseOverflowMenu label={`${c.name} options`} actions={[
              ...(primary && c.id !== primary.defaultCompanionId ? [{ id: "default", label: "Make my default", onSelect: () => void j.setDefaultCompanion(primary, c.id) }] : []),
              { id: "dup", label: "Duplicate", onSelect: () => void j.duplicateCompanion(c) },
              { id: "del", label: "Delete", destructive: true, onSelect: () => void j.deleteCompanion(c.id) },
            ]} />
          </span>
        </li>)}</ul>
        {missingCompanions.length > 0 && <details className="mj-history"><summary>More starter companions</summary><div className="mj-starter-tiles">{missingCompanions.map((p) => <article key={p.key} className="mj-starter-tile" style={choiceInk(p.tone)}>
          <MuseMark icon={p.icon as MuseMarkIcon} tone={p.tone} size="md" /><div className="mj-choice-copy"><h4 className="mj-choice-name type-heading">{p.name}</h4><p className="mj-choice-line">{p.description}</p></div>
          <button type="button" className="muse-button" disabled={j.status.saving} onClick={() => void j.addStarters([], [p.key])}>Add</button></article>)}</div></details>}
      </section>
    </div>
    {editing && <JournalEditor journal={editing} onClose={() => setEditing(null)} />}
  </MuseModal>;
}

export function JournalEditor({ journal, onClose }: { journal: Journal; onClose: () => void }) {
  const j = useJournal();
  const [d, setD] = useState(journal);
  const [deleting, setDeleting] = useState(false), [moveTo, setMoveTo] = useState<string | null>(null);
  const set = (p: Partial<Journal>) => setD((x) => ({ ...x, ...p }));
  const others = j.state.journals.filter((x) => x.id !== journal.id);
  const entries = j.state.conversations.filter((c) => c.journalId === journal.id).length;
  return <MuseModal id="mj-journal-editor" label="Journal" title={journal.revision ? `Edit ${journal.name}` : "New journal"} returnFocus={null} onClose={onClose} size="tall">
    <form className="mj-form mj-modal-scroll" onSubmit={async (e) => { e.preventDefault(); if (await j.saveJournal(d)) onClose(); }}>
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
